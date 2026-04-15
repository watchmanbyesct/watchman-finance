/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/integrations/accounting-oauth/webhook
 * Provider webhooks (no session). Verify signatures in production before trusting payload.
 */
export async function POST(req: NextRequest) {
  const verifier = process.env.ACCOUNTING_OAUTH_WEBHOOK_VERIFIER_TOKEN;
  const intuitSig = req.headers.get("intuit-signature");

  if (verifier && intuitSig) {
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

  console.log("[accounting-oauth:webhook]", JSON.stringify({ headers: Object.fromEntries(req.headers), body }));
  return NextResponse.json({ received: true });
}
