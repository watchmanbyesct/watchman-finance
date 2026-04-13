/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAuthSession } from "@/lib/auth/resolve-session";
import { getOptionalFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  buildAccountingAuthorizationUrl,
  resolveAccountingOAuthRedirectUri,
} from "@/lib/integrations/accounting-oauth";
import {
  insertAccountingOAuthState,
  pruneExpiredAccountingOAuthStates,
} from "@/lib/integrations/accounting-oauth-persistence";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";

/**
 * GET /api/integrations/accounting-oauth/start
 * Authenticated user — stores CSRF state and redirects to the provider OAuth screen.
 */
export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "sign_in_required" }, { status: 401 });
  }

  const workspace = await getOptionalFinanceWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "no_finance_workspace" }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  const { data: pu, error: puErr } = await supabase
    .from("platform_users")
    .select("id")
    .eq("auth_user_id", session.userId)
    .maybeSingle();

  if (puErr || !pu?.id) {
    return NextResponse.json({ error: "platform_user_not_found" }, { status: 403 });
  }

  try {
    const redirectUri = resolveAccountingOAuthRedirectUri(req.nextUrl.origin);
    if (!redirectUri) {
      return NextResponse.json(
        {
          error:
            "Set ACCOUNTING_OAUTH_REDIRECT_URI or ACCOUNTING_OAUTH_REDIRECT_USE_REQUEST_ORIGIN=1 (and register that URI in the developer app).",
        },
        { status: 500 }
      );
    }
    await pruneExpiredAccountingOAuthStates();
    const state = randomBytes(24).toString("hex");
    await insertAccountingOAuthState(state, workspace.tenantId, pu.id);
    const url = buildAccountingAuthorizationUrl(state, redirectUri);
    return NextResponse.redirect(url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_start_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
