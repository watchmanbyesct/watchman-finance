"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";

const EvidenceDomain = z.enum(["ar", "ap", "gl", "payroll", "banking", "tax", "integration", "other"]);

const CreateEvidenceDocumentSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().nullable().optional(),
  domain: EvidenceDomain.default("other"),
  parentTable: z.string().min(1).max(120),
  parentRecordId: z.string().uuid(),
  title: z.string().max(500).optional(),
  storageBucket: z.string().min(1).max(120).default("finance-evidence"),
  storageObjectPath: z.string().min(1).max(1024),
  contentType: z.string().max(200).optional(),
  byteSize: z.number().int().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
});

/** Permission: finance.evidence.document.manage */
export async function createFinanceEvidenceDocument(
  input: z.infer<typeof CreateEvidenceDocumentSchema>
): Promise<ActionResult<{ evidenceId: string }>> {
  try {
    const v = CreateEvidenceDocumentSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "finance.evidence.document.manage");
    if (v.entityId) requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("finance_evidence_documents")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId ?? null,
        domain: v.domain,
        parent_table: v.parentTable.trim(),
        parent_record_id: v.parentRecordId,
        title: v.title?.trim() ?? null,
        storage_bucket: v.storageBucket.trim(),
        storage_object_path: v.storageObjectPath.trim(),
        content_type: v.contentType?.trim() ?? null,
        byte_size: v.byteSize ?? null,
        notes: v.notes?.trim() ?? null,
        uploaded_by: ctx.platformUserId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "finance.evidence.create",
      targetTable: "finance_evidence_documents",
      targetRecordId: row.id,
      newValues: { parentTable: v.parentTable, parentRecordId: v.parentRecordId },
    });

    revalidatePath("/finance/evidence");
    return { success: true, message: "Evidence document registered.", data: { evidenceId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const SubjectDomain = z.enum([
  "ar", "ap", "gl", "payroll", "banking", "tax", "catalog", "billing", "inventory", "other",
]);

const CreateApprovalRequestSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  subjectDomain: SubjectDomain,
  subjectTable: z.string().min(1).max(120),
  subjectRecordId: z.string().uuid(),
  requestCode: z.string().min(1).max(80),
  requestTitle: z.string().min(1).max(255),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  payloadJson: z.record(z.unknown()).optional(),
});

/** Permission: finance.approval.request.manage */
export async function createFinanceApprovalRequest(
  input: z.infer<typeof CreateApprovalRequestSchema>
): Promise<ActionResult<{ approvalRequestId: string }>> {
  try {
    const v = CreateApprovalRequestSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "finance.approval.request.manage");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("finance_approval_requests")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        subject_domain: v.subjectDomain,
        subject_table: v.subjectTable.trim(),
        subject_record_id: v.subjectRecordId,
        request_code: v.requestCode.trim(),
        request_title: v.requestTitle.trim(),
        request_status: "draft",
        priority: v.priority,
        payload_json: v.payloadJson ?? {},
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "finance.approval.create",
      targetTable: "finance_approval_requests",
      targetRecordId: row.id,
      newValues: { requestCode: v.requestCode },
    });

    revalidatePath("/finance/approvals");
    return { success: true, message: "Approval request created as draft.", data: { approvalRequestId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const SubmitApprovalRequestSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  approvalRequestId: z.string().uuid(),
});

/** Permission: finance.approval.request.manage */
export async function submitFinanceApprovalRequest(
  input: z.infer<typeof SubmitApprovalRequestSchema>
): Promise<ActionResult<void>> {
  try {
    const v = SubmitApprovalRequestSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "finance.approval.request.manage");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error: fe } = await admin
      .from("finance_approval_requests")
      .select("id, request_status")
      .eq("id", v.approvalRequestId)
      .eq("tenant_id", v.tenantId)
      .eq("entity_id", v.entityId)
      .single();
    if (fe || !row) return { success: false, message: "Approval request not found." };
    if (row.request_status !== "draft") {
      return { success: false, message: "Only draft requests can be submitted." };
    }

    const now = new Date().toISOString();
    const { error } = await admin
      .from("finance_approval_requests")
      .update({
        request_status: "submitted",
        submitted_at: now,
        submitted_by: ctx.platformUserId,
        updated_at: now,
      })
      .eq("id", v.approvalRequestId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "finance.approval.submit",
      targetTable: "finance_approval_requests",
      targetRecordId: v.approvalRequestId,
      newValues: { requestStatus: "submitted" },
    });

    revalidatePath("/finance/approvals");
    return { success: true, message: "Approval request submitted." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const ResolveApprovalRequestSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  approvalRequestId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  resolutionNotes: z.string().max(2000).optional(),
});

/** Permission: finance.approval.request.manage */
export async function resolveFinanceApprovalRequest(
  input: z.infer<typeof ResolveApprovalRequestSchema>
): Promise<ActionResult<void>> {
  try {
    const v = ResolveApprovalRequestSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "finance.approval.request.manage");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error: fe } = await admin
      .from("finance_approval_requests")
      .select("id, request_status")
      .eq("id", v.approvalRequestId)
      .eq("tenant_id", v.tenantId)
      .eq("entity_id", v.entityId)
      .single();
    if (fe || !row) return { success: false, message: "Approval request not found." };
    if (row.request_status !== "submitted") {
      return { success: false, message: "Only submitted requests can be resolved." };
    }

    const now = new Date().toISOString();
    const { error } = await admin
      .from("finance_approval_requests")
      .update({
        request_status: v.decision,
        resolved_at: now,
        resolved_by: ctx.platformUserId,
        resolution_notes: v.resolutionNotes?.trim() ?? null,
        updated_at: now,
      })
      .eq("id", v.approvalRequestId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "finance.approval.resolve",
      targetTable: "finance_approval_requests",
      targetRecordId: v.approvalRequestId,
      newValues: { decision: v.decision },
    });

    revalidatePath("/finance/approvals");
    return { success: true, message: `Request ${v.decision}.` };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const SnapshotKind = z.enum(["trial_balance", "adjusted_tb", "post_close_tb"]);

const UpsertTrialBalanceSnapshotSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  fiscalPeriodId: z.string().uuid(),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  snapshotKind: SnapshotKind.default("trial_balance"),
  snapshotStatus: z.enum(["draft", "final", "superseded"]).default("draft"),
  snapshotJsonText: z.string().min(2).max(500000),
  totalDebit: z.number().nonnegative(),
  totalCredit: z.number().nonnegative(),
  notes: z.string().max(2000).optional(),
});

/** Permission: finance.trial_balance.snapshot.manage */
export async function upsertGlTrialBalanceSnapshot(
  input: z.infer<typeof UpsertTrialBalanceSnapshotSchema>
): Promise<ActionResult<{ snapshotId: string }>> {
  try {
    const v = UpsertTrialBalanceSnapshotSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "finance.trial_balance.snapshot.manage");
    requireEntityScope(ctx, v.entityId);

    let snapshotJson: Record<string, unknown>;
    try {
      snapshotJson = JSON.parse(v.snapshotJsonText) as Record<string, unknown>;
    } catch {
      return { success: false, message: "snapshotJsonText must be valid JSON." };
    }

    const admin = createSupabaseAdminClient();
    const { data: fp, error: fpe } = await admin
      .from("fiscal_periods")
      .select("id")
      .eq("id", v.fiscalPeriodId)
      .eq("tenant_id", v.tenantId)
      .eq("entity_id", v.entityId)
      .single();
    if (fpe || !fp) return { success: false, message: "Fiscal period not found for this entity." };

    const td = Number(v.totalDebit.toFixed(2));
    const tc = Number(v.totalCredit.toFixed(2));
    if (td !== tc) {
      return { success: false, message: "Total debit and total credit must match for a balanced trial balance snapshot." };
    }

    const { data: row, error } = await admin
      .from("gl_trial_balance_snapshots")
      .upsert(
        {
          tenant_id: v.tenantId,
          entity_id: v.entityId,
          fiscal_period_id: v.fiscalPeriodId,
          as_of_date: v.asOfDate,
          snapshot_kind: v.snapshotKind,
          snapshot_status: v.snapshotStatus,
          snapshot_json: snapshotJson,
          total_debit: td,
          total_credit: tc,
          generated_by: ctx.platformUserId,
          generated_at: new Date().toISOString(),
          notes: v.notes?.trim() ?? null,
        },
        { onConflict: "entity_id,fiscal_period_id,as_of_date,snapshot_kind" }
      )
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "finance.trial_balance.snapshot.upsert",
      targetTable: "gl_trial_balance_snapshots",
      targetRecordId: row.id,
      newValues: { asOfDate: v.asOfDate, snapshotKind: v.snapshotKind },
    });

    revalidatePath("/finance/reporting/trial-balance-snapshots");
    return { success: true, message: "Trial balance snapshot saved.", data: { snapshotId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const RecordIdempotencyKeySchema = z.object({
  tenantId: z.string().uuid(),
  idempotencyKey: z.string().min(1).max(200),
  routeKey: z.string().min(1).max(200),
  requestHash: z.string().max(128).optional(),
  responseHttpStatus: z.number().int().min(100).max(599).optional(),
  responseBodyJsonText: z.string().max(50000).optional(),
  expiresAt: z.string().optional(),
});

/** Permission: finance.webhook.delivery.manage */
export async function recordFinanceApiIdempotencyKey(
  input: z.infer<typeof RecordIdempotencyKeySchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const v = RecordIdempotencyKeySchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "finance.webhook.delivery.manage");

    let responseBodyJson: Record<string, unknown> | null = null;
    if (v.responseBodyJsonText?.trim()) {
      try {
        responseBodyJson = JSON.parse(v.responseBodyJsonText) as Record<string, unknown>;
      } catch {
        return { success: false, message: "responseBodyJsonText must be valid JSON when provided." };
      }
    }

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("finance_api_idempotency_keys")
      .upsert(
        {
          tenant_id: v.tenantId,
          idempotency_key: v.idempotencyKey.trim(),
          route_key: v.routeKey.trim(),
          request_hash: v.requestHash?.trim() ?? null,
          response_http_status: v.responseHttpStatus ?? null,
          response_body_json: responseBodyJson,
          expires_at: v.expiresAt ?? null,
        },
        { onConflict: "tenant_id,idempotency_key,route_key" }
      )
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    revalidatePath("/finance/integration/delivery-log");
    return { success: true, message: "Idempotency key recorded.", data: { id: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const RecordWebhookDeliverySchema = z.object({
  tenantId: z.string().uuid(),
  webhookKey: z.string().min(1).max(120),
  eventType: z.string().min(1).max(200),
  destinationUrlHost: z.string().min(1).max(255),
  payloadDigest: z.string().max(128).optional(),
  deliveryStatus: z.enum(["pending", "sending", "delivered", "failed", "abandoned"]).default("pending"),
  attemptCount: z.number().int().min(0).optional(),
  lastHttpStatus: z.number().int().optional(),
  lastError: z.string().max(4000).optional(),
  nextRetryAt: z.string().optional(),
});

/** Permission: finance.webhook.delivery.manage */
export async function recordFinanceWebhookDelivery(
  input: z.infer<typeof RecordWebhookDeliverySchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const v = RecordWebhookDeliverySchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "finance.webhook.delivery.manage");

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("finance_webhook_delivery_log")
      .insert({
        tenant_id: v.tenantId,
        webhook_key: v.webhookKey.trim(),
        event_type: v.eventType.trim(),
        destination_url_host: v.destinationUrlHost.trim(),
        payload_digest: v.payloadDigest?.trim() ?? null,
        delivery_status: v.deliveryStatus,
        attempt_count: v.attemptCount ?? 0,
        last_http_status: v.lastHttpStatus ?? null,
        last_error: v.lastError?.trim() ?? null,
        next_retry_at: v.nextRetryAt ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    revalidatePath("/finance/integration/delivery-log");
    return { success: true, message: "Webhook delivery row recorded.", data: { id: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
