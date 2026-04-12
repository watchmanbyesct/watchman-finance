// Watchman Finance Server Action Starter Pack 002 v1
// Integration staging and promotion layer.
// Replace db/auth/audit implementations with your app services.

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

export function makeDedupeKey(parts: Array<string | number | undefined | null>): string {
  return parts.filter(Boolean).join(":");
}

export interface ReceiveLaunchEmployeeSyncInput {
  tenantId: UUID;
  entityId?: UUID;
  sourceRecordId: string;
  payload: Record<string, unknown>;
}

export async function receiveLaunchEmployeeSync(
  db: DbClient,
  ctx: ActionContext,
  input: ReceiveLaunchEmployeeSyncInput,
): Promise<ActionResult<{ stagedEmployeeId: UUID }>> {
  const dedupeKey = makeDedupeKey([
    "watchman_launch",
    "employee",
    input.sourceRecordId,
    JSON.stringify(input.payload),
  ]);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.staged_employees (
      tenant_id, entity_id, source_system_key, source_record_id, correlation_id,
      dedupe_key, payload_json, normalized_json, validation_status
    )
    values ($1,$2,'watchman_launch',$3,$4,$5,$6::jsonb,'{}'::jsonb,'pending')
    on conflict (tenant_id, dedupe_key) do update
      set payload_json = excluded.payload_json,
          correlation_id = excluded.correlation_id
    returning id
    `,
    [
      input.tenantId,
      input.entityId ?? null,
      input.sourceRecordId,
      ctx.correlationId,
      dedupeKey,
      JSON.stringify(input.payload),
    ],
  );

  const stagedEmployeeId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "finance_core",
    actionCode: "integration.receive_launch_employee_sync",
    targetTable: "staged_employees",
    targetRecordId: stagedEmployeeId,
    metadata: { sourceRecordId: input.sourceRecordId },
    sourceChannel: "system",
  });

  return {
    success: true,
    message: "Launch employee payload staged successfully.",
    data: { stagedEmployeeId },
    correlationId: ctx.correlationId,
  };
}

export interface PromoteStagedEmployeeInput {
  tenantId: UUID;
  stagedEmployeeId: UUID;
}

export async function promoteStagedEmployee(
  db: DbClient,
  ctx: ActionContext,
  input: PromoteStagedEmployeeInput,
): Promise<ActionResult<{ financePersonId: UUID }>> {
  return db.transaction(async (tx) => {
    const staged = await tx.query<{
      id: UUID;
      entity_id: UUID | null;
      source_record_id: string;
      payload_json: Record<string, unknown>;
      validation_status: string;
    }>(
      `
      select id, entity_id, source_record_id, payload_json, validation_status
      from public.staged_employees
      where id = $1 and tenant_id = $2
      `,
      [input.stagedEmployeeId, input.tenantId],
    );

    if (!staged.rows.length) {
      throw new Error("not_found:staged_employee");
    }

    const row = staged.rows[0];
    const payload = row.payload_json as Record<string, unknown>;

    const legalFirstName = String(payload.legal_first_name ?? payload.first_name ?? "");
    const legalLastName = String(payload.legal_last_name ?? payload.last_name ?? "");

    if (!legalFirstName || !legalLastName) {
      throw new Error("validation_failed:missing_name");
    }

    const upsert = await tx.query<{ id: UUID }>(
      `
      insert into public.finance_people (
        tenant_id, entity_id, person_type, legal_first_name, legal_last_name,
        middle_name, preferred_name, email, phone, employment_status, hire_date,
        source_system_key, source_record_id
      )
      values (
        $1,$2,'employee',$3,$4,$5,$6,$7,$8,
        coalesce($9,'active'),$10,'watchman_launch',$11
      )
      on conflict (tenant_id, source_system_key, source_record_id)
      do update set
        entity_id = excluded.entity_id,
        legal_first_name = excluded.legal_first_name,
        legal_last_name = excluded.legal_last_name,
        middle_name = excluded.middle_name,
        preferred_name = excluded.preferred_name,
        email = excluded.email,
        phone = excluded.phone,
        employment_status = excluded.employment_status,
        hire_date = excluded.hire_date
      returning id
      `,
      [
        input.tenantId,
        row.entity_id,
        legalFirstName,
        legalLastName,
        payload.middle_name ?? null,
        payload.preferred_name ?? null,
        payload.email ?? null,
        payload.phone ?? null,
        payload.employment_status ?? "active",
        payload.hire_date ?? null,
        row.source_record_id,
      ],
    );

    const financePersonId = upsert.rows[0].id;

    await tx.query(
      `
      update public.staged_employees
      set validation_status = 'promoted',
          promoted_at = timezone('utc', now()),
          promoted_record_id = $1
      where id = $2
      `,
      [financePersonId, input.stagedEmployeeId],
    );

    await tx.query(
      `
      insert into public.external_id_mappings (
        tenant_id, entity_id, source_system_key, source_record_type, source_record_id,
        target_table, target_record_id, mapping_status
      )
      values ($1,$2,'watchman_launch','employee',$3,'finance_people',$4,'active')
      on conflict (tenant_id, source_system_key, source_record_type, source_record_id, target_table)
      do update set
        target_record_id = excluded.target_record_id,
        mapping_status = 'active'
      `,
      [input.tenantId, row.entity_id, row.source_record_id, financePersonId],
    );

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: row.entity_id ?? undefined,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "integration.promote_staged_employee",
      targetTable: "finance_people",
      targetRecordId: financePersonId,
      metadata: { stagedEmployeeId: input.stagedEmployeeId },
      sourceChannel: "api",
    });

    return {
      success: true,
      message: "Staged employee promoted successfully.",
      data: { financePersonId },
      correlationId: ctx.correlationId,
    };
  });
}

export interface ReceiveApprovedTimeInput {
  tenantId: UUID;
  entityId?: UUID;
  sourceRecordId: string;
  employeeSourceRecordId: string;
  payPeriodStart?: string;
  payPeriodEnd?: string;
  payload: Record<string, unknown>;
}

export async function receiveApprovedTime(
  db: DbClient,
  ctx: ActionContext,
  input: ReceiveApprovedTimeInput,
): Promise<ActionResult<{ stagedTimeEntryId: UUID }>> {
  const dedupeKey = makeDedupeKey([
    "watchman_operations",
    "approved_time",
    input.sourceRecordId,
    JSON.stringify(input.payload),
  ]);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.staged_time_entries (
      tenant_id, entity_id, source_system_key, source_record_id, correlation_id,
      dedupe_key, payload_json, normalized_json, employee_source_record_id,
      pay_period_start, pay_period_end, approval_status, validation_status
    )
    values ($1,$2,'watchman_operations',$3,$4,$5,$6::jsonb,'{}'::jsonb,$7,$8,$9,'approved','pending')
    on conflict (tenant_id, dedupe_key) do update
      set payload_json = excluded.payload_json,
          correlation_id = excluded.correlation_id,
          approval_status = 'approved'
    returning id
    `,
    [
      input.tenantId,
      input.entityId ?? null,
      input.sourceRecordId,
      ctx.correlationId,
      dedupeKey,
      JSON.stringify(input.payload),
      input.employeeSourceRecordId,
      input.payPeriodStart ?? null,
      input.payPeriodEnd ?? null,
    ],
  );

  const stagedTimeEntryId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "payroll",
    actionCode: "integration.receive_approved_time",
    targetTable: "staged_time_entries",
    targetRecordId: stagedTimeEntryId,
    metadata: { sourceRecordId: input.sourceRecordId, employeeSourceRecordId: input.employeeSourceRecordId },
    sourceChannel: "system",
  });

  return {
    success: true,
    message: "Approved time payload staged successfully.",
    data: { stagedTimeEntryId },
    correlationId: ctx.correlationId,
  };
}

export interface ReceiveServiceEventInput {
  tenantId: UUID;
  entityId?: UUID;
  sourceRecordId: string;
  serviceType?: string;
  eventDate?: string;
  payload: Record<string, unknown>;
}

export async function receiveServiceEvent(
  db: DbClient,
  ctx: ActionContext,
  input: ReceiveServiceEventInput,
): Promise<ActionResult<{ stagedServiceEventId: UUID }>> {
  const dedupeKey = makeDedupeKey([
    "watchman_operations",
    "service_event",
    input.sourceRecordId,
    JSON.stringify(input.payload),
  ]);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.staged_service_events (
      tenant_id, entity_id, source_system_key, source_record_id, correlation_id,
      dedupe_key, payload_json, normalized_json, event_date, service_type, validation_status
    )
    values ($1,$2,'watchman_operations',$3,$4,$5,$6::jsonb,'{}'::jsonb,$7,$8,'pending')
    on conflict (tenant_id, dedupe_key) do update
      set payload_json = excluded.payload_json,
          correlation_id = excluded.correlation_id
    returning id
    `,
    [
      input.tenantId,
      input.entityId ?? null,
      input.sourceRecordId,
      ctx.correlationId,
      dedupeKey,
      JSON.stringify(input.payload),
      input.eventDate ?? null,
      input.serviceType ?? null,
    ],
  );

  const stagedServiceEventId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "billing",
    actionCode: "integration.receive_service_event",
    targetTable: "staged_service_events",
    targetRecordId: stagedServiceEventId,
    metadata: { sourceRecordId: input.sourceRecordId },
    sourceChannel: "system",
  });

  return {
    success: true,
    message: "Service event payload staged successfully.",
    data: { stagedServiceEventId },
    correlationId: ctx.correlationId,
  };
}
