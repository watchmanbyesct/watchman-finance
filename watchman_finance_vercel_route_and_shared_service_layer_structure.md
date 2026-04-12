# Watchman Finance Vercel Route and Shared Service-Layer Structure
## Application Structure and Backend Execution Guide

## 1. Purpose

This document defines the recommended Vercel route structure and shared service-layer architecture for Watchman Finance.

It is intended to translate the completed Watchman Finance pack sequence into a practical application structure that can be implemented in a modern Vercel and Supabase stack.

This guide should be used for:
- route planning
- backend organization
- service-layer design
- permission enforcement
- audit integration
- module separation
- implementation handoff

## 2. Architectural Objective

The application structure must support a finance platform that is:
- multi-tenant
- multi-entity
- modular
- permission-controlled
- audit-driven
- service-oriented
- safe for financial workflows

The structure must separate:
- UI concerns
- server actions
- validation
- permissions
- data access
- audit logging
- integrations
- reporting

## 3. High-Level Application Layers

The recommended structure is:

### 3.1 Presentation layer
User-facing pages, dashboards, forms, tables, workflows, and UI shells.

### 3.2 Route layer
App routes for module pages, admin pages, review pages, dashboards, and secure navigation.

### 3.3 Action layer
Named server actions or route handlers for controlled mutations.

### 3.4 Service layer
Shared business logic services that enforce workflow rules, permissions, and module behavior.

### 3.5 Repository and data layer
Supabase access functions, query builders, and persistence logic.

### 3.6 Platform layer
Cross-cutting services such as:
- auth context
- tenant resolution
- entity resolution
- permissions
- audit logging
- feature flags
- error handling
- module entitlements

## 4. Recommended Top-Level Structure

```text
app/
  (platform)/
  (finance)/
  api/
components/
lib/
modules/
types/
```

## 5. Recommended Vercel App Router Structure

```text
app/
  (platform)/
    admin/
      page.tsx
      tenants/
      modules/
      integrations/
      health/
      release/
  (finance)/
    finance/
      page.tsx
      dashboard/
      setup/
      entities/
      accounts/
      periods/
      ar/
      ap/
      payroll/
      leave/
      banking/
      catalog/
      billing/
      inventory/
      reporting/
      planning/
      consolidation/
      client-portal/
  api/
    health/
    integrations/
    webhooks/
    exports/
    reports/
```

## 6. Recommended Finance Route Map

## 6.1 Finance home
```text
app/(finance)/finance/page.tsx
```

Purpose:
- module landing page
- high-level financial summary
- readiness widgets
- alerts and exceptions
- quick actions

## 6.2 Setup and foundation routes
```text
app/(finance)/finance/setup/page.tsx
app/(finance)/finance/entities/page.tsx
app/(finance)/finance/accounts/page.tsx
app/(finance)/finance/periods/page.tsx
```

Purpose:
- tenant and entity finance setup
- chart of accounts management
- fiscal period setup
- finance configuration

## 6.3 AR routes
```text
app/(finance)/finance/ar/page.tsx
app/(finance)/finance/ar/customers/page.tsx
app/(finance)/finance/ar/invoices/page.tsx
app/(finance)/finance/ar/invoices/[invoiceId]/page.tsx
app/(finance)/finance/ar/payments/page.tsx
app/(finance)/finance/ar/credit-memos/page.tsx
app/(finance)/finance/ar/aging/page.tsx
```

## 6.4 AP routes
```text
app/(finance)/finance/ap/page.tsx
app/(finance)/finance/ap/vendors/page.tsx
app/(finance)/finance/ap/bills/page.tsx
app/(finance)/finance/ap/bills/[billId]/page.tsx
app/(finance)/finance/ap/payments/page.tsx
app/(finance)/finance/ap/aging/page.tsx
```

## 6.5 Payroll routes
```text
app/(finance)/finance/payroll/page.tsx
app/(finance)/finance/payroll/pay-groups/page.tsx
app/(finance)/finance/payroll/pay-periods/page.tsx
app/(finance)/finance/payroll/profiles/page.tsx
app/(finance)/finance/payroll/runs/page.tsx
app/(finance)/finance/payroll/runs/[runId]/page.tsx
app/(finance)/finance/payroll/statements/page.tsx
```

## 6.6 Leave routes
```text
app/(finance)/finance/leave/page.tsx
app/(finance)/finance/leave/types/page.tsx
app/(finance)/finance/leave/policies/page.tsx
app/(finance)/finance/leave/requests/page.tsx
app/(finance)/finance/leave/balances/page.tsx
app/(finance)/finance/leave/liability/page.tsx
```

## 6.7 Banking routes
```text
app/(finance)/finance/banking/page.tsx
app/(finance)/finance/banking/accounts/page.tsx
app/(finance)/finance/banking/transactions/page.tsx
app/(finance)/finance/banking/reconciliations/page.tsx
app/(finance)/finance/banking/reconciliations/[reconciliationId]/page.tsx
app/(finance)/finance/banking/transfers/page.tsx
```

## 6.8 Catalog and billing routes
```text
app/(finance)/finance/catalog/page.tsx
app/(finance)/finance/catalog/items/page.tsx
app/(finance)/finance/catalog/pricing/page.tsx
app/(finance)/finance/billing/page.tsx
app/(finance)/finance/billing/rules/page.tsx
app/(finance)/finance/billing/candidates/page.tsx
app/(finance)/finance/billing/exceptions/page.tsx
```

## 6.9 Inventory routes
```text
app/(finance)/finance/inventory/page.tsx
app/(finance)/finance/inventory/items/page.tsx
app/(finance)/finance/inventory/stock/page.tsx
app/(finance)/finance/inventory/receipts/page.tsx
app/(finance)/finance/inventory/transfers/page.tsx
app/(finance)/finance/inventory/adjustments/page.tsx
app/(finance)/finance/inventory/assets/page.tsx
app/(finance)/finance/inventory/issues/page.tsx
app/(finance)/finance/inventory/incidents/page.tsx
```

## 6.10 Reporting and planning routes
```text
app/(finance)/finance/reporting/page.tsx
app/(finance)/finance/reporting/reports/page.tsx
app/(finance)/finance/reporting/dashboards/page.tsx
app/(finance)/finance/reporting/close/page.tsx
app/(finance)/finance/planning/page.tsx
app/(finance)/finance/planning/budgets/page.tsx
app/(finance)/finance/planning/forecasts/page.tsx
app/(finance)/finance/planning/variance/page.tsx
```

## 6.11 Consolidation and enterprise routes
```text
app/(finance)/finance/consolidation/page.tsx
app/(finance)/finance/consolidation/groups/page.tsx
app/(finance)/finance/consolidation/intercompany/page.tsx
app/(finance)/finance/commercial/page.tsx
app/(finance)/finance/commercial/feature-flags/page.tsx
app/(finance)/finance/commercial/activation/page.tsx
```

## 7. Recommended API Route Structure

Vercel route handlers should be used where external systems, exports, webhooks, or background-safe endpoints are needed.

```text
app/api/
  health/
    route.ts
  integrations/
    launch/
      employees/route.ts
      customers/route.ts
      contracts/route.ts
    operations/
      approved-time/route.ts
      service-events/route.ts
      leave-events/route.ts
      inventory-events/route.ts
    quickbooks/
      route.ts
  webhooks/
    stripe/route.ts
    authorize-net/route.ts
    internal/route.ts
  reports/
    ar-aging/route.ts
    ap-aging/route.ts
    payroll-summary/route.ts
    executive-dashboard/route.ts
  exports/
    payroll/route.ts
    invoices/route.ts
    inventory/route.ts
```

## 8. Recommended Shared Library Structure

```text
lib/
  auth/
  context/
  permissions/
  audit/
  db/
  errors/
  validation/
  formatting/
  feature-flags/
  rls/
  telemetry/
```

## 9. Recommended Modules Structure

```text
modules/
  finance-core/
  integration/
  ar/
  ap/
  payroll/
  leave/
  banking/
  catalog/
  billing/
  inventory/
  reporting/
  planning/
  consolidation/
  platform/
```

Each module should own its service logic, validation, types, and action wiring.

## 10. Recommended Internal Module Structure

Example:

```text
modules/ar/
  actions/
  services/
  repositories/
  validators/
  types/
  queries/
  mappers/
  constants/
```

### 10.1 actions
Named server actions or backend mutation handlers.

### 10.2 services
Business rules and workflow orchestration.

### 10.3 repositories
Database access functions.

### 10.4 validators
Input schema and guard logic.

### 10.5 types
Typed interfaces and domain types.

### 10.6 queries
Read models and reporting queries.

### 10.7 mappers
Mapping logic between DB rows, domain objects, and UI models.

### 10.8 constants
Module status codes, enumerations, and config keys.

## 11. Shared Service-Layer Requirements

## 11.1 Auth context
Recommended file area:
```text
lib/auth/
lib/context/
```

Purpose:
- resolve authenticated user
- resolve platform user
- resolve tenant context
- resolve entity scope
- expose safe request context to actions and services

## 11.2 Permission enforcement
Recommended file area:
```text
lib/permissions/
```

Purpose:
- require permission by code
- enforce module access
- enforce entity scope
- support maker-checker restrictions
- support sensitive workflow gates

## 11.3 Audit logging
Recommended file area:
```text
lib/audit/
```

Purpose:
- create standardized audit payloads
- record old values and new values
- record actor, tenant, entity, module, action
- support source channel and metadata

## 11.4 Database access
Recommended file area:
```text
lib/db/
```

Purpose:
- create server-safe Supabase clients
- support transactions
- centralize DB conventions
- reduce duplicated query logic

## 11.5 Error handling
Recommended file area:
```text
lib/errors/
```

Purpose:
- normalize error codes
- distinguish validation, permission, and workflow failures
- produce safe user-facing messages
- preserve internal diagnostic detail

## 11.6 Validation
Recommended file area:
```text
lib/validation/
```

Purpose:
- centralize schema validation
- normalize request input
- reuse domain-safe validation patterns across modules

## 11.7 Feature flags
Recommended file area:
```text
lib/feature-flags/
```

Purpose:
- check tenant flag state
- check module rollout state
- support phased rollout and commercialization readiness

## 11.8 Telemetry and health
Recommended file area:
```text
lib/telemetry/
```

Purpose:
- capture structured operational events
- support readiness dashboards
- surface release and runtime health

## 12. Recommended Shared File Examples

```text
lib/auth/resolve-session.ts
lib/context/resolve-request-context.ts
lib/permissions/require-permission.ts
lib/permissions/require-entity-scope.ts
lib/audit/write-audit-log.ts
lib/db/supabase-server.ts
lib/db/transaction.ts
lib/errors/app-error.ts
lib/errors/map-error.ts
lib/validation/parse-input.ts
lib/feature-flags/get-tenant-flag.ts
lib/telemetry/log-health-event.ts
```

## 13. Recommended Module Action Pattern

Each module action should follow this order:

1. resolve request context
2. validate request input
3. require permission
4. require entity scope where applicable
5. load needed reference records
6. enforce workflow rules
7. run transaction if multi-write
8. write audit log
9. return typed result

This sequence should be standard across all finance modules.

## 14. Recommended Server Action Placement

Examples:

```text
modules/payroll/actions/create-payroll-run.ts
modules/payroll/actions/load-approved-time.ts
modules/payroll/actions/calculate-payroll-run.ts
modules/ar/actions/create-invoice-draft.ts
modules/ar/actions/issue-invoice.ts
modules/banking/actions/create-reconciliation.ts
modules/inventory/actions/receive-stock.ts
modules/reporting/actions/generate-report-snapshot.ts
```

Do not place complex financial business logic directly inside UI components.

## 15. Recommended Repository Placement

Examples:

```text
modules/ar/repositories/invoice-repository.ts
modules/payroll/repositories/payroll-run-repository.ts
modules/inventory/repositories/stock-balance-repository.ts
modules/reporting/repositories/report-snapshot-repository.ts
```

Repositories should:
- fetch rows
- insert rows
- update rows
- support scoped reads

Repositories should not contain major business workflow logic.

## 16. Recommended Query Layer Placement

Examples:

```text
modules/reporting/queries/ar-aging-query.ts
modules/reporting/queries/payroll-summary-query.ts
modules/reporting/queries/cash-position-query.ts
modules/planning/queries/variance-query.ts
```

This keeps read logic separated from mutation workflows.

## 17. Recommended Component Structure

```text
components/
  finance/
    dashboard/
    forms/
    tables/
    filters/
    review/
  shared/
    layout/
    navigation/
    status/
    cards/
    dialogs/
```

Use components for:
- forms
- review panels
- workflow summaries
- finance status cards
- approval controls
- scoped filters
- dashboard widgets

Do not bury business rules inside UI components.

## 18. Recommended Route Guard Pattern

Page routes should be guarded through:
- auth check
- tenant resolution
- module entitlement check
- permission gate for sensitive pages

Examples:
- payroll admin screen should require payroll module access
- banking reconciliation page should require banking module access
- planning pages should require planning module access

## 19. Recommended Environment Structure

Use environment-aware configuration through platform utilities.

Examples:
- dev
- staging
- UAT
- production

Shared config should include:
- Supabase environment IDs
- webhook secrets
- email and SMS config
- feature flags
- export controls
- monitoring settings

## 20. Suggested Implementation Order for the Application Layer

### First
Build shared platform services:
- auth
- context
- permissions
- audit
- DB client
- error mapping
- validation helpers

### Second
Build module repositories and service skeletons:
- finance core
- integration
- AR
- AP
- payroll

### Third
Build core routes and admin setup screens:
- finance dashboard
- setup
- accounts
- entities
- AR/AP
- payroll

### Fourth
Build remaining modules:
- leave
- banking
- catalog
- billing
- inventory
- reporting
- planning
- consolidation

### Fifth
Build production-readiness tools:
- health
- release
- monitoring
- recovery admin screens

## 21. Recommended File Ownership Model

### app/
owns:
- page-level UI
- route composition
- layout
- route protection wiring

### modules/
owns:
- business logic
- workflows
- repositories
- validation
- module types

### lib/
owns:
- shared platform logic
- permission enforcement
- audit
- DB connectivity
- cross-module utilities

### components/
owns:
- reusable interface pieces

## 22. Final Structural Rule

The Watchman Finance codebase should always make it easy to answer five questions:

1. what route owns the screen
2. what action performs the mutation
3. what service enforces the business rule
4. what repository touches the database
5. what audit and permission checks protect the workflow

If the structure does not make those questions easy to answer, the architecture should be tightened before scaling further.

