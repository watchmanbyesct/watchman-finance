/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import type { RequestContext } from "@/lib/context/resolve-request-context";

/**
 * Throws a typed forbidden error if the context lacks the required permission.
 * Call at the top of every server action that mutates data.
 */
export function requirePermission(
  ctx: RequestContext,
  permission: string
): void {
  if (!ctx.permissions.includes(permission)) {
    throw new Error(`forbidden:${permission}`);
  }
}

/**
 * Returns true if the context holds the permission. Does not throw.
 */
export function hasPermission(
  ctx: RequestContext,
  permission: string
): boolean {
  return ctx.permissions.includes(permission);
}

/**
 * Throws if the user does not have entity-level access to the given entity.
 */
export function requireEntityScope(
  ctx: RequestContext,
  entityId: string
): void {
  if (!ctx.entityIds.includes(entityId)) {
    throw new Error(`entity_scope_mismatch:${entityId}`);
  }
}

/**
 * Throws if a required finance module is not entitled for the tenant.
 */
export function requireModuleEntitlement(
  ctx: RequestContext,
  moduleKey: string
): void {
  if (!ctx.moduleEntitlements.includes(moduleKey)) {
    throw new Error(`module_not_entitled:${moduleKey}`);
  }
}
