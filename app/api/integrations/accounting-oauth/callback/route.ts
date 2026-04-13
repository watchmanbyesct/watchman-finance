/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/resolve-session";
import { getOptionalFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  exchangeAccountingOAuthCode,
  fetchAccountingCompanyDisplayName,
  resolveAccountingOAuthRedirectUri,
} from "@/lib/integrations/accounting-oauth";
import {
  consumeAccountingOAuthState,
  upsertAccountingOAuthCredentials,
} from "@/lib/integrations/accounting-oauth-persistence";

const FINANCE_ACCOUNTING_OAUTH = "/finance/integration/accounting-oauth";

function redirectToFinance(req: NextRequest, path: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : req.nextUrl.origin);
  return NextResponse.redirect(new URL(path, base));
}

/**
 * GET /api/integrations/accounting-oauth/callback
 * OAuth redirect from provider — exchanges code and stores tokens (service role).
 */
export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return redirectToFinance(req, `/login?redirectTo=${encodeURIComponent(FINANCE_ACCOUNTING_OAUTH)}`);
  }

  const redirectUri = resolveAccountingOAuthRedirectUri(req.nextUrl.origin);
  if (!redirectUri) {
    return redirectToFinance(req, `${FINANCE_ACCOUNTING_OAUTH}?error=oauth_redirect_uri_missing`);
  }

  const url = req.nextUrl;
  const err = url.searchParams.get("error");
  if (err) {
    return redirectToFinance(req, `${FINANCE_ACCOUNTING_OAUTH}?error=${encodeURIComponent(err)}`);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const realmId = url.searchParams.get("realmId");
  if (!code || !state || !realmId) {
    return redirectToFinance(req, `${FINANCE_ACCOUNTING_OAUTH}?error=missing_oauth_params`);
  }

  const binding = await consumeAccountingOAuthState(state);
  if (!binding) {
    return redirectToFinance(req, `${FINANCE_ACCOUNTING_OAUTH}?error=invalid_or_expired_state`);
  }

  const workspace = await getOptionalFinanceWorkspace();
  if (!workspace || workspace.tenantId !== binding.tenantId) {
    return redirectToFinance(req, `${FINANCE_ACCOUNTING_OAUTH}?error=session_tenant_mismatch`);
  }

  const exchanged = await exchangeAccountingOAuthCode(code, redirectUri);
  if (!exchanged.ok) {
    const safe = exchanged.error.slice(0, 450);
    return redirectToFinance(req, `${FINANCE_ACCOUNTING_OAUTH}?error=${encodeURIComponent(safe)}`);
  }

  let companyName: string | null = null;
  try {
    companyName = await fetchAccountingCompanyDisplayName(realmId, exchanged.tokens.access_token);
  } catch {
    companyName = null;
  }

  try {
    await upsertAccountingOAuthCredentials({
      tenantId: binding.tenantId,
      realmId,
      companyName,
      tokens: exchanged.tokens,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "persist_failed";
    return redirectToFinance(
      req,
      `${FINANCE_ACCOUNTING_OAUTH}?error=${encodeURIComponent(msg.slice(0, 450))}`
    );
  }

  return redirectToFinance(req, `${FINANCE_ACCOUNTING_OAUTH}?connected=1`);
}
