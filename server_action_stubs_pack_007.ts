// Watchman Finance Server Action Starter Pack 007 v1
// Products, services, and contract billing action stubs.

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

export interface CreateCatalogItemInput {
  tenantId: UUID;
  entityId?: UUID;
  itemCode: string;
  itemName: string;
  description?: string;
  categoryId?: UUID;
  itemTypeId?: UUID;
  billingMethod: "hourly" | "flat_fee" | "per_visit" | "per_incident" | "recurring_monthly" | "quantity";
  unitOfMeasure?: string;
  isTaxable?: boolean;
}

export async function createCatalogItem(
  db: DbClient,
  ctx: ActionContext,
  input: CreateCatalogItemInput,
): Promise<ActionResult<{ catalogItemId: UUID }>> {
  requirePermission(ctx, "catalog.item.manage");
  requireEntityScope(ctx, input.entityId ?? null);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.catalog_items (
      tenant_id, entity_id, item_code, item_name, description, category_id,
      item_type_id, billing_method, unit_of_measure, is_taxable, is_active
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)
    returning id
    `,
    [
      input.tenantId,
      input.entityId ?? null,
      input.itemCode,
      input.itemName,
      input.description ?? null,
      input.categoryId ?? null,
      input.itemTypeId ?? null,
      input.billingMethod,
      input.unitOfMeasure ?? "each",
      input.isTaxable ?? false,
    ],
  );

  const catalogItemId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId ?? undefined,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "catalog",
    actionCode: "catalog.item.create",
    targetTable: "catalog_items",
    targetRecordId: catalogItemId,
    newValues: input,
  });

  return {
    success: true,
    message: "Catalog item created successfully.",
    data: { catalogItemId },
    correlationId: ctx.correlationId,
  };
}

export interface SetCatalogPriceInput {
  tenantId: UUID;
  entityId?: UUID;
  catalogItemId: UUID;
  priceName: string;
  unitPrice: number;
  effectiveStartDate: string;
  effectiveEndDate?: string;
}

export async function setCatalogPrice(
  db: DbClient,
  ctx: ActionContext,
  input: SetCatalogPriceInput,
): Promise<ActionResult<{ catalogItemPriceId: UUID }>> {
  requirePermission(ctx, "catalog.pricing.manage");
  requireEntityScope(ctx, input.entityId ?? null);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.catalog_item_prices (
      tenant_id, entity_id, catalog_item_id, price_name, unit_price,
      effective_start_date, effective_end_date, status
    )
    values ($1,$2,$3,$4,$5,$6,$7,'active')
    returning id
    `,
    [
      input.tenantId,
      input.entityId ?? null,
      input.catalogItemId,
      input.priceName,
      input.unitPrice,
      input.effectiveStartDate,
      input.effectiveEndDate ?? null,
    ],
  );

  const catalogItemPriceId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId ?? undefined,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "catalog",
    actionCode: "catalog.price.set",
    targetTable: "catalog_item_prices",
    targetRecordId: catalogItemPriceId,
    newValues: input,
  });

  return {
    success: true,
    message: "Catalog price set successfully.",
    data: { catalogItemPriceId },
    correlationId: ctx.correlationId,
  };
}

export interface CreateBillingRuleInput {
  tenantId: UUID;
  entityId?: UUID;
  ruleCode: string;
  ruleName: string;
  customerId?: UUID;
  customerSiteId?: UUID;
  catalogItemId?: UUID;
  billingTrigger: "manual" | "service_event" | "shift_completed" | "scheduled_post" | "recurring";
  billingFrequency: "one_time" | "daily" | "weekly" | "monthly" | "event_driven";
  rateSource: "catalog" | "customer_override" | "contract_override" | "manual";
}

export async function createBillingRule(
  db: DbClient,
  ctx: ActionContext,
  input: CreateBillingRuleInput,
): Promise<ActionResult<{ billingRuleId: UUID }>> {
  requirePermission(ctx, "catalog.pricing.manage");
  requireEntityScope(ctx, input.entityId ?? null);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.billing_rules (
      tenant_id, entity_id, rule_code, rule_name, customer_id, customer_site_id,
      catalog_item_id, billing_trigger, billing_frequency, rate_source, status
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active')
    returning id
    `,
    [
      input.tenantId,
      input.entityId ?? null,
      input.ruleCode,
      input.ruleName,
      input.customerId ?? null,
      input.customerSiteId ?? null,
      input.catalogItemId ?? null,
      input.billingTrigger,
      input.billingFrequency,
      input.rateSource,
    ],
  );

  const billingRuleId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId ?? undefined,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "billing",
    actionCode: "billing.rule.create",
    targetTable: "billing_rules",
    targetRecordId: billingRuleId,
    newValues: input,
  });

  return {
    success: true,
    message: "Billing rule created successfully.",
    data: { billingRuleId },
    correlationId: ctx.correlationId,
  };
}

export interface GenerateBillableCandidateInput {
  tenantId: UUID;
  entityId?: UUID;
  sourceTable: string;
  sourceRecordId: string;
  sourceContractId?: string;
  customerId?: UUID;
  customerSiteId?: UUID;
  catalogItemId?: UUID;
  quantity?: number;
  candidateRate?: number;
  candidateDate?: string;
  notes?: string;
}

export async function generateBillableCandidate(
  db: DbClient,
  ctx: ActionContext,
  input: GenerateBillableCandidateInput,
): Promise<ActionResult<{ candidateId: UUID }>> {
  requirePermission(ctx, "ar.invoice.draft.create");
  requireEntityScope(ctx, input.entityId ?? null);

  const quantity = input.quantity ?? 1;
  const candidateRate = input.candidateRate ?? 0;
  const candidateAmount = Number((quantity * candidateRate).toFixed(2));

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.billable_event_candidates (
      tenant_id, entity_id, source_table, source_record_id, source_contract_id,
      customer_id, customer_site_id, catalog_item_id, quantity,
      candidate_rate, candidate_amount, candidate_status, candidate_date, notes
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',$12,$13)
    on conflict (tenant_id, source_table, source_record_id)
    do update set
      customer_id = excluded.customer_id,
      customer_site_id = excluded.customer_site_id,
      catalog_item_id = excluded.catalog_item_id,
      quantity = excluded.quantity,
      candidate_rate = excluded.candidate_rate,
      candidate_amount = excluded.candidate_amount,
      candidate_date = excluded.candidate_date,
      notes = excluded.notes
    returning id
    `,
    [
      input.tenantId,
      input.entityId ?? null,
      input.sourceTable,
      input.sourceRecordId,
      input.sourceContractId ?? null,
      input.customerId ?? null,
      input.customerSiteId ?? null,
      input.catalogItemId ?? null,
      quantity,
      candidateRate,
      candidateAmount,
      input.candidateDate ?? null,
      input.notes ?? null,
    ],
  );

  const candidateId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId ?? undefined,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "billing",
    actionCode: "billing.candidate.generate",
    targetTable: "billable_event_candidates",
    targetRecordId: candidateId,
    newValues: input,
    metadata: { candidateAmount },
  });

  return {
    success: true,
    message: "Billable event candidate generated successfully.",
    data: { candidateId },
    correlationId: ctx.correlationId,
  };
}

export interface ConvertCandidateToInvoiceLineInput {
  tenantId: UUID;
  entityId: UUID;
  candidateId: UUID;
  invoiceId: UUID;
}

export async function convertCandidateToInvoiceLine(
  db: DbClient,
  ctx: ActionContext,
  input: ConvertCandidateToInvoiceLineInput,
): Promise<ActionResult<{ invoiceLineId: UUID }>> {
  requirePermission(ctx, "ar.invoice.draft.edit");
  requireEntityScope(ctx, input.entityId);

  return db.transaction(async (tx) => {
    const candidateRes = await tx.query<{
      catalog_item_id: UUID | null;
      quantity: number;
      candidate_rate: number | null;
      candidate_amount: number | null;
      source_table: string;
      source_record_id: string;
    }>(
      `
      select catalog_item_id, quantity, candidate_rate, candidate_amount, source_table, source_record_id
      from public.billable_event_candidates
      where id = $1 and tenant_id = $2
      `,
      [input.candidateId, input.tenantId],
    );

    if (!candidateRes.rows.length) {
      throw new Error("not_found:billable_candidate");
    }

    const c = candidateRes.rows[0];

    const lineNoRes = await tx.query<{ next_line: number }>(
      `select coalesce(max(line_number), 0) + 1 as next_line from public.invoice_lines where invoice_id = $1`,
      [input.invoiceId],
    );

    const lineRes = await tx.query<{ id: UUID }>(
      `
      insert into public.invoice_lines (
        tenant_id, invoice_id, line_number, line_type, description,
        quantity, unit_price, line_amount, metadata_json
      )
      values ($1,$2,$3,'service',$4,$5,$6,$7,$8::jsonb)
      returning id
      `,
      [
        input.tenantId,
        input.invoiceId,
        lineNoRes.rows[0].next_line,
        "Converted billable event",
        c.quantity ?? 1,
        c.candidate_rate ?? 0,
        c.candidate_amount ?? 0,
        JSON.stringify({ catalog_item_id: c.catalog_item_id }),
      ],
    );

    const invoiceLineId = lineRes.rows[0].id;

    await tx.query(
      `
      insert into public.invoice_item_sources (
        tenant_id, invoice_line_id, source_table, source_record_id, source_type
      )
      values ($1,$2,$3,$4,'billable_candidate')
      `,
      [input.tenantId, invoiceLineId, c.source_table, c.source_record_id],
    );

    await tx.query(
      `
      update public.billable_event_candidates
      set candidate_status = 'converted'
      where id = $1
      `,
      [input.candidateId],
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

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "billing",
      actionCode: "billing.candidate.convert_to_invoice_line",
      targetTable: "invoice_lines",
      targetRecordId: invoiceLineId,
      metadata: input,
    });

    return {
      success: true,
      message: "Billable candidate converted to invoice line successfully.",
      data: { invoiceLineId },
      correlationId: ctx.correlationId,
    };
  });
}
