"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import type { TenantAdminOption } from "@/lib/admin/user-admin-access";
import type { UserAdminSnapshot } from "@/lib/admin/load-user-admin-snapshot";
import {
  addTenantMembership,
  assignUserRole,
  inviteUserToTenant,
  removeTenantMembership,
  revokeUserRoleAssignment,
  updatePlatformUserAdmin,
  updateTenantMembershipAdmin,
} from "@/modules/platform/actions/platform-actions";

type UiActionResult<T = unknown> = {
  success: boolean;
  message: string;
  errors?: Array<{ message: string }>;
  data?: T;
};

type Props = {
  tenants: TenantAdminOption[];
  tenantId: string;
  snapshot: UserAdminSnapshot;
};

export function UserAdminPanel({ tenants, tenantId, snapshot }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [inviteMode, setInviteMode] = useState<"email" | "temporary_password">("email");
  const [inviteTempPassword, setInviteTempPassword] = useState("");
  const [showInviteTempPassword, setShowInviteTempPassword] = useState(false);
  const [showIssuedTempPassword, setShowIssuedTempPassword] = useState(false);
  const [issuedTempCredential, setIssuedTempCredential] = useState<{ email: string; password: string } | null>(null);
  const [rolePrefillUserId, setRolePrefillUserId] = useState<string | null>(null);
  const [roleCta, setRoleCta] = useState<{ platformUserId: string; email: string } | null>(null);

  function beginAction() {
    setNotice(null);
  }

  function handleActionResult<T>(
    actionLabel: string,
    result: UiActionResult<T>,
    onSuccess?: (data: T | undefined) => void,
  ) {
    if (result.success) {
      setNotice({ kind: "ok", text: `${actionLabel}: ${result.message}` });
      onSuccess?.(result.data);
      router.refresh();
    } else {
      const detail = result.errors?.[0]?.message;
      const fullText =
        result.message.includes("An internal error occurred") && detail
          ? `${result.message} (${detail})`
          : result.message;
      setNotice({ kind: "err", text: `${actionLabel} failed: ${fullText}` });
    }
  }

  function runAction<T>(
    actionLabel: string,
    action: () => Promise<UiActionResult<T>>,
    onSuccess?: (data: T | undefined) => void,
  ) {
    beginAction();
    start(async () => {
      const result = await action();
      handleActionResult(actionLabel, result, onSuccess);
    });
  }

  const memberByUserId = new Map(snapshot.memberships.map((m) => [m.platformUserId, m]));
  const activeRolesByUserId = new Map<string, string[]>();
  for (const a of snapshot.assignments) {
    if (!a.isActive) continue;
    const list = activeRolesByUserId.get(a.platformUserId) ?? [];
    list.push(a.roleName);
    activeRolesByUserId.set(a.platformUserId, list);
  }

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
            <h2 className="wf-section-title">Create or Invite User</h2>
            <p className="mt-1 text-xs text-neutral-500">
              {inviteMode === "email"
                ? "Send a standard email invite (requires Supabase email delivery)."
                : "Create immediately with a temporary password when SMTP is unavailable."}
            </p>
          </div>
          {issuedTempCredential ? (
            <div className="rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2.5 text-xs text-amber-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">Temporary credential issued for {issuedTempCredential.email}</p>
                <button
                  type="button"
                  className="text-amber-300 hover:text-amber-200"
                  onClick={() => setIssuedTempCredential(null)}
                >
                  Dismiss
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="rounded bg-black/30 px-2 py-1">
                  {showIssuedTempPassword ? issuedTempCredential.password : "••••••••••••"}
                </code>
                <button
                  type="button"
                  className="rounded border border-amber-500/35 px-2 py-1 text-[11px] hover:bg-amber-500/10"
                  onClick={() => setShowIssuedTempPassword((v) => !v)}
                >
                  {showIssuedTempPassword ? "Hide" : "Reveal"}
                </button>
                <button
                  type="button"
                  className="rounded border border-amber-500/35 px-2 py-1 text-[11px] hover:bg-amber-500/10"
                  onClick={async () => {
                    await navigator.clipboard.writeText(issuedTempCredential.password);
                  }}
                >
                  Copy
                </button>
              </div>
              <p className="mt-2 text-[11px] text-amber-300/85">
                Require password change on first login is flagged in user metadata.
              </p>
            </div>
          ) : null}
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const email = String(fd.get("invite_email") ?? "").trim();
              const fullName = String(fd.get("invite_name") ?? "").trim();
              const defaultEntityId = String(fd.get("invite_entity") ?? "");
              const roleId = String(fd.get("invite_role") ?? "").trim();
              const selectedInviteMode = String(fd.get("invite_mode") ?? "email") as
                | "email"
                | "temporary_password";
              runAction("User creation", async () => {
                return inviteUserToTenant({
                  tenantId,
                  email,
                  fullName,
                  defaultEntityId,
                  roleId: roleId ? roleId : undefined,
                  inviteMode: selectedInviteMode,
                  temporaryPassword:
                    selectedInviteMode === "temporary_password" ? inviteTempPassword.trim() || undefined : undefined,
                });
              }, (data) => {
                const platformUserId = (data as { platformUserId?: string } | undefined)?.platformUserId;
                const temporaryPassword = (data as { temporaryPassword?: string } | undefined)?.temporaryPassword;
                if (selectedInviteMode === "temporary_password" && temporaryPassword) {
                  setIssuedTempCredential({ email, password: temporaryPassword });
                  setShowIssuedTempPassword(false);
                }
                if (platformUserId && !roleId && snapshot.canAssignRoles) {
                  setRoleCta({ platformUserId, email });
                  setRolePrefillUserId(platformUserId);
                } else {
                  setRoleCta(null);
                }
                setInviteTempPassword("");
              });
            }}
          >
            <input name="invite_email" type="email" required placeholder="Email" className="wf-input" />
            <input name="invite_name" type="text" required placeholder="Full name" className="wf-input" />
            <select
              name="invite_mode"
              className="wf-input"
              value={inviteMode}
              onChange={(e) => setInviteMode(e.target.value as "email" | "temporary_password")}
            >
              <option value="email">Send email invite</option>
              <option value="temporary_password">Set temporary password (no email)</option>
            </select>
            <select name="invite_entity" required className="wf-input">
              {snapshot.entities.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.code} — {en.display_name}
                </option>
              ))}
            </select>
            {inviteMode === "temporary_password" ? (
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  name="invite_temp_password"
                  type={showInviteTempPassword ? "text" : "password"}
                  value={inviteTempPassword}
                  onChange={(e) => setInviteTempPassword(e.target.value)}
                  placeholder="Temporary password (optional, auto-generated if blank)"
                  className="wf-input"
                />
                <button
                  type="button"
                  className="rounded border border-white/15 px-2 py-1 text-xs text-neutral-300 hover:bg-white/5"
                  onClick={() => setShowInviteTempPassword((v) => !v)}
                >
                  {showInviteTempPassword ? "Hide" : "Reveal"}
                </button>
                <button
                  type="button"
                  className="rounded border border-white/15 px-2 py-1 text-xs text-neutral-300 hover:bg-white/5"
                  onClick={async () => {
                    if (!inviteTempPassword) return;
                    await navigator.clipboard.writeText(inviteTempPassword);
                  }}
                >
                  Copy
                </button>
              </div>
            ) : null}
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
                {inviteMode === "temporary_password"
                  ? "Create user with temporary password"
                  : "Send invite & create membership"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {roleCta && snapshot.canAssignRoles ? (
        <div className="rounded-lg border border-sky-500/30 bg-sky-950/20 px-4 py-3 text-sm text-sky-200">
          <p>
            User created. Next step: assign a role for <strong>{roleCta.email}</strong>.
          </p>
          <button
            type="button"
            className="mt-2 rounded border border-sky-500/35 px-3 py-1.5 text-xs text-sky-200 hover:bg-sky-500/10"
            onClick={() => {
              const el = document.getElementById("assign-role-user-select");
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
              (el as HTMLSelectElement | null)?.focus();
            }}
          >
            Assign role now
          </button>
        </div>
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
              runAction("Membership add", async () => {
                return addTenantMembership({
                  tenantId,
                  targetPlatformUserId,
                  defaultEntityId: ent ? ent : null,
                });
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
                  <div className="text-xs text-neutral-500 mt-1">
                    Roles: {activeRolesByUserId.get(m.platformUserId)?.join(", ") ?? "No active role"}
                  </div>
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
                      runAction("Membership update", async () => {
                        return updateTenantMembershipAdmin({
                          tenantId,
                          targetPlatformUserId: m.platformUserId,
                          defaultEntityId:
                            defaultEntityIdRaw === "" ? null : defaultEntityIdRaw,
                          membershipStatus,
                        });
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
                  <form
                    className="mt-2 flex flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const fullName = String(fd.get("profile_name") ?? "").trim();
                      const email = String(fd.get("profile_email") ?? "").trim();
                      const platformStatus = String(fd.get("profile_status") ?? "active") as
                        | "active"
                        | "inactive";
                      runAction("User profile update", async () => {
                        return updatePlatformUserAdmin({
                          tenantId,
                          targetPlatformUserId: m.platformUserId,
                          fullName,
                          email,
                          platformStatus,
                        });
                      });
                    }}
                  >
                    <input
                      name="profile_name"
                      defaultValue={m.fullName}
                      className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-neutral-200 min-w-[12rem]"
                    />
                    <input
                      name="profile_email"
                      type="email"
                      defaultValue={m.email}
                      className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-neutral-200 min-w-[14rem]"
                    />
                    <select
                      name="profile_status"
                      defaultValue={m.platformStatus}
                      className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-neutral-200"
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                    <button
                      type="submit"
                      className="rounded border border-white/15 px-2 py-1 text-xs text-sky-400 hover:bg-white/5"
                      disabled={pending || !snapshot.canInvite}
                    >
                      Save profile
                    </button>
                    <button
                      type="button"
                      className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-950/30"
                      disabled={pending || !snapshot.canInvite}
                      onClick={() => {
                        if (!window.confirm(`Remove ${m.email} from this tenant?`)) return;
                        runAction("User remove", async () => {
                          return removeTenantMembership({
                            tenantId,
                            targetPlatformUserId: m.platformUserId,
                            deactivatePlatformUser: false,
                          });
                        });
                      }}
                    >
                      Remove user
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
              runAction("Role assignment", async () => {
                return assignUserRole({ tenantId, targetPlatformUserId, roleId });
              }, () => {
                setRoleCta(null);
              });
            }}
          >
            <label className="block flex-1 min-w-[12rem] text-sm text-neutral-400">
              <span className="mb-1 block text-xs text-neutral-500">Member</span>
              <select
                id="assign-role-user-select"
                name="role_user"
                required
                className="wf-input"
                value={rolePrefillUserId ?? snapshot.memberships.find((m) => m.membershipStatus === "active")?.platformUserId ?? ""}
                onChange={(e) => setRolePrefillUserId(e.target.value)}
              >
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
                          runAction("Role revoke", async () => {
                            return revokeUserRoleAssignment({
                              tenantId,
                              assignmentId: a.id,
                            });
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
