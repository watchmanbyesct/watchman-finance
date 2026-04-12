# Watchman Finance GitHub Issue Set 001 Foundation v1

## 1. Purpose

This issue set converts the first Watchman Finance build target into GitHub-ready issues.

Target:
- tenancy
- permissions
- audit
- accounts
- fiscal periods

## 2. Issue List

## WF-001 Create tenants and entities schema
Type: schema
Priority: P0
Labels:
- priority:P0
- type:schema
- domain:tenancy

Description:
Create the tenants and entities foundation tables with required indexes and constraints.

Acceptance criteria:
- tenants table exists
- entities table exists
- unique tenant slug works
- unique entity code within tenant works
- tenant_id foreign key integrity works
- seed example tenant and entity can be inserted

Dependencies:
- none

## WF-002 Create branches, departments, locations, and cost centers
Type: schema
Priority: P0
Labels:
- priority:P0
- type:schema
- domain:tenancy

Acceptance criteria:
- organizational structure tables exist
- all tables include tenant_id
- entity linkage exists where needed
- indexes on tenant_id and entity_id exist

Dependencies:
- WF-001

## WF-003 Create platform users, memberships, and tenant user profiles
Type: schema
Priority: P0
Labels:
- priority:P0
- type:schema
- domain:tenancy

Acceptance criteria:
- platform_users exists
- tenant_memberships exists
- tenant_user_profiles exists
- unique tenant membership enforced
- auth user can be linked to platform user

Dependencies:
- WF-001

## WF-004 Create roles, permissions, and role assignment tables
Type: schema
Priority: P0
Labels:
- priority:P0
- type:schema
- type:security
- domain:tenancy

Acceptance criteria:
- roles exists
- permissions exists
- role_permissions exists
- user_role_assignments exists
- role-permission uniqueness enforced

Dependencies:
- WF-003

## WF-005 Create entity and organizational scope tables
Type: schema
Priority: P0
Labels:
- priority:P0
- type:schema
- type:security
- domain:tenancy

Acceptance criteria:
- user_entity_scopes exists
- user_branch_scopes exists
- user_department_scopes exists
- user_location_scopes exists
- scope uniqueness constraints defined where appropriate

Dependencies:
- WF-004

## WF-006 Create module entitlement tables
Type: schema
Priority: P0
Labels:
- priority:P0
- type:schema
- type:security
- domain:tenancy

Acceptance criteria:
- tenant_product_entitlements exists
- tenant_module_entitlements exists
- user_module_overrides exists
- finance module keys can be seeded

Dependencies:
- WF-004

## WF-007 Create settings and audit log tables
Type: schema
Priority: P0
Labels:
- priority:P0
- type:schema
- type:security
- domain:gl

Acceptance criteria:
- tenant_settings exists
- entity_settings exists
- finance_settings exists
- audit_logs exists
- audit log indexes exist on tenant_id, entity_id, occurred_at

Dependencies:
- WF-001

## WF-008 Create account categories and accounts tables
Type: schema
Priority: P0
Labels:
- priority:P0
- type:schema
- domain:gl

Acceptance criteria:
- account_categories exists
- accounts exists
- unique entity account code enforced
- parent account hierarchy supported
- starter categories can be seeded

Dependencies:
- WF-001
- WF-007

## WF-009 Create fiscal periods and fiscal closures tables
Type: schema
Priority: P0
Labels:
- priority:P0
- type:schema
- domain:gl

Acceptance criteria:
- fiscal_periods exists
- fiscal_period_closures exists
- unique period range per entity enforced
- close record can be created per period

Dependencies:
- WF-008

## WF-010 Seed starter permissions, roles, and module keys
Type: backend
Priority: P0
Labels:
- priority:P0
- type:backend
- type:security
- domain:tenancy

Acceptance criteria:
- starter permission registry exists
- starter roles seeded
- starter role-permission mappings seeded
- starter module keys seeded
- seed process can be rerun safely

Dependencies:
- WF-004
- WF-006

## WF-011 Build tenant membership and scope helper SQL functions
Type: backend
Priority: P0
Labels:
- priority:P0
- type:backend
- type:security
- domain:tenancy

Acceptance criteria:
- helper function checks active tenant membership
- helper function checks entity scope
- helper function checks module entitlement
- functions usable inside RLS policies

Dependencies:
- WF-003
- WF-005
- WF-006

## WF-012 Apply initial RLS policies for foundation tables
Type: security
Priority: P0
Labels:
- priority:P0
- type:security
- domain:tenancy

Acceptance criteria:
- RLS enabled on tenant-owned foundation tables
- cross-tenant select blocked in tests
- in-scope select allowed in tests
- unauthorized updates blocked in tests

Dependencies:
- WF-011

## WF-013 Build audit logging utility for server actions
Type: backend
Priority: P0
Labels:
- priority:P0
- type:backend
- type:security
- domain:gl

Acceptance criteria:
- utility writes actor, tenant, entity, module, action, target, occurred_at
- utility supports metadata payload
- utility used by test action at least once

Dependencies:
- WF-007

## WF-014 Create tenant bootstrap server action spec
Type: backend
Priority: P1
Labels:
- priority:P1
- type:backend
- domain:tenancy

Acceptance criteria:
- server action contract defined
- creates tenant, first entity, owner membership
- seeds starter module entitlements
- seeds starter finance settings

Dependencies:
- WF-001
- WF-003
- WF-006
- WF-010

## WF-015 Create account management server action spec
Type: backend
Priority: P1
Labels:
- priority:P1
- type:backend
- domain:gl

Acceptance criteria:
- create account action defined
- update account action defined
- archive account action defined
- permission checks documented
- audit logging hook documented

Dependencies:
- WF-008
- WF-013

## WF-016 Create fiscal period server action spec
Type: backend
Priority: P1
Labels:
- priority:P1
- type:backend
- domain:gl

Acceptance criteria:
- create fiscal period action defined
- close period action defined
- reopen period action defined
- permission and audit requirements documented

Dependencies:
- WF-009
- WF-013

## WF-017 Build foundation admin setup screens
Type: frontend
Priority: P1
Labels:
- priority:P1
- type:frontend
- domain:tenancy

Acceptance criteria:
- tenant summary view exists
- entity list view exists
- roles and module entitlement admin screens stubbed
- accounts setup screen stubbed
- fiscal periods setup screen stubbed

Dependencies:
- WF-014
- WF-015
- WF-016

## WF-018 Write foundation test plan
Type: qa
Priority: P0
Labels:
- priority:P0
- type:qa
- domain:tenancy

Acceptance criteria:
- schema validation tests listed
- RLS test matrix listed
- seed validation tests listed
- audit logging tests listed
- happy path and failure path coverage listed

Dependencies:
- WF-012
- WF-013

## 3. Recommended Implementation Sequence

1. WF-001
2. WF-002
3. WF-003
4. WF-004
5. WF-005
6. WF-006
7. WF-007
8. WF-008
9. WF-009
10. WF-010
11. WF-011
12. WF-012
13. WF-013
14. WF-018
15. WF-014
16. WF-015
17. WF-016
18. WF-017
