# Watchman Finance Implementation Roadmap and Sprint Architecture v1

## 1. Purpose

This document translates the Watchman Finance architecture into an implementation sequence for a Supabase, Vercel, and GitHub delivery model.

The roadmap is designed for:

- internal-first deployment for EST Holdings
- multi-tenant architecture from day one
- integration with Watchman Launch and Watchman Operations
- controlled replacement of QuickBooks Online over time
- server-controlled finance workflows
- phased delivery that reduces rework and production risk

## 2. Delivery Strategy

The right strategy is not to build all modules at once.

The right strategy is:

1. establish platform and finance foundations
2. create ownership boundaries and secure data structures
3. build the systems that convert operations into payroll and accounting truth
4. add billing, inventory, planning, and analytics
5. replace QuickBooks in waves instead of in one hard cutover

## 3. Delivery Principles

### 3.1 Build for Production Use, Not Demo Use
Every phase should produce durable structures, even if some workflows remain partially manual at first.

### 3.2 Build Shared Foundations Before Feature Depth
Do not begin with payroll UI or reporting UI before:
- tenant model
- entity model
- permissions
- audit logs
- integration controls
- posting patterns
are stable.

### 3.3 Finance-Critical Workflows Must Use Server Actions
Posted and finalized finance records should never depend on loose client-side writes.

### 3.4 Replace QuickBooks by Domain, Not by Emotion
Move functions out of QuickBooks in a deliberate order:
- low-risk domains first
- control-heavy domains after foundations exist
- payroll and close only when reliability is proven

### 3.5 Launch and Operations Continue to Matter
Finance does not replace Launch or Operations. It consumes and governs their outputs.

## 4. Recommended Delivery Waves

## Wave 0. Product and Architecture Foundation

### Objective
Establish the structural base that every later module depends on.

### Deliverables
- final module ownership map
- final system-of-record map
- tenant and entity model
- role and permission model
- RLS patterns
- server action patterns
- integration event standards
- naming standards
- migration standards
- audit log standard
- environment and secrets strategy

### Output
A stable architecture baseline approved before feature build begins.

## Wave 1. Platform and Finance Core Foundation

### Objective
Create the first production-grade finance backbone.

### Modules in scope
- tenant management foundation
- entity structure
- user membership and role scaffolding
- chart of accounts
- fiscal periods
- journal framework
- audit logging
- customer and vendor foundation
- finance settings foundation

### Deliverables
- base schema migrations
- tenant-aware seed data patterns
- roles and permission tables
- core finance master tables
- secure server action shell
- first admin screens for setup

### Why this comes first
Everything else in Finance depends on these structures.

## Wave 2. Integration Foundation

### Objective
Connect Launch and Operations to Finance safely.

### Modules in scope
- employee master sync
- customer and contract sync
- approved time ingestion staging
- service delivery event staging
- validation and exception queue
- external id mappings
- sync monitoring

### Deliverables
- integration tables
- staging tables
- ingestion validation logic
- replay support
- exception review UI
- initial sync jobs and scheduling

### Why this comes now
Finance cannot become authoritative until it can safely consume data from the other Watchman products.

## Wave 3. Accounts Receivable and Accounts Payable Core

### Objective
Get Watchman Finance handling commercial transactions and payables.

### Modules in scope
- customers
- vendors
- invoices
- invoice lines
- bills
- bill lines
- payment application
- vendor payment preparation
- credit memos
- statements and aging

### Deliverables
- AR workflows
- AP workflows
- invoice issue actions
- bill posting actions
- customer and vendor dashboards
- AR and AP reports
- ledger posting hooks

### Transitional use
QuickBooks may still remain reference source for historical balances at this stage.

## Wave 4. Payroll and Leave Foundation

### Objective
Turn approved operational data into payroll-ready data.

### Modules in scope
- employee pay profiles
- pay groups
- pay periods
- payroll staging
- payroll calculation engine
- earnings and deductions
- employee tax profiles
- leave types
- leave policies
- accrual rules
- leave requests and balances
- pay statements

### Deliverables
- payroll control center
- payroll readiness dashboard
- leave administration screens
- payroll calculation server actions
- payroll exception workflows
- leave to payroll mapping

### Important note
Start with payroll calculation and payroll control before ACH and tax release automation.

## Wave 5. Banking, Reconciliation, and Treasury Control

### Objective
Create the money movement and cash-control layer.

### Modules in scope
- bank accounts
- bank transaction imports
- reconciliation
- transfers
- treasury controls
- receipt matching
- payment release controls
- payroll funding workflows

### Deliverables
- bank account setup screens
- reconciliation workflow
- transfer approval flow
- receipt application and deposit matching
- treasury dashboards

### Importance
This wave improves confidence before full payroll release and final QuickBooks exit.

## Wave 6. Payroll ACH and Tax Control

### Objective
Make Watchman Finance operational for payroll release and statutory control.

### Modules in scope
- ACH batch generation
- employee payment method workflows
- bank account validation workflow
- payroll release controls
- tax liabilities
- deposit calendars
- filing period control
- tax compliance dashboards

### Deliverables
- ACH batch actions
- payroll release and reversal workflows
- tax liability views
- filing calendar
- compliance reminders
- year-end payroll reporting foundation

### Warning
This wave should not begin until payroll calculations, approvals, and banking controls are stable.

## Wave 7. Products, Services, Contracts, and Billing Intelligence

### Objective
Make Finance fully aware of what the company sells and how it earns.

### Modules in scope
- products and services catalog
- pricing rules
- contract billing setup
- service delivery to billing mapping
- billing exception engine
- profitability mappings

### Deliverables
- catalog UI
- pricing and contract setup
- invoice generation from operations
- billing leakage dashboard
- margin and revenue analysis

### Value
This is where Watchman Finance begins outperforming QuickBooks operationally.

## Wave 8. Inventory and Asset Control

### Objective
Bring uniforms, equipment, and stock under structured financial and operational control.

### Modules in scope
- inventory items
- stock locations
- receipts
- issues
- returns
- transfers
- count sessions
- asset assignment
- equipment incidents
- writeoff controls

### Deliverables
- inventory item master
- stock movement workflows
- employee issue and return workflows
- equipment assignment views
- reorder and stock alerts
- inventory value reporting

### Integration
Launch and Operations will interact with this wave heavily.

## Wave 9. Reporting, Dashboards, and Close Management

### Objective
Make Finance useful for leadership, accounting review, and period-end control.

### Modules in scope
- standard financial reports
- executive dashboards
- payroll reporting
- AR and AP dashboards
- inventory and profitability reports
- close checklist
- period lock workflow
- correction and reversal visibility

### Deliverables
- P&L
- balance sheet
- cash flow
- trial balance
- labor cost dashboards
- contract margin dashboards
- close management screens

## Wave 10. Budgeting, Forecasting, and Planning

### Objective
Turn Finance into a planning and decision support platform.

### Modules in scope
- budget versions
- budget approvals
- forecast versions
- scenario planning
- budget vs actual
- forecast vs actual
- cash projections
- staffing and contract planning inputs

### Deliverables
- budget builder
- forecast workspace
- variance dashboards
- executive planning dashboards
- scenario tools

## Wave 11. Multi-Entity Consolidation and Commercial Readiness

### Objective
Prepare Finance for broader tenant rollout and more advanced accounting operations.

### Modules in scope
- intercompany structure
- consolidated reporting
- tenant provisioning automation
- feature entitlements
- stronger support tooling
- export and offboarding readiness

### Deliverables
- consolidation reports
- tenant bootstrap scripts
- feature flag administration
- implementation playbooks
- market-ready tenant activation flow

## 5. Recommended Sprint Architecture

Below is the recommended sprint grouping. Exact sprint length can vary, but the structure assumes focused delivery waves rather than overly broad parallel work.

## Sprint Group A. Foundation Sprints

### Sprint A1. Tenant and Entity Foundation
Build:
- tenants
- entities
- memberships
- roles
- permissions
- module entitlements
- base seed flow

### Sprint A2. Security and Audit Foundation
Build:
- RLS scaffolding
- audit log tables
- server action shell
- policy utilities
- support-safe admin controls

### Sprint A3. Finance Core Master Data
Build:
- chart of accounts
- fiscal periods
- departments
- branches
- cost centers
- customers
- vendors

## Sprint Group B. Integration Sprints

### Sprint B1. Integration Backbone
Build:
- integration systems
- event log
- staging tables
- replay and dead-letter support

### Sprint B2. Launch Sync
Build:
- employee sync
- customer sync
- contract sync
- validation workflows

### Sprint B3. Operations Sync
Build:
- approved time staging
- service event staging
- ingestion promotion
- exception dashboard

## Sprint Group C. AR and AP Sprints

### Sprint C1. Invoice Foundation
Build:
- invoice tables
- invoice draft UI
- issue workflow
- credit memo skeleton

### Sprint C2. Bill Foundation
Build:
- bill tables
- bill entry UI
- approval and posting workflows

### Sprint C3. Receipts and Payments
Build:
- customer payments
- vendor payment prep
- AR/AP aging
- ledger posting ties

## Sprint Group D. Payroll and Leave Sprints

### Sprint D1. Pay Profiles and Schedules
Build:
- pay groups
- pay periods
- employee pay profiles
- tax profiles
- pay method request workflow

### Sprint D2. Payroll Calculation
Build:
- payroll input model
- payroll calculation actions
- exception engine
- pay statement generation

### Sprint D3. Leave and Accruals
Build:
- leave types
- policies
- balances
- requests
- approvals
- accrual runs

## Sprint Group E. Banking and Treasury Sprints

### Sprint E1. Bank and Reconciliation Foundation
Build:
- bank accounts
- transaction imports
- reconciliation headers and lines
- matching logic

### Sprint E2. Treasury Controls
Build:
- transfers
- approvals
- receipt matching
- cash dashboards

## Sprint Group F. Payroll Release and Tax Sprints

### Sprint F1. ACH and Direct Deposit
Build:
- employee bank workflow
- ACH batch generation
- release and return handling

### Sprint F2. Tax Control
Build:
- tax liabilities
- deposit calendar
- filing periods
- compliance tasks

## Sprint Group G. Commercial Intelligence Sprints

### Sprint G1. Products and Services Catalog
Build:
- item catalog
- categories
- pricing
- account mappings

### Sprint G2. Contract Billing
Build:
- customer-specific pricing
- contract billing rules
- invoice generation from events

### Sprint G3. Profitability and Billing Leakage
Build:
- margin analysis
- billing exception engine
- revenue performance dashboards

## Sprint Group H. Inventory and Asset Control Sprints

### Sprint H1. Inventory Foundation
Build:
- inventory items
- stock locations
- receipts
- stock balances

### Sprint H2. Issue, Return, and Transfer
Build:
- employee issue workflow
- transfer workflow
- return workflow
- condition logs

### Sprint H3. Counts and Writeoffs
Build:
- count sessions
- adjustments
- writeoff approvals
- reorder alerts

## Sprint Group I. Reporting and Close Sprints

### Sprint I1. Standard Reporting
Build:
- P&L
- balance sheet
- cash flow
- trial balance

### Sprint I2. Operational Finance Dashboards
Build:
- labor dashboards
- AR/AP dashboards
- payroll dashboards
- inventory dashboards

### Sprint I3. Close Management
Build:
- close checklist
- period lock
- correction and reversal visibility

## Sprint Group J. Planning Sprints

### Sprint J1. Budgeting
Build:
- budget versions
- submissions
- approvals
- lock workflow

### Sprint J2. Forecasting
Build:
- forecast versions
- scenario inputs
- variance calculations

### Sprint J3. Planning Dashboards
Build:
- budget vs actual
- forecast vs actual
- cash planning
- staffing and contract scenario views

## 6. Dependency Map

## 6.1 Hard Dependencies
These must exist before later work is trustworthy.

- tenant/entity model before module permissions
- roles/permissions before secure finance UI
- chart of accounts before invoice/bill posting
- fiscal periods before journal posting
- employee sync before payroll profiles
- approved time staging before payroll calculation
- customer/contract sync before contract billing
- bank accounts before ACH and reconciliation
- audit logging before production payroll or posting
- product and service catalog before advanced billing intelligence

## 6.2 Soft Dependencies
These improve quality but do not always block progress.

- dashboards before full executive rollout
- budgeting before forecasting
- inventory valuation before reorder sophistication
- multi-entity consolidation before broader SaaS rollout

## 7. Suggested GitHub Work Model

## 7.1 Repositories
Prefer one main app repository if the Watchman products are still closely coupled, but isolate domains clearly by package/module boundaries.

Suggested structure:
- apps/launch
- apps/operations
- apps/finance
- packages/ui
- packages/types
- packages/auth
- packages/integration
- packages/finance-domain

## 7.2 Branch Strategy
Use:
- main
- develop or trunk-based protected branch model
- feature branches
- migration branches only when needed
- release tags for finance milestones

## 7.3 Pull Request Standards
Require:
- schema review
- permission impact review
- audit impact review
- integration impact review
- posting workflow review for finance-critical changes

## 8. Suggested Supabase Migration Workstreams

## 8.1 Migration Pack 1. Foundation
- tenants
- entities
- memberships
- roles
- permissions
- settings
- audit logs

## 8.2 Migration Pack 2. Finance Core
- accounts
- fiscal periods
- journals
- customers
- vendors

## 8.3 Migration Pack 3. Integration
- staging tables
- event logs
- mappings
- exception queues

## 8.4 Migration Pack 4. AR/AP
- invoices
- invoice lines
- payments
- bills
- bill lines
- vendor payments

## 8.5 Migration Pack 5. Payroll and Leave
- pay groups
- pay periods
- payroll runs
- tax profiles
- leave structures

## 8.6 Migration Pack 6. Banking and Tax
- bank accounts
- reconciliations
- ACH batches
- tax liabilities
- tax filing periods

## 8.7 Migration Pack 7. Catalog, Inventory, and Planning
- catalog
- inventory
- assets
- budgets
- forecasts

## 9. Suggested Go-Live Sequence

## Phase 1 Go-Live
Internal setup and master data only:
- tenant/entity setup
- customers/vendors
- chart of accounts
- basic AR/AP

## Phase 2 Go-Live
Operational integration and payroll readiness:
- employee sync
- time sync
- payroll control
- leave balances

## Phase 3 Go-Live
Controlled finance execution:
- invoice issuance
- bill posting
- reconciliation
- payroll release prep

## Phase 4 Go-Live
Full internal financial operating system:
- payroll release
- tax control
- inventory control
- dashboards
- close management

## Phase 5 Go-Live
Planning and commercial readiness:
- budgeting
- forecasting
- multi-entity controls
- tenant bootstrap automation

## 10. QuickBooks Exit Strategy

## Stage 1. Parallel Reference
Watchman Finance runs selected domains while QuickBooks remains historical reference.

## Stage 2. Domain Cutover
Move domains one at a time:
- AR
- AP
- payroll control
- reconciliation
- reporting

## Stage 3. Accounting System Cutover
Watchman Finance becomes system of record for current-period books.

## Stage 4. Legacy Containment
QuickBooks is retained only for archive access, migration lookups, and historical export support.

## 11. Team Roles Needed for Execution

Even if one person drives much of the design, these responsibilities must be covered.

- product owner
- finance domain architect
- Supabase schema and RLS engineer
- frontend workflow designer
- integration engineer
- payroll and compliance reviewer
- QA and workflow tester
- accounting user acceptance reviewer

## 12. Success Criteria by Stage

### Foundation success
- tenant isolation works
- roles and permissions are enforceable
- audit logging is reliable

### Integration success
- employee and time sync are stable
- exceptions are visible and resolvable
- duplicate events do not corrupt finance data

### Finance execution success
- invoices and bills post correctly
- payroll calculations are reproducible
- reconciliation matches bank reality
- no sensitive workflows depend on browser writes

### Platform success
- QuickBooks dependency shrinks by wave
- EST can operate inside Watchman Finance with confidence
- architecture supports future tenant onboarding without redesign

## 13. Recommended First Three Build Targets

If you want the highest-value start, build in this order:

### Build Target 1
Platform foundation:
- tenant/entity
- roles/permissions
- audit logs
- finance settings
- chart of accounts
- fiscal periods

### Build Target 2
Integration foundation:
- employee sync
- customer sync
- approved time staging
- exception queue

### Build Target 3
Finance execution foundation:
- AR/AP core
- payroll profiles
- payroll calculation workspace

## 14. Final Recommendation

Do not start with dashboards.
Do not start with advanced forecasting.
Do not start with public SaaS onboarding.

Start with the structures that make payroll, billing, accounting, and reconciliation trustworthy.

The right path is:
foundation -> integration -> execution -> controls -> intelligence -> planning -> commercialization

That sequence will let Watchman Finance become a real operating system for EST Holdings first and a real multi-tenant product later.
