# Watchman Finance GitHub Epics and Issue Sets by Release Group
## Execution Backlog for Packs 001 Through 012

## 1. Purpose

This document converts the Watchman Finance implementation program into a GitHub-ready execution structure organized by release group.

It is intended to support:

- GitHub epic creation
- issue breakdown by pack
- dependency tracking
- release planning
- implementation ownership
- QA and rollout discipline

## 2. Delivery Model

The recommended GitHub structure should use:

- **Epics** for major program areas
- **Milestones** for release groups
- **Issues** for implementation work
- **Subtasks or checklists** for acceptance criteria and technical steps

## 3. Release Group Structure

### Release Group A
- Pack 001 Foundation
- Pack 002 Integration Staging and Sync

### Release Group B
- Pack 003 AR and AP Core
- Pack 004 Payroll Core
- Pack 005 Leave and Accrual Management
- Pack 006 Banking and Reconciliation

### Release Group C
- Pack 007 Products, Services, and Contract Billing
- Pack 008 Inventory and Asset Control

### Release Group D
- Pack 009 Reporting and Dashboard Foundation
- Pack 010 Budgeting and Forecasting

### Release Group E
- Pack 011 Multi-Entity Consolidation and Commercial Readiness
- Pack 012 Hardening, QA, and Production Readiness

## 4. Recommended GitHub Milestones

### Milestone 1
Watchman Finance Release Group A

### Milestone 2
Watchman Finance Release Group B

### Milestone 3
Watchman Finance Release Group C

### Milestone 4
Watchman Finance Release Group D

### Milestone 5
Watchman Finance Release Group E

## 5. Epic Structure

## Epic 1. Tenant, Entity, Security, and Integration Foundation
### Covers
- Pack 001
- Pack 002

### Objective
Establish multi-tenant finance foundations, role and permission control, audit structure, and safe data intake from Watchman Launch and Watchman Operations.

### Suggested issues
1. Create tenant, entity, branch, department, location, and cost-center schema
2. Create platform user, membership, profile, and scope schema
3. Create roles, permissions, role-permission mapping, and user assignment schema
4. Create tenant settings, entity settings, and finance settings schema
5. Create audit log structure and audit helper services
6. Create chart of accounts and fiscal period schema
7. Create baseline RLS helper functions and policies
8. Create integration systems, connections, sync jobs, and sync run schema
9. Create integration event log, dead-letter queue, and replay request schema
10. Create external ID mappings and sync watermark schema
11. Create Launch and Operations staging tables
12. Create finance_people promotion target structure
13. Build foundation server action layer
14. Build integration ingest and promotion server actions
15. Validate tenant isolation and entity scope enforcement

## Epic 2. Accounts Receivable and Accounts Payable
### Covers
- Pack 003

### Objective
Enable customer, vendor, invoice, bill, and payment workflows under finance control.

### Suggested issues
1. Create customer and customer site schema
2. Create vendor schema
3. Create invoice and invoice line schema
4. Create credit memo schema
5. Create customer payment schema
6. Create bill and bill line schema
7. Create vendor payment schema
8. Create invoice source linkage schema
9. Build AR server actions
10. Build AP server actions
11. Add AR and AP read models
12. Validate AR and AP RLS behavior
13. Define acceptance tests for invoice and bill lifecycle states

## Epic 3. Payroll and Leave Management
### Covers
- Pack 004
- Pack 005

### Objective
Turn approved time and leave structures into payroll-ready and payroll-controlled workflows.

### Suggested issues
1. Create pay group and pay period schema
2. Create employee pay profile and employee tax profile schema
3. Create payroll run, payroll input, payroll item, earnings, deductions, and pay statement schema
4. Create payroll approval log schema
5. Build payroll run server actions
6. Create leave type, leave policy, assignment, and accrual rule schema
7. Create leave profile, leave balance ledger, and leave adjustment schema
8. Create leave request, leave request day, and leave approval schema
9. Create holiday calendar and leave liability snapshot schema
10. Build leave and accrual server actions
11. Validate approved time load into payroll input structure
12. Validate payroll run lifecycle
13. Validate leave request and approval lifecycle
14. Validate leave-to-payroll readiness logic

## Epic 4. Banking, Reconciliation, and Treasury
### Covers
- Pack 006

### Objective
Provide finance-owned cash visibility, reconciliation control, and treasury workflow support.

### Suggested issues
1. Create bank account schema
2. Create bank transaction schema
3. Create reconciliation and reconciliation line schema
4. Create transfer request schema
5. Create receipt matching schema
6. Build bank account and transaction import actions
7. Build reconciliation creation and approval actions
8. Build bank transaction matching actions
9. Build transfer request actions
10. Validate cash-control read models
11. Validate reconciliation workflow permissions

## Epic 5. Catalog, Billing, Inventory, and Asset Control
### Covers
- Pack 007
- Pack 008

### Objective
Define products, services, pricing, billing conversion, uniforms, equipment, stock control, and asset accountability.

### Suggested issues
1. Create catalog category, type, and item schema
2. Create catalog account-mapping schema
3. Create catalog pricing, customer pricing, and contract pricing schema
4. Create bundle and billing rule schema
5. Create contract rate-card schema
6. Create billable candidate and billing exception schema
7. Build catalog and billing server actions
8. Create inventory category, location, and item schema
9. Create inventory vendor item and GL mapping schema
10. Create stock balance schema
11. Create receipt, transfer, adjustment, and count schema
12. Create equipment asset and assignment schema
13. Create employee item issue, return, and acknowledgment schema
14. Create equipment incident and reorder rule schema
15. Build inventory and asset server actions
16. Validate billing-candidate-to-invoice conversion
17. Validate stock receipt and transfer logic
18. Validate asset issue and return workflow

## Epic 6. Reporting, Dashboards, Planning, and Close Management
### Covers
- Pack 009
- Pack 010

### Objective
Provide management reporting, KPI visibility, close-task structure, budgeting, forecasting, and variance support.

### Suggested issues
1. Create report definition and snapshot schema
2. Create dashboard definition and snapshot schema
3. Create KPI definition and snapshot schema
4. Create close checklist and close task schema
5. Create foundational reporting views
6. Build report snapshot generation actions
7. Build executive dashboard snapshot generation actions
8. Create budget version, budget line, and budget approval schema
9. Create forecast version, forecast line, and scenario input schema
10. Create variance snapshot schema
11. Create planning support views
12. Build budget server actions
13. Build forecast and variance server actions
14. Validate report and dashboard snapshot generation
15. Validate budget approval workflow
16. Validate budget-versus-forecast snapshot generation

## Epic 7. Consolidation, Commercial Readiness, and Production Hardening
### Covers
- Pack 011
- Pack 012

### Objective
Prepare Watchman Finance for multi-entity enterprise use, controlled commercialization, release governance, and production hardening.

### Suggested issues
1. Create entity relationship schema
2. Create consolidation group, membership, and snapshot schema
3. Create intercompany account and transaction schema
4. Create provisioning template and tenant bootstrap run schema
5. Create feature flag definition and tenant feature flag schema
6. Create activation checklist and activation task schema
7. Create client portal profile schema
8. Build consolidation and commercialization server actions
9. Create test suite, test run, and test result schema
10. Create release version, checklist, and release task schema
11. Create system health check and operational alert schema
12. Create job run history and audit review schema
13. Create backup verification, restore test, and disaster recovery exercise schema
14. Build production-readiness server actions
15. Validate release readiness and operational monitoring views
16. Validate recovery and readiness control workflows

## 6. Recommended Issue Template Structure

Every implementation issue should use a standard structure.

### Suggested template

**Title**  
Clear, action-oriented title.

**Pack**  
Identify the pack number.

**Epic**  
Identify the parent epic.

**Release Group**  
Identify the milestone or release group.

**Objective**  
State exactly what the issue is supposed to deliver.

**Scope**  
List included work.

**Out of Scope**  
List excluded work.

**Dependencies**  
List schema, service, UI, or policy dependencies.

**Acceptance Criteria**  
Use explicit, testable statements.

**Technical Notes**  
Include tables, services, actions, and policy requirements.

**Testing Requirements**  
State expected validation and QA checks.

## 7. Recommended Labels

Use a label structure like this:

### Module labels
- finance-core
- integration
- ar
- ap
- payroll
- leave
- banking
- catalog
- billing
- inventory
- reporting
- planning
- consolidation
- platform

### Type labels
- schema
- server-action
- service-layer
- ui
- permissions
- audit
- reporting
- testing
- migration
- documentation

### Priority labels
- priority-critical
- priority-high
- priority-medium
- priority-low

### Status labels
- blocked
- ready
- in-progress
- in-review
- qa
- done

## 8. Recommended Initial Issue Creation Order

Create GitHub issues in this order:

### First wave
- all schema and migration issues for Release Group A
- permission and audit utility issues
- integration promotion issues

### Second wave
- transactional schema and action issues for Release Group B
- payroll and leave logic issues
- banking and reconciliation issues

### Third wave
- billing, catalog, inventory, and asset issues for Release Group C

### Fourth wave
- reporting, dashboards, budgeting, and forecasting issues for Release Group D

### Fifth wave
- consolidation, commercialization, QA, release, and recovery issues for Release Group E

## 9. Recommended Acceptance Gates by Release Group

### Release Group A gate
- tenant-safe schema exists
- RLS validated
- audit works
- Launch and Operations staging works

### Release Group B gate
- invoices and bills can be created
- payroll run can be created and calculated
- leave requests can be created and approved
- bank reconciliation workflow is functional

### Release Group C gate
- catalog and pricing can be configured
- billable candidates can be generated
- inventory stock can be received and transferred
- assets can be assigned and returned

### Release Group D gate
- reports and dashboards generate snapshots
- budgets and forecasts can be created
- variance snapshots generate successfully

### Release Group E gate
- consolidation groups function
- feature flags can be assigned
- release and readiness structures exist
- test and recovery structures function

## 10. Suggested Milestone Notes

### Milestone 1 note
Foundation and integration readiness for Watchman Finance.

### Milestone 2 note
Core transactional finance, payroll, leave, and banking capability.

### Milestone 3 note
Commercial billing and physical asset accountability.

### Milestone 4 note
Management visibility and planning.

### Milestone 5 note
Enterprise readiness, commercialization support, and production hardening.

## 11. Recommended Immediate GitHub Backlog Deliverables

After this document, the next strongest backlog deliverables are:

1. one GitHub issue file per epic
2. one milestone checklist per release group
3. acceptance-test issue set by module
4. migration validation issue set by environment
5. implementation owner matrix

## 12. Final Execution Rule

Every GitHub issue for Watchman Finance should trace back to:
- a pack
- an epic
- a release group
- a dependency path
- a permission and audit requirement
- a testing requirement
