/**
 * QuickBooks Online OAuth 2.0 (Intuit) — token exchange and company metadata.
 * Used by Pack 002 integration routes (service-side only).
 */

const INTUIT_AUTH_BASE = "https://appcenter.intuit.com/connect/oauth2";
const INTUIT_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens";

export function getQboApiBase(): string {
  return process.env.QBO_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

export function buildQboAuthorizationUrl(state: string): string {
  const clientId = process.env.QBO_CLIENT_ID;
  const redirectUri = process.env.QBO_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("QBO_CLIENT_ID and QBO_REDIRECT_URI must be set.");
  }
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });
  return `${INTUIT_AUTH_BASE}?${params.toString()}`;
}

export type QboTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in?: number;
  token_type: string;
};

export async function exchangeQboAuthorizationCode(
  code: string,
  redirectUri: string
): Promise<{ ok: true; tokens: QboTokenResponse } | { ok: false; error: string; status: number }> {
  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { ok: false, error: "QBO client credentials are not configured.", status: 500 };
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
    return { ok: false, error: "Invalid token response from Intuit.", status: 502 };
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

export async function fetchQboCompanyName(realmId: string, accessToken: string): Promise<string | null> {
  const base = getQboApiBase();
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
