# Watchman Finance
## Product Definition, Proposed Features, and Connection to Other Watchman Products

## 1. Definition

**Watchman Finance** is the finance, payroll, billing, inventory, and reporting platform within the Watchman ecosystem. It is designed to serve as the financial operating system for organizations using Watchman products, beginning with EST Holdings and related entities.

Watchman Finance is not intended to be a generic accounting clone. Its purpose is to convert workforce, operational, and commercial data from other Watchman platforms into usable financial outputs such as payroll, invoices, payables, receivables, cash controls, accounting records, management reports, forecasts, and executive dashboards.

The platform should be architected from the beginning as:

- multi-tenant
- multi-entity
- modular
- audit-ready
- workflow-controlled
- operationally integrated with the rest of the Watchman ecosystem

## 2. Product Purpose

The purpose of Watchman Finance is to provide a finance platform that reflects the real operating model of the business rather than forcing the business into generic accounting software workflows.

Watchman Finance should help the organization:

- calculate payroll from approved time and leave data
- manage receivables and payables
- generate invoices from actual service delivery and contract terms
- reconcile bank activity
- track uniforms, equipment, and controlled assets
- monitor labor cost and contract profitability
- manage budgeting and forecasting
- provide financial and operational reporting for leadership

It should also support a phased transition away from QuickBooks Online by replacing financial functions in a controlled and practical order.

## 3. Strategic Role in the Watchman Ecosystem

Watchman Finance is one product within a larger Watchman platform family. Its role is to become the system of record for financial truth across the ecosystem.

In that role, Watchman Finance should:

- receive employee, customer, and setup information from Watchman Launch
- receive approved time, service activity, and work execution data from Watchman Operations
- turn those inputs into payroll, invoices, liabilities, journals, balances, and reports
- send financial status and readiness data back into the broader Watchman environment where appropriate

## 4. Core Design Principles

### 4.1 Multi-Tenant by Default
Every finance-owned record must be tenant-scoped so the platform can later support multiple organizations without redesign.

### 4.2 Multi-Entity by Default
The platform must support separate legal entities, books, payroll structures, financial settings, and reporting inside a tenant.

### 4.3 Server-Controlled Finance Workflows
Sensitive actions such as posting, approving, reversing, finalizing, closing periods, releasing payments, or generating payroll outputs must be handled through controlled server-side workflows.

### 4.4 Auditability
Every material finance action should be tracked through audit logs, approval history, and status transitions.

### 4.5 Operational Fit
The system must match the actual business flow across employee onboarding, scheduling, timekeeping, service delivery, contract billing, payroll, and reporting.

### 4.6 Modularity
Finance must be built as a modular platform so that payroll, billing, inventory, banking, reporting, and planning can evolve without destabilizing the rest of the product.

## 5. Proposed Features

### 5.1 Finance Core
This module establishes the accounting structure of the platform.

**Proposed capabilities:**
- chart of accounts
- fiscal periods
- entity-level finance settings
- journal framework
- closing controls
- audit support

**Purpose:**
Provides the accounting backbone that every other finance module depends on.

### 5.2 Accounts Receivable
This module manages money owed to the organization.

**Proposed capabilities:**
- customer records
- customer billing profiles
- invoices
- invoice lines
- customer payments
- credit memos
- accounts receivable aging
- statements
- invoice status tracking

**Purpose:**
Supports revenue collection, customer balances, and invoice visibility.

### 5.3 Accounts Payable
This module manages money the organization owes to vendors and service providers.

**Proposed capabilities:**
- vendor records
- bills
- bill lines
- vendor payment preparation
- accounts payable aging
- bill approval workflows
- bill status tracking

**Purpose:**
Supports controlled expense management and vendor payment operations.

### 5.4 Payroll
This module manages payroll control and payroll execution readiness.

**Proposed capabilities:**
- pay groups
- pay periods
- employee pay profiles
- employee tax profiles
- payroll runs
- payroll input records
- payroll run items
- earnings and deductions detail
- pay statements
- payroll approval logs

**Purpose:**
Turns approved work data into payroll calculations and controlled payroll outputs.

### 5.5 Leave and Accrual Management
This module manages paid and unpaid time-off structures that affect payroll and workforce cost.

**Proposed capabilities:**
- leave types
- leave policies
- policy assignments
- accrual rules
- leave requests
- leave approvals
- leave balances
- leave liability snapshots
- holiday calendars

**Purpose:**
Supports paid time tracking, policy enforcement, payroll integration, and leave liability visibility.

### 5.6 Banking and Reconciliation
This module manages cash control and bank-side visibility.

**Proposed capabilities:**
- bank accounts
- bank transaction imports
- reconciliations
- reconciliation lines
- receipt matching
- transfer requests
- treasury controls
- cash monitoring

**Purpose:**
Improves confidence in actual cash activity and supports reconciliation discipline.

### 5.7 Products and Services Management
This module defines what the organization sells and how it is priced and billed.

**Proposed capabilities:**
- item categories
- item types
- catalog items
- pricing tables
- account mappings
- customer-specific pricing
- contract-specific pricing
- bundles
- product and service activation controls

**Purpose:**
Provides structured commercial definitions for billing, reporting, and profitability analysis.

### 5.8 Contract Billing
This module converts service terms and performance into billable revenue.

**Proposed capabilities:**
- billing rules
- contract rate cards
- billable event candidates
- billing exception tracking
- invoice source tracking
- conversion of operational events into invoice lines

**Purpose:**
Links service delivery and contract obligations to actual revenue generation.

### 5.9 Inventory and Asset Control
This module manages uniforms, equipment, stocked items, and controlled assets.

**Proposed capabilities:**
- inventory item master
- stock locations
- receipts
- issues
- returns
- transfers
- employee equipment assignment
- loss and damage incident records
- inventory valuation support
- reorder visibility

**Purpose:**
Provides financial and operational control over uniforms, equipment, and other stored items.

### 5.10 Reporting and Analytics
This module provides financial visibility for management and leadership.

**Proposed capabilities:**
- profit and loss
- balance sheet
- cash flow
- trial balance
- AR and AP aging reports
- payroll reports
- leave balance reports
- labor cost reporting
- profitability reporting
- executive dashboards

**Purpose:**
Turns platform data into practical, actionable financial visibility.

### 5.11 Budgeting and Forecasting
This module supports planning and decision-making.

**Proposed capabilities:**
- budget versions
- forecast versions
- scenario planning
- budget vs actual
- forecast vs actual
- cash outlook planning
- staffing and labor planning inputs

**Purpose:**
Helps leadership move from transactional finance into forward-looking financial management.

## 6. Connection to Other Watchman Products

Watchman Finance is designed to function as part of an integrated Watchman product ecosystem. Its value depends heavily on clear product ownership boundaries and structured data movement.

### 6.1 Watchman Launch

**Primary role of Watchman Launch**
Watchman Launch should remain the primary product for:

- employee master identity
- onboarding
- training
- certification tracking
- organizational placement inputs
- client and customer onboarding inputs
- contract setup inputs where appropriate

**How Watchman Launch connects to Watchman Finance**
Watchman Launch should feed Watchman Finance with:

- employee identity data
- employment status data
- onboarding data needed for payroll readiness
- training and certification context where relevant to eligibility
- customer and client setup inputs
- contract and commercial setup inputs

**Why this matters**
Launch should remain the source of truth for who the employee is and how the employee enters the organization. Finance should consume this information to build payroll profiles, financial employee references, customer records, and billing structure inputs.

### 6.2 Watchman Operations

**Primary role of Watchman Operations**
Watchman Operations should remain the primary product for:

- scheduling
- shift management
- timekeeping
- approved hours
- patrol and field execution
- service completion
- operational exceptions
- site and activity tracking

**How Watchman Operations connects to Watchman Finance**
Watchman Operations should feed Watchman Finance with:

- approved time
- regular, overtime, holiday, and unpaid hours
- billable service events
- work performance facts
- service completion data
- operational events that affect billing or labor cost

**Why this matters**
Operations should remain the source of truth for work performed. Finance should convert that work data into payroll inputs, invoice candidates, labor cost visibility, and profitability insight.

### 6.3 Watchman Finance as the Financial System of Record

Watchman Finance should become the financial system of record for:

- payroll calculations and payroll control
- receivables
- payables
- accounting
- leave balances
- banking and reconciliation
- contract billing
- inventory and asset accounting visibility
- budgeting and forecasting
- executive reporting

**Data Watchman Finance may return to the ecosystem**
Finance may also provide data back to other Watchman products, including:

- payroll status
- leave balance summaries
- invoice status
- customer balance visibility
- labor cost visibility
- financial readiness indicators
- billing exception flags

## 7. Product Ownership Summary

**Watchman Launch owns:**
- employee master records
- onboarding
- training
- certifications
- organization assignment inputs
- customer and client onboarding inputs

**Watchman Operations owns:**
- schedules
- shifts
- timekeeping
- approved hours
- patrol activity
- service execution
- field exceptions
- operational work facts

**Watchman Finance owns:**
- payroll
- accounting
- receivables
- payables
- leave and accruals
- banking and reconciliation
- products and services catalog
- contract billing
- inventory and asset control
- reporting
- budgeting
- forecasting

## 8. Why Watchman Finance Matters

Watchman Finance matters because it creates a finance system built around the actual Watchman operating environment instead of forcing Watchman into generic accounting software assumptions.

It should improve:

- payroll accuracy
- billing accuracy
- contract visibility
- labor cost visibility
- executive reporting
- cash control
- inventory accountability
- decision-making quality

It should also strengthen the entire Watchman ecosystem by acting as the layer that translates workforce and service-delivery data into financial truth.

## 9. Strategic Outcome

The long-term strategic outcome is for Watchman Finance to become the internal financial operating system for EST Holdings and, later, a multi-tenant commercial platform that can support other organizations without architectural redesign.

The product should be built so that it can:

- support EST Holdings immediately
- integrate cleanly with Watchman Launch and Watchman Operations
- reduce dependence on QuickBooks Online over time
- scale into a broader Watchman platform offering in the future

## 10. Closing Definition

Watchman Finance should be understood as:

**the finance, payroll, billing, inventory, and reporting layer of the Watchman ecosystem, designed to transform Watchman employee, operational, and commercial data into controlled financial processes, measurable financial outcomes, and leadership insight.**
