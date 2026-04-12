# Watchman Finance Server Action Starter Pack 001 v1

## 1. Purpose

This starter pack defines the first server actions that should be implemented after the foundation schema is in place.

These actions are intentionally limited to:
- tenant bootstrap
- entity management
- role assignment
- module entitlement management
- account management
- fiscal period management

These actions should be implemented before module-specific finance actions such as invoices, bills, payroll runs, and reconciliations.

## 2. Shared Standards for Every Action

Each action must:
- resolve auth user
- resolve tenant context
- check entity scope where relevant
- validate permissions
- write audit logs
- reject unauthorized tenant or entity access
- return structured error codes
- use transactions where multiple records must succeed together

Standard response fields:
- success
- message
- data
- errors
- warnings
- correlation_id

## 3. Action List

## 3.1 finance.bootstrapTenant

### Purpose
Create a new tenant and first entity for Watchman Finance internal use.

### Input
- tenant_slug
- legal_name
- display_name
- timezone
- first_entity_code
- first_entity_name
- owner_platform_user_id

### Required checks
- caller has platform or setup permission
- tenant slug is unique
- first entity code is unique within tenant

### Writes
- tenants
- entities
- tenant_memberships
- tenant_user_profiles optional
- tenant_product_entitlements
- tenant_module_entitlements
- finance_settings optional defaults
- audit_logs

### Audit action code
- tenant.bootstrap

### Failure rules
- no partial creation without rollback
- duplicate slug returns validation_failed

## 3.2 tenant.createEntity

### Purpose
Create an additional entity inside an existing tenant.

### Input
- tenant_id
- entity_code
- legal_name
- display_name
- entity_type
- base_currency

### Permission
- entity.create

### Writes
- entities
- audit_logs

### Validation
- tenant must exist
- caller must belong to tenant
- entity code must be unique in tenant

## 3.3 tenant.updateEntity

### Purpose
Update editable entity metadata.

### Input
- tenant_id
- entity_id
- display_name
- status
- base_currency
- optional metadata fields

### Permission
- entity.update

### Validation
- entity belongs to tenant
- status transition is allowed
- no change to immutable fields without special action

### Writes
- entities
- audit_logs

## 3.4 tenant.assignUserRole

### Purpose
Assign a role to a user in a tenant.

### Input
- tenant_id
- target_platform_user_id
- role_id

### Permission
- user.role_assign

### Validation
- target user has active tenant membership
- role belongs to tenant or system role registry
- duplicate active assignment prevented

### Writes
- user_role_assignments
- audit_logs

## 3.5 tenant.assignUserEntityScope

### Purpose
Grant entity-scoped access.

### Input
- tenant_id
- target_platform_user_id
- entity_id

### Permission
- user.scope_assign

### Validation
- target user belongs to tenant
- entity belongs to tenant
- duplicate scope prevented

### Writes
- user_entity_scopes
- audit_logs

## 3.6 tenant.setModuleEntitlement

### Purpose
Enable or disable a finance module for a tenant.

### Input
- tenant_id
- module_key
- enabled

### Permission
- tenant.update or module entitlement admin permission

### Validation
- module_key exists in module registry
- change is allowed for tenant plan or internal configuration

### Writes
- tenant_module_entitlements
- audit_logs

## 3.7 gl.createAccount

### Purpose
Create an account in the chart of accounts.

### Input
- tenant_id
- entity_id
- account_category_id
- code
- name
- description
- parent_account_id optional
- account_type
- normal_balance
- allow_posting

### Permission
- gl.account.manage

### Validation
- entity belongs to tenant
- code unique within entity
- parent account if provided belongs to same entity
- normal balance valid for selected account type

### Writes
- accounts
- audit_logs

### Error examples
- duplicate_account_code
- invalid_parent_account
- entity_scope_mismatch

## 3.8 gl.updateAccount

### Purpose
Update an account that is not locked by use rules.

### Input
- tenant_id
- entity_id
- account_id
- mutable fields only

### Permission
- gl.account.manage

### Validation
- account belongs to tenant and entity
- restricted fields not changed if account already used by posted transactions in future design
- status change allowed

### Writes
- accounts
- audit_logs

## 3.9 gl.archiveAccount

### Purpose
Deactivate an account.

### Input
- tenant_id
- entity_id
- account_id

### Permission
- gl.account.manage

### Validation
- account belongs to tenant and entity
- account not protected from deactivation by business rule
- archive reason required if configured

### Writes
- accounts
- audit_logs

## 3.10 gl.createFiscalPeriod

### Purpose
Create a fiscal period for an entity.

### Input
- tenant_id
- entity_id
- period_name
- start_date
- end_date
- fiscal_year
- fiscal_month optional

### Permission
- gl.account.manage or finance setup permission

### Validation
- no overlapping period for entity
- start_date <= end_date
- entity belongs to tenant

### Writes
- fiscal_periods
- audit_logs

## 3.11 gl.closeFiscalPeriod

### Purpose
Close a fiscal period to protect posted accounting periods.

### Input
- tenant_id
- entity_id
- fiscal_period_id
- closure_type
- notes optional

### Permission
- gl.period.close

### Validation
- period belongs to tenant and entity
- period not already closed for closure_type
- no blocking checklist items in later close workflow if configured

### Writes
- fiscal_period_closures
- fiscal_periods status update if used
- audit_logs

## 3.12 gl.reopenFiscalPeriod

### Purpose
Reopen a previously closed period.

### Input
- tenant_id
- entity_id
- fiscal_period_id
- reopen_reason

### Permission
- gl.period.reopen

### Validation
- period belongs to tenant and entity
- reopen reason required
- maker-checker rule may apply in future

### Writes
- fiscal_period_closures
- fiscal_periods status update if used
- audit_logs

## 4. Suggested File Structure

If implemented in a modular server codebase, use a structure similar to:

- finance/bootstrapTenant.ts
- tenant/createEntity.ts
- tenant/updateEntity.ts
- tenant/assignUserRole.ts
- tenant/assignUserEntityScope.ts
- tenant/setModuleEntitlement.ts
- gl/createAccount.ts
- gl/updateAccount.ts
- gl/archiveAccount.ts
- gl/createFiscalPeriod.ts
- gl/closeFiscalPeriod.ts
- gl/reopenFiscalPeriod.ts

Shared modules:
- auth/resolveContext.ts
- auth/requirePermission.ts
- audit/writeAuditLog.ts
- db/transaction.ts
- validation/*.ts

## 5. Suggested Validation Schemas

Each action should have:
- request schema
- normalized input transformer
- permission guard
- domain validation service
- database write service
- audit service call
- typed response

## 6. Required Tests

For each action, test:
- authorized success path
- cross-tenant access attempt
- missing permission
- invalid entity scope
- duplicate conflict where applicable
- audit log written
- rollback on failure where multi-write transaction exists

## 7. Build Priority

Implement in this order:

1. finance.bootstrapTenant
2. tenant.createEntity
3. tenant.assignUserRole
4. tenant.assignUserEntityScope
5. tenant.setModuleEntitlement
6. gl.createAccount
7. gl.updateAccount
8. gl.archiveAccount
9. gl.createFiscalPeriod
10. gl.closeFiscalPeriod
11. gl.reopenFiscalPeriod

## 8. Final Rule

No browser client should directly mutate:
- tenants
- entities
- user role assignments
- user scopes
- tenant module entitlements
- accounts
- fiscal period closures

All of them must go through named server actions with permission checks and audit logging.
