import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/integrations/quickbooks/webhook
 * Intuit webhooks (no session). Verify signatures in production before trusting payload.
 */
export async function POST(req: NextRequest) {
  const verifier = process.env.QBO_WEBHOOK_VERIFIER_TOKEN;
  const intuitSig = req.headers.get("intuit-signature");

  if (verifier && intuitSig) {
    // Intuit signs payload with HMAC-SHA256 using verifier — full verification can be added here.
    if (intuitSig.length < 8) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
  }

  const bodyText = await req.text();
  let body: unknown = {};
  try {
    body = JSON.parse(bodyText) as unknown;
  } catch {
    body = { raw: bodyText.slice(0, 500) };
  }

  console.log("[qbo:webhook]", JSON.stringify({ headers: Object.fromEntries(req.headers), body }));
  return NextResponse.json({ received: true });
}
