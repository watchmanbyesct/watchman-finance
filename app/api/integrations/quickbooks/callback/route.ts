import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/resolve-session";
import { getOptionalFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  exchangeQboAuthorizationCode,
  fetchQboCompanyName,
  resolveQboRedirectUri,
} from "@/lib/integrations/qbo-oauth";
import { consumeQboOAuthState, upsertQboCredentials } from "@/lib/integrations/qbo-persistence";

function redirectToFinance(req: NextRequest, path: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : req.nextUrl.origin);
  return NextResponse.redirect(new URL(path, base));
}

/**
 * GET /api/integrations/quickbooks/callback
 * OAuth redirect from Intuit — exchanges code and stores tokens (service role).
 */
export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return redirectToFinance(req, "/login?redirectTo=/finance/integration/quickbooks");
  }

  const redirectUri = resolveQboRedirectUri(req.nextUrl.origin);
  if (!redirectUri) {
    return redirectToFinance(req, "/finance/integration/quickbooks?error=qbo_redirect_uri_missing");
  }

  const url = req.nextUrl;
  const err = url.searchParams.get("error");
  if (err) {
    return redirectToFinance(req, `/finance/integration/quickbooks?error=${encodeURIComponent(err)}`);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const realmId = url.searchParams.get("realmId");
  if (!code || !state || !realmId) {
    return redirectToFinance(req, "/finance/integration/quickbooks?error=missing_oauth_params");
  }

  const binding = await consumeQboOAuthState(state);
  if (!binding) {
    return redirectToFinance(req, "/finance/integration/quickbooks?error=invalid_or_expired_state");
  }

  const workspace = await getOptionalFinanceWorkspace();
  if (!workspace || workspace.tenantId !== binding.tenantId) {
    return redirectToFinance(req, "/finance/integration/quickbooks?error=session_tenant_mismatch");
  }

  const exchanged = await exchangeQboAuthorizationCode(code, redirectUri);
  if (!exchanged.ok) {
    const safe = exchanged.error.slice(0, 450);
    return redirectToFinance(
      req,
      `/finance/integration/quickbooks?error=${encodeURIComponent(safe)}`
    );
  }

  let companyName: string | null = null;
  try {
    companyName = await fetchQboCompanyName(realmId, exchanged.tokens.access_token);
  } catch {
    companyName = null;
  }

  try {
    await upsertQboCredentials({
      tenantId: binding.tenantId,
      realmId,
      companyName,
      tokens: exchanged.tokens,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "persist_failed";
    return redirectToFinance(req, `/finance/integration/quickbooks?error=${encodeURIComponent(msg.slice(0, 450))}`);
  }

  return redirectToFinance(req, "/finance/integration/quickbooks?connected=1");
}
