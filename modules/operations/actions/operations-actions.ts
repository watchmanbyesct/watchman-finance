/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use server";

import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireModuleEntitlement, requireEntityScope } from "@/lib/permissions/require-permission";
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

const StartTestRunSchema = z.object({
  tenantId: z.string().uuid(),
  testSuiteId: z.string().uuid(),
  runEnvironment: z.enum(["dev", "staging", "uat", "production"]).default("staging"),
});

export async function startTestRun(
  input: z.infer<typeof StartTestRunSchema>
): Promise<ActionResult<{ testRunId: string }>> {
  try {
    const v = StartTestRunSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "operations");
    requirePermission(ctx, "operations.qa.manage");

    const admin = createSupabaseAdminClient();
    const { data: suite, error: se } = await admin
      .from("test_suites")
      .select("id, tenant_id")
      .eq("id", v.testSuiteId)
      .single();
    if (se || !suite) return { success: false, message: "Test suite not found." };
    if (suite.tenant_id != null && suite.tenant_id !== v.tenantId) {
      return { success: false, message: "Test suite is not available for this tenant." };
    }

    const { data: row, error } = await admin
      .from("test_runs")
      .insert({
        tenant_id: v.tenantId,
        test_suite_id: v.testSuiteId,
        run_status: "started",
        run_environment: v.runEnvironment,
        started_by: ctx.platformUserId,
        summary_json: {},
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "operations",
      actionCode: "operations.test_run.start",
      targetTable: "test_runs",
      targetRecordId: row.id,
      newValues: { testSuiteId: v.testSuiteId, runEnvironment: v.runEnvironment },
    });

    return { success: true, message: "Test run started.", data: { testRunId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateTestResultSchema = z.object({
  tenantId: z.string().uuid(),
  testRunId: z.string().uuid(),
  testCaseCode: z.string().min(1).max(128),
  resultStatus: z.enum(["passed", "failed", "skipped"]),
  severity: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  resultNotes: z.string().max(2000).optional(),
});

export async function createTestResult(
  input: z.infer<typeof CreateTestResultSchema>
): Promise<ActionResult<{ testResultId: string }>> {
  try {
    const v = CreateTestResultSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "operations");
    requirePermission(ctx, "operations.qa.manage");

    const admin = createSupabaseAdminClient();
    const { data: tr, error: te } = await admin
      .from("test_runs")
      .select("id, tenant_id")
      .eq("id", v.testRunId)
      .single();
    if (te || !tr || tr.tenant_id !== v.tenantId) {
      return { success: false, message: "Test run not found for this tenant." };
    }

    const { data: row, error } = await admin
      .from("test_results")
      .insert({
        tenant_id: v.tenantId,
        test_run_id: v.testRunId,
        test_case_code: v.testCaseCode,
        result_status: v.resultStatus,
        severity: v.severity,
        result_notes: v.resultNotes ?? null,
        metadata_json: {},
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "operations",
      actionCode: "operations.test_result.create",
      targetTable: "test_results",
      targetRecordId: row.id,
      newValues: { testRunId: v.testRunId, testCaseCode: v.testCaseCode, resultStatus: v.resultStatus },
    });

    return { success: true, message: "Test result recorded.", data: { testResultId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateReleaseChecklistSchema = z.object({
  tenantId: z.string().uuid(),
  releaseVersionId: z.string().uuid(),
  checklistName: z.string().min(1).max(255),
});

export async function createReleaseChecklist(
  input: z.infer<typeof CreateReleaseChecklistSchema>
): Promise<ActionResult<{ releaseChecklistId: string }>> {
  try {
    const v = CreateReleaseChecklistSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "operations");
    requirePermission(ctx, "operations.qa.manage");

    const admin = createSupabaseAdminClient();
    const { data: rv, error: re } = await admin
      .from("release_versions")
      .select("id, tenant_id")
      .eq("id", v.releaseVersionId)
      .single();
    if (re || !rv || rv.tenant_id !== v.tenantId) {
      return { success: false, message: "Release version not found for this tenant." };
    }

    const { data: row, error } = await admin
      .from("release_checklists")
      .insert({
        tenant_id: v.tenantId,
        release_version_id: v.releaseVersionId,
        checklist_name: v.checklistName,
        checklist_status: "open",
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
      actionCode: "operations.release_checklist.create",
      targetTable: "release_checklists",
      targetRecordId: row.id,
      newValues: { releaseVersionId: v.releaseVersionId, checklistName: v.checklistName },
    });

    return { success: true, message: "Release checklist created.", data: { releaseChecklistId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateReleaseTaskSchema = z.object({
  tenantId: z.string().uuid(),
  releaseChecklistId: z.string().uuid(),
  taskCode: z.string().min(1).max(64),
  taskName: z.string().min(1).max(255),
});

export async function createReleaseTask(
  input: z.infer<typeof CreateReleaseTaskSchema>
): Promise<ActionResult<{ releaseTaskId: string }>> {
  try {
    const v = CreateReleaseTaskSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "operations");
    requirePermission(ctx, "operations.qa.manage");

    const admin = createSupabaseAdminClient();
    const { data: rc, error: ce } = await admin
      .from("release_checklists")
      .select("id, tenant_id")
      .eq("id", v.releaseChecklistId)
      .single();
    if (ce || !rc || rc.tenant_id !== v.tenantId) {
      return { success: false, message: "Release checklist not found for this tenant." };
    }

    const { data: row, error } = await admin
      .from("release_tasks")
      .insert({
        tenant_id: v.tenantId,
        release_checklist_id: v.releaseChecklistId,
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
      moduleKey: "operations",
      actionCode: "operations.release_task.create",
      targetTable: "release_tasks",
      targetRecordId: row.id,
      newValues: { taskCode: v.taskCode, releaseChecklistId: v.releaseChecklistId },
    });

    return { success: true, message: "Release task created.", data: { releaseTaskId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateOperationalAlertSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().optional(),
  moduleKey: z.string().min(1).max(64),
  alertCode: z.string().min(1).max(64),
  alertSeverity: z.enum(["low", "medium", "high", "critical"]),
  alertMessage: z.string().min(1).max(2000),
});

export async function createOperationalAlert(
  input: z.infer<typeof CreateOperationalAlertSchema>
): Promise<ActionResult<{ operationalAlertId: string }>> {
  try {
    const v = CreateOperationalAlertSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "operations");
    requirePermission(ctx, "operations.qa.manage");
    if (v.entityId) requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("operational_alerts")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId ?? null,
        module_key: v.moduleKey,
        alert_code: v.alertCode,
        alert_severity: v.alertSeverity,
        alert_status: "open",
        alert_message: v.alertMessage,
        details_json: {},
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "operations",
      actionCode: "operations.operational_alert.create",
      targetTable: "operational_alerts",
      targetRecordId: row.id,
      newValues: { alertCode: v.alertCode, moduleKey: v.moduleKey },
    });

    return { success: true, message: "Operational alert recorded.", data: { operationalAlertId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const RecordJobRunStartSchema = z.object({
  tenantId: z.string().uuid(),
  jobKey: z.string().min(1).max(128),
  jobCategory: z.enum(["scheduler", "integration", "reporting", "payroll", "billing", "recovery", "other"]).default("scheduler"),
});

export async function recordJobRunStart(
  input: z.infer<typeof RecordJobRunStartSchema>
): Promise<ActionResult<{ jobRunHistoryId: string }>> {
  try {
    const v = RecordJobRunStartSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "operations");
    requirePermission(ctx, "operations.qa.manage");

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("job_run_history")
      .insert({
        tenant_id: v.tenantId,
        job_key: v.jobKey,
        job_category: v.jobCategory,
        run_status: "started",
        result_json: {},
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "operations",
      actionCode: "operations.job_run.start",
      targetTable: "job_run_history",
      targetRecordId: row.id,
      newValues: { jobKey: v.jobKey, jobCategory: v.jobCategory },
    });

    return { success: true, message: "Job run recorded as started.", data: { jobRunHistoryId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateAuditReviewLogSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().optional(),
  reviewScope: z.enum(["audit", "rls", "release", "security", "other"]).default("audit"),
  reviewStatus: z.enum(["open", "completed", "closed"]).default("open"),
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(4000).optional(),
});

export async function createAuditReviewLog(
  input: z.infer<typeof CreateAuditReviewLogSchema>
): Promise<ActionResult<{ auditReviewLogId: string }>> {
  try {
    const v = CreateAuditReviewLogSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "operations");
    requirePermission(ctx, "operations.qa.manage");
    if (v.entityId) requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("audit_review_logs")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId ?? null,
        review_scope: v.reviewScope,
        review_status: v.reviewStatus,
        review_date: v.reviewDate ?? null,
        findings_json: {},
        notes: v.notes ?? null,
        reviewed_by: ctx.platformUserId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "operations",
      actionCode: "operations.audit_review_log.create",
      targetTable: "audit_review_logs",
      targetRecordId: row.id,
      newValues: { reviewScope: v.reviewScope },
    });

    return { success: true, message: "Audit review log created.", data: { auditReviewLogId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const StartBackupVerificationRunSchema = z.object({
  tenantId: z.string().uuid(),
  runScope: z.enum(["platform", "tenant", "module"]).default("tenant"),
  moduleKey: z.string().max(64).optional(),
});

export async function startBackupVerificationRun(
  input: z.infer<typeof StartBackupVerificationRunSchema>
): Promise<ActionResult<{ backupVerificationRunId: string }>> {
  try {
    const v = StartBackupVerificationRunSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "operations");
    requirePermission(ctx, "operations.qa.manage");

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("backup_verification_runs")
      .insert({
        tenant_id: v.tenantId,
        run_scope: v.runScope,
        module_key: v.moduleKey ?? null,
        verification_status: "started",
        result_json: {},
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "operations",
      actionCode: "operations.backup_verification.start",
      targetTable: "backup_verification_runs",
      targetRecordId: row.id,
      newValues: { runScope: v.runScope },
    });

    return { success: true, message: "Backup verification run started.", data: { backupVerificationRunId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const StartRestoreTestRunSchema = z.object({
  tenantId: z.string().uuid(),
  runScope: z.enum(["platform", "tenant", "module"]).default("tenant"),
  moduleKey: z.string().max(64).optional(),
});

export async function startRestoreTestRun(
  input: z.infer<typeof StartRestoreTestRunSchema>
): Promise<ActionResult<{ restoreTestRunId: string }>> {
  try {
    const v = StartRestoreTestRunSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "operations");
    requirePermission(ctx, "operations.qa.manage");

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("restore_test_runs")
      .insert({
        tenant_id: v.tenantId,
        run_scope: v.runScope,
        module_key: v.moduleKey ?? null,
        restore_status: "started",
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
      moduleKey: "operations",
      actionCode: "operations.restore_test.start",
      targetTable: "restore_test_runs",
      targetRecordId: row.id,
      newValues: { runScope: v.runScope },
    });

    return { success: true, message: "Restore test run started.", data: { restoreTestRunId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateDisasterRecoveryExerciseSchema = z.object({
  tenantId: z.string().uuid(),
  exerciseName: z.string().min(1).max(255),
  exerciseScope: z.enum(["platform", "tenant", "module"]).default("tenant"),
  exerciseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lessonsLearned: z.string().max(4000).optional(),
});

export async function createDisasterRecoveryExercise(
  input: z.infer<typeof CreateDisasterRecoveryExerciseSchema>
): Promise<ActionResult<{ disasterRecoveryExerciseId: string }>> {
  try {
    const v = CreateDisasterRecoveryExerciseSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "operations");
    requirePermission(ctx, "operations.qa.manage");

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("disaster_recovery_exercises")
      .insert({
        tenant_id: v.tenantId,
        exercise_name: v.exerciseName,
        exercise_scope: v.exerciseScope,
        exercise_status: "planned",
        exercise_date: v.exerciseDate ?? null,
        results_json: {},
        lessons_learned: v.lessonsLearned ?? null,
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
      actionCode: "operations.dr_exercise.create",
      targetTable: "disaster_recovery_exercises",
      targetRecordId: row.id,
      newValues: { exerciseName: v.exerciseName },
    });

    return { success: true, message: "DR exercise recorded.", data: { disasterRecoveryExerciseId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
