/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { assertCanManageUsersForTenant } from "@/lib/admin/user-admin-access";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { hasPermission } from "@/lib/permissions/require-permission";

export type UserAdminMembershipRow = {
  membershipId: string;
  platformUserId: string;
  email: string;
  fullName: string;
  platformStatus: string;
  membershipStatus: string;
  defaultEntityId: string | null;
  defaultEntityLabel: string | null;
  joinedAt: string;
};

export type UserAdminRoleOption = { id: string; code: string; name: string };

export type UserAdminEntityOption = { id: string; code: string; display_name: string };

export type UserAdminAssignmentRow = {
  id: string;
  platformUserId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  isActive: boolean;
};

export type UserAdminPlatformUserOption = {
  id: string;
  email: string;
  full_name: string;
};

export type UserAdminSnapshot = {
  memberships: UserAdminMembershipRow[];
  roles: UserAdminRoleOption[];
  entities: UserAdminEntityOption[];
  assignments: UserAdminAssignmentRow[];
  platformUsersNotInTenant: UserAdminPlatformUserOption[];
  canInvite: boolean;
  canAssignRoles: boolean;
};

export async function loadUserAdminSnapshot(tenantId: string): Promise<UserAdminSnapshot> {
  await assertCanManageUsersForTenant(tenantId);

  const admin = createSupabaseAdminClient();

  const [{ data: memberships }, { data: entities }, { data: roles }, { data: assignments }, { data: allUsers }] =
    await Promise.all([
      admin
        .from("tenant_memberships")
        .select("id, platform_user_id, membership_status, default_entity_id, joined_at")
        .eq("tenant_id", tenantId)
        .order("joined_at", { ascending: true }),
      admin.from("entities").select("id, code, display_name").eq("tenant_id", tenantId).order("code"),
      admin.from("roles").select("id, code, name").eq("tenant_id", tenantId).order("code"),
      admin
        .from("user_role_assignments")
        .select("id, platform_user_id, role_id, is_active")
        .eq("tenant_id", tenantId),
      admin.from("platform_users").select("id, email, full_name, status").eq("status", "active").order("email"),
    ]);

  type MemRow = {
    id: string;
    platform_user_id: string;
    membership_status: string;
    default_entity_id: string | null;
    joined_at: string;
  };
  const memRows = (memberships ?? []) as MemRow[];
  const userIds = [...new Set(memRows.map((m) => m.platform_user_id))];
  const { data: memberUsers } =
    userIds.length > 0
      ? await admin.from("platform_users").select("id, email, full_name, status").in("id", userIds)
      : { data: [] as { id: string; email: string; full_name: string; status: string }[] };

  type PuRow = { id: string; email: string; full_name: string; status: string };
  const userMap = new Map<string, PuRow>(
    (memberUsers ?? []).map((u: PuRow) => [u.id, u]),
  );
  type EntRow = { id: string; code: string; display_name: string };
  const entityMap = new Map<string, EntRow>(
    (entities ?? []).map((e: EntRow) => [e.id, e]),
  );

  type RoleRow = { id: string; code: string; name: string };
  const roleRows = (roles ?? []) as RoleRow[];
  const roleMap = new Map<string, RoleRow>(roleRows.map((r) => [r.id, r]));

  const membershipList: UserAdminMembershipRow[] = memRows.map((m: MemRow) => {
    const u = userMap.get(m.platform_user_id);
    const ent = m.default_entity_id ? entityMap.get(m.default_entity_id) : undefined;
    return {
      membershipId: m.id,
      platformUserId: m.platform_user_id,
      email: u?.email ?? m.platform_user_id,
      fullName: u?.full_name ?? "—",
      platformStatus: u?.status ?? "unknown",
      membershipStatus: m.membership_status,
      defaultEntityId: m.default_entity_id,
      defaultEntityLabel: ent ? `${ent.code} — ${ent.display_name}` : null,
      joinedAt: m.joined_at,
    };
  });

  const memberIdSet = new Set(memRows.map((m: MemRow) => m.platform_user_id));
  type AllPu = { id: string; email: string; full_name: string; status: string };
  const platformUsersNotInTenant: UserAdminPlatformUserOption[] = (allUsers ?? [])
    .filter((u: AllPu) => !memberIdSet.has(u.id))
    .map((u: AllPu) => ({ id: u.id, email: u.email, full_name: u.full_name }));

  type AssRow = {
    id: string;
    platform_user_id: string;
    role_id: string;
    is_active: boolean;
  };
  const assignmentList: UserAdminAssignmentRow[] = ((assignments ?? []) as AssRow[]).map((a) => {
    const r = roleMap.get(a.role_id);
    return {
      id: a.id,
      platformUserId: a.platform_user_id,
      roleId: a.role_id,
      roleCode: r?.code ?? a.role_id,
      roleName: r?.name ?? "Role",
      isActive: a.is_active,
    };
  });

  const ctx = await resolveRequestContext(tenantId);

  return {
    memberships: membershipList,
    roles: roleRows.map((r: RoleRow) => ({ id: r.id, code: r.code, name: r.name })),
    entities: ((entities ?? []) as EntRow[]).map((e) => ({
      id: e.id,
      code: e.code,
      display_name: e.display_name,
    })),
    assignments: assignmentList,
    platformUsersNotInTenant,
    canInvite: hasPermission(ctx, "user.invite"),
    canAssignRoles: hasPermission(ctx, "user.role_assign"),
  };
}
