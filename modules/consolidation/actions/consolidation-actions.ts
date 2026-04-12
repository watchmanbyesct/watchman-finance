"use server";

import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope, requireModuleEntitlement } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";
import { z } from "zod";

const CreateConsolidationGroupSchema = z.object({
  tenantId: z.string().uuid(),
  groupCode: z.string().min(1).max(64),
  groupName: z.string().min(1).max(255),
  consolidationCurrency: z.string().length(3).default("USD"),
});

/** Permission: consolidation.group.manage */
export async function createConsolidationGroup(
  input: z.infer<typeof CreateConsolidationGroupSchema>
): Promise<ActionResult<{ consolidationGroupId: string }>> {
  try {
    const v = CreateConsolidationGroupSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "consolidation");
    requirePermission(ctx, "consolidation.group.manage");

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("consolidation_groups")
      .insert({
        tenant_id: v.tenantId,
        group_code: v.groupCode,
        group_name: v.groupName,
        consolidation_currency: v.consolidationCurrency,
        status: "active",
        created_by: ctx.platformUserId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "consolidation",
      actionCode: "consolidation.group.create",
      targetTable: "consolidation_groups",
      targetRecordId: row.id,
      newValues: { groupCode: v.groupCode },
    });

    return { success: true, message: "Consolidation group created.", data: { consolidationGroupId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const AddConsolidationGroupEntitySchema = z.object({
  tenantId: z.string().uuid(),
  consolidationGroupId: z.string().uuid(),
  entityId: z.string().uuid(),
  inclusionStatus: z.enum(["included", "excluded"]).default("included"),
});

/** Permission: consolidation.group.manage */
export async function addEntityToConsolidationGroup(
  input: z.infer<typeof AddConsolidationGroupEntitySchema>
): Promise<ActionResult<{ linkId: string }>> {
  try {
    const v = AddConsolidationGroupEntitySchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "consolidation");
    requirePermission(ctx, "consolidation.group.manage");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();

    const { data: grp, error: ge } = await admin
      .from("consolidation_groups")
      .select("id")
      .eq("id", v.consolidationGroupId)
      .eq("tenant_id", v.tenantId)
      .single();

    if (ge || !grp) {
      return { success: false, message: "Consolidation group not found." };
    }

    const { data: row, error } = await admin
      .from("consolidation_group_entities")
      .insert({
        tenant_id: v.tenantId,
        consolidation_group_id: v.consolidationGroupId,
        entity_id: v.entityId,
        inclusion_status: v.inclusionStatus,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "consolidation",
      actionCode: "consolidation.group_entity.add",
      targetTable: "consolidation_group_entities",
      targetRecordId: row.id,
      newValues: { consolidationGroupId: v.consolidationGroupId, entityId: v.entityId },
    });

    return { success: true, message: "Entity linked to group.", data: { linkId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateEntityRelationshipSchema = z.object({
  tenantId: z.string().uuid(),
  parentEntityId: z.string().uuid(),
  childEntityId: z.string().uuid(),
  relationshipType: z.enum([
    "subsidiary", "division", "branch_entity", "managed_entity", "intercompany",
  ]).default("subsidiary"),
  ownershipPercentage: z.number().min(0).max(100).optional(),
  effectiveStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

/** Permission: consolidation.group.manage */
export async function createEntityRelationship(
  input: z.infer<typeof CreateEntityRelationshipSchema>
): Promise<ActionResult<{ relationshipId: string }>> {
  try {
    const v = CreateEntityRelationshipSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "consolidation");
    requirePermission(ctx, "consolidation.group.manage");
    requireEntityScope(ctx, v.parentEntityId);
    requireEntityScope(ctx, v.childEntityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("entity_relationships")
      .insert({
        tenant_id: v.tenantId,
        parent_entity_id: v.parentEntityId,
        child_entity_id: v.childEntityId,
        relationship_type: v.relationshipType,
        ownership_percentage: v.ownershipPercentage ?? null,
        effective_start_date: v.effectiveStartDate ?? null,
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.parentEntityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "consolidation",
      actionCode: "consolidation.entity_relationship.create",
      targetTable: "entity_relationships",
      targetRecordId: row.id,
      newValues: { parentEntityId: v.parentEntityId, childEntityId: v.childEntityId },
    });

    return { success: true, message: "Entity relationship created.", data: { relationshipId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
