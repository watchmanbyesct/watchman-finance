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

const SeedPack007Schema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
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

type Pack007CategorySeed = { code: string; name: string };
type Pack007ItemSeed = {
  code: string;
  name: string;
  categoryCode: string;
  typeCode: "service" | "product" | "fee";
  billingMethod: "hourly" | "flat_fee" | "quantity";
  unitPrice: number;
};

const PACK007_CATEGORIES: Pack007CategorySeed[] = [
  { code: "SRV", name: "Services" },
  { code: "PRD", name: "Products" },
  { code: "FEE", name: "Fees" },
];

const PACK007_ITEMS: Pack007ItemSeed[] = [
  {
    code: "SEC-GUARD-HR",
    name: "Security Guard Hourly",
    categoryCode: "SRV",
    typeCode: "service",
    billingMethod: "hourly",
    unitPrice: 45,
  },
  {
    code: "PATROL-VISIT",
    name: "Mobile Patrol Visit",
    categoryCode: "SRV",
    typeCode: "service",
    billingMethod: "flat_fee",
    unitPrice: 120,
  },
  {
    code: "BODYCAM-UNIT",
    name: "Bodycam Unit",
    categoryCode: "PRD",
    typeCode: "product",
    billingMethod: "quantity",
    unitPrice: 299,
  },
];

/**
 * Seed Pack 007 starter data (catalog + billing):
 * categories, items, prices, billing rules, and billable candidates.
 * Requires both module entitlements and all related Pack 013 permissions.
 */
export async function seedPack007CatalogBilling(
  input: z.infer<typeof SeedPack007Schema>,
): Promise<
  ActionResult<{
    categories: number;
    items: number;
    prices: number;
    rules: number;
    candidates: number;
  }>
> {
  try {
    const v = SeedPack007Schema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requireModuleEntitlement(ctx, "catalog");
    requireModuleEntitlement(ctx, "billing");
    requirePermission(ctx, "catalog.category.manage");
    requirePermission(ctx, "catalog.item.manage");
    requirePermission(ctx, "catalog.price.manage");
    requirePermission(ctx, "billing.rule.manage");
    requirePermission(ctx, "billing.candidate.manage");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();

    const { data: existingCategories, error: catReadError } = await admin
      .from("catalog_item_categories")
      .select("id, category_code")
      .eq("tenant_id", v.tenantId)
      .eq("entity_id", v.entityId);
    if (catReadError) throw new Error(catReadError.message);

    const existingCategoryCode = new Set(
      (existingCategories ?? []).map((c: { category_code: string }) => c.category_code),
    );
    const categoryInserts = PACK007_CATEGORIES.filter((c) => !existingCategoryCode.has(c.code)).map((c) => ({
      tenant_id: v.tenantId,
      entity_id: v.entityId,
      category_code: c.code,
      category_name: c.name,
      status: "active",
    }));
    if (categoryInserts.length) {
      const { error } = await admin.from("catalog_item_categories").insert(categoryInserts);
      if (error) throw new Error(error.message);
    }

    const { data: allCategories, error: allCatError } = await admin
      .from("catalog_item_categories")
      .select("id, category_code")
      .eq("tenant_id", v.tenantId)
      .eq("entity_id", v.entityId);
    if (allCatError) throw new Error(allCatError.message);
    const categoryIdByCode = new Map(
      (allCategories ?? []).map((c: { id: string; category_code: string }) => [c.category_code, c.id]),
    );

    const { data: typeRows, error: typeError } = await admin
      .from("catalog_item_types")
      .select("id, type_code")
      .is("tenant_id", null);
    if (typeError) throw new Error(typeError.message);
    const typeIdByCode = new Map(
      (typeRows ?? []).map((t: { id: string; type_code: string }) => [t.type_code, t.id]),
    );

    const { data: existingItems, error: itemReadError } = await admin
      .from("catalog_items")
      .select("id, item_code")
      .eq("tenant_id", v.tenantId);
    if (itemReadError) throw new Error(itemReadError.message);
    const existingItemCode = new Set(
      (existingItems ?? []).map((i: { item_code: string }) => i.item_code),
    );

    const itemInserts = PACK007_ITEMS.filter((i) => !existingItemCode.has(i.code)).map((i) => ({
      tenant_id: v.tenantId,
      entity_id: v.entityId,
      item_code: i.code,
      item_name: i.name,
      category_id: categoryIdByCode.get(i.categoryCode) ?? null,
      item_type_id: typeIdByCode.get(i.typeCode) ?? null,
      billing_method: i.billingMethod,
      unit_of_measure: "each",
      is_taxable: false,
      is_active: true,
      source_system_key: "pack007_seed",
      source_record_id: i.code,
    }));
    if (itemInserts.length) {
      const { error } = await admin.from("catalog_items").insert(itemInserts);
      if (error) throw new Error(error.message);
    }

    const { data: allItems, error: allItemsError } = await admin
      .from("catalog_items")
      .select("id, item_code")
      .eq("tenant_id", v.tenantId);
    if (allItemsError) throw new Error(allItemsError.message);
    const itemIdByCode = new Map(
      (allItems ?? []).map((i: { id: string; item_code: string }) => [i.item_code, i.id]),
    );

    const { data: existingPrices, error: prError } = await admin
      .from("catalog_item_prices")
      .select("catalog_item_id, price_name, effective_start_date")
      .eq("tenant_id", v.tenantId);
    if (prError) throw new Error(prError.message);
    const priceKey = new Set(
      (existingPrices ?? []).map(
        (p: { catalog_item_id: string; price_name: string; effective_start_date: string }) =>
          `${p.catalog_item_id}::${p.price_name}::${p.effective_start_date}`,
      ),
    );

    const priceInserts = PACK007_ITEMS.flatMap((i) => {
      const itemId = itemIdByCode.get(i.code);
      if (!itemId) return [];
      const key = `${itemId}::Standard::2026-01-01`;
      if (priceKey.has(key)) return [];
      return [
        {
          tenant_id: v.tenantId,
          entity_id: v.entityId,
          catalog_item_id: itemId,
          price_name: "Standard",
          unit_price: i.unitPrice,
          effective_start_date: "2026-01-01",
          status: "active",
        },
      ];
    });
    if (priceInserts.length) {
      const { error } = await admin.from("catalog_item_prices").insert(priceInserts);
      if (error) throw new Error(error.message);
    }

    const ruleTemplates = [
      {
        rule_code: "RULE-GUARD-HOURLY",
        rule_name: "Guard Hourly Billing",
        catalog_item_id: itemIdByCode.get("SEC-GUARD-HR") ?? null,
        billing_trigger: "shift_completed",
        billing_frequency: "event_driven",
      },
      {
        rule_code: "RULE-PATROL-WEEKLY",
        rule_name: "Patrol Weekly Billing",
        catalog_item_id: itemIdByCode.get("PATROL-VISIT") ?? null,
        billing_trigger: "scheduled_post",
        billing_frequency: "weekly",
      },
    ];
    const { data: existingRules, error: erError } = await admin
      .from("billing_rules")
      .select("rule_code")
      .eq("tenant_id", v.tenantId);
    if (erError) throw new Error(erError.message);
    const existingRuleCode = new Set(
      (existingRules ?? []).map((r: { rule_code: string }) => r.rule_code),
    );
    const ruleInserts = ruleTemplates
      .filter((r) => !existingRuleCode.has(r.rule_code))
      .map((r) => ({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        rule_code: r.rule_code,
        rule_name: r.rule_name,
        catalog_item_id: r.catalog_item_id,
        billing_trigger: r.billing_trigger,
        billing_frequency: r.billing_frequency,
        rate_source: "catalog",
        status: "active",
      }));
    if (ruleInserts.length) {
      const { error } = await admin.from("billing_rules").insert(ruleInserts);
      if (error) throw new Error(error.message);
    }

    const candidateTemplates = [
      {
        source_table: "service_events",
        source_record_id: "seed-evt-001",
        catalog_item_id: itemIdByCode.get("SEC-GUARD-HR") ?? null,
        quantity: 8,
        candidate_rate: 45,
        candidate_amount: 360,
        candidate_date: "2026-01-05",
      },
      {
        source_table: "service_events",
        source_record_id: "seed-evt-002",
        catalog_item_id: itemIdByCode.get("PATROL-VISIT") ?? null,
        quantity: 1,
        candidate_rate: 120,
        candidate_amount: 120,
        candidate_date: "2026-01-06",
      },
    ];
    const { data: existingCandidates, error: ecError } = await admin
      .from("billable_event_candidates")
      .select("source_table, source_record_id")
      .eq("tenant_id", v.tenantId);
    if (ecError) throw new Error(ecError.message);
    const existingCandidateKey = new Set(
      (existingCandidates ?? []).map(
        (c: { source_table: string; source_record_id: string }) =>
          `${c.source_table}::${c.source_record_id}`,
      ),
    );
    const candidateInserts = candidateTemplates
      .filter((c) => !existingCandidateKey.has(`${c.source_table}::${c.source_record_id}`))
      .map((c) => ({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        source_table: c.source_table,
        source_record_id: c.source_record_id,
        catalog_item_id: c.catalog_item_id,
        quantity: c.quantity,
        candidate_rate: c.candidate_rate,
        candidate_amount: c.candidate_amount,
        candidate_status: "pending",
        candidate_date: c.candidate_date,
        notes: "Seeded by Pack 007 helper",
      }));
    if (candidateInserts.length) {
      const { error } = await admin.from("billable_event_candidates").insert(candidateInserts);
      if (error) throw new Error(error.message);
    }

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "catalog",
      actionCode: "pack007.seed",
      targetTable: "catalog_items",
      newValues: {
        categories: categoryInserts.length,
        items: itemInserts.length,
        prices: priceInserts.length,
        rules: ruleInserts.length,
        candidates: candidateInserts.length,
      },
    });

    return {
      success: true,
      message: `Pack 007 seeded (categories:${categoryInserts.length}, items:${itemInserts.length}, prices:${priceInserts.length}, rules:${ruleInserts.length}, candidates:${candidateInserts.length}).`,
      data: {
        categories: categoryInserts.length,
        items: itemInserts.length,
        prices: priceInserts.length,
        rules: ruleInserts.length,
        candidates: candidateInserts.length,
      },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
