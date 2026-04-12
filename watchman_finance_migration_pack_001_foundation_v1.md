# Watchman Finance Migration Pack 001 Foundation v1

## 1. Purpose

This document defines the first implementation-grade migration pack for Watchman Finance.

Migration Pack 001 establishes the minimum platform and finance foundation required before building transactional modules such as AR, AP, payroll, and banking.

This pack is intentionally limited to:
- multi-tenant structure
- multi-entity structure
- memberships
- roles and permissions
- module entitlements
- finance settings
- audit foundation
- chart of accounts foundation
- fiscal periods foundation

It should be implemented before any finance-critical UI is released.

## 2. Objectives

By the end of Migration Pack 001, the platform should be able to:

1. create and identify tenants
2. create entities within tenants
3. attach users to tenants
4. assign roles and permission bundles
5. scope users to entities and organizational units
6. identify which finance modules are enabled
7. maintain basic finance settings
8. support chart of accounts setup
9. support fiscal period setup
10. record audit events for sensitive actions

## 3. Included Tables

## 3.1 Tenancy and organization
- tenants
- entities
- branches
- departments
- locations
- cost_centers
- platform_users
- tenant_memberships
- tenant_user_profiles

## 3.2 Security and access
- roles
- permissions
- role_permissions
- user_role_assignments
- user_entity_scopes
- user_branch_scopes
- user_department_scopes
- user_location_scopes
- tenant_product_entitlements
- tenant_module_entitlements
- user_module_overrides

## 3.3 Settings and audit
- tenant_settings
- entity_settings
- finance_settings
- audit_logs

## 3.4 Finance foundation
- account_categories
- accounts
- fiscal_periods
- fiscal_period_closures

## 4. Suggested Migration Order

### Migration 001A. Core tenancy
Create:
- tenants
- entities
- branches
- departments
- locations
- cost_centers

### Migration 001B. User and membership foundation
Create:
- platform_users
- tenant_memberships
- tenant_user_profiles

### Migration 001C. Roles and permissions
Create:
- roles
- permissions
- role_permissions
- user_role_assignments
- user_entity_scopes
- user_branch_scopes
- user_department_scopes
- user_location_scopes

### Migration 001D. Module entitlements
Create:
- tenant_product_entitlements
- tenant_module_entitlements
- user_module_overrides

### Migration 001E. Settings and audit
Create:
- tenant_settings
- entity_settings
- finance_settings
- audit_logs

### Migration 001F. Finance master foundation
Create:
- account_categories
- accounts
- fiscal_periods
- fiscal_period_closures

## 5. Required Columns by Table

## 5.1 tenants
Required columns:
- id uuid pk
- slug text unique
- legal_name text
- display_name text
- status text
- timezone text
- created_at timestamptz
- updated_at timestamptz

## 5.2 entities
Required columns:
- id uuid pk
- tenant_id uuid fk tenants
- code text
- legal_name text
- display_name text
- entity_type text
- tax_identifier_last4 text nullable
- base_currency text
- status text
- created_at timestamptz
- updated_at timestamptz

Unique constraint:
- unique tenant_id + code

## 5.3 branches, departments, locations, cost_centers
Each should include:
- id uuid pk
- tenant_id uuid fk
- entity_id uuid fk nullable only if intentionally cross-entity
- code text
- name text
- status text
- created_at timestamptz
- updated_at timestamptz

## 5.4 platform_users
Required columns:
- id uuid pk
- auth_user_id uuid unique
- email text
- display_name text
- status text
- created_at timestamptz
- updated_at timestamptz

## 5.5 tenant_memberships
Required columns:
- id uuid pk
- tenant_id uuid fk
- platform_user_id uuid fk
- membership_status text
- default_entity_id uuid nullable
- joined_at timestamptz
- created_at timestamptz
- updated_at timestamptz

Unique constraint:
- unique tenant_id + platform_user_id

## 5.6 tenant_user_profiles
Required columns:
- id uuid pk
- tenant_id uuid fk
- platform_user_id uuid fk
- title text nullable
- phone text nullable
- employee_reference_id text nullable
- status text
- created_at timestamptz
- updated_at timestamptz

## 5.7 roles
Required columns:
- id uuid pk
- tenant_id uuid nullable for system or tenant-specific roles
- code text
- name text
- description text nullable
- is_system_role boolean
- status text

## 5.8 permissions
Required columns:
- id uuid pk
- code text unique
- module_key text
- description text nullable
- status text

## 5.9 role_permissions
Required columns:
- id uuid pk
- role_id uuid fk
- permission_id uuid fk

Unique constraint:
- unique role_id + permission_id

## 5.10 user_role_assignments
Required columns:
- id uuid pk
- tenant_id uuid fk
- platform_user_id uuid fk
- role_id uuid fk
- assigned_at timestamptz
- assigned_by uuid nullable
- status text

## 5.11 scope tables
Each scope table should include:
- id uuid pk
- tenant_id uuid fk
- platform_user_id uuid fk
- scoped record id
- assigned_at timestamptz
- assigned_by uuid nullable
- status text

## 5.12 tenant_product_entitlements
Required columns:
- id uuid pk
- tenant_id uuid fk
- product_key text
- enabled boolean
- enabled_at timestamptz nullable

## 5.13 tenant_module_entitlements
Required columns:
- id uuid pk
- tenant_id uuid fk
- module_key text
- enabled boolean
- enabled_at timestamptz nullable

## 5.14 user_module_overrides
Required columns:
- id uuid pk
- tenant_id uuid fk
- platform_user_id uuid fk
- module_key text
- access_mode text
- created_at timestamptz

## 5.15 tenant_settings, entity_settings, finance_settings
Recommended columns:
- id uuid pk
- tenant_id uuid fk
- entity_id uuid nullable for entity_settings and finance_settings
- settings_json jsonb
- version integer
- created_at timestamptz
- updated_at timestamptz

## 5.16 audit_logs
Required columns:
- id uuid pk
- tenant_id uuid fk nullable for platform scope
- entity_id uuid nullable
- actor_platform_user_id uuid nullable
- module_key text
- action_code text
- target_table text
- target_record_id uuid nullable
- old_values_json jsonb nullable
- new_values_json jsonb nullable
- metadata_json jsonb nullable
- source_channel text
- occurred_at timestamptz

Indexes:
- tenant_id
- entity_id
- actor_platform_user_id
- occurred_at desc

## 5.17 account_categories
Required columns:
- id uuid pk
- tenant_id uuid nullable for system defaults
- code text
- name text
- category_type text
- normal_balance text
- status text

## 5.18 accounts
Required columns:
- id uuid pk
- tenant_id uuid fk
- entity_id uuid fk
- account_category_id uuid fk
- code text
- name text
- description text nullable
- parent_account_id uuid nullable
- account_type text
- normal_balance text
- allow_posting boolean
- is_active boolean
- created_at timestamptz
- updated_at timestamptz

Unique constraint:
- unique entity_id + code

## 5.19 fiscal_periods
Required columns:
- id uuid pk
- tenant_id uuid fk
- entity_id uuid fk
- period_name text
- start_date date
- end_date date
- fiscal_year integer
- fiscal_month integer nullable
- status text
- created_at timestamptz
- updated_at timestamptz

Unique constraint:
- unique entity_id + start_date + end_date

## 5.20 fiscal_period_closures
Required columns:
- id uuid pk
- tenant_id uuid fk
- entity_id uuid fk
- fiscal_period_id uuid fk
- closure_type text
- status text
- closed_at timestamptz nullable
- closed_by uuid nullable
- reopened_at timestamptz nullable
- reopened_by uuid nullable
- notes text nullable

## 6. Index Standards

At minimum, create indexes on:
- every tenant_id
- every entity_id used in finance tables
- status columns commonly filtered
- code columns used for lookups
- occurred_at on audit_logs

## 7. RLS Rollout for Pack 001

Do not enable all RLS blindly in the same migration that creates tables.

Recommended order:

### Step 1
Create tables and constraints.

### Step 2
Seed permissions, system roles, account categories.

### Step 3
Create helper SQL functions for:
- current tenant membership validation
- entity scope validation
- module entitlement validation

### Step 4
Enable RLS on:
- entities
- tenant_memberships
- role assignment tables
- accounts
- fiscal_periods
- settings tables
- audit_logs

### Step 5
Add policies for select first, then controlled update policies where required.

## 8. Seed Data Required in Pack 001

### Roles
Seed system starter roles:
- tenant_owner
- finance_admin
- controller
- bookkeeper
- payroll_admin
- billing_specialist
- executive_viewer
- inventory_manager
- employee_self_service

### Permissions
Seed starter permissions such as:
- tenant.read
- tenant.update
- entity.create
- entity.update
- gl.account.manage
- gl.period.close
- gl.period.reopen
- report.read_standard
- audit.read

### Module entitlements
Seed starter module keys:
- finance_core
- ar
- ap
- payroll
- leave
- banking
- catalog
- billing
- inventory
- reporting
- budgeting
- forecasting

### Account categories
Seed starter account categories:
- assets_current
- assets_fixed
- liabilities_current
- liabilities_long_term
- equity
- revenue
- cogs
- operating_expense
- payroll_expense
- other_income
- other_expense

## 9. Server Actions That Depend on Pack 001

Do not implement until this pack is complete:
- create tenant
- create entity
- assign role
- assign scope
- create account
- update account
- create fiscal period
- close fiscal period
- reopen fiscal period

## 10. Acceptance Criteria

Migration Pack 001 is complete when:

1. a tenant can be created
2. one or more entities can be created under the tenant
3. a user can be attached to the tenant
4. roles and permissions can be assigned
5. module entitlements can be enabled
6. an account category and account can be created
7. a fiscal period can be created
8. audit events can be recorded
9. tenant and entity queries are index-backed
10. RLS blocks cross-tenant access in tests

## 11. Build Note

Do not start invoice, payroll, inventory, or banking UI until Pack 001 is migrated, seeded, and RLS-tested.
