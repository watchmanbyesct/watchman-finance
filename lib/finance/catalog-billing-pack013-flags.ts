/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { hasPermission } from "@/lib/permissions/require-permission";

/** Matches server actions in catalog-actions / billing-actions (Pack 013 permission codes + module entitlements). */
export type CatalogBillingPack013Flags = {
  catalogModule: boolean;
  billingModule: boolean;
  canManageCategories: boolean;
  canManageItems: boolean;
  canManagePrices: boolean;
  canManageBillingRules: boolean;
  canManageCandidates: boolean;
  canResolveBillingExceptions: boolean;
};

const DENIED: CatalogBillingPack013Flags = {
  catalogModule: false,
  billingModule: false,
  canManageCategories: false,
  canManageItems: false,
  canManagePrices: false,
  canManageBillingRules: false,
  canManageCandidates: false,
  canResolveBillingExceptions: false,
};

/**
 * Resolves which catalog/billing mutations the current user may attempt for this tenant.
 * Used to gate client forms; server actions still enforce the same checks.
 */
export async function getCatalogBillingPack013Flags(
  tenantId: string,
): Promise<CatalogBillingPack013Flags> {
  try {
    const ctx = await resolveRequestContext(tenantId);
    const cat = ctx.moduleEntitlements.includes("catalog");
    const bill = ctx.moduleEntitlements.includes("billing");
    return {
      catalogModule: cat,
      billingModule: bill,
      canManageCategories: cat && hasPermission(ctx, "catalog.category.manage"),
      canManageItems: cat && hasPermission(ctx, "catalog.item.manage"),
      canManagePrices: cat && hasPermission(ctx, "catalog.price.manage"),
      canManageBillingRules: bill && hasPermission(ctx, "billing.rule.manage"),
      canManageCandidates: bill && hasPermission(ctx, "billing.candidate.manage"),
      canResolveBillingExceptions: bill && hasPermission(ctx, "billing.rule.manage"),
    };
  } catch {
    return DENIED;
  }
}
