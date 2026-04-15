/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";

const MarkIntegrationEventSchema = z.object({
  tenantId: z.string().uuid(),
  eventId: z.string().uuid(),
  processingStatus: z.enum(["received", "validated", "promoted", "failed", "ignored"]),
  errorMessage: z.string().max(2000).optional(),
});

/** Permission: integration.pipeline.operate */
export async function markIntegrationEventProcessingStatus(
  input: z.infer<typeof MarkIntegrationEventSchema>
): Promise<ActionResult<void>> {
  try {
    const v = MarkIntegrationEventSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "integration.pipeline.operate");

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("integration_event_log")
      .update({
        processing_status: v.processingStatus,
        error_message: v.errorMessage?.trim() ?? null,
      })
      .eq("id", v.eventId)
      .eq("tenant_id", v.tenantId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "integration.event.status",
      targetTable: "integration_event_log",
      targetRecordId: v.eventId,
      newValues: { processingStatus: v.processingStatus },
    });

    revalidatePath("/finance/integration/pipeline");
    return { success: true, message: "Event status updated." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const UpsertIntegrationSyncJobSchema = z.object({
  tenantId: z.string().uuid(),
  jobKey: z.string().min(1).max(120),
  sourceSystemKey: z.string().min(1).max(80),
  targetDomain: z.string().min(1).max(80),
  scheduleMode: z.enum(["manual", "scheduled", "event_driven"]).default("manual"),
  status: z.enum(["active", "paused", "inactive"]).default("active"),
  configJson: z.record(z.unknown()).optional(),
});

/** Permission: integration.pipeline.operate */
export async function upsertIntegrationSyncJob(
  input: z.infer<typeof UpsertIntegrationSyncJobSchema>
): Promise<ActionResult<{ syncJobId: string }>> {
  try {
    const v = UpsertIntegrationSyncJobSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "integration.pipeline.operate");

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("integration_sync_jobs")
      .upsert(
        {
          tenant_id: v.tenantId,
          job_key: v.jobKey.trim(),
          source_system_key: v.sourceSystemKey.trim(),
          target_domain: v.targetDomain.trim(),
          schedule_mode: v.scheduleMode,
          status: v.status,
          config_json: v.configJson ?? {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,job_key" }
      )
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "integration.sync_job.upsert",
      targetTable: "integration_sync_jobs",
      targetRecordId: row.id,
      newValues: { jobKey: v.jobKey },
    });

    revalidatePath("/finance/integration/pipeline");
    return { success: true, message: "Sync job saved.", data: { syncJobId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateIntegrationSyncRunSchema = z.object({
  tenantId: z.string().uuid(),
  syncJobId: z.string().uuid(),
  metadataJson: z.record(z.unknown()).optional(),
});

/** Permission: integration.pipeline.operate */
export async function createIntegrationSyncRun(
  input: z.infer<typeof CreateIntegrationSyncRunSchema>
): Promise<ActionResult<{ syncRunId: string }>> {
  try {
    const v = CreateIntegrationSyncRunSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "integration.pipeline.operate");

    const admin = createSupabaseAdminClient();
    const { data: job, error: je } = await admin
      .from("integration_sync_jobs")
      .select("id")
      .eq("id", v.syncJobId)
      .eq("tenant_id", v.tenantId)
      .single();
    if (je || !job) return { success: false, message: "Sync job not found for tenant." };

    const { data: row, error } = await admin
      .from("integration_sync_runs")
      .insert({
        tenant_id: v.tenantId,
        integration_sync_job_id: v.syncJobId,
        run_status: "started",
        metadata_json: v.metadataJson ?? {},
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "integration.sync_run.start",
      targetTable: "integration_sync_runs",
      targetRecordId: row.id,
      newValues: { syncJobId: v.syncJobId },
    });

    revalidatePath("/finance/integration/pipeline");
    return { success: true, message: "Sync run started.", data: { syncRunId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CompleteIntegrationSyncRunSchema = z.object({
  tenantId: z.string().uuid(),
  syncRunId: z.string().uuid(),
  runStatus: z.enum(["completed", "failed", "partial"]),
  recordsReceived: z.number().int().min(0).optional(),
  recordsPromoted: z.number().int().min(0).optional(),
  recordsFailed: z.number().int().min(0).optional(),
  errorSummary: z.string().max(4000).optional(),
});

/** Permission: integration.pipeline.operate */
export async function completeIntegrationSyncRun(
  input: z.infer<typeof CompleteIntegrationSyncRunSchema>
): Promise<ActionResult<void>> {
  try {
    const v = CompleteIntegrationSyncRunSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "integration.pipeline.operate");

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("integration_sync_runs")
      .update({
        run_status: v.runStatus,
        completed_at: new Date().toISOString(),
        records_received: v.recordsReceived ?? 0,
        records_promoted: v.recordsPromoted ?? 0,
        records_failed: v.recordsFailed ?? 0,
        error_summary: v.errorSummary?.trim() ?? null,
      })
      .eq("id", v.syncRunId)
      .eq("tenant_id", v.tenantId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "integration.sync_run.complete",
      targetTable: "integration_sync_runs",
      targetRecordId: v.syncRunId,
      newValues: { runStatus: v.runStatus },
    });

    revalidatePath("/finance/integration/pipeline");
    return { success: true, message: "Sync run closed." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
