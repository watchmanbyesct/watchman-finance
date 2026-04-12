# Watchman Finance Supabase Schema Blueprint v1

## 1. Purpose

This document defines the first database blueprint for Watchman Finance.

It is designed for:
- Supabase Postgres
- multi-tenant architecture
- multi-entity accounting support
- integration with Watchman Launch and Watchman Operations
- server-controlled finance workflows
- future commercialization without major rework

This is not a final migration script. It is the schema foundation and design standard that should guide migrations, edge functions, and frontend modules.

## 2. Core Architectural Rules

### 2.1 Multi-tenant by default
Every tenant-owned finance table must include:
- `tenant_id`
- created and updated timestamps
- actor metadata where appropriate
- immutable primary key
- soft status or lifecycle field where needed

### 2.2 Multi-entity ready
Finance tables that affect books, payroll, banking, or reporting should also include:
- `entity_id`

This allows one tenant to operate multiple legal entities.

### 2.3 Server-controlled finance mutations
The frontend should not directly perform sensitive writes for:
- payroll finalization
- journal posting
- invoice posting
- bill posting
- reconciliation completion
- period close
- leave balance adjustments
- inventory adjustments
- ACH batch creation
- tax liability creation

These should run through edge functions or backend service actions.

### 2.4 Event-integrated ecosystem
Launch and Operations remain source systems for parts of the lifecycle.
Finance consumes and transforms operational data into financial records.

### 2.5 Auditability
Critical tables should support:
- who created the record
- who approved the record
- status transitions
- immutable posting references
- correction entries instead of destructive edits

## 3. Naming Standards

### 3.1 Table naming
Use plural snake_case table names.

Examples:
- `tenants`
- `entities`
- `journal_entries`
- `payroll_runs`

### 3.2 Primary keys
Use UUIDs for all primary keys.

### 3.3 Foreign keys
Use explicit foreign keys with `_id` suffix.

### 3.4 Timestamps
Use:
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### 3.5 Status fields
Use explicit status enums or constrained text fields, not ambiguous booleans.

## 4. Schema Domains

Recommended schema organization:
- `public` for app tables if you want simplicity early
- optional future split into domain schemas such as:
  - `platform`
  - `finance`
  - `payroll`
  - `inventory`
  - `reporting`

For v1, using `public` is acceptable if naming is disciplined.

## 5. Tenant and Platform Foundation

## 5.1 tenants
Purpose: top-level customer or organization boundary.

Core columns:
- `id uuid pk`
- `name text`
- `slug text unique`
- `status text`
- `timezone text`
- `default_currency text`
- `primary_contact_name text`
- `primary_contact_email text`
- `created_at timestamptz`
- `updated_at timestamptz`

## 5.2 tenant_users
Purpose: membership of authenticated users inside tenants.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk -> tenants.id`
- `auth_user_id uuid`
- `status text`
- `default_entity_id uuid null`
- `created_at timestamptz`
- `updated_at timestamptz`

Constraints:
- unique on `tenant_id, auth_user_id`

## 5.3 tenant_products
Purpose: module entitlement by tenant.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `product_code text`
- `is_enabled boolean`
- `settings jsonb`
- `created_at`
- `updated_at`

Examples:
- finance
- payroll
- inventory
- budgeting
- forecasting

## 5.4 roles
Purpose: tenant-scoped role definitions.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `code text`
- `name text`
- `description text`
- `is_system boolean`

## 5.5 permissions
Purpose: platform permission catalog.

Core columns:
- `id uuid pk`
- `code text unique`
- `name text`
- `description text`
- `module_code text`

## 5.6 role_permissions
Purpose: map roles to permissions.

Core columns:
- `id uuid pk`
- `role_id uuid fk`
- `permission_id uuid fk`

## 5.7 user_role_assignments
Purpose: assign roles to tenant users.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `tenant_user_id uuid fk`
- `role_id uuid fk`
- `entity_id uuid null fk`
- `created_at`

## 6. Legal Entity and Organization Structure

## 6.1 entities
Purpose: legal entities within a tenant.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `name text`
- `legal_name text`
- `entity_code text`
- `ein text null`
- `state_of_formation text null`
- `status text`
- `base_currency text`
- `created_at`
- `updated_at`

## 6.2 branches
Purpose: operating branch structure.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `name text`
- `code text`
- `status text`

## 6.3 departments
Purpose: department structure for reporting and budgeting.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `name text`
- `code text`
- `status text`

## 6.4 locations
Purpose: office, warehouse, or service locations.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `branch_id uuid null fk`
- `name text`
- `location_type text`
- `address_line_1 text`
- `city text`
- `state text`
- `postal_code text`

## 6.5 cost_centers
Purpose: financial tracking by location, department, contract, or category.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `name text`
- `code text`
- `status text`

## 7. Accounting Foundation

## 7.1 fiscal_periods
Purpose: accounting period management.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `period_name text`
- `period_start date`
- `period_end date`
- `status text`
- `closed_at timestamptz null`
- `closed_by uuid null`

Statuses:
- open
- soft_locked
- closed

## 7.2 accounts
Purpose: chart of accounts.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `account_number text`
- `account_name text`
- `account_type text`
- `account_subtype text`
- `normal_balance text`
- `parent_account_id uuid null fk`
- `is_active boolean`
- `is_system boolean`
- `created_at`
- `updated_at`

Examples of account_type:
- asset
- liability
- equity
- revenue
- expense
- cogs

## 7.3 journal_entries
Purpose: general journal header.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `entry_number text`
- `entry_date date`
- `period_id uuid fk`
- `source_module text`
- `source_reference_type text null`
- `source_reference_id uuid null`
- `memo text`
- `status text`
- `posted_at timestamptz null`
- `posted_by uuid null`
- `reversal_of_entry_id uuid null fk`
- `created_at`
- `updated_at`

Statuses:
- draft
- posted
- reversed

## 7.4 journal_entry_lines
Purpose: line-level debits and credits.

Core columns:
- `id uuid pk`
- `journal_entry_id uuid fk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `account_id uuid fk`
- `description text`
- `debit numeric(14,2) default 0`
- `credit numeric(14,2) default 0`
- `branch_id uuid null`
- `department_id uuid null`
- `location_id uuid null`
- `cost_center_id uuid null`
- `customer_id uuid null`
- `vendor_id uuid null`
- `employee_id uuid null`

## 7.5 account_balances
Purpose: cached or summarized balances for reporting.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `account_id uuid fk`
- `period_id uuid fk`
- `opening_balance numeric(14,2)`
- `debit_total numeric(14,2)`
- `credit_total numeric(14,2)`
- `closing_balance numeric(14,2)`
- unique on `tenant_id, entity_id, account_id, period_id`

## 8. Customers, Contracts, and Receivables

## 8.1 customers
Purpose: client master record for billing.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `customer_code text`
- `name text`
- `legal_name text null`
- `status text`
- `billing_email text null`
- `billing_phone text null`
- `default_terms_code text null`
- `default_ar_account_id uuid null`
- `created_at`
- `updated_at`

## 8.2 customer_sites
Purpose: billable service sites.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `customer_id uuid fk`
- `site_code text`
- `site_name text`
- `address_line_1 text`
- `city text`
- `state text`
- `postal_code text`
- `status text`

## 8.3 contracts
Purpose: commercial agreement structure.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `customer_id uuid fk`
- `contract_number text`
- `name text`
- `start_date date`
- `end_date date null`
- `status text`
- `billing_frequency text`
- `default_terms_code text null`
- `created_at`
- `updated_at`

## 8.4 invoices
Purpose: AR invoice header.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `customer_id uuid fk`
- `contract_id uuid null fk`
- `invoice_number text`
- `invoice_date date`
- `due_date date`
- `status text`
- `subtotal numeric(14,2)`
- `tax_total numeric(14,2)`
- `total_amount numeric(14,2)`
- `balance_due numeric(14,2)`
- `currency_code text`
- `posted_journal_entry_id uuid null`
- `created_at`
- `updated_at`

Statuses:
- draft
- approved
- issued
- partially_paid
- paid
- void

## 8.5 invoice_lines
Purpose: itemized invoice detail.

Core columns:
- `id uuid pk`
- `invoice_id uuid fk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `catalog_item_id uuid null`
- `description text`
- `quantity numeric(14,4)`
- `unit_price numeric(14,4)`
- `line_amount numeric(14,2)`
- `tax_code_id uuid null`
- `revenue_account_id uuid null`
- `customer_site_id uuid null`
- `service_period_start date null`
- `service_period_end date null`
- `source_reference_type text null`
- `source_reference_id uuid null`

## 8.6 invoice_payments
Purpose: payments applied to invoices.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `invoice_id uuid fk`
- `payment_id uuid fk`
- `applied_amount numeric(14,2)`
- `applied_at timestamptz`

## 8.7 customer_payments
Purpose: customer remittance records.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `customer_id uuid fk`
- `payment_date date`
- `payment_method text`
- `payment_reference text null`
- `gross_amount numeric(14,2)`
- `unapplied_amount numeric(14,2)`
- `status text`
- `deposit_account_id uuid null`
- `created_at`
- `updated_at`

## 9. Vendors, Purchasing, and Payables

## 9.1 vendors
Purpose: vendor master.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `vendor_code text`
- `name text`
- `status text`
- `default_ap_account_id uuid null`
- `default_expense_account_id uuid null`
- `created_at`
- `updated_at`

## 9.2 purchase_orders
Purpose: optional controlled purchasing workflow.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `vendor_id uuid fk`
- `po_number text`
- `order_date date`
- `status text`
- `location_id uuid null`
- `total_amount numeric(14,2)`

## 9.3 bills
Purpose: AP bill header.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `vendor_id uuid fk`
- `bill_number text`
- `bill_date date`
- `due_date date`
- `status text`
- `subtotal numeric(14,2)`
- `tax_total numeric(14,2)`
- `total_amount numeric(14,2)`
- `balance_due numeric(14,2)`
- `posted_journal_entry_id uuid null`
- `created_at`
- `updated_at`

## 9.4 bill_lines
Purpose: expense and inventory bill details.

Core columns:
- `id uuid pk`
- `bill_id uuid fk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `description text`
- `catalog_item_id uuid null`
- `expense_account_id uuid null`
- `inventory_item_id uuid null`
- `quantity numeric(14,4)`
- `unit_cost numeric(14,4)`
- `line_amount numeric(14,2)`
- `branch_id uuid null`
- `department_id uuid null`
- `location_id uuid null`

## 9.5 vendor_payments
Purpose: payments to vendors.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `vendor_id uuid fk`
- `payment_date date`
- `payment_method text`
- `payment_reference text null`
- `total_amount numeric(14,2)`
- `status text`
- `bank_account_id uuid null`

## 10. Banking and Reconciliation

## 10.1 bank_accounts
Purpose: financial accounts used for receipts, disbursements, payroll, and tax.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `name text`
- `account_type text`
- `masked_account_number text`
- `routing_last4 text null`
- `currency_code text`
- `is_active boolean`
- `gl_account_id uuid fk`
- `bank_role text`

Examples of bank_role:
- operating
- payroll
- tax
- merchant_settlement

## 10.2 bank_transactions
Purpose: imported or recorded bank activity.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `bank_account_id uuid fk`
- `transaction_date date`
- `posted_date date null`
- `description text`
- `reference text null`
- `amount numeric(14,2)`
- `direction text`
- `source_type text`
- `match_status text`
- `matched_record_type text null`
- `matched_record_id uuid null`

## 10.3 reconciliations
Purpose: bank reconciliation sessions.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `bank_account_id uuid fk`
- `period_start date`
- `period_end date`
- `statement_ending_balance numeric(14,2)`
- `book_ending_balance numeric(14,2)`
- `difference_amount numeric(14,2)`
- `status text`
- `completed_at timestamptz null`
- `completed_by uuid null`

## 10.4 reconciliation_lines
Purpose: items included in reconciliation.

Core columns:
- `id uuid pk`
- `reconciliation_id uuid fk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `bank_transaction_id uuid fk`
- `is_cleared boolean`
- `cleared_at timestamptz null`

## 11. Payroll Foundation

## 11.1 employees
Purpose: finance-side employee dimension linked to Launch.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `launch_employee_id uuid null`
- `employee_number text`
- `first_name text`
- `last_name text`
- `employment_status text`
- `hire_date date`
- `termination_date date null`
- `branch_id uuid null`
- `department_id uuid null`
- `location_id uuid null`
- `is_active boolean`

Note: this may be a synced mirror of Launch employee master data for Finance reporting and workflow stability.

## 11.2 employee_pay_profiles
Purpose: payroll setup by employee.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `employee_id uuid fk`
- `pay_type text`
- `base_rate numeric(14,4) null`
- `salary_amount numeric(14,2) null`
- `default_pay_group_id uuid null`
- `pay_frequency text`
- `standard_hours numeric(10,2) null`
- `overtime_rule_code text null`
- `status text`
- `effective_start date`
- `effective_end date null`

## 11.3 pay_groups
Purpose: payroll grouping and schedule assignment.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `name text`
- `code text`
- `pay_frequency text`
- `approval_cutoff_days integer`
- `ach_lead_days integer`
- `default_pay_day_rule text`
- `status text`

## 11.4 pay_periods
Purpose: scheduled payroll periods.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `pay_group_id uuid fk`
- `period_start date`
- `period_end date`
- `pay_date date`
- `approval_deadline date null`
- `ach_submission_date date null`
- `status text`

Statuses:
- open
- collecting
- approved
- processed
- closed

## 11.5 payroll_runs
Purpose: payroll run header.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `pay_group_id uuid fk`
- `pay_period_id uuid fk`
- `run_type text`
- `status text`
- `total_gross numeric(14,2)`
- `total_net numeric(14,2)`
- `total_employer_tax numeric(14,2)`
- `total_employee_deductions numeric(14,2)`
- `processed_at timestamptz null`
- `finalized_at timestamptz null`
- `finalized_by uuid null`

## 11.6 payroll_run_items
Purpose: employee-level payroll results.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `payroll_run_id uuid fk`
- `employee_id uuid fk`
- `gross_pay numeric(14,2)`
- `net_pay numeric(14,2)`
- `tax_withheld numeric(14,2)`
- `employee_deductions numeric(14,2)`
- `employer_tax numeric(14,2)`
- `status text`

## 11.7 payroll_earnings_lines
Purpose: employee earning detail within payroll.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `payroll_run_item_id uuid fk`
- `earning_code text`
- `hours numeric(12,2) null`
- `rate numeric(14,4) null`
- `amount numeric(14,2)`
- `source_type text null`
- `source_id uuid null`

## 11.8 payroll_deduction_lines
Purpose: employee deduction detail.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `payroll_run_item_id uuid fk`
- `deduction_code text`
- `amount numeric(14,2)`
- `employer_amount numeric(14,2) default 0`

## 11.9 employee_bank_accounts
Purpose: direct deposit setup.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `employee_id uuid fk`
- `bank_name text null`
- `account_type text`
- `account_token text`
- `masked_account_number text`
- `routing_last4 text`
- `allocation_type text`
- `allocation_value numeric(14,4) null`
- `is_primary boolean`
- `status text`
- `authorization_signed_at timestamptz null`

Important note:
Do not store raw full account or routing numbers in plaintext.

## 11.10 employee_tax_profiles
Purpose: employee withholding setup.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `employee_id uuid fk`
- `federal_filing_status text null`
- `federal_extra_withholding numeric(14,2) null`
- `state_code text null`
- `state_filing_status text null`
- `state_extra_withholding numeric(14,2) null`
- `local_tax_code text null`
- `effective_start date`
- `effective_end date null`

## 11.11 payroll_journal_links
Purpose: connect payroll runs to journal entries.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `payroll_run_id uuid fk`
- `journal_entry_id uuid fk`
- `journal_type text`

## 12. Leave and Accrual Management

## 12.1 leave_types
Purpose: define tenant leave types.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `code text`
- `name text`
- `leave_category text`
- `is_paid boolean`
- `status text`

## 12.2 leave_policies
Purpose: policy rules by employee class or entity.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `name text`
- `code text`
- `status text`
- `carryover_rule jsonb null`
- `payout_rule jsonb null`
- `waiting_period_days integer null`

## 12.3 leave_policy_assignments
Purpose: assign leave policies to employees.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `leave_policy_id uuid fk`
- `employee_id uuid fk`
- `effective_start date`
- `effective_end date null`

## 12.4 leave_accrual_rules
Purpose: accrual formulas.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `leave_policy_id uuid fk`
- `leave_type_id uuid fk`
- `accrual_method text`
- `accrual_rate numeric(14,6) null`
- `accrual_frequency text null`
- `cap_hours numeric(12,2) null`
- `max_carryover_hours numeric(12,2) null`

## 12.5 leave_balance_ledgers
Purpose: immutable balance movement ledger.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `employee_id uuid fk`
- `leave_type_id uuid fk`
- `entry_date date`
- `entry_type text`
- `hours_change numeric(12,2)`
- `balance_after numeric(12,2)`
- `source_type text null`
- `source_id uuid null`
- `memo text null`

## 12.6 leave_requests
Purpose: employee leave requests.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `employee_id uuid fk`
- `leave_type_id uuid fk`
- `request_status text`
- `requested_at timestamptz`
- `approved_at timestamptz null`
- `approved_by uuid null`
- `notes text null`

## 13. Products and Services Catalog

## 13.1 catalog_items
Purpose: products and services master catalog.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `item_code text`
- `name text`
- `description text null`
- `item_type text`
- `service_delivery_type text null`
- `billing_method text`
- `default_unit_price numeric(14,4) null`
- `default_unit_cost numeric(14,4) null`
- `default_revenue_account_id uuid null`
- `default_expense_account_id uuid null`
- `default_tax_code_id uuid null`
- `status text`
- `is_active boolean`

Examples of item_type:
- service
- product
- fee
- bundle
- discount
- reimbursement

## 13.2 catalog_item_prices
Purpose: effective-dated pricing.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `catalog_item_id uuid fk`
- `price_type text`
- `customer_id uuid null`
- `contract_id uuid null`
- `customer_site_id uuid null`
- `unit_price numeric(14,4)`
- `effective_start date`
- `effective_end date null`

## 13.3 contract_line_items
Purpose: contract billing configuration.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `contract_id uuid fk`
- `catalog_item_id uuid fk`
- `billing_method text`
- `unit_price numeric(14,4)`
- `minimum_units numeric(14,4) null`
- `status text`

## 14. Inventory and Asset Control

## 14.1 inventory_items
Purpose: stocked item master.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `item_code text`
- `name text`
- `description text null`
- `inventory_type text`
- `unit_of_measure text`
- `is_stocked boolean`
- `valuation_method text`
- `default_unit_cost numeric(14,4) null`
- `reorder_point numeric(14,2) null`
- `reorder_quantity numeric(14,2) null`
- `inventory_asset_account_id uuid null`
- `inventory_expense_account_id uuid null`
- `status text`

## 14.2 inventory_locations
Purpose: stock holding locations.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `location_id uuid null`
- `name text`
- `code text`
- `status text`

## 14.3 inventory_stock_balances
Purpose: quantity on hand by location.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `inventory_item_id uuid fk`
- `inventory_location_id uuid fk`
- `quantity_on_hand numeric(14,2)`
- `quantity_reserved numeric(14,2)`
- `quantity_available numeric(14,2)`
- `average_unit_cost numeric(14,4) null`
- unique on `tenant_id, entity_id, inventory_item_id, inventory_location_id`

## 14.4 inventory_receipts
Purpose: goods received into stock.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `vendor_id uuid null`
- `receipt_number text`
- `receipt_date date`
- `inventory_location_id uuid fk`
- `status text`

## 14.5 inventory_adjustments
Purpose: controlled stock adjustments.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `inventory_item_id uuid fk`
- `inventory_location_id uuid fk`
- `adjustment_date date`
- `adjustment_type text`
- `quantity_change numeric(14,2)`
- `unit_cost numeric(14,4) null`
- `reason_code text`
- `approved_by uuid null`
- `posted_journal_entry_id uuid null`

## 14.6 equipment_assets
Purpose: individually tracked controlled equipment.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `inventory_item_id uuid null`
- `asset_tag text`
- `serial_number text null`
- `name text`
- `asset_status text`
- `condition_status text`
- `purchase_date date null`
- `purchase_cost numeric(14,2) null`
- `assigned_employee_id uuid null`
- `assigned_location_id uuid null`

## 15. Budgeting and Forecasting

## 15.1 budgets
Purpose: budget header and versioning.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `budget_name text`
- `budget_year integer`
- `version_number integer`
- `status text`
- `scenario_type text`
- `created_at`
- `updated_at`

## 15.2 budget_lines
Purpose: budget values by period and dimension.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `budget_id uuid fk`
- `account_id uuid fk`
- `period_id uuid fk`
- `branch_id uuid null`
- `department_id uuid null`
- `location_id uuid null`
- `cost_center_id uuid null`
- `customer_id uuid null`
- `contract_id uuid null`
- `amount numeric(14,2)`

## 15.3 forecasts
Purpose: forecast header and scenario support.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `forecast_name text`
- `forecast_year integer`
- `version_number integer`
- `status text`
- `driver_method text`

## 15.4 forecast_lines
Purpose: periodized forecast detail.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `forecast_id uuid fk`
- `account_id uuid fk`
- `period_id uuid fk`
- `amount numeric(14,2)`
- `driver_source text null`
- `notes text null`

## 16. Tax and Compliance Foundation

## 16.1 tax_codes
Purpose: assign tax logic to items and transactions.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `code text`
- `name text`
- `tax_type text`
- `rate numeric(10,6) null`
- `status text`

## 16.2 tax_liabilities
Purpose: track accrued taxes payable.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `tax_type text`
- `jurisdiction_code text`
- `period_start date`
- `period_end date`
- `liability_amount numeric(14,2)`
- `paid_amount numeric(14,2)`
- `status text`
- `source_type text null`
- `source_id uuid null`

## 16.3 tax_deposit_schedules
Purpose: employer deposit schedule management.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `jurisdiction_code text`
- `deposit_frequency text`
- `effective_start date`
- `effective_end date null`

## 16.4 compliance_requirements
Purpose: statutory obligation registry.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid fk`
- `requirement_code text`
- `name text`
- `jurisdiction_code text`
- `module_code text`
- `due_rule text null`
- `status text`

## 17. Documents and Audit

## 17.1 document_attachments
Purpose: file references tied to records.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid null`
- `record_type text`
- `record_id uuid`
- `storage_bucket text`
- `storage_path text`
- `file_name text`
- `content_type text`
- `uploaded_by uuid null`
- `created_at`

## 17.2 audit_logs
Purpose: immutable audit event records.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `entity_id uuid null`
- `actor_user_id uuid null`
- `module_code text`
- `event_type text`
- `record_type text`
- `record_id uuid`
- `old_values jsonb null`
- `new_values jsonb null`
- `occurred_at timestamptz not null default now()`
- `source_ip text null`
- `user_agent text null`

## 17.3 integration_sync_jobs
Purpose: track Launch and Operations sync processing.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `source_system text`
- `job_type text`
- `status text`
- `started_at timestamptz null`
- `completed_at timestamptz null`
- `records_processed integer default 0`
- `records_failed integer default 0`
- `details jsonb null`

## 18. Canonical External Reference Tables

To support Launch and Operations synchronization cleanly, use stable cross-system reference tables.

## 18.1 external_record_links
Purpose: map source records from external Watchman systems.

Core columns:
- `id uuid pk`
- `tenant_id uuid fk`
- `source_system text`
- `source_table text`
- `source_record_id text`
- `target_table text`
- `target_record_id uuid`
- `last_synced_at timestamptz null`
- unique on `tenant_id, source_system, source_table, source_record_id`

## 19. Recommended First Migration Workstreams

## Workstream 1. Platform and tenant foundation
Build first:
- tenants
- tenant_users
- tenant_products
- roles
- permissions
- role_permissions
- user_role_assignments
- entities
- branches
- departments
- locations
- cost_centers

## Workstream 2. Accounting core
Build next:
- fiscal_periods
- accounts
- journal_entries
- journal_entry_lines
- account_balances
- audit_logs

## Workstream 3. AR and AP
Build next:
- customers
- customer_sites
- contracts
- invoices
- invoice_lines
- customer_payments
- invoice_payments
- vendors
- bills
- bill_lines
- vendor_payments

## Workstream 4. Banking
Build next:
- bank_accounts
- bank_transactions
- reconciliations
- reconciliation_lines

## Workstream 5. Payroll foundation
Build next:
- employees
- employee_pay_profiles
- pay_groups
- pay_periods
- payroll_runs
- payroll_run_items
- payroll_earnings_lines
- payroll_deduction_lines
- employee_bank_accounts
- employee_tax_profiles
- payroll_journal_links

## Workstream 6. Leave and product catalog
Build next:
- leave_types
- leave_policies
- leave_policy_assignments
- leave_accrual_rules
- leave_balance_ledgers
- leave_requests
- catalog_items
- catalog_item_prices
- contract_line_items

## Workstream 7. Inventory and budgeting
Build next:
- inventory_items
- inventory_locations
- inventory_stock_balances
- inventory_receipts
- inventory_adjustments
- equipment_assets
- budgets
- budget_lines
- forecasts
- forecast_lines

## 20. Row-Level Security Standard

Every tenant-owned table should have RLS enabled.

Minimum policy standard:
- users can only access rows for tenants they belong to
- entity-sensitive tables may be further restricted by entity assignment
- write access for sensitive modules should be blocked from direct client writes and routed through server functions

Recommended pattern:
- create helper SQL functions for `current_tenant_ids()`
- optionally include `current_entity_ids()`
- keep service-role usage limited to backend operations

## 21. Recommended Server Functions for v1

Build these as edge functions or backend service actions:
- `finance-create-journal-entry`
- `finance-post-journal-entry`
- `finance-create-invoice`
- `finance-issue-invoice`
- `finance-record-customer-payment`
- `finance-create-bill`
- `finance-post-bill`
- `finance-record-vendor-payment`
- `finance-run-payroll-preview`
- `finance-finalize-payroll`
- `finance-generate-pay-stubs`
- `finance-create-ach-batch`
- `finance-post-payroll-journal`
- `finance-close-period`
- `finance-adjust-leave-balance`
- `finance-adjust-inventory`
- `finance-complete-reconciliation`

## 22. Reporting Views to Plan Early

Even before BI maturity, plan SQL views or materialized views for:
- trial balance
- profit and loss by period
- balance sheet by period
- AR aging
- AP aging
- payroll register summary
- leave balance summary
- inventory on hand by location
- budget vs actual
- forecast vs actual
- labor cost by contract
- margin by customer and site

## 23. Final Guidance

This schema blueprint should be implemented with a disciplined sequence.
Do not try to build all modules at once.

The correct order is:
1. tenant and access foundation
2. accounting core
3. receivables and payables
4. banking
5. payroll foundation
6. leave, catalog, and inventory
7. budgeting, forecasting, and advanced reporting

## 24. Next Document to Build

After this schema blueprint, the next best deliverable is:

**Watchman Finance Supabase Table Dictionary and Relationship Map v1**

That document should define for each table:
- exact purpose
- key relationships
- required indexes
- RLS considerations
- whether it is user-editable or server-only
- whether it is Launch-fed, Operations-fed, or Finance-native
