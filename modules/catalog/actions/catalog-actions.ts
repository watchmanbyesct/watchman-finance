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

const CreateCatalogCategorySchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().nullable().optional(),
  categoryCode: z.string().min(1).max(64),
  categoryName: z.string().min(1).max(255),
});

/** Permission: catalog.category.manage */
export async function createCatalogCategory(
  input: z.infer<typeof CreateCatalogCategorySchema>
): Promise<ActionResult<{ categoryId: string }>> {
  try {
    const v = CreateCatalogCategorySchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "catalog");
    requirePermission(ctx, "catalog.category.manage");
    requireOptionalEntityScope(ctx, v.entityId ?? null);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("catalog_item_categories")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId ?? null,
        category_code: v.categoryCode,
        category_name: v.categoryName,
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "catalog",
      actionCode: "catalog.category.create",
      targetTable: "catalog_item_categories",
      targetRecordId: row.id,
      newValues: { categoryCode: v.categoryCode },
    });

    return { success: true, message: "Category created.", data: { categoryId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateCatalogItemSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().nullable().optional(),
  itemCode: z.string().min(1).max(64),
  itemName: z.string().min(1).max(255),
  description: z.string().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  itemTypeCode: z.enum(["service", "product", "fee", "bundle", "adjustment", "discount"]).default("service"),
  billingMethod: z.enum([
    "hourly", "flat_fee", "per_visit", "per_incident", "recurring_monthly", "quantity",
  ]).default("flat_fee"),
});

/** Permission: catalog.item.manage */
export async function createCatalogItem(
  input: z.infer<typeof CreateCatalogItemSchema>
): Promise<ActionResult<{ catalogItemId: string }>> {
  try {
    const v = CreateCatalogItemSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "catalog");
    requirePermission(ctx, "catalog.item.manage");
    requireOptionalEntityScope(ctx, v.entityId ?? null);

    const admin = createSupabaseAdminClient();

    const { data: typeRow } = await admin
      .from("catalog_item_types")
      .select("id")
      .is("tenant_id", null)
      .eq("type_code", v.itemTypeCode)
      .maybeSingle();

    const { data: row, error } = await admin
      .from("catalog_items")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId ?? null,
        item_code: v.itemCode,
        item_name: v.itemName,
        description: v.description ?? null,
        category_id: v.categoryId ?? null,
        item_type_id: typeRow?.id ?? null,
        billing_method: v.billingMethod,
        unit_of_measure: "each",
        is_taxable: false,
        is_active: true,
        source_system_key: "manual",
        source_record_id: null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "catalog",
      actionCode: "catalog.item.create",
      targetTable: "catalog_items",
      targetRecordId: row.id,
      newValues: { itemCode: v.itemCode },
    });

    return { success: true, message: "Catalog item created.", data: { catalogItemId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateCatalogItemPriceSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().nullable().optional(),
  catalogItemId: z.string().uuid(),
  priceName: z.string().min(1).max(120),
  unitPrice: z.number(),
  effectiveStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Permission: catalog.price.manage */
export async function createCatalogItemPrice(
  input: z.infer<typeof CreateCatalogItemPriceSchema>
): Promise<ActionResult<{ priceId: string }>> {
  try {
    const v = CreateCatalogItemPriceSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "catalog");
    requirePermission(ctx, "catalog.price.manage");
    requireOptionalEntityScope(ctx, v.entityId ?? null);

    const admin = createSupabaseAdminClient();

    const { data: item, error: ie } = await admin
      .from("catalog_items")
      .select("id")
      .eq("id", v.catalogItemId)
      .eq("tenant_id", v.tenantId)
      .single();

    if (ie || !item) {
      return { success: false, message: "Catalog item not found for this tenant." };
    }

    const { data: row, error } = await admin
      .from("catalog_item_prices")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId ?? null,
        catalog_item_id: v.catalogItemId,
        price_name: v.priceName,
        unit_price: v.unitPrice,
        effective_start_date: v.effectiveStartDate,
        effective_end_date: v.effectiveEndDate ?? null,
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "catalog",
      actionCode: "catalog.price.create",
      targetTable: "catalog_item_prices",
      targetRecordId: row.id,
      newValues: { catalogItemId: v.catalogItemId, priceName: v.priceName },
    });

    return { success: true, message: "Price row created.", data: { priceId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
