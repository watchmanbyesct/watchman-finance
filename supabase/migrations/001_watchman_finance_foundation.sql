-- Watchman Finance — Migration Pack 001 Foundation
-- Target: Supabase Postgres
-- Safe to re-run on empty DB (IF NOT EXISTS). If you already applied Pack 001
-- manually, this file documents the canonical schema for new environments.

-- ── Core tenancy ─────────────────────────────────────────────────────────────
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  legal_name text not null,
  display_name text not null,
  status text not null default 'active',
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  legal_name text not null,
  display_name text not null,
  entity_type text not null default 'operating_company',
  tax_identifier_last4 text,
  base_currency text not null default 'USD',
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint entities_tenant_code_uk unique (tenant_id, code)
);

create table if not exists public.platform_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  email text not null,
  full_name text not null,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  platform_user_id uuid not null references public.platform_users(id) on delete cascade,
  membership_status text not null default 'active',
  default_entity_id uuid references public.entities(id) on delete set null,
  joined_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenant_memberships_tenant_user_uk unique (tenant_id, platform_user_id)
);

-- ── Roles & permissions ─────────────────────────────────────────────────────
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_system boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint roles_tenant_code_uk unique (tenant_id, code)
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint role_permissions_uk unique (role_id, permission_id)
);

create table if not exists public.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  platform_user_id uuid not null references public.platform_users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_role_assignments_uk unique (tenant_id, platform_user_id, role_id)
);

create table if not exists public.user_entity_scopes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  platform_user_id uuid not null references public.platform_users(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint user_entity_scopes_uk unique (tenant_id, platform_user_id, entity_id)
);

create table if not exists public.tenant_module_entitlements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_key text not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenant_module_entitlements_uk unique (tenant_id, module_key)
);

-- ── Chart of accounts & periods ─────────────────────────────────────────────
create table if not exists public.account_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  category_type text not null,
  normal_balance text not null,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint account_categories_tenant_code_uk unique (tenant_id, code)
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  account_category_id uuid not null references public.account_categories(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  parent_account_id uuid references public.accounts(id) on delete set null,
  account_type text not null,
  normal_balance text not null,
  allow_posting boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint accounts_entity_code_uk unique (entity_id, code)
);

create table if not exists public.fiscal_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  period_name text not null,
  start_date date not null,
  end_date date not null,
  fiscal_year integer not null,
  fiscal_month integer,
  status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint fiscal_periods_entity_range_uk unique (entity_id, start_date, end_date)
);

create table if not exists public.fiscal_period_closures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  fiscal_period_id uuid not null references public.fiscal_periods(id) on delete cascade,
  closure_type text not null default 'soft',
  status text not null default 'closed',
  closed_at timestamptz,
  closed_by uuid references public.platform_users(id) on delete set null,
  reopened_at timestamptz,
  reopened_by uuid references public.platform_users(id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ── Audit ────────────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  entity_id uuid references public.entities(id) on delete set null,
  actor_platform_user_id uuid references public.platform_users(id) on delete set null,
  module_key text not null,
  action_code text not null,
  target_table text not null,
  target_record_id uuid,
  old_values_json jsonb,
  new_values_json jsonb,
  metadata_json jsonb,
  source_channel text not null default 'server_action',
  occurred_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_tenant_idx on public.audit_logs (tenant_id);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_id);
create index if not exists audit_logs_occurred_idx on public.audit_logs (occurred_at desc);

-- ── Row Level Security (read paths for authenticated app users) ─────────────
alter table public.platform_users enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.user_entity_scopes enable row level security;
alter table public.user_role_assignments enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.permissions enable row level security;
alter table public.tenant_module_entitlements enable row level security;
alter table public.entities enable row level security;
alter table public.tenants enable row level security;
alter table public.account_categories enable row level security;
alter table public.accounts enable row level security;
alter table public.fiscal_periods enable row level security;

drop policy if exists platform_users_self_read on public.platform_users;
create policy platform_users_self_read
  on public.platform_users for select
  using (auth.uid() = auth_user_id);

drop policy if exists tenant_memberships_member_read on public.tenant_memberships;
create policy tenant_memberships_member_read
  on public.tenant_memberships for select
  using (
    platform_user_id in (
      select id from public.platform_users where auth_user_id = auth.uid()
    )
  );

drop policy if exists user_entity_scopes_member_read on public.user_entity_scopes;
create policy user_entity_scopes_member_read
  on public.user_entity_scopes for select
  using (
    platform_user_id in (
      select id from public.platform_users where auth_user_id = auth.uid()
    )
  );

drop policy if exists user_role_assignments_member_read on public.user_role_assignments;
create policy user_role_assignments_member_read
  on public.user_role_assignments for select
  using (
    platform_user_id in (
      select id from public.platform_users where auth_user_id = auth.uid()
    )
  );

drop policy if exists roles_tenant_member_read on public.roles;
create policy roles_tenant_member_read
  on public.roles for select
  using (
    tenant_id is null
    or tenant_id in (
      select tm.tenant_id from public.tenant_memberships tm
      join public.platform_users pu on pu.id = tm.platform_user_id
      where pu.auth_user_id = auth.uid() and tm.membership_status = 'active'
    )
  );

drop policy if exists role_permissions_member_read on public.role_permissions;
create policy role_permissions_member_read
  on public.role_permissions for select
  using (
    role_id in (select id from public.roles)
  );

drop policy if exists permissions_catalog_read on public.permissions;
create policy permissions_catalog_read
  on public.permissions for select
  to authenticated
  using (true);

drop policy if exists tenant_module_entitlements_member_read on public.tenant_module_entitlements;
create policy tenant_module_entitlements_member_read
  on public.tenant_module_entitlements for select
  using (
    tenant_id in (
      select tm.tenant_id from public.tenant_memberships tm
      join public.platform_users pu on pu.id = tm.platform_user_id
      where pu.auth_user_id = auth.uid() and tm.membership_status = 'active'
    )
  );

drop policy if exists entities_member_read on public.entities;
create policy entities_member_read
  on public.entities for select
  using (
    tenant_id in (
      select tm.tenant_id from public.tenant_memberships tm
      join public.platform_users pu on pu.id = tm.platform_user_id
      where pu.auth_user_id = auth.uid() and tm.membership_status = 'active'
    )
  );

drop policy if exists tenants_member_read on public.tenants;
create policy tenants_member_read
  on public.tenants for select
  using (
    id in (
      select tm.tenant_id from public.tenant_memberships tm
      join public.platform_users pu on pu.id = tm.platform_user_id
      where pu.auth_user_id = auth.uid() and tm.membership_status = 'active'
    )
  );

drop policy if exists account_categories_member_read on public.account_categories;
create policy account_categories_member_read
  on public.account_categories for select
  using (
    tenant_id in (
      select tm.tenant_id from public.tenant_memberships tm
      join public.platform_users pu on pu.id = tm.platform_user_id
      where pu.auth_user_id = auth.uid() and tm.membership_status = 'active'
    )
  );

drop policy if exists accounts_member_read on public.accounts;
create policy accounts_member_read
  on public.accounts for select
  using (
    tenant_id in (
      select tm.tenant_id from public.tenant_memberships tm
      join public.platform_users pu on pu.id = tm.platform_user_id
      where pu.auth_user_id = auth.uid() and tm.membership_status = 'active'
    )
  );

drop policy if exists fiscal_periods_member_read on public.fiscal_periods;
create policy fiscal_periods_member_read
  on public.fiscal_periods for select
  using (
    tenant_id in (
      select tm.tenant_id from public.tenant_memberships tm
      join public.platform_users pu on pu.id = tm.platform_user_id
      where pu.auth_user_id = auth.uid() and tm.membership_status = 'active'
    )
  );
