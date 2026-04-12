// Watchman Finance Server Action Starter Pack 011 v1
// Multi-entity consolidation and commercial readiness action stubs.

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

export function requireEntityScope(ctx: ActionContext, entityId?: UUID | null): void {
  if (entityId && !ctx.entityIds.includes(entityId)) {
    throw new Error(`entity_scope_mismatch:${entityId}`);
  }
}

export interface CreateConsolidationGroupInput {
  tenantId: UUID;
  groupCode: string;
  groupName: string;
  consolidationCurrency?: string;
}

export async function createConsolidationGroup(
  db: DbClient,
  ctx: ActionContext,
  input: CreateConsolidationGroupInput,
): Promise<ActionResult<{ consolidationGroupId: UUID }>> {
  requirePermission(ctx, "report.design");

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.consolidation_groups (
      tenant_id, group_code, group_name, consolidation_currency, status, created_by
    )
    values ($1,$2,$3,$4,'active',$5)
    returning id
    `,
    [
      input.tenantId,
      input.groupCode,
      input.groupName,
      input.consolidationCurrency ?? "USD",
      ctx.platformUserId,
    ],
  );

  const consolidationGroupId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "reporting",
    actionCode: "consolidation.group.create",
    targetTable: "consolidation_groups",
    targetRecordId: consolidationGroupId,
    newValues: input,
  });

  return {
    success: true,
    message: "Consolidation group created successfully.",
    data: { consolidationGroupId },
    correlationId: ctx.correlationId,
  };
}

export interface AddEntityToConsolidationGroupInput {
  tenantId: UUID;
  consolidationGroupId: UUID;
  entityId: UUID;
}

export async function addEntityToConsolidationGroup(
  db: DbClient,
  ctx: ActionContext,
  input: AddEntityToConsolidationGroupInput,
): Promise<ActionResult<{ consolidationGroupEntityId: UUID }>> {
  requirePermission(ctx, "report.design");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.consolidation_group_entities (
      tenant_id, consolidation_group_id, entity_id, inclusion_status
    )
    values ($1,$2,$3,'included')
    returning id
    `,
    [input.tenantId, input.consolidationGroupId, input.entityId],
  );

  const consolidationGroupEntityId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "reporting",
    actionCode: "consolidation.group.entity.add",
    targetTable: "consolidation_group_entities",
    targetRecordId: consolidationGroupEntityId,
    newValues: input,
  });

  return {
    success: true,
    message: "Entity added to consolidation group successfully.",
    data: { consolidationGroupEntityId },
    correlationId: ctx.correlationId,
  };
}

export interface GenerateConsolidationSnapshotInput {
  tenantId: UUID;
  consolidationGroupId: UUID;
  snapshotDate: string;
}

export async function generateConsolidationSnapshot(
  db: DbClient,
  ctx: ActionContext,
  input: GenerateConsolidationSnapshotInput,
): Promise<ActionResult<{ consolidationSnapshotId: UUID }>> {
  requirePermission(ctx, "report.read_sensitive");

  return db.transaction(async (tx) => {
    const entityList = await tx.query(
      `
      select * from public.v_consolidation_entity_list
      where tenant_id = $1 and consolidation_group_id = $2 and inclusion_status = 'included'
      `,
      [input.tenantId, input.consolidationGroupId],
    );

    const arSummary = await tx.query(
      `
      select tenant_id, entity_id, sum(total_balance_due) as ar_total
      from public.v_ar_aging_summary
      where tenant_id = $1
        and entity_id in (
          select entity_id from public.consolidation_group_entities
          where consolidation_group_id = $2 and inclusion_status = 'included'
        )
      group by tenant_id, entity_id
      `,
      [input.tenantId, input.consolidationGroupId],
    );

    const apSummary = await tx.query(
      `
      select tenant_id, entity_id, sum(total_balance_due) as ap_total
      from public.v_ap_aging_summary
      where tenant_id = $1
        and entity_id in (
          select entity_id from public.consolidation_group_entities
          where consolidation_group_id = $2 and inclusion_status = 'included'
        )
      group by tenant_id, entity_id
      `,
      [input.tenantId, input.consolidationGroupId],
    );

    const snapshotJson = {
      entities: entityList.rows,
      arSummary: arSummary.rows,
      apSummary: apSummary.rows,
      note: "Foundational consolidation snapshot. Full consolidated financial statements require expanded GL actuals and elimination logic."
    };

    const result = await tx.query<{ id: UUID }>(
      `
      insert into public.consolidation_snapshots (
        tenant_id, consolidation_group_id, snapshot_date, snapshot_status,
        snapshot_json, generated_by
      )
      values ($1,$2,$3,'generated',$4::jsonb,$5)
      on conflict (consolidation_group_id, snapshot_date)
      do update set
        snapshot_json = excluded.snapshot_json,
        generated_by = excluded.generated_by,
        generated_at = timezone('utc', now())
      returning id
      `,
      [
        input.tenantId,
        input.consolidationGroupId,
        input.snapshotDate,
        JSON.stringify(snapshotJson),
        ctx.platformUserId,
      ],
    );

    const consolidationSnapshotId = result.rows[0].id;

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "reporting",
      actionCode: "consolidation.snapshot.generate",
      targetTable: "consolidation_snapshots",
      targetRecordId: consolidationSnapshotId,
      newValues: input,
    });

    return {
      success: true,
      message: "Consolidation snapshot generated successfully.",
      data: { consolidationSnapshotId },
      correlationId: ctx.correlationId,
    };
  });
}

export interface CreateIntercompanyTransactionInput {
  tenantId: UUID;
  sourceEntityId: UUID;
  counterpartyEntityId: UUID;
  transactionCode: string;
  transactionType: "chargeback" | "reimbursement" | "shared_service" | "allocation" | "other";
  transactionDate?: string;
  amount: number;
  memo?: string;
}

export async function createIntercompanyTransaction(
  db: DbClient,
  ctx: ActionContext,
  input: CreateIntercompanyTransactionInput,
): Promise<ActionResult<{ intercompanyTransactionId: UUID }>> {
  requirePermission(ctx, "gl.journal.draft.create");
  requireEntityScope(ctx, input.sourceEntityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.intercompany_transactions (
      tenant_id, source_entity_id, counterparty_entity_id, transaction_code,
      transaction_type, transaction_status, transaction_date, amount, memo, created_by
    )
    values ($1,$2,$3,$4,$5,'draft',$6,$7,$8,$9)
    returning id
    `,
    [
      input.tenantId,
      input.sourceEntityId,
      input.counterpartyEntityId,
      input.transactionCode,
      input.transactionType,
      input.transactionDate ?? null,
      input.amount,
      input.memo ?? null,
      ctx.platformUserId,
    ],
  );

  const intercompanyTransactionId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.sourceEntityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "finance_core",
    actionCode: "intercompany.transaction.create",
    targetTable: "intercompany_transactions",
    targetRecordId: intercompanyTransactionId,
    newValues: input,
  });

  return {
    success: true,
    message: "Intercompany transaction created successfully.",
    data: { intercompanyTransactionId },
    correlationId: ctx.correlationId,
  };
}

export interface RunTenantBootstrapInput {
  tenantId: UUID;
  provisioningTemplateId?: UUID;
  runNotes?: string;
}

export async function runTenantBootstrap(
  db: DbClient,
  ctx: ActionContext,
  input: RunTenantBootstrapInput,
): Promise<ActionResult<{ tenantBootstrapRunId: UUID }>> {
  requirePermission(ctx, "tenant.update");

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.tenant_bootstrap_runs (
      tenant_id, provisioning_template_id, bootstrap_status, run_notes, started_by, result_json
    )
    values ($1,$2,'started',$3,$4,'{}'::jsonb)
    returning id
    `,
    [
      input.tenantId,
      input.provisioningTemplateId ?? null,
      input.runNotes ?? null,
      ctx.platformUserId,
    ],
  );

  const tenantBootstrapRunId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "finance_core",
    actionCode: "tenant.bootstrap.run",
    targetTable: "tenant_bootstrap_runs",
    targetRecordId: tenantBootstrapRunId,
    newValues: input,
  });

  return {
    success: true,
    message: "Tenant bootstrap run started successfully.",
    data: { tenantBootstrapRunId },
    correlationId: ctx.correlationId,
  };
}

export interface SetTenantFeatureFlagInput {
  tenantId: UUID;
  featureFlagDefinitionId: UUID;
  enabled: boolean;
}

export async function setTenantFeatureFlag(
  db: DbClient,
  ctx: ActionContext,
  input: SetTenantFeatureFlagInput,
): Promise<ActionResult<{ tenantFeatureFlagId: UUID }>> {
  requirePermission(ctx, "tenant.update");

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.tenant_feature_flags (
      tenant_id, feature_flag_definition_id, enabled, enabled_at
    )
    values ($1,$2,$3,case when $3 then timezone('utc', now()) else null end)
    on conflict (tenant_id, feature_flag_definition_id)
    do update set
      enabled = excluded.enabled,
      enabled_at = case when excluded.enabled then timezone('utc', now()) else null end,
      updated_at = timezone('utc', now())
    returning id
    `,
    [
      input.tenantId,
      input.featureFlagDefinitionId,
      input.enabled,
    ],
  );

  const tenantFeatureFlagId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "finance_core",
    actionCode: "tenant.feature_flag.set",
    targetTable: "tenant_feature_flags",
    targetRecordId: tenantFeatureFlagId,
    newValues: input,
  });

  return {
    success: true,
    message: "Tenant feature flag updated successfully.",
    data: { tenantFeatureFlagId },
    correlationId: ctx.correlationId,
  };
}
