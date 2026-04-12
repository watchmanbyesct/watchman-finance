-- Watchman Finance Migration Pack 010 Budgeting and Forecasting v1
-- Target: Supabase Postgres
-- Depends on: Packs 001 through 009

-- ------------------------------------------------------------------
-- Budgeting
-- ------------------------------------------------------------------
create table if not exists public.budget_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  budget_code text not null,
  budget_name text not null,
  fiscal_year integer not null,
  budget_status text not null default 'draft' check (budget_status in ('draft', 'submitted', 'approved', 'locked', 'archived')),
  version_number integer not null default 1,
  notes text,
  created_by uuid references public.platform_users(id) on delete set null,
  submitted_by uuid references public.platform_users(id) on delete set null,
  submitted_at timestamptz,
  approved_by uuid references public.platform_users(id) on delete set null,
  approved_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint budget_versions_uk unique (entity_id, budget_code, version_number)
);

create table if not exists public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  budget_version_id uuid not null references public.budget_versions(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  cost_center_id uuid references public.cost_centers(id) on delete set null,
  line_month integer not null check (line_month between 1 and 12),
  amount numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists budget_lines_uk on public.budget_lines (
  budget_version_id,
  coalesce(account_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(cost_center_id, '00000000-0000-0000-0000-000000000000'::uuid),
  line_month
);

create table if not exists public.budget_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  budget_version_id uuid not null references public.budget_versions(id) on delete cascade,
  approval_step text not null,
  approval_status text not null check (approval_status in ('approved', 'rejected')),
  approver_platform_user_id uuid references public.platform_users(id) on delete set null,
  approval_notes text,
  created_at timestamptz not null default timezone('utc', now())
);

-- ------------------------------------------------------------------
-- Forecasting
-- ------------------------------------------------------------------
create table if not exists public.forecast_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  forecast_code text not null,
  forecast_name text not null,
  fiscal_year integer not null,
  forecast_status text not null default 'draft' check (forecast_status in ('draft', 'submitted', 'approved', 'locked', 'archived')),
  version_number integer not null default 1,
  basis_type text not null default 'manual' check (basis_type in ('manual', 'budget_based', 'trend_based', 'scenario_based')),
  notes text,
  created_by uuid references public.platform_users(id) on delete set null,
  submitted_by uuid references public.platform_users(id) on delete set null,
  submitted_at timestamptz,
  approved_by uuid references public.platform_users(id) on delete set null,
  approved_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint forecast_versions_uk unique (entity_id, forecast_code, version_number)
);

create table if not exists public.forecast_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  forecast_version_id uuid not null references public.forecast_versions(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  cost_center_id uuid references public.cost_centers(id) on delete set null,
  line_month integer not null check (line_month between 1 and 12),
  amount numeric(14,2) not null default 0,
  driver_type text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists forecast_lines_uk on public.forecast_lines (
  forecast_version_id,
  coalesce(account_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(cost_center_id, '00000000-0000-0000-0000-000000000000'::uuid),
  line_month
);

create table if not exists public.scenario_inputs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  forecast_version_id uuid references public.forecast_versions(id) on delete cascade,
  scenario_code text not null,
  scenario_name text not null,
  driver_category text not null check (driver_category in (
    'revenue', 'labor', 'payroll', 'contract', 'cash', 'inventory', 'other'
  )),
  input_key text not null,
  input_value_numeric numeric(18,4),
  input_value_text text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists scenario_inputs_uk on public.scenario_inputs (
  tenant_id,
  coalesce(entity_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(forecast_version_id, '00000000-0000-0000-0000-000000000000'::uuid),
  scenario_code,
  input_key
);

create table if not exists public.variance_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  snapshot_date date not null,
  comparison_type text not null check (comparison_type in ('budget_vs_actual', 'forecast_vs_actual', 'budget_vs_forecast')),
  budget_version_id uuid references public.budget_versions(id) on delete set null,
  forecast_version_id uuid references public.forecast_versions(id) on delete set null,
  snapshot_json jsonb not null default '{}'::jsonb,
  generated_by uuid references public.platform_users(id) on delete set null,
  generated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists variance_snapshots_uk on public.variance_snapshots (
  tenant_id,
  entity_id,
  snapshot_date,
  comparison_type,
  coalesce(budget_version_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(forecast_version_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- ------------------------------------------------------------------
-- Planning support views
-- ------------------------------------------------------------------
create or replace view public.v_budget_line_summary as
select
  bl.tenant_id,
  bl.entity_id,
  bl.budget_version_id,
  bl.account_id,
  bl.department_id,
  bl.cost_center_id,
  bl.line_month,
  sum(bl.amount) as budget_amount
from public.budget_lines bl
group by
  bl.tenant_id, bl.entity_id, bl.budget_version_id, bl.account_id, bl.department_id, bl.cost_center_id, bl.line_month;

create or replace view public.v_forecast_line_summary as
select
  fl.tenant_id,
  fl.entity_id,
  fl.forecast_version_id,
  fl.account_id,
  fl.department_id,
  fl.cost_center_id,
  fl.line_month,
  sum(fl.amount) as forecast_amount
from public.forecast_lines fl
group by
  fl.tenant_id, fl.entity_id, fl.forecast_version_id, fl.account_id, fl.department_id, fl.cost_center_id, fl.line_month;

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------
create index if not exists budget_versions_tenant_idx on public.budget_versions (tenant_id);
create index if not exists budget_lines_tenant_idx on public.budget_lines (tenant_id);
create index if not exists budget_approvals_tenant_idx on public.budget_approvals (tenant_id);
create index if not exists forecast_versions_tenant_idx on public.forecast_versions (tenant_id);
create index if not exists forecast_lines_tenant_idx on public.forecast_lines (tenant_id);
create index if not exists scenario_inputs_tenant_idx on public.scenario_inputs (tenant_id);
create index if not exists variance_snapshots_tenant_idx on public.variance_snapshots (tenant_id);

-- ------------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------------
drop trigger if exists set_updated_at_budget_versions on public.budget_versions;
create trigger set_updated_at_budget_versions before update on public.budget_versions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_budget_lines on public.budget_lines;
create trigger set_updated_at_budget_lines before update on public.budget_lines
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_forecast_versions on public.forecast_versions;
create trigger set_updated_at_forecast_versions before update on public.forecast_versions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_forecast_lines on public.forecast_lines;
create trigger set_updated_at_forecast_lines before update on public.forecast_lines
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_scenario_inputs on public.scenario_inputs;
create trigger set_updated_at_scenario_inputs before update on public.scenario_inputs
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Enable RLS
-- ------------------------------------------------------------------
alter table public.budget_versions enable row level security;
alter table public.budget_lines enable row level security;
alter table public.budget_approvals enable row level security;
alter table public.forecast_versions enable row level security;
alter table public.forecast_lines enable row level security;
alter table public.scenario_inputs enable row level security;
alter table public.variance_snapshots enable row level security;

drop policy if exists budget_versions_select on public.budget_versions;
create policy budget_versions_select on public.budget_versions
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

drop policy if exists budget_lines_select on public.budget_lines;
create policy budget_lines_select on public.budget_lines
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

drop policy if exists budget_approvals_select on public.budget_approvals;
create policy budget_approvals_select on public.budget_approvals
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

drop policy if exists forecast_versions_select on public.forecast_versions;
create policy forecast_versions_select on public.forecast_versions
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

drop policy if exists forecast_lines_select on public.forecast_lines;
create policy forecast_lines_select on public.forecast_lines
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

drop policy if exists scenario_inputs_select on public.scenario_inputs;
create policy scenario_inputs_select on public.scenario_inputs
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

drop policy if exists variance_snapshots_select on public.variance_snapshots;
create policy variance_snapshots_select on public.variance_snapshots
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

-- No client-side mutation policies for planning tables.
