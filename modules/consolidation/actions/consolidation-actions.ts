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

const GenerateConsolidationSnapshotSchema = z.object({
  tenantId: z.string().uuid(),
  consolidationGroupId: z.string().uuid(),
  snapshotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Builds snapshot JSON from consolidation entity list plus optional AR/AP rollups (Pack 009 views). */
export async function generateConsolidationSnapshot(
  input: z.infer<typeof GenerateConsolidationSnapshotSchema>
): Promise<ActionResult<{ consolidationSnapshotId: string }>> {
  try {
    const v = GenerateConsolidationSnapshotSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "consolidation");
    requirePermission(ctx, "consolidation.group.manage");

    const admin = createSupabaseAdminClient();
    const { data: grp, error: ge } = await admin
      .from("consolidation_groups")
      .select("id")
      .eq("id", v.consolidationGroupId)
      .eq("tenant_id", v.tenantId)
      .single();
    if (ge || !grp) return { success: false, message: "Consolidation group not found." };

    const { data: entities, error: ve } = await admin
      .from("v_consolidation_entity_list")
      .select("entity_id, entity_code, entity_name, inclusion_status, group_code, group_name")
      .eq("tenant_id", v.tenantId)
      .eq("consolidation_group_id", v.consolidationGroupId)
      .eq("inclusion_status", "included");

    if (ve) throw new Error(ve.message);

    const entityIds = (entities ?? []).map((r: { entity_id: string }) => r.entity_id);
    let arSummary: unknown[] = [];
    let apSummary: unknown[] = [];
    if (entityIds.length) {
      const arRes = await admin.from("v_ar_aging_summary").select("*").eq("tenant_id", v.tenantId).in("entity_id", entityIds);
      if (!arRes.error) arSummary = arRes.data ?? [];
      const apRes = await admin.from("v_ap_aging_summary").select("*").eq("tenant_id", v.tenantId).in("entity_id", entityIds);
      if (!apRes.error) apSummary = apRes.data ?? [];
    }

    const snapshotJson = {
      entities: entities ?? [],
      arSummary,
      apSummary,
      note: "Pack 011 consolidation snapshot shell; extend with GL eliminations when ready.",
    };

    const generatedAt = new Date().toISOString();
    const { data: row, error } = await admin
      .from("consolidation_snapshots")
      .upsert(
        {
          tenant_id: v.tenantId,
          consolidation_group_id: v.consolidationGroupId,
          snapshot_date: v.snapshotDate,
          snapshot_status: "generated",
          snapshot_json: snapshotJson,
          generated_by: ctx.platformUserId,
          generated_at: generatedAt,
        },
        { onConflict: "consolidation_group_id,snapshot_date" }
      )
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "consolidation",
      actionCode: "consolidation.snapshot.generate",
      targetTable: "consolidation_snapshots",
      targetRecordId: row.id,
      newValues: { consolidationGroupId: v.consolidationGroupId, snapshotDate: v.snapshotDate },
    });

    return { success: true, message: "Consolidation snapshot saved.", data: { consolidationSnapshotId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateIntercompanyAccountSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  counterpartyEntityId: z.string().uuid(),
});

export async function createIntercompanyAccount(
  input: z.infer<typeof CreateIntercompanyAccountSchema>
): Promise<ActionResult<{ intercompanyAccountId: string }>> {
  try {
    const v = CreateIntercompanyAccountSchema.parse(input);
    if (v.entityId === v.counterpartyEntityId) {
      return { success: false, message: "Counterparty must differ from the entity." };
    }
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "consolidation");
    requirePermission(ctx, "consolidation.group.manage");
    requireEntityScope(ctx, v.entityId);
    requireEntityScope(ctx, v.counterpartyEntityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("intercompany_accounts")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        counterparty_entity_id: v.counterpartyEntityId,
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "consolidation",
      actionCode: "consolidation.intercompany_account.create",
      targetTable: "intercompany_accounts",
      targetRecordId: row.id,
      newValues: { counterpartyEntityId: v.counterpartyEntityId },
    });

    return { success: true, message: "Intercompany account mapping created.", data: { intercompanyAccountId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateIntercompanyTransactionSchema = z.object({
  tenantId: z.string().uuid(),
  sourceEntityId: z.string().uuid(),
  counterpartyEntityId: z.string().uuid(),
  transactionCode: z.string().min(1).max(128),
  transactionType: z.enum(["chargeback", "reimbursement", "shared_service", "allocation", "other"]),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number(),
  memo: z.string().max(2000).optional(),
});

export async function createIntercompanyTransaction(
  input: z.infer<typeof CreateIntercompanyTransactionSchema>
): Promise<ActionResult<{ intercompanyTransactionId: string }>> {
  try {
    const v = CreateIntercompanyTransactionSchema.parse(input);
    if (v.sourceEntityId === v.counterpartyEntityId) {
      return { success: false, message: "Counterparty must differ from the source entity." };
    }
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "consolidation");
    requirePermission(ctx, "consolidation.group.manage");
    requireEntityScope(ctx, v.sourceEntityId);
    requireEntityScope(ctx, v.counterpartyEntityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("intercompany_transactions")
      .insert({
        tenant_id: v.tenantId,
        source_entity_id: v.sourceEntityId,
        counterparty_entity_id: v.counterpartyEntityId,
        transaction_code: v.transactionCode,
        transaction_type: v.transactionType,
        transaction_status: "draft",
        transaction_date: v.transactionDate ?? null,
        amount: v.amount,
        memo: v.memo ?? null,
        created_by: ctx.platformUserId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.sourceEntityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "consolidation",
      actionCode: "consolidation.intercompany_transaction.create",
      targetTable: "intercompany_transactions",
      targetRecordId: row.id,
      newValues: { transactionCode: v.transactionCode, amount: v.amount },
    });

    return { success: true, message: "Intercompany transaction created.", data: { intercompanyTransactionId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateTenantActivationChecklistSchema = z.object({
  tenantId: z.string().uuid(),
  checklistName: z.string().min(1).max(255),
});

export async function createTenantActivationChecklist(
  input: z.infer<typeof CreateTenantActivationChecklistSchema>
): Promise<ActionResult<{ checklistId: string }>> {
  try {
    const v = CreateTenantActivationChecklistSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "consolidation");
    requirePermission(ctx, "consolidation.group.manage");

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("tenant_activation_checklists")
      .insert({
        tenant_id: v.tenantId,
        checklist_name: v.checklistName,
        activation_status: "open",
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
      actionCode: "commercial.activation_checklist.create",
      targetTable: "tenant_activation_checklists",
      targetRecordId: row.id,
      newValues: { checklistName: v.checklistName },
    });

    return { success: true, message: "Activation checklist created.", data: { checklistId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateTenantActivationTaskSchema = z.object({
  tenantId: z.string().uuid(),
  tenantActivationChecklistId: z.string().uuid(),
  taskCode: z.string().min(1).max(64),
  taskName: z.string().min(1).max(255),
});

export async function createTenantActivationTask(
  input: z.infer<typeof CreateTenantActivationTaskSchema>
): Promise<ActionResult<{ taskId: string }>> {
  try {
    const v = CreateTenantActivationTaskSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "consolidation");
    requirePermission(ctx, "consolidation.group.manage");

    const admin = createSupabaseAdminClient();
    const { data: cl, error: ce } = await admin
      .from("tenant_activation_checklists")
      .select("id, tenant_id")
      .eq("id", v.tenantActivationChecklistId)
      .single();
    if (ce || !cl || cl.tenant_id !== v.tenantId) {
      return { success: false, message: "Activation checklist not found for this tenant." };
    }

    const { data: row, error } = await admin
      .from("tenant_activation_tasks")
      .insert({
        tenant_id: v.tenantId,
        tenant_activation_checklist_id: v.tenantActivationChecklistId,
        task_code: v.taskCode,
        task_name: v.taskName,
        task_status: "open",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "consolidation",
      actionCode: "commercial.activation_task.create",
      targetTable: "tenant_activation_tasks",
      targetRecordId: row.id,
      newValues: { taskCode: v.taskCode, checklistId: v.tenantActivationChecklistId },
    });

    return { success: true, message: "Activation task created.", data: { taskId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const UpsertTenantFeatureFlagSchema = z.object({
  tenantId: z.string().uuid(),
  featureFlagDefinitionId: z.string().uuid(),
  enabled: z.boolean(),
});

export async function upsertTenantFeatureFlag(
  input: z.infer<typeof UpsertTenantFeatureFlagSchema>
): Promise<ActionResult<{ tenantFeatureFlagId: string }>> {
  try {
    const v = UpsertTenantFeatureFlagSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "consolidation");
    requirePermission(ctx, "consolidation.group.manage");

    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const { data: row, error } = await admin
      .from("tenant_feature_flags")
      .upsert(
        {
          tenant_id: v.tenantId,
          feature_flag_definition_id: v.featureFlagDefinitionId,
          enabled: v.enabled,
          enabled_at: v.enabled ? now : null,
          updated_at: now,
        },
        { onConflict: "tenant_id,feature_flag_definition_id" }
      )
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "consolidation",
      actionCode: "commercial.tenant_feature_flag.upsert",
      targetTable: "tenant_feature_flags",
      targetRecordId: row.id,
      newValues: { enabled: v.enabled, featureFlagDefinitionId: v.featureFlagDefinitionId },
    });

    return { success: true, message: "Tenant feature flag saved.", data: { tenantFeatureFlagId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const StartTenantBootstrapRunSchema = z.object({
  tenantId: z.string().uuid(),
  provisioningTemplateId: z.string().uuid().optional(),
  runNotes: z.string().max(2000).optional(),
});

export async function startTenantBootstrapRun(
  input: z.infer<typeof StartTenantBootstrapRunSchema>
): Promise<ActionResult<{ bootstrapRunId: string }>> {
  try {
    const v = StartTenantBootstrapRunSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "consolidation");
    requirePermission(ctx, "consolidation.group.manage");

    const admin = createSupabaseAdminClient();
    if (v.provisioningTemplateId) {
      const { data: tpl, error: te } = await admin
        .from("tenant_provisioning_templates")
        .select("id")
        .eq("id", v.provisioningTemplateId)
        .single();
      if (te || !tpl) return { success: false, message: "Provisioning template not found." };
    }

    const { data: row, error } = await admin
      .from("tenant_bootstrap_runs")
      .insert({
        tenant_id: v.tenantId,
        provisioning_template_id: v.provisioningTemplateId ?? null,
        bootstrap_status: "started",
        run_notes: v.runNotes ?? null,
        started_by: ctx.platformUserId,
        result_json: {},
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "consolidation",
      actionCode: "commercial.tenant_bootstrap.start",
      targetTable: "tenant_bootstrap_runs",
      targetRecordId: row.id,
      newValues: { provisioningTemplateId: v.provisioningTemplateId ?? null },
    });

    return { success: true, message: "Bootstrap run started.", data: { bootstrapRunId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateClientPortalProfileSchema = z.object({
  tenantId: z.string().uuid(),
  customerId: z.string().uuid(),
  portalStatus: z.enum(["inactive", "active", "suspended"]).default("inactive"),
  allowInvoiceView: z.boolean().optional(),
  allowStatementView: z.boolean().optional(),
  allowPaymentSubmission: z.boolean().optional(),
});

export async function createClientPortalProfile(
  input: z.infer<typeof CreateClientPortalProfileSchema>
): Promise<ActionResult<{ clientPortalProfileId: string }>> {
  try {
    const v = CreateClientPortalProfileSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "consolidation");
    requirePermission(ctx, "consolidation.group.manage");

    const admin = createSupabaseAdminClient();
    const { data: cust, error: custErr } = await admin
      .from("customers")
      .select("id")
      .eq("id", v.customerId)
      .eq("tenant_id", v.tenantId)
      .single();
    if (custErr || !cust) return { success: false, message: "Customer not found for this tenant." };

    const { data: row, error } = await admin
      .from("client_portal_profiles")
      .insert({
        tenant_id: v.tenantId,
        customer_id: v.customerId,
        portal_status: v.portalStatus,
        allow_invoice_view: v.allowInvoiceView ?? true,
        allow_statement_view: v.allowStatementView ?? true,
        allow_payment_submission: v.allowPaymentSubmission ?? false,
        config_json: {},
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "consolidation",
      actionCode: "commercial.client_portal_profile.create",
      targetTable: "client_portal_profiles",
      targetRecordId: row.id,
      newValues: { customerId: v.customerId, portalStatus: v.portalStatus },
    });

    return { success: true, message: "Client portal profile created.", data: { clientPortalProfileId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateTenantProvisioningTemplateSchema = z.object({
  tenantId: z.string().uuid(),
  templateCode: z.string().min(1).max(64),
  templateName: z.string().min(1).max(255),
  templateStatus: z.enum(["active", "inactive"]).default("active"),
  templateJsonText: z.string().max(50_000).optional(),
});

/** Permission: consolidation.group.manage — global template row (not tenant-scoped in schema). */
export async function createTenantProvisioningTemplate(
  input: z.infer<typeof CreateTenantProvisioningTemplateSchema>
): Promise<ActionResult<{ provisioningTemplateId: string }>> {
  try {
    const v = CreateTenantProvisioningTemplateSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "consolidation");
    requirePermission(ctx, "consolidation.group.manage");

    let templateJson: Record<string, unknown> = {};
    if (v.templateJsonText?.trim()) {
      try {
        templateJson = JSON.parse(v.templateJsonText) as Record<string, unknown>;
      } catch {
        return { success: false, message: "Template JSON is not valid JSON." };
      }
    }

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("tenant_provisioning_templates")
      .insert({
        template_code: v.templateCode,
        template_name: v.templateName,
        template_status: v.templateStatus,
        template_json: templateJson,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "consolidation",
      actionCode: "commercial.provisioning_template.create",
      targetTable: "tenant_provisioning_templates",
      targetRecordId: row.id,
      newValues: { templateCode: v.templateCode },
    });

    return { success: true, message: "Provisioning template created.", data: { provisioningTemplateId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
