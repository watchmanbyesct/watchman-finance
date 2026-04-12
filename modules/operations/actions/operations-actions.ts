"use server";

import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireModuleEntitlement } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";
import { z } from "zod";

const CreateTestSuiteSchema = z.object({
  tenantId: z.string().uuid(),
  suiteCode: z.string().min(1).max(64),
  suiteName: z.string().min(1).max(255),
  suiteCategory: z.enum([
    "unit", "integration", "rls", "workflow", "performance", "release", "recovery", "other",
  ]).default("integration"),
});

/** Permission: operations.qa.manage */
export async function createTestSuite(
  input: z.infer<typeof CreateTestSuiteSchema>
): Promise<ActionResult<{ testSuiteId: string }>> {
  try {
    const v = CreateTestSuiteSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "operations");
    requirePermission(ctx, "operations.qa.manage");

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("test_suites")
      .insert({
        tenant_id: v.tenantId,
        suite_code: v.suiteCode,
        suite_name: v.suiteName,
        suite_category: v.suiteCategory,
        status: "active",
        config_json: {},
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "operations",
      actionCode: "operations.test_suite.create",
      targetTable: "test_suites",
      targetRecordId: row.id,
      newValues: { suiteCode: v.suiteCode },
    });

    return { success: true, message: "Test suite created.", data: { testSuiteId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateReleaseVersionSchema = z.object({
  tenantId: z.string().uuid(),
  releaseCode: z.string().min(1).max(64),
  releaseName: z.string().min(1).max(255),
  releaseScope: z.enum(["platform", "tenant", "module"]).default("tenant"),
  targetModuleKey: z.string().max(64).optional(),
  releaseNotes: z.string().optional(),
});

/** Permission: operations.qa.manage */
export async function createReleaseVersion(
  input: z.infer<typeof CreateReleaseVersionSchema>
): Promise<ActionResult<{ releaseVersionId: string }>> {
  try {
    const v = CreateReleaseVersionSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "operations");
    requirePermission(ctx, "operations.qa.manage");

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("release_versions")
      .insert({
        tenant_id: v.tenantId,
        release_code: v.releaseCode,
        release_name: v.releaseName,
        release_status: "draft",
        release_scope: v.releaseScope,
        target_tenant_id: v.releaseScope === "tenant" ? v.tenantId : null,
        target_module_key: v.targetModuleKey ?? null,
        release_notes: v.releaseNotes ?? null,
        created_by: ctx.platformUserId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "operations",
      actionCode: "operations.release.create",
      targetTable: "release_versions",
      targetRecordId: row.id,
      newValues: { releaseCode: v.releaseCode },
    });

    return { success: true, message: "Release version created.", data: { releaseVersionId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const UpsertSystemHealthCheckSchema = z.object({
  tenantId: z.string().uuid(),
  moduleKey: z.string().min(1).max(64),
  checkCode: z.string().min(1).max(64),
  checkName: z.string().min(1).max(255),
  checkStatus: z.enum(["healthy", "warning", "critical", "unknown"]).default("healthy"),
  statusMessage: z.string().optional(),
  detailsJson: z.record(z.unknown()).optional(),
});

/** Permission: operations.qa.manage */
export async function upsertSystemHealthCheck(
  input: z.infer<typeof UpsertSystemHealthCheckSchema>
): Promise<ActionResult<{ systemHealthCheckId: string }>> {
  try {
    const v = UpsertSystemHealthCheckSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "operations");
    requirePermission(ctx, "operations.qa.manage");

    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();

    const { data: existing } = await admin
      .from("system_health_checks")
      .select("id")
      .eq("tenant_id", v.tenantId)
      .eq("module_key", v.moduleKey)
      .eq("check_code", v.checkCode)
      .maybeSingle();

    if (existing?.id) {
      const { error: ue } = await admin
        .from("system_health_checks")
        .update({
          check_name: v.checkName,
          check_status: v.checkStatus,
          last_checked_at: now,
          status_message: v.statusMessage ?? null,
          details_json: v.detailsJson ?? {},
          updated_at: now,
        })
        .eq("id", existing.id);

      if (ue) throw new Error(ue.message);

      await writeAuditLog({
        tenantId: v.tenantId,
        entityId: null,
        actorPlatformUserId: ctx.platformUserId,
        moduleKey: "operations",
        actionCode: "operations.health_check.update",
        targetTable: "system_health_checks",
        targetRecordId: existing.id,
        newValues: { moduleKey: v.moduleKey, checkCode: v.checkCode, checkStatus: v.checkStatus },
      });

      return { success: true, message: "Health check updated.", data: { systemHealthCheckId: existing.id } };
    }

    const { data: row, error } = await admin
      .from("system_health_checks")
      .insert({
        tenant_id: v.tenantId,
        module_key: v.moduleKey,
        check_code: v.checkCode,
        check_name: v.checkName,
        check_status: v.checkStatus,
        last_checked_at: now,
        status_message: v.statusMessage ?? null,
        details_json: v.detailsJson ?? {},
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "operations",
      actionCode: "operations.health_check.create",
      targetTable: "system_health_checks",
      targetRecordId: row.id,
      newValues: { moduleKey: v.moduleKey, checkCode: v.checkCode },
    });

    return { success: true, message: "Health check recorded.", data: { systemHealthCheckId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
