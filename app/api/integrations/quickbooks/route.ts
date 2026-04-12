import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/integrations/quickbooks
 * Initiates QBO OAuth 2.0 authorization flow.
 *
 * POST /api/integrations/quickbooks
 * Handles QBO webhook events.
 *
 * These handlers are stubs. Full QBO integration is scoped to
 * the Wave 3+ build phase after AR and AP core are operational.
 * Reference: watchman_finance_integration_and_event_architecture_v1.md
 */

export async function GET(req: NextRequest) {
  const clientId = process.env.QBO_CLIENT_ID;
  const redirectUri = process.env.QBO_REDIRECT_URI;
  const env = process.env.QBO_ENVIRONMENT ?? "sandbox";

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "QBO_CLIENT_ID and QBO_REDIRECT_URI must be configured." },
      { status: 500 }
    );
  }

  const baseUrl =
    env === "production"
      ? "https://appcenter.intuit.com/connect/oauth2"
      : "https://appcenter.intuit.com/connect/oauth2";

  const params = new URLSearchParams({
    client_id:     clientId,
    scope:         "com.intuit.quickbooks.accounting",
    redirect_uri:  redirectUri,
    response_type: "code",
    state:         crypto.randomUUID(),
  });

  return NextResponse.redirect(`${baseUrl}?${params.toString()}`);
}

export async function POST(req: NextRequest) {
  // QBO webhook signature verification and event dispatch goes here.
  // Stub: log and acknowledge.
  const body = await req.json().catch(() => ({}));
  console.log("[qbo:webhook]", JSON.stringify(body));
  return NextResponse.json({ received: true });
}
