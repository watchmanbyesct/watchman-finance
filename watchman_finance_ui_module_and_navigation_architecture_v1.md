# Watchman Finance UI Module and Navigation Architecture v1

## 1. Purpose
This document defines the user-facing structure for Watchman Finance. It translates the backend, schema, workflow, and permissions architecture into a clear module layout, navigation model, dashboard structure, and role-based screen access pattern.

The design assumptions are:
- Watchman products are multi-tenant by default.
- Watchman Finance is multi-entity aware.
- Watchman Launch owns employee master, onboarding, training, certification, and certain source setup records.
- Watchman Operations owns scheduling, timekeeping, worked labor, and service execution events.
- Watchman Finance owns accounting, payroll, AR, AP, banking, leave, tax control, catalog, inventory and asset control, budgeting, forecasting, reporting, and close.

## 2. Design Goals
The UI architecture should:
- keep finance workflows organized and predictable
- separate operational inputs from financial processing
- reduce clutter for small-team internal use while allowing growth into a broader SaaS product
- support role-based navigation so users only see what they need
- make approval states, exceptions, and deadlines visible
- support server-controlled workflows without confusing the user

## 3. Primary Navigation Model
Use a left-side primary navigation with module groups and an upper global context bar.

## 3.1 Global Header
The top header should include:
- current tenant selector
- current entity selector
- optional branch or department filter
- current fiscal period indicator
- search
- notifications and exceptions bell
- quick actions menu
- user profile menu

## 3.2 Left Navigation Groups
Recommended primary groups:
1. Home
2. Workspaces
3. Accounting
4. Payroll
5. Billing and Receivables
6. Payables and Purchasing
7. Banking and Treasury
8. Leave and Workforce Finance
9. Products, Services, and Contracts
10. Inventory and Assets
11. Budgeting and Forecasting
12. Reporting and Analytics
13. Close and Compliance
14. Administration

## 4. Home Module
The Home area should be role-aware and surface only the most relevant information.

### 4.1 Executive Home
Show:
- cash on hand
- payroll due next
- taxes due next
- unpaid invoices summary
- overdue receivables
- current month revenue
- current month payroll cost
- current margin summary
- unresolved high-risk exceptions

### 4.2 Controller or Finance Admin Home
Show:
- close progress
- reconciliations pending
- journals awaiting approval
- invoices to issue
- bills awaiting approval
- payroll readiness
- ACH batches pending
- tax liabilities due soon
- budget variance alerts

### 4.3 Payroll Home
Show:
- next payroll run
- payroll exceptions
- missing employee tax or bank setup
- leave balance anomalies
- direct deposit batch status
- quarter-end filing countdown

### 4.4 AR and Billing Home
Show:
- draft invoices
- issued but unpaid invoices
- overdue balances
- collections queue
- unbilled service events
- billing leakage warnings

### 4.5 Inventory Home
Show:
- low stock items
- pending receipts
- equipment not returned
- damaged asset reports
- overdue counts

## 5. Workspaces Group
Workspaces are cross-module operational views that help users process work.

Recommended workspaces:
- Approvals Workspace
- Exceptions Workspace
- Task Queue
- My Work
- Scheduled Jobs Status
- Sync Monitor

### 5.1 Approvals Workspace
Shows all approvals the current user can act on, such as:
- journals
- invoices
- bills
- payroll runs
- ACH releases
- inventory writeoffs
- budget submissions

### 5.2 Exceptions Workspace
Shows issues requiring review:
- missing time imports
- payroll calculation errors
- contract pricing mismatches
- unreconciled bank items
- unmatched payments
- duplicate vendor warnings
- leave policy conflicts

## 6. Accounting Module
This module is the core book of record.

### 6.1 Screens
- Chart of Accounts
- Journal Entries
- Recurring Entries
- Fiscal Periods
- Trial Balance
- General Ledger
- Account Activity
- Entity Consolidation Summary

### 6.2 Screen Notes
Journal Entries should support states such as:
- draft
- submitted
- approved
- posted
- reversed

General Ledger screens should be read-heavy and export-friendly.

## 7. Payroll Module
Payroll should be organized as a workflow-driven workspace rather than scattered screens.

### 7.1 Screens
- Payroll Dashboard
- Pay Groups
- Pay Period Calendar
- Employee Pay Profiles
- Earnings and Deductions Setup
- Payroll Runs
- Payroll Run Detail
- Pay Statements
- ACH Batches
- Payroll Tax Liabilities
- Payroll Adjustments
- Year-End Payroll Center

### 7.2 Key UI Design
Payroll Runs screen should show:
- pay period
- payroll status
- employee count
- total gross
- total net
- ACH status
- exception count
- approver status

Payroll Run Detail should include tabs:
- Summary
- Employees
- Exceptions
- Taxes
- Funding
- Journals
- Audit

## 8. Billing and Receivables Module
This module handles customer billing, payments, and collections.

### 8.1 Screens
- Customers
- Customer Sites
- Contracts
- Invoice Queue
- Invoices
- Invoice Detail
- Credit Memos
- Payments Received
- Customer Statements
- Collections Dashboard
- Unbilled Activity Review

### 8.2 Key UI Design
Invoice Detail tabs:
- Header
- Line Items
- Source Activity
- Payments
- Credits
- Audit
- PDF Preview

Collections Dashboard should show:
- aging buckets
- top overdue accounts
- collector assignment
- communication history
- promise-to-pay tracking if used later

## 9. Payables and Purchasing Module
This module handles vendors, bills, purchasing-adjacent records, and disbursement prep.

### 9.1 Screens
- Vendors
- Vendor Detail
- Bills Queue
- Bills
- Bill Detail
- Vendor Payments
- Purchase Receipts
- Expense Categories
- Recurring Bills

### 9.2 Key UI Design
Bill Detail tabs:
- Header
- Lines
- Attachments
- Approval
- Payment History
- Audit

## 10. Banking and Treasury Module
This module handles bank visibility, transaction imports, reconciliation, transfers, and treasury control.

### 10.1 Screens
- Bank Accounts
- Bank Transaction Feed
- Reconciliation Workspace
- Reconciliation History
- Transfers
- Funding Calendar
- Treasury Alerts

### 10.2 Key UI Design
Reconciliation Workspace should support:
- unmatched transactions panel
- suggested matches
- cleared vs uncleared totals
- adjustment proposals
- approval state

## 11. Leave and Workforce Finance Module
This module handles leave banks, policies, accruals, and workforce finance views linked to payroll.

### 11.1 Screens
- Leave Dashboard
- Leave Types
- Leave Policies
- Policy Assignments
- Leave Requests
- Leave Approvals
- Leave Balances
- Accrual Runs
- Holiday Calendars
- Leave Liability Report

### 11.2 Key UI Design
Leave Request Detail should show:
- request dates and hours
- policy used
- balance impact
- payroll impact
- schedule impact reference from Operations
- approval chain
- audit history

## 12. Products, Services, and Contracts Module
This module is the commercial catalog and pricing layer.

### 12.1 Screens
- Catalog Dashboard
- Products and Services
- Item Categories
- Bundles and Packages
- Pricing Rules
- Customer Pricing Overrides
- Contract Pricing
- Service Delivery Mapping
- Margin by Item

### 12.2 Key UI Design
Product or Service Detail tabs:
- Basic Info
- Pricing
- Accounting Mapping
- Tax Rules
- Contract Usage
- Profitability
- Audit

## 13. Inventory and Assets Module
This module supports stocked items and individually controlled equipment.

### 13.1 Screens
- Inventory Dashboard
- Items
- Categories
- Stock Locations
- Receipts
- Issues and Returns
- Transfers
- Adjustments
- Count Sessions
- Equipment Register
- Equipment Assignments
- Damage and Loss Incidents
- Reorder Queue

### 13.2 Key UI Design
Equipment Asset Detail tabs:
- Overview
- Assignment History
- Condition
- Repair History
- Financial Treatment
- Audit

## 14. Budgeting and Forecasting Module
This module should support planning, versioning, and scenario views.

### 14.1 Screens
- Budget Dashboard
- Budget Versions
- Budget Builder
- Department Budgets
- Entity Budgets
- Revenue Plans
- Payroll Plans
- Forecast Versions
- Forecast Builder
- Scenarios
- Budget vs Actual
- Forecast vs Actual

### 14.2 Key UI Design
Budget Builder should allow views by:
- account
- department
- branch
- entity
- contract
- service line
- month

Forecast screens should support scenario comparisons.

## 15. Reporting and Analytics Module
This should be a clean report center with saved reports and dashboards.

### 15.1 Screens
- Report Center
- Financial Statements
- AR Reports
- AP Reports
- Payroll Reports
- Labor and Margin Reports
- Inventory Reports
- Budget Reports
- Forecast Reports
- Executive Dashboard Pack
- Saved Reports
- Scheduled Reports

### 15.2 Report Grouping
Financial Statements:
- Profit and Loss
- Balance Sheet
- Cash Flow
- Trial Balance
- General Ledger Detail

Operational Finance Reports:
- labor cost by site
- margin by contract
- billed vs paid hours
- leave liability
- overtime exposure
- billing leakage

## 16. Close and Compliance Module
This module handles close management, filings, and controlled financial governance.

### 16.1 Screens
- Close Dashboard
- Close Checklist
- Reconciliation Status
- Period Locks
- Tax Calendar
- Tax Liabilities
- Filing Periods
- Compliance Tasks
- Audit Log Viewer
- Exception Register

### 16.2 Key UI Design
Close Dashboard should show:
- current period
- task completion status
- open blockers
- pending approvals
- locked vs unlocked modules
- tax due countdowns

## 17. Administration Module
This module should be heavily role-restricted.

### 17.1 Screens
- Tenant Settings
- Entity Settings
- Branches and Departments
- Roles and Permissions
- User Access
- Module Entitlements
- Numbering Rules
- Fiscal Settings
- Payroll Settings
- Tax Settings
- Notification Settings
- Integration Settings
- Feature Flags
- Support Logs if exposed at all

### 17.2 Admin Rule
Normal users should never see admin screens they cannot use. Hide them entirely from navigation when access is absent.

## 18. Role-Based Navigation Model
The UI should assemble menus dynamically based on:
- tenant product entitlement
- module entitlement
- role permissions
- entity scope
- self-service vs admin mode

## 18.1 Example Role Menus

### Executive Read-Only
Visible groups:
- Home
- Reporting and Analytics
- Budgeting and Forecasting
- Close and Compliance

### Controller
Visible groups:
- Home
- Workspaces
- Accounting
- Billing and Receivables
- Payables and Purchasing
- Banking and Treasury
- Payroll
- Reporting and Analytics
- Close and Compliance
- Administration

### Payroll Admin
Visible groups:
- Home
- Workspaces
- Payroll
- Leave and Workforce Finance
- Reporting and Analytics
- Close and Compliance

### Billing Specialist
Visible groups:
- Home
- Workspaces
- Billing and Receivables
- Products, Services, and Contracts
- Reporting and Analytics

### Inventory and Asset Manager
Visible groups:
- Home
- Workspaces
- Inventory and Assets
- Payables and Purchasing
- Reporting and Analytics

### Employee Self-Service
Visible groups:
- Home
- Payroll
- Leave and Workforce Finance
- Inventory and Assets if employee-issued gear visibility is enabled

## 19. Cross-Product Handoff Points
The UI should make external product dependencies visible without duplicating ownership.

## 19.1 Launch Handoff Points
Finance screens should show read-only source references for:
- employee master profile
- onboarding status
- certification and training status
- customer or client master setup

UI pattern:
- show source badge: "Source: Launch"
- where helpful, provide a deep link to Launch rather than editing in Finance

## 19.2 Operations Handoff Points
Finance screens should show read-only source references for:
- approved time
- shift and labor source data
- service delivery records
- schedule-linked leave impact
- billable activity source references

UI pattern:
- show source badge: "Source: Operations"
- allow drill-through to source record details when permissions allow

## 20. Status and Workflow Indicators
All workflow-heavy modules should use consistent status chips.

Recommended states:
- draft
- submitted
- approved
- posted
- issued
- finalized
- released
- settled
- voided
- reversed
- closed
- locked

Every list screen should support filtering by status.

## 21. Common List Screen Pattern
Most modules should use a consistent page pattern:
- page title and summary cards
- filters row
- search box
- status chips
- data table
- bulk actions where allowed
- side detail drawer or full detail page
- audit quick view

## 22. Common Detail Screen Pattern
Standard detail pages should support:
- header summary
- key identifiers
- current status
- workflow actions toolbar
- tabbed content
- audit panel
- attachments panel where relevant
- source references to Launch or Operations where relevant

## 23. Notifications and Alert Design
Notifications should be scoped and actionable.

Examples:
- payroll cutoff approaching
- bank reconciliation overdue
- low stock alert
- pending approval alert
- contract rate mismatch
- tax due soon
- leave policy conflict
- period close blocked

Alerts should deep-link into the exact workspace or record requiring action.

## 24. Dashboard Standards
Dashboards should follow three rules:
1. summary first
2. drill-down available
3. clearly distinguish informational metrics from actionable exceptions

Recommended dashboard layers:
- role home dashboards
- module dashboards
- report dashboards
- executive command dashboard

## 25. Mobile and Responsive Considerations
Watchman Finance is primarily admin and desktop heavy, but certain workflows should be mobile-friendly:
- approvals
- exception review
- leave approval
- invoice viewing
- pay statement viewing
- employee self-service
- equipment assignment confirmation

Do not force complex reconciliation, payroll finalization, or budget building into mobile-first layouts.

## 26. Recommended Initial Navigation Release
For v1, prioritize these navigation groups:
- Home
- Workspaces
- Accounting
- Payroll
- Billing and Receivables
- Payables and Purchasing
- Banking and Treasury
- Leave and Workforce Finance
- Products, Services, and Contracts
- Inventory and Assets
- Reporting and Analytics
- Administration

Then add:
- Budgeting and Forecasting
- Close and Compliance

as soon as the underlying workflows are ready.

## 27. Final Standard
Watchman Finance should feel like a controlled financial operating system, not a loose collection of forms. The UI must make ownership, workflow state, approvals, source-system boundaries, and role-based access obvious at every step.
