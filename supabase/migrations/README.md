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
```

## How to Run

### Option A — Supabase CLI (recommended)
```bash
npx supabase db push --project-ref YOUR_PROJECT_REF
```

### Option B — Supabase Dashboard
Paste each file into the SQL Editor in the Supabase Dashboard in order.

## After Migration

Run the bootstrap script to seed the EST Holdings tenant and admin user:

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
- [ ] `tenant_module_entitlements` table exists
- [ ] `account_categories` table exists and seeded
- [ ] `accounts` table exists
- [ ] `fiscal_periods` table exists
- [ ] `audit_logs` table exists
- [ ] RLS is enabled and cross-tenant access is blocked

Do not continue to Pack 002 until Pack 001 passes all checks.
