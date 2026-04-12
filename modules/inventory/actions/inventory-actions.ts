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
