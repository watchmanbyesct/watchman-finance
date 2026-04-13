"use server";

import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope, requireModuleEntitlement } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";
import { z } from "zod";

function requireOptionalEntityScope(ctx: Awaited<ReturnType<typeof resolveRequestContext>>, entityId: string | null | undefined) {
  if (entityId) requireEntityScope(ctx, entityId);
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function rowEntityMatches(rowEntityId: string | null | undefined, workspaceEntityId: string): boolean {
  return rowEntityId == null || rowEntityId === workspaceEntityId;
}

const CreateInventoryCategorySchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().nullable().optional(),
  categoryCode: z.string().min(1).max(64),
  categoryName: z.string().min(1).max(255),
  categoryType: z.enum(["inventory", "asset", "supply", "uniform", "equipment", "other"]).default("inventory"),
});

/** Permission: inventory.category.manage */
export async function createInventoryCategory(
  input: z.infer<typeof CreateInventoryCategorySchema>
): Promise<ActionResult<{ categoryId: string }>> {
  try {
    const v = CreateInventoryCategorySchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "inventory");
    requirePermission(ctx, "inventory.category.manage");
    requireOptionalEntityScope(ctx, v.entityId ?? null);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("inventory_categories")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId ?? null,
        category_code: v.categoryCode,
        category_name: v.categoryName,
        category_type: v.categoryType,
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "inventory",
      actionCode: "inventory.category.create",
      targetTable: "inventory_categories",
      targetRecordId: row.id,
      newValues: { categoryCode: v.categoryCode },
    });

    return { success: true, message: "Inventory category created.", data: { categoryId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateInventoryLocationSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().nullable().optional(),
  locationCode: z.string().min(1).max(64),
  locationName: z.string().min(1).max(255),
  locationType: z.enum(["warehouse", "office", "vehicle", "site", "other"]).default("warehouse"),
});

/** Permission: inventory.location.manage */
export async function createInventoryLocation(
  input: z.infer<typeof CreateInventoryLocationSchema>
): Promise<ActionResult<{ locationId: string }>> {
  try {
    const v = CreateInventoryLocationSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "inventory");
    requirePermission(ctx, "inventory.location.manage");
    requireOptionalEntityScope(ctx, v.entityId ?? null);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("inventory_locations")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId ?? null,
        location_code: v.locationCode,
        location_name: v.locationName,
        location_type: v.locationType,
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "inventory",
      actionCode: "inventory.location.create",
      targetTable: "inventory_locations",
      targetRecordId: row.id,
      newValues: { locationCode: v.locationCode },
    });

    return { success: true, message: "Location created.", data: { locationId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateInventoryItemSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().nullable().optional(),
  itemCode: z.string().min(1).max(64),
  itemName: z.string().min(1).max(255),
  description: z.string().optional(),
  inventoryCategoryId: z.string().uuid().nullable().optional(),
  catalogItemId: z.string().uuid().nullable().optional(),
  trackingMode: z.enum(["quantity", "serial", "asset"]).default("quantity"),
  unitOfMeasure: z.string().max(32).default("each"),
});

/** Permission: inventory.item.manage */
export async function createInventoryItem(
  input: z.infer<typeof CreateInventoryItemSchema>
): Promise<ActionResult<{ inventoryItemId: string }>> {
  try {
    const v = CreateInventoryItemSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "inventory");
    requirePermission(ctx, "inventory.item.manage");
    requireOptionalEntityScope(ctx, v.entityId ?? null);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("inventory_items")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId ?? null,
        item_code: v.itemCode,
        item_name: v.itemName,
        description: v.description ?? null,
        inventory_category_id: v.inventoryCategoryId ?? null,
        catalog_item_id: v.catalogItemId ?? null,
        tracking_mode: v.trackingMode,
        unit_of_measure: v.unitOfMeasure,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "inventory",
      actionCode: "inventory.item.create",
      targetTable: "inventory_items",
      targetRecordId: row.id,
      newValues: { itemCode: v.itemCode },
    });

    return { success: true, message: "Inventory item created.", data: { inventoryItemId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const ApplyInventoryStockReceiptSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  inventoryLocationId: z.string().uuid(),
  quantityReceived: z.number().positive(),
  unitCost: z.number().nonnegative().optional(),
});

/** Permission: inventory.item.manage */
export async function applyInventoryStockReceipt(
  input: z.infer<typeof ApplyInventoryStockReceiptSchema>
): Promise<ActionResult<{ balanceId: string }>> {
  try {
    const v = ApplyInventoryStockReceiptSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "inventory");
    requirePermission(ctx, "inventory.item.manage");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();

    const { data: item, error: ie } = await admin
      .from("inventory_items")
      .select("id, entity_id")
      .eq("id", v.inventoryItemId)
      .eq("tenant_id", v.tenantId)
      .single();

    if (ie || !item) return { success: false, message: "Inventory item not found." };
    if (!rowEntityMatches(item.entity_id as string | null, v.entityId)) {
      return { success: false, message: "Item is not in scope for this entity." };
    }

    const { data: loc, error: le } = await admin
      .from("inventory_locations")
      .select("id, entity_id")
      .eq("id", v.inventoryLocationId)
      .eq("tenant_id", v.tenantId)
      .single();

    if (le || !loc) return { success: false, message: "Inventory location not found." };
    if (!rowEntityMatches(loc.entity_id as string | null, v.entityId)) {
      return { success: false, message: "Location is not in scope for this entity." };
    }

    const valueDelta = roundMoney(v.quantityReceived * (v.unitCost ?? 0));

    const { data: existing, error: be } = await admin
      .from("inventory_stock_balances")
      .select("id, quantity_on_hand, quantity_available, total_value")
      .eq("tenant_id", v.tenantId)
      .eq("inventory_item_id", v.inventoryItemId)
      .eq("inventory_location_id", v.inventoryLocationId)
      .maybeSingle();

    if (be) throw new Error(be.message);

    if (existing) {
      const nextOn = roundMoney(Number(existing.quantity_on_hand) + v.quantityReceived);
      const nextAvail = roundMoney(Number(existing.quantity_available) + v.quantityReceived);
      const nextVal = roundMoney(Number(existing.total_value) + valueDelta);
      const { error: ue } = await admin
        .from("inventory_stock_balances")
        .update({
          quantity_on_hand: nextOn,
          quantity_available: nextAvail,
          total_value: nextVal,
        })
        .eq("id", existing.id);
      if (ue) throw new Error(ue.message);

      await writeAuditLog({
        tenantId: v.tenantId,
        entityId: v.entityId,
        actorPlatformUserId: ctx.platformUserId,
        moduleKey: "inventory",
        actionCode: "inventory.stock.receive",
        targetTable: "inventory_stock_balances",
        targetRecordId: existing.id,
        newValues: { quantityReceived: v.quantityReceived },
      });

      return { success: true, message: "Stock increased.", data: { balanceId: existing.id } };
    }

    const { data: inserted, error: insE } = await admin
      .from("inventory_stock_balances")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        inventory_item_id: v.inventoryItemId,
        inventory_location_id: v.inventoryLocationId,
        quantity_on_hand: v.quantityReceived,
        quantity_available: v.quantityReceived,
        quantity_reserved: 0,
        total_value: valueDelta,
      })
      .select("id")
      .single();

    if (insE) throw new Error(insE.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "inventory",
      actionCode: "inventory.stock.receive",
      targetTable: "inventory_stock_balances",
      targetRecordId: inserted.id,
      newValues: { quantityReceived: v.quantityReceived },
    });

    return { success: true, message: "Stock balance created.", data: { balanceId: inserted.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateEmployeeItemIssueSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  financePersonId: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  issueQuantity: z.number().positive(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  returnDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
});

/** Permission: inventory.item.manage */
export async function createEmployeeItemIssue(
  input: z.infer<typeof CreateEmployeeItemIssueSchema>
): Promise<ActionResult<{ issueId: string }>> {
  try {
    const v = CreateEmployeeItemIssueSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "inventory");
    requirePermission(ctx, "inventory.item.manage");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();

    const { data: person, error: pe } = await admin
      .from("finance_people")
      .select("id, entity_id")
      .eq("id", v.financePersonId)
      .eq("tenant_id", v.tenantId)
      .single();

    if (pe || !person) return { success: false, message: "Finance person not found." };
    if (!rowEntityMatches(person.entity_id as string | null, v.entityId)) {
      return { success: false, message: "Person is not in scope for this entity." };
    }

    const { data: item, error: ie } = await admin
      .from("inventory_items")
      .select("id, entity_id")
      .eq("id", v.inventoryItemId)
      .eq("tenant_id", v.tenantId)
      .single();

    if (ie || !item) return { success: false, message: "Inventory item not found." };
    if (!rowEntityMatches(item.entity_id as string | null, v.entityId)) {
      return { success: false, message: "Item is not in scope for this entity." };
    }

    const { data: row, error } = await admin
      .from("employee_item_issues")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        finance_person_id: v.financePersonId,
        inventory_item_id: v.inventoryItemId,
        issue_quantity: v.issueQuantity,
        issue_status: "issued",
        issue_date: v.issueDate ?? null,
        return_due_date: v.returnDueDate ?? null,
        issued_by: ctx.platformUserId,
        notes: v.notes ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "inventory",
      actionCode: "inventory.issue.create",
      targetTable: "employee_item_issues",
      targetRecordId: row.id,
      newValues: { issueQuantity: v.issueQuantity },
    });

    return { success: true, message: "Item issue recorded.", data: { issueId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const RegisterEquipmentAssetSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  assetTag: z.string().min(1).max(80),
  assetName: z.string().min(1).max(255),
  inventoryItemId: z.string().uuid().optional(),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  purchaseCost: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

/** Permission: inventory.item.manage */
export async function registerEquipmentAsset(
  input: z.infer<typeof RegisterEquipmentAssetSchema>
): Promise<ActionResult<{ equipmentAssetId: string }>> {
  try {
    const v = RegisterEquipmentAssetSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "inventory");
    requirePermission(ctx, "inventory.item.manage");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();

    if (v.inventoryItemId) {
      const { data: item, error: ie } = await admin
        .from("inventory_items")
        .select("id, entity_id")
        .eq("id", v.inventoryItemId)
        .eq("tenant_id", v.tenantId)
        .single();

      if (ie || !item) return { success: false, message: "Inventory item not found." };
      if (!rowEntityMatches(item.entity_id as string | null, v.entityId)) {
        return { success: false, message: "Item is not in scope for this entity." };
      }
    }

    const { data: row, error } = await admin
      .from("equipment_assets")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        inventory_item_id: v.inventoryItemId ?? null,
        asset_tag: v.assetTag,
        asset_name: v.assetName,
        asset_status: "in_stock",
        condition_status: "new",
        purchase_date: v.purchaseDate ?? null,
        purchase_cost: v.purchaseCost ?? null,
        notes: v.notes ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "inventory",
      actionCode: "inventory.asset.register",
      targetTable: "equipment_assets",
      targetRecordId: row.id,
      newValues: { assetTag: v.assetTag },
    });

    return { success: true, message: "Equipment asset registered.", data: { equipmentAssetId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
