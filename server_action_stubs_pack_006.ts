/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

// Watchman Finance Server Action Starter Pack 006 v1
// Banking and reconciliation action stubs.

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

export function requireEntityScope(ctx: ActionContext, entityId: UUID): void {
  if (!ctx.entityIds.includes(entityId)) {
    throw new Error(`entity_scope_mismatch:${entityId}`);
  }
}

export interface CreateBankAccountInput {
  tenantId: UUID;
  entityId: UUID;
  accountName: string;
  bankName: string;
  accountType: "operating" | "payroll" | "tax" | "savings" | "other";
  accountNumberLast4?: string;
  routingNumberLast4?: string;
  currencyCode?: string;
}

export async function createBankAccount(
  db: DbClient,
  ctx: ActionContext,
  input: CreateBankAccountInput,
): Promise<ActionResult<{ bankAccountId: UUID }>> {
  requirePermission(ctx, "bank.account.manage");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.bank_accounts (
      tenant_id, entity_id, account_name, bank_name, account_type,
      account_number_last4, routing_number_last4, currency_code, is_active,
      allow_incoming, allow_outgoing
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,true,true,true)
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.accountName,
      input.bankName,
      input.accountType,
      input.accountNumberLast4 ?? null,
      input.routingNumberLast4 ?? null,
      input.currencyCode ?? "USD",
    ],
  );

  const bankAccountId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "banking",
    actionCode: "bank.account.create",
    targetTable: "bank_accounts",
    targetRecordId: bankAccountId,
    newValues: input,
  });

  return {
    success: true,
    message: "Bank account created successfully.",
    data: { bankAccountId },
    correlationId: ctx.correlationId,
  };
}

export interface ImportBankTransactionInput {
  tenantId: UUID;
  entityId: UUID;
  bankAccountId: UUID;
  transactionDate: string;
  postedDate?: string;
  transactionType: "debit" | "credit" | "fee" | "transfer" | "other";
  amount: number;
  description: string;
  referenceNumber?: string;
  statementCycleKey?: string;
}

export async function importBankTransaction(
  db: DbClient,
  ctx: ActionContext,
  input: ImportBankTransactionInput,
): Promise<ActionResult<{ bankTransactionId: UUID }>> {
  requirePermission(ctx, "bank.transaction.import");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.bank_transactions (
      tenant_id, entity_id, bank_account_id, transaction_date, posted_date,
      transaction_type, amount, description, reference_number, source_type,
      match_status, statement_cycle_key, created_by
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'import','unmatched',$10,$11)
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.bankAccountId,
      input.transactionDate,
      input.postedDate ?? null,
      input.transactionType,
      input.amount,
      input.description,
      input.referenceNumber ?? null,
      input.statementCycleKey ?? null,
      ctx.platformUserId,
    ],
  );

  const bankTransactionId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "banking",
    actionCode: "bank.transaction.import",
    targetTable: "bank_transactions",
    targetRecordId: bankTransactionId,
    newValues: input,
  });

  return {
    success: true,
    message: "Bank transaction imported successfully.",
    data: { bankTransactionId },
    correlationId: ctx.correlationId,
  };
}

export interface CreateReconciliationInput {
  tenantId: UUID;
  entityId: UUID;
  bankAccountId: UUID;
  reconciliationName: string;
  statementStartDate: string;
  statementEndDate: string;
  statementEndingBalance: number;
}

export async function createReconciliation(
  db: DbClient,
  ctx: ActionContext,
  input: CreateReconciliationInput,
): Promise<ActionResult<{ reconciliationId: UUID }>> {
  requirePermission(ctx, "bank.reconciliation.create");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.reconciliations (
      tenant_id, entity_id, bank_account_id, reconciliation_name,
      statement_start_date, statement_end_date, statement_ending_balance,
      book_ending_balance, unreconciled_difference, reconciliation_status,
      prepared_by, prepared_at
    )
    values ($1,$2,$3,$4,$5,$6,$7,0,$7,'draft',$8,timezone('utc', now()))
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.bankAccountId,
      input.reconciliationName,
      input.statementStartDate,
      input.statementEndDate,
      input.statementEndingBalance,
      ctx.platformUserId,
    ],
  );

  const reconciliationId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "banking",
    actionCode: "bank.reconciliation.create",
    targetTable: "reconciliations",
    targetRecordId: reconciliationId,
    newValues: input,
  });

  return {
    success: true,
    message: "Reconciliation created successfully.",
    data: { reconciliationId },
    correlationId: ctx.correlationId,
  };
}

export interface MatchBankTransactionInput {
  tenantId: UUID;
  entityId: UUID;
  reconciliationId: UUID;
  bankTransactionId: UUID;
  matchAmount: number;
  invoicePaymentId?: UUID;
  vendorPaymentId?: UUID;
}

export async function matchBankTransaction(
  db: DbClient,
  ctx: ActionContext,
  input: MatchBankTransactionInput,
): Promise<ActionResult<{ receiptMatchId: UUID }>> {
  requirePermission(ctx, "bank.reconciliation.create");
  requireEntityScope(ctx, input.entityId);

  return db.transaction(async (tx) => {
    const line = await tx.query<{ id: UUID }>(
      `
      insert into public.reconciliation_lines (
        tenant_id, reconciliation_id, bank_transaction_id, line_status, matched_amount
      )
      values ($1,$2,$3,'matched',$4)
      on conflict (reconciliation_id, bank_transaction_id)
      do update set line_status = 'matched', matched_amount = excluded.matched_amount
      returning id
      `,
      [
        input.tenantId,
        input.reconciliationId,
        input.bankTransactionId,
        input.matchAmount,
      ],
    );

    const match = await tx.query<{ id: UUID }>(
      `
      insert into public.receipt_matches (
        tenant_id, entity_id, bank_transaction_id, invoice_payment_id, vendor_payment_id,
        match_amount, match_status, created_by
      )
      values ($1,$2,$3,$4,$5,$6,'matched',$7)
      returning id
      `,
      [
        input.tenantId,
        input.entityId,
        input.bankTransactionId,
        input.invoicePaymentId ?? null,
        input.vendorPaymentId ?? null,
        input.matchAmount,
        ctx.platformUserId,
      ],
    );

    await tx.query(
      `
      update public.bank_transactions
      set match_status = 'matched'
      where id = $1 and tenant_id = $2 and entity_id = $3
      `,
      [input.bankTransactionId, input.tenantId, input.entityId],
    );

    const receiptMatchId = match.rows[0].id;

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "banking",
      actionCode: "bank.transaction.match",
      targetTable: "receipt_matches",
      targetRecordId: receiptMatchId,
      newValues: input,
    });

    return {
      success: true,
      message: "Bank transaction matched successfully.",
      data: { receiptMatchId },
      correlationId: ctx.correlationId,
    };
  });
}

export interface ApproveReconciliationInput {
  tenantId: UUID;
  entityId: UUID;
  reconciliationId: UUID;
}

export async function approveReconciliation(
  db: DbClient,
  ctx: ActionContext,
  input: ApproveReconciliationInput,
): Promise<ActionResult<{ reconciliationId: UUID }>> {
  requirePermission(ctx, "bank.reconciliation.approve");
  requireEntityScope(ctx, input.entityId);

  await db.query(
    `
    update public.reconciliations
    set reconciliation_status = 'approved',
        approved_by = $1,
        approved_at = timezone('utc', now())
    where id = $2 and tenant_id = $3 and entity_id = $4 and reconciliation_status in ('draft', 'in_review')
    `,
    [ctx.platformUserId, input.reconciliationId, input.tenantId, input.entityId],
  );

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "banking",
    actionCode: "bank.reconciliation.approve",
    targetTable: "reconciliations",
    targetRecordId: input.reconciliationId,
    newValues: input,
  });

  return {
    success: true,
    message: "Reconciliation approved successfully.",
    data: { reconciliationId: input.reconciliationId },
    correlationId: ctx.correlationId,
  };
}

export interface CreateTransferRequestInput {
  tenantId: UUID;
  entityId: UUID;
  fromBankAccountId: UUID;
  toBankAccountId: UUID;
  requestedAmount: number;
  transferDate?: string;
  requestReason?: string;
}

export async function createTransferRequest(
  db: DbClient,
  ctx: ActionContext,
  input: CreateTransferRequestInput,
): Promise<ActionResult<{ transferRequestId: UUID }>> {
  requirePermission(ctx, "bank.transfer.create");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.transfer_requests (
      tenant_id, entity_id, from_bank_account_id, to_bank_account_id,
      requested_amount, transfer_date, transfer_status, request_reason,
      requested_by, requested_at
    )
    values ($1,$2,$3,$4,$5,$6,'submitted',$7,$8,timezone('utc', now()))
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.fromBankAccountId,
      input.toBankAccountId,
      input.requestedAmount,
      input.transferDate ?? null,
      input.requestReason ?? null,
      ctx.platformUserId,
    ],
  );

  const transferRequestId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "banking",
    actionCode: "bank.transfer.create",
    targetTable: "transfer_requests",
    targetRecordId: transferRequestId,
    newValues: input,
  });

  return {
    success: true,
    message: "Transfer request created successfully.",
    data: { transferRequestId },
    correlationId: ctx.correlationId,
  };
}

export interface ApproveTransferRequestInput {
  tenantId: UUID;
  entityId: UUID;
  transferRequestId: UUID;
}

export async function approveTransferRequest(
  db: DbClient,
  ctx: ActionContext,
  input: ApproveTransferRequestInput,
): Promise<ActionResult<{ transferRequestId: UUID }>> {
  requirePermission(ctx, "bank.transfer.approve");
  requireEntityScope(ctx, input.entityId);

  await db.query(
    `
    update public.transfer_requests
    set transfer_status = 'approved',
        approved_by = $1,
        approved_at = timezone('utc', now())
    where id = $2 and tenant_id = $3 and entity_id = $4 and transfer_status = 'submitted'
    `,
    [ctx.platformUserId, input.transferRequestId, input.tenantId, input.entityId],
  );

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "banking",
    actionCode: "bank.transfer.approve",
    targetTable: "transfer_requests",
    targetRecordId: input.transferRequestId,
    newValues: input,
  });

  return {
    success: true,
    message: "Transfer request approved successfully.",
    data: { transferRequestId: input.transferRequestId },
    correlationId: ctx.correlationId,
  };
}
