# Watchman Finance Framework v1

## 1. Starting Point

This framework is based on the current Watchman stack:
- Frontend: React + TypeScript + Vite
- Backend: Supabase
- Deployment: Vercel
- Source control: GitHub
- Current payments/integrations already present in repo: Stripe, QuickBooks sync functions, admin-data edge function pattern
- Architectural constraint from backend audit: sensitive mutations should move through server-controlled paths, not direct browser CRUD

## 2. Build Order Recommendation

The best place to start is not the full schema in isolation. The correct order is:

1. Product boundary and module ownership map
2. Shared platform foundation and tenancy model
3. Finance domain map
4. Canonical data flow between Launch, Operations, and Finance
5. Core schema groups
6. Server action and integration pattern
7. UI/module rollout order

Reason: if schema is designed before ownership and flows are settled, duplication and cross-product confusion will happen.

## 3. Product Ownership Map

### Watchman Launch owns
- tenant onboarding and provisioning
- org profile and entity setup
- employee master identity
- hiring/onboarding lifecycle
- training and certification master records
- customer/client intake
- baseline products and service setup if created during intake
- policy acknowledgments and document intake

### Watchman Operations owns
- scheduling
- post assignments
- attendance and timekeeping
- shift exceptions
- patrol/service execution events
- field incident and activity logs
- worked hours and supervisor approvals
- site equipment usage events

### Watchman Finance owns
- chart of accounts
- entities, fiscal periods, closes
- customers and vendors as finance masters
- products and services catalog for billing/accounting treatment
- invoices, credit memos, receipts, AR
- bills, AP, vendor payments
- bank accounts, reconciliation, cash management
- payroll configuration and payroll runs
- tax liability tracking and filing calendars
- leave/accrual policy, balances, liability, payroll mapping
- inventory and asset accounting/control
- budgeting, forecasting, financial reporting
- profitability, labor costing, executive dashboards
- audit trails for finance actions

### Cross-product shared but Finance-led
- products and services catalog
- inventory and asset master
- leave policy and accrual engine
- employee pay profiles
- customer contract billing rules

## 4. Finance Domain Structure

Watchman Finance should be designed as a set of internal domains.

### A. Platform Foundation
- tenants
- entities
- branches
- departments
- cost centers
- roles and permissions
- product entitlements
- audit framework

### B. General Ledger
- chart of accounts
- journal engine
- posting rules
- accounting periods
- close controls
- trial balance and statements

### C. Revenue and Receivables
- customers
- customer sites
- contracts
- billing rules
- invoices
- credit memos
- receipts
- collections

### D. Purchasing and Payables
- vendors
- bills
- approvals
- vendor payments
- recurring expenses

### E. Banking and Cash
- bank accounts
- import feeds/manual imports
- reconciliation
- cash position
- transfer logs

### F. Payroll and Compensation
- pay groups
- pay schedules
- employee pay profiles
- earnings codes
- deduction codes
- payroll runs
- direct deposit batches
- payroll journals

### G. Tax and Compliance
- employee tax setup
- employer tax setup
- tax liabilities
- deposit calendars
- filing periods
- notice tracking
- direct deposit consent tracking

### H. Leave and Accrual Management
- leave types
- policies
- accrual rules
- balances
- approvals
- payroll mapping
- leave liability

### I. Products and Services
- service catalog
- product catalog
- pricing rules
- account mappings
- tax treatment
- contract pricing overrides
- billable source mapping

### J. Inventory and Asset Control
- stocked items
- controlled equipment
- stock locations
- issuances and returns
- asset assignments
- adjustments and write-offs
- inventory valuation

### K. Budgeting and Forecasting
- annual budgets
- monthly budgets
- forecast versions
- scenario models
- budget vs actual
- forecast vs actual

### L. Reporting and Decision Support
- standard financial statements
- AR/AP reporting
- payroll reporting
- labor and contract profitability
- billing leakage analysis
- executive dashboards

## 5. Canonical Data Flow Across Products

### Launch -> Finance
Launch publishes:
- tenant and entity metadata
- employee master records
- hire/termination status
- training/certification status
- customer/client records
- contract setup inputs

Finance consumes and stores a finance-ready copy of these records.

### Operations -> Finance
Operations publishes:
- approved worked time
- overtime and premium hours
- shift/site worked
- service completion events
- patrol events
- absence coding on approved schedules
- equipment issue/use/loss events

Finance converts these into:
- payroll inputs
- billable events
- labor cost records
- margin data
- accrual activity

### Finance -> Launch
Finance sends back:
- pay profile status
- payroll completion state
- leave balance snapshots
- equipment financial holds if needed

### Finance -> Operations
Finance sends back:
- approved leave usage
- payroll lock windows
- contract billing warnings
- profitability and labor-risk feedback

## 6. Multi-Tenant Architecture Standard

### Recommended model
- shared database
- shared schema
- tenant_id on tenant-owned rows
- entity_id on books/payroll/accounting rows where applicable
- strict row-level security
- server-side finance mutations only

### Required hierarchy
- platform
- tenant
- entity
- branch/department/location/cost center

### Required rule
No finance table should exist without clear tenant scope. Most accounting tables also require entity scope.

## 7. Security Standard for Finance

Finance should adopt stricter rules than current Launch admin CRUD.

### Required controls
- no direct browser writes for sensitive finance mutations
- edge-function or server-action only for payroll, posting, reconciliation, approvals, and banking changes
- immutable audit log for every financial mutation
- role-based access and approval boundaries
- period lock controls
- correction entries instead of silent overwrite

### High-risk actions that must be server-only
- posting journal entries
- closing periods
- changing payroll status
- generating ACH files
- modifying tax setup
- applying payments to invoices
- reconciling bank statements
- adjusting inventory value
- issuing vendor payments

## 8. Schema Workstreams

Do not attempt one massive schema first. Break it into workstreams.

### Workstream 1. Platform and tenancy
Tables:
- tenants
- tenant_users
- tenant_memberships
- entities
- branches
- departments
- locations
- cost_centers
- roles
- permissions
- user_role_assignments
- audit_logs

### Workstream 2. Ledger foundation
Tables:
- accounts
- account_classes
- journal_entries
- journal_entry_lines
- fiscal_periods
- posting_batches
- account_balances

### Workstream 3. Revenue and AR
Tables:
- customers
- customer_sites
- contracts
- contract_rate_cards
- invoices
- invoice_lines
- credit_memos
- receipts
- receipt_applications
- collections_actions

### Workstream 4. AP and purchasing
Tables:
- vendors
- bills
- bill_lines
- vendor_payments
- payment_batches
- recurring_bills

### Workstream 5. Payroll
Tables:
- employee_pay_profiles
- employee_tax_profiles
- employee_bank_accounts
- pay_groups
- pay_periods
- earnings_codes
- deduction_codes
- payroll_runs
- payroll_run_items
- payroll_run_item_lines
- direct_deposit_batches
- payroll_tax_liabilities

### Workstream 6. Leave and accruals
Tables:
- leave_types
- leave_policies
- leave_policy_assignments
- leave_accrual_rules
- leave_balances
- leave_requests
- leave_approvals
- leave_adjustments
- leave_liability_snapshots

### Workstream 7. Products, services, and billing logic
Tables:
- catalog_items
- catalog_categories
- catalog_prices
- catalog_account_mappings
- contract_item_pricing
- billable_events
- invoice_item_sources

### Workstream 8. Inventory and assets
Tables:
- inventory_items
- inventory_locations
- inventory_stock_balances
- inventory_receipts
- inventory_adjustments
- inventory_transfers
- equipment_assets
- equipment_assignments
- equipment_incidents

### Workstream 9. Banking and reconciliation
Tables:
- bank_accounts
- bank_transactions
- bank_statement_imports
- reconciliations
- reconciliation_lines
- cash_forecast_items

### Workstream 10. Budgeting and forecasting
Tables:
- budget_versions
- budget_lines
- forecast_versions
- forecast_lines
- scenario_models

## 9. API and Integration Pattern

### Pattern
Use Finance edge functions as the only write path for sensitive actions.

### Key finance server actions
- finance-create-invoice
- finance-apply-receipt
- finance-create-bill
- finance-approve-bill
- finance-post-journal
- finance-close-period
- finance-create-payroll-run
- finance-finalize-payroll-run
- finance-generate-ach-batch
- finance-record-tax-payment
- finance-create-budget-version
- finance-adjust-inventory
- finance-issue-equipment

### Event-driven sync pattern
Use integration jobs and sync logs.

Tables:
- integration_sync_jobs
- integration_sync_logs
- external_mapping_keys
- inbound_events
- outbound_events

## 10. UI Module Map for Watchman Finance

### Foundation workspace
- Tenant Settings
- Entity Settings
- Roles and Permissions
- Fiscal Calendar

### Accounting workspace
- Dashboard
- Chart of Accounts
- Journal Entries
- Period Close
- Financial Statements

### Revenue workspace
- Customers
- Contracts
- Products and Services
- Invoices
- Receipts
- Collections

### AP workspace
- Vendors
- Bills
- Payments
- Recurring Expenses

### Payroll workspace
- Employees Pay Profiles
- Pay Groups
- Payroll Runs
- Direct Deposit
- Tax Liabilities
- Leave and Accruals

### Operations Finance workspace
- Billable Events
- Labor Costing
- Profitability
- Billing Leakage

### Inventory workspace
- Stock Items
- Equipment Assets
- Issuances and Returns
- Adjustments
- Reorder Reports

### Planning workspace
- Budgets
- Forecasts
- Scenarios
- Cash Outlook

### Reporting workspace
- Standard Reports
- Payroll Reports
- AR/AP Reports
- Margin Reports
- Executive Dashboard

## 11. Recommended Build Sequence by Phase

### Phase 0. Architecture lock
Deliverables:
- ownership map
- domain map
- tenancy model
- naming conventions
- security standard

### Phase 1. Foundation
Build:
- tenants/entities structure
- permissions/RLS baseline
- audit framework
- ledger foundation
- customers/vendors base

### Phase 2. Revenue and AP
Build:
- products/services catalog
- invoices/receipts
- bills/vendor payments
- bank accounts and reconciliation base

### Phase 3. Payroll core
Build:
- pay profiles
- pay groups
- payroll runs
- leave/accrual engine
- direct deposit batch generation
- payroll journals

### Phase 4. Inventory and contract intelligence
Build:
- inventory/assets
- contract billing rules
- labor costing
- billable event ingestion
- profitability dashboards

### Phase 5. Planning and advanced reporting
Build:
- budgets
- forecasts
- scenario planning
- executive dashboard
- close management

## 12. First Concrete Deliverables To Produce Next

The next artifacts that should be created, in order, are:
1. module ownership map
2. canonical event/data flow map
3. finance schema v1
4. finance permissions matrix
5. finance migration plan
6. finance edge function map
7. finance screen map

## 13. Immediate Recommendation

Start with the module ownership map and the schema foundation together, but let ownership drive the schema.

The first schema package should only include:
- tenancy and entity foundation
- roles and permissions
- audit logs
- chart of accounts
- fiscal periods
- customers/vendors
- products/services catalog skeleton

Do not begin payroll tables before the tenant/entity/accounting base is settled.
