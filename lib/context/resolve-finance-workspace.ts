import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { getAuthSession, requireAuthSession } from "@/lib/auth/resolve-session";

export interface FinanceWorkspace {
  tenantId: string;
  entityId: string;
  tenantDisplayName: string;
  entityCode: string;
  entityDisplayName: string;
}

/**
 * Resolves the active tenant + entity without redirecting when there is no session.
 * Uses the first active membership (by join date) and default_entity_id when set;
 * otherwise the first entity for that tenant (by code).
 */
export async function getOptionalFinanceWorkspace(): Promise<FinanceWorkspace | null> {
  const session = await getAuthSession();
  if (!session) return null;
  const supabase = createSupabaseServerClient();

  const { data: platformUser, error: puErr } = await supabase
    .from("platform_users")
    .select("id")
    .eq("auth_user_id", session.userId)
    .maybeSingle();

  if (puErr || !platformUser) return null;

  const { data: memberships, error: mErr } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, default_entity_id")
    .eq("platform_user_id", platformUser.id)
    .eq("membership_status", "active")
    .order("joined_at", { ascending: true });

  if (mErr || !memberships?.length) return null;

  const { tenant_id: tenantId, default_entity_id: defaultEntityId } = memberships[0];

  const { data: tenant, error: tErr } = await supabase
    .from("tenants")
    .select("id, display_name")
    .eq("id", tenantId)
    .maybeSingle();

  if (tErr || !tenant) return null;

  let entityId = defaultEntityId as string | null;

  if (entityId) {
    const { data: ent } = await supabase
      .from("entities")
      .select("id, code, display_name")
      .eq("id", entityId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!ent) entityId = null;
    else {
      return {
        tenantId,
        entityId: ent.id,
        tenantDisplayName: tenant.display_name,
        entityCode: ent.code,
        entityDisplayName: ent.display_name,
      };
    }
  }

  const { data: firstEntity, error: eErr } = await supabase
    .from("entities")
    .select("id, code, display_name")
    .eq("tenant_id", tenantId)
    .order("code", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (eErr || !firstEntity) return null;

  return {
    tenantId,
    entityId: firstEntity.id,
    tenantDisplayName: tenant.display_name,
    entityCode: firstEntity.code,
    entityDisplayName: firstEntity.display_name,
  };
}

/** Resolves workspace for finance screens; redirects to /login when unauthenticated. */
export async function resolveFinanceWorkspace(): Promise<FinanceWorkspace | null> {
  await requireAuthSession();
  return getOptionalFinanceWorkspace();
}
