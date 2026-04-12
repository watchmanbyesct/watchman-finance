# Watchman Finance RLS and Permissions Architecture v1

## 1. Purpose
This document defines the row-level security, role model, and permission architecture for Watchman Finance. It is written for a Supabase-based, multi-tenant, multi-entity Watchman ecosystem in which:

- Watchman Launch owns employee master, onboarding, training, and certification source data.
- Watchman Operations owns timekeeping, schedule execution, service delivery events, and other operational facts.
- Watchman Finance owns accounting, payroll, tax control, leave and accruals, products and services, inventory and asset control, budgeting, forecasting, and reporting.

The design standard is:

- multi-tenant by default
- entity-aware by default
- least-privilege by default
- server-controlled finance mutations for all sensitive workflows
- auditability for every material finance action

## 2. Security Design Principles

### 2.1 Tenant Isolation is Mandatory
Every tenant-owned record must be scoped by `tenant_id`. No user should ever be able to read, update, export, or infer another tenant's data.

### 2.2 Entity Access is Separate from Tenant Membership
A user may belong to a tenant but only have access to specific entities, branches, departments, locations, or modules.

### 2.3 Finance Uses Two Layers of Authorization
Authorization must be enforced in:
1. the database through RLS
2. the application/service layer through server-side permission checks

RLS is not enough by itself. Server-side actions must also validate role, tenant, entity, module permission, workflow state, and period lock status.

### 2.4 Sensitive Finance Mutations are Server Only
The browser should not directly insert, update, or delete sensitive finance records such as:
- posted journal entries
- payroll runs
- payroll run items
- ACH batches
- tax liabilities
- reconciliation records
- fiscal close records
- posted invoices
- posted bills
- posted inventory adjustments
- budget approval records

### 2.5 Approval Rights and Processing Rights are Separate
Users who enter data should not automatically have the right to approve, post, close, or reverse the same records.

### 2.6 Read Access Should Be Narrower than Administrators Expect
Even internal tenant users should only see the modules and entity scopes required for their job.

## 3. Identity and Access Model

## 3.1 Identity Layers

### Platform Identity
Global user identity managed through Supabase Auth.

### Tenant Membership
A user can be a member of one or more tenants through a tenant membership table.

### Entity Scope
A user may be granted access to:
- all entities in a tenant
- one or more entities
- one or more branches or departments
- one or more locations or sites

### Product and Module Scope
A user may be entitled to specific Watchman products and finance modules.

## 3.2 Recommended Access Tables

- `platform_users`
- `tenant_memberships`
- `tenant_user_profiles`
- `roles`
- `permissions`
- `role_permissions`
- `user_role_assignments`
- `user_entity_scopes`
- `user_branch_scopes`
- `user_department_scopes`
- `user_location_scopes`
- `tenant_product_entitlements`
- `tenant_module_entitlements`
- `user_module_overrides`

## 4. Role Model

## 4.1 Platform Roles
These are Watchman internal platform roles, not tenant business roles.

- Platform Super Admin
- Platform Support Admin
- Platform Read-Only Support
- Platform Implementation Specialist

These roles must be excluded from normal tenant UI access and handled through separate administrative tooling, support impersonation controls, or audited support sessions.

## 4.2 Tenant Business Roles

### Executive Finance Roles
- Tenant Owner
- Finance Admin
- Controller
- CFO / Executive Finance Viewer

### Accounting Roles
- Senior Accountant
- Staff Accountant
- Bookkeeper
- Billing Specialist
- AP Specialist
- AR Specialist
- Treasury Specialist

### Payroll and HR-Adjacent Roles
- Payroll Admin
- Payroll Reviewer
- Leave Administrator
- Benefits and Deduction Manager

### Operations-Coupled Roles
- Operations Manager Finance Viewer
- Branch Manager Finance Viewer
- Inventory and Asset Manager
- Contract Profitability Analyst

### General Read Roles
- Executive Read-Only
- Department Read-Only
- Auditor Read-Only
- External Accountant

### Limited Self-Service Roles
- Employee Self-Service
- Supervisor Limited Approver
- Client Billing Portal User

## 4.3 Role Design Rule
Do not rely on role names alone. Every role must resolve to explicit permissions.

## 5. Permission Model

Permissions should be granular and action-based, not page-based.

## 5.1 Permission Categories

### Tenant Administration
- tenant.read
- tenant.update
- entity.read
- entity.create
- entity.update
- entity.close_period
- entity.reopen_period

### User and Access Management
- user.read
- user.invite
- user.role_assign
- user.scope_assign
- user.deactivate

### General Ledger
- gl.account.read
- gl.account.manage
- gl.journal.draft.create
- gl.journal.draft.edit
- gl.journal.submit
- gl.journal.approve
- gl.journal.post
- gl.journal.reverse
- gl.period.close
- gl.period.reopen

### AR
- ar.customer.read
- ar.customer.manage
- ar.invoice.draft.create
- ar.invoice.draft.edit
- ar.invoice.issue
- ar.invoice.void
- ar.invoice.credit
- ar.payment.record
- ar.payment.apply
- ar.payment.refund
- ar.collections.manage

### AP
- ap.vendor.read
- ap.vendor.manage
- ap.bill.draft.create
- ap.bill.draft.edit
- ap.bill.approve
- ap.bill.post
- ap.payment.create
- ap.payment.approve
- ap.payment.release
- ap.bill.void

### Banking
- bank.account.read
- bank.account.manage
- bank.transaction.import
- bank.reconciliation.create
- bank.reconciliation.approve
- bank.transfer.create
- bank.transfer.approve

### Payroll
- payroll.profile.read
- payroll.profile.manage
- payroll.run.create
- payroll.run.calculate
- payroll.run.review
- payroll.run.approve
- payroll.run.finalize
- payroll.run.reverse
- payroll.pay_statement.read
- payroll.tax.manage
- payroll.ach.generate
- payroll.ach.release

### Leave and Accruals
- leave.policy.read
- leave.policy.manage
- leave.request.create
- leave.request.approve
- leave.balance.adjust
- leave.accrual.run

### Products and Services
- catalog.item.read
- catalog.item.manage
- catalog.pricing.manage
- catalog.bundle.manage

### Inventory and Asset Control
- inventory.item.read
- inventory.item.manage
- inventory.receive
- inventory.issue
- inventory.transfer
- inventory.adjust
- inventory.count.manage
- asset.assign
- asset.return
- asset.writeoff

### Budgeting and Forecasting
- budget.read
- budget.create
- budget.edit
- budget.submit
- budget.approve
- budget.lock
- forecast.read
- forecast.manage
- scenario.manage

### Reporting and Exports
- report.read_standard
- report.read_sensitive
- report.export
- report.schedule
- report.design

### Audit and Compliance
- audit.read
- tax.liability.read
- tax.liability.manage
- tax.filing.manage
- compliance.read
- compliance.manage

## 5.2 Permission Bundles
Roles should be generated from permission bundles, such as:
- accounting_core_bundle
- payroll_processing_bundle
- billing_bundle
- treasury_bundle
- inventory_control_bundle
- executive_reporting_bundle
- self_service_bundle

## 6. Data Access Classification
Each table should be classified into one of four access classes.

## 6.1 Class A: Browser Read / Browser Limited Update
These tables can be read in the browser and in some cases lightly edited if the user has scope.
Examples:
- customers
- vendors
- draft invoice headers before issue
- draft bill headers before approval
- leave requests
- catalog items
- inventory items
- employee self-service payment preference requests

## 6.2 Class B: Browser Read / Server Mutation Only
Users may read these records in the browser, but create, edit, approval, posting, or reversal must occur only through server actions.
Examples:
- payroll runs
- posted invoices
- posted bills
- journal entries
- tax liabilities
- bank reconciliations
- inventory adjustments
- budget approvals

## 6.3 Class C: Restricted Read / Server Mutation Only
These records should have highly restricted read access and server-only mutation.
Examples:
- employee bank account tokens
- ACH batches
- payroll tax deposit records
- support impersonation logs
- raw processor payloads
- external integration secrets

## 6.4 Class D: Platform Only
These records should be inaccessible to tenant UI users.
Examples:
- platform feature flags
- support session records
- global implementation metadata
- secret management references

## 7. RLS Standards

## 7.1 Core Tenant Policy Pattern
All tenant-owned tables must enforce:
- authenticated user
- active tenant membership
- matching `tenant_id`
- optional entity scope requirement
- optional module entitlement requirement

Example policy rule pattern:
- allow select when the current authenticated user has an active membership in the row's `tenant_id` and has module access and record scope

## 7.2 Entity Scope Policy Pattern
For entity-scoped finance tables, selection must also require one of the following:
- all-entities permission for that tenant
- explicit match in `user_entity_scopes`
- explicit inherited access through allowed branches or departments if the entity mapping model allows it

## 7.3 Draft vs Posted Policy Pattern
RLS may permit draft visibility and limited draft updates for authorized users, but once records are posted:
- browser updates should be denied
- only reversal or correction workflows through server actions should be allowed

## 7.4 Soft Delete Rule
Do not allow normal users to hard delete finance records. Use:
- status transitions
- void workflows
- reversal entries
- archived flags
- audit-linked deactivation

## 7.5 Period Lock Rule
When a fiscal period is closed:
- no mutations affecting that period should be allowed except by explicit reopen permission through server action
- RLS alone is not sufficient; service-layer checks must enforce this across all workflows

## 8. Recommended Claims and Context Resolution

Supabase auth should identify the user. Application logic should then resolve a session context containing:
- user_id
- current_tenant_id
- allowed_entity_ids
- allowed_branch_ids
- allowed_department_ids
- active_role_ids
- active_permission_codes
- enabled_modules
- period_lock_state_cache if needed

Do not store all permissions in JWT if the set is too large or changes frequently. Resolve effective permissions at session boot or through a server-side context service.

## 9. Browser-Safe vs Server-Only Tables

## 9.1 Browser-Safe Read Tables
Examples:
- tenants
- entities
- departments
- branches
- locations
- customers
- vendors
- catalog items
- inventory items
- approved leave balances for self-service display
- standard reports materialized for allowed users

## 9.2 Server-Only Mutation Tables
Examples:
- journal_entries
- journal_entry_lines
- payroll_runs
- payroll_run_items
- employee_tax_profiles final approval changes
- employee_bank_accounts final activation
- ach_batches
- tax_liabilities
- tax_filing_periods
- reconciliation_headers
- reconciliation_lines
- fiscal_period_closures
- budget_versions once submitted

## 9.3 Highly Restricted Tables
Examples:
- payment instrument tokens
- integration_credentials
- raw webhook payload archives
- support access session logs
- external account verification details

## 10. Module-Specific Permission Guidance

## 10.1 General Ledger
Only accountants or above should:
- submit journals
- approve journals
- post journals
- reverse journals
- close periods

Branch managers or operations viewers may see summarized reporting, but should not access detailed journal editing.

## 10.2 Payroll
Payroll data should be split into levels:
- self-service employee view
- manager summary view
- payroll processing view
- full payroll admin view

For example:
- employees may read only their own pay statements and balances
- supervisors may view payroll readiness summaries without bank account details
- payroll admins may manage calculations and ACH preparation
- only treasury/authorized payroll release roles may release ACH batches

## 10.3 Banking and Treasury
Bank account management, transfers, ACH generation, and payment release should require the strongest permissions and ideally maker-checker approval.

## 10.4 Inventory and Asset Control
Inventory clerks may receive and issue stock, but adjustments above threshold, writeoffs, and asset disposals should require approval.

## 10.5 Budgeting and Forecasting
Department heads may draft budgets within scope, but only finance approvers can lock approved budget versions.

## 11. Self-Service Access Model

## 11.1 Employee Self-Service
Employees should be able to:
- view own pay statements
- view own year-to-date payroll summaries
- view own leave balances
- submit leave requests
- submit bank change requests
- update non-sensitive profile preferences where allowed

Employees should not directly update active bank details used for payroll without a controlled workflow.

## 11.2 Supervisor Limited Approver
Supervisors may:
- approve leave within scope
- review payroll readiness exceptions for their teams
- view team labor summaries
- review issued equipment for their staff

Supervisors should not:
- run payroll
- post journals
- release payments
- alter tax setup

## 11.3 Client Billing Portal User
If enabled, client users may:
- view invoices for their customer account
- download invoice PDFs
- review statements
- make payments if payment acceptance is enabled

They must never see internal cost, payroll, or unrelated customer data.

## 12. Maker-Checker Controls
The following functions should use maker-checker or dual-control patterns where practical:
- ACH release
- bank transfer approval
- journal posting above threshold
- writeoff approval above threshold
- period close
- budget lock
- tax filing submission

Recommended pattern:
- creator cannot be final approver when the transaction exceeds configured risk thresholds

## 13. Audit Logging Requirements
Every material permission-sensitive action must log:
- actor_user_id
- acting_role_id or resolved permission context
- tenant_id
- entity_id if applicable
- module
- action code
- target table and record id
- timestamp
- status
- old value snapshot where permitted
- new value snapshot where permitted
- source channel such as ui, api, sync, webhook, support

## 14. Support and Impersonation Controls
If platform support access exists, it must:
- require explicit support role
- require tenant-scoped authorization
- create a support session record
- log start and end time
- log reason for access
- restrict access to least privilege possible
- optionally require tenant consent for highly sensitive production access

## 15. Recommended Implementation Pattern in Supabase

## 15.1 RLS Enforcement
Enable RLS on every tenant-owned table. No exceptions.

## 15.2 View Strategy
Use secure SQL views or materialized views for common reporting outputs so the browser reads summarized data without touching raw sensitive tables unnecessarily.

## 15.3 Edge Function Strategy
Use Supabase Edge Functions or other server-side endpoints for:
- posting journals
- issuing invoices
- posting bills
- calculating payroll
- finalizing payroll
- generating ACH batches
- creating tax liabilities
- closing periods
- locking budgets
- applying sensitive inventory adjustments

## 15.4 Database Function Strategy
Use database functions only where atomic transaction integrity is essential. Wrap them through server-side service endpoints rather than exposing them directly to the browser.

## 16. Policy Templates

## 16.1 Template: Tenant-Scoped Select
Allow select when:
- auth user exists
- user has active tenant membership
- row tenant matches membership tenant
- user has module entitlement and read permission
- user is within entity scope if table is entity-scoped

## 16.2 Template: Draft Update
Allow update when:
- record status is draft
- user has explicit edit permission
- user is in scope
- fiscal period is open if relevant
- record was not already submitted or approved

## 16.3 Template: Self-Record Access
Allow select on self-service tables when:
- row employee user id or linked person id matches auth user id
- row tenant matches active membership

## 16.4 Template: Deny Posted Updates
Deny direct update when:
- record status is posted, finalized, closed, released, settled, or locked

## 17. Rollout Order

### Phase 1
Define and migrate:
- tenant membership tables
- role and permission tables
- user scope tables
- tenant module entitlements

### Phase 2
Apply RLS to:
- entity structure tables
- customer/vendor tables
- catalog and inventory read tables
- leave self-service tables

### Phase 3
Apply server-only mutation boundaries to:
- GL
- AR posting workflows
- AP posting workflows
- payroll
- banking
- tax

### Phase 4
Implement advanced controls:
- maker-checker thresholds
- support impersonation controls
- scheduled report permissions
- sensitive export controls

## 18. Final Standard
Watchman Finance permissions must follow this rule:

A user can only see what they are entitled to see, can only act within their tenant and entity scope, can only mutate sensitive finance data through controlled server workflows, and can never bypass audit, approval, or period-lock rules through client-side access.

That standard should remain fixed across every module in Finance.
