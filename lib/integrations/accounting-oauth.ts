/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

/**
 * External accounting provider OAuth 2.0 (Intuit developer platform) — token exchange and company metadata.
 * Service-side only. Vendor API hostnames are dictated by the provider.
 */

const INTUIT_AUTH_BASE = "https://appcenter.intuit.com/connect/oauth2";
const INTUIT_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens";

/** Intuit accounting API bases (sandbox vs production). */
const INTUIT_ACCOUNTING_API_PRODUCTION = "https://quickbooks.api.intuit.com";
const INTUIT_ACCOUNTING_API_SANDBOX = "https://sandbox-quickbooks.api.intuit.com";

export const ACCOUNTING_OAUTH_CALLBACK_PATH = "/api/integrations/accounting-oauth/callback";

/**
 * OAuth redirect_uri must match the developer app registration for both authorize and token requests.
 * If `ACCOUNTING_OAUTH_REDIRECT_URI` is unset and `ACCOUNTING_OAUTH_REDIRECT_USE_REQUEST_ORIGIN=1`,
 * use `{origin}{ACCOUNTING_OAUTH_CALLBACK_PATH}` (useful for preview URLs).
 */
export function resolveAccountingOAuthRedirectUri(requestOrigin: string): string | null {
  const explicit = process.env.ACCOUNTING_OAUTH_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  if (process.env.ACCOUNTING_OAUTH_REDIRECT_USE_REQUEST_ORIGIN === "1") {
    const origin = requestOrigin.replace(/\/$/, "");
    return `${origin}${ACCOUNTING_OAUTH_CALLBACK_PATH}`;
  }
  return null;
}

export function getAccountingProviderApiBase(): string {
  return process.env.ACCOUNTING_OAUTH_ENVIRONMENT === "production"
    ? INTUIT_ACCOUNTING_API_PRODUCTION
    : INTUIT_ACCOUNTING_API_SANDBOX;
}

/** Required OAuth scope string from the provider (unchangeable). */
const INTUIT_ACCOUNTING_OAUTH_SCOPE = "com.intuit.quickbooks.accounting";

export function buildAccountingAuthorizationUrl(state: string, redirectUri: string): string {
  const clientId = process.env.ACCOUNTING_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error("ACCOUNTING_OAUTH_CLIENT_ID must be set.");
  }
  const params = new URLSearchParams({
    client_id: clientId,
    scope: INTUIT_ACCOUNTING_OAUTH_SCOPE,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });
  return `${INTUIT_AUTH_BASE}?${params.toString()}`;
}

export type AccountingOAuthTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in?: number;
  token_type: string;
};

export async function exchangeAccountingOAuthCode(
  code: string,
  redirectUri: string
): Promise<
  { ok: true; tokens: AccountingOAuthTokenResponse } | { ok: false; error: string; status: number }
> {
  const clientId = process.env.ACCOUNTING_OAUTH_CLIENT_ID;
  const clientSecret = process.env.ACCOUNTING_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { ok: false, error: "Accounting OAuth client credentials are not configured.", status: 500 };
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(INTUIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    console.error("[accounting-oauth:token] non-JSON response", {
      status: res.status,
      bodyHead: text.slice(0, 800),
    });
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 80);
    return {
      ok: false,
      error: `Intuit token HTTP ${res.status} (not JSON). Check client id/secret; redirect URI must match the developer app and Connect host. Logs show body prefix. Snippet: ${snippet || "(empty)"}`,
      status: res.status || 502,
    };
  }

  if (!res.ok) {
    const msg =
      typeof json.error_description === "string"
        ? json.error_description
        : typeof json.error === "string"
          ? json.error
          : text.slice(0, 200);
    return { ok: false, error: msg || "Token exchange failed.", status: res.status };
  }

  const access_token = json.access_token as string | undefined;
  const refresh_token = json.refresh_token as string | undefined;
  const expires_in = Number(json.expires_in ?? 0);
  const token_type = (json.token_type as string) || "bearer";

  if (!access_token || !refresh_token || !Number.isFinite(expires_in) || expires_in <= 0) {
    return { ok: false, error: "Token response missing access_token, refresh_token, or expires_in.", status: 502 };
  }

  return {
    ok: true,
    tokens: {
      access_token,
      refresh_token,
      expires_in,
      x_refresh_token_expires_in:
        typeof json.x_refresh_token_expires_in === "number"
          ? json.x_refresh_token_expires_in
          : Number(json.x_refresh_token_expires_in) || undefined,
      token_type,
    },
  };
}

export async function fetchAccountingCompanyDisplayName(
  realmId: string,
  accessToken: string
): Promise<string | null> {
  const base = getAccountingProviderApiBase();
  const url = `${base}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=65`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { CompanyInfo?: { CompanyName?: string } };
  const name = data.CompanyInfo?.CompanyName;
  return name?.trim() || null;
}
