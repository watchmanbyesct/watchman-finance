-- Watchman Finance Migration Pack 005 Leave and Accrual Management v1
-- Target: Supabase Postgres
-- Depends on: Pack 001 Foundation, Pack 002 Integration Staging, Pack 004 Payroll Core

-- ------------------------------------------------------------------
-- Leave policy reference
-- ------------------------------------------------------------------
create table if not exists public.leave_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  leave_code text not null,
  leave_name text not null,
  leave_category text not null check (leave_category in (
    'sick', 'vacation', 'personal', 'pto', 'holiday', 'bereavement',
    'jury_duty', 'administrative', 'training', 'unpaid', 'other'
  )),
  is_paid boolean not null default true,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Tenant-wide vs per-entity leave codes (replaces expression-based UNIQUE, which Postgres rejects on CREATE TABLE)
create unique index if not exists leave_types_code_tenant_wide_uk
  on public.leave_types (tenant_id, leave_code) where entity_id is null;
create unique index if not exists leave_types_code_entity_uk
  on public.leave_types (tenant_id, entity_id, leave_code) where entity_id is not null;

create table if not exists public.leave_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  policy_code text not null,
  policy_name text not null,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict,
  accrual_method text not null default 'hours_worked' check (accrual_method in (
    'hours_worked', 'per_pay_period', 'monthly', 'anniversary', 'fixed_annual', 'front_loaded'
  )),
  accrual_rate numeric(14,6),
  annual_grant_hours numeric(10,2),
  max_balance_hours numeric(10,2),
  carryover_hours numeric(10,2),
  waiting_period_days integer not null default 0,
  allows_negative_balance boolean not null default false,
  minimum_increment_hours numeric(10,2) not null default 1.00,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint leave_policies_code_uk unique (entity_id, policy_code)
);

create table if not exists public.leave_policy_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  leave_policy_id uuid not null references public.leave_policies(id) on delete cascade,
  finance_person_id uuid not null references public.finance_people(id) on delete cascade,
  assignment_status text not null default 'active' check (assignment_status in ('active', 'inactive')),
  effective_start_date date not null,
  effective_end_date date,
  assigned_at timestamptz not null default timezone('utc', now()),
  assigned_by uuid references public.platform_users(id) on delete set null,
  constraint leave_policy_assignments_person_policy_range_uk unique (finance_person_id, leave_policy_id, effective_start_date)
);

create table if not exists public.leave_accrual_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  leave_policy_id uuid not null references public.leave_policies(id) on delete cascade,
  rule_name text not null,
  rule_type text not null default 'base' check (rule_type in ('base', 'tenure', 'override')),
  service_years_min integer,
  service_years_max integer,
  accrual_rate numeric(14,6),
  annual_grant_hours numeric(10,2),
  max_balance_hours numeric(10,2),
  carryover_hours numeric(10,2),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ------------------------------------------------------------------
-- Leave profile and balance tracking
-- ------------------------------------------------------------------
create table if not exists public.employee_leave_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  finance_person_id uuid not null references public.finance_people(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict,
  current_balance_hours numeric(12,2) not null default 0,
  available_balance_hours numeric(12,2) not null default 0,
  pending_balance_hours numeric(12,2) not null default 0,
  ytd_used_hours numeric(12,2) not null default 0,
  last_accrual_at timestamptz,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint employee_leave_profiles_person_type_uk unique (finance_person_id, leave_type_id)
);

create table if not exists public.leave_balance_ledgers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  employee_leave_profile_id uuid not null references public.employee_leave_profiles(id) on delete cascade,
  finance_person_id uuid not null references public.finance_people(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict,
  entry_type text not null check (entry_type in ('accrual', 'usage', 'adjustment', 'carryover', 'grant', 'reversal')),
  entry_date date not null,
  hours_delta numeric(12,2) not null,
  balance_after_hours numeric(12,2),
  source_type text,
  source_table text,
  source_record_id text,
  notes text,
  created_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leave_adjustments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  finance_person_id uuid not null references public.finance_people(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict,
  adjustment_status text not null default 'draft' check (adjustment_status in ('draft', 'approved', 'posted', 'void')),
  hours_delta numeric(12,2) not null,
  reason text not null,
  effective_date date not null,
  created_by uuid references public.platform_users(id) on delete set null,
  approved_by uuid references public.platform_users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ------------------------------------------------------------------
-- Leave request workflow
-- ------------------------------------------------------------------
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  finance_person_id uuid not null references public.finance_people(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict,
  request_status text not null default 'draft' check (request_status in (
    'draft', 'submitted', 'approved', 'rejected', 'cancelled', 'posted'
  )),
  request_start_date date not null,
  request_end_date date not null,
  total_requested_hours numeric(12,2) not null default 0,
  total_approved_hours numeric(12,2) not null default 0,
  employee_notes text,
  manager_notes text,
  submitted_at timestamptz,
  created_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint leave_requests_date_order_ck check (request_start_date <= request_end_date)
);

create table if not exists public.leave_request_days (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  leave_request_id uuid not null references public.leave_requests(id) on delete cascade,
  request_date date not null,
  requested_hours numeric(12,2) not null default 0,
  approved_hours numeric(12,2) not null default 0,
  day_status text not null default 'requested' check (day_status in ('requested', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  constraint leave_request_days_request_date_uk unique (leave_request_id, request_date)
);

create table if not exists public.leave_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  leave_request_id uuid not null references public.leave_requests(id) on delete cascade,
  approval_step text not null,
  approval_status text not null check (approval_status in ('approved', 'rejected')),
  approver_platform_user_id uuid references public.platform_users(id) on delete set null,
  approval_notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.holiday_calendars (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete cascade,
  holiday_name text not null,
  holiday_date date not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists holiday_calendars_uk_tenant_wide
  on public.holiday_calendars (tenant_id, holiday_date, holiday_name) where entity_id is null;
create unique index if not exists holiday_calendars_uk_entity
  on public.holiday_calendars (tenant_id, entity_id, holiday_date, holiday_name) where entity_id is not null;

create table if not exists public.leave_liability_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  snapshot_date date not null,
  finance_person_id uuid references public.finance_people(id) on delete set null,
  leave_type_id uuid references public.leave_types(id) on delete set null,
  balance_hours numeric(12,2) not null default 0,
  liability_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------
create index if not exists leave_types_tenant_idx on public.leave_types (tenant_id);
create index if not exists leave_policies_tenant_idx on public.leave_policies (tenant_id);
create index if not exists leave_policy_assignments_tenant_idx on public.leave_policy_assignments (tenant_id);
create index if not exists employee_leave_profiles_tenant_idx on public.employee_leave_profiles (tenant_id);
create index if not exists leave_balance_ledgers_tenant_idx on public.leave_balance_ledgers (tenant_id);
create index if not exists leave_requests_tenant_idx on public.leave_requests (tenant_id);
create index if not exists leave_requests_status_idx on public.leave_requests (request_status);
create index if not exists leave_request_days_request_idx on public.leave_request_days (leave_request_id);
create index if not exists leave_approvals_tenant_idx on public.leave_approvals (tenant_id);
create index if not exists holiday_calendars_tenant_idx on public.holiday_calendars (tenant_id);
create index if not exists leave_liability_snapshots_tenant_idx on public.leave_liability_snapshots (tenant_id);

-- ------------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------------
drop trigger if exists set_updated_at_leave_types on public.leave_types;
create trigger set_updated_at_leave_types before update on public.leave_types
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_leave_policies on public.leave_policies;
create trigger set_updated_at_leave_policies before update on public.leave_policies
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_leave_accrual_rules on public.leave_accrual_rules;
create trigger set_updated_at_leave_accrual_rules before update on public.leave_accrual_rules
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_employee_leave_profiles on public.employee_leave_profiles;
create trigger set_updated_at_employee_leave_profiles before update on public.employee_leave_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_leave_adjustments on public.leave_adjustments;
create trigger set_updated_at_leave_adjustments before update on public.leave_adjustments
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_leave_requests on public.leave_requests;
create trigger set_updated_at_leave_requests before update on public.leave_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_holiday_calendars on public.holiday_calendars;
create trigger set_updated_at_holiday_calendars before update on public.holiday_calendars
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Enable RLS
-- ------------------------------------------------------------------
alter table public.leave_types enable row level security;
alter table public.leave_policies enable row level security;
alter table public.leave_policy_assignments enable row level security;
alter table public.leave_accrual_rules enable row level security;
alter table public.employee_leave_profiles enable row level security;
alter table public.leave_balance_ledgers enable row level security;
alter table public.leave_adjustments enable row level security;
alter table public.leave_requests enable row level security;
alter table public.leave_request_days enable row level security;
alter table public.leave_approvals enable row level security;
alter table public.holiday_calendars enable row level security;
alter table public.leave_liability_snapshots enable row level security;

drop policy if exists leave_types_select on public.leave_types;
create policy leave_types_select on public.leave_types
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

drop policy if exists leave_policies_select on public.leave_policies;
create policy leave_policies_select on public.leave_policies
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists leave_policy_assignments_select on public.leave_policy_assignments;
create policy leave_policy_assignments_select on public.leave_policy_assignments
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists leave_accrual_rules_select on public.leave_accrual_rules;
create policy leave_accrual_rules_select on public.leave_accrual_rules
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists employee_leave_profiles_select on public.employee_leave_profiles;
create policy employee_leave_profiles_select on public.employee_leave_profiles
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists leave_balance_ledgers_select on public.leave_balance_ledgers;
create policy leave_balance_ledgers_select on public.leave_balance_ledgers
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists leave_adjustments_select on public.leave_adjustments;
create policy leave_adjustments_select on public.leave_adjustments
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists leave_requests_select on public.leave_requests;
create policy leave_requests_select on public.leave_requests
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists leave_request_days_select on public.leave_request_days;
create policy leave_request_days_select on public.leave_request_days
for select to authenticated
using (
  exists (
    select 1
    from public.leave_requests lr
    where lr.id = leave_request_id
      and public.has_active_tenant_membership(lr.tenant_id)
      and public.has_entity_scope(lr.tenant_id, lr.entity_id)
  )
);

drop policy if exists leave_approvals_select on public.leave_approvals;
create policy leave_approvals_select on public.leave_approvals
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists holiday_calendars_select on public.holiday_calendars;
create policy holiday_calendars_select on public.holiday_calendars
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

drop policy if exists leave_liability_snapshots_select on public.leave_liability_snapshots;
create policy leave_liability_snapshots_select on public.leave_liability_snapshots
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

-- No client-side mutation policies for leave control tables.
