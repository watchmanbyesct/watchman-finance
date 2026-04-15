/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import Link from "next/link";
import { AdminSubpage } from "@/components/admin/admin-subpage";
import { UserAdminPanel } from "@/components/admin/user-admin-panel";
import { getTenantsWhereActorCanManageUsers } from "@/lib/admin/user-admin-access";
import { loadUserAdminSnapshot } from "@/lib/admin/load-user-admin-snapshot";

export const metadata = { title: "User access — Administration" };

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const tenants = await getTenantsWhereActorCanManageUsers();
  const tenantParam = typeof searchParams.tenant === "string" ? searchParams.tenant : undefined;
  const tenantId =
    tenantParam && tenants.some((t) => t.id === tenantParam) ? tenantParam : tenants[0]?.id;

  if (!tenantId) {
    return (
      <AdminSubpage
        title="User access"
        description="Users, roles, entity scopes, and permissions (Pack 001). You need user.invite or user.role_assign on at least one tenant to use this screen."
      >
        <div className="wf-card space-y-3 text-sm text-neutral-400 leading-relaxed">
          <p>
            No eligible tenant found for your account. Ask a tenant owner to grant{" "}
            <code className="text-xs text-neutral-300">user.invite</code> or{" "}
            <code className="text-xs text-neutral-300">user.role_assign</code>, or continue using Supabase /{" "}
            <code className="text-xs text-neutral-300">npm run greenfield:bootstrap</code> for new environments.
          </p>
          <ul className="list-disc list-inside space-y-1 text-neutral-500">
            <li>
              <Link href="/finance/pack-013" className="text-amber-500 hover:text-amber-400">
                Permission codes reference (Pack 013)
              </Link>
            </li>
          </ul>
        </div>
      </AdminSubpage>
    );
  }

  const snapshot = await loadUserAdminSnapshot(tenantId);

  return (
    <AdminSubpage
      title="User access"
      description="Invite users, add existing platform accounts to a tenant, edit memberships, assign roles, and revoke role assignments. Mutations use server actions with the same permission checks as the rest of the app."
    >
      <UserAdminPanel tenants={tenants} tenantId={tenantId} snapshot={snapshot} />
      <div className="text-xs text-neutral-600 space-y-1">
        <p>
          <Link href="/finance/pack-013" className="text-amber-600 hover:text-amber-500">
            Pack 013 — permission reference
          </Link>
        </p>
      </div>
    </AdminSubpage>
  );
}
