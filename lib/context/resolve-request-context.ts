import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { requireAuthSession } from "@/lib/auth/resolve-session";

export interface RequestContext {
  platformUserId: string;
  email: string;
  tenantId: string;
  entityIds: string[];
  permissions: string[];
  moduleEntitlements: string[];
}

/**
 * Resolves the full request context for a server action or route handler.
 * Fetches tenant membership, entity scopes, role permissions, and module
 * entitlements for the authenticated user.
 *
 * This must be called at the top of every sensitive server action.
 */
export async function resolveRequestContext(
  tenantId: string
): Promise<RequestContext> {
  const session = await requireAuthSession();
  const supabase = createSupabaseServerClient();

  // Resolve platform user
  const { data: platformUser } = await supabase
    .from("platform_users")
    .select("id")
    .eq("auth_user_id", session.userId)
    .single();

  if (!platformUser) {
    throw new Error("context_error:platform_user_not_found");
  }

  // Verify active tenant membership
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("membership_status, default_entity_id")
    .eq("tenant_id", tenantId)
    .eq("platform_user_id", platformUser.id)
    .single();

  if (!membership || membership.membership_status !== "active") {
    throw new Error("context_error:not_a_member_of_tenant");
  }

  // Resolve entity scopes (explicit grants; default entity still counts for Pack 001 UX)
  const { data: entityScopes } = await supabase
    .from("user_entity_scopes")
    .select("entity_id")
    .eq("tenant_id", tenantId)
    .eq("platform_user_id", platformUser.id);

  // Resolve permissions via role assignments
  const { data: permissionRows } = await supabase
    .from("user_role_assignments")
    .select("roles(role_permissions(permissions(code)))")
    .eq("tenant_id", tenantId)
    .eq("platform_user_id", platformUser.id);

  const permissions: string[] = [];
  if (permissionRows) {
    for (const row of permissionRows as any[]) {
      for (const rp of row.roles?.role_permissions ?? []) {
        if (rp.permissions?.code) permissions.push(rp.permissions.code);
      }
    }
  }

  // Resolve module entitlements
  const { data: entitlementRows } = await supabase
    .from("tenant_module_entitlements")
    .select("module_key")
    .eq("tenant_id", tenantId)
    .eq("is_enabled", true);

  const entityIdSet = new Set<string>(
    (entityScopes ?? []).map((s: { entity_id: string }) => s.entity_id)
  );
  if (membership.default_entity_id) {
    entityIdSet.add(membership.default_entity_id);
  }

  return {
    platformUserId: platformUser.id,
    email: session.email,
    tenantId,
    entityIds: [...entityIdSet],
    permissions: [...new Set(permissions)],
    moduleEntitlements: (entitlementRows ?? []).map((e: { module_key: string }) => e.module_key),
  };
}
