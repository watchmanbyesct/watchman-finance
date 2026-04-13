import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import type { AccountingOAuthTokenResponse } from "@/lib/integrations/accounting-oauth";

function expiresAt(secondsFromNow: number): string {
  return new Date(Date.now() + secondsFromNow * 1000).toISOString();
}

export async function insertAccountingOAuthState(
  state: string,
  tenantId: string,
  platformUserId: string,
  ttlMinutes = 15
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const expiresAtIso = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  const { error } = await admin.from("accounting_oauth_states").insert({
    state,
    tenant_id: tenantId,
    platform_user_id: platformUserId,
    expires_at: expiresAtIso,
  });
  if (error) throw new Error(error.message);
}

export async function consumeAccountingOAuthState(
  state: string
): Promise<{ tenantId: string; platformUserId: string } | null> {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: row, error } = await admin
    .from("accounting_oauth_states")
    .select("id, tenant_id, platform_user_id")
    .eq("state", state)
    .gt("expires_at", now)
    .maybeSingle();

  if (error || !row) return null;

  await admin.from("accounting_oauth_states").delete().eq("id", row.id);

  return { tenantId: row.tenant_id as string, platformUserId: row.platform_user_id as string };
}

export async function pruneExpiredAccountingOAuthStates(): Promise<void> {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  await admin.from("accounting_oauth_states").delete().lt("expires_at", now);
}

export async function upsertAccountingOAuthCredentials(args: {
  tenantId: string;
  realmId: string;
  companyName: string | null;
  tokens: AccountingOAuthTokenResponse;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const accessExpires = expiresAt(args.tokens.expires_in);
  const refreshExpires =
    args.tokens.x_refresh_token_expires_in && args.tokens.x_refresh_token_expires_in > 0
      ? expiresAt(args.tokens.x_refresh_token_expires_in)
      : null;

  const { error: credErr } = await admin.from("accounting_oauth_credentials").upsert(
    {
      tenant_id: args.tenantId,
      realm_id: args.realmId,
      company_name: args.companyName,
      access_token: args.tokens.access_token,
      refresh_token: args.tokens.refresh_token,
      access_token_expires_at: accessExpires,
      refresh_token_expires_at: refreshExpires,
    },
    { onConflict: "tenant_id" }
  );
  if (credErr) throw new Error(credErr.message);

  const { data: sys, error: sysErr } = await admin
    .from("integration_systems")
    .select("id")
    .eq("system_key", "external_accounting_oauth")
    .single();
  if (sysErr || !sys) return;

  const { error: connErr } = await admin.from("integration_connections").upsert(
    {
      tenant_id: args.tenantId,
      integration_system_id: sys.id,
      connection_name: "default",
      connection_status: "active",
      config_json: {
        realm_id: args.realmId,
        company_name: args.companyName,
        oauth_connected_at: new Date().toISOString(),
      },
      last_tested_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,integration_system_id,connection_name" }
  );
  if (connErr) throw new Error(connErr.message);
}

export type AccountingOAuthConnectionSummary = {
  realmId: string;
  companyName: string | null;
  updatedAt: string;
};

export async function getAccountingOAuthConnectionSummary(
  tenantId: string
): Promise<AccountingOAuthConnectionSummary | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("accounting_oauth_credentials")
    .select("realm_id, company_name, updated_at")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    realmId: data.realm_id as string,
    companyName: (data.company_name as string | null) ?? null,
    updatedAt: data.updated_at as string,
  };
}
