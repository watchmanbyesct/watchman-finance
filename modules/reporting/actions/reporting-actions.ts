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
