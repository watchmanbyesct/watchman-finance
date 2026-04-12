# Watchman Finance Shared Supabase Permission and Audit Utility Library Specification
## Cross-Cutting Backend Execution Standard

## 1. Purpose

This document defines the shared permission and audit utility library for Watchman Finance.

It is intended to serve as the standard implementation specification for the backend utilities that every Watchman Finance module should use when enforcing:

- tenant access
- entity scope
- role and permission checks
- maker-checker controls
- audit logging
- action metadata
- request context validation

This library should be treated as required infrastructure, not optional helper code.

## 2. Why This Library Matters

Watchman Finance is a controlled financial platform. That means its backend cannot rely on scattered, inconsistent permission checks or ad hoc audit writes.

A shared library is required so that every module:
- checks permissions the same way
- resolves tenant and entity scope the same way
- logs material actions the same way
- returns consistent authorization and audit behavior
- supports future commercial rollout without redesign

## 3. Library Objectives

The shared utility library should:

1. resolve authenticated backend request context
2. determine platform user identity
3. determine tenant and entity scope
4. enforce permission requirements
5. enforce optional maker-checker rules
6. standardize audit payload construction
7. write audit entries consistently
8. reduce duplicated permission logic across modules
9. support route handlers, server actions, and service-layer calls

## 4. Recommended Directory Structure

```text
lib/
  auth/
    resolve-session.ts
    resolve-platform-user.ts
  context/
    resolve-request-context.ts
    assert-tenant-context.ts
  permissions/
    require-permission.ts
    require-any-permission.ts
    require-all-permissions.ts
    require-entity-scope.ts
    require-module-access.ts
    require-maker-checker.ts
    get-effective-permissions.ts
  audit/
    build-audit-payload.ts
    write-audit-log.ts
    write-bulk-audit-log.ts
    sanitize-audit-values.ts
    audit-action-codes.ts
  errors/
    app-error.ts
    permission-error.ts
    scope-error.ts
    workflow-error.ts
  db/
    supabase-server.ts
    transaction.ts
types/
  auth.ts
  permissions.ts
  audit.ts
```

## 5. Core Design Rules

### 5.1 Server-only enforcement
Permission checks and audit writes must happen server-side only.

### 5.2 Context before action
No controlled finance action should run before request context is resolved.

### 5.3 Explicit permission checks
Every sensitive action should explicitly name required permissions.

### 5.4 Entity scope is separate from permission
A user may have a permission but still be blocked if they do not have access to the relevant entity.

### 5.5 Audit for material actions
Every material finance mutation should generate an audit entry.

### 5.6 Consistent error model
Permission failures, scope failures, and workflow failures should return distinct error types.

## 6. Standard Types

## 6.1 Request context type

```ts
export type UUID = string;

export interface RequestContext {
  authUserId: UUID;
  platformUserId: UUID;
  tenantId: UUID;
  entityIds: UUID[];
  roleCodes: string[];
  permissions: string[];
  correlationId: string;
  sourceChannel: "web" | "api" | "integration" | "system";
}
```

## 6.2 Audit payload type

```ts
export interface AuditPayload {
  tenantId?: UUID;
  entityId?: UUID;
  actorPlatformUserId?: UUID;
  moduleKey: string;
  actionCode: string;
  targetTable: string;
  targetRecordId?: UUID;
  oldValues?: unknown;
  newValues?: unknown;
  metadata?: unknown;
  sourceChannel?: string;
}
```

## 6.3 Permission check options

```ts
export interface PermissionCheckOptions {
  allowIfAny?: boolean;
  enforceEntityScope?: boolean;
  entityId?: UUID;
}
```

## 7. Request Context Resolution

## 7.1 resolveSession
### Purpose
Resolve the authenticated session from the Supabase server client.

### Inputs
- Supabase server client
- request or cookies context

### Outputs
- auth user ID
- session metadata if needed

### Failure behavior
Throw an authentication error if no valid session exists.

## 7.2 resolvePlatformUser
### Purpose
Map the auth identity to the platform user record.

### Outputs
- platform user ID
- status
- tenant memberships
- role assignments if needed

### Failure behavior
Throw a controlled authorization error if platform user mapping does not exist.

## 7.3 resolveRequestContext
### Purpose
Produce the standard backend request context used by all finance modules.

### Responsibilities
- resolve auth user
- resolve platform user
- resolve active tenant
- resolve entity scope
- resolve effective permissions
- assign correlation ID
- assign source channel

### Output
A fully formed `RequestContext`.

## 8. Permission Utility Specifications

## 8.1 getEffectivePermissions
### Purpose
Return the effective permission set for the current platform user inside the active tenant.

### Sources
- user role assignments
- role-permission mappings
- tenant membership status
- optional feature or module entitlement filters

### Output
A normalized array of permission codes.

## 8.2 requirePermission
### Purpose
Require a single permission code.

### Example
```ts
requirePermission(ctx, "ar.invoice.issue");
```

### Behavior
- pass if permission is present
- throw `PermissionError` if absent

## 8.3 requireAnyPermission
### Purpose
Allow access if the user has at least one of the listed permissions.

### Example
```ts
requireAnyPermission(ctx, ["report.read_standard", "report.read_sensitive"]);
```

## 8.4 requireAllPermissions
### Purpose
Require multiple permissions together.

### Example
```ts
requireAllPermissions(ctx, ["release.manage", "platform.monitor"]);
```

## 8.5 requireEntityScope
### Purpose
Confirm the user is authorized for the target entity.

### Example
```ts
requireEntityScope(ctx, entityId);
```

### Behavior
- pass if entity is in `ctx.entityIds`
- throw `ScopeError` if not

## 8.6 requireModuleAccess
### Purpose
Confirm the module is enabled for the tenant and optionally for the current user role model.

### Example
```ts
requireModuleAccess(ctx, "payroll");
```

### Notes
This utility should integrate later with tenant feature flags and module entitlement controls.

## 8.7 requireMakerChecker
### Purpose
Prevent the same actor from completing both a maker and checker role where maker-checker control is required.

### Example
```ts
requireMakerChecker({
  actorPlatformUserId: ctx.platformUserId,
  createdByPlatformUserId: draft.created_by,
  workflow: "payroll_approval",
});
```

### Behavior
- pass if actor differs from maker
- throw `WorkflowError` if maker-checker is violated

## 9. Audit Utility Specifications

## 9.1 buildAuditPayload
### Purpose
Create a standardized audit payload from context plus module-specific action data.

### Inputs
- request context
- module key
- action code
- target table
- target record ID
- entity ID
- old values
- new values
- metadata

### Output
A valid `AuditPayload`.

## 9.2 sanitizeAuditValues
### Purpose
Remove or mask values that should not be stored in raw form.

### Use cases
- bank account numbers
- routing numbers
- SSN or tax identifiers
- sensitive payroll banking details
- authentication or token material

### Behavior
- redact known sensitive keys
- preserve useful trace value where possible
- prevent accidental full-secret logging

## 9.3 writeAuditLog
### Purpose
Persist a single audit record to `public.audit_logs`.

### Example
```ts
await writeAuditLog(db, payload);
```

### Responsibilities
- sanitize values
- serialize JSON safely
- write actor, tenant, entity, module, action, target, and metadata
- preserve source channel and correlation

## 9.4 writeBulkAuditLog
### Purpose
Support controlled bulk writes when one workflow touches many target records.

### Use case examples
- payroll input load
- report snapshot generation
- inventory receipt lines
- release task batch completion

## 9.5 audit action code registry
### Purpose
Standardize action codes across modules.

### Example structure
```ts
export const AuditActionCodes = {
  AR_INVOICE_DRAFT_CREATE: "ar.invoice.draft.create",
  AR_INVOICE_ISSUE: "ar.invoice.issue",
  AP_BILL_APPROVE: "ap.bill.approve",
  PAYROLL_RUN_CREATE: "payroll.run.create",
  PAYROLL_RUN_FINALIZE: "payroll.run.finalize",
  LEAVE_REQUEST_APPROVE: "leave.request.approve",
  BANK_RECONCILIATION_APPROVE: "bank.reconciliation.approve",
};
```

## 10. Error Model

## 10.1 AppError
Base typed application error.

```ts
export class AppError extends Error {
  code: string;
  status: number;
  details?: unknown;
}
```

## 10.2 PermissionError
Used for missing permission conditions.

### Example code
- `forbidden:permission_missing`

## 10.3 ScopeError
Used for entity or tenant scope mismatch.

### Example code
- `forbidden:entity_scope_mismatch`

## 10.4 WorkflowError
Used for maker-checker violations or blocked workflow transitions.

### Example code
- `workflow:maker_checker_violation`
- `workflow:invalid_state_transition`

## 11. Standard Backend Flow

Every controlled backend action should follow this pattern:

1. resolve Supabase server client
2. resolve request context
3. validate input
4. require module access where needed
5. require permission
6. require entity scope if applicable
7. require maker-checker if applicable
8. execute service logic
9. write audit log
10. return typed result

## 12. Example Usage Pattern

```ts
export async function issueInvoice(
  db: DbClient,
  ctx: RequestContext,
  input: IssueInvoiceInput,
) {
  requireModuleAccess(ctx, "ar");
  requirePermission(ctx, "ar.invoice.issue");
  requireEntityScope(ctx, input.entityId);

  const invoice = await invoiceRepository.getById(db, input.invoiceId);

  requireMakerChecker({
    actorPlatformUserId: ctx.platformUserId,
    createdByPlatformUserId: invoice.created_by,
    workflow: "invoice_issue",
  });

  await invoiceRepository.issue(db, input);

  await writeAuditLog(
    db,
    buildAuditPayload(ctx, {
      moduleKey: "ar",
      actionCode: "ar.invoice.issue",
      targetTable: "invoices",
      targetRecordId: input.invoiceId,
      entityId: input.entityId,
      oldValues: { invoice_status: "draft" },
      newValues: { invoice_status: "issued" },
    }),
  );
}
```

## 13. Module Permission Mapping Guidance

The library should support permission families like:

- finance_core.*
- integration.*
- ar.*
- ap.*
- payroll.*
- leave.*
- banking.*
- catalog.*
- billing.*
- inventory.*
- reporting.*
- planning.*
- platform.*

Examples:
- `payroll.run.create`
- `payroll.run.calculate`
- `payroll.run.approve`
- `bank.reconciliation.approve`
- `inventory.adjust`
- `report.read_sensitive`

## 14. Sensitive Workflow Guidance

The following workflows should always use the shared permission and audit library:

- payroll approval and finalization
- invoice issue and void
- bill approval and posting
- bank reconciliation approval
- transfer request approval
- inventory adjustment posting
- asset issue and return
- feature-flag changes
- release approvals
- restore and recovery test initiation

## 15. Logging and Correlation Guidance

Every request context should include a correlation ID.

That correlation ID should flow through:
- server action entry
- service layer
- repository writes where practical
- audit payload metadata
- operational alert generation where applicable

This allows one finance event to be traced across:
- user action
- business workflow
- audit record
- monitoring event
- support investigation

## 16. Testing Requirements

The shared library should be tested for:

### Permission tests
- permission present
- permission absent
- any-permission success
- all-permission failure

### Scope tests
- valid entity scope
- invalid entity scope
- tenant mismatch behavior

### Audit tests
- single audit entry write
- sensitive value redaction
- bulk audit write
- correlation ID inclusion

### Workflow tests
- maker-checker allowed
- maker-checker blocked

## 17. Implementation Sequence

Build this shared library before wide module UI rollout.

Recommended order:
1. auth resolution utilities
2. request context resolver
3. permission utilities
4. scope enforcement utilities
5. audit payload builder
6. audit writer
7. sensitive-value sanitizer
8. typed error classes
9. tests
10. module-by-module adoption

## 18. Adoption Rule

No Watchman Finance module should implement its own custom permission or audit pattern unless there is a clearly documented exception.

The shared library is the standard.

## 19. Immediate Next Execution Artifacts

After this spec, the strongest code-oriented deliverables are:
1. actual TypeScript utility stubs for the shared library
2. module action wrappers using the shared library
3. a first Vercel scaffold for Finance setup, AR/AP, or Payroll
4. issue-by-issue implementation sheets mapped to these utilities

## 20. Final Rule

If a backend action:
- changes financial state
- approves a workflow
- affects entity-scoped data
- touches payroll, banking, billing, inventory, or reporting controls

then it should use the shared permission and audit utility library.
