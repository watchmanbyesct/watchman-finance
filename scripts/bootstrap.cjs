#!/usr/bin/env node
/**
 * Watchman Finance — Greenfield Bootstrap Script
 * -----------------------------------------------
 * Usage:
 *   npm run greenfield:bootstrap -- \
 *     --email=you@example.com \
 *     --password='YourPassword!' \
 *     --name='Your Name'
 *
 * What this script does (in strict order per Pack 001):
 *   1. Parse and validate CLI arguments
 *   2. Verify Supabase connection
 *   3. Create the bootstrap admin user in Supabase Auth
 *   4. Create the platform_user record
 *   5. Create the EST Holdings tenant
 *   6. Create the ESCT entity under the tenant
 *   7. Create the tenant membership for the admin user
 *   8. Seed system roles
 *   9. Seed system permissions
 *  10. Assign tenant_owner role to the bootstrap user
 *  11. Seed module entitlements (all modules enabled for ESCT)
 *  12. Seed account categories
 *  13. Print summary and next steps
 *
 * Requirements:
 *   - .env.local must exist with NEXT_PUBLIC_SUPABASE_URL and
 *     SUPABASE_SERVICE_ROLE_KEY set.
 *   - Pack 001 SQL migration must already be applied to the Supabase project.
 */

"use strict";

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ── Load environment ──────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    fatal(
      ".env.local not found.\n" +
      "Copy .env.example to .env.local and fill in your Supabase credentials."
    );
  }
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

// ── CLI argument parser ───────────────────────────────────────────────────────
function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--")) {
      const [key, ...rest] = arg.slice(2).split("=");
      args[key] = rest.join("=");
    }
  }
  return args;
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function fatal(msg) {
  console.error("\n[BOOTSTRAP FAILED]\n" + msg + "\n");
  process.exit(1);
}

function log(msg) {
  console.log("  " + msg);
}

function section(title) {
  console.log("\n── " + title + " " + "─".repeat(Math.max(0, 60 - title.length)));
}

function newUUID() {
  return crypto.randomUUID();
}

// ── Seed constants ────────────────────────────────────────────────────────────
const SYSTEM_ROLES = [
  { code: "tenant_owner",        name: "Tenant Owner",         description: "Full access to the tenant." },
  { code: "finance_admin",       name: "Finance Admin",        description: "Full finance module access." },
  { code: "controller",          name: "Controller",           description: "GL, close, reporting access." },
  { code: "bookkeeper",          name: "Bookkeeper",           description: "AR, AP, basic GL access." },
  { code: "payroll_admin",       name: "Payroll Admin",        description: "Payroll and leave module access." },
  { code: "billing_specialist",  name: "Billing Specialist",   description: "Invoicing and AR access." },
  { code: "executive_viewer",    name: "Executive Viewer",     description: "Read-only reporting access." },
  { code: "inventory_manager",   name: "Inventory Manager",    description: "Inventory and asset access." },
  { code: "employee_self_service", name: "Employee Self-Service", description: "Pay stub and leave request access." },
];

const SYSTEM_PERMISSIONS = [
  "tenant.read", "tenant.update",
  "entity.create", "entity.update",
  "gl.account.manage", "gl.period.close", "gl.period.reopen",
  "journal.post", "journal.reverse",
  "ar.invoice.create", "ar.invoice.issue", "ar.invoice.void",
  "ar.payment.apply",
  "ap.bill.create", "ap.bill.approve", "ap.payment.release",
  "payroll.run.create", "payroll.run.calculate", "payroll.run.approve",
  "payroll.run.finalize", "payroll.ach.generate",
  "leave.policy.manage", "leave.request.approve",
  "banking.account.manage", "banking.reconciliation.close",
  "tax.profile.manage", "tax.liability.record",
  "inventory.item.manage", "inventory.adjustment.post",
  "report.read_standard", "report.read_executive",
  "audit.read",
  "user.role_assign", "user.invite",
  "module.entitlement.manage",
];

const MODULE_KEYS = [
  "finance_core", "ar", "ap", "payroll", "leave",
  "banking", "catalog", "billing", "inventory",
  "reporting", "budgeting", "forecasting",
];

const ACCOUNT_CATEGORIES = [
  { code: "assets_current",      name: "Current Assets",          category_type: "asset",     normal_balance: "debit"  },
  { code: "assets_fixed",        name: "Fixed Assets",            category_type: "asset",     normal_balance: "debit"  },
  { code: "liabilities_current", name: "Current Liabilities",     category_type: "liability", normal_balance: "credit" },
  { code: "liabilities_lt",      name: "Long-Term Liabilities",   category_type: "liability", normal_balance: "credit" },
  { code: "equity",              name: "Equity",                  category_type: "equity",    normal_balance: "credit" },
  { code: "revenue",             name: "Revenue",                 category_type: "revenue",   normal_balance: "credit" },
  { code: "cogs",                name: "Cost of Goods Sold",      category_type: "expense",   normal_balance: "debit"  },
  { code: "operating_expense",   name: "Operating Expenses",      category_type: "expense",   normal_balance: "debit"  },
  { code: "payroll_expense",     name: "Payroll Expenses",        category_type: "expense",   normal_balance: "debit"  },
  { code: "other_income",        name: "Other Income",            category_type: "revenue",   normal_balance: "credit" },
  { code: "other_expense",       name: "Other Expenses",          category_type: "expense",   normal_balance: "debit"  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║       WATCHMAN FINANCE — GREENFIELD BOOTSTRAP               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  loadEnv();
  const args = parseArgs();

  // Validate required args
  const email    = args.email    || process.env.BOOTSTRAP_EMAIL;
  const password = args.password || process.env.BOOTSTRAP_PASSWORD;
  const name     = args.name     || process.env.BOOTSTRAP_NAME;

  if (!email)    fatal("--email is required.");
  if (!password) fatal("--password is required.");
  if (!name)     fatal("--name is required.");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) fatal("NEXT_PUBLIC_SUPABASE_URL is not set in .env.local");
  if (!serviceKey)  fatal("SUPABASE_SERVICE_ROLE_KEY is not set in .env.local");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Step 1: Verify connection ─────────────────────────────────────────────
  section("Step 1. Verifying Supabase connection");
  const { error: pingError } = await admin.from("tenants").select("id").limit(1);
  if (pingError && pingError.code !== "PGRST116") {
    fatal(
      "Cannot connect to Supabase or the Pack 001 migration has not been applied.\n" +
      "Error: " + pingError.message + "\n\n" +
      "Run your Pack 001 migration first:\n" +
      "  npx supabase db push --project-ref YOUR_PROJECT_REF"
    );
  }
  log("Connected. Pack 001 schema detected.");

  // ── Step 2: Create auth user ──────────────────────────────────────────────
  section("Step 2. Creating bootstrap admin user");
  let authUserId;

  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u) => u.email === email);

  if (existing) {
    authUserId = existing.id;
    log(`Auth user already exists: ${email} (${authUserId})`);
  } else {
    const { data: newUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (authError) fatal("Failed to create auth user: " + authError.message);
    authUserId = newUser.user.id;
    log(`Auth user created: ${email} (${authUserId})`);
  }

  // ── Step 3: Create platform_user ─────────────────────────────────────────
  section("Step 3. Creating platform user record");
  let platformUserId;

  const { data: existingPU } = await admin
    .from("platform_users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();

  if (existingPU) {
    platformUserId = existingPU.id;
    log(`Platform user already exists (${platformUserId})`);
  } else {
    const { data: puData, error: puError } = await admin
      .from("platform_users")
      .insert({ auth_user_id: authUserId, full_name: name, email, status: "active" })
      .select("id")
      .single();
    if (puError) fatal("Failed to create platform_user: " + puError.message);
    platformUserId = puData.id;
    log(`Platform user created (${platformUserId})`);
  }

  // ── Step 4: Create tenant ─────────────────────────────────────────────────
  section("Step 4. Creating EST Holdings tenant");
  let tenantId;

  const { data: existingTenant } = await admin
    .from("tenants")
    .select("id")
    .eq("slug", "est-holdings")
    .single();

  if (existingTenant) {
    tenantId = existingTenant.id;
    log(`Tenant already exists: est-holdings (${tenantId})`);
  } else {
    const { data: tenantData, error: tenantError } = await admin
      .from("tenants")
      .insert({
        slug: "est-holdings",
        legal_name: "EST Holdings",
        display_name: "EST Holdings",
        timezone: "America/New_York",
        status: "active",
      })
      .select("id")
      .single();
    if (tenantError) fatal("Failed to create tenant: " + tenantError.message);
    tenantId = tenantData.id;
    log(`Tenant created: EST Holdings (${tenantId})`);
  }

  // ── Step 5: Create ESCT entity ────────────────────────────────────────────
  section("Step 5. Creating ESCT entity");
  let entityId;

  const { data: existingEntity } = await admin
    .from("entities")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("code", "ESCT")
    .single();

  if (existingEntity) {
    entityId = existingEntity.id;
    log(`Entity already exists: ESCT (${entityId})`);
  } else {
    const { data: entityData, error: entityError } = await admin
      .from("entities")
      .insert({
        tenant_id: tenantId,
        code: "ESCT",
        legal_name: "Enterprise Security Consulting and Training Inc.",
        display_name: "ESCT",
        entity_type: "operating_company",
        base_currency: "USD",
        status: "active",
      })
      .select("id")
      .single();
    if (entityError) fatal("Failed to create entity: " + entityError.message);
    entityId = entityData.id;
    log(`Entity created: ESCT (${entityId})`);
  }

  // ── Step 6: Create tenant membership ─────────────────────────────────────
  section("Step 6. Creating tenant membership for bootstrap admin");
  const { error: memberError } = await admin
    .from("tenant_memberships")
    .upsert(
      {
        tenant_id: tenantId,
        platform_user_id: platformUserId,
        membership_status: "active",
        default_entity_id: entityId,
        joined_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,platform_user_id" }
    );
  if (memberError) fatal("Failed to create membership: " + memberError.message);
  log("Tenant membership confirmed.");

  // ── Step 7: Seed roles ────────────────────────────────────────────────────
  section("Step 7. Seeding system roles");
  for (const role of SYSTEM_ROLES) {
    const { error } = await admin.from("roles").upsert(
      { tenant_id: tenantId, code: role.code, name: role.name, description: role.description, is_system: true },
      { onConflict: "tenant_id,code" }
    );
    if (error) log(`  WARNING: role seed failed for ${role.code}: ${error.message}`);
    else log(`Role seeded: ${role.code}`);
  }

  // ── Step 8: Seed permissions ──────────────────────────────────────────────
  section("Step 8. Seeding system permissions");
  for (const perm of SYSTEM_PERMISSIONS) {
    const { error } = await admin.from("permissions").upsert(
      { code: perm, name: perm, is_system: true },
      { onConflict: "code" }
    );
    if (error) log(`  WARNING: permission seed failed for ${perm}: ${error.message}`);
  }
  log(`${SYSTEM_PERMISSIONS.length} permissions seeded.`);

  // ── Step 9: Assign tenant_owner role ─────────────────────────────────────
  section("Step 9. Assigning tenant_owner role to bootstrap admin");
  const { data: ownerRole } = await admin
    .from("roles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("code", "tenant_owner")
    .single();

  if (ownerRole) {
    const { error: raError } = await admin.from("user_role_assignments").upsert(
      { tenant_id: tenantId, platform_user_id: platformUserId, role_id: ownerRole.id, is_active: true },
      { onConflict: "tenant_id,platform_user_id,role_id" }
    );
    if (raError) log("  WARNING: role assignment failed: " + raError.message);
    else log("tenant_owner role assigned to bootstrap admin.");
  }

  // ── Step 10: Seed module entitlements ────────────────────────────────────
  section("Step 10. Enabling all finance modules for EST Holdings");
  for (const moduleKey of MODULE_KEYS) {
    const { error } = await admin.from("tenant_module_entitlements").upsert(
      { tenant_id: tenantId, module_key: moduleKey, is_enabled: true },
      { onConflict: "tenant_id,module_key" }
    );
    if (error) log(`  WARNING: module entitlement failed for ${moduleKey}: ${error.message}`);
  }
  log(`${MODULE_KEYS.length} modules enabled.`);

  // ── Step 11: Seed account categories ─────────────────────────────────────
  section("Step 11. Seeding account categories");
  for (const cat of ACCOUNT_CATEGORIES) {
    const { error } = await admin.from("account_categories").upsert(
      { tenant_id: tenantId, code: cat.code, name: cat.name, category_type: cat.category_type, normal_balance: cat.normal_balance, status: "active" },
      { onConflict: "tenant_id,code" }
    );
    if (error) log(`  WARNING: account category seed failed for ${cat.code}: ${error.message}`);
  }
  log(`${ACCOUNT_CATEGORIES.length} account categories seeded.`);

  // ── Step 12: Write audit log ──────────────────────────────────────────────
  section("Step 12. Writing bootstrap audit record");
  await admin.from("audit_logs").insert({
    tenant_id: tenantId,
    entity_id: entityId,
    actor_platform_user_id: platformUserId,
    module_key: "finance_core",
    action_code: "tenant.bootstrap",
    target_table: "tenants",
    target_record_id: tenantId,
    metadata_json: { bootstrapped_by: email, bootstrap_at: new Date().toISOString() },
    source_channel: "bootstrap_script",
    occurred_at: new Date().toISOString(),
  });
  log("Bootstrap audit record written.");

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║               BOOTSTRAP COMPLETE                            ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  console.log("  Tenant:         EST Holdings (est-holdings)");
  console.log("  Tenant ID:      " + tenantId);
  console.log("  Entity:         ESCT");
  console.log("  Entity ID:      " + entityId);
  console.log("  Admin:          " + name + " <" + email + ">");
  console.log("  Platform UID:   " + platformUserId);
  console.log("  Auth UID:       " + authUserId);
  console.log("  Roles seeded:   " + SYSTEM_ROLES.length);
  console.log("  Modules active: " + MODULE_KEYS.length);
  console.log("  Acct cats:      " + ACCOUNT_CATEGORIES.length);
  console.log("\n  Next steps:");
  console.log("  1. Run Pack 001 migration if not already applied:");
  console.log("     npx supabase db push --project-ref YOUR_REF");
  console.log("  2. Start the dev server:");
  console.log("     npm run dev");
  console.log("  3. Sign in at http://localhost:3000/login");
  console.log("     with " + email);
  console.log("");
}

main().catch((err) => {
  fatal(err?.message ?? String(err));
});
