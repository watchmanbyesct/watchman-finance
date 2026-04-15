/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

// ── Auth ──────────────────────────────────────────────────────────────────────
export { requireAuthSession, getAuthSession } from "./auth/resolve-session";
export { verifyIntegrationRequest } from "./auth/verify-integration-request";

// ── Database ──────────────────────────────────────────────────────────────────
export { createSupabaseServerClient, createSupabaseAdminClient } from "./db/supabase-server";

// ── Context ───────────────────────────────────────────────────────────────────
export { resolveRequestContext } from "./context/resolve-request-context";
export type { RequestContext } from "./context/resolve-request-context";

// ── Permissions ───────────────────────────────────────────────────────────────
export {
  requirePermission,
  hasPermission,
  requireEntityScope,
  requireModuleEntitlement,
} from "./permissions/require-permission";

// ── Audit ─────────────────────────────────────────────────────────────────────
export { writeAuditLog } from "./audit/write-audit-log";
export type { AuditLogPayload } from "./audit/write-audit-log";

// ── Errors ────────────────────────────────────────────────────────────────────
export { mapErrorToResult } from "./errors/app-error";
export type { ActionResult, FinanceError, FinanceErrorCode } from "./errors/app-error";

// ── Validation ────────────────────────────────────────────────────────────────
export {
  parseInput,
  validateInput,
  TenantEntitySchema,
  UUIDSchema,
  DateStringSchema,
  CurrencyAmountSchema,
  CurrencyCodeSchema,
} from "./validation/parse-input";

// ── Formatting ────────────────────────────────────────────────────────────────
export {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatDateShort,
  formatPercent,
  todayISO,
  dateBefore,
} from "./formatting/currency-date";

// ── Feature Flags ─────────────────────────────────────────────────────────────
export { getTenantFlag, getTenantFlags } from "./feature-flags/get-tenant-flag";
