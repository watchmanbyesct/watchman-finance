# Watchman Finance Implementation Workbook for AI and Development v1

## 1. Purpose

This workbook is a practical execution guide for using AI assistants and developers to build Watchman Finance in disciplined work packets.

It is meant to help with:
- Claude or ChatGPT build sessions
- GitHub issue breakdown
- developer handoff
- testing order
- implementation sequencing

## 2. Core Rule

Never ask the AI to build all of Watchman Finance at once.

Always break work into:
- one domain
- one migration pack
- one server action set
- one screen group
- one test set

## 3. Recommended Work Packet Order

### Packet 1. Tenancy foundation
Ask for:
- SQL schema for tenants, entities, memberships
- types and validation schemas
- tenant bootstrap server action
- initial admin setup UI

### Packet 2. Roles and permissions
Ask for:
- permission registry
- roles and role mapping
- scope tables
- RLS helper functions
- permission resolution service

### Packet 3. Audit and settings
Ask for:
- audit log schema
- audit middleware
- finance settings schema
- tenant/entity settings actions

### Packet 4. Chart of accounts and fiscal periods
Ask for:
- accounts schema
- fiscal period schema
- create/update/archive actions
- close and reopen actions
- setup screens

### Packet 5. Integration backbone
Ask for:
- integration tables
- staging tables
- event ingest handlers
- promotion services
- exception UI

### Packet 6. Employee and customer sync
Ask for:
- staged employee promotion
- staged customer promotion
- external id mapping
- conflict handling

### Packet 7. AR
Ask for:
- invoice schema
- invoice draft UI
- issue/void/payment actions
- aging queries
- dashboard

### Packet 8. AP
Ask for:
- bill schema
- bill entry UI
- approve/post actions
- AP aging

### Packet 9. Payroll
Ask for:
- pay profile schema
- pay group/pay period schema
- payroll run schema
- calculation action
- review UI
- pay statements

### Packet 10. Leave and accruals
Ask for:
- leave schema
- request/approval UI
- accrual run action
- balance ledger views

### Packet 11. Banking
Ask for:
- bank schema
- import and reconciliation actions
- treasury views

### Packet 12. Catalog and billing
Ask for:
- catalog schema
- pricing actions
- billing candidate generation
- billing exception views

### Packet 13. Inventory
Ask for:
- inventory schema
- receive/issue/return workflows
- asset assignment views

### Packet 14. Reporting
Ask for:
- financial statement queries
- executive dashboard
- payroll dashboard
- labor and profitability reports

## 4. Prompt Template for AI Build Sessions

Use a prompt structure like this:

1. Objective
State exactly what module or packet is being built.

2. Constraints
State:
- Supabase backend
- Vercel frontend
- multi-tenant
- entity-aware
- server-side sensitive actions
- audit logging required
- no direct browser writes for posted/finalized records

3. Inputs
Provide:
- relevant architecture docs
- relevant tables
- relevant workflow requirements

4. Requested outputs
Ask for:
- SQL migration
- TypeScript types
- Zod validation schemas
- server action stubs
- React screen structure
- test cases

5. Non-negotiables
Require:
- tenant_id handling
- permission checks
- audit hooks
- reversal/correction approach where relevant

## 5. Developer Handoff Template

For each module, hand off:
- purpose
- owned tables
- source systems
- user roles
- sensitive actions
- required reports
- acceptance criteria
- test cases
- dependencies

## 6. Testing Order

### First
- schema integrity
- tenant isolation
- role/permission enforcement
- audit logging

### Second
- server action validation
- state transitions
- reversal/correction rules
- period lock enforcement

### Third
- integration ingestion
- dedupe and replay
- exception queue behavior

### Fourth
- UI workflows
- reporting
- exports

## 7. GitHub Issue Structure

Each issue should include:
- summary
- business reason
- tables affected
- APIs/actions affected
- permissions affected
- audit impact
- dependencies
- acceptance criteria
- test notes

## 8. Acceptance Criteria Pattern

Every finance-critical story should specify:
- who can perform the action
- what status transitions are allowed
- what records are created or updated
- what audit entry is written
- what happens on error
- how reversal or correction works

## 9. AI Safety Rail for Development

Do not accept code from AI that:
- omits tenant_id
- skips permission checks
- allows direct mutation of posted records
- omits audit logging on sensitive actions
- bypasses period locks
- conflates Launch, Operations, and Finance ownership

## 10. Recommended First Build Sequence

1. tenancy
2. permissions
3. audit
4. chart of accounts
5. fiscal periods
6. integration backbone
7. employee/customer sync
8. AR/AP
9. payroll
10. leave
11. banking
12. catalog/billing
13. inventory
14. reporting

## 11. Final Rule

Use the architecture docs to decide what to build.
Use this workbook to decide how to build it in manageable, verifiable packets.
