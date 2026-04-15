/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

// Watchman Finance Server Action Starter Pack 008 v1
// Inventory and asset control action stubs.

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

export interface CreateInventoryItemInput {
  tenantId: UUID;
  entityId?: UUID;
  itemCode: string;
  itemName: string;
  description?: string;
  inventoryCategoryId?: UUID;
  catalogItemId?: UUID;
  trackingMode: "quantity" | "serial" | "asset";
  unitOfMeasure?: string;
  reorderPoint?: number;
  reorderQuantity?: number;
  standardCost?: number;
  replacementCost?: number;
}

export async function createInventoryItem(
  db: DbClient,
  ctx: ActionContext,
  input: CreateInventoryItemInput,
): Promise<ActionResult<{ inventoryItemId: UUID }>> {
  requirePermission(ctx, "inventory.item.manage");
  requireEntityScope(ctx, input.entityId ?? null);

  const result = await db.query<{ id: UUID }>(
    `
    insert into public.inventory_items (
      tenant_id, entity_id, item_code, item_name, description, inventory_category_id,
      catalog_item_id, tracking_mode, unit_of_measure, reorder_point, reorder_quantity,
      standard_cost, replacement_cost, is_active
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true)
    returning id
    `,
    [
      input.tenantId,
      input.entityId ?? null,
      input.itemCode,
      input.itemName,
      input.description ?? null,
      input.inventoryCategoryId ?? null,
      input.catalogItemId ?? null,
      input.trackingMode,
      input.unitOfMeasure ?? "each",
      input.reorderPoint ?? null,
      input.reorderQuantity ?? null,
      input.standardCost ?? null,
      input.replacementCost ?? null,
    ],
  );

  const inventoryItemId = result.rows[0].id;

  await writeAuditLog(db, {
    tenantId: input.tenantId,
    entityId: input.entityId ?? undefined,
    actorPlatformUserId: ctx.platformUserId,
    moduleKey: "inventory",
    actionCode: "inventory.item.create",
    targetTable: "inventory_items",
    targetRecordId: inventoryItemId,
    newValues: input,
  });

  return {
    success: true,
    message: "Inventory item created successfully.",
    data: { inventoryItemId },
    correlationId: ctx.correlationId,
  };
}

export interface ReceiveStockInput {
  tenantId: UUID;
  entityId?: UUID;
  vendorId?: UUID;
  inventoryLocationId: UUID;
  receiptNumber: string;
  receiptDate?: string;
  notes?: string;
  lines: Array<{
    inventoryItemId: UUID;
    quantityReceived: number;
    unitCost: number;
  }>;
}

export async function receiveStock(
  db: DbClient,
  ctx: ActionContext,
  input: ReceiveStockInput,
): Promise<ActionResult<{ inventoryReceiptId: UUID }>> {
  requirePermission(ctx, "inventory.receive");
  requireEntityScope(ctx, input.entityId ?? null);

  return db.transaction(async (tx) => {
    const receipt = await tx.query<{ id: UUID }>(
      `
      insert into public.inventory_receipts (
        tenant_id, entity_id, vendor_id, inventory_location_id, receipt_number,
        receipt_status, receipt_date, notes, created_by, received_by, received_at
      )
      values ($1,$2,$3,$4,$5,'received',$6,$7,$8,$8,timezone('utc', now()))
      returning id
      `,
      [
        input.tenantId,
        input.entityId ?? null,
        input.vendorId ?? null,
        input.inventoryLocationId,
        input.receiptNumber,
        input.receiptDate ?? null,
        input.notes ?? null,
        ctx.platformUserId,
      ],
    );

    const inventoryReceiptId = receipt.rows[0].id;

    let lineNumber = 1
    for (const line of input.lines) {
      const lineValue = Number((line.quantityReceived * line.unitCost).toFixed(2));

      await tx.query(
        `
        insert into public.inventory_receipt_lines (
          tenant_id, inventory_receipt_id, inventory_item_id, line_number,
          quantity_received, unit_cost, line_value
        )
        values ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          input.tenantId,
          inventoryReceiptId,
          line.inventoryItemId,
          lineNumber,
          line.quantityReceived,
          line.unitCost,
          lineValue,
        ],
      );

      await tx.query(
        `
        insert into public.inventory_stock_balances (
          tenant_id, entity_id, inventory_item_id, inventory_location_id,
          quantity_on_hand, quantity_available, quantity_reserved, total_value
        )
        values ($1,$2,$3,$4,$5,$5,0,$6)
        on conflict (inventory_item_id, inventory_location_id)
        do update set
          quantity_on_hand = public.inventory_stock_balances.quantity_on_hand + excluded.quantity_on_hand,
          quantity_available = public.inventory_stock_balances.quantity_available + excluded.quantity_available,
          total_value = public.inventory_stock_balances.total_value + excluded.total_value
        `,
        [
          input.tenantId,
          input.entityId ?? null,
          line.inventoryItemId,
          input.inventoryLocationId,
          line.quantityReceived,
          lineValue,
        ],
      );

      lineNumber += 1
    }

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: input.entityId ?? undefined,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "inventory",
      actionCode: "inventory.receive",
      targetTable: "inventory_receipts",
      targetRecordId: inventoryReceiptId,
      metadata: { lineCount: input.lines.length },
      newValues: input,
    });

    return {
      success: true,
      message: "Stock received successfully.",
      data: { inventoryReceiptId },
      correlationId: ctx.correlationId,
    };
  });
}

export interface TransferStockInput {
  tenantId: UUID;
  entityId?: UUID;
  inventoryItemId: UUID;
  fromLocationId: UUID;
  toLocationId: UUID;
  quantityTransferred: number;
  transferDate?: string;
  notes?: string;
}

export async function transferStock(
  db: DbClient,
  ctx: ActionContext,
  input: TransferStockInput,
): Promise<ActionResult<{ inventoryTransferId: UUID }>> {
  requirePermission(ctx, "inventory.transfer");
  requireEntityScope(ctx, input.entityId ?? null);

  return db.transaction(async (tx) => {
    const transfer = await tx.query<{ id: UUID }>(
      `
      insert into public.inventory_transfers (
        tenant_id, entity_id, inventory_item_id, from_location_id, to_location_id,
        quantity_transferred, transfer_status, transfer_date, notes, requested_by, approved_by, approved_at, completed_at
      )
      values ($1,$2,$3,$4,$5,$6,'completed',$7,$8,$9,$9,timezone('utc', now()), timezone('utc', now()))
      returning id
      `,
      [
        input.tenantId,
        input.entityId ?? null,
        input.inventoryItemId,
        input.fromLocationId,
        input.toLocationId,
        input.quantityTransferred,
        input.transferDate ?? null,
        input.notes ?? null,
        ctx.platformUserId,
      ],
    );

    await tx.query(
      `
      update public.inventory_stock_balances
      set quantity_on_hand = quantity_on_hand - $1,
          quantity_available = quantity_available - $1
      where inventory_item_id = $2 and inventory_location_id = $3
      `,
      [input.quantityTransferred, input.inventoryItemId, input.fromLocationId],
    );

    await tx.query(
      `
      insert into public.inventory_stock_balances (
        tenant_id, entity_id, inventory_item_id, inventory_location_id,
        quantity_on_hand, quantity_available, quantity_reserved, total_value
      )
      values ($1,$2,$3,$4,$5,$5,0,0)
      on conflict (inventory_item_id, inventory_location_id)
      do update set
        quantity_on_hand = public.inventory_stock_balances.quantity_on_hand + excluded.quantity_on_hand,
        quantity_available = public.inventory_stock_balances.quantity_available + excluded.quantity_available
      `,
      [
        input.tenantId,
        input.entityId ?? null,
        input.inventoryItemId,
        input.toLocationId,
        input.quantityTransferred,
      ],
    );

    const inventoryTransferId = transfer.rows[0].id;

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: input.entityId ?? undefined,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "inventory",
      actionCode: "inventory.transfer",
      targetTable: "inventory_transfers",
      targetRecordId: inventoryTransferId,
      newValues: input,
    });

    return {
      success: true,
      message: "Stock transferred successfully.",
      data: { inventoryTransferId },
      correlationId: ctx.correlationId,
    };
  });
}

export interface AdjustStockInput {
  tenantId: UUID;
  entityId?: UUID;
  inventoryItemId: UUID;
  inventoryLocationId: UUID;
  quantityDelta: number;
  adjustmentReason: string;
  effectiveDate?: string;
  notes?: string;
}

export async function adjustStock(
  db: DbClient,
  ctx: ActionContext,
  input: AdjustStockInput,
): Promise<ActionResult<{ inventoryAdjustmentId: UUID }>> {
  requirePermission(ctx, "inventory.adjust");
  requireEntityScope(ctx, input.entityId ?? null);

  return db.transaction(async (tx) => {
    const adj = await tx.query<{ id: UUID }>(
      `
      insert into public.inventory_adjustments (
        tenant_id, entity_id, inventory_item_id, inventory_location_id, quantity_delta,
        adjustment_reason, adjustment_status, effective_date, notes, created_by, approved_by, approved_at, posted_at
      )
      values ($1,$2,$3,$4,$5,$6,'posted',$7,$8,$9,$9,timezone('utc', now()), timezone('utc', now()))
      returning id
      `,
      [
        input.tenantId,
        input.entityId ?? null,
        input.inventoryItemId,
        input.inventoryLocationId,
        input.quantityDelta,
        input.adjustmentReason,
        input.effectiveDate ?? null,
        input.notes ?? null,
        ctx.platformUserId,
      ],
    );

    await tx.query(
      `
      insert into public.inventory_stock_balances (
        tenant_id, entity_id, inventory_item_id, inventory_location_id,
        quantity_on_hand, quantity_available, quantity_reserved, total_value
      )
      values ($1,$2,$3,$4,$5,$5,0,0)
      on conflict (inventory_item_id, inventory_location_id)
      do update set
        quantity_on_hand = public.inventory_stock_balances.quantity_on_hand + excluded.quantity_on_hand,
        quantity_available = public.inventory_stock_balances.quantity_available + excluded.quantity_available
      `,
      [
        input.tenantId,
        input.entityId ?? null,
        input.inventoryItemId,
        input.inventoryLocationId,
        input.quantityDelta,
      ],
    );

    const inventoryAdjustmentId = adj.rows[0].id;

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: input.entityId ?? undefined,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "inventory",
      actionCode: "inventory.adjust",
      targetTable: "inventory_adjustments",
      targetRecordId: inventoryAdjustmentId,
      newValues: input,
    });

    return {
      success: true,
      message: "Inventory adjusted successfully.",
      data: { inventoryAdjustmentId },
      correlationId: ctx.correlationId,
    };
  });
}

export interface AssignAssetInput {
  tenantId: UUID;
  entityId?: UUID;
  equipmentAssetId: UUID;
  financePersonId?: UUID;
  assignedLocationId?: UUID;
  assignedToType: "employee" | "location" | "vehicle" | "other";
  issueDate?: string;
  dueReturnDate?: string;
  notes?: string;
}

export async function assignAsset(
  db: DbClient,
  ctx: ActionContext,
  input: AssignAssetInput,
): Promise<ActionResult<{ equipmentAssignmentId: UUID }>> {
  requirePermission(ctx, "asset.assign");
  requireEntityScope(ctx, input.entityId ?? null);

  return db.transaction(async (tx) => {
    const assignment = await tx.query<{ id: UUID }>(
      `
      insert into public.equipment_assignments (
        tenant_id, entity_id, equipment_asset_id, finance_person_id, assigned_location_id,
        assigned_to_type, assignment_status, issue_date, due_return_date, issued_by, notes
      )
      values ($1,$2,$3,$4,$5,$6,'active',$7,$8,$9,$10)
      returning id
      `,
      [
        input.tenantId,
        input.entityId ?? null,
        input.equipmentAssetId,
        input.financePersonId ?? null,
        input.assignedLocationId ?? null,
        input.assignedToType,
        input.issueDate ?? null,
        input.dueReturnDate ?? null,
        ctx.platformUserId,
        input.notes ?? null,
      ],
    );

    await tx.query(
      `
      update public.equipment_assets
      set asset_status = 'issued'
      where id = $1
      `,
      [input.equipmentAssetId],
    );

    const equipmentAssignmentId = assignment.rows[0].id;

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: input.entityId ?? undefined,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "inventory",
      actionCode: "asset.assign",
      targetTable: "equipment_assignments",
      targetRecordId: equipmentAssignmentId,
      newValues: input,
    });

    return {
      success: true,
      message: "Asset assigned successfully.",
      data: { equipmentAssignmentId },
      correlationId: ctx.correlationId,
    };
  });
}

export interface ReturnAssetInput {
  tenantId: UUID;
  entityId?: UUID;
  equipmentAssignmentId: UUID;
  returnDate?: string;
  notes?: string;
}

export async function returnAsset(
  db: DbClient,
  ctx: ActionContext,
  input: ReturnAssetInput,
): Promise<ActionResult<{ equipmentAssignmentId: UUID }>> {
  requirePermission(ctx, "asset.return");
  requireEntityScope(ctx, input.entityId ?? null);

  return db.transaction(async (tx) => {
    const res = await tx.query<{ equipment_asset_id: UUID }>(
      `
      update public.equipment_assignments
      set assignment_status = 'returned',
          return_date = $1,
          returned_by = $2,
          notes = coalesce(notes,'') || case when $3 is not null then E'\\n' || $3 else '' end
      where id = $4
      returning equipment_asset_id
      `,
      [input.returnDate ?? null, ctx.platformUserId, input.notes ?? null, input.equipmentAssignmentId],
    );

    if (!res.rows.length) throw new Error("not_found:equipment_assignment");

    await tx.query(
      `
      update public.equipment_assets
      set asset_status = 'in_stock'
      where id = $1
      `,
      [res.rows[0].equipment_asset_id],
    );

    await writeAuditLog(tx, {
      tenantId: input.tenantId,
      entityId: input.entityId ?? undefined,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "inventory",
      actionCode: "asset.return",
      targetTable: "equipment_assignments",
      targetRecordId: input.equipmentAssignmentId,
      newValues: input,
    });

    return {
      success: true,
      message: "Asset returned successfully.",
      data: { equipmentAssignmentId: input.equipmentAssignmentId },
      correlationId: ctx.correlationId,
    };
  });
}
