import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { requireAuthSession } from "@/lib/auth/resolve-session";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { hasPermission } from "@/lib/permissions/require-permission";

export type TenantAdminOption = {
  id: string;
  display_name: string;
  slug: string;
};

/**
 * Tenants where the signed-in user may manage users (memberships need user.invite;
 * role changes need user.role_assign). Either permission grants access to this admin UI.
 */
export async function getTenantsWhereActorCanManageUsers(): Promise<TenantAdminOption[]> {
  const session = await requireAuthSession();
  const supabase = createSupabaseServerClient();

  const { data: pu } = await supabase
    .from("platform_users")
    .select("id")
    .eq("auth_user_id", session.userId)
    .single();

  if (!pu) return [];

  const admin = createSupabaseAdminClient();
  const { data: mems } = await admin
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("platform_user_id", pu.id)
    .eq("membership_status", "active");

  const seen = new Set<string>();
  const out: TenantAdminOption[] = [];

  for (const m of mems ?? []) {
    if (seen.has(m.tenant_id)) continue;
    try {
      const ctx = await resolveRequestContext(m.tenant_id);
      if (!hasPermission(ctx, "user.invite") && !hasPermission(ctx, "user.role_assign")) continue;
      const { data: t } = await admin
        .from("tenants")
        .select("id, display_name, slug")
        .eq("id", m.tenant_id)
        .single();
      if (t) {
        seen.add(t.id);
        out.push(t);
      }
    } catch {
      continue;
    }
  }

  return out.sort((a, b) => a.display_name.localeCompare(b.display_name));
}

export async function assertCanManageUsersForTenant(tenantId: string): Promise<void> {
  const ctx = await resolveRequestContext(tenantId);
  if (!hasPermission(ctx, "user.invite") && !hasPermission(ctx, "user.role_assign")) {
    throw new Error("forbidden:user.invite");
  }
}
