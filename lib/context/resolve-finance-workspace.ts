/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { getAuthSession, requireAuthSession } from "@/lib/auth/resolve-session";
import {
  resolveActiveTenantId,
  WATCHMAN_ACTIVE_TENANT_COOKIE,
} from "@/lib/context/watchman-active-tenant";
import { displayRoleCodes } from "@/lib/platform/tenant-role-display";

function unwrapRelation<T>(rel: T | T[] | null | undefined): T | undefined {
  if (rel == null) return undefined;
  return Array.isArray(rel) ? rel[0] : rel;
}

function roleCodeFromAssignmentRow(row: unknown): string | null {
  const roles = (row as { roles?: unknown }).roles;
  const r = unwrapRelation(roles as { code?: string | null } | { code?: string | null }[] | null);
  return typeof r?.code === "string" ? r.code : null;
}

function tenantDisplayFromMembershipRow(row: { tenant_id: string; tenants?: unknown }): string {
  const t = unwrapRelation(
    row.tenants as
      | { display_name?: string | null }
      | { display_name?: string | null }[]
      | null
      | undefined,
  );
  const dn = t?.display_name;
  return typeof dn === "string" && dn.trim() ? dn.trim() : row.tenant_id;
}

export interface FinanceTenantOption {
  tenantId: string;
  displayName: string;
}

export interface FinanceWorkspace {
  tenantId: string;
  entityId: string;
  tenantDisplayName: string;
  entityCode: string;
  entityDisplayName: string;
  tenantOptions: FinanceTenantOption[];
  roleSummaries: string[];
}

async function workspaceForTenant(params: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  platformUserId: string;
  tenantId: string;
  tenantDisplayName: string;
  defaultEntityId: string | null;
}): Promise<Omit<FinanceWorkspace, "tenantOptions" | "roleSummaries"> | null> {
  const { supabase, tenantId, tenantDisplayName, defaultEntityId } = params;

  let entityId = defaultEntityId as string | null;

  const finish = (entity: { id: string; code: string; display_name: string }) =>
    ({
      tenantId,
      entityId: entity.id,
      tenantDisplayName,
      entityCode: entity.code,
      entityDisplayName: entity.display_name,
    }) satisfies Omit<FinanceWorkspace, "tenantOptions" | "roleSummaries">;

  if (entityId) {
    const { data: ent } = await supabase
      .from("entities")
      .select("id, code, display_name")
      .eq("id", entityId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (ent) return finish(ent);
    entityId = null;
  }

  const { data: firstEntity, error: eErr } = await supabase
    .from("entities")
    .select("id, code, display_name")
    .eq("tenant_id", tenantId)
    .order("code", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (eErr || !firstEntity) return null;

  return finish(firstEntity);
}

async function fetchFinanceRoleSummaries(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  platformUserId: string,
  tenantId: string
): Promise<string[]> {
  const { data: assignments } = await supabase
    .from("user_role_assignments")
    .select("roles(code)")
    .eq("tenant_id", tenantId)
    .eq("platform_user_id", platformUserId)
    .eq("is_active", true);

  const codes = (assignments ?? []).map(roleCodeFromAssignmentRow).filter((c): c is string => Boolean(c));
  return displayRoleCodes([...codes]);
}

/**
 * Resolves the active tenant + entity without redirecting when there is no session.
 * Honors `wm.active_tenant_id` cookie when membership allows; otherwise earliest display_name tenant.
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
    .select(
      `
      tenant_id,
      default_entity_id,
      tenants!inner(display_name)
    `
    )
    .eq("platform_user_id", platformUser.id)
    .eq("membership_status", "active");

  if (mErr || !memberships?.length) return null;

  const rows = memberships as unknown as {
    tenant_id: string;
    default_entity_id: string | null;
    tenants?: unknown;
  }[];

  const tenantOptionsUnsorted = rows.map((m) => ({
    tenantId: m.tenant_id,
    displayName: tenantDisplayFromMembershipRow(m),
    default_entity_id: m.default_entity_id,
  }));

  const tenantOptionsAll = [...tenantOptionsUnsorted].sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );

  const cookieStore = cookies();
  const cookieRaw = cookieStore.get(WATCHMAN_ACTIVE_TENANT_COOKIE)?.value ?? null;

  const activeTenantId = resolveActiveTenantId({
    cookieValue: cookieRaw,
    eligibleTenantIds: tenantOptionsAll.map((t) => t.tenantId),
  });
  if (!activeTenantId) return null;

  const selectedRow = tenantOptionsAll.find((t) => t.tenantId === activeTenantId);
  const defaultEntityId =
    (rows.find((r) => r.tenant_id === activeTenantId)?.default_entity_id as string | null) ?? null;

  const base = await workspaceForTenant({
    supabase,
    platformUserId: platformUser.id,
    tenantId: activeTenantId,
    tenantDisplayName: selectedRow?.displayName ?? activeTenantId,
    defaultEntityId,
  });

  if (!base) return null;

  const tenantOptionsForShell: FinanceTenantOption[] = tenantOptionsAll.map(({ tenantId, displayName }) => ({
    tenantId,
    displayName,
  }));

  const roleSummaries = await fetchFinanceRoleSummaries(
    supabase,
    platformUser.id,
    activeTenantId
  );

  return {
    ...base,
    tenantOptions: tenantOptionsForShell,
    roleSummaries,
  };
}

/** Resolves workspace for finance screens; redirects to /login when unauthenticated. */
export async function resolveFinanceWorkspace(): Promise<FinanceWorkspace | null> {
  await requireAuthSession();
  return getOptionalFinanceWorkspace();
}
