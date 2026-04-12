# Watchman Finance Supabase Migration Plan v1

## 1. Purpose

This plan defines the recommended database migration sequence for Watchman Finance in Supabase so that schema creation, foreign keys, RLS, seed data, and server actions are introduced in a safe order.

The goal is to avoid:
- circular dependencies
- premature RLS breakage
- missing seed data
- invalid foreign key ordering
- fragile rollout of finance-critical workflows

## 2. Migration Principles

1. Create foundations before transactional tables.
2. Add RLS after membership and scope tables exist.
3. Seed lookup and permission data before enabling app flows.
4. Introduce server-only workflow tables before production UI mutation.
5. Avoid large all-in-one migrations for finance domains.
6. Make every migration reversible where practical.

## 3. Migration Packs

## Pack 001. Core tenancy foundation
Create:
- tenants
- entities
- branches
- departments
- locations
- cost_centers
- platform_users
- tenant_memberships
- tenant_user_profiles

Then:
- add indexes on tenant_id and entity_id
- seed default tenant/module registry values if needed

## Pack 002. Roles and permissions foundation
Create:
- roles
- permissions
- role_permissions
- user_role_assignments
- user_entity_scopes
- user_branch_scopes
- user_department_scopes
- user_location_scopes
- tenant_product_entitlements
- tenant_module_entitlements
- user_module_overrides

Then:
- seed system permissions
- seed default finance role bundles

## Pack 003. Audit and settings foundation
Create:
- audit_logs
- finance_settings
- tenant_settings
- entity_settings
- support_session_logs if used
- integration_secrets_metadata references only, not raw secrets

Then:
- create audit helper functions
- create actor context helper functions

## Pack 004. Finance master and GL foundation
Create:
- accounts
- account_categories
- fiscal_periods
- fiscal_period_closures
- journal_entries
- journal_entry_lines
- account_balances

Then:
- seed base account categories
- seed status lookup values if separate
- create balancing validation functions

## Pack 005. Customer and vendor foundation
Create:
- customers
- customer_sites
- vendors
- vendor_contacts
- billing_contacts

Then:
- add common search indexes
- add customer external mapping support

## Pack 006. Integration backbone
Create:
- integration_systems
- integration_connections
- integration_sync_jobs
- integration_sync_runs
- integration_event_log
- integration_dead_letter_queue
- integration_replay_requests
- external_id_mappings
- sync_watermarks
- ingestion_validation_errors
- ingestion_review_queue
- ingestion_promotion_runs
- ingestion_promotion_items

Then:
- seed integration system registry
- create dedupe utilities

## Pack 007. Launch sync staging
Create:
- staged_employees
- staged_customers
- staged_contracts

Then:
- add promotion stored procedures or transactional functions if needed

## Pack 008. Operations sync staging
Create:
- staged_time_entries
- staged_payroll_hours
- staged_service_events
- staged_leave_events
- staged_inventory_events
- staged_payment_events

Then:
- add normalization functions

## Pack 009. AR core
Create:
- invoices
- invoice_lines
- invoice_payments
- credit_memos
- customer_statements
- invoice_item_sources

Then:
- create AR status functions
- create invoice numbering service support tables if needed

## Pack 010. AP core
Create:
- bills
- bill_lines
- vendor_payments
- payment_batches if used

Then:
- create AP posting helper functions

## Pack 011. Payroll foundation
Create:
- finance_employees or payroll_employee_profiles if separate
- employee_pay_profiles
- employee_tax_profiles
- employee_payment_method_requests
- pay_groups
- pay_periods
- payroll_runs
- payroll_input_records
- payroll_run_items
- payroll_run_earnings
- payroll_run_deductions
- payroll_approval_logs
- pay_statements

Then:
- create payroll calculation helper tables if needed
- create payroll status enums or lookups

## Pack 012. Leave and accruals
Create:
- leave_types
- leave_policies
- leave_policy_assignments
- leave_accrual_rules
- employee_leave_profiles
- leave_balance_ledgers
- leave_requests
- leave_request_days
- leave_approvals
- leave_adjustments
- holiday_calendars
- leave_liability_snapshots

## Pack 013. Banking and tax foundation
Create:
- bank_accounts
- bank_transactions
- reconciliations
- reconciliation_lines
- transfer_requests
- tax_liabilities
- tax_filing_periods
- payroll_tax_deposit_events
- ach_batches
- ach_batch_items

Then:
- create sensitive token reference tables only if needed
- do not store raw secrets directly in app-readable tables

## Pack 014. Catalog and billing foundation
Create:
- catalog_items
- catalog_item_categories
- catalog_item_types
- catalog_item_prices
- catalog_item_cost_profiles
- catalog_item_tax_rules
- catalog_item_account_mappings
- catalog_bundles
- catalog_bundle_items
- customer_item_pricing
- contract_item_pricing
- billing_rules
- contract_rate_cards

## Pack 015. Inventory and asset control
Create:
- inventory_items
- inventory_categories
- inventory_locations
- inventory_stock_balances
- inventory_receipts
- inventory_receipt_lines
- inventory_transfers
- inventory_adjustments
- inventory_count_sessions
- inventory_count_lines
- equipment_assets
- equipment_assignments
- equipment_condition_logs
- equipment_incidents
- inventory_reorder_rules
- inventory_vendor_items
- inventory_gl_mappings
- employee_item_issues
- employee_item_returns
- employee_issue_acknowledgments

## Pack 016. Reporting and close support
Create:
- close_checklists
- close_tasks
- report_snapshots if used
- dashboard_snapshot_tables if used
- materialized view refresh tracking tables if used

## Pack 017. Budgeting and forecasting
Create:
- budget_versions
- budget_lines
- budget_approvals
- forecast_versions
- forecast_lines
- scenario_inputs
- variance_snapshots

## 4. RLS Rollout Order

### Stage 1
Enable RLS on:
- tenants
- entities
- tenant_memberships
- role/scope tables

Add safe policies only after membership resolution utilities exist.

### Stage 2
Enable RLS on:
- customers
- vendors
- accounts
- fiscal periods
- catalog and inventory master tables

### Stage 3
Enable RLS on transactional tables:
- invoices
- bills
- payroll tables
- bank tables
- tax tables
- inventory movement tables

### Stage 4
Enable RLS on integration and support-visible tables:
- staging tables where tenant users may review exceptions
- integration review queues
- audit log viewers

## 5. Seed Data Order

1. module registry
2. permission registry
3. default roles
4. account categories
5. leave type defaults
6. catalog type defaults
7. inventory category defaults
8. payroll status values
9. invoice and bill status values
10. close checklist templates if used

## 6. Post-Migration Validation Checklist

After each pack:
- verify indexes
- verify foreign keys
- verify audit trigger behavior
- verify RLS behavior
- verify seed success
- verify rollback path
- verify tenant and entity constraints

## 7. Recommended Naming Standards

- table names plural snake_case
- primary keys as uuid
- foreign keys named <table>_id
- tenant_id on every tenant-owned table
- entity_id on every entity-scoped finance table
- status columns as controlled enums or validated text
- created_at and updated_at on mutable tables
- created_by and updated_by where useful for finance traceability

## 8. Final Rule

Do not begin production UI development for a module until:
- its migration pack exists
- its seed and lookup data exist
- its RLS plan exists
- its server mutation pattern exists
- its audit logging pattern exists
