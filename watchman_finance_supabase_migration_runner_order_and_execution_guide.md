# Watchman Finance Supabase Migration Runner Order and Execution Guide
## Packs 001 Through 012

## 1. Purpose

This document defines the migration execution order for Watchman Finance in Supabase and provides the implementation guidance needed to run the schema safely across development, staging, UAT, and production.

This guide should be used as the controlling migration-run reference for:
- migration sequencing
- deployment order
- seed order
- RLS rollout
- validation checkpoints
- rollback planning
- environment promotion

## 2. Migration Execution Principles

All Watchman Finance migrations should be run according to the following rules:

### 2.1 Run in strict sequence
Do not run packs out of order.

### 2.2 Separate schema from application release when needed
Where practical, deploy schema first, then release dependent server actions and UI after validation.

### 2.3 Validate RLS before user-facing rollout
No module is considered ready until RLS has been tested in that environment.

### 2.4 Seed before dependent workflows
Roles, permissions, module keys, item types, and other registries must be seeded before dependent actions are tested.

### 2.5 Treat production as controlled change
Production migrations require pre-checks, post-checks, rollback readiness, and release signoff.

## 3. Canonical Migration Order

Run migrations in this order:

### 001
`001_watchman_finance_foundation.sql`

### 002
`002_watchman_finance_integration_staging.sql`

### 003
`003_watchman_finance_ar_ap_core.sql`

### 004
`004_watchman_finance_payroll_core.sql`

### 005
`005_watchman_finance_leave_accruals.sql`

### 006
`006_watchman_finance_banking_reconciliation.sql`

### 007
`007_watchman_finance_catalog_billing.sql`

### 008
`008_watchman_finance_inventory_assets.sql`

### 009
`009_watchman_finance_reporting_dashboards.sql`

### 010
`010_watchman_finance_budgeting_forecasting.sql`

### 011
`011_watchman_finance_consolidation_commercial_readiness.sql`

### 012
`012_watchman_finance_hardening_qa_prod_readiness.sql`

## 4. Pack-by-Pack Run Guidance

## Pack 001. Foundation
### Run goal
Establish base tenancy, roles, permissions, settings, audit, accounts, and fiscal periods.

### Required checks after migration
- tenants table exists
- entities table exists
- memberships work
- roles and permissions are seeded
- accounts table exists
- fiscal periods table exists
- audit logs table exists
- baseline RLS is active
- cross-tenant access is blocked

### Blockers if failed
Do not continue to Pack 002 if Pack 001 fails.

## Pack 002. Integration Staging and Sync
### Run goal
Establish staging, promotion, sync tracking, and external ID mappings.

### Required checks after migration
- integration systems seeded
- staging tables exist
- external ID mappings exist
- finance_people exists
- integration event log exists
- dead-letter queue exists

### Blockers if failed
Do not continue to payroll, billing, or promotion workflows if Pack 002 fails.

## Pack 003. AR and AP Core
### Run goal
Establish customer, vendor, invoice, bill, and payment structures.

### Required checks after migration
- customers and vendors exist
- invoices and invoice lines exist
- bills and bill lines exist
- payment tables exist
- RLS policies allow scoped reads only

### Blockers if failed
Do not continue to billing conversion or banking receipt-matching workflows if Pack 003 fails.

## Pack 004. Payroll Core
### Run goal
Establish payroll structure and payroll execution tables.

### Required checks after migration
- pay groups and pay periods exist
- employee pay profiles exist
- payroll runs exist
- payroll input and run item tables exist
- pay statements table exists

### Blockers if failed
Do not continue to leave integration or payroll finalization workflows if Pack 004 fails.

## Pack 005. Leave and Accrual Management
### Run goal
Establish leave types, balances, requests, approvals, and accrual structures.

### Required checks after migration
- leave policy tables exist
- leave request workflow tables exist
- leave balance ledger exists
- holiday calendars exist
- leave liability snapshots exist

### Blockers if failed
Do not continue to leave-to-payroll readiness checks if Pack 005 fails.

## Pack 006. Banking and Reconciliation
### Run goal
Establish bank account, transaction, reconciliation, and transfer control structures.

### Required checks after migration
- bank accounts exist
- bank transactions exist
- reconciliations exist
- transfer requests exist
- receipt matching exists

### Blockers if failed
Do not continue to cash dashboards or payment matching workflows if Pack 006 fails.

## Pack 007. Products, Services, and Contract Billing
### Run goal
Establish catalog, pricing, billing rules, and billable candidate logic.

### Required checks after migration
- catalog items exist
- pricing tables exist
- billing rules exist
- contract rate cards exist
- billable event candidates exist

### Blockers if failed
Do not continue to contract billing rollout if Pack 007 fails.

## Pack 008. Inventory and Asset Control
### Run goal
Establish inventory, asset control, issue/return, and stock accountability structures.

### Required checks after migration
- inventory items exist
- stock balance tables exist
- receipt and transfer tables exist
- adjustment and count structures exist
- equipment asset and assignment tables exist

### Blockers if failed
Do not continue to uniform/equipment workflows if Pack 008 fails.

## Pack 009. Reporting and Dashboard Foundation
### Run goal
Establish reporting definitions, dashboard definitions, KPI structures, and foundational summary views.

### Required checks after migration
- report definitions exist
- dashboard definitions exist
- KPI definitions exist
- close checklist tables exist
- summary views compile successfully

### Blockers if failed
Do not continue to dashboard rollout or management reporting if Pack 009 fails.

## Pack 010. Budgeting and Forecasting
### Run goal
Establish budgeting, forecasting, scenario, and variance structures.

### Required checks after migration
- budget versions exist
- forecast versions exist
- scenario inputs exist
- variance snapshots exist
- planning summary views compile successfully

### Blockers if failed
Do not continue to planning UI rollout if Pack 010 fails.

## Pack 011. Multi-Entity Consolidation and Commercial Readiness
### Run goal
Establish consolidation, intercompany readiness, bootstrap runs, and commercial controls.

### Required checks after migration
- consolidation groups exist
- intercompany structures exist
- feature flags exist
- tenant activation structures exist
- client portal profile structure exists

### Blockers if failed
Do not continue to commercialization readiness or multi-entity rollout if Pack 011 fails.

## Pack 012. Hardening, QA, and Production Readiness
### Run goal
Establish testing, release, alerting, recovery, and readiness structures.

### Required checks after migration
- test suites and runs exist
- release structures exist
- system health checks exist
- operational alerts exist
- recovery tables exist
- readiness views compile successfully

### Blockers if failed
Do not treat the platform as production-ready if Pack 012 fails.

## 5. Recommended Directory Structure

Use a migration directory structure like this:

```text
supabase/
  migrations/
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

## 6. Recommended Release Grouping

### Release Group A
- 001
- 002

### Release Group B
- 003
- 004
- 005
- 006

### Release Group C
- 007
- 008

### Release Group D
- 009
- 010

### Release Group E
- 011
- 012

This grouping keeps the rollout disciplined while still allowing controlled progress by wave.

## 7. Seed and Registry Order

Where seeds exist or are required, load them in this order:

1. permissions
2. system roles
3. role-permission mappings
4. module keys
5. account categories
6. integration systems
7. catalog item types
8. feature flag definitions
9. provisioning templates where applicable

Do not defer foundational seeds until after application testing starts.

## 8. Environment Execution Order

Use this environment order:

1. local development
2. shared dev
3. staging
4. UAT
5. production

Every pack must pass validation in the current environment before promotion to the next one.

## 9. Pre-Run Checklist

Before running any migration set, verify:

- database backup completed
- migration files present and named correctly
- target environment confirmed
- release window confirmed
- dependent application code identified
- rollback owner identified
- audit logging available
- test plan ready
- seed files ready if required

## 10. Post-Run Validation Checklist

After each migration run, verify:

- migration completed successfully
- expected tables created
- expected views compile
- expected indexes created
- expected triggers created
- expected seed data present
- RLS enabled where expected
- read policies behave correctly
- no unexpected table or view compile failures
- no critical constraint errors

## 11. Recommended Validation by Module

### Security validation
- confirm tenant isolation
- confirm entity scope restrictions
- confirm unauthorized users cannot read protected rows
- confirm no unintended browser write path exists

### Workflow validation
- create draft records
- approve where applicable
- confirm status transitions
- confirm audit logs write correctly

### Reporting validation
- confirm views compile
- confirm views return scoped data
- confirm summary numbers are not null when source data exists

## 12. Rollback Guidance

Rollback must be planned before production execution.

### Use this rollback model
- prefer restore-based rollback for large multi-pack failures
- prefer forward-fix for minor defects where schema is already deployed safely
- do not manually delete finance tables in production as an improvised rollback tactic

### At minimum, document:
- affected migration number
- environment
- failure point
- data created since run
- restore point or forward-fix path
- owner of recovery decision

## 13. Recommended Execution Commands

Use your standard Supabase migration process, but the operational logic should be:

### Development
- run migrations sequentially
- validate after each pack or release group

### Staging and UAT
- run release groups in order
- test all dependent server actions and workflows after each group

### Production
- run only approved release group
- execute post-run checks immediately
- do not continue to next group without signoff

## 14. Suggested Migration Runbook by Release Group

## Release Group A Runbook
Includes:
- 001
- 002

Validate:
- tenant bootstrap
- role assignment
- entity scope
- staging inserts
- employee promotion flow

## Release Group B Runbook
Includes:
- 003
- 004
- 005
- 006

Validate:
- invoice creation
- bill creation
- payroll run creation
- leave request creation
- bank transaction import
- reconciliation creation

## Release Group C Runbook
Includes:
- 007
- 008

Validate:
- catalog item creation
- price setup
- billable candidate creation
- stock receipt
- asset assignment

## Release Group D Runbook
Includes:
- 009
- 010

Validate:
- report snapshot generation
- dashboard snapshot generation
- budget version creation
- forecast version creation
- variance snapshot generation

## Release Group E Runbook
Includes:
- 011
- 012

Validate:
- consolidation group creation
- feature flag assignment
- release version creation
- alert generation
- restore test run creation

## 15. Recommended Naming Standard for Future Packs

If additional packs are created later, follow the same convention:

- zero-padded numeric prefix
- lowercase
- descriptive module name
- underscore-separated

Example:
`013_watchman_finance_gl_posting_engine.sql`

## 16. Production Signoff Criteria

Before marking a release group complete in production, confirm:

- schema applied successfully
- seeds validated
- RLS validated
- dependent server actions deployed
- smoke tests passed
- audit logging verified
- no unresolved critical alerts
- rollback path remains available
- release checklist completed
- business owner signoff received

## 17. Immediate Next Build Deliverables After This Guide

After this migration order file, the strongest implementation deliverables are:

1. shared Supabase service and permission utility layer
2. Vercel route and server action directory structure
3. GitHub epics and issues broken down by release group
4. environment-specific rollout checklist
5. first UI shell package for admin setup and finance operations

## 18. Final Rule

No Watchman Finance migration should be treated as isolated work.

Every migration run must be tied to:
- pack number
- release group
- environment
- validation checklist
- rollback path
- deployment approval
