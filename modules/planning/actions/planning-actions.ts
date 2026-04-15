/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use server";

import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope, requireModuleEntitlement } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";
import { z } from "zod";

const CreateBudgetVersionSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  budgetCode: z.string().min(1).max(64),
  budgetName: z.string().min(1).max(255),
  fiscalYear: z.number().int().min(2000).max(2100),
  versionNumber: z.number().int().min(1).default(1),
  notes: z.string().optional(),
});

/** Permission: planning.budget.manage */
export async function createBudgetVersion(
  input: z.infer<typeof CreateBudgetVersionSchema>
): Promise<ActionResult<{ budgetVersionId: string }>> {
  try {
    const v = CreateBudgetVersionSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "planning");
    requirePermission(ctx, "planning.budget.manage");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("budget_versions")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        budget_code: v.budgetCode,
        budget_name: v.budgetName,
        fiscal_year: v.fiscalYear,
        budget_status: "draft",
        version_number: v.versionNumber,
        notes: v.notes ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "planning",
      actionCode: "planning.budget_version.create",
      targetTable: "budget_versions",
      targetRecordId: row.id,
      newValues: { budgetCode: v.budgetCode, fiscalYear: v.fiscalYear },
    });

    return { success: true, message: "Budget version created.", data: { budgetVersionId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateBudgetLineSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  budgetVersionId: z.string().uuid(),
  lineMonth: z.number().int().min(1).max(12),
  amount: z.number().default(0),
  accountId: z.string().uuid().nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  costCenterId: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
});

/** Permission: planning.budget.manage */
export async function createBudgetLine(
  input: z.infer<typeof CreateBudgetLineSchema>
): Promise<ActionResult<{ budgetLineId: string }>> {
  try {
    const v = CreateBudgetLineSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "planning");
    requirePermission(ctx, "planning.budget.manage");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();

    const { data: bv, error: be } = await admin
      .from("budget_versions")
      .select("id, entity_id")
      .eq("id", v.budgetVersionId)
      .eq("tenant_id", v.tenantId)
      .single();

    if (be || !bv || bv.entity_id !== v.entityId) {
      return { success: false, message: "Budget version not found for this entity." };
    }

    const { data: row, error } = await admin
      .from("budget_lines")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        budget_version_id: v.budgetVersionId,
        account_id: v.accountId ?? null,
        department_id: v.departmentId ?? null,
        cost_center_id: v.costCenterId ?? null,
        line_month: v.lineMonth,
        amount: v.amount,
        notes: v.notes ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "planning",
      actionCode: "planning.budget_line.create",
      targetTable: "budget_lines",
      targetRecordId: row.id,
      newValues: { budgetVersionId: v.budgetVersionId, lineMonth: v.lineMonth },
    });

    return { success: true, message: "Budget line created.", data: { budgetLineId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateForecastVersionSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  forecastCode: z.string().min(1).max(64),
  forecastName: z.string().min(1).max(255),
  fiscalYear: z.number().int().min(2000).max(2100),
  versionNumber: z.number().int().min(1).default(1),
  basisType: z.enum(["manual", "budget_based", "trend_based", "scenario_based"]).default("manual"),
  notes: z.string().optional(),
});

/** Permission: planning.forecast.manage */
export async function createForecastVersion(
  input: z.infer<typeof CreateForecastVersionSchema>
): Promise<ActionResult<{ forecastVersionId: string }>> {
  try {
    const v = CreateForecastVersionSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "planning");
    requirePermission(ctx, "planning.forecast.manage");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("forecast_versions")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        forecast_code: v.forecastCode,
        forecast_name: v.forecastName,
        fiscal_year: v.fiscalYear,
        forecast_status: "draft",
        version_number: v.versionNumber,
        basis_type: v.basisType,
        notes: v.notes ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "planning",
      actionCode: "planning.forecast_version.create",
      targetTable: "forecast_versions",
      targetRecordId: row.id,
      newValues: { forecastCode: v.forecastCode, fiscalYear: v.fiscalYear },
    });

    return { success: true, message: "Forecast version created.", data: { forecastVersionId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateForecastLineSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  forecastVersionId: z.string().uuid(),
  lineMonth: z.number().int().min(1).max(12),
  amount: z.number().default(0),
  accountId: z.string().uuid().nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  costCenterId: z.string().uuid().nullable().optional(),
  driverType: z.string().max(64).optional(),
  notes: z.string().optional(),
});

/** Permission: planning.forecast.manage */
export async function createForecastLine(
  input: z.infer<typeof CreateForecastLineSchema>
): Promise<ActionResult<{ forecastLineId: string }>> {
  try {
    const v = CreateForecastLineSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "planning");
    requirePermission(ctx, "planning.forecast.manage");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();

    const { data: fv, error: fe } = await admin
      .from("forecast_versions")
      .select("id, entity_id")
      .eq("id", v.forecastVersionId)
      .eq("tenant_id", v.tenantId)
      .single();

    if (fe || !fv || fv.entity_id !== v.entityId) {
      return { success: false, message: "Forecast version not found for this entity." };
    }

    const { data: row, error } = await admin
      .from("forecast_lines")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        forecast_version_id: v.forecastVersionId,
        account_id: v.accountId ?? null,
        department_id: v.departmentId ?? null,
        cost_center_id: v.costCenterId ?? null,
        line_month: v.lineMonth,
        amount: v.amount,
        driver_type: v.driverType ?? null,
        notes: v.notes ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "planning",
      actionCode: "planning.forecast_line.create",
      targetTable: "forecast_lines",
      targetRecordId: row.id,
      newValues: { forecastVersionId: v.forecastVersionId, lineMonth: v.lineMonth },
    });

    return { success: true, message: "Forecast line created.", data: { forecastLineId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateVarianceSnapshotSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  snapshotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  comparisonType: z.enum(["budget_vs_actual", "forecast_vs_actual", "budget_vs_forecast"]),
  budgetVersionId: z.string().uuid().optional(),
  forecastVersionId: z.string().uuid().optional(),
});

/**
 * Records a variance snapshot shell (empty JSON until analytics populate it).
 * Permissions: budget paths require planning.budget.manage; forecast_vs_actual requires planning.forecast.manage;
 * budget_vs_forecast requires both.
 */
export async function createVarianceSnapshot(
  input: z.infer<typeof CreateVarianceSnapshotSchema>
): Promise<ActionResult<{ varianceSnapshotId: string }>> {
  try {
    const v = CreateVarianceSnapshotSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "planning");
    requireEntityScope(ctx, v.entityId);

    if (v.comparisonType === "budget_vs_actual") {
      requirePermission(ctx, "planning.budget.manage");
      if (!v.budgetVersionId) return { success: false, message: "Budget version is required for this comparison." };
    } else if (v.comparisonType === "forecast_vs_actual") {
      requirePermission(ctx, "planning.forecast.manage");
      if (!v.forecastVersionId) {
        return { success: false, message: "Forecast version is required for this comparison." };
      }
    } else {
      requirePermission(ctx, "planning.budget.manage");
      requirePermission(ctx, "planning.forecast.manage");
      if (!v.budgetVersionId || !v.forecastVersionId) {
        return { success: false, message: "Both budget and forecast versions are required for budget vs forecast." };
      }
    }

    const admin = createSupabaseAdminClient();

    if (v.budgetVersionId) {
      const { data: bv, error: be } = await admin
        .from("budget_versions")
        .select("id, entity_id")
        .eq("id", v.budgetVersionId)
        .eq("tenant_id", v.tenantId)
        .single();
      if (be || !bv || bv.entity_id !== v.entityId) {
        return { success: false, message: "Budget version not found for this entity." };
      }
    }

    if (v.forecastVersionId) {
      const { data: fv, error: fe } = await admin
        .from("forecast_versions")
        .select("id, entity_id")
        .eq("id", v.forecastVersionId)
        .eq("tenant_id", v.tenantId)
        .single();
      if (fe || !fv || fv.entity_id !== v.entityId) {
        return { success: false, message: "Forecast version not found for this entity." };
      }
    }

    const budgetIdForRow =
      v.comparisonType === "forecast_vs_actual" ? null : (v.budgetVersionId ?? null);
    const forecastIdForRow =
      v.comparisonType === "budget_vs_actual" ? null : (v.forecastVersionId ?? null);

    const { data: row, error } = await admin
      .from("variance_snapshots")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        snapshot_date: v.snapshotDate,
        comparison_type: v.comparisonType,
        budget_version_id: budgetIdForRow,
        forecast_version_id: forecastIdForRow,
        snapshot_json: {},
        generated_by: ctx.platformUserId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "planning",
      actionCode: "planning.variance_snapshot.create",
      targetTable: "variance_snapshots",
      targetRecordId: row.id,
      newValues: { comparisonType: v.comparisonType, snapshotDate: v.snapshotDate },
    });

    return { success: true, message: "Variance snapshot recorded.", data: { varianceSnapshotId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
