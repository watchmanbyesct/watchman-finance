-- Watchman Finance Migration Pack 014 — Tax statutory shells, AR statements/collections, AP recurring
-- Target: Supabase Postgres
-- Depends on: Packs 001 through 013

-- ------------------------------------------------------------------
-- Tax & statutory (Workstream E style shells)
-- ------------------------------------------------------------------
create table if not exists public.tax_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  jurisdiction_code text not null,
  jurisdiction_name text not null,
  country_code text not null default 'US',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tax_jurisdictions_tenant_code_uk unique (tenant_id, jurisdiction_code)
);

create table if not exists public.tax_employer_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  tax_jurisdiction_id uuid not null references public.tax_jurisdictions(id) on delete restrict,
  registration_reference text,
  profile_status text not null default 'draft' check (profile_status in ('draft', 'active', 'inactive')),
  effective_date date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tax_employer_profiles_entity_jurisdiction_uk unique (entity_id, tax_jurisdiction_id)
);

create table if not exists public.tax_liabilities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  tax_jurisdiction_id uuid references public.tax_jurisdictions(id) on delete set null,
  liability_code text not null,
  description text,
  amount numeric(14,2) not null default 0,
  as_of_date date not null,
  liability_status text not null default 'open' check (liability_status in ('open', 'accrued', 'paid', 'reversed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tax_filing_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  tax_jurisdiction_id uuid not null references public.tax_jurisdictions(id) on delete restrict,
  period_code text not null,
  period_start date not null,
  period_end date not null,
  filing_due_date date,
  filing_status text not null default 'open' check (filing_status in ('open', 'in_progress', 'filed', 'overdue')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tax_filing_periods_entity_code_uk unique (entity_id, period_code)
);

create table if not exists public.tax_compliance_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  task_code text not null,
  task_name text not null,
  task_status text not null default 'open' check (task_status in ('open', 'in_progress', 'completed', 'blocked')),
  due_date date,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tax_compliance_tasks_entity_code_uk unique (entity_id, task_code)
);

create table if not exists public.direct_deposit_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  payroll_run_id uuid references public.payroll_runs(id) on delete set null,
  batch_status text not null default 'draft' check (batch_status in ('draft', 'submitted', 'accepted', 'rejected', 'void')),
  notes text,
  created_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.direct_deposit_batch_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  direct_deposit_batch_id uuid not null references public.direct_deposit_batches(id) on delete cascade,
  employee_pay_profile_id uuid not null references public.employee_pay_profiles(id) on delete restrict,
  amount numeric(14,2) not null,
  trace_reference text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint direct_deposit_batch_items_uk unique (direct_deposit_batch_id, employee_pay_profile_id)
);

-- ------------------------------------------------------------------
-- AR: statements & collections (§6.3 shells)
-- ------------------------------------------------------------------
create table if not exists public.ar_statement_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  statement_through_date date not null,
  output_format text not null default 'summary' check (output_format in ('summary', 'pdf', 'csv')),
  run_status text not null default 'requested' check (run_status in ('requested', 'generated', 'failed')),
  result_json jsonb not null default '{}'::jsonb,
  created_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ar_collection_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  case_code text not null,
  subject text not null,
  task_status text not null default 'open' check (task_status in ('open', 'in_progress', 'completed', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  notes text,
  assigned_to uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ar_collection_tasks_entity_case_uk unique (entity_id, case_code)
);

-- ------------------------------------------------------------------
-- AP: recurring vendor charges (§6.4 shell)
-- ------------------------------------------------------------------
create table if not exists public.ap_recurring_vendor_charges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  charge_code text not null,
  description text,
  amount_estimate numeric(14,2) not null default 0,
  cadence text not null default 'monthly' check (cadence in ('weekly', 'biweekly', 'monthly', 'quarterly', 'annual', 'other')),
  next_expected_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ap_recurring_vendor_charges_entity_code_uk unique (entity_id, charge_code)
);

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------
create index if not exists tax_jurisdictions_tenant_idx on public.tax_jurisdictions (tenant_id);
create index if not exists tax_employer_profiles_tenant_idx on public.tax_employer_profiles (tenant_id);
create index if not exists tax_liabilities_tenant_idx on public.tax_liabilities (tenant_id);
create index if not exists tax_filing_periods_tenant_idx on public.tax_filing_periods (tenant_id);
create index if not exists tax_compliance_tasks_tenant_idx on public.tax_compliance_tasks (tenant_id);
create index if not exists direct_deposit_batches_tenant_idx on public.direct_deposit_batches (tenant_id);
create index if not exists direct_deposit_batch_items_tenant_idx on public.direct_deposit_batch_items (tenant_id);
create index if not exists ar_statement_runs_tenant_idx on public.ar_statement_runs (tenant_id);
create index if not exists ar_collection_tasks_tenant_idx on public.ar_collection_tasks (tenant_id);
create index if not exists ap_recurring_vendor_charges_tenant_idx on public.ap_recurring_vendor_charges (tenant_id);

-- ------------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------------
drop trigger if exists set_updated_at_tax_jurisdictions on public.tax_jurisdictions;
create trigger set_updated_at_tax_jurisdictions before update on public.tax_jurisdictions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_tax_employer_profiles on public.tax_employer_profiles;
create trigger set_updated_at_tax_employer_profiles before update on public.tax_employer_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_tax_liabilities on public.tax_liabilities;
create trigger set_updated_at_tax_liabilities before update on public.tax_liabilities
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_tax_filing_periods on public.tax_filing_periods;
create trigger set_updated_at_tax_filing_periods before update on public.tax_filing_periods
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_tax_compliance_tasks on public.tax_compliance_tasks;
create trigger set_updated_at_tax_compliance_tasks before update on public.tax_compliance_tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_direct_deposit_batches on public.direct_deposit_batches;
create trigger set_updated_at_direct_deposit_batches before update on public.direct_deposit_batches
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_ar_statement_runs on public.ar_statement_runs;
create trigger set_updated_at_ar_statement_runs before update on public.ar_statement_runs
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_ar_collection_tasks on public.ar_collection_tasks;
create trigger set_updated_at_ar_collection_tasks before update on public.ar_collection_tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_ap_recurring_vendor_charges on public.ap_recurring_vendor_charges;
create trigger set_updated_at_ap_recurring_vendor_charges before update on public.ap_recurring_vendor_charges
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- RLS (authenticated read; mutations via service role / server actions)
-- ------------------------------------------------------------------
alter table public.tax_jurisdictions enable row level security;
alter table public.tax_employer_profiles enable row level security;
alter table public.tax_liabilities enable row level security;
alter table public.tax_filing_periods enable row level security;
alter table public.tax_compliance_tasks enable row level security;
alter table public.direct_deposit_batches enable row level security;
alter table public.direct_deposit_batch_items enable row level security;
alter table public.ar_statement_runs enable row level security;
alter table public.ar_collection_tasks enable row level security;
alter table public.ap_recurring_vendor_charges enable row level security;

drop policy if exists tax_jurisdictions_select on public.tax_jurisdictions;
create policy tax_jurisdictions_select on public.tax_jurisdictions
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists tax_employer_profiles_select on public.tax_employer_profiles;
create policy tax_employer_profiles_select on public.tax_employer_profiles
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

drop policy if exists tax_liabilities_select on public.tax_liabilities;
create policy tax_liabilities_select on public.tax_liabilities
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

drop policy if exists tax_filing_periods_select on public.tax_filing_periods;
create policy tax_filing_periods_select on public.tax_filing_periods
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

drop policy if exists tax_compliance_tasks_select on public.tax_compliance_tasks;
create policy tax_compliance_tasks_select on public.tax_compliance_tasks
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

drop policy if exists direct_deposit_batches_select on public.direct_deposit_batches;
create policy direct_deposit_batches_select on public.direct_deposit_batches
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

drop policy if exists direct_deposit_batch_items_select on public.direct_deposit_batch_items;
create policy direct_deposit_batch_items_select on public.direct_deposit_batch_items
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and exists (
    select 1 from public.direct_deposit_batches b
    where b.id = direct_deposit_batch_id
      and public.has_active_tenant_membership(b.tenant_id)
      and public.has_entity_scope(b.tenant_id, b.entity_id)
  )
);

drop policy if exists ar_statement_runs_select on public.ar_statement_runs;
create policy ar_statement_runs_select on public.ar_statement_runs
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

drop policy if exists ar_collection_tasks_select on public.ar_collection_tasks;
create policy ar_collection_tasks_select on public.ar_collection_tasks
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

drop policy if exists ap_recurring_vendor_charges_select on public.ap_recurring_vendor_charges;
create policy ap_recurring_vendor_charges_select on public.ap_recurring_vendor_charges
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

-- No client-side mutation policies (server actions use service role).
