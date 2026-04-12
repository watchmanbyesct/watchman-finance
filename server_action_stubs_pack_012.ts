// Watchman Finance Server Action Starter Pack 012 v1
// Hardening, QA, and production-readiness action stubs.

export type UUID = string;

export interface ActionContext {
  authUserId: UUID;
  platformUserId: UUID;
  currentTenantId?: UUID;
  permissions: string[];
  entityIds: UUID[];
  correlationId: string;
}

export interface ActionResult<T> {
  success: boolean;
  message: string;
  data?: T;
  warnings?: string[];
  errors?: string[];
  correlationId: string;
}

export interface DbClient {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T>;
}

export interface AuditPayload {
  tenantId?: UUID;
  entityId?: UUID;
  actorPlatformUserId?: UUID;
  moduleKey: string;
  actionCode: string;
  targetTable: string;
  targetRecordId?: UUID;
  oldValues?: unknown;
  newValues?: unknown;
  metadata?: unknown;
  sourceChannel?: string;
}

export async function writeAuditLog(db: DbClient, payload: AuditPayload): Promise<void> {
  await db.query(
    `
    insert into public.audit_logs (
      tenant_id, entity_id, actor_platform_user_id, module_key, action_code,
      target_table, target_record_id, old_values_json, new_values_json,
      metadata_json, source_channel
    ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11)
    `,
    [
      payload.tenantId ?? null,
      payload.entityId ?? null,
      payload.actorPlatformUserId ?? null,
      payload.moduleKey,
      payload.actionCode,
      payload.targetTable,
      payload.targetRecordId ?? null,
      JSON.stringify(payload.oldValues ?? null),
      JSON.stringify(payload.newValues ?? null),
      JSON.stringify(payload.metadata ?? null),
      payload.sourceChannel ?? "api",
    ],
  );
}

export function requirePermission(ctx: ActionContext, permission: string): void {
  if (!ctx.permissions.includes(permission)) {
    throw new Error(`forbidden:${permission}`);
  }
}

export interface StartTestRunInput {
  tenantId?: UUID;
  testSuiteId: UUID;
  runEnvironment?: "dev" | "staging" | "uat" | "production";
}

export async function startTestRun(
  db: DbClient,
  ctx: ActionContext,
  input: StartTestRunInput,
): Promise<ActionResult<{ testRunId: UUID }>> {
  requirePermission(ctx, "release.manage");

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.test_runs (
      tenant_id, test_suite_id, run_status, run_environment, started_by
    )
    values ($1,$2,'started',$3,$4)
    returning id
    `,
    [
      input.tenantId ?? null,
      input.testSuiteId,
      input.runEnvironment ?? "staging",
      ctx.platformUserId,
    ],
  );

  const testRunId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "platform",
    actionCode: "test.run.start",
    targetTable: "test_runs",
    targetRecordId: testRunId,
    newValues: input,
  });

  return {
    success: true,
    message: "Test run started successfully.",
    data: { testRunId },
    correlationId: ctx.correlationId,
  };
}

export interface RecordTestResultInput {
  tenantId?: UUID;
  testRunId: UUID;
  testCaseCode: string;
  resultStatus: "passed" | "failed" | "skipped";
  severity?: "low" | "normal" | "high" | "critical";
  resultNotes?: string;
  metadata?: Record<string, unknown>;
}

export async function recordTestResult(
  db: DbClient,
  ctx: ActionContext,
  input: RecordTestResultInput,
): Promise<ActionResult<{ testResultId: UUID }>> {
  requirePermission(ctx, "release.manage");

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.test_results (
      tenant_id, test_run_id, test_case_code, result_status,
      severity, result_notes, metadata_json
    )
    values ($1,$2,$3,$4,$5,$6,$7::jsonb)
    on conflict (test_run_id, test_case_code)
    do update set
      result_status = excluded.result_status,
      severity = excluded.severity,
      result_notes = excluded.result_notes,
      metadata_json = excluded.metadata_json
    returning id
    `,
    [
      input.tenantId ?? null,
      input.testRunId,
      input.testCaseCode,
      input.resultStatus,
      input.severity ?? "normal",
      input.resultNotes ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );

  const testResultId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "platform",
    actionCode: "test.result.record",
    targetTable: "test_results",
    targetRecordId: testResultId,
    newValues: input,
  });

  return {
    success: true,
    message: "Test result recorded successfully.",
    data: { testResultId },
    correlationId: ctx.correlationId,
  };
}

export interface CreateReleaseVersionInput {
  tenantId?: UUID;
  releaseCode: string;
  releaseName: string;
  releaseScope?: "platform" | "tenant" | "module";
  targetTenantId?: UUID;
  targetModuleKey?: string;
  releaseNotes?: string;
}

export async function createReleaseVersion(
  db: DbClient,
  ctx: ActionContext,
  input: CreateReleaseVersionInput,
): Promise<ActionResult<{ releaseVersionId: UUID }>> {
  requirePermission(ctx, "release.manage");

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.release_versions (
      tenant_id, release_code, release_name, release_status, release_scope,
      target_tenant_id, target_module_key, release_notes, created_by
    )
    values ($1,$2,$3,'draft',$4,$5,$6,$7,$8)
    returning id
    `,
    [
      input.tenantId ?? null,
      input.releaseCode,
      input.releaseName,
      input.releaseScope ?? "platform",
      input.targetTenantId ?? null,
      input.targetModuleKey ?? null,
      input.releaseNotes ?? null,
      ctx.platformUserId,
    ],
  );

  const releaseVersionId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "platform",
    actionCode: "release.version.create",
    targetTable: "release_versions",
    targetRecordId: releaseVersionId,
    newValues: input,
  });

  return {
    success: true,
    message: "Release version created successfully.",
    data: { releaseVersionId },
    correlationId: ctx.correlationId,
  };
}

export interface ApproveReleaseVersionInput {
  tenantId?: UUID;
  releaseVersionId: UUID;
}

export async function approveReleaseVersion(
  db: DbClient,
  ctx: ActionContext,
  input: ApproveReleaseVersionInput,
): Promise<ActionResult<{ releaseVersionId: UUID }>> {
  requirePermission(ctx, "release.approve");

  await db.query(
    `
    update public.release_versions
    set release_status = 'approved',
        approved_by = $1,
        approved_at = timezone('utc', now())
    where id = $2 and release_status in ('draft', 'candidate')
    `,
    [ctx.platformUserId, input.releaseVersionId],
  );

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "platform",
    actionCode: "release.version.approve",
    targetTable: "release_versions",
    targetRecordId: input.releaseVersionId,
    newValues: input,
  });

  return {
    success: true,
    message: "Release version approved successfully.",
    data: { releaseVersionId: input.releaseVersionId },
    correlationId: ctx.correlationId,
  };
}

export interface RaiseOperationalAlertInput {
  tenantId?: UUID;
  entityId?: UUID;
  moduleKey: string;
  alertCode: string;
  alertSeverity: "low" | "medium" | "high" | "critical";
  alertMessage: string;
  details?: Record<string, unknown>;
}

export async function raiseOperationalAlert(
  db: DbClient,
  ctx: ActionContext,
  input: RaiseOperationalAlertInput,
): Promise<ActionResult<{ operationalAlertId: UUID }>> {
  requirePermission(ctx, "platform.monitor");

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.operational_alerts (
      tenant_id, entity_id, module_key, alert_code, alert_severity,
      alert_status, alert_message, details_json
    )
    values ($1,$2,$3,$4,$5,'open',$6,$7::jsonb)
    returning id
    `,
    [
      input.tenantId ?? null,
      input.entityId ?? null,
      input.moduleKey,
      input.alertCode,
      input.alertSeverity,
      input.alertMessage,
      JSON.stringify(input.details ?? {}),
    ],
  );

  const operationalAlertId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "platform",
    actionCode: "alert.raise",
    targetTable: "operational_alerts",
    targetRecordId: operationalAlertId,
    newValues: input,
  });

  return {
    success: true,
    message: "Operational alert raised successfully.",
    data: { operationalAlertId },
    correlationId: ctx.correlationId,
  };
}

export interface StartRestoreTestRunInput {
  tenantId?: UUID;
  runScope?: "platform" | "tenant" | "module";
  moduleKey?: string;
}

export async function startRestoreTestRun(
  db: DbClient,
  ctx: ActionContext,
  input: StartRestoreTestRunInput,
): Promise<ActionResult<{ restoreTestRunId: UUID }>> {
  requirePermission(ctx, "platform.recovery");

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.restore_test_runs (
      tenant_id, run_scope, module_key, restore_status, started_by, result_json
    )
    values ($1,$2,$3,'started',$4,'{}'::jsonb)
    returning id
    `,
    [
      input.tenantId ?? null,
      input.runScope ?? "platform",
      input.moduleKey ?? null,
      ctx.platformUserId,
    ],
  );

  const restoreTestRunId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "platform",
    actionCode: "recovery.restore_test.start",
    targetTable: "restore_test_runs",
    targetRecordId: restoreTestRunId,
    newValues: input,
  });

  return {
    success: true,
    message: "Restore test run started successfully.",
    data: { restoreTestRunId },
    correlationId: ctx.correlationId,
  };
}
