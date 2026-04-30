#!/usr/bin/env node
/**
 * Smoke: shared tenant cookie resolution (must match lib/context/watchman-active-tenant.ts).
 * Run: node scripts/smoke-tenant-workspace.mjs
 */

const WATCHMAN_ACTIVE_TENANT_COOKIE = "wm.active_tenant_id";

function resolveActiveTenantId({ cookieValue, eligibleTenantIds }) {
  const ids = eligibleTenantIds;
  if (!ids.length) return null;
  const raw = typeof cookieValue === "string" ? cookieValue.trim() : "";
  if (raw && ids.includes(raw)) return raw;
  return ids[0] ?? null;
}

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

function main() {
  assert(
    resolveActiveTenantId({ cookieValue: null, eligibleTenantIds: [] }) === null,
    "empty eligible → null",
  );
  const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  assert(
    resolveActiveTenantId({ cookieValue: b, eligibleTenantIds: [a, b] }) === b,
    "valid cookie picks that tenant",
  );
  assert(
    resolveActiveTenantId({ cookieValue: "not-a-member", eligibleTenantIds: [a, b] }) === a,
    "invalid cookie falls back to first",
  );
  assert(
    resolveActiveTenantId({ cookieValue: `  ${a}  `, eligibleTenantIds: [a, b] }) === a,
    "trimmed cookie matches",
  );
  console.log("PASS smoke-tenant-workspace:", WATCHMAN_ACTIVE_TENANT_COOKIE, "(4 assertions)");
}

main();
