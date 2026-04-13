"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";

const UpdateEntitySchema = z.object({
  tenantId:     z.string().uuid(),
  entityId:     z.string().uuid(),
  displayName:  z.string().min(1).max(255).optional(),
  status:       z.enum(["active", "inactive"]).optional(),
  baseCurrency: z.string().length(3).optional(),
});

const AssignUserRoleSchema = z.object({
  tenantId:              z.string().uuid(),
  targetPlatformUserId:  z.string().uuid(),
  roleId:                z.string().uuid(),
});

const AssignUserEntityScopeSchema = z.object({
  tenantId:              z.string().uuid(),
  targetPlatformUserId:  z.string().uuid(),
  entityId:              z.string().uuid(),
});

const SetModuleEntitlementSchema = z.object({
  tenantId:   z.string().uuid(),
  moduleKey:  z.string().min(1).max(64),
  isEnabled:  z.boolean(),
});

const AddTenantMembershipSchema = z.object({
  tenantId:             z.string().uuid(),
  targetPlatformUserId: z.string().uuid(),
  defaultEntityId:      z.string().uuid().nullable().optional(),
});

const UpdateTenantMembershipAdminSchema = z.object({
  tenantId:             z.string().uuid(),
  targetPlatformUserId: z.string().uuid(),
  defaultEntityId:      z.string().uuid().nullable().optional(),
  membershipStatus:     z.enum(["active", "suspended"]).optional(),
});

const RevokeUserRoleAssignmentSchema = z.object({
  tenantId:     z.string().uuid(),
  assignmentId: z.string().uuid(),
});

const InviteUserToTenantSchema = z.object({
  tenantId:        z.string().uuid(),
  email:           z.string().email(),
  fullName:        z.string().min(1).max(200),
  defaultEntityId: z.string().uuid(),
  roleId:          z.string().uuid().optional(),
});

/**
 * Update entity metadata. Permission: entity.update
 */
export async function updateEntity(
  input: z.infer<typeof UpdateEntitySchema>
): Promise<ActionResult> {
  try {
    const parsed = UpdateEntitySchema.parse(input);
    const ctx = await resolveRequestContext(parsed.tenantId);
    requirePermission(ctx, "entity.update");
    requireEntityScope(ctx, parsed.entityId);

    if (!parsed.displayName && !parsed.status && !parsed.baseCurrency) {
      return { success: false, message: "No fields to update." };
    }

    const admin = createSupabaseAdminClient();
    const { data: existing } = await admin
      .from("entities")
      .select("id, display_name, status, base_currency")
      .eq("id", parsed.entityId)
      .eq("tenant_id", parsed.tenantId)
      .single();

    if (!existing) return { success: false, message: "Entity not found." };

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.displayName !== undefined) patch.display_name = parsed.displayName;
    if (parsed.status !== undefined) patch.status = parsed.status;
    if (parsed.baseCurrency !== undefined) patch.base_currency = parsed.baseCurrency;

    const { error } = await admin.from("entities").update(patch).eq("id", parsed.entityId);
    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            parsed.tenantId,
      entityId:            parsed.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "entity.update",
      targetTable:         "entities",
      targetRecordId:      parsed.entityId,
      oldValues:           existing,
      newValues:           patch,
    });

    return { success: true, message: "Entity updated." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Assign a role to a user in the tenant. Permission: user.role_assign
 */
export async function assignUserRole(
  input: z.infer<typeof AssignUserRoleSchema>
): Promise<ActionResult> {
  try {
    const parsed = AssignUserRoleSchema.parse(input);
    const ctx = await resolveRequestContext(parsed.tenantId);
    requirePermission(ctx, "user.role_assign");

    const admin = createSupabaseAdminClient();

    const { data: membership } = await admin
      .from("tenant_memberships")
      .select("id")
      .eq("tenant_id", parsed.tenantId)
      .eq("platform_user_id", parsed.targetPlatformUserId)
      .eq("membership_status", "active")
      .single();

    if (!membership) {
      return { success: false, message: "Target user is not an active member of this tenant." };
    }

    const { data: role } = await admin
      .from("roles")
      .select("id")
      .eq("id", parsed.roleId)
      .eq("tenant_id", parsed.tenantId)
      .single();

    if (!role) return { success: false, message: "Role not found for this tenant." };

    const { error } = await admin.from("user_role_assignments").upsert(
      {
        tenant_id:           parsed.tenantId,
        platform_user_id:    parsed.targetPlatformUserId,
        role_id:             parsed.roleId,
        is_active:           true,
        updated_at:          new Date().toISOString(),
      },
      { onConflict: "tenant_id,platform_user_id,role_id" }
    );

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            parsed.tenantId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "user.role_assign",
      targetTable:         "user_role_assignments",
      targetRecordId:      parsed.targetPlatformUserId,
      newValues:           { roleId: parsed.roleId, targetPlatformUserId: parsed.targetPlatformUserId },
    });

    revalidatePath("/admin/users");
    return { success: true, message: "Role assigned." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Grant entity scope to a user. Permission: user.scope_assign
 */
export async function assignUserEntityScope(
  input: z.infer<typeof AssignUserEntityScopeSchema>
): Promise<ActionResult> {
  try {
    const parsed = AssignUserEntityScopeSchema.parse(input);
    const ctx = await resolveRequestContext(parsed.tenantId);
    requirePermission(ctx, "user.scope_assign");
    requireEntityScope(ctx, parsed.entityId);

    const admin = createSupabaseAdminClient();

    const { data: membership } = await admin
      .from("tenant_memberships")
      .select("id")
      .eq("tenant_id", parsed.tenantId)
      .eq("platform_user_id", parsed.targetPlatformUserId)
      .eq("membership_status", "active")
      .single();

    if (!membership) {
      return { success: false, message: "Target user is not an active member of this tenant." };
    }

    const { data: entity } = await admin
      .from("entities")
      .select("id")
      .eq("id", parsed.entityId)
      .eq("tenant_id", parsed.tenantId)
      .single();

    if (!entity) return { success: false, message: "Entity not found." };

    const { error } = await admin.from("user_entity_scopes").upsert(
      {
        tenant_id:           parsed.tenantId,
        platform_user_id:    parsed.targetPlatformUserId,
        entity_id:           parsed.entityId,
      },
      { onConflict: "tenant_id,platform_user_id,entity_id" }
    );

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            parsed.tenantId,
      entityId:            parsed.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "user.entity_scope_assign",
      targetTable:         "user_entity_scopes",
      newValues:           { targetPlatformUserId: parsed.targetPlatformUserId, entityId: parsed.entityId },
    });

    return { success: true, message: "Entity scope granted." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Enable or disable a finance module for the tenant. Permission: module.entitlement.manage
 */
export async function setModuleEntitlement(
  input: z.infer<typeof SetModuleEntitlementSchema>
): Promise<ActionResult> {
  try {
    const parsed = SetModuleEntitlementSchema.parse(input);
    const ctx = await resolveRequestContext(parsed.tenantId);
    requirePermission(ctx, "module.entitlement.manage");

    const admin = createSupabaseAdminClient();

    const { error } = await admin.from("tenant_module_entitlements").upsert(
      {
        tenant_id:   parsed.tenantId,
        module_key:  parsed.moduleKey,
        is_enabled:  parsed.isEnabled,
        updated_at:  new Date().toISOString(),
      },
      { onConflict: "tenant_id,module_key" }
    );

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            parsed.tenantId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "tenant.module_entitlement.set",
      targetTable:         "tenant_module_entitlements",
      newValues:           { moduleKey: parsed.moduleKey, isEnabled: parsed.isEnabled },
    });

    return { success: true, message: `Module ${parsed.moduleKey} ${parsed.isEnabled ? "enabled" : "disabled"}.` };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Add or reactivate a tenant membership. Permission: user.invite
 */
export async function addTenantMembership(
  input: z.infer<typeof AddTenantMembershipSchema>,
): Promise<ActionResult> {
  try {
    const parsed = AddTenantMembershipSchema.parse(input);
    const ctx = await resolveRequestContext(parsed.tenantId);
    requirePermission(ctx, "user.invite");

    const admin = createSupabaseAdminClient();

    if (parsed.defaultEntityId) {
      requireEntityScope(ctx, parsed.defaultEntityId);
      const { data: ent } = await admin
        .from("entities")
        .select("id")
        .eq("id", parsed.defaultEntityId)
        .eq("tenant_id", parsed.tenantId)
        .single();
      if (!ent) return { success: false, message: "Default entity not found for this tenant." };
    }

    const { error: memErr } = await admin.from("tenant_memberships").upsert(
      {
        tenant_id:           parsed.tenantId,
        platform_user_id:    parsed.targetPlatformUserId,
        membership_status:   "active",
        default_entity_id:   parsed.defaultEntityId ?? null,
        updated_at:          new Date().toISOString(),
      },
      { onConflict: "tenant_id,platform_user_id" },
    );

    if (memErr) throw new Error(memErr.message);

    if (parsed.defaultEntityId) {
      await admin.from("user_entity_scopes").upsert(
        {
          tenant_id:        parsed.tenantId,
          platform_user_id: parsed.targetPlatformUserId,
          entity_id:        parsed.defaultEntityId,
        },
        { onConflict: "tenant_id,platform_user_id,entity_id" },
      );
    }

    await writeAuditLog({
      tenantId:            parsed.tenantId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "user.membership_add",
      targetTable:         "tenant_memberships",
      targetRecordId:      parsed.targetPlatformUserId,
      newValues:           {
        targetPlatformUserId: parsed.targetPlatformUserId,
        defaultEntityId:      parsed.defaultEntityId ?? null,
      },
    });

    revalidatePath("/admin/users");
    return { success: true, message: "Membership saved." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Update default entity and/or membership status. Permission: user.invite
 */
export async function updateTenantMembershipAdmin(
  input: z.infer<typeof UpdateTenantMembershipAdminSchema>,
): Promise<ActionResult> {
  try {
    const parsed = UpdateTenantMembershipAdminSchema.parse(input);
    const ctx = await resolveRequestContext(parsed.tenantId);
    requirePermission(ctx, "user.invite");

    if (parsed.defaultEntityId === undefined && parsed.membershipStatus === undefined) {
      return { success: false, message: "No changes provided." };
    }

    const admin = createSupabaseAdminClient();

    if (parsed.defaultEntityId !== undefined && parsed.defaultEntityId !== null) {
      requireEntityScope(ctx, parsed.defaultEntityId);
      const { data: ent } = await admin
        .from("entities")
        .select("id")
        .eq("id", parsed.defaultEntityId)
        .eq("tenant_id", parsed.tenantId)
        .single();
      if (!ent) return { success: false, message: "Entity not found for this tenant." };
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.defaultEntityId !== undefined) patch.default_entity_id = parsed.defaultEntityId;
    if (parsed.membershipStatus !== undefined) patch.membership_status = parsed.membershipStatus;

    const { error } = await admin
      .from("tenant_memberships")
      .update(patch)
      .eq("tenant_id", parsed.tenantId)
      .eq("platform_user_id", parsed.targetPlatformUserId);

    if (error) throw new Error(error.message);

    if (parsed.defaultEntityId) {
      await admin.from("user_entity_scopes").upsert(
        {
          tenant_id:        parsed.tenantId,
          platform_user_id: parsed.targetPlatformUserId,
          entity_id:        parsed.defaultEntityId,
        },
        { onConflict: "tenant_id,platform_user_id,entity_id" },
      );
    }

    await writeAuditLog({
      tenantId:            parsed.tenantId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "user.membership_update",
      targetTable:         "tenant_memberships",
      targetRecordId:      parsed.targetPlatformUserId,
      newValues:           patch,
    });

    revalidatePath("/admin/users");
    return { success: true, message: "Membership updated." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Deactivate a role assignment (row kept for audit). Permission: user.role_assign
 */
export async function revokeUserRoleAssignment(
  input: z.infer<typeof RevokeUserRoleAssignmentSchema>,
): Promise<ActionResult> {
  try {
    const parsed = RevokeUserRoleAssignmentSchema.parse(input);
    const ctx = await resolveRequestContext(parsed.tenantId);
    requirePermission(ctx, "user.role_assign");

    const admin = createSupabaseAdminClient();

    const { data: row } = await admin
      .from("user_role_assignments")
      .select("id, platform_user_id, role_id, is_active")
      .eq("id", parsed.assignmentId)
      .eq("tenant_id", parsed.tenantId)
      .single();

    if (!row) return { success: false, message: "Assignment not found." };

    const { error } = await admin
      .from("user_role_assignments")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", parsed.assignmentId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            parsed.tenantId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "user.role_revoke",
      targetTable:         "user_role_assignments",
      targetRecordId:      parsed.assignmentId,
      oldValues:           row,
      newValues:           { is_active: false },
    });

    revalidatePath("/admin/users");
    return { success: true, message: "Role assignment revoked." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Invite a new auth user by email, create platform_user, membership, default scope, optional role.
 * Permission: user.invite (and user.role_assign if roleId set).
 */
export async function inviteUserToTenant(
  input: z.infer<typeof InviteUserToTenantSchema>,
): Promise<ActionResult<{ authUserId: string }>> {
  try {
    const parsed = InviteUserToTenantSchema.parse(input);
    const ctx = await resolveRequestContext(parsed.tenantId);
    requirePermission(ctx, "user.invite");
    requireEntityScope(ctx, parsed.defaultEntityId);

    if (parsed.roleId) {
      requirePermission(ctx, "user.role_assign");
    }

    const admin = createSupabaseAdminClient();

    const { data: ent } = await admin
      .from("entities")
      .select("id")
      .eq("id", parsed.defaultEntityId)
      .eq("tenant_id", parsed.tenantId)
      .single();
    if (!ent) return { success: false, message: "Default entity not found for this tenant." };

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(parsed.email, {
      data: { full_name: parsed.fullName },
      redirectTo: `${baseUrl}/auth/callback`,
    });

    if (inviteErr) {
      return {
        success: false,
        message:
          inviteErr.message ??
          "Invite failed. If this address already has an account, add them with “Existing platform user” instead.",
      };
    }

    const authUserId = inviteData.user?.id;
    if (!authUserId) return { success: false, message: "Invite did not return a user id." };

    const { error: puErr } = await admin.from("platform_users").upsert(
      {
        auth_user_id: authUserId,
        email:        parsed.email.toLowerCase().trim(),
        full_name:    parsed.fullName.trim(),
        status:       "active",
        updated_at:   new Date().toISOString(),
      },
      { onConflict: "auth_user_id" },
    );

    if (puErr) throw new Error(puErr.message);

    const { data: puRow } = await admin
      .from("platform_users")
      .select("id")
      .eq("auth_user_id", authUserId)
      .single();

    if (!puRow) return { success: false, message: "Could not resolve platform user after invite." };

    const { error: memErr } = await admin.from("tenant_memberships").upsert(
      {
        tenant_id:         parsed.tenantId,
        platform_user_id:  puRow.id,
        membership_status: "active",
        default_entity_id: parsed.defaultEntityId,
        updated_at:        new Date().toISOString(),
      },
      { onConflict: "tenant_id,platform_user_id" },
    );

    if (memErr) throw new Error(memErr.message);

    await admin.from("user_entity_scopes").upsert(
      {
        tenant_id:        parsed.tenantId,
        platform_user_id: puRow.id,
        entity_id:        parsed.defaultEntityId,
      },
      { onConflict: "tenant_id,platform_user_id,entity_id" },
    );

    if (parsed.roleId) {
      const { data: role } = await admin
        .from("roles")
        .select("id")
        .eq("id", parsed.roleId)
        .eq("tenant_id", parsed.tenantId)
        .single();

      if (!role) return { success: false, message: "Role not found for this tenant." };

      const { error: raErr } = await admin.from("user_role_assignments").upsert(
        {
          tenant_id:        parsed.tenantId,
          platform_user_id: puRow.id,
          role_id:          parsed.roleId,
          is_active:        true,
          updated_at:       new Date().toISOString(),
        },
        { onConflict: "tenant_id,platform_user_id,role_id" },
      );

      if (raErr) throw new Error(raErr.message);
    }

    await writeAuditLog({
      tenantId:            parsed.tenantId,
      entityId:            parsed.defaultEntityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "user.invite",
      targetTable:         "platform_users",
      targetRecordId:      puRow.id,
      newValues:           { email: parsed.email, roleId: parsed.roleId ?? null },
    });

    revalidatePath("/admin/users");
    return {
      success: true,
      message: "Invite sent. They will receive email to set a password (if your Supabase Auth templates are enabled).",
      data:    { authUserId },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
