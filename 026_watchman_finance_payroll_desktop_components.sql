-- Watchman Finance Migration Pack 026 — Payroll desktop components
-- Target: Supabase Postgres
-- Depends on: Pack 004 Payroll Core

-- ------------------------------------------------------------------
-- Payroll item catalog (Desktop-style earnings/deductions/taxes/contributions)
-- ------------------------------------------------------------------
create table if not exists public.payroll_item_catalog (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  item_code text not null,
  item_name text not null,
  item_type text not null check (item_type in ('earning', 'deduction', 'tax', 'company_contribution', 'accrual')),
  calculation_method text not null check (calculation_method in ('flat_amount', 'hourly_rate', 'percent_of_gross', 'fixed_rate')),
  default_rate numeric(14,6),
  default_amount numeric(14,2),
  default_percent numeric(9,6),
  taxability text not null default 'taxable' check (taxability in ('taxable', 'pre_tax', 'post_tax', 'nontaxable')),
  agency_name text,
  liability_account_id uuid references public.accounts(id) on delete set null,
  expense_account_id uuid references public.accounts(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payroll_item_catalog_uk unique (entity_id, item_code)
);

create index if not exists payroll_item_catalog_tenant_idx on public.payroll_item_catalog (tenant_id);
create index if not exists payroll_item_catalog_entity_idx on public.payroll_item_catalog (entity_id);
create index if not exists payroll_item_catalog_type_idx on public.payroll_item_catalog (item_type);

drop trigger if exists set_updated_at_payroll_item_catalog on public.payroll_item_catalog;
create trigger set_updated_at_payroll_item_catalog before update on public.payroll_item_catalog
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Employee-level assignment of payroll items
-- ------------------------------------------------------------------
create table if not exists public.employee_pay_item_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  employee_pay_profile_id uuid not null references public.employee_pay_profiles(id) on delete cascade,
  payroll_item_id uuid not null references public.payroll_item_catalog(id) on delete cascade,
  assignment_status text not null default 'active' check (assignment_status in ('active', 'inactive')),
  override_rate numeric(14,6),
  override_amount numeric(14,2),
  override_percent numeric(9,6),
  effective_start_date date,
  effective_end_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint employee_pay_item_assignments_uk unique (employee_pay_profile_id, payroll_item_id)
);

create index if not exists employee_pay_item_assignments_tenant_idx on public.employee_pay_item_assignments (tenant_id);
create index if not exists employee_pay_item_assignments_profile_idx on public.employee_pay_item_assignments (employee_pay_profile_id);

drop trigger if exists set_updated_at_employee_pay_item_assignments on public.employee_pay_item_assignments;
create trigger set_updated_at_employee_pay_item_assignments before update on public.employee_pay_item_assignments
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Payroll run item breakdown components
-- ------------------------------------------------------------------
create table if not exists public.payroll_run_item_components (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  payroll_run_item_id uuid not null references public.payroll_run_items(id) on delete cascade,
  payroll_item_id uuid not null references public.payroll_item_catalog(id) on delete restrict,
  component_type text not null check (component_type in ('earning', 'deduction', 'employee_tax', 'employer_tax', 'company_contribution', 'accrual')),
  basis_amount numeric(14,2) not null default 0,
  quantity numeric(12,4),
  rate numeric(14,6),
  amount numeric(14,2) not null default 0,
  memo text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint payroll_run_item_components_uk unique (payroll_run_item_id, payroll_item_id, component_type)
);

create index if not exists payroll_run_item_components_run_idx on public.payroll_run_item_components (payroll_run_id);
create index if not exists payroll_run_item_components_item_idx on public.payroll_run_item_components (payroll_item_id);

-- ------------------------------------------------------------------
-- Liability register (by run + item + agency)
-- ------------------------------------------------------------------
create table if not exists public.payroll_tax_liabilities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  payroll_item_id uuid references public.payroll_item_catalog(id) on delete set null,
  agency_name text not null,
  liability_type text not null check (liability_type in ('employee_tax', 'employer_tax', 'deduction', 'benefit_payable')),
  amount numeric(14,2) not null default 0,
  due_date date,
  liability_status text not null default 'open' check (liability_status in ('open', 'scheduled', 'paid', 'adjusted', 'void')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists payroll_tax_liabilities_tenant_idx on public.payroll_tax_liabilities (tenant_id);
create index if not exists payroll_tax_liabilities_run_idx on public.payroll_tax_liabilities (payroll_run_id);
create index if not exists payroll_tax_liabilities_status_idx on public.payroll_tax_liabilities (liability_status);

drop trigger if exists set_updated_at_payroll_tax_liabilities on public.payroll_tax_liabilities;
create trigger set_updated_at_payroll_tax_liabilities before update on public.payroll_tax_liabilities
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- RLS (read only for authenticated app users)
-- ------------------------------------------------------------------
alter table public.payroll_item_catalog enable row level security;
alter table public.employee_pay_item_assignments enable row level security;
alter table public.payroll_run_item_components enable row level security;
alter table public.payroll_tax_liabilities enable row level security;

drop policy if exists payroll_item_catalog_select on public.payroll_item_catalog;
create policy payroll_item_catalog_select on public.payroll_item_catalog
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists employee_pay_item_assignments_select on public.employee_pay_item_assignments;
create policy employee_pay_item_assignments_select on public.employee_pay_item_assignments
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists payroll_run_item_components_select on public.payroll_run_item_components;
create policy payroll_run_item_components_select on public.payroll_run_item_components
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists payroll_tax_liabilities_select on public.payroll_tax_liabilities;
create policy payroll_tax_liabilities_select on public.payroll_tax_liabilities
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

-- No client-side mutation policies for payroll desktop extension tables.
