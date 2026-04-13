"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import type { TenantAdminOption } from "@/lib/admin/user-admin-access";
import type { UserAdminSnapshot } from "@/lib/admin/load-user-admin-snapshot";
import {
  addTenantMembership,
  assignUserRole,
  inviteUserToTenant,
  revokeUserRoleAssignment,
  updateTenantMembershipAdmin,
} from "@/modules/platform/actions/platform-actions";

type Props = {
  tenants: TenantAdminOption[];
  tenantId: string;
  snapshot: UserAdminSnapshot;
};

export function UserAdminPanel({ tenants, tenantId, snapshot }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function handleActionResult(result: {
    success: boolean;
    message: string;
    errors?: Array<{ message: string }>;
  }) {
    if (result.success) {
      setNotice({ kind: "ok", text: result.message });
      router.refresh();
    } else {
      const detail = result.errors?.[0]?.message;
      const fullText =
        result.message.includes("An internal error occurred") && detail
          ? `${result.message} (${detail})`
          : result.message;
      setNotice({ kind: "err", text: fullText });
    }
  }

  const memberByUserId = new Map(snapshot.memberships.map((m) => [m.platformUserId, m]));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block text-sm text-neutral-400">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500">
            Tenant
          </span>
          <select
            className="wf-input max-w-md"
            value={tenantId}
            disabled={pending}
            onChange={(e) => {
              router.push(`/admin/users?tenant=${encodeURIComponent(e.target.value)}`);
            }}
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.display_name} ({t.slug})
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-neutral-500 max-w-md">
          Requires <code className="text-neutral-400">user.invite</code> and/or{" "}
          <code className="text-neutral-400">user.role_assign</code> on this tenant (e.g. tenant owner).
        </p>
      </div>

      {notice ? (
        <div
          className={
            notice.kind === "ok"
              ? "rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200"
              : "rounded-lg border border-red-500/30 bg-red-950/25 px-4 py-3 text-sm text-red-200"
          }
        >
          {notice.text}
        </div>
      ) : null}

      {snapshot.canInvite && snapshot.entities.length > 0 ? (
        <section className="wf-card space-y-4">
          <div>
            <h2 className="wf-section-title">Invite by email</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Sends a Supabase Auth invite. If the address already exists, use &quot;Existing platform user&quot;
              below.
            </p>
          </div>
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const email = String(fd.get("invite_email") ?? "").trim();
              const fullName = String(fd.get("invite_name") ?? "").trim();
              const defaultEntityId = String(fd.get("invite_entity") ?? "");
              const roleId = String(fd.get("invite_role") ?? "").trim();
              start(async () => {
                const r = await inviteUserToTenant({
                  tenantId,
                  email,
                  fullName,
                  defaultEntityId,
                  roleId: roleId ? roleId : undefined,
                });
                handleActionResult(r);
              });
            }}
          >
            <input name="invite_email" type="email" required placeholder="Email" className="wf-input" />
            <input name="invite_name" type="text" required placeholder="Full name" className="wf-input" />
            <select name="invite_entity" required className="wf-input">
              {snapshot.entities.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.code} — {en.display_name}
                </option>
              ))}
            </select>
            <select name="invite_role" className="wf-input">
              <option value="">No role yet</option>
              {snapshot.roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <div className="sm:col-span-2 lg:col-span-4">
              <button type="submit" className="wf-btn-primary" disabled={pending}>
                Send invite &amp; create membership
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {snapshot.canInvite && snapshot.platformUsersNotInTenant.length > 0 ? (
        <section className="wf-card space-y-4">
          <div>
            <h2 className="wf-section-title">Add existing platform user</h2>
            <p className="mt-1 text-xs text-neutral-500">
              User must already have signed in once so a{" "}
              <code className="text-neutral-400">platform_users</code> row exists.
            </p>
          </div>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const targetPlatformUserId = String(fd.get("add_user") ?? "");
              const ent = String(fd.get("add_entity") ?? "");
              start(async () => {
                const r = await addTenantMembership({
                  tenantId,
                  targetPlatformUserId,
                  defaultEntityId: ent ? ent : null,
                });
                handleActionResult(r);
              });
            }}
          >
            <label className="block flex-1 min-w-[12rem] text-sm text-neutral-400">
              <span className="mb-1 block text-xs text-neutral-500">Platform user</span>
              <select name="add_user" required className="wf-input">
                {snapshot.platformUsersNotInTenant.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} — {u.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block flex-1 min-w-[12rem] text-sm text-neutral-400">
              <span className="mb-1 block text-xs text-neutral-500">Default entity (optional)</span>
              <select name="add_entity" className="wf-input">
                <option value="">—</option>
                {snapshot.entities.map((en) => (
                  <option key={en.id} value={en.id}>
                    {en.code}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="wf-btn-secondary" disabled={pending}>
              Add to tenant
            </button>
          </form>
        </section>
      ) : null}

      <section className="wf-card overflow-x-auto">
        <h2 className="wf-section-title mb-4">Members</h2>
        <table className="wf-table text-sm">
          <thead>
            <tr>
              <th>User</th>
              <th>Membership</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.memberships.map((m) => (
              <tr key={m.membershipId}>
                <td className="align-top">
                  <div className="font-medium text-neutral-200">{m.email}</div>
                  <div className="text-xs text-neutral-500">{m.fullName}</div>
                  <div className="text-xs text-neutral-600 mt-1">
                    Default entity: {m.defaultEntityLabel ?? "—"}
                  </div>
                </td>
                <td className="align-top">
                  <form
                    className="flex flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const defaultEntityIdRaw = String(fd.get("def_ent") ?? "");
                      const membershipStatus = String(fd.get("mem_status") ?? "active") as
                        | "active"
                        | "suspended";
                      start(async () => {
                        const r = await updateTenantMembershipAdmin({
                          tenantId,
                          targetPlatformUserId: m.platformUserId,
                          defaultEntityId:
                            defaultEntityIdRaw === "" ? null : defaultEntityIdRaw,
                          membershipStatus,
                        });
                        handleActionResult(r);
                      });
                    }}
                  >
                    <select
                      name="mem_status"
                      defaultValue={m.membershipStatus}
                      className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-neutral-200"
                    >
                      <option value="active">active</option>
                      <option value="suspended">suspended</option>
                    </select>
                    <select
                      name="def_ent"
                      defaultValue={m.defaultEntityId ?? ""}
                      className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-neutral-200 min-w-[8rem]"
                    >
                      <option value="">— none —</option>
                      {snapshot.entities.map((en) => (
                        <option key={en.id} value={en.id}>
                          {en.code}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded border border-white/15 px-2 py-1 text-xs text-amber-500 hover:bg-white/5"
                      disabled={pending || !snapshot.canInvite}
                    >
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {snapshot.memberships.length === 0 ? (
          <p className="text-sm text-neutral-500 py-4">No memberships for this tenant.</p>
        ) : null}
      </section>

      {snapshot.canAssignRoles && snapshot.memberships.some((m) => m.membershipStatus === "active") ? (
        <section className="wf-card space-y-4">
          <h2 className="wf-section-title">Assign role</h2>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const targetPlatformUserId = String(fd.get("role_user") ?? "");
              const roleId = String(fd.get("role_id") ?? "");
              start(async () => {
                const r = await assignUserRole({ tenantId, targetPlatformUserId, roleId });
                handleActionResult(r);
              });
            }}
          >
            <label className="block flex-1 min-w-[12rem] text-sm text-neutral-400">
              <span className="mb-1 block text-xs text-neutral-500">Member</span>
              <select name="role_user" required className="wf-input">
                {snapshot.memberships
                  .filter((m) => m.membershipStatus === "active")
                  .map((m) => (
                    <option key={m.platformUserId} value={m.platformUserId}>
                      {m.email}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block flex-1 min-w-[12rem] text-sm text-neutral-400">
              <span className="mb-1 block text-xs text-neutral-500">Role</span>
              <select name="role_id" required className="wf-input">
                {snapshot.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} ({role.code})
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="wf-btn-primary" disabled={pending}>
              Assign role
            </button>
          </form>
        </section>
      ) : null}

      <section className="wf-card overflow-x-auto">
        <h2 className="wf-section-title mb-4">Role assignments</h2>
        <table className="wf-table text-sm">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th className="w-[1%]"> </th>
            </tr>
          </thead>
          <tbody>
            {snapshot.assignments.map((a) => {
              const mem = memberByUserId.get(a.platformUserId);
              return (
                <tr key={a.id}>
                  <td>{mem?.email ?? a.platformUserId}</td>
                  <td>
                    <span className="text-neutral-200">{a.roleName}</span>
                    <span className="text-neutral-600 text-xs ml-2">{a.roleCode}</span>
                  </td>
                  <td>{a.isActive ? "active" : "revoked"}</td>
                  <td>
                    {a.isActive && snapshot.canAssignRoles ? (
                      <button
                        type="button"
                        className="text-xs text-red-400 hover:text-red-300"
                        disabled={pending}
                        onClick={() => {
                          start(async () => {
                            const r = await revokeUserRoleAssignment({
                              tenantId,
                              assignmentId: a.id,
                            });
                            handleActionResult(r);
                          });
                        }}
                      >
                        Revoke
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {snapshot.assignments.length === 0 ? (
          <p className="text-sm text-neutral-500 py-4">No role assignments yet.</p>
        ) : null}
      </section>
    </div>
  );
}
