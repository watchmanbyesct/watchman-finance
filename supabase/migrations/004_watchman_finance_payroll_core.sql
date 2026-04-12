-- Watchman Finance Migration Pack 004 Payroll Core v1
-- Target: Supabase Postgres
-- Depends on: Pack 001 Foundation, Pack 002 Integration Staging, Pack 003 AR/AP Core

-- ------------------------------------------------------------------
-- Payroll reference and configuration
-- ------------------------------------------------------------------
create table if not exists public.pay_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  group_code text not null,
  group_name text not null,
  pay_frequency text not null check (pay_frequency in ('weekly', 'biweekly', 'semimonthly', 'monthly', 'off_cycle')),
  pay_schedule_anchor_date date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pay_groups_entity_code_uk unique (entity_id, group_code)
);

create table if not exists public.pay_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  pay_group_id uuid not null references public.pay_groups(id) on delete cascade,
  period_name text not null,
  period_start date not null,
  period_end date not null,
  pay_date date,
  approval_cutoff_at timestamptz,
  processing_date date,
  status text not null default 'open' check (status in ('open', 'processing', 'closed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pay_periods_date_order_ck check (period_start <= period_end),
  constraint pay_periods_group_range_uk unique (pay_group_id, period_start, period_end)
);

create table if not exists public.employee_pay_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  finance_person_id uuid not null references public.finance_people(id) on delete cascade,
  pay_group_id uuid references public.pay_groups(id) on delete set null,
  employee_number text,
  worker_type text not null default 'employee' check (worker_type in ('employee', 'contractor', 'other')),
  pay_type text not null default 'hourly' check (pay_type in ('hourly', 'salary')),
  base_rate numeric(14,4),
  annual_salary numeric(14,2),
  overtime_eligible boolean not null default true,
  default_regular_hours numeric(10,2),
  payroll_status text not null default 'active' check (payroll_status in ('active', 'inactive', 'hold')),
  effective_start_date date,
  effective_end_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint employee_pay_profiles_person_uk unique (finance_person_id)
);

create table if not exists public.employee_tax_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  finance_person_id uuid not null references public.finance_people(id) on delete cascade,
  tax_profile_status text not null default 'draft' check (tax_profile_status in ('draft', 'active', 'inactive')),
  federal_filing_status text,
  federal_dependents_amount numeric(14,2),
  federal_other_income numeric(14,2),
  federal_deductions numeric(14,2),
  federal_extra_withholding numeric(14,2),
  state_code text,
  state_filing_status text,
  state_extra_withholding numeric(14,2),
  effective_start_date date,
  effective_end_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint employee_tax_profiles_person_uk unique (finance_person_id)
);

create table if not exists public.employee_payment_method_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  finance_person_id uuid not null references public.finance_people(id) on delete cascade,
  request_status text not null default 'pending' check (request_status in ('pending', 'approved', 'rejected', 'superseded')),
  payment_method text not null check (payment_method in ('check', 'ach', 'other')),
  account_holder_name text,
  bank_name text,
  routing_number_last4 text,
  account_number_last4 text,
  authorization_received boolean not null default false,
  requested_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  reviewed_by uuid references public.platform_users(id) on delete set null,
  metadata_json jsonb not null default '{}'::jsonb
);

-- ------------------------------------------------------------------
-- Payroll run and input model
-- ------------------------------------------------------------------
create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  pay_group_id uuid not null references public.pay_groups(id) on delete restrict,
  pay_period_id uuid references public.pay_periods(id) on delete set null,
  run_number text not null,
  run_type text not null default 'regular' check (run_type in ('regular', 'off_cycle', 'adjustment')),
  run_status text not null default 'draft' check (run_status in ('draft', 'calculating', 'review', 'approved', 'finalized', 'reversed')),
  pay_date date,
  period_start date,
  period_end date,
  total_gross numeric(14,2) not null default 0,
  total_net numeric(14,2) not null default 0,
  total_employee_taxes numeric(14,2) not null default 0,
  total_employer_taxes numeric(14,2) not null default 0,
  total_deductions numeric(14,2) not null default 0,
  created_by uuid references public.platform_users(id) on delete set null,
  approved_by uuid references public.platform_users(id) on delete set null,
  approved_at timestamptz,
  finalized_by uuid references public.platform_users(id) on delete set null,
  finalized_at timestamptz,
  reversed_by uuid references public.platform_users(id) on delete set null,
  reversed_at timestamptz,
  reversal_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payroll_runs_entity_number_uk unique (entity_id, run_number)
);

create table if not exists public.payroll_input_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  payroll_run_id uuid references public.payroll_runs(id) on delete cascade,
  finance_person_id uuid references public.finance_people(id) on delete set null,
  source_type text not null check (source_type in ('approved_time', 'leave', 'manual_adjustment', 'other')),
  source_table text,
  source_record_id text,
  work_date date,
  hours_regular numeric(10,2) not null default 0,
  hours_overtime numeric(10,2) not null default 0,
  hours_holiday numeric(10,2) not null default 0,
  hours_unpaid numeric(10,2) not null default 0,
  amount_override numeric(14,2),
  validation_status text not null default 'pending' check (validation_status in ('pending', 'valid', 'invalid', 'consumed')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payroll_run_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  finance_person_id uuid not null references public.finance_people(id) on delete restrict,
  employee_pay_profile_id uuid references public.employee_pay_profiles(id) on delete set null,
  item_status text not null default 'calculated' check (item_status in ('calculated', 'approved', 'finalized', 'reversed')),
  regular_hours numeric(10,2) not null default 0,
  overtime_hours numeric(10,2) not null default 0,
  holiday_hours numeric(10,2) not null default 0,
  unpaid_hours numeric(10,2) not null default 0,
  gross_pay numeric(14,2) not null default 0,
  employee_taxes numeric(14,2) not null default 0,
  employer_taxes numeric(14,2) not null default 0,
  deductions_total numeric(14,2) not null default 0,
  net_pay numeric(14,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint payroll_run_items_run_person_uk unique (payroll_run_id, finance_person_id)
);

create table if not exists public.payroll_run_earnings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  payroll_run_item_id uuid not null references public.payroll_run_items(id) on delete cascade,
  earning_code text not null,
  description text not null,
  hours numeric(10,2),
  rate numeric(14,4),
  amount numeric(14,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payroll_run_deductions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  payroll_run_item_id uuid not null references public.payroll_run_items(id) on delete cascade,
  deduction_code text not null,
  description text not null,
  employee_amount numeric(14,2) not null default 0,
  employer_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pay_statements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  payroll_run_item_id uuid not null references public.payroll_run_items(id) on delete cascade,
  finance_person_id uuid not null references public.finance_people(id) on delete restrict,
  statement_status text not null default 'generated' check (statement_status in ('generated', 'published', 'reversed')),
  statement_date date,
  gross_pay numeric(14,2) not null default 0,
  net_pay numeric(14,2) not null default 0,
  ytd_gross numeric(14,2) not null default 0,
  ytd_net numeric(14,2) not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payroll_approval_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  action_code text not null,
  actor_platform_user_id uuid references public.platform_users(id) on delete set null,
  action_notes text,
  created_at timestamptz not null default timezone('utc', now())
);

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------
create index if not exists pay_groups_tenant_idx on public.pay_groups (tenant_id);
create index if not exists pay_periods_tenant_idx on public.pay_periods (tenant_id);
create index if not exists employee_pay_profiles_tenant_idx on public.employee_pay_profiles (tenant_id);
create index if not exists employee_tax_profiles_tenant_idx on public.employee_tax_profiles (tenant_id);
create index if not exists payroll_runs_tenant_idx on public.payroll_runs (tenant_id);
create index if not exists payroll_runs_entity_idx on public.payroll_runs (entity_id);
create index if not exists payroll_runs_status_idx on public.payroll_runs (run_status);
create index if not exists payroll_input_records_tenant_idx on public.payroll_input_records (tenant_id);
create index if not exists payroll_run_items_tenant_idx on public.payroll_run_items (tenant_id);
create index if not exists pay_statements_tenant_idx on public.pay_statements (tenant_id);

-- ------------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------------
drop trigger if exists set_updated_at_pay_groups on public.pay_groups;
create trigger set_updated_at_pay_groups before update on public.pay_groups
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_pay_periods on public.pay_periods;
create trigger set_updated_at_pay_periods before update on public.pay_periods
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_employee_pay_profiles on public.employee_pay_profiles;
create trigger set_updated_at_employee_pay_profiles before update on public.employee_pay_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_employee_tax_profiles on public.employee_tax_profiles;
create trigger set_updated_at_employee_tax_profiles before update on public.employee_tax_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_payroll_runs on public.payroll_runs;
create trigger set_updated_at_payroll_runs before update on public.payroll_runs
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Enable RLS
-- ------------------------------------------------------------------
alter table public.pay_groups enable row level security;
alter table public.pay_periods enable row level security;
alter table public.employee_pay_profiles enable row level security;
alter table public.employee_tax_profiles enable row level security;
alter table public.employee_payment_method_requests enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_input_records enable row level security;
alter table public.payroll_run_items enable row level security;
alter table public.payroll_run_earnings enable row level security;
alter table public.payroll_run_deductions enable row level security;
alter table public.pay_statements enable row level security;
alter table public.payroll_approval_logs enable row level security;

drop policy if exists pay_groups_select on public.pay_groups;
create policy pay_groups_select on public.pay_groups
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists pay_periods_select on public.pay_periods;
create policy pay_periods_select on public.pay_periods
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists employee_pay_profiles_select on public.employee_pay_profiles;
create policy employee_pay_profiles_select on public.employee_pay_profiles
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists employee_tax_profiles_select on public.employee_tax_profiles;
create policy employee_tax_profiles_select on public.employee_tax_profiles
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists employee_payment_method_requests_select on public.employee_payment_method_requests;
create policy employee_payment_method_requests_select on public.employee_payment_method_requests
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

drop policy if exists payroll_runs_select on public.payroll_runs;
create policy payroll_runs_select on public.payroll_runs
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists payroll_input_records_select on public.payroll_input_records;
create policy payroll_input_records_select on public.payroll_input_records
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

drop policy if exists payroll_run_items_select on public.payroll_run_items;
create policy payroll_run_items_select on public.payroll_run_items
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists payroll_run_earnings_select on public.payroll_run_earnings;
create policy payroll_run_earnings_select on public.payroll_run_earnings
for select to authenticated
using (
  exists (
    select 1
    from public.payroll_run_items pri
    where pri.id = payroll_run_item_id
      and public.has_active_tenant_membership(pri.tenant_id)
      and public.has_entity_scope(pri.tenant_id, pri.entity_id)
  )
);

drop policy if exists payroll_run_deductions_select on public.payroll_run_deductions;
create policy payroll_run_deductions_select on public.payroll_run_deductions
for select to authenticated
using (
  exists (
    select 1
    from public.payroll_run_items pri
    where pri.id = payroll_run_item_id
      and public.has_active_tenant_membership(pri.tenant_id)
      and public.has_entity_scope(pri.tenant_id, pri.entity_id)
  )
);

drop policy if exists pay_statements_select on public.pay_statements;
create policy pay_statements_select on public.pay_statements
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists payroll_approval_logs_select on public.payroll_approval_logs;
create policy payroll_approval_logs_select on public.payroll_approval_logs
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

-- No client-side mutation policies for payroll control tables.
