"use server";

import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope, requireModuleEntitlement } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";
import { z } from "zod";

function requireOptionalEntityScope(ctx: Awaited<ReturnType<typeof resolveRequestContext>>, entityId: string | null | undefined) {
  if (entityId) requireEntityScope(ctx, entityId);
}

const CreateBillingRuleSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().nullable().optional(),
  ruleCode: z.string().min(1).max(64),
  ruleName: z.string().min(1).max(255),
  customerId: z.string().uuid().nullable().optional(),
  customerSiteId: z.string().uuid().nullable().optional(),
  catalogItemId: z.string().uuid().nullable().optional(),
  billingTrigger: z.enum(["manual", "service_event", "shift_completed", "scheduled_post", "recurring"]).default("manual"),
  billingFrequency: z.enum(["one_time", "daily", "weekly", "monthly", "event_driven"]).default("one_time"),
  rateSource: z.enum(["catalog", "customer_override", "contract_override", "manual"]).default("catalog"),
});

/** Permission: billing.rule.manage */
export async function createBillingRule(
  input: z.infer<typeof CreateBillingRuleSchema>
): Promise<ActionResult<{ billingRuleId: string }>> {
  try {
    const v = CreateBillingRuleSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "billing");
    requirePermission(ctx, "billing.rule.manage");
    requireOptionalEntityScope(ctx, v.entityId ?? null);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("billing_rules")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId ?? null,
        rule_code: v.ruleCode,
        rule_name: v.ruleName,
        customer_id: v.customerId ?? null,
        customer_site_id: v.customerSiteId ?? null,
        catalog_item_id: v.catalogItemId ?? null,
        billing_trigger: v.billingTrigger,
        billing_frequency: v.billingFrequency,
        rate_source: v.rateSource,
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "billing",
      actionCode: "billing.rule.create",
      targetTable: "billing_rules",
      targetRecordId: row.id,
      newValues: { ruleCode: v.ruleCode },
    });

    return { success: true, message: "Billing rule created.", data: { billingRuleId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateBillableEventCandidateSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().nullable().optional(),
  sourceTable: z.string().min(1).max(120),
  sourceRecordId: z.string().min(1).max(255),
  sourceContractId: z.string().max(255).optional(),
  customerId: z.string().uuid().nullable().optional(),
  customerSiteId: z.string().uuid().nullable().optional(),
  catalogItemId: z.string().uuid().nullable().optional(),
  quantity: z.number().default(1),
  candidateRate: z.number().optional(),
  candidateAmount: z.number().optional(),
  candidateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
});

/** Permission: billing.candidate.manage */
export async function createBillableEventCandidate(
  input: z.infer<typeof CreateBillableEventCandidateSchema>
): Promise<ActionResult<{ candidateId: string }>> {
  try {
    const v = CreateBillableEventCandidateSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "billing");
    requirePermission(ctx, "billing.candidate.manage");
    requireOptionalEntityScope(ctx, v.entityId ?? null);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("billable_event_candidates")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId ?? null,
        source_table: v.sourceTable,
        source_record_id: v.sourceRecordId,
        source_contract_id: v.sourceContractId ?? null,
        customer_id: v.customerId ?? null,
        customer_site_id: v.customerSiteId ?? null,
        catalog_item_id: v.catalogItemId ?? null,
        quantity: v.quantity,
        candidate_rate: v.candidateRate ?? null,
        candidate_amount: v.candidateAmount ?? null,
        candidate_status: "pending",
        candidate_date: v.candidateDate ?? null,
        notes: v.notes ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "billing",
      actionCode: "billing.candidate.create",
      targetTable: "billable_event_candidates",
      targetRecordId: row.id,
      newValues: { sourceTable: v.sourceTable, sourceRecordId: v.sourceRecordId },
    });

    return { success: true, message: "Billable candidate recorded.", data: { candidateId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
