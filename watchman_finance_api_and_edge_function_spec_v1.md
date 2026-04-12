# Watchman Finance API and Edge Function Specification v1

## 1. Purpose

This document defines the recommended server-side API and Edge Function structure for Watchman Finance.

The design goal is:
- sensitive finance mutations must be server-controlled
- endpoints must be tenant-safe and permission-checked
- workflows must be auditable and reversible where appropriate
- frontend clients must not directly mutate posted or finalized finance records

## 2. API Design Principles

1. Use task-oriented actions, not generic unrestricted CRUD, for sensitive finance workflows.
2. Every action must resolve:
   - auth user
   - tenant context
   - entity scope
   - permission set
   - period lock state where relevant
3. Every material action must write an audit log.
4. Posted/finalized records should be corrected by reversal or adjustment actions, not open-ended edits.
5. Input validation should happen before database writes and again before posting/finalization.
6. Long-running or batch actions should return job IDs where appropriate.

## 3. Recommended Domains

- auth-context
- tenant-admin
- finance-core
- integration
- ar
- ap
- payroll
- leave
- banking
- tax
- catalog
- billing
- inventory
- reporting
- close

## 4. Standard Request Context

Every server action should resolve:
- user_id
- current_tenant_id
- allowed_entity_ids
- permission_codes
- module_entitlements
- request_source
- correlation_id

## 5. Standard Response Shape

Every action should return:
- success
- message
- data
- warnings
- errors
- correlation_id

For asynchronous or large actions, also return:
- job_id
- status
- next_action_hint

## 6. Core Edge Functions and Server Actions

## 6.1 Tenant Admin

### finance.getContext
Purpose:
- resolve tenant, entity, role, permission, module context for current session

### tenant.createEntity
Checks:
- tenant.update
- entity.create

### tenant.updateEntity
Checks:
- tenant.update
- entity.update

### tenant.assignUserRole
Checks:
- user.role_assign

### tenant.assignUserScopes
Checks:
- user.scope_assign

## 6.2 Finance Core and GL

### gl.createAccount
Checks:
- gl.account.manage

### gl.updateAccount
Checks:
- gl.account.manage

### gl.archiveAccount
Checks:
- gl.account.manage

### gl.createJournalDraft
Checks:
- gl.journal.draft.create

### gl.updateJournalDraft
Checks:
- gl.journal.draft.edit
- draft status only
- period open

### gl.submitJournal
Checks:
- gl.journal.submit

### gl.approveJournal
Checks:
- gl.journal.approve

### gl.postJournal
Checks:
- gl.journal.post
- balanced entry
- open period
- approval state valid

### gl.reverseJournal
Checks:
- gl.journal.reverse
- posted state
- reversal reason required

### gl.closePeriod
Checks:
- gl.period.close

### gl.reopenPeriod
Checks:
- gl.period.reopen

## 6.3 Integration

### integration.receiveLaunchEmployeeSync
Purpose:
- ingest employee payloads from Launch into staging

Checks:
- system-to-system auth
- tenant mapping
- payload schema validation

### integration.promoteStagedEmployees
Checks:
- privileged server workflow only
- tenant scope
- validation pass

### integration.receiveLaunchCustomerSync
### integration.receiveLaunchContractSync
### integration.receiveApprovedTime
### integration.receiveServiceEvents
### integration.replayEvent
Checks:
- integration admin or support with audit trail

## 6.4 AR

### ar.createInvoiceDraft
Checks:
- ar.invoice.draft.create

### ar.updateInvoiceDraft
Checks:
- ar.invoice.draft.edit
- draft status

### ar.issueInvoice
Checks:
- ar.invoice.issue
- customer active
- line validation complete
- open period if posting immediate

### ar.voidInvoice
Checks:
- ar.invoice.void
- status and dependency validation

### ar.createCreditMemo
Checks:
- ar.invoice.credit

### ar.recordCustomerPayment
Checks:
- ar.payment.record

### ar.applyCustomerPayment
Checks:
- ar.payment.apply

### ar.refundCustomerPayment
Checks:
- ar.payment.refund

### ar.generateStatement
Checks:
- ar.customer.read or billing permissions

## 6.5 AP

### ap.createBillDraft
Checks:
- ap.bill.draft.create

### ap.updateBillDraft
Checks:
- ap.bill.draft.edit

### ap.approveBill
Checks:
- ap.bill.approve

### ap.postBill
Checks:
- ap.bill.post
- open period
- vendor active

### ap.createVendorPaymentProposal
Checks:
- ap.payment.create

### ap.approveVendorPayment
Checks:
- ap.payment.approve

### ap.releaseVendorPayment
Checks:
- ap.payment.release

### ap.voidBill
Checks:
- ap.bill.void

## 6.6 Payroll

### payroll.createRun
Checks:
- payroll.run.create

### payroll.loadApprovedTime
Checks:
- payroll.run.create or calculate permissions
- pay period validation

### payroll.calculateRun
Checks:
- payroll.run.calculate
- approved time loaded
- pay profiles valid

### payroll.reviewRun
Checks:
- payroll.run.review

### payroll.approveRun
Checks:
- payroll.run.approve

### payroll.finalizeRun
Checks:
- payroll.run.finalize
- approval state valid
- unresolved exceptions below threshold
- period open

### payroll.reverseRun
Checks:
- payroll.run.reverse

### payroll.generatePayStatements
Checks:
- payroll.run.review or finalize context

### payroll.generateACHBatch
Checks:
- payroll.ach.generate
- finalized payroll
- bank/payment method readiness

### payroll.releaseACHBatch
Checks:
- payroll.ach.release
- maker-checker enforcement where configured

## 6.7 Leave

### leave.createPolicy
Checks:
- leave.policy.manage

### leave.updatePolicy
Checks:
- leave.policy.manage

### leave.submitRequest
Checks:
- leave.request.create
- self or in-scope employee

### leave.approveRequest
Checks:
- leave.request.approve

### leave.adjustBalance
Checks:
- leave.balance.adjust

### leave.runAccruals
Checks:
- leave.accrual.run

## 6.8 Banking

### bank.createAccount
Checks:
- bank.account.manage

### bank.importTransactions
Checks:
- bank.transaction.import

### bank.createReconciliation
Checks:
- bank.reconciliation.create

### bank.matchTransaction
Checks:
- bank.reconciliation.create

### bank.approveReconciliation
Checks:
- bank.reconciliation.approve

### bank.createTransfer
Checks:
- bank.transfer.create

### bank.approveTransfer
Checks:
- bank.transfer.approve

## 6.9 Tax

### tax.createLiability
Checks:
- payroll.tax.manage or tax.liability.manage

### tax.updateFilingPeriod
Checks:
- tax.filing.manage

### tax.markDepositRecorded
Checks:
- tax.liability.manage

### tax.generateComplianceTasks
Checks:
- scheduled privileged workflow

## 6.10 Catalog and Billing

### catalog.createItem
Checks:
- catalog.item.manage

### catalog.updateItem
Checks:
- catalog.item.manage

### catalog.updatePricing
Checks:
- catalog.pricing.manage

### billing.createRule
Checks:
- catalog.pricing.manage or billing permissions

### billing.generateInvoiceCandidates
Checks:
- privileged billing workflow

### billing.promoteCandidatesToDraftInvoices
Checks:
- ar.invoice.draft.create plus billing permissions

## 6.11 Inventory and Asset Control

### inventory.createItem
Checks:
- inventory.item.manage

### inventory.receiveStock
Checks:
- inventory.receive

### inventory.issueStock
Checks:
- inventory.issue

### inventory.transferStock
Checks:
- inventory.transfer

### inventory.adjustStock
Checks:
- inventory.adjust
- approval threshold checks

### inventory.startCountSession
Checks:
- inventory.count.manage

### inventory.assignAsset
Checks:
- asset.assign

### inventory.returnAsset
Checks:
- asset.return

### inventory.writeOffAsset
Checks:
- asset.writeoff

## 6.12 Reporting

### reporting.getExecutiveDashboard
Checks:
- report.read_standard or report.read_sensitive depending on measures

### reporting.getFinancialStatements
Checks:
- report.read_standard

### reporting.exportReport
Checks:
- report.export

### reporting.refreshSnapshots
Checks:
- scheduled privileged workflow

## 6.13 Close

### close.createChecklist
Checks:
- gl.period.close or close management permission

### close.completeTask
Checks:
- assigned scope

### close.lockPeriod
Checks:
- gl.period.close

## 7. Job-Based Actions

These actions should run as background jobs or async workers where helpful:
- payroll.calculateRun
- payroll.generateACHBatch
- billing.generateInvoiceCandidates
- reporting.refreshSnapshots
- integration promotion batches
- large import processes

Recommended job response:
- job_id
- started_at
- estimated domain
- scope summary
- status endpoint reference

## 8. Audit Requirements by Action

Every material action must log:
- action name
- user_id
- tenant_id
- entity_id
- target table/record
- previous state
- new state
- reason if required
- source channel
- correlation_id

Actions that especially require reason capture:
- reverse journal
- void invoice
- void bill
- reverse payroll
- adjust leave balance
- adjust inventory
- reopen period
- write off asset

## 9. Error Handling Standards

Return structured errors with codes such as:
- unauthorized
- forbidden
- tenant_scope_mismatch
- entity_scope_mismatch
- module_not_enabled
- period_closed
- invalid_status_transition
- validation_failed
- duplicate_event
- dependency_missing
- approval_required
- maker_checker_required

Do not return silent partial success for finance-critical posting actions.

## 10. Implementation Pattern

### Preferred pattern
- Vercel server routes or Supabase Edge Functions for orchestration
- Supabase database functions for atomic transactions only
- browser clients call server actions, not raw finance mutation tables
- service role use isolated to server environment only

## 11. Final Rule

If an action can post, finalize, release, reverse, close, transfer money, or affect compliance, it must be a named server action with explicit permission checks, audit logging, and state-transition validation.
