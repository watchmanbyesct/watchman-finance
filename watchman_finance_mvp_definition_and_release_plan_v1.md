# Watchman Finance MVP Definition and Release Plan v1

## 1. Purpose

This document defines the minimum viable product, phased release scope, and controlled adoption plan for Watchman Finance.

The goal is to answer five questions clearly:

1. what must exist for Watchman Finance v1 to be useful
2. what should be delayed until v2
3. what should remain manual or semi-manual at first
4. what should replace QuickBooks first
5. how EST Holdings should adopt Watchman Finance without creating unnecessary operational risk

This plan assumes:

- Watchman Finance is being built for EST Holdings first
- the architecture remains multi-tenant and multi-entity from day one
- Watchman Launch and Watchman Operations remain active products
- QuickBooks Online is the current finance reference system
- payroll, accounting, billing, and reporting must become more Watchman-specific than QuickBooks

## 2. Product Goal for v1

Watchman Finance v1 should be able to do the following well enough for internal production use:

- receive core employee, customer, and operational inputs from Launch and Operations
- maintain finance master data securely
- calculate payroll from approved time and leave inputs
- create and manage invoices and bills
- post journal activity through controlled workflows
- track bank activity and reconciliation at a practical level
- manage the core products and services catalog
- manage inventory and asset control at a practical first level
- produce reliable internal financial and operational finance reports
- reduce dependency on QuickBooks in the areas that matter most to Watchman operations

v1 does not need to be perfect.
It does need to be trustworthy.

## 3. Guiding Rule for v1

For v1, prioritize:

- correctness over automation depth
- control over convenience
- server-side workflow safety over speed
- internal usability over commercial polish
- structured exceptions over silent failures
- operational fit over feature parity theater

## 4. What v1 Must Include

## 4.1 Platform and Security Foundation
These are non-negotiable for v1.

### Must include
- tenant model
- entity model
- role and permission model
- RLS foundation
- audit logs
- server action framework
- module entitlement structure
- environment and secrets discipline

### Why
Without these, Finance will become fragile, unsafe, or require rework later.

## 4.2 Finance Core
### Must include
- chart of accounts
- fiscal periods
- journal entry framework
- customer master
- vendor master
- entity and department structure
- finance settings

### Why
Every other finance workflow depends on these.

## 4.3 Integration Foundation
### Must include
- employee master sync from Launch
- customer and contract sync from Launch
- approved time ingestion from Operations
- service delivery event staging from Operations
- validation and exception queue
- external id mapping and sync tracking

### Why
Finance cannot operate correctly without trusted inputs from the existing Watchman ecosystem.

## 4.4 Accounts Receivable
### Must include
- invoices
- invoice lines
- issue and void workflow
- customer payments
- credit memo skeleton
- AR aging
- statements
- ledger posting for AR

### Why
This is one of the first QuickBooks replacement domains and directly affects cash flow.

## 4.5 Accounts Payable
### Must include
- bills
- bill lines
- bill posting
- vendor payments preparation
- AP aging
- ledger posting for AP

### Why
This gives Finance a real operating role beyond reporting.

## 4.6 Payroll Core
### Must include
- employee pay profiles
- pay groups
- pay periods
- tax profile structure
- earnings and deduction framework
- payroll input staging
- payroll calculation engine
- payroll exception dashboard
- pay statements
- payroll journal posting

### Why
Payroll is central to your operating model and one of the main reasons Watchman Finance exists.

## 4.7 Leave and Accrual Management
### Must include
- leave types
- leave policies
- policy assignments
- leave requests
- leave approvals
- leave balance ledger
- accrual rules
- leave to payroll mapping

### Why
Leave affects payroll, liability, and operations. It cannot remain loose.

## 4.8 Banking and Reconciliation
### Must include
- bank accounts
- bank transaction imports
- receipt matching
- reconciliation headers and lines
- transfer framework
- cash position views

### Why
You need to trust what happened in the bank, not just what was entered in the app.

## 4.9 Products and Services Catalog
### Must include
- catalog items
- categories
- pricing
- revenue account mapping
- service vs product distinction
- customer and contract pricing overrides

### Why
This is necessary for billing logic, profitability, and commercial consistency.

## 4.10 Contract Billing Foundation
### Must include
- billing rules
- contract-linked invoice generation support
- service event billing candidates
- billing exception review
- billing leakage visibility

### Why
This is where Watchman Finance starts to become more useful than QuickBooks for your operation.

## 4.11 Inventory and Asset Control Foundation
### Must include
- inventory item master
- stock locations
- receipts
- issues
- returns
- employee issue tracking
- asset assignment records
- damage/loss incident records
- inventory value summary

### Why
Uniforms and equipment are financially relevant and operationally important.

## 4.12 Reporting and Dashboards
### Must include
- P&L
- balance sheet
- cash flow
- trial balance
- AR aging
- AP aging
- payroll register
- leave balance reporting
- labor cost reporting
- basic contract profitability reporting
- executive dashboard
- payroll readiness dashboard

### Why
Without reporting, the system does not become operationally trustworthy.

## 5. What v1 Should Keep Manual or Semi-Manual

For v1, some processes should remain controlled and partially manual to reduce risk.

## 5.1 Payroll ACH Release
### Recommended v1 approach
- generate ACH batch data
- review in Watchman Finance
- perform controlled manual release or semi-manual bank submission
- store release status in Finance

### Why
This reduces risk before fully automating direct deposit workflows.

## 5.2 Tax Deposit and Filing Submission
### Recommended v1 approach
- calculate liabilities
- maintain calendars
- generate filing prep data
- support reminders and workflow tracking
- keep actual remittance/submission manual or semi-manual at first

### Why
This keeps Watchman Finance in control without overcommitting to early filing automation.

## 5.3 Bank Transaction Import Sophistication
### Recommended v1 approach
- support manual file import or simple bank feed process
- allow manual reconciliation assistance

### Why
Reconciliation discipline matters more than connector sophistication in v1.

## 5.4 Inventory Counting Complexity
### Recommended v1 approach
- basic count sessions
- basic adjustments
- controlled writeoffs
- no advanced warehouse logic yet

### Why
Your use case is operational inventory control, not enterprise warehouse management.

## 5.5 Forecast Modeling Complexity
### Recommended v1 approach
- simple forecast versions
- trend inputs
- contract and payroll assumptions
- manual driver inputs
- no advanced predictive engine yet

### Why
Forecasting should be useful before it becomes mathematically elaborate.

## 6. What Should Be in v2

v2 should deepen control, automation, and planning after v1 is stable.

## 6.1 Payroll and Tax Expansion
- ACH automation maturity
- stronger return handling
- deeper tax workflow automation
- more year-end payroll reporting support
- more advanced payroll audit tools

## 6.2 Reporting Expansion
- more detailed profitability dashboards
- branch and site performance packages
- more flexible report designer
- scheduled report delivery
- more sensitive export controls

## 6.3 Inventory Expansion
- reorder logic refinement
- vendor item intelligence
- replacement cycle analytics
- stronger asset lifecycle management

## 6.4 Budgeting and Forecasting Expansion
- budget approvals and lock workflow maturity
- forecast scenario analysis
- cash projections
- staffing planning models
- contract margin scenario models

## 6.5 Close Management Expansion
- close checklist maturity
- close dependencies
- review signoffs
- more formal correction workflow support

## 7. What Should Be Future-State Only

These are valuable, but they should not be early build priorities.

- full public SaaS onboarding automation
- highly polished multi-tenant self-serve sales flow
- advanced machine learning forecasting
- highly complex tax filing automation across many jurisdictions
- deep custom report designer for external users
- full-scale fixed asset depreciation engine unless immediately needed
- complex inventory warehouse logic
- broad third-party marketplace integrations

## 8. Recommended QuickBooks Replacement Order

Do not try to replace all QuickBooks functions at once.

## Stage 1. Replace First
These are the best early replacement targets.

- products and services catalog
- customer and vendor master in current-use domains
- AR invoice workflows
- AP bill workflows
- operational finance reporting
- contract billing support

## Stage 2. Replace Next
- payroll calculation and payroll control
- leave and accrual management
- payroll journals
- banking and reconciliation workflows
- executive dashboards

## Stage 3. Replace After Confidence Builds
- current-period accounting system of record
- tax control workflows
- inventory and asset accounting
- full close management
- broader planning workflows

## Stage 4. Legacy Only
At this point QuickBooks should be retained only for:
- historical reference
- historical exports
- archive review
- transition comparison

## 9. Recommended v1 Release Packages

## Release Package 1. Foundation Release
Includes:
- tenant/entity structure
- roles/permissions
- audit logs
- chart of accounts
- fiscal periods
- customers/vendors
- basic settings

### Outcome
You can set the platform up correctly.

## Release Package 2. Integration and Data Readiness Release
Includes:
- employee sync
- customer sync
- contract sync
- approved time staging
- service event staging
- validation queue

### Outcome
Finance starts receiving trusted data from Launch and Operations.

## Release Package 3. AR/AP Release
Includes:
- invoice workflows
- bill workflows
- payment application
- aging reports
- ledger ties

### Outcome
Finance can manage receivables and payables in production.

## Release Package 4. Payroll and Leave Release
Includes:
- pay profiles
- payroll engine
- leave rules
- leave balances
- payroll readiness dashboard
- pay statements

### Outcome
Watchman Finance becomes useful for payroll control and planning.

## Release Package 5. Banking, Catalog, and Billing Release
Includes:
- bank accounts
- reconciliation
- products and services
- pricing rules
- billing exception engine
- initial contract profitability

### Outcome
Finance starts to outperform generic accounting software in your actual business model.

## Release Package 6. Inventory and Reporting Release
Includes:
- inventory master
- stock movement
- equipment assignment
- executive dashboard
- financial statements
- labor and contract reporting

### Outcome
Watchman Finance becomes a practical internal financial operating system.

## 10. Recommended v1 Success Criteria

v1 is successful if EST Holdings can do the following with confidence:

- maintain tenant-safe finance data
- sync employee, customer, and approved operational inputs
- manage current invoices and bills
- calculate payroll accurately from approved data
- manage leave balances and payroll impacts
- maintain a trustworthy chart of accounts and journal structure
- reconcile bank activity practically
- understand labor cost, AR/AP position, and core profitability
- manage uniforms and equipment at a basic controlled level
- rely on Watchman Finance for current operations more than QuickBooks in selected domains

## 11. What v1 Does Not Need to Prove Yet

v1 does not need to prove:
- perfect automation of all bank and tax actions
- polished external commercial onboarding
- broad customer self-service adoption
- advanced AI forecasting
- highly sophisticated reporting designer
- full enterprise inventory depth

It needs to prove:
- correctness
- control
- fit for EST Holdings
- readiness for disciplined expansion

## 12. Recommended Internal Rollout Plan

## Phase A. Admin and Data Setup
Use internally for:
- entities
- accounts
- customers/vendors
- catalog
- roles
- settings

## Phase B. Parallel Data Validation
Run:
- Launch/Operations syncs
- payroll inputs
- AR/AP data
- reporting comparisons
against current systems without fully cutting over

## Phase C. Controlled Domain Cutover
Move selected live domains first:
- new invoices
- new bills
- leave tracking
- payroll readiness workflows

## Phase D. Payroll and Reconciliation Confidence
Once calculations and controls are proven:
- expand payroll authority
- expand reconciliation usage
- reduce QuickBooks dependency

## Phase E. Internal System of Record
Watchman Finance becomes the current operating finance platform for EST Holdings.

## 13. Recommended v1 Team Focus

The build team should focus first on:
- architecture discipline
- secure schema
- integrations
- payroll correctness
- accounting correctness
- reporting truthfulness

Not first on:
- visual polish
- nice-to-have automation
- complex external portals
- speculative marketplace features

## 14. Final Recommendation

The best v1 for Watchman Finance is not the smallest possible app.

It is the smallest trustworthy finance platform that can:
- consume Watchman data correctly
- produce payroll and accounting truth correctly
- support internal decision-making
- reduce QuickBooks dependency in the areas that matter most
- create a safe foundation for broader multi-tenant commercialization later

That is the correct release target for EST Holdings first, and for Watchman Finance long term.
