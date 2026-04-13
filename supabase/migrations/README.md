# Watchman Finance — Supabase Migrations

## Migration Order

Run all migrations in strict sequence. Do not skip or reorder.

```
001_watchman_finance_foundation.sql
002_watchman_finance_integration_staging.sql
003_watchman_finance_ar_ap_core.sql
004_watchman_finance_payroll_core.sql
005_watchman_finance_leave_accruals.sql
006_watchman_finance_banking_reconciliation.sql
007_watchman_finance_catalog_billing.sql
008_watchman_finance_inventory_assets.sql
009_watchman_finance_reporting_dashboards.sql
010_watchman_finance_budgeting_forecasting.sql
011_watchman_finance_consolidation_commercial_readiness.sql
012_watchman_finance_hardening_qa_prod_readiness.sql
013_watchman_finance_module_permissions_entitlements.sql
014_watchman_finance_tax_collections_recurring.sql
015_watchman_finance_tax_ar_ap_extension_permissions.sql
016_watchman_finance_gl_journal_posting.sql
017_watchman_finance_subledger_gl_pipeline_reporting.sql
018_watchman_finance_gl_reversals_ap_subledger.sql
019_watchman_finance_evidence_documents.sql
020_watchman_finance_approval_requests.sql
021_watchman_finance_trial_balance_snapshots.sql
022_watchman_finance_api_idempotency_webhooks.sql
023_watchman_finance_workflow_permissions_019_022.sql
024_watchman_finance_qbo_oauth_pack002.sql
```

## How to Run

### Option A — Supabase CLI (recommended)
```bash
npx supabase db push --project-ref YOUR_PROJECT_REF
```

### Option B — Supabase Dashboard
Paste each file into the SQL Editor in the Supabase Dashboard in order.

## After Migration

Run the bootstrap script to seed the ESCT Holdings tenant and admin user:

```bash
npm run greenfield:bootstrap -- \
  --email=oshepard@esctroc.com \
  --password='YourPassword!' \
  --name='Owens Shepard'
```

## Validation Checklist (Pack 001)

After running Pack 001, verify in the Supabase Dashboard:

- [ ] `tenants` table exists
- [ ] `entities` table exists
- [ ] `platform_users` table exists
- [ ] `tenant_memberships` table exists
- [ ] `roles` table exists and seeded
- [ ] `permissions` table exists and seeded
- [ ] `role_permissions` links tenant admin roles to permissions (bootstrap Step 8b)
- [ ] `user_entity_scopes` grants entity access where required (bootstrap seeds default entity)
- [ ] `tenant_module_entitlements` table exists
- [ ] `account_categories` table exists and seeded
- [ ] `accounts` table exists
- [ ] `fiscal_periods` table exists
- [ ] `fiscal_period_closures` table exists (used when closing periods)
- [ ] `audit_logs` table exists
- [ ] RLS is enabled and cross-tenant access is blocked

Do not continue to Pack 002 until Pack 001 passes all checks.

## Validation Checklist (Pack 002)

After `002_watchman_finance_integration_staging.sql`:

- [ ] `integration_systems` seeded (Launch, Operations, Finance, QuickBooks)
- [ ] `staged_employees`, `staged_time_entries`, and related staging tables exist
- [ ] `finance_people` exists (depends on `branches` / `departments` / `locations` stubs in the same migration)
- [ ] `public.has_active_tenant_membership` and `public.has_entity_scope` exist (used by RLS policies)
- [ ] API routes `POST /api/integrations/launch/employees` and `POST /api/integrations/operations/approved-time` succeed against staging tables

### Already applied Pack 001 manually?

If the database existed before this repo gained `001_watchman_finance_foundation.sql`, diff your live schema against that file, then run `npm run greenfield:bootstrap` again (idempotent) to backfill `user_entity_scopes`, `role_permissions`, and the `user.scope_assign` permission where missing.
