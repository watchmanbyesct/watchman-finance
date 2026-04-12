// Watchman Finance Server Action Starter Pack 003 v1
// AR and AP core action stubs.

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

export interface CreateInvoiceDraftInput {
  tenantId: UUID;
  entityId: UUID;
  customerId: UUID;
  customerSiteId?: UUID;
  invoiceNumber: string;
  memo?: string;
  sourceType?: "manual" | "contract_billing" | "service_event" | "other";
}

export async function createInvoiceDraft(
  db: DbClient,
  ctx: ActionContext,
  input: CreateInvoiceDraftInput,
): Promise<ActionResult<{ invoiceId: UUID }>> {
  requirePermission(ctx, "ar.invoice.draft.create");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.invoices (
      tenant_id, entity_id, customer_id, customer_site_id, invoice_number,
      invoice_status, memo, source_type, created_by
    )
    values ($1,$2,$3,$4,$5,'draft',$6,$7,$8)
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.customerId,
      input.customerSiteId ?? null,
      input.invoiceNumber,
      input.memo ?? null,
      input.sourceType ?? "manual",
      ctx.platformUserId,
    ],
  );

  const invoiceId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "ar",
    actionCode: "ar.invoice.draft.create",
    targetTable: "invoices",
    targetRecordId: invoiceId,
    newValues: input,
  });

  return {
    success: true,
    message: "Invoice draft created successfully.",
    data: { invoiceId },
    correlationId: ctx.correlationId,
  };
}

export interface AddInvoiceLineInput {
  tenantId: UUID;
  invoiceId: UUID;
  description: string;
  quantity: number;
  unitPrice: number;
  revenueAccountId?: UUID;
  lineType?: "service" | "product" | "fee" | "discount" | "tax" | "adjustment";
}

export async function addInvoiceLine(
  db: DbClient,
  ctx: ActionContext,
  input: AddInvoiceLineInput,
): Promise<ActionResult<{ invoiceLineId: UUID }>> {
  requirePermission(ctx, "ar.invoice.draft.edit");

  return db.transaction(async (tx) => {
    const invoiceRes = await tx.query<{ tenant_id: UUID; entity_id: UUID }>(
      `select tenant_id, entity_id from public.invoices where id = $1`,
      [input.invoiceId],
    );
    if (!invoiceRes.rows.length) throw new Error("not_found:invoice");
    requireEntityScope(ctx, invoiceRes.rows[0].entity_id);

    const lineNoRes = await tx.query<{ next_line: number }>(
      `select coalesce(max(line_number), 0) + 1 as next_line from public.invoice_lines where invoice_id = $1`,
      [input.invoiceId],
    );
    const lineNumber = lineNoRes.rows[0].next_line;
    const lineAmount = Number((input.quantity * input.unitPrice).toFixed(2));

    const result = await tx.query<{ id: UUID }>(
      `
      insert into public.invoice_lines (
        tenant_id, invoice_id, line_number, line_type, description,
        quantity, unit_price, line_amount, revenue_account_id
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      returning id
      `,
      [
        input.tenantId,
        input.invoiceId,
        lineNumber,
        input.lineType ?? "service",
        input.description,
        input.quantity,
        input.unitPrice,
        lineAmount,
        input.revenueAccountId ?? null,
      ],
    );

    await tx.query(
      `
      update public.invoices
      set subtotal_amount = (
            select coalesce(sum(line_amount), 0) from public.invoice_lines where invoice_id = $1
          ),
          total_amount = (
            select coalesce(sum(line_amount), 0) from public.invoice_lines where invoice_id = $1
          ),
          balance_due = (
            select coalesce(sum(line_amount), 0) from public.invoice_lines where invoice_id = $1
          )
      where id = $1
      `,
      [input.invoiceId],
    );

    const invoiceLineId = result.rows[0].id;

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: invoiceRes.rows[0].entity_id,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "ar",
      actionCode: "ar.invoice.line.add",
      targetTable: "invoice_lines",
      targetRecordId: invoiceLineId,
      newValues: input,
    });

    return {
      success: true,
      message: "Invoice line added successfully.",
      data: { invoiceLineId },
      correlationId: ctx.correlationId,
    };
  });
}

export interface IssueInvoiceInput {
  tenantId: UUID;
  entityId: UUID;
  invoiceId: UUID;
  issueDate: string;
  dueDate: string;
}

export async function issueInvoice(
  db: DbClient,
  ctx: ActionContext,
  input: IssueInvoiceInput,
): Promise<ActionResult<{ invoiceId: UUID }>> {
  requirePermission(ctx, "ar.invoice.issue");
  requireEntityScope(ctx, input.entityId);

  await db.query(
    `
    update public.invoices
    set invoice_status = 'issued',
        issue_date = $1,
        due_date = $2,
        issued_by = $3,
        issued_at = timezone('utc', now())
    where id = $4 and tenant_id = $5 and entity_id = $6 and invoice_status = 'draft'
    `,
    [input.issueDate, input.dueDate, ctx.platformUserId, input.invoiceId, input.tenantId, input.entityId],
  );

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "ar",
    actionCode: "ar.invoice.issue",
    targetTable: "invoices",
    targetRecordId: input.invoiceId,
    newValues: input,
  });

  return {
    success: true,
    message: "Invoice issued successfully.",
    data: { invoiceId: input.invoiceId },
    correlationId: ctx.correlationId,
  };
}

export interface RecordCustomerPaymentInput {
  tenantId: UUID;
  entityId: UUID;
  customerId: UUID;
  invoiceId?: UUID;
  paymentReference?: string;
  paymentMethod: "manual" | "ach" | "card" | "check" | "other";
  paymentDate: string;
  amountReceived: number;
}

export async function recordCustomerPayment(
  db: DbClient,
  ctx: ActionContext,
  input: RecordCustomerPaymentInput,
): Promise<ActionResult<{ paymentId: UUID }>> {
  requirePermission(ctx, "ar.payment.record");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.invoice_payments (
      tenant_id, entity_id, customer_id, invoice_id, payment_reference, payment_method,
      payment_date, amount_received, amount_applied, unapplied_amount, payment_status, created_by
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,0,$8,'recorded',$9)
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.customerId,
      input.invoiceId ?? null,
      input.paymentReference ?? null,
      input.paymentMethod,
      input.paymentDate,
      input.amountReceived,
      ctx.platformUserId,
    ],
  );

  const paymentId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "ar",
    actionCode: "ar.payment.record",
    targetTable: "invoice_payments",
    targetRecordId: paymentId,
    newValues: input,
  });

  return {
    success: true,
    message: "Customer payment recorded successfully.",
    data: { paymentId },
    correlationId: ctx.correlationId,
  };
}

export interface CreateBillDraftInput {
  tenantId: UUID;
  entityId: UUID;
  vendorId: UUID;
  billNumber: string;
  vendorInvoiceNumber?: string;
  memo?: string;
}

export async function createBillDraft(
  db: DbClient,
  ctx: ActionContext,
  input: CreateBillDraftInput,
): Promise<ActionResult<{ billId: UUID }>> {
  requirePermission(ctx, "ap.bill.draft.create");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.bills (
      tenant_id, entity_id, vendor_id, bill_number, vendor_invoice_number,
      bill_status, memo, created_by
    )
    values ($1,$2,$3,$4,$5,'draft',$6,$7)
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.vendorId,
      input.billNumber,
      input.vendorInvoiceNumber ?? null,
      input.memo ?? null,
      ctx.platformUserId,
    ],
  );

  const billId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "ap",
    actionCode: "ap.bill.draft.create",
    targetTable: "bills",
    targetRecordId: billId,
    newValues: input,
  });

  return {
    success: true,
    message: "Bill draft created successfully.",
    data: { billId },
    correlationId: ctx.correlationId,
  };
}

export interface AddBillLineInput {
  tenantId: UUID;
  billId: UUID;
  description: string;
  quantity: number;
  unitCost: number;
  expenseAccountId?: UUID;
}

export async function addBillLine(
  db: DbClient,
  ctx: ActionContext,
  input: AddBillLineInput,
): Promise<ActionResult<{ billLineId: UUID }>> {
  requirePermission(ctx, "ap.bill.draft.edit");

  return db.transaction(async (tx) => {
    const billRes = await tx.query<{ tenant_id: UUID; entity_id: UUID }>(
      `select tenant_id, entity_id from public.bills where id = $1`,
      [input.billId],
    );
    if (!billRes.rows.length) throw new Error("not_found:bill");
    requireEntityScope(ctx, billRes.rows[0].entity_id);

    const lineNoRes = await tx.query<{ next_line: number }>(
      `select coalesce(max(line_number), 0) + 1 as next_line from public.bill_lines where bill_id = $1`,
      [input.billId],
    );
    const lineNumber = lineNoRes.rows[0].next_line;
    const lineAmount = Number((input.quantity * input.unitCost).toFixed(2));

    const result = await tx.query<{ id: UUID }>(
      `
      insert into public.bill_lines (
        tenant_id, bill_id, line_number, description,
        quantity, unit_cost, line_amount, expense_account_id
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8)
      returning id
      `,
      [
        input.tenantId,
        input.billId,
        lineNumber,
        input.description,
        input.quantity,
        input.unitCost,
        lineAmount,
        input.expenseAccountId ?? null,
      ],
    );

    await tx.query(
      `
      update public.bills
      set subtotal_amount = (
            select coalesce(sum(line_amount), 0) from public.bill_lines where bill_id = $1
          ),
          total_amount = (
            select coalesce(sum(line_amount), 0) from public.bill_lines where bill_id = $1
          ),
          balance_due = (
            select coalesce(sum(line_amount), 0) from public.bill_lines where bill_id = $1
          )
      where id = $1
      `,
      [input.billId],
    );

    const billLineId = result.rows[0].id;

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: billRes.rows[0].entity_id,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "ap",
      actionCode: "ap.bill.line.add",
      targetTable: "bill_lines",
      targetRecordId: billLineId,
      newValues: input,
    });

    return {
      success: true,
      message: "Bill line added successfully.",
      data: { billLineId },
      correlationId: ctx.correlationId,
    };
  });
}

export interface ApproveBillInput {
  tenantId: UUID;
  entityId: UUID;
  billId: UUID;
}

export async function approveBill(
  db: DbClient,
  ctx: ActionContext,
  input: ApproveBillInput,
): Promise<ActionResult<{ billId: UUID }>> {
  requirePermission(ctx, "ap.bill.approve");
  requireEntityScope(ctx, input.entityId);

  await db.query(
    `
    update public.bills
    set bill_status = 'approved',
        approved_by = $1,
        approved_at = timezone('utc', now())
    where id = $2 and tenant_id = $3 and entity_id = $4 and bill_status = 'draft'
    `,
    [ctx.platformUserId, input.billId, input.tenantId, input.entityId],
  );

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "ap",
    actionCode: "ap.bill.approve",
    targetTable: "bills",
    targetRecordId: input.billId,
    newValues: input,
  });

  return {
    success: true,
    message: "Bill approved successfully.",
    data: { billId: input.billId },
    correlationId: ctx.correlationId,
  };
}

export interface RecordVendorPaymentInput {
  tenantId: UUID;
  entityId: UUID;
  vendorId: UUID;
  billId?: UUID;
  paymentReference?: string;
  paymentMethod: "manual" | "ach" | "check" | "wire" | "other";
  paymentDate: string;
  amountPaid: number;
}

export async function recordVendorPayment(
  db: DbClient,
  ctx: ActionContext,
  input: RecordVendorPaymentInput,
): Promise<ActionResult<{ vendorPaymentId: UUID }>> {
  requirePermission(ctx, "ap.payment.create");
  requireEntityScope(ctx, input.entityId);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.vendor_payments (
      tenant_id, entity_id, vendor_id, bill_id, payment_reference, payment_method,
      payment_date, amount_paid, amount_applied, unapplied_amount, payment_status, created_by
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,0,$8,'recorded',$9)
    returning id
    `,
    [
      input.tenantId,
      input.entityId,
      input.vendorId,
      input.billId ?? null,
      input.paymentReference ?? null,
      input.paymentMethod,
      input.paymentDate,
      input.amountPaid,
      ctx.platformUserId,
    ],
  );

  const vendorPaymentId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "ap",
    actionCode: "ap.payment.record",
    targetTable: "vendor_payments",
    targetRecordId: vendorPaymentId,
    newValues: input,
  });

  return {
    success: true,
    message: "Vendor payment recorded successfully.",
    data: { vendorPaymentId },
    correlationId: ctx.correlationId,
  };
}
