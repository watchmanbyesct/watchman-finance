# Watchman Finance Table Dictionary and Relationship Map v1

## 1. Purpose
This document translates the Watchman Finance schema blueprint into a practical table dictionary and relationship map.

It is designed to answer five questions for each table:
1. What is the table for?
2. Which product owns it?
3. Where does its data come from?
4. What are its key relationships?
5. Is it editable by normal users or only through server-controlled actions?

This document assumes the following platform rules:
- All Watchman products are multi-tenant.
- Finance is multi-entity aware.
- Finance is the system of record for accounting, payroll, leave, inventory, budgeting, forecasting, and financial reporting.
- Sensitive finance mutations are handled through server-side actions only.

## 2. Ownership and Source Legend

### Product ownership
- **Launch-owned**: maintained primarily by Watchman Launch
- **Operations-owned**: maintained primarily by Watchman Operations
- **Finance-owned**: maintained primarily by Watchman Finance
- **Shared reference**: consumed by multiple products but governed by one primary owner

### Source classification
- **Launch-fed**: data originates in Watchman Launch
- **Operations-fed**: data originates in Watchman Operations
- **Finance-native**: data is created and maintained in Watchman Finance
- **Derived**: data is calculated, rolled up, or system-generated

### Mutation standard
- **User-editable**: can be edited in normal app workflows with permission
- **Workflow-editable**: editable through structured approval workflow only
- **Server-only**: created or changed only by server-side actions, jobs, or controlled services
- **System-derived**: not directly editable

## 3. Tenant and Platform Foundation

### 3.1 tenants
**Purpose:** Master tenant record for each customer organization using Watchman.

**Owner:** Finance platform/shared platform
**Source:** Finance-native
**Key columns:**
- id
- tenant_code
- legal_name
- display_name
- status
- timezone
- default_currency
- created_at

**Relationships:**
- one-to-many with entities
- one-to-many with tenant_users
- one-to-many with finance modules and settings tables

**Mutation standard:** Server-only for creation, workflow-editable for updates by platform admins

### 3.2 entities
**Purpose:** Legal entities or operating companies under a tenant.

**Owner:** Finance
**Source:** Finance-native
**Key columns:**
- id
- tenant_id
- entity_code
- legal_name
- trade_name
- ein
- state_of_registration
- status

**Relationships:**
- many-to-one with tenants
- one-to-many with bank_accounts
- one-to-many with fiscal_periods
- one-to-many with accounts
- one-to-many with payroll_companies or pay_groups
- one-to-many with invoices, bills, journal_entries

**Mutation standard:** Workflow-editable

### 3.3 tenant_users
**Purpose:** Links authenticated users to tenants.

**Owner:** Platform/shared
**Source:** Finance-native
**Relationships:**
- many-to-one with tenants
- many-to-one with auth users
- one-to-many with user_role_assignments

**Mutation standard:** Server-only for provisioning, workflow-editable for admin changes

### 3.4 roles
**Purpose:** Defines role templates within a tenant.

**Owner:** Finance/platform
**Source:** Finance-native
**Relationships:**
- one-to-many with role_permissions
- one-to-many with user_role_assignments

**Mutation standard:** Workflow-editable

### 3.5 permissions
**Purpose:** Catalog of permission keys used by all Watchman products.

**Owner:** Platform/shared
**Source:** Finance-native
**Mutation standard:** Server-only

### 3.6 user_role_assignments
**Purpose:** Assigns roles to users by tenant and, where needed, entity.

**Owner:** Finance/platform
**Source:** Finance-native
**Relationships:**
- many-to-one with tenant_users
- many-to-one with roles
- optionally many-to-one with entities

**Mutation standard:** Workflow-editable

## 4. Organizational Structure and Reference Tables

### 4.1 branches
**Purpose:** Branch or regional office records.

**Owner:** Launch shared reference
**Source:** Launch-fed
**Relationships:**
- many-to-one with tenants
- optionally many-to-one with entities
- one-to-many with employees, locations, cost_centers

**Mutation standard:** User-editable in Launch, read-only in Finance

### 4.2 departments
**Purpose:** Department structure such as Operations, Training, Administration.

**Owner:** Launch shared reference
**Source:** Launch-fed
**Relationships:**
- many-to-one with tenants
- optionally many-to-one with entities
- one-to-many with employees, budgets, journal allocations

**Mutation standard:** User-editable in Launch, read-only in Finance

### 4.3 locations
**Purpose:** Physical or logical sites including branch offices, posts, warehouses, and training sites.

**Owner:** Shared reference
**Source:** Launch-fed or Finance-native depending on type
**Relationships:**
- many-to-one with tenants
- optionally many-to-one with entities
- one-to-many with inventory_locations, customer_sites, operations data

**Mutation standard:** Workflow-editable

### 4.4 cost_centers
**Purpose:** Reporting and budget structure for financial accountability.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with tenants
- optionally many-to-one with entities
- linked to budgets, forecast lines, journal allocations, payroll costing

**Mutation standard:** Workflow-editable

## 5. Employee and Workforce Financial Tables

### 5.1 employees
**Purpose:** Reference mirror of employee master records needed for finance workflows.

**Owner:** Launch primary, Finance reference
**Source:** Launch-fed
**Key columns:**
- id
- tenant_id
- launch_employee_id
- entity_id
- branch_id
- department_id
- legal_name
- status
- hire_date
- termination_date

**Relationships:**
- one-to-one or one-to-many mapping with Launch employee records
- one-to-many with employee_pay_profiles
- one-to-many with employee_tax_profiles
- one-to-many with leave balances and payroll run items

**Mutation standard:** Server-only sync from Launch except finance-specific extension fields

### 5.2 employee_pay_profiles
**Purpose:** Stores payroll-related employee settings.

**Owner:** Finance
**Source:** Finance-native with some Launch-fed references
**Key columns:**
- id
- tenant_id
- employee_id
- entity_id
- pay_group_id
- pay_type
- base_rate
- overtime_rule_id
- default_cost_center_id
- active_from
- active_to

**Relationships:**
- many-to-one with employees
- many-to-one with pay_groups
- one-to-many with payroll_run_items

**Mutation standard:** Workflow-editable

### 5.3 employee_tax_profiles
**Purpose:** Stores employee payroll tax setup and withholding elections.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with employees
- linked to payroll calculations and tax liabilities

**Mutation standard:** Workflow-editable with strong audit trail

### 5.4 employee_bank_accounts
**Purpose:** Secure store for direct deposit setup.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with employees
- linked to ACH batches and payroll disbursement workflows

**Mutation standard:** Workflow-editable for enrollment, server-only for sensitive transmission status changes

### 5.5 employee_leave_profiles
**Purpose:** Defines an employee’s leave policy assignment and balance controls.

**Owner:** Finance
**Source:** Finance-native with Launch eligibility inputs
**Relationships:**
- many-to-one with employees
- many-to-one with leave_policies
- one-to-many with leave_balance_ledgers
- one-to-many with leave_requests

**Mutation standard:** Workflow-editable

## 6. Payroll Core

### 6.1 pay_groups
**Purpose:** Defines payroll groups by frequency and processing calendar.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with entities
- one-to-many with employee_pay_profiles
- one-to-many with pay_periods
- one-to-many with payroll_runs

**Mutation standard:** Workflow-editable

### 6.2 pay_periods
**Purpose:** Calendarized pay periods for each pay group.

**Owner:** Finance
**Source:** Finance-native or server-generated
**Relationships:**
- many-to-one with pay_groups
- one-to-many with payroll_runs

**Mutation standard:** Server-only generation, workflow-editable for controlled exceptions

### 6.3 payroll_runs
**Purpose:** Header record for each payroll cycle.

**Owner:** Finance
**Source:** Finance-native
**Key columns:**
- id
- tenant_id
- entity_id
- pay_group_id
- pay_period_id
- pay_date
- status
- total_gross
- total_net
- total_taxes

**Relationships:**
- many-to-one with pay_groups
- many-to-one with pay_periods
- one-to-many with payroll_run_items
- one-to-many with payroll_disbursements
- one-to-many with tax_liabilities
- one-to-many with journal_entries

**Mutation standard:** Server-only for creation, calculation, lock, finalize, and reopen

### 6.4 payroll_run_items
**Purpose:** Employee-level payroll calculation detail within a payroll run.

**Owner:** Finance
**Source:** Derived from Operations-fed time and Finance-native rules
**Relationships:**
- many-to-one with payroll_runs
- many-to-one with employees
- linked to earnings, deductions, and taxes

**Mutation standard:** Server-only except controlled adjustment workflow

### 6.5 payroll_earnings_lines
**Purpose:** Earnings components such as regular, overtime, holiday, sick, vacation.

**Owner:** Finance
**Source:** Derived
**Relationships:**
- many-to-one with payroll_run_items
- many-to-one with pay_codes

**Mutation standard:** Server-only

### 6.6 payroll_deduction_lines
**Purpose:** Deduction components such as garnishments, benefits, and voluntary deductions.

**Owner:** Finance
**Source:** Derived and Finance-native
**Relationships:**
- many-to-one with payroll_run_items
- many-to-one with deduction_codes

**Mutation standard:** Server-only

### 6.7 payroll_tax_lines
**Purpose:** Employee and employer payroll tax calculation detail.

**Owner:** Finance
**Source:** Derived
**Relationships:**
- many-to-one with payroll_run_items
- many-to-one with tax_codes

**Mutation standard:** Server-only

### 6.8 payroll_disbursements
**Purpose:** Payment outputs for each payroll run, including direct deposit, check, and exceptions.

**Owner:** Finance
**Source:** Derived
**Relationships:**
- many-to-one with payroll_runs
- many-to-one with employees
- one-to-many with ach_batches or payment output files

**Mutation standard:** Server-only

### 6.9 pay_codes
**Purpose:** Catalog of pay types used in payroll and leave mapping.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- referenced by payroll earnings, leave mappings, budgeting, and reporting

**Mutation standard:** Workflow-editable

### 6.10 deduction_codes
**Purpose:** Catalog of deduction types.

**Owner:** Finance
**Source:** Finance-native
**Mutation standard:** Workflow-editable

## 7. Leave and Accrual Management

### 7.1 leave_types
**Purpose:** Catalog of leave categories such as sick, vacation, personal, PTO, unpaid.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- one-to-many with leave_policies
- one-to-many with leave_requests
- one-to-many with leave_pay_code_mappings

**Mutation standard:** Workflow-editable

### 7.2 leave_policies
**Purpose:** Defines leave earning and usage rules.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with tenants and optional entities
- many-to-one with leave_types
- one-to-many with employee_leave_profiles
- one-to-many with leave_accrual_rules

**Mutation standard:** Workflow-editable

### 7.3 leave_accrual_rules
**Purpose:** Rule engine definitions for accruals by hours worked, pay period, anniversary, or grants.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with leave_policies

**Mutation standard:** Workflow-editable

### 7.4 leave_balance_ledgers
**Purpose:** Running ledger of accruals, usage, adjustments, and carryovers.

**Owner:** Finance
**Source:** Derived and Finance-native adjustments
**Relationships:**
- many-to-one with employee_leave_profiles
- many-to-one with leave_types
- optionally linked to payroll_runs or leave_requests

**Mutation standard:** Server-only for accrual and usage posting, workflow-editable for approved adjustments

### 7.5 leave_requests
**Purpose:** Employee requests for leave time.

**Owner:** Finance
**Source:** Finance-native user workflow
**Relationships:**
- many-to-one with employees
- many-to-one with leave_types
- optionally linked to operations schedules

**Mutation standard:** Workflow-editable

### 7.6 leave_approvals
**Purpose:** Approval records for leave requests.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with leave_requests
- many-to-one with approver user records

**Mutation standard:** Workflow-editable

### 7.7 leave_pay_code_mappings
**Purpose:** Maps leave types to payroll earning codes.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with leave_types
- many-to-one with pay_codes

**Mutation standard:** Workflow-editable

## 8. Accounting Core

### 8.1 fiscal_periods
**Purpose:** Defines open and closed accounting periods.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with entities
- one-to-many with journal_entries, invoices, bills, reconciliations

**Mutation standard:** Server-only for open/close status changes, workflow-editable for setup

### 8.2 accounts
**Purpose:** Chart of accounts by entity.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with entities
- one-to-many with journal_entry_lines
- one-to-many with catalog_item_account_mappings

**Mutation standard:** Workflow-editable with controlled deactivation rules

### 8.3 journal_entries
**Purpose:** Journal entry header for all accounting postings.

**Owner:** Finance
**Source:** Finance-native and system-derived
**Relationships:**
- many-to-one with entities
- many-to-one with fiscal_periods
- one-to-many with journal_entry_lines
- optionally linked to payroll_runs, invoices, bills, reconciliations

**Mutation standard:** Server-only for posting, reversal, and lock; workflow-editable for draft preparation if allowed

### 8.4 journal_entry_lines
**Purpose:** Debit and credit lines for journal entries.

**Owner:** Finance
**Source:** Derived or Finance-native draft
**Relationships:**
- many-to-one with journal_entries
- many-to-one with accounts
- optionally many-to-one with cost_centers, branches, departments, customers, vendors

**Mutation standard:** Server-only once posted

### 8.5 account_balances
**Purpose:** Materialized or snapshot balances by account and period.

**Owner:** Finance
**Source:** Derived
**Relationships:**
- many-to-one with accounts
- many-to-one with fiscal_periods

**Mutation standard:** System-derived

## 9. Accounts Receivable

### 9.1 customers
**Purpose:** Customer master for billing and AR.

**Owner:** Shared reference, Launch primary with Finance extensions
**Source:** Launch-fed with Finance-native billing metadata
**Relationships:**
- many-to-one with tenants
- one-to-many with customer_sites
- one-to-many with invoices
- one-to-many with customer_item_pricing

**Mutation standard:** Sync from Launch for base record, workflow-editable in Finance for billing fields

### 9.2 customer_sites
**Purpose:** Site-level billing and service delivery records for customers.

**Owner:** Shared reference
**Source:** Launch-fed and Operations-fed
**Relationships:**
- many-to-one with customers
- one-to-many with contracts, service delivery records, invoice lines

**Mutation standard:** Workflow-editable

### 9.3 contracts
**Purpose:** Commercial agreement structure used for pricing, billing, and profitability analysis.

**Owner:** Shared, Finance commercial ownership
**Source:** Launch-fed or Finance-native
**Relationships:**
- many-to-one with customers
- many-to-one with customer_sites
- one-to-many with contract_item_pricing
- one-to-many with invoices
- one-to-many with billable_events

**Mutation standard:** Workflow-editable

### 9.4 invoices
**Purpose:** AR invoice header.

**Owner:** Finance
**Source:** Finance-native and derived from delivery data
**Relationships:**
- many-to-one with customers
- optionally many-to-one with contracts and customer_sites
- one-to-many with invoice_lines
- one-to-many with invoice_payments
- one-to-many with journal_entries

**Mutation standard:** Server-only for issue, void, post, and credit workflows; workflow-editable in draft state

### 9.5 invoice_lines
**Purpose:** Line-level detail on invoices.

**Owner:** Finance
**Source:** Derived from catalog, contracts, and service delivery records
**Relationships:**
- many-to-one with invoices
- many-to-one with catalog_items
- optionally linked to service_delivery_records or billable_events

**Mutation standard:** Workflow-editable in draft, server-only once issued

### 9.6 invoice_payments
**Purpose:** Payments applied against invoices.

**Owner:** Finance
**Source:** Finance-native or payment adapter-fed
**Relationships:**
- many-to-one with invoices
- many-to-one with payment_receipts

**Mutation standard:** Server-only for application and reversal

### 9.7 credit_memos
**Purpose:** Reductions or offsets applied to customer balances.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with customers
- optionally linked to invoices

**Mutation standard:** Server-only for issue and posting

## 10. Accounts Payable

### 10.1 vendors
**Purpose:** Vendor master for AP and purchasing.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- one-to-many with bills
- one-to-many with inventory_vendor_items

**Mutation standard:** Workflow-editable

### 10.2 bills
**Purpose:** AP bill header.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with vendors
- one-to-many with bill_lines
- one-to-many with vendor_payments
- one-to-many with journal_entries

**Mutation standard:** Workflow-editable in draft, server-only for post and void actions

### 10.3 bill_lines
**Purpose:** Line detail for expenses, inventory receipts, and service purchases.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with bills
- optionally linked to catalog_items, inventory receipts, accounts, cost_centers

**Mutation standard:** Workflow-editable in draft, server-only once posted

### 10.4 vendor_payments
**Purpose:** Records of payments made against bills.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with bills
- many-to-one with bank_accounts

**Mutation standard:** Server-only for issue, application, and reversal

## 11. Banking and Reconciliation

### 11.1 bank_accounts
**Purpose:** Internal record of operating, payroll, tax, and reserve bank accounts.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with entities
- one-to-many with bank_transactions
- one-to-many with reconciliations
- one-to-many with vendor_payments and payroll funding

**Mutation standard:** Workflow-editable with strong controls

### 11.2 bank_transactions
**Purpose:** Imported or manually entered bank activity.

**Owner:** Finance
**Source:** Finance-native, imported, or bank adapter-fed
**Relationships:**
- many-to-one with bank_accounts
- optionally linked to invoices, bills, payroll runs, journal_entries

**Mutation standard:** Server-only for import and matching status, workflow-editable for classification review

### 11.3 reconciliations
**Purpose:** Bank reconciliation header for each statement period.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with bank_accounts
- one-to-many with reconciliation_lines

**Mutation standard:** Server-only for close/finalize, workflow-editable in open state

### 11.4 reconciliation_lines
**Purpose:** Matched or unmatched transaction detail inside a reconciliation.

**Owner:** Finance
**Source:** Derived and workflow-driven
**Relationships:**
- many-to-one with reconciliations
- many-to-one with bank_transactions

**Mutation standard:** Workflow-editable while reconciliation is open

## 12. Tax and Compliance

### 12.1 tax_codes
**Purpose:** Catalog of tax types used in payroll, sales, and other finance areas.

**Owner:** Finance
**Source:** Finance-native
**Mutation standard:** Workflow-editable with change history

### 12.2 tax_rates
**Purpose:** Effective-dated tax rate records.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with tax_codes

**Mutation standard:** Workflow-editable

### 12.3 tax_liabilities
**Purpose:** Aggregated liabilities created through payroll and other tax events.

**Owner:** Finance
**Source:** Derived
**Relationships:**
- many-to-one with entities
- optionally many-to-one with payroll_runs
- many-to-one with tax_codes

**Mutation standard:** Server-only

### 12.4 tax_filing_periods
**Purpose:** Calendar and status tracker for required filings and deposits.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with entities
- many-to-one with tax_codes
- one-to-many with tax_liabilities

**Mutation standard:** Workflow-editable with server-controlled status changes

### 12.5 compliance_requirements
**Purpose:** Registry of statutory and operational compliance obligations by tenant, entity, or jurisdiction.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- linked to entities, payroll settings, and compliance task workflows

**Mutation standard:** Workflow-editable

## 13. Products and Services Management

### 13.1 catalog_items
**Purpose:** Master list of products, services, fees, bundles, and other billable items.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- one-to-many with catalog_item_prices
- one-to-many with catalog_item_account_mappings
- one-to-many with invoice_lines
- one-to-many with contract_item_pricing
- one-to-many with inventory records where relevant

**Mutation standard:** Workflow-editable

### 13.2 catalog_item_categories
**Purpose:** Organizes items into service lines or product categories.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- one-to-many with catalog_items

**Mutation standard:** Workflow-editable

### 13.3 catalog_item_prices
**Purpose:** Default pricing by item and effective date.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with catalog_items

**Mutation standard:** Workflow-editable

### 13.4 customer_item_pricing
**Purpose:** Customer-specific pricing overrides.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with customers
- many-to-one with catalog_items

**Mutation standard:** Workflow-editable

### 13.5 contract_item_pricing
**Purpose:** Contract-level price rules.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with contracts
- many-to-one with catalog_items

**Mutation standard:** Workflow-editable

### 13.6 catalog_item_account_mappings
**Purpose:** Maps items to revenue, expense, and asset accounts.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with catalog_items
- many-to-one with accounts

**Mutation standard:** Workflow-editable

### 13.7 service_delivery_records
**Purpose:** Records of completed service delivery used for billing and profitability.

**Owner:** Operations primary, Finance billing reference
**Source:** Operations-fed
**Relationships:**
- linked to customer_sites, contracts, employees, and catalog_items
- one-to-many with invoice_item_sources

**Mutation standard:** Server-only sync from Operations

### 13.8 billable_events
**Purpose:** Discrete events that create billable activity beyond normal shift work.

**Owner:** Operations primary, Finance commercial reference
**Source:** Operations-fed
**Relationships:**
- linked to contracts, customer_sites, catalog_items, and invoice_lines

**Mutation standard:** Server-only sync from Operations

## 14. Inventory and Asset Control

### 14.1 inventory_items
**Purpose:** Master records for stocked inventory items.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- one-to-many with inventory_stock_balances
- one-to-many with inventory_receipt_lines
- one-to-many with inventory_adjustments
- optionally linked to catalog_items

**Mutation standard:** Workflow-editable

### 14.2 inventory_locations
**Purpose:** Stocking locations such as warehouse, branch, training room, or vehicle stock.

**Owner:** Finance
**Source:** Finance-native with shared location references
**Relationships:**
- one-to-many with inventory_stock_balances
- one-to-many with transfers and counts

**Mutation standard:** Workflow-editable

### 14.3 inventory_stock_balances
**Purpose:** Current on-hand quantity by item and location.

**Owner:** Finance
**Source:** Derived
**Relationships:**
- many-to-one with inventory_items
- many-to-one with inventory_locations

**Mutation standard:** System-derived

### 14.4 inventory_receipts
**Purpose:** Header record for inventory receipts.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with vendors
- one-to-many with inventory_receipt_lines
- optionally many-to-one with bills

**Mutation standard:** Workflow-editable in draft, server-only once posted

### 14.5 inventory_receipt_lines
**Purpose:** Quantity and cost detail for inventory received.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with inventory_receipts
- many-to-one with inventory_items

**Mutation standard:** Workflow-editable in draft, server-only once posted

### 14.6 inventory_transfers
**Purpose:** Moves inventory between locations.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- linked to from and to inventory_locations
- one-to-many with transfer lines if normalized further

**Mutation standard:** Workflow-editable with server posting

### 14.7 inventory_adjustments
**Purpose:** Gains, losses, shrinkage, and manual corrections.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with inventory_items
- many-to-one with inventory_locations
- optionally linked to journal_entries

**Mutation standard:** Server-only for posting; workflow-editable request stage

### 14.8 equipment_assets
**Purpose:** Individually tracked equipment and controlled assets.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- optionally linked to inventory_items
- one-to-many with equipment_assignments
- one-to-many with equipment_condition_logs

**Mutation standard:** Workflow-editable

### 14.9 equipment_assignments
**Purpose:** Assignment of gear to employees, sites, or vehicles.

**Owner:** Shared workflow, Finance record ownership
**Source:** Launch-fed, Operations-fed, Finance-native
**Relationships:**
- many-to-one with equipment_assets
- many-to-one with employees or locations

**Mutation standard:** Workflow-editable

### 14.10 employee_item_issues
**Purpose:** Records of stock items issued to employees.

**Owner:** Shared workflow, Finance record ownership
**Source:** Launch-fed and Finance-native
**Relationships:**
- many-to-one with employees
- many-to-one with inventory_items
- optionally linked to onboarding workflow or return events

**Mutation standard:** Workflow-editable with server posting to balances

## 15. Budgeting and Forecasting

### 15.1 budgets
**Purpose:** Budget header with version, scope, and approval status.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with tenants and optional entities
- one-to-many with budget_lines

**Mutation standard:** Workflow-editable, server-only once locked

### 15.2 budget_lines
**Purpose:** Detailed budget values by account, department, branch, cost center, or time period.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- many-to-one with budgets
- many-to-one with accounts
- optionally linked to departments, branches, cost_centers, catalog_items

**Mutation standard:** Workflow-editable while draft or revision state is open

### 15.3 forecasts
**Purpose:** Forecast header records including version and scenario type.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- one-to-many with forecast_lines

**Mutation standard:** Workflow-editable

### 15.4 forecast_lines
**Purpose:** Detailed forecast values and drivers.

**Owner:** Finance
**Source:** Finance-native and derived
**Relationships:**
- many-to-one with forecasts
- linked to accounts, cost centers, contracts, or catalog items depending on model

**Mutation standard:** Workflow-editable with derived refresh support

### 15.5 forecast_driver_inputs
**Purpose:** Stores driver variables such as expected headcount, rate changes, contract starts, or payroll trend assumptions.

**Owner:** Finance
**Source:** Finance-native and integrated references
**Relationships:**
- many-to-one with forecasts

**Mutation standard:** Workflow-editable

## 16. Reporting and Snapshots

### 16.1 report_definitions
**Purpose:** Saves reusable report configurations.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- linked to tenants and users

**Mutation standard:** User-editable with permission

### 16.2 report_runs
**Purpose:** Stores generated report job metadata.

**Owner:** Finance
**Source:** Derived
**Relationships:**
- linked to report_definitions

**Mutation standard:** Server-only

### 16.3 kpi_snapshots
**Purpose:** Periodic snapshots of important financial and operational KPIs.

**Owner:** Finance
**Source:** Derived
**Relationships:**
- linked to tenants, entities, and optionally branches or cost centers

**Mutation standard:** System-derived

### 16.4 leave_liability_snapshots
**Purpose:** Snapshot of accrued leave liability for reporting and accounting.

**Owner:** Finance
**Source:** Derived
**Relationships:**
- linked to entities, employees, leave types

**Mutation standard:** System-derived

## 17. Integration and Audit Tables

### 17.1 integration_sync_jobs
**Purpose:** Tracks sync jobs from Launch, Operations, banks, or payment adapters.

**Owner:** Shared platform/Finance
**Source:** Derived and Finance-native
**Relationships:**
- linked to source systems and sync logs

**Mutation standard:** Server-only

### 17.2 integration_sync_logs
**Purpose:** Detailed row-level or event-level sync logging.

**Owner:** Shared platform/Finance
**Source:** Derived
**Relationships:**
- many-to-one with integration_sync_jobs

**Mutation standard:** Server-only

### 17.3 source_record_links
**Purpose:** Maps source system record IDs to Finance record IDs.

**Owner:** Shared platform/Finance
**Source:** Derived
**Relationships:**
- used across employee, customer, service delivery, and time sync workflows

**Mutation standard:** Server-only

### 17.4 audit_logs
**Purpose:** Immutable audit trail for sensitive changes and workflow events.

**Owner:** Finance/platform
**Source:** Derived and Finance-native
**Relationships:**
- linked to tenant, entity, actor, table name, record ID, and action type

**Mutation standard:** Server-only, append-only

### 17.5 document_attachments
**Purpose:** Links stored files to finance records.

**Owner:** Finance
**Source:** Finance-native
**Relationships:**
- polymorphic association to invoices, bills, payroll runs, journal entries, reconciliations, leave requests, inventory events

**Mutation standard:** Workflow-editable with storage policy controls

## 18. Core Relationship Map

## A. Tenant hierarchy
- tenants -> entities
- tenants -> tenant_users
- tenants -> roles
- roles -> user_role_assignments

## B. Workforce to payroll
- employees -> employee_pay_profiles
- employees -> employee_tax_profiles
- employees -> employee_bank_accounts
- pay_groups -> pay_periods -> payroll_runs -> payroll_run_items
- payroll_run_items -> payroll_earnings_lines
- payroll_run_items -> payroll_deduction_lines
- payroll_run_items -> payroll_tax_lines
- payroll_runs -> payroll_disbursements
- payroll_runs -> tax_liabilities
- payroll_runs -> journal_entries

## C. Leave to payroll
- leave_types -> leave_policies -> employee_leave_profiles
- employee_leave_profiles -> leave_balance_ledgers
- employees -> leave_requests -> leave_approvals
- leave_types -> leave_pay_code_mappings -> pay_codes
- approved leave usage -> payroll_earnings_lines and leave_balance_ledgers

## D. Accounting core
- entities -> fiscal_periods
- entities -> accounts
- fiscal_periods -> journal_entries -> journal_entry_lines
- accounts -> account_balances

## E. AR and commercial flow
- customers -> customer_sites
- customers -> contracts
- contracts -> contract_item_pricing
- catalog_items -> customer_item_pricing
- customers -> invoices -> invoice_lines -> invoice_payments
- service_delivery_records and billable_events -> invoice_lines
- invoices -> journal_entries

## F. AP and inventory
- vendors -> bills -> bill_lines -> vendor_payments
- vendors -> inventory_receipts -> inventory_receipt_lines
- inventory_items -> inventory_stock_balances
- inventory_receipts -> inventory_stock_balances
- inventory_adjustments -> journal_entries
- equipment_assets -> equipment_assignments

## G. Planning and reporting
- budgets -> budget_lines
- forecasts -> forecast_lines -> forecast_driver_inputs
- report_definitions -> report_runs
- derived jobs -> kpi_snapshots and leave_liability_snapshots

## 19. Tables that must be server-controlled from day one

The following tables should never accept unrestricted client-side mutation:
- payroll_runs
- payroll_run_items
- payroll_earnings_lines
- payroll_deduction_lines
- payroll_tax_lines
- payroll_disbursements
- tax_liabilities
- journal_entries
- journal_entry_lines once posted
- account_balances
- invoices once issued
- invoice_payments
- credit_memos
- vendor_payments
- bank_transactions import state
- reconciliations finalization
- leave_balance_ledgers accrual postings
- inventory_adjustments posting
- inventory_stock_balances
- integration_sync_jobs
- integration_sync_logs
- source_record_links
- audit_logs

## 20. Tables that may be draft-editable but only within workflow controls

- entities
- roles
- cost_centers
- employee_pay_profiles
- employee_tax_profiles
- employee_leave_profiles
- leave_requests
- leave_policies
- pay_groups
- accounts
- contracts
- invoices in draft
- bills in draft
- bank_accounts
- catalog_items
- catalog_item_prices
- contract_item_pricing
- budgets
- forecasts
- equipment_assignments
- employee_item_issues

## 21. Recommended first migration group

The first migration group should include only the tables needed to establish platform control and finance backbone:

### Group 1: platform and tenant foundation
- tenants
- entities
- tenant_users
- roles
- permissions
- user_role_assignments
- branches
- departments
- locations
- cost_centers
- audit_logs

### Group 2: accounting core
- fiscal_periods
- accounts
- journal_entries
- journal_entry_lines
- account_balances

### Group 3: workforce finance foundation
- employees
- employee_pay_profiles
- employee_tax_profiles
- employee_bank_accounts
- pay_groups
- pay_periods

### Group 4: AR and AP base
- customers
- customer_sites
- contracts
- vendors
- invoices
- invoice_lines
- bills
- bill_lines

## 22. Recommended second migration group
- payroll_runs
- payroll_run_items
- payroll_earnings_lines
- payroll_deduction_lines
- payroll_tax_lines
- payroll_disbursements
- tax_codes
- tax_rates
- tax_liabilities
- tax_filing_periods
- leave_types
- leave_policies
- leave_accrual_rules
- employee_leave_profiles
- leave_balance_ledgers
- leave_requests
- leave_approvals
- leave_pay_code_mappings

## 23. Recommended third migration group
- catalog_items
- catalog_item_categories
- catalog_item_prices
- customer_item_pricing
- contract_item_pricing
- catalog_item_account_mappings
- service_delivery_records
- billable_events
- inventory_items
- inventory_locations
- inventory_stock_balances
- inventory_receipts
- inventory_receipt_lines
- inventory_adjustments
- equipment_assets
- equipment_assignments
- employee_item_issues

## 24. Recommended fourth migration group
- bank_accounts
- bank_transactions
- reconciliations
- reconciliation_lines
- budgets
- budget_lines
- forecasts
- forecast_lines
- forecast_driver_inputs
- report_definitions
- report_runs
- kpi_snapshots
- leave_liability_snapshots
- integration_sync_jobs
- integration_sync_logs
- source_record_links
- document_attachments

## 25. Final guidance
This table dictionary is meant to be used as the bridge between product planning and actual implementation.

The next document should be the **server action and workflow map**, which identifies:
- which actions create or update each table
- which actions are Launch sync actions
- which actions are Operations sync actions
- which actions are Finance-native workflows
- which actions require approval, locking, posting, or reversal rules
