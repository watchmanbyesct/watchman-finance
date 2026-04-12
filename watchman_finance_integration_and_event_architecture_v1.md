# Watchman Finance Integration and Event Architecture v1

## 1. Purpose

This document defines how Watchman Launch, Watchman Operations, and Watchman Finance should exchange data in a controlled, multi-tenant, multi-entity architecture.

The goal is to ensure:

- each product has a clear system-of-record boundary
- data moves through explicit contracts
- finance-critical records are not corrupted by loose cross-app updates
- every integration is tenant-safe, auditable, and replayable
- the architecture supports internal EST Holdings use first and future commercial multi-tenant use later

## 2. Product System-of-Record Boundaries

## 2.1 Watchman Launch
Launch is the system of record for:

- tenant setup inputs
- business profile setup
- employee master identity
- onboarding and employment profile setup
- training and certification records
- organizational placement inputs
- customer and client onboarding inputs
- service catalog setup inputs where used upstream

## 2.2 Watchman Operations
Operations is the system of record for:

- schedules
- shifts
- attendance events
- worked hours
- post coverage
- patrol and service activity execution
- operational exceptions
- field service completion facts
- site-level operational events

## 2.3 Watchman Finance
Finance is the system of record for:

- payroll calculation and payroll control
- leave and accrual balances
- accounting
- AR and AP
- products and services accounting mappings
- contract billing and invoice generation
- banking and reconciliation
- tax liabilities and filing control
- budgeting and forecasting
- inventory and asset accounting
- financial reporting

## 3. Integration Design Principles

### 3.1 No Shared Table Ownership
No two products should directly co-own the same business table. Data may be copied, synced, referenced, or transformed, but ownership must remain singular.

### 3.2 Canonical Event and Snapshot Model
Cross-product data exchange should use:
- event messages for transactional changes
- snapshot syncs for master data reconciliation
- import staging for sensitive finance ingestion

### 3.3 Finance Does Not Trust Raw Cross-App Writes
Finance should not accept direct browser-side writes from Launch or Operations into payroll, journal, invoice, tax, reconciliation, or other posted finance records.

### 3.4 Tenant and Entity Context Must Travel with Every Integration
Every event, sync payload, and integration record should include:
- tenant_id
- entity_id when applicable
- source system
- source record id
- occurred_at
- received_at
- actor or system actor
- event version

### 3.5 Integrations Must Be Idempotent
If the same event is received twice, Finance should safely ignore or merge duplicate processing.

### 3.6 Replayability Matters
Events should be loggable and re-runnable where practical, especially for payroll preparation, billing preparation, and data correction workflows.

## 4. Recommended Integration Pattern

Use a hybrid approach:

### 4.1 Master Data Sync
Use scheduled or on-demand sync for:
- employees
- customer records
- entity and org structure
- certifications and eligibility data
- service catalog data

### 4.2 Transactional Event Ingestion
Use event-based integration for:
- approved timecards
- shift completion
- service delivery events
- leave approvals
- billing triggers
- inventory issue/return events
- payroll release and status events

### 4.3 Finance Ingestion Staging
Finance should ingest external product data into staging tables first, validate it, then promote it into finance-native tables through server workflows.

## 5. Integration Object Classes

## 5.1 Master Objects
These are long-lived records that may be periodically synchronized.

Examples:
- employees
- customers
- entities
- branches
- departments
- locations
- certifications
- service items

## 5.2 Transaction Objects
These are discrete business facts.

Examples:
- timecard approved
- patrol completed
- incident billable
- shift differential applied
- leave approved
- inventory issued
- equipment lost
- invoice paid
- ACH batch settled

## 5.3 Derived Finance Objects
These are created only in Finance after validation.

Examples:
- payroll run items
- invoice lines generated from operations
- journal entries
- tax liabilities
- leave liability snapshots
- budget variance snapshots

## 6. Canonical Integration Flow

## 6.1 Launch to Finance

### Employee master sync
Launch sends:
- employee external id
- legal name
- email
- employment status
- hire date
- department and branch assignment
- entity assignment
- default pay profile inputs
- tax profile prerequisites
- bank setup request status
- training and certification status where relevant to eligibility

Finance receives and stores:
- employee reference link
- finance employee profile
- payroll eligibility state
- leave eligibility state
- entity and department alignment

### Customer and contract setup sync
Launch sends:
- customer master
- billing contacts
- sites
- contract terms
- contract service package setup
- billing preferences
- pricing defaults where configured

Finance receives and stores:
- customer records
- billing account structures
- contract billing configuration
- revenue mapping references

## 6.2 Operations to Finance

### Approved time sync
Operations sends:
- employee id
- tenant_id
- entity_id
- pay period
- timecard id
- approved hours
- regular hours
- overtime hours
- holiday hours
- differentials
- site worked
- cost center reference
- approval metadata

Finance receives into staging:
- staged_time_entries
- staged_payroll_hours
- payroll exception checks

Finance promotes into:
- payroll input records
- labor cost records
- invoice generation candidates where billable

### Service delivery sync
Operations sends:
- patrol completions
- site visits
- scheduled service completion
- billable incidents
- event service completions
- service adjustments
- shift fulfillment or no-show facts

Finance uses these for:
- invoice candidate creation
- billing leakage detection
- profitability analysis
- contract compliance analysis

### Inventory and equipment operational events
Operations may send:
- damaged equipment report
- lost equipment report
- equipment transfer event
- field issue request

Finance records:
- asset incident records
- adjustment review items
- writeoff workflow candidates

## 6.3 Finance to Launch and Operations

### Finance to Launch
Finance may return:
- payroll completion status
- leave balance summary
- employee pay profile readiness flags
- inventory issue status
- separation return obligations

### Finance to Operations
Finance may return:
- approved leave status
- payroll cutoff status
- labor cost summaries
- billing lockouts
- client account exception flags
- cost center budget warnings

## 7. Recommended Integration Tables

## 7.1 Common Integration Control
- integration_systems
- integration_connections
- integration_sync_jobs
- integration_sync_runs
- integration_event_log
- integration_dead_letter_queue
- integration_replay_requests
- external_record_links
- external_id_mappings
- sync_watermarks

## 7.2 Staging Tables
- staged_employees
- staged_customers
- staged_contracts
- staged_time_entries
- staged_service_events
- staged_leave_events
- staged_inventory_events
- staged_payment_events

## 7.3 Promotion and Validation Tables
- ingestion_validation_errors
- ingestion_review_queue
- ingestion_promotion_runs
- ingestion_promotion_items

## 8. Event Design Standard

Every event should include the following envelope:

- event_id
- event_type
- event_version
- source_system
- source_record_type
- source_record_id
- tenant_id
- entity_id if applicable
- occurred_at
- published_at
- actor_type
- actor_id
- correlation_id
- payload_json
- checksum or dedupe key

## 8.1 Recommended Event Names
Examples:
- employee.created
- employee.updated
- employee.status_changed
- customer.created
- contract.activated
- timecard.approved
- shift.completed
- service_event.billable_recorded
- leave_request.approved
- inventory_item.issued
- equipment_asset.lost
- payroll.run.finalized
- invoice.issued
- payment.received
- ach_batch.settled

## 8.2 Event Versioning
When payload structure changes:
- increment event_version
- continue to support older versions during transition
- do not silently break subscribers

## 9. Validation Rules Before Finance Promotion

Finance should validate imported data for:
- tenant match
- entity match
- active employee or customer state
- open fiscal or payroll period
- duplicate submission
- missing pricing
- missing pay profile
- invalid contract mapping
- invalid GL mapping
- expired eligibility where relevant
- required approval metadata

Invalid items should land in:
- review queue
- exception dashboard
- reconciliation reports

## 10. Idempotency and Replay

## 10.1 Idempotency Key Pattern
Use a dedupe key such as:
source_system + source_record_type + source_record_id + event_type + version hash

## 10.2 Replay Rules
Allow replay when:
- downstream failure occurred
- validation rules changed
- mapping was corrected
- support approved a controlled reprocess

Replay should never silently overwrite posted finance records. It should create:
- correction workflow
- reversal workflow
- adjustment candidates

## 11. Sync Modes

## 11.1 Real-Time or Near Real-Time
Use for:
- leave approvals needed by scheduling
- payroll readiness flags
- payment status updates
- invoice issue status
- urgent operational exceptions

## 11.2 Scheduled Batch
Use for:
- employee master sync
- contract data refresh
- budget snapshots
- forecast source refresh
- overnight payroll preparation staging

## 11.3 Manual Controlled Import
Use for:
- opening balances
- historical payroll imports
- correction loads
- initial QuickBooks migration data

## 12. QuickBooks Transition Pattern

During transition from QuickBooks Online:

### Keep QuickBooks as legacy source only where necessary
Use QBO for:
- historical reference
- opening balances
- prior invoice reference
- comparative reporting during transition

### Move system-of-record functions to Finance by wave
Wave 1:
- customers
- chart of accounts
- invoices
- bills

Wave 2:
- payroll and leave
- bank reconciliation
- financial reports

Wave 3:
- budgeting
- forecasting
- inventory and asset control
- full close process

## 13. Failure Handling Standards

When an integration fails:
- mark sync run failed
- log error code and detail
- preserve payload
- route to dead-letter queue if needed
- notify operations/admin dashboards where relevant
- do not partially post finance records without explicit recovery rules

## 14. Security Standards for Integrations

- all integrations must be tenant-scoped
- integration secrets must be server-only
- webhook endpoints must verify signatures where used
- integration logs must exclude raw sensitive bank data
- replay must require privileged permission
- support access to payloads must be audited

## 15. Suggested Implementation Pattern for Supabase and Vercel

### Supabase
Use:
- tables for integration logs, staging, and mappings
- RLS on tenant-owned logs where tenant UI access is allowed
- service role only for backend integration workers
- database functions for atomic promotion when needed

### Vercel / server layer
Use:
- server routes or scheduled jobs for sync orchestration
- queue-style processing for event promotion
- retry policies with backoff
- operator dashboards for exception handling

### Preferred rule
Do not let browser clients publish authoritative finance integration events directly.

## 16. Recommended First Integration Workstreams

### Workstream 1. Employee Master Sync
Launch -> Finance

### Workstream 2. Customer and Contract Sync
Launch -> Finance

### Workstream 3. Approved Time Ingestion
Operations -> Finance

### Workstream 4. Leave Approval Sync
Finance -> Operations and Operations -> Finance where needed

### Workstream 5. Service Delivery Billing Feed
Operations -> Finance

### Workstream 6. Payroll Status Return Feed
Finance -> Launch and Operations

## 17. Final Standard

Launch creates the person and commercial context.
Operations creates the worked and delivered context.
Finance creates the payable, billable, taxable, reportable, and bookable context.

Data must move between them through explicit integration contracts, staged validation, tenant-safe scoping, idempotent processing, and auditable server-side promotion workflows.
