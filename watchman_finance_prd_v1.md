# Watchman Finance Product Requirements Document v1

## 1. Product Name
Watchman Finance

## 2. Product Vision
Watchman Finance is the accounting, payroll, billing, leave, inventory, planning, and financial reporting layer of the Watchman ecosystem. It consumes workforce and operational data from Watchman Launch and Watchman Operations and converts that data into payroll, invoices, accounting entries, financial controls, and management insight.

## 3. Product Goal
Replace the parts of QuickBooks Online that do not fit the Watchman operating model and create an internal-first financial operating system for EST Holdings that is multi-tenant, multi-entity, and extensible for future commercialization.

## 4. Primary Users
- Tenant Owner
- Finance Admin
- Controller
- Bookkeeper
- Billing Specialist
- AP Specialist
- AR Specialist
- Payroll Admin
- Leave Administrator
- Treasury Specialist
- Inventory and Asset Manager
- Executive Viewer
- Operations Manager Finance Viewer
- Employee Self-Service User
- Client Billing Portal User

## 5. Systems Context
- Watchman Launch owns employee master, onboarding, training, certifications, and customer setup inputs.
- Watchman Operations owns schedules, timekeeping, service execution, and operational events.
- Watchman Finance owns payroll, accounting, AR/AP, leave, catalog, inventory, banking, reporting, budgeting, and forecasting.

## 6. Core Product Requirements

### 6.1 Multi-Tenant and Multi-Entity
The product must support:
- multiple tenants
- multiple legal entities within a tenant
- entity-level books
- tenant-scoped permissions
- entity-scoped access

### 6.2 Security and Control
The product must support:
- strict tenant isolation
- role-based access control
- RLS-compatible architecture
- server-controlled sensitive mutations
- audit logging
- period locks
- approval workflows

### 6.3 Finance Core
The product must provide:
- chart of accounts
- fiscal periods
- journals
- customers
- vendors
- finance settings

### 6.4 AR
The product must provide:
- invoice drafts
- invoice issue and void workflows
- customer payments
- AR aging
- statements
- customer balances

### 6.5 AP
The product must provide:
- bill entry
- approval and posting
- vendor payment preparation
- AP aging

### 6.6 Payroll
The product must provide:
- pay profiles
- pay groups and periods
- payroll calculations
- earnings and deductions
- tax profile structures
- pay statements
- payroll controls and review

### 6.7 Leave and Accruals
The product must provide:
- leave types
- policies
- policy assignments
- requests
- approvals
- balances
- accrual logic
- payroll mapping

### 6.8 Banking and Reconciliation
The product must provide:
- bank account tracking
- transaction import
- reconciliation
- transfer controls
- cash visibility

### 6.9 Products and Services
The product must provide:
- item catalog
- pricing
- account mapping
- customer and contract pricing overrides
- billable service linkage

### 6.10 Contract Billing
The product must provide:
- billing rules
- rate cards
- invoice candidate generation
- billing leakage detection
- contract profitability support

### 6.11 Inventory and Asset Control
The product must provide:
- uniform and equipment item master
- stock receipts, issues, returns, and transfers
- employee issue tracking
- asset assignment
- damage/loss incident tracking
- inventory value summary

### 6.12 Reporting and Dashboards
The product must provide:
- P&L
- balance sheet
- cash flow
- trial balance
- AR/AP aging
- payroll register
- leave balance reporting
- executive dashboard
- labor cost and profitability reporting

### 6.13 Planning
The product should support:
- budgeting
- forecasting
- scenario planning
- budget vs actual
- forecast vs actual

## 7. Non-Functional Requirements
- secure by default
- auditable by default
- modular by default
- tenant-safe by default
- performant enough for operational daily use
- compatible with Supabase, Vercel, and GitHub delivery model
- designed for server-side workflow control

## 8. MVP Scope
MVP must include:
- multi-tenant foundation
- roles/permissions
- finance core
- Launch/Operations sync foundation
- AR/AP
- payroll core
- leave management
- banking/reconciliation basics
- catalog and billing basics
- inventory and asset control basics
- standard reporting

## 9. Out of Scope for Early MVP
- highly advanced automated tax filing
- broad public SaaS onboarding
- complex warehouse logic
- advanced AI forecasting
- extensive third-party marketplace integrations

## 10. Success Criteria
Watchman Finance is successful when EST Holdings can:
- rely on it for day-to-day finance operations in selected domains
- calculate payroll from approved Watchman data
- manage invoices and bills confidently
- understand labor cost and profitability better than in QuickBooks
- maintain strict control and auditability
- reduce QuickBooks dependency by wave without redesign

## 11. Release Strategy
- Release 1: foundations
- Release 2: integration readiness
- Release 3: AR/AP
- Release 4: payroll and leave
- Release 5: banking, catalog, and billing
- Release 6: inventory and reporting
- Release 7: budgeting, forecasting, and deeper controls

## 12. Final Product Standard
Watchman Finance must fit the Watchman operating model first, deliver accounting and payroll truth second, and only then expand toward broader commercial SaaS readiness.
