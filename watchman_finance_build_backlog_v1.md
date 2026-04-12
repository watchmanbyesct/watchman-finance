# Watchman Finance Build Backlog v1

## 1. Purpose

This backlog converts the Watchman Finance architecture and MVP plan into executable work items for GitHub issues, sprint planning, and AI-assisted development workflows.

The backlog is organized by:
- epic
- feature
- user story
- technical tasks
- priority
- dependency tags

Priority scale:
- P0 = must exist before production foundation
- P1 = core v1 capability
- P2 = important expansion for v1.5 or v2
- P3 = future-state or optimization

Dependency tag examples:
- DEP-TENANCY
- DEP-RLS
- DEP-GL
- DEP-INTEGRATION
- DEP-PAYROLL
- DEP-BANKING
- DEP-REPORTING

## 2. Epic Index

- EPIC-001 Multi-Tenant Foundation
- EPIC-002 Roles, Permissions, and RLS
- EPIC-003 Finance Core and General Ledger
- EPIC-004 Integration Backbone
- EPIC-005 Launch to Finance Master Sync
- EPIC-006 Operations to Finance Transaction Sync
- EPIC-007 Accounts Receivable
- EPIC-008 Accounts Payable
- EPIC-009 Payroll Core
- EPIC-010 Leave and Accrual Management
- EPIC-011 Banking and Reconciliation
- EPIC-012 Products and Services Catalog
- EPIC-013 Contract Billing and Billing Intelligence
- EPIC-014 Inventory and Asset Control
- EPIC-015 Reporting and Dashboards
- EPIC-016 Budgeting and Forecasting
- EPIC-017 Audit, Close, and Controls
- EPIC-018 QuickBooks Transition and Data Migration

## 3. EPIC-001 Multi-Tenant Foundation

### Feature 1. Tenant model
Priority: P0
Dependencies: none

#### User stories
- As a platform admin, I need to create tenants so Watchman Finance can support multiple organizations.
- As a tenant admin, I need entity-aware setup so separate legal entities can maintain separate books.

#### Technical tasks
- Create tenants table
- Create entities table
- Create branches, departments, locations, cost centers
- Add tenant_id to all tenant-owned tables
- Add entity_id to entity-scoped tables
- Create tenant bootstrap seed process

### Feature 2. Tenant module entitlements
Priority: P0
Dependencies: DEP-TENANCY

#### User stories
- As a tenant admin, I need module entitlements so some tenants can enable only the modules they use.

#### Technical tasks
- Create tenant_product_entitlements
- Create tenant_module_entitlements
- Create module registry constants
- Create entitlement resolution service

## 4. EPIC-002 Roles, Permissions, and RLS

### Feature 1. Role and permission model
Priority: P0
Dependencies: DEP-TENANCY

#### User stories
- As a finance admin, I need roles and permissions so access is limited by responsibility.

#### Technical tasks
- Create roles table
- Create permissions table
- Create role_permissions table
- Create user_role_assignments table
- Create user_entity_scopes table
- Create user_branch_scopes table
- Create user_department_scopes table
- Create user_location_scopes table

### Feature 2. RLS policies
Priority: P0
Dependencies: DEP-TENANCY

#### User stories
- As a tenant user, I must never see another tenant's data.
- As a payroll admin, I should only access permitted entities and modules.

#### Technical tasks
- Define standard tenant policy function
- Define standard entity scope policy function
- Apply RLS to tenant-owned tables
- Build policy test suite
- Build support-safe admin bypass strategy

## 5. EPIC-003 Finance Core and General Ledger

### Feature 1. Chart of accounts
Priority: P0
Dependencies: DEP-TENANCY, DEP-RLS

#### User stories
- As an accountant, I need to maintain a chart of accounts by entity so books are structured correctly.

#### Technical tasks
- Create accounts table
- Create account category references
- Create parent-child account hierarchy
- Build account create/update/archive actions
- Build account import template

### Feature 2. Fiscal periods
Priority: P0
Dependencies: DEP-GL

#### User stories
- As a controller, I need fiscal periods and close states so posting is controlled.

#### Technical tasks
- Create fiscal_periods table
- Create fiscal_period_closures table
- Build open/close/reopen actions
- Add period guard utilities

### Feature 3. Journal framework
Priority: P1
Dependencies: DEP-GL

#### User stories
- As an accountant, I need draft, approved, posted, and reversed journal workflows.

#### Technical tasks
- Create journal_entries
- Create journal_entry_lines
- Create posting service
- Create reversal service
- Build journal approval workflow
- Build balancing validation

## 6. EPIC-004 Integration Backbone

### Feature 1. Integration control tables
Priority: P0
Dependencies: DEP-TENANCY

#### Technical tasks
- Create integration_systems
- Create integration_connections
- Create integration_sync_jobs
- Create integration_sync_runs
- Create integration_event_log
- Create integration_dead_letter_queue
- Create integration_replay_requests
- Create external_id_mappings

### Feature 2. Staging and promotion framework
Priority: P0
Dependencies: DEP-INTEGRATION

#### Technical tasks
- Create ingestion_validation_errors
- Create ingestion_review_queue
- Create ingestion_promotion_runs
- Create ingestion_promotion_items
- Build staging promotion utilities
- Build dedupe key utilities

## 7. EPIC-005 Launch to Finance Master Sync

### Feature 1. Employee master sync
Priority: P1
Dependencies: DEP-INTEGRATION

#### User stories
- As payroll, I need employee master records from Launch so pay profiles are built on trusted data.

#### Technical tasks
- Create staged_employees
- Build employee sync endpoint
- Map Launch employee external IDs
- Build validation rules
- Build promotion into finance employee profile
- Build exception dashboard for sync errors

### Feature 2. Customer and contract sync
Priority: P1
Dependencies: DEP-INTEGRATION

#### Technical tasks
- Create staged_customers
- Create staged_contracts
- Build customer sync
- Build contract sync
- Create pricing and billing seed promotion
- Create conflict review workflow

## 8. EPIC-006 Operations to Finance Transaction Sync

### Feature 1. Approved time ingestion
Priority: P1
Dependencies: DEP-INTEGRATION

#### User stories
- As payroll, I need approved time from Operations so payroll input is trustworthy.

#### Technical tasks
- Create staged_time_entries
- Create staged_payroll_hours
- Build approved time ingest endpoint
- Build duplicate protection
- Build payroll exception checks
- Promote approved time into payroll input model

### Feature 2. Service event ingestion
Priority: P1
Dependencies: DEP-INTEGRATION

#### Technical tasks
- Create staged_service_events
- Build billable event ingest endpoint
- Map service events to contract billing candidates
- Build leakage detection preparation

## 9. EPIC-007 Accounts Receivable

### Feature 1. Customer invoicing
Priority: P1
Dependencies: DEP-GL, DEP-INTEGRATION

#### User stories
- As billing staff, I need to create and issue invoices tied to customers, contracts, and service lines.

#### Technical tasks
- Create invoices
- Create invoice_lines
- Create invoice statuses
- Build draft invoice UI
- Build issue invoice action
- Build void invoice action
- Build credit memo skeleton
- Create AR posting hooks

### Feature 2. Payments and aging
Priority: P1
Dependencies: DEP-AR, DEP-BANKING

#### Technical tasks
- Create invoice_payments
- Create customer_statements
- Create aging queries
- Build payment apply service
- Build unapplied cash handling
- Build AR dashboard

## 10. EPIC-008 Accounts Payable

### Feature 1. Bills
Priority: P1
Dependencies: DEP-GL

#### Technical tasks
- Create bills
- Create bill_lines
- Build draft bill UI
- Build approve and post workflows
- Create AP posting hooks

### Feature 2. Vendor payments
Priority: P1
Dependencies: DEP-AP, DEP-BANKING

#### Technical tasks
- Create vendor_payments
- Build payment proposal workflow
- Build payment approval workflow
- Build AP aging dashboard

## 11. EPIC-009 Payroll Core

### Feature 1. Pay profiles and pay groups
Priority: P1
Dependencies: DEP-INTEGRATION

#### Technical tasks
- Create employee_pay_profiles
- Create employee_tax_profiles
- Create employee_payment_method_requests
- Create pay_groups
- Create pay_periods
- Build pay profile UI
- Build pay group scheduling utilities

### Feature 2. Payroll calculation
Priority: P1
Dependencies: DEP-PAYROLL, DEP-INTEGRATION

#### User stories
- As payroll staff, I need payroll calculations from approved time and leave so I can review pay before release.

#### Technical tasks
- Create payroll_runs
- Create payroll_run_items
- Create payroll_run_earnings
- Create payroll_run_deductions
- Create payroll_input_records
- Build calculate payroll action
- Build payroll review screen
- Build pay statement generation
- Build payroll journal posting

### Feature 3. Payroll controls
Priority: P1
Dependencies: DEP-PAYROLL

#### Technical tasks
- Build payroll readiness dashboard
- Build exception queue
- Build finalize workflow
- Build reverse/correct workflow
- Build payroll approval logs

## 12. EPIC-010 Leave and Accrual Management

### Feature 1. Leave policy engine
Priority: P1
Dependencies: DEP-INTEGRATION

#### Technical tasks
- Create leave_types
- Create leave_policies
- Create leave_policy_assignments
- Create leave_accrual_rules
- Build leave policy UI
- Build policy eligibility mapping

### Feature 2. Leave balances and requests
Priority: P1
Dependencies: DEP-LEAVE

#### Technical tasks
- Create employee_leave_profiles
- Create leave_balance_ledgers
- Create leave_requests
- Create leave_request_days
- Create leave_approvals
- Create leave_adjustments
- Build leave request workflow
- Build leave approval workflow
- Build accrual run service
- Build leave to payroll mapping

## 13. EPIC-011 Banking and Reconciliation

### Feature 1. Bank setup and imports
Priority: P1
Dependencies: DEP-GL

#### Technical tasks
- Create bank_accounts
- Create bank_transactions
- Build bank account UI
- Build import workflow
- Build transaction normalization utilities

### Feature 2. Reconciliation
Priority: P1
Dependencies: DEP-BANKING

#### Technical tasks
- Create reconciliations
- Create reconciliation_lines
- Build reconciliation workspace
- Build match/unmatch workflow
- Build close reconciliation action

### Feature 3. Treasury controls
Priority: P2
Dependencies: DEP-BANKING

#### Technical tasks
- Create transfer requests
- Build transfer approval workflow
- Build cash position dashboard

## 14. EPIC-012 Products and Services Catalog

### Feature 1. Catalog item master
Priority: P1
Dependencies: DEP-GL

#### Technical tasks
- Create catalog_items
- Create catalog_item_categories
- Create catalog_item_types
- Create catalog_item_account_mappings
- Build item management UI

### Feature 2. Pricing
Priority: P1
Dependencies: DEP-CATALOG

#### Technical tasks
- Create catalog_item_prices
- Create customer_item_pricing
- Create contract_item_pricing
- Build pricing override workflow
- Build pricing history

## 15. EPIC-013 Contract Billing and Billing Intelligence

### Feature 1. Billing rules
Priority: P1
Dependencies: DEP-CATALOG, DEP-INTEGRATION

#### Technical tasks
- Create billing_rules
- Create contract_rate_cards
- Build billing rule UI
- Map service events to billable candidates
- Create invoice_item_sources

### Feature 2. Billing intelligence
Priority: P2
Dependencies: DEP-BILLING

#### Technical tasks
- Build billing leakage queries
- Build exception dashboard
- Build revenue and margin analysis prep

## 16. EPIC-014 Inventory and Asset Control

### Feature 1. Inventory foundation
Priority: P1
Dependencies: DEP-GL

#### Technical tasks
- Create inventory_items
- Create inventory_categories
- Create inventory_locations
- Create inventory_stock_balances
- Create inventory_vendor_items
- Create inventory_gl_mappings
- Build inventory item UI

### Feature 2. Stock movement
Priority: P1
Dependencies: DEP-INVENTORY

#### Technical tasks
- Create inventory_receipts
- Create inventory_receipt_lines
- Create inventory_transfers
- Create inventory_adjustments
- Build receive workflow
- Build issue workflow
- Build return workflow
- Build transfer workflow

### Feature 3. Asset control
Priority: P1
Dependencies: DEP-INVENTORY

#### Technical tasks
- Create equipment_assets
- Create equipment_assignments
- Create equipment_condition_logs
- Create equipment_incidents
- Build employee issue and return workflow
- Build loss/damage review workflow

## 17. EPIC-015 Reporting and Dashboards

### Feature 1. Standard financial reports
Priority: P1
Dependencies: DEP-GL, DEP-AR, DEP-AP, DEP-BANKING

#### Technical tasks
- Build trial balance query
- Build P&L query
- Build balance sheet query
- Build cash flow query
- Build export workflow

### Feature 2. Operational finance dashboards
Priority: P1
Dependencies: DEP-PAYROLL, DEP-BILLING, DEP-INVENTORY

#### Technical tasks
- Build executive dashboard
- Build payroll readiness dashboard
- Build AR/AP dashboard
- Build labor cost dashboard
- Build contract profitability summary

## 18. EPIC-016 Budgeting and Forecasting

### Feature 1. Budget versions
Priority: P2
Dependencies: DEP-GL

#### Technical tasks
- Create budget_versions
- Create budget_lines
- Create budget_approvals
- Build budget draft workflow
- Build approval and lock workflow

### Feature 2. Forecast versions
Priority: P2
Dependencies: DEP-BUDGET

#### Technical tasks
- Create forecast_versions
- Create forecast_lines
- Create scenario_inputs
- Build forecast workspace
- Build variance reporting

## 19. EPIC-017 Audit, Close, and Controls

### Feature 1. Audit logs
Priority: P0
Dependencies: DEP-TENANCY

#### Technical tasks
- Create audit_logs
- Build audit logging middleware
- Build sensitive action log service
- Build audit viewer

### Feature 2. Close management
Priority: P2
Dependencies: DEP-GL, DEP-BANKING, DEP-REPORTING

#### Technical tasks
- Create close_checklists
- Create close_tasks
- Build period lock UI
- Build close workflow

## 20. EPIC-018 QuickBooks Transition and Data Migration

### Feature 1. Opening balances
Priority: P1
Dependencies: DEP-GL

#### Technical tasks
- Define opening balance import template
- Create controlled import process
- Build validation workflow
- Create balancing review

### Feature 2. Legacy reference
Priority: P2
Dependencies: DEP-MIGRATION

#### Technical tasks
- Define historical reference strategy
- Create external reference tables
- Create legacy lookup UI

## 21. Recommended Build Order

### First 10 work items
1. EPIC-001 Feature 1 Tenant model
2. EPIC-002 Feature 1 Role and permission model
3. EPIC-017 Feature 1 Audit logs
4. EPIC-003 Feature 1 Chart of accounts
5. EPIC-003 Feature 2 Fiscal periods
6. EPIC-004 Feature 1 Integration control tables
7. EPIC-005 Feature 1 Employee master sync
8. EPIC-006 Feature 1 Approved time ingestion
9. EPIC-007 Feature 1 Customer invoicing
10. EPIC-009 Feature 1 Pay profiles and pay groups

## 22. GitHub Label Suggestions

Priority:
- priority:P0
- priority:P1
- priority:P2
- priority:P3

Type:
- type:schema
- type:backend
- type:frontend
- type:integration
- type:reporting
- type:security
- type:qa

Domain:
- domain:tenancy
- domain:gl
- domain:ar
- domain:ap
- domain:payroll
- domain:leave
- domain:banking
- domain:catalog
- domain:billing
- domain:inventory
- domain:reporting

## 23. Final Backlog Rule

Every finance-critical issue should explicitly state:
- tenant impact
- entity impact
- permission impact
- audit impact
- period lock impact
- integration impact
- rollback or reversal strategy
