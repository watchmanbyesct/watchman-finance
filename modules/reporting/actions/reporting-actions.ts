/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope, requireModuleEntitlement } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";
import { z } from "zod";

function requireOptionalEntityScope(ctx: Awaited<ReturnType<typeof resolveRequestContext>>, entityId: string | null | undefined) {
  if (entityId) requireEntityScope(ctx, entityId);
}

const ReportCategory = z.enum([
  "financial_statement", "ar", "ap", "payroll", "leave", "banking",
  "billing", "inventory", "executive", "other",
]);

const CreateReportDefinitionSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().nullable().optional(),
  reportCode: z.string().min(1).max(64),
  reportName: z.string().min(1).max(255),
  reportCategory: ReportCategory,
  outputType: z.enum(["table", "snapshot", "chart", "kpi"]).default("table"),
  configJson: z.record(z.unknown()).optional(),
});

/** Permission: reporting.definition.manage */
export async function createReportDefinition(
  input: z.infer<typeof CreateReportDefinitionSchema>
): Promise<ActionResult<{ reportDefinitionId: string }>> {
  try {
    const v = CreateReportDefinitionSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "reporting");
    requirePermission(ctx, "reporting.definition.manage");
    requireOptionalEntityScope(ctx, v.entityId ?? null);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("report_definitions")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId ?? null,
        report_code: v.reportCode,
        report_name: v.reportName,
        report_category: v.reportCategory,
        output_type: v.outputType,
        status: "active",
        config_json: v.configJson ?? {},
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "reporting",
      actionCode: "reporting.report.create",
      targetTable: "report_definitions",
      targetRecordId: row.id,
      newValues: { reportCode: v.reportCode },
    });

    return { success: true, message: "Report definition created.", data: { reportDefinitionId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const DashboardCategory = z.enum([
  "executive", "billing", "payroll", "ar", "ap", "banking", "inventory", "operations_finance",
]);

const CreateDashboardDefinitionSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().nullable().optional(),
  dashboardCode: z.string().min(1).max(64),
  dashboardName: z.string().min(1).max(255),
  dashboardCategory: DashboardCategory,
  configJson: z.record(z.unknown()).optional(),
});

/** Permission: reporting.definition.manage */
export async function createDashboardDefinition(
  input: z.infer<typeof CreateDashboardDefinitionSchema>
): Promise<ActionResult<{ dashboardDefinitionId: string }>> {
  try {
    const v = CreateDashboardDefinitionSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "reporting");
    requirePermission(ctx, "reporting.definition.manage");
    requireOptionalEntityScope(ctx, v.entityId ?? null);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("dashboard_definitions")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId ?? null,
        dashboard_code: v.dashboardCode,
        dashboard_name: v.dashboardName,
        dashboard_category: v.dashboardCategory,
        status: "active",
        config_json: v.configJson ?? {},
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "reporting",
      actionCode: "reporting.dashboard.create",
      targetTable: "dashboard_definitions",
      targetRecordId: row.id,
      newValues: { dashboardCode: v.dashboardCode },
    });

    return { success: true, message: "Dashboard definition created.", data: { dashboardDefinitionId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const KpiCategory = z.enum([
  "cash", "ar", "ap", "payroll", "leave", "billing", "inventory", "profitability", "executive",
]);

const CreateKpiDefinitionSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().nullable().optional(),
  kpiCode: z.string().min(1).max(64),
  kpiName: z.string().min(1).max(255),
  kpiCategory: KpiCategory,
  measureType: z.enum(["currency", "hours", "count", "percentage", "other"]).default("currency"),
  configJson: z.record(z.unknown()).optional(),
});

/** Permission: reporting.definition.manage */
export async function createKpiDefinition(
  input: z.infer<typeof CreateKpiDefinitionSchema>
): Promise<ActionResult<{ kpiDefinitionId: string }>> {
  try {
    const v = CreateKpiDefinitionSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "reporting");
    requirePermission(ctx, "reporting.definition.manage");
    requireOptionalEntityScope(ctx, v.entityId ?? null);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("kpi_definitions")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId ?? null,
        kpi_code: v.kpiCode,
        kpi_name: v.kpiName,
        kpi_category: v.kpiCategory,
        measure_type: v.measureType,
        status: "active",
        config_json: v.configJson ?? {},
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "reporting",
      actionCode: "reporting.kpi.create",
      targetTable: "kpi_definitions",
      targetRecordId: row.id,
      newValues: { kpiCode: v.kpiCode },
    });

    return { success: true, message: "KPI definition created.", data: { kpiDefinitionId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateCloseChecklistSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  checklistName: z.string().min(1).max(255),
  closePeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  closePeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Permission: reporting.definition.manage */
export async function createCloseChecklist(
  input: z.infer<typeof CreateCloseChecklistSchema>
): Promise<ActionResult<{ closeChecklistId: string }>> {
  try {
    const v = CreateCloseChecklistSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "reporting");
    requirePermission(ctx, "reporting.definition.manage");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("close_checklists")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        checklist_name: v.checklistName,
        close_period_start: v.closePeriodStart ?? null,
        close_period_end: v.closePeriodEnd ?? null,
        checklist_status: "draft",
        created_by: ctx.platformUserId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "reporting",
      actionCode: "reporting.close_checklist.create",
      targetTable: "close_checklists",
      targetRecordId: row.id,
      newValues: { checklistName: v.checklistName },
    });

    return { success: true, message: "Close checklist created.", data: { closeChecklistId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const ExecuteReportSnapshotSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  reportDefinitionId: z.string().uuid(),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

async function buildSnapshotPayload(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  reportCode: string,
  tenantId: string,
  entityId: string,
  asOfDate: string
): Promise<Record<string, unknown>> {
  if (reportCode === "ar_aging") {
    const { data: invs, error } = await admin
      .from("invoices")
      .select("id, invoice_number, customer_id, balance_due, due_date, invoice_status")
      .eq("tenant_id", tenantId)
      .eq("entity_id", entityId)
      .gt("balance_due", 0)
      .in("invoice_status", ["issued", "partially_paid"]);
    if (error) throw new Error(error.message);

    const buckets = {
      current: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_91_plus: 0,
    };
    const asOf = new Date(`${asOfDate}T12:00:00Z`);
    for (const inv of invs ?? []) {
      const dueRaw = inv.due_date as string | null | undefined;
      const due = dueRaw ? new Date(`${dueRaw}T12:00:00Z`) : asOf;
      const daysPast = Math.floor((asOf.getTime() - due.getTime()) / 86_400_000);
      const bal = Number(inv.balance_due);
      if (daysPast <= 0) buckets.current += bal;
      else if (daysPast <= 30) buckets.days_1_30 += bal;
      else if (daysPast <= 60) buckets.days_31_60 += bal;
      else if (daysPast <= 90) buckets.days_61_90 += bal;
      else buckets.days_91_plus += bal;
    }
    return {
      report_code: reportCode,
      as_of_date: asOfDate,
      entity_id: entityId,
      buckets,
      invoice_count: invs?.length ?? 0,
      line_items: invs ?? [],
    };
  }
  throw new Error(`No automation builder registered for report code "${reportCode}".`);
}

/**
 * Materializes a report snapshot (Pack 017) and writes execution audit.
 * Permission: reporting.automation.execute
 */
export async function executeReportSnapshotAutomation(
  input: z.infer<typeof ExecuteReportSnapshotSchema>
): Promise<ActionResult<{ snapshotId: string }>> {
  try {
    const v = ExecuteReportSnapshotSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "reporting");
    requirePermission(ctx, "reporting.automation.execute");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    const { data: def, error: de } = await admin
      .from("report_definitions")
      .select("id, tenant_id, entity_id, report_code, status")
      .eq("id", v.reportDefinitionId)
      .eq("tenant_id", v.tenantId)
      .single();

    if (de || !def) return { success: false, message: "Report definition not found." };
    if (def.entity_id != null && def.entity_id !== v.entityId) {
      return { success: false, message: "Report definition is scoped to a different entity." };
    }

    const started = new Date().toISOString();
    const { data: logRow, error: le } = await admin
      .from("report_execution_log")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        report_definition_id: def.id,
        as_of_date: v.asOfDate,
        execution_status: "started",
        triggered_by: ctx.platformUserId,
        started_at: started,
      })
      .select("id")
      .single();
    if (le) throw new Error(le.message);

    try {
      const snapshotJson = await buildSnapshotPayload(
        admin,
        def.report_code as string,
        v.tenantId,
        v.entityId,
        v.asOfDate
      );

      const { data: snap, error: se } = await admin
        .from("report_snapshots")
        .upsert(
          {
            tenant_id: v.tenantId,
            entity_id: v.entityId,
            report_definition_id: def.id,
            snapshot_date: v.asOfDate,
            snapshot_status: "generated",
            snapshot_json: snapshotJson,
            generated_by: ctx.platformUserId,
            generated_at: new Date().toISOString(),
          },
          { onConflict: "report_definition_id,snapshot_date" }
        )
        .select("id")
        .single();

      if (se) throw new Error(se.message);

      await admin
        .from("report_execution_log")
        .update({
          execution_status: "completed",
          report_snapshot_id: snap.id,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logRow.id);

      await writeAuditLog({
        tenantId: v.tenantId,
        entityId: v.entityId,
        actorPlatformUserId: ctx.platformUserId,
        moduleKey: "reporting",
        actionCode: "reporting.automation.snapshot",
        targetTable: "report_snapshots",
        targetRecordId: snap.id,
        newValues: { reportCode: def.report_code, asOfDate: v.asOfDate },
      });

      revalidatePath("/finance/reporting/reports");
      return { success: true, message: "Report snapshot generated.", data: { snapshotId: snap.id } };
    } catch (inner) {
      const msg = inner instanceof Error ? inner.message : "Snapshot failed.";
      await admin
        .from("report_execution_log")
        .update({
          execution_status: "failed",
          error_message: msg,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logRow.id);
      throw inner;
    }
  } catch (err) {
    return mapErrorToResult(err);
  }
}
