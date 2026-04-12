# Watchman Finance Server Action and Workflow Map v1

## 1. Purpose

This document defines the server-side action model and workflow control structure for Watchman Finance.

It explains:
- what actions exist in the platform
- which product originates the action
- which tables are created or updated by the action
- which actions are user-initiated vs system-initiated
- which actions require approval
- which actions post financial records
- which actions are reversible and how reversals should occur
- which records become locked after posting or close

This document should be used with:
- Watchman Finance Framework v1
- Module Ownership and Schema Foundation v1
- Supabase Schema Blueprint v1
- Table Dictionary and Relationship Map v1

The standard in this document is:

**Sensitive finance workflows must be executed through server-controlled actions, never by unrestricted browser-side direct table writes.**

## 2. Workflow Control Standard

## 2.1 Action Types

All Finance workflows should use one of these action types:

1. **Create**
   Creates a draft or initial record.
2. **Update**
   Modifies a draft or editable record.
3. **Submit**
   Moves a record into review.
4. **Approve**
   Authorizes progression to the next state.
5. **Reject**
   Returns a record to draft or exception status.
6. **Post**
   Creates final accounting or payroll effect.
7. **Finalize**
   Locks a transactional process after successful completion.
8. **Reverse**
   Creates a correcting or offsetting record without silent deletion.
9. **Close**
   Locks a period or record group from normal edits.
10. **Reopen**
   Reopens a locked period or workflow under controlled authority.
11. **Sync**
   Imports or exports data between Watchman products or external services.
12. **Archive**
   Deactivates a record without deleting historical trace.

## 2.2 Record State Model

Most controlled Finance records should use a state model such as:

- draft
- pending_review
- approved
- posted
- finalized
- reversed
- voided
- archived

Not every module will use every state, but payroll, billing, reconciliation, close, tax, and inventory adjustments should use formal lifecycle states.

## 2.3 Mutation Rules

### Browser-editable
Allowed only for low-risk draft records and reference data where permitted by role.

Examples:
- draft budget lines
- draft forecast assumptions
- item descriptions
- customer contact notes

### Server-controlled
Required for any action that:
- changes payroll outcome
- changes financial balances
- changes inventory balances
- creates journal entries
- posts tax liabilities
- moves money status
- creates direct deposit output
- locks or unlocks periods
- modifies approval state

### System-generated
Used when workflows automatically create downstream records.

Examples:
- payroll posting creates journal entries
- invoice posting creates AR entries
- approved leave updates balances
- approved vendor bill updates AP aging

## 3. Cross-Product Workflow Design

## 3.1 Launch to Finance

Launch is the source for identity, organizational, policy, and eligibility information.

Launch-originated actions should primarily use sync-type workflows.

### Launch-driven sync domains
- employee master
- employee status
- employee classification
- hire and separation dates
- department and branch assignment
- training/certification status
- customer/client master
- contract header data
- tenant and entity settings inputs

### Finance rule
Launch-originated records should not directly post accounting entries.
They establish eligibility, references, and dimensions used by Finance workflows.

## 3.2 Operations to Finance

Operations is the source for actual work execution and attendance-related operational activity.

### Operations-driven sync domains
- approved worked time
- approved overtime
- approved shift premiums
- service delivery events
- patrol completions
- billable operational exceptions
- lost/damaged equipment events
- schedule coverage facts

### Finance rule
Operations data may trigger payroll, billing, costing, and liability workflows, but Finance remains the posting authority.

## 3.3 Finance native

Finance is the source of truth for:
- accounting entries
- payroll runs
- pay statements
- leave balances
- tax liabilities
- AR and AP balances
- bank reconciliation status
- inventory value and adjustments
- budgets and forecasts
- close status

## 4. Identity, Tenant, and Entity Actions

## 4.1 Provision tenant

### Action name
`provisionTenant`

### Origin
Platform admin or automated onboarding process

### Type
Create

### Tables affected
- tenants
- tenant_products
- tenant_feature_flags
- roles
- permissions seed references
- tenant_memberships
- tenant_settings

### Approval
Platform controlled

### Locking
No

### Notes
This action creates a tenant shell and enables product entitlement structure.

## 4.2 Provision entity

### Action name
`provisionEntity`

### Origin
Finance admin

### Type
Create

### Tables affected
- entities
- entity_settings
- fiscal_periods
- default chart templates or account seeds
- entity_bank_accounts placeholder records

### Approval
Finance admin approval

### Locking
No

### Notes
Creates the legal accounting entity under a tenant.

## 4.3 Assign user roles

### Action name
`assignUserRoles`

### Origin
Tenant admin or finance admin

### Type
Update

### Tables affected
- tenant_memberships
- user_role_assignments
- access_scope_assignments

### Approval
Role-based authority required

### Locking
No

### Notes
Should be logged in audit events. Sensitive financial roles should require stronger authorization.

## 5. Employee and Payroll Setup Actions

## 5.1 Sync employee master from Launch

### Action name
`syncEmployeeMaster`

### Origin
Launch sync event

### Type
Sync

### Tables affected
- employees
- employee_assignments
- employee_classifications
- employee_status_history

### Approval
No direct Finance approval required for sync

### Locking
No

### Notes
Should upsert identity and employment structure only. It should not create payroll records on its own.

## 5.2 Create employee pay profile

### Action name
`createEmployeePayProfile`

### Origin
Finance payroll admin

### Type
Create

### Tables affected
- employee_pay_profiles
- employee_compensation_rates
- employee_pay_method_elections
- employee_tax_profiles

### Approval
Payroll admin role required

### Locking
Editable until payroll processing begins for an effective period

### Notes
This action establishes how an employee is paid.

## 5.3 Update employee pay profile

### Action name
`updateEmployeePayProfile`

### Origin
Finance payroll admin

### Type
Update

### Tables affected
- employee_pay_profiles
- employee_compensation_rates
- employee_tax_profiles
- employee_pay_method_elections

### Approval
Payroll admin role required

### Locking
Historical effective rows should not be overwritten. Use effective-dated changes.

### Notes
Do not silently mutate prior payroll history.

## 5.4 Record direct deposit authorization

### Action name
`recordDirectDepositAuthorization`

### Origin
Employee self-service or payroll admin review workflow

### Type
Create / Approve

### Tables affected
- employee_bank_accounts
- employee_pay_method_elections
- authorization_documents
- audit_logs

### Approval
May require payroll admin verification

### Locking
Approved authorization records should be immutable except for revocation state

### Notes
Sensitive bank information should be encrypted or tokenized and never loosely exposed to browser clients.

## 5.5 Configure payroll group

### Action name
`configurePayrollGroup`

### Origin
Payroll admin

### Type
Create / Update

### Tables affected
- pay_groups
- pay_group_memberships
- pay_schedules
- payroll_calendar_events

### Approval
Payroll admin

### Locking
Active schedules should require controlled change management

## 6. Time, Leave, and Payroll Processing Actions

## 6.1 Sync approved time from Operations

### Action name
`syncApprovedTime`

### Origin
Operations sync event

### Type
Sync

### Tables affected
- imported_time_entries
- payroll_time_staging
- labor_cost_staging
- billing_source_events

### Approval
Operational approval must occur upstream in Operations

### Locking
Staging records remain editable only through controlled exception workflows

### Notes
Operations is source of worked-time truth. Finance stages and validates it.

## 6.2 Create leave request

### Action name
`createLeaveRequest`

### Origin
Employee or manager

### Type
Create

### Tables affected
- leave_requests
- leave_request_days

### Approval
Supervisor or approver required unless auto-approved by policy

### Locking
Draft editable before submission

## 6.3 Approve leave request

### Action name
`approveLeaveRequest`

### Origin
Supervisor, HR, payroll admin depending on policy

### Type
Approve

### Tables affected
- leave_requests
- leave_approvals
- approved_absence_events
- leave_balance_ledgers
n- payroll_leave_staging

### Approval
Required

### Locking
Approved balance impact should be recorded in ledger form

### Notes
Approval should update the leave ledger through a server action, not by direct row edits.

## 6.4 Accrue leave balances

### Action name
`accrueLeaveBalances`

### Origin
System scheduled job

### Type
System-generated / Post

### Tables affected
- leave_balance_ledgers
- leave_liability_snapshots
- accrual_run_logs

### Approval
No manual approval; governed by approved policy rules

### Locking
Accrual runs should be immutable after posting, except via reversal adjustments

## 6.5 Create payroll run

### Action name
`createPayrollRun`

### Origin
Payroll admin

### Type
Create

### Tables affected
- payroll_runs
- payroll_run_items draft rows
- payroll_exceptions

### Approval
Payroll admin role required

### Locking
Draft stage only

### Notes
This action initializes a payroll run for a pay group and pay period.

## 6.6 Calculate payroll run

### Action name
`calculatePayrollRun`

### Origin
Payroll admin initiates; server performs calculation

### Type
Update / System-generated

### Tables affected
- payroll_run_items
- payroll_earnings_lines
- payroll_deduction_lines
- payroll_tax_lines
- payroll_employer_tax_lines
- payroll_exceptions

### Approval
No posting approval yet, but controlled by payroll role

### Locking
Calculated data editable only through exception correction or recalculation workflow

### Notes
This is a server-only action.

## 6.7 Submit payroll for approval

### Action name
`submitPayrollForApproval`

### Origin
Payroll admin

### Type
Submit

### Tables affected
- payroll_runs
- payroll_approval_requests

### Approval
Yes

### Locking
Run enters pending_review state

## 6.8 Approve payroll run

### Action name
`approvePayrollRun`

### Origin
Finance approver or controller

### Type
Approve

### Tables affected
- payroll_runs
- payroll_approval_requests
- audit_logs

### Approval
Required

### Locking
Awaiting posting/finalization

## 6.9 Finalize payroll run

### Action name
`finalizePayrollRun`

### Origin
Payroll admin or controller after approval

### Type
Finalize / Post

### Tables affected
- payroll_runs
- payroll_run_items
- pay_statements
- tax_liabilities
- payroll_journal_batches
- journal_entries
- journal_entry_lines
- direct_deposit_batches
- employee_leave_balances derived snapshots where appropriate

### Approval
Requires prior approval unless policy allows same-role in small tenant mode

### Locking
Run becomes finalized and no normal edits allowed

### Notes
This is one of the most sensitive actions in the entire platform.

## 6.10 Reverse payroll run

### Action name
`reversePayrollRun`

### Origin
Controller or payroll admin with elevated authority

### Type
Reverse

### Tables affected
- payroll_reversal_batches
- payroll_runs status history
- reversal journal entries
- reversal tax liability records
- direct deposit exception records if not yet settled

### Approval
Elevated approval required

### Locking
Original run remains historical and immutable; reversal creates offsetting records

### Notes
Never delete a finalized payroll run.

## 7. Direct Deposit and Tax Actions

## 7.1 Generate ACH batch

### Action name
`generateAchBatch`

### Origin
Server after payroll approval or finalization step

### Type
Post

### Tables affected
- direct_deposit_batches
- direct_deposit_batch_items
- ach_file_artifacts
- audit_logs

### Approval
Controlled by payroll workflow

### Locking
Generated batch file metadata should be immutable

### Notes
Actual transmission may be separate.

## 7.2 Mark ACH submitted

### Action name
`markAchSubmitted`

### Origin
Treasury user or bank callback process

### Type
Update

### Tables affected
- direct_deposit_batches
- payment_status_events

### Approval
Treasury role or automated bank integration

### Locking
Submission status history should be append-only

## 7.3 Record ACH return or failure

### Action name
`recordAchReturn`

### Origin
Bank file response or treasury admin

### Type
Create / Update

### Tables affected
- direct_deposit_return_events
- payroll_exceptions
- employee_payment_issue_queue

### Approval
Operational handling required

### Locking
Historical payment status remains append-only

## 7.4 Calculate tax liabilities

### Action name
`calculateTaxLiabilities`

### Origin
System during payroll finalization

### Type
System-generated

### Tables affected
- tax_liabilities
- employer_tax_liability_lines
- employee_tax_withholding_lines

### Approval
Embedded in payroll approval/finalization workflow

## 7.5 Mark tax deposit scheduled

### Action name
`markTaxDepositScheduled`

### Origin
Finance admin or treasury workflow

### Type
Update

### Tables affected
- tax_liabilities
- tax_deposit_calendar_events

### Approval
Finance role required

## 7.6 Record tax deposit completion

### Action name
`recordTaxDepositCompletion`

### Origin
Treasury admin

### Type
Finalize

### Tables affected
- tax_liabilities
- payment_status_events
- journal_entries if separate cash movement posting used

### Approval
Treasury/finance role

## 7.7 Create filing package

### Action name
`createTaxFilingPackage`

### Origin
System or finance admin

### Type
Create

### Tables affected
- tax_filing_periods
- filing_package_artifacts
- filing_submission_logs

### Approval
Finance role

## 8. Accounts Receivable Actions

## 8.1 Create customer

### Action name
`createCustomer`

### Origin
Launch sync or Finance admin

### Type
Create

### Tables affected
- customers
- customer_sites
- customer_billing_profiles

### Approval
Finance role or approved Launch sync

### Locking
Master data editable by permitted users

## 8.2 Create contract billing profile

### Action name
`createContractBillingProfile`

### Origin
Finance billing admin

### Type
Create / Update

### Tables affected
- contract_billing_profiles
- contract_item_pricing
- billing_rules

### Approval
Billing admin

### Locking
Effective-dated history recommended

## 8.3 Stage billable events from Operations

### Action name
`stageBillableEvents`

### Origin
Operations sync event

### Type
Sync

### Tables affected
- billing_source_events
- billing_exception_queue

### Approval
No direct billing post yet

## 8.4 Generate invoice draft

### Action name
`generateInvoiceDraft`

### Origin
Billing admin or scheduled billing job

### Type
Create

### Tables affected
- invoices
- invoice_lines
- invoice_item_sources
- billing_exception_queue

### Approval
Draft review required for exceptions depending on policy

### Locking
Draft editable until posting

## 8.5 Submit invoice for approval

### Action name
`submitInvoiceForApproval`

### Origin
Billing specialist

### Type
Submit

### Tables affected
- invoices
- invoice_approval_requests

### Approval
Optional depending on billing policy

## 8.6 Post invoice

### Action name
`postInvoice`

### Origin
Billing approver or finance admin

### Type
Post

### Tables affected
- invoices
- ar_open_items
- journal_entries if accrual posting is immediate
- customer_balance_snapshots

### Approval
May require prior approval based on tenant settings

### Locking
Posted invoices not directly editable; use credit memo or void workflow

## 8.7 Apply payment to invoice

### Action name
`applyCustomerPayment`

### Origin
Finance AR user or payment integration callback

### Type
Post / Finalize

### Tables affected
- customer_payments
- invoice_payments
- ar_open_items
- unapplied_cash_records where needed
- journal_entries

### Approval
AR role

### Locking
Payment application should be auditable and reversible only through controlled workflows

## 8.8 Issue credit memo

### Action name
`issueCreditMemo`

### Origin
Billing admin or finance approver

### Type
Create / Post

### Tables affected
- credit_memos
- credit_memo_lines
- ar_open_items
- journal_entries

### Approval
Required

## 9. Accounts Payable Actions

## 9.1 Create vendor

### Action name
`createVendor`

### Origin
Finance AP admin

### Type
Create

### Tables affected
- vendors
- vendor_payment_profiles
- vendor_contacts

### Approval
AP role

## 9.2 Enter vendor bill draft

### Action name
`createVendorBillDraft`

### Origin
AP clerk or finance user

### Type
Create

### Tables affected
- bills
- bill_lines
- bill_attachments

### Approval
Draft stage only

## 9.3 Approve vendor bill

### Action name
`approveVendorBill`

### Origin
Manager or finance approver

### Type
Approve / Post

### Tables affected
- bills
- ap_open_items
- journal_entries
- approval_logs

### Approval
Required

### Locking
Posted bill not directly editable; adjustments require credit or reversal workflow

## 9.4 Record vendor payment

### Action name
`recordVendorPayment`

### Origin
AP user or treasury workflow

### Type
Post

### Tables affected
- vendor_payments
- bill_payments
- ap_open_items
- bank_transaction_links
- journal_entries

### Approval
AP/treasury role

## 10. Banking and Reconciliation Actions

## 10.1 Create bank account

### Action name
`createBankAccount`

### Origin
Finance admin or treasury user

### Type
Create

### Tables affected
- bank_accounts
- bank_account_permissions

### Approval
Finance admin

## 10.2 Import bank transactions

### Action name
`importBankTransactions`

### Origin
System job or finance user

### Type
Sync

### Tables affected
- bank_transactions
- bank_import_logs

### Approval
No

## 10.3 Match bank transactions

### Action name
`matchBankTransactions`

### Origin
Finance user or assisted matching job

### Type
Update

### Tables affected
- bank_transaction_matches
- reconciliation_work_items

### Approval
Finance user

## 10.4 Create reconciliation session

### Action name
`createReconciliationSession`

### Origin
Finance user

### Type
Create

### Tables affected
- reconciliations
- reconciliation_lines

### Approval
No initial approval

## 10.5 Finalize reconciliation

### Action name
`finalizeReconciliation`

### Origin
Controller or authorized finance user

### Type
Finalize

### Tables affected
- reconciliations
- reconciliation_lines
- reconciliation_adjustment_entries
- journal_entries where necessary

### Approval
Required

### Locking
Finalized reconciliation should lock related session state

## 11. Products, Services, Inventory, and Asset Actions

## 11.1 Create catalog item

### Action name
`createCatalogItem`

### Origin
Finance product admin

### Type
Create

### Tables affected
- catalog_items
- catalog_item_account_mappings
- catalog_item_prices

### Approval
Finance admin or catalog manager

## 11.2 Update pricing rules

### Action name
`updateCatalogPricing`

### Origin
Billing admin or finance admin

### Type
Update

### Tables affected
- catalog_item_prices
- customer_item_pricing
- contract_item_pricing

### Approval
May require approval for sensitive pricing tiers

### Locking
Historical pricing should be effective-dated, not overwritten

## 11.3 Receive inventory

### Action name
`receiveInventory`

### Origin
Inventory or AP user

### Type
Post

### Tables affected
- inventory_receipts
- inventory_receipt_lines
- inventory_stock_balances
- inventory_valuation_layers
- vendor bill linkage tables

### Approval
May be tied to approved purchase workflow later

### Locking
Receipt history immutable after posting

## 11.4 Issue inventory to employee or location

### Action name
`issueInventory`

### Origin
Launch workflow, Operations workflow, or inventory admin

### Type
Post

### Tables affected
- employee_item_issues
- equipment_assignments
- inventory_stock_balances
- inventory_usage_events

### Approval
Role-based

### Locking
Issue events immutable after posting; corrections require return/adjustment transactions

## 11.5 Return inventory or equipment

### Action name
`returnInventoryOrEquipment`

### Origin
Launch offboarding workflow, Operations workflow, or inventory admin

### Type
Post

### Tables affected
- employee_item_returns
- equipment_assignments
- equipment_condition_logs
- inventory_stock_balances where restocked

### Approval
Role-based

## 11.6 Adjust inventory

### Action name
`adjustInventory`

### Origin
Inventory admin or controller

### Type
Post

### Tables affected
- inventory_adjustments
- inventory_stock_balances
- inventory_adjustment_reason_codes
- journal_entries if accounting impact is required

### Approval
Required for shrinkage, write-off, or value-impacting adjustments

### Locking
No silent overwrite of stock balances

## 11.7 Record lost or damaged equipment

### Action name
`recordEquipmentIncident`

### Origin
Operations event or supervisor report

### Type
Create / Approve / Post

### Tables affected
- equipment_incidents
- equipment_condition_logs
- inventory_adjustments or asset impairment workflows
- employee responsibility review records if used

### Approval
Supervisor and/or finance review depending on policy

## 12. Budgeting and Forecasting Actions

## 12.1 Create budget version

### Action name
`createBudgetVersion`

### Origin
Finance admin or manager

### Type
Create

### Tables affected
- budget_versions
- budget_lines
- budget_assumptions

### Approval
Review/approval recommended before activation

## 12.2 Approve budget version

### Action name
`approveBudgetVersion`

### Origin
Finance leader or executive approver

### Type
Approve / Finalize

### Tables affected
- budget_versions
- approval_logs

### Locking
Approved version locked from normal editing

## 12.3 Create forecast version

### Action name
`createForecastVersion`

### Origin
Finance analyst or manager

### Type
Create

### Tables affected
- forecast_versions
- forecast_lines
- forecast_assumptions
- forecast_driver_inputs

### Approval
Optional for draft, required for official forecast publication

## 12.4 Publish forecast

### Action name
`publishForecast`

### Origin
Finance leader

### Type
Finalize

### Tables affected
- forecast_versions
- forecast_publication_logs

### Locking
Published version locked as official reference

## 13. Close and Reporting Actions

## 13.1 Open fiscal period

### Action name
`openFiscalPeriod`

### Origin
Controller or finance admin

### Type
Create / Finalize

### Tables affected
- fiscal_periods
- period_status_history

### Approval
Controller role

## 13.2 Close subledger module

### Action name
`closeSubledger`

### Origin
Controller

### Type
Close

### Tables affected
- subledger_close_status
- period_checklists

### Approval
Required

### Notes
Separate close states may exist for AR, AP, payroll, and inventory.

## 13.3 Close accounting period

### Action name
`closeAccountingPeriod`

### Origin
Controller

### Type
Close

### Tables affected
- fiscal_periods
- period_checklists
- close_artifacts
- audit_logs

### Approval
Controller or executive finance authority

### Locking
Period closed; normal posting blocked

## 13.4 Reopen accounting period

### Action name
`reopenAccountingPeriod`

### Origin
Controller with elevated authority

### Type
Reopen

### Tables affected
- fiscal_periods
- period_status_history
- approval_logs

### Approval
Elevated approval required

### Locking
Reopen event must be fully audited

## 13.5 Generate financial statements

### Action name
`generateFinancialStatements`

### Origin
Finance user

### Type
System-generated / Read model build

### Tables affected
- report_runs
- report_artifacts
- cached_statement_snapshots if used

### Approval
No

### Notes
Reports should read posted data only.

## 14. Audit and Exception Management Actions

## 14.1 Write audit event

### Action name
`writeAuditEvent`

### Origin
System for every controlled action

### Type
System-generated

### Tables affected
- audit_logs
- audit_change_sets

### Approval
No

### Notes
Should capture actor, tenant, entity, action, record references, and change summary.

## 14.2 Create exception case

### Action name
`createExceptionCase`

### Origin
System or user action

### Type
Create

### Tables affected
- workflow_exceptions
- exception_assignments
- exception_comments

### Approval
Depends on workflow

### Notes
Used for payroll exceptions, billing exceptions, ACH failures, reconciliation mismatches, and other control issues.

## 15. Approval Matrix Standard

The platform should support a configurable approval matrix by tenant.

### Minimum approval domains
- payroll finalization
- payroll reversal
- invoice posting above threshold
- credit memo issue above threshold
- vendor bill approval above threshold
- inventory write-off above threshold
- pricing override above threshold
- accounting period reopen
- tax filing package approval

### Approval dimensions
- tenant
- entity
- module
- action type
- amount threshold
- role required
- separation of duties requirement

## 16. Reversal and Correction Standard

Never solve financial errors by deleting history.

### Standard correction methods
- credit memo instead of invoice deletion
- reversal entry instead of journal deletion
- payroll reversal batch instead of payroll deletion
- inventory adjustment transaction instead of quantity overwrite
- correction vendor credit instead of silent bill rewrite

This rule is mandatory for Finance integrity.

## 17. Locking Standard

Records should be locked after a defined control point.

### Lock after posting or finalization
- payroll runs
- posted invoices
- posted vendor bills
- finalized reconciliations
- inventory receipts
- inventory adjustments
- approved budget versions
- published forecasts
- closed fiscal periods

### Editable only through controlled workflows
- price changes via effective-dated updates
- compensation changes via effective-dated rows
- tax setup changes via admin workflow
- leave corrections via adjustment entries

## 18. Integration and Sync Standard

All sync actions between Watchman products should create traceable sync events.

### Sync metadata should include
- tenant_id
- entity_id where applicable
- source_product
- source_record_id
- destination_record_id where applicable
- sync status
- timestamp
- retry count
- error message if failed

### Primary sync patterns
- Launch -> Finance employee and client master data
- Operations -> Finance approved time, service events, and equipment incidents
- Finance -> Launch payroll status references and employee financial status data where permitted
- Finance -> Operations approved leave and payroll-lock signals where needed

## 19. Implementation Recommendation for Supabase and Vercel

## 19.1 Use Edge Functions or server routes for controlled mutations

Recommended for:
- payroll creation and calculation
- payroll approval and finalization
- invoice posting
- payment application
- vendor bill approval
- reconciliation finalization
- inventory adjustment posting
- period close and reopen
- ACH generation and submission status

## 19.2 Use database functions carefully

Database functions may be appropriate for:
- ledger posting helpers
- balance calculations
- period validation checks
- sequence generation
- reference validations

But orchestration logic should remain readable and testable in server-controlled application code.

## 19.3 Use RLS as protection, not as business workflow

RLS should:
- enforce tenant isolation
- restrict table access by role and scope
- prevent unauthorized reads and writes

Business workflow should still be enforced in explicit server actions.

## 20. Recommended Build Order for Actions

## Wave 1: Foundation actions
- provisionTenant
- provisionEntity
- assignUserRoles
- syncEmployeeMaster
- createCustomer
- createVendor
- createCatalogItem

## Wave 2: Payroll foundation actions
- createEmployeePayProfile
- configurePayrollGroup
- syncApprovedTime
- createPayrollRun
- calculatePayrollRun
- submitPayrollForApproval
- approvePayrollRun
- finalizePayrollRun

## Wave 3: AR/AP and inventory actions
- createContractBillingProfile
- generateInvoiceDraft
- postInvoice
- applyCustomerPayment
- createVendorBillDraft
- approveVendorBill
- recordVendorPayment
- receiveInventory
- issueInventory
- adjustInventory

## Wave 4: Banking, tax, and close actions
- importBankTransactions
- createReconciliationSession
- finalizeReconciliation
- generateAchBatch
- recordTaxDepositCompletion
- createTaxFilingPackage
- closeSubledger
- closeAccountingPeriod

## Wave 5: Planning and management actions
- createBudgetVersion
- approveBudgetVersion
- createForecastVersion
- publishForecast
- generateFinancialStatements

## 21. Final Implementation Rule

Watchman Finance must behave like a controlled financial system, not just a collection of editable screens.

That means:
- the user interface should request actions
- the server should validate policy, state, role, and tenant scope
- the server should create or update records through controlled workflows
- every sensitive workflow should leave an audit trail
- posted and finalized history should remain intact

That is the workflow standard that will allow Watchman Finance to scale inside EST Holdings now and later operate as a multi-tenant Watchman product.
