# Watchman Finance Module Ownership and Schema Foundation v1

## 1. Purpose
This document defines the first build-ready framework for Watchman Finance within the Watchman ecosystem.

It establishes:
- module ownership across Watchman Launch, Watchman Operations, and Watchman Finance
- canonical data flow between products
- multi-tenant and multi-entity architecture rules
- core finance domains
- first schema workstreams
- first server-side action boundaries
- implementation order

This is intended to guide product design, Supabase schema planning, API design, and frontend module development.

## 2. Product Roles Across the Watchman Ecosystem

## 2.1 Watchman Launch
Primary role: master setup and organizational enablement.

Launch owns:
- tenant onboarding inputs
- organization profile setup
- legal entity setup inputs
- employee master identity
- employee onboarding
- employee classification metadata
- training and certification records
- customer/client setup inputs
- contract setup inputs
- product entitlement setup
- initial role assignment inputs

Launch does not own:
- general ledger
- payroll execution
- invoice posting
- journal posting
- bank reconciliation
- inventory valuation
- leave liabilities
- budgeting and forecasting

## 2.2 Watchman Operations
Primary role: workforce execution and field activity.

Operations owns:
- scheduling
- shift assignments
- attendance and timekeeping
- worked hours
- patrol and service execution logs
- missed punch workflows
- field exception capture
- site activity records
- supervisor approvals on worked time
- post coverage events
- billable operational events

Operations does not own:
- payroll calculations as system of record
- tax liability tracking
- financial statements
- AR and AP ledgers
- entity books
- inventory costing

## 2.3 Watchman Finance
Primary role: financial system of record for the Watchman ecosystem.

Finance owns:
- chart of accounts
- general ledger
- journal engine
- AR and AP
- payroll
- tax and statutory tracking
- leave and accrual balances
- products and services catalog for billing/accounting
- contract billing logic
- budgeting
- forecasting
- reporting and analytics
- banking and reconciliation
- inventory and asset control
- period close
- audit controls
- financial dashboards

## 3. Ownership Matrix

| Domain | Launch | Operations | Finance |
|---|---|---|---|
| Tenant setup inputs | Primary | Reads | Reads |
| Legal entity setup inputs | Primary | Reads | Consumes and governs books |
| Employee identity | Primary | Reads | Reads |
| Employee pay profile | Source inputs | Reads | Primary |
| Training/certification | Primary | Reads | Reads for payroll/compliance effects |
| Client/customer master | Source inputs | Reads | Primary financial master after sync |
| Contracts and service agreements | Source inputs | Reads | Primary for billing logic |
| Scheduling | No | Primary | Reads |
| Worked time | No | Primary | Consumes approved time |
| Leave request policy/balances | Reads | Reads approved leave | Primary |
| Payroll runs | No | No | Primary |
| Direct deposit | No | No | Primary |
| Invoicing | No | No | Primary |
| Accounts receivable | No | No | Primary |
| Accounts payable | No | No | Primary |
| Bank reconciliation | No | No | Primary |
| Inventory item master | Reads | Reads | Primary |
| Employee item issuance | Secondary workflow | Secondary workflow | Primary record of ownership and cost |
| Budgeting and forecasting | No | Inputs | Primary |
| Executive reporting | Reads | Reads | Primary |

## 4. Canonical Data Flow

## 4.1 Launch to Finance
Launch publishes:
- tenant metadata
- entity metadata
- employee master profiles
- employee classifications
- hire/termination status
- training and certification status
- client/customer intake data
- contract setup data
- service catalog setup inputs

Finance consumes and normalizes this into:
- tenant records
- entity records
- employees
- employee pay profiles
- customers
- contracts
- product and service catalog entries

## 4.2 Operations to Finance
Operations publishes:
- approved worked hours
- shift records
- overtime hours
- differentials
- approved absences by leave code
- billable service delivery events
- patrol completion events
- schedule variance indicators
- supervisor-approved corrections

Finance consumes and transforms this into:
- payroll earning inputs
- leave usage entries
- labor cost entries
- billable invoice source lines
- contract profitability data
- forecast drivers

## 4.3 Finance to Launch
Finance publishes:
- payroll completion status
- employee pay setup completeness flags
- leave balance summaries
- inventory/equipment assignment status
- compensation summary references where needed

## 4.4 Finance to Operations
Finance publishes:
- approved leave events
- labor cost indicators
- billing status flags for service events
- client/account hold or contract exceptions if needed
- equipment ownership and assignment state

## 5. Architecture Standard

## 5.1 Multi-tenant standard
Watchman Finance must be designed as:
- shared codebase
- shared Supabase project or controlled environment strategy
- shared schema with tenant isolation
- tenant-aware services
- multi-entity capable from day one

## 5.2 Entity model standard
Every tenant may contain one or more legal entities.

Each entity may contain:
- branches
- departments
- locations
- client sites
- cost centers

Finance records should typically be scoped by:
- tenant_id
- entity_id where financially relevant

## 5.3 Security standard
Sensitive finance operations must be server-controlled.

Do not permit direct browser-side mutation for:
- payroll finalization
- journal posting
- reconciliation close
- period close
- tax profile changes
- direct deposit file generation
- invoice posting
- payment application
- inventory write-offs
- budget approval

## 6. Watchman Finance Core Modules

## 6.1 Foundation and Governance
- tenants
- entities
- branches
- departments
- locations
- cost centers
- roles and permissions
- audit logs
- settings and feature flags

## 6.2 General Ledger
- accounts
- journal entries
- journal entry lines
- fiscal periods
- close controls
- account balances
- ledger reporting

## 6.3 Accounts Receivable
- customers
- customer sites
- invoices
- invoice lines
- invoice payments
- credit memos
- statements
- collections workflow

## 6.4 Accounts Payable
- vendors
- bills
- bill lines
- vendor payments
- recurring expenses
- approval workflow

## 6.5 Banking and Reconciliation
- bank accounts
- bank transactions
- deposits
- transfers
- reconciliation sessions
- reconciliation lines

## 6.6 Payroll
- employee pay profiles
- pay groups
- pay periods
- payroll runs
- payroll run items
- earnings codes
- deduction codes
- employer tax records
- pay statements
- direct deposit batches

## 6.7 Leave and Accrual Management
- leave types
- leave policies
- accrual rules
- employee leave profiles
- leave balances
- leave requests
- leave adjustments
- liability snapshots

## 6.8 Tax and Statutory Compliance
- tax jurisdictions
- employee tax profiles
- employer tax profiles
- tax liability records
- tax period calendar
- compliance tasks
- filing status tracking

## 6.9 Products and Services Management
- item catalog
- pricing rules
- contract pricing overrides
- service categories
- account mappings
- billable source mappings

## 6.10 Contract Billing and Profitability
- contract billing rules
- billing source events
- invoice generation jobs
- labor cost by contract
- profitability metrics
- billing exception queue

## 6.11 Inventory and Asset Control
- inventory items
- item categories
- stock balances
- stock locations
- equipment assets
- employee assignments
- damage/loss events
- valuation and write-off tracking

## 6.12 Budgeting and Forecasting
- budget versions
- budget lines
- forecast versions
- forecast drivers
- scenario models
- variance analysis

## 6.13 Reporting and Analytics
- financial statements
- operational finance dashboards
- payroll reports
- AR/AP reports
- contract margin reports
- executive dashboards

## 7. First Schema Workstreams

## Workstream A. Tenant, Entity, Access Control Foundation
Create first:
- tenants
- entities
- branches
- departments
- locations
- cost_centers
- app_users
- tenant_user_memberships
- roles
- permissions
- role_permissions
- user_role_assignments
- feature_flags
- audit_logs

Purpose:
- establish multi-tenant base
- enforce tenant and entity scoping
- support RLS and server authorization

## Workstream B. Finance Core Ledger
Create next:
- accounts
- fiscal_periods
- journal_entries
- journal_entry_lines
- account_balance_snapshots
- close_checklists
- close_tasks

Purpose:
- provide the accounting backbone for every other module

## Workstream C. Customer, Vendor, AR, AP
Create next:
- customers
- customer_sites
- vendors
- invoices
- invoice_lines
- invoice_payments
- credit_memos
- bills
- bill_lines
- vendor_payments

Purpose:
- enable billing, receivables, payable management, and reporting

## Workstream D. Payroll and Leave
Create next:
- employee_pay_profiles
- employee_tax_profiles
- employee_bank_accounts
- pay_groups
- pay_periods
- payroll_runs
- payroll_run_items
- earning_codes
- deduction_codes
- leave_types
- leave_policies
- employee_leave_profiles
- leave_balance_ledger
- leave_requests
- leave_adjustments

Purpose:
- connect Launch and Operations data into payroll execution and leave tracking

## Workstream E. Banking, Tax, and Direct Deposit
Create next:
- bank_accounts
- bank_transactions
- reconciliation_sessions
- reconciliation_lines
- tax_jurisdictions
- employer_tax_profiles
- tax_liabilities
- tax_filing_periods
- direct_deposit_batches
- direct_deposit_batch_items

Purpose:
- enable controlled payroll and treasury operations

## Workstream F. Products, Services, Billing Sources, Inventory
Create next:
- catalog_items
- catalog_item_prices
- customer_item_pricing
- contract_item_pricing
- service_delivery_records
- billable_events
- inventory_items
- inventory_locations
- inventory_stock_balances
- equipment_assets
- equipment_assignments

Purpose:
- support commercial catalog, billing automation, and stocked item control

## Workstream G. Budgeting, Forecasting, Reporting
Create later in foundation phase:
- budget_versions
- budget_lines
- forecast_versions
- forecast_lines
- forecast_drivers
- dashboard_configs
- report_runs
- saved_reports

Purpose:
- provide planning and executive visibility after transaction foundations are stable

## 8. Canonical Integration Model

## 8.1 Integration pattern
Use event-driven and server-mediated synchronization.

Recommended pattern:
- source app creates or updates source record
- source app emits sync event or writes to integration queue
- Finance integration function validates tenant and entity context
- Finance upserts canonical target record
- Finance writes integration audit log

## 8.2 Required sync metadata
Every sync payload should contain:
- source_system
- source_record_type
- source_record_id
- tenant_id
- entity_id when applicable
- event_type
- occurred_at
- correlation_id
- actor_id if available

## 8.3 Source-of-truth rule
A record should have one primary owner.

Examples:
- employee legal identity: Launch
- approved worked time: Operations
- payroll result: Finance
- invoice and payment status: Finance
- leave policy and balance: Finance
- training certification status: Launch

## 9. Server Action Boundaries

The following should be implemented as server-side actions or edge functions only.

## 9.1 Ledger actions
- create_journal_entry_draft
- post_journal_entry
- reverse_journal_entry
- close_fiscal_period
- reopen_fiscal_period_with_control

## 9.2 Payroll actions
- create_pay_period
- ingest_approved_time
- generate_payroll_run
- validate_payroll_run
- finalize_payroll_run
- generate_pay_statements
- generate_direct_deposit_batch

## 9.3 AR/AP actions
- create_invoice_from_contract
- post_invoice
- apply_customer_payment
- create_bill
- approve_bill
- issue_vendor_payment

## 9.4 Banking actions
- import_bank_transactions
- create_reconciliation_session
- finalize_reconciliation_session

## 9.5 Leave actions
- accrue_leave_balances
- approve_leave_request
- apply_leave_to_payroll
- adjust_leave_balance

## 9.6 Inventory actions
- receive_inventory
- issue_inventory_item
- assign_equipment_asset
- record_damage_or_loss
- write_off_inventory

## 10. UI and Navigation Recommendation

## 10.1 Finance main navigation
- Dashboard
- General Ledger
- Customers and AR
- Vendors and AP
- Payroll
- Leave
- Tax and Compliance
- Banking
- Products and Services
- Contract Billing
- Inventory and Assets
- Budgets
- Forecasts
- Reports
- Settings

## 10.2 Dashboard views
At minimum include:
- executive dashboard
- controller dashboard
- payroll dashboard
- AR collections dashboard
- AP dashboard
- contract profitability dashboard
- inventory and equipment dashboard

## 11. Implementation Order

## Phase 1. Governance and Ledger Base
Build first:
- tenancy and access foundation
- entity structure
- audit logging
- chart of accounts
- fiscal periods
- journal engine

## Phase 2. AR, AP, and Banking Base
Build next:
- customers and vendors
- invoicing
- bills
- payments application
- bank accounts
- reconciliation foundation

## Phase 3. Payroll and Leave Base
Build next:
- employee pay profiles
- leave structure
- pay groups and periods
- payroll run engine
- payroll journals
- pay statements

## Phase 4. Tax, Direct Deposit, and Compliance
Build next:
- employer and employee tax profiles
- tax liabilities and filing periods
- direct deposit batch engine
- compliance tracking

## Phase 5. Catalog, Contract Billing, Inventory
Build next:
- products and services catalog
- contract pricing rules
- billable source ingestion
- inventory and asset control

## Phase 6. Budgeting, Forecasting, and Advanced Reporting
Build next:
- budgets
- forecasts
- profitability dashboards
- executive reporting
- scenario planning

## 12. Guiding Design Rules

1. Multi-tenant by default.
2. Multi-entity by design.
3. Server-controlled finance actions only for sensitive mutations.
4. One source of truth per record domain.
5. Finance is the financial system of record.
6. Launch and Operations remain operational sources, not accounting systems.
7. Every cross-product sync must be auditable.
8. Every finance record must be tenant-scoped.
9. Every future public SaaS feature should be enabled through configuration, not hardcoding.
10. EST Holdings should be modeled as Tenant 001, not as a special hardcoded assumption.

## 13. Immediate Next Deliverables

After this document, the next build documents should be:
1. Supabase schema blueprint v1
2. RLS and permissions model
3. Edge function and integration map
4. UI screen map by module
5. Payroll engine design
6. Catalog, billing, and inventory workflow design
