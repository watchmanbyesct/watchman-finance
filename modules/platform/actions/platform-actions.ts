"use server";

import { z } from "zod";
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
