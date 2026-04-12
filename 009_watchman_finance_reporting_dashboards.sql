-- Watchman Finance Migration Pack 009 Reporting and Dashboard Foundation v1
-- Target: Supabase Postgres
-- Depends on: Packs 001 through 008

-- ------------------------------------------------------------------
-- Reporting definitions and snapshots
-- ------------------------------------------------------------------
create table if not exists public.report_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  report_code text not null,
  report_name text not null,
  report_category text not null check (report_category in (
    'financial_statement', 'ar', 'ap', 'payroll', 'leave', 'banking',
    'billing', 'inventory', 'executive', 'other'
  )),
  output_type text not null default 'table' check (output_type in ('table', 'snapshot', 'chart', 'kpi')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists report_definitions_tenant_wide_uk
  on public.report_definitions (tenant_id, report_code) where entity_id is null;
create unique index if not exists report_definitions_entity_uk
  on public.report_definitions (tenant_id, entity_id, report_code) where entity_id is not null;

create table if not exists public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  report_definition_id uuid not null references public.report_definitions(id) on delete cascade,
  snapshot_date date not null,
  snapshot_status text not null default 'generated' check (snapshot_status in ('generated', 'published', 'archived')),
  snapshot_json jsonb not null default '{}'::jsonb,
  generated_by uuid references public.platform_users(id) on delete set null,
  generated_at timestamptz not null default timezone('utc', now()),
  published_at timestamptz,
  constraint report_snapshots_uk unique (report_definition_id, snapshot_date)
);

create table if not exists public.dashboard_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  dashboard_code text not null,
  dashboard_name text not null,
  dashboard_category text not null check (dashboard_category in (
    'executive', 'billing', 'payroll', 'ar', 'ap', 'banking', 'inventory', 'operations_finance'
  )),
  status text not null default 'active' check (status in ('active', 'inactive')),
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists dashboard_definitions_tenant_wide_uk
  on public.dashboard_definitions (tenant_id, dashboard_code) where entity_id is null;
create unique index if not exists dashboard_definitions_entity_uk
  on public.dashboard_definitions (tenant_id, entity_id, dashboard_code) where entity_id is not null;

create table if not exists public.dashboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  dashboard_definition_id uuid not null references public.dashboard_definitions(id) on delete cascade,
  snapshot_date date not null,
  snapshot_status text not null default 'generated' check (snapshot_status in ('generated', 'published', 'archived')),
  snapshot_json jsonb not null default '{}'::jsonb,
  generated_by uuid references public.platform_users(id) on delete set null,
  generated_at timestamptz not null default timezone('utc', now()),
  published_at timestamptz,
  constraint dashboard_snapshots_uk unique (dashboard_definition_id, snapshot_date)
);

create table if not exists public.kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  kpi_code text not null,
  kpi_name text not null,
  kpi_category text not null check (kpi_category in (
    'cash', 'ar', 'ap', 'payroll', 'leave', 'billing', 'inventory', 'profitability', 'executive'
  )),
  measure_type text not null default 'currency' check (measure_type in ('currency', 'hours', 'count', 'percentage', 'other')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists kpi_definitions_tenant_wide_uk
  on public.kpi_definitions (tenant_id, kpi_code) where entity_id is null;
create unique index if not exists kpi_definitions_entity_uk
  on public.kpi_definitions (tenant_id, entity_id, kpi_code) where entity_id is not null;

create table if not exists public.kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  kpi_definition_id uuid not null references public.kpi_definitions(id) on delete cascade,
  snapshot_date date not null,
  kpi_value_numeric numeric(18,4),
  kpi_value_text text,
  generated_by uuid references public.platform_users(id) on delete set null,
  generated_at timestamptz not null default timezone('utc', now()),
  constraint kpi_snapshots_uk unique (kpi_definition_id, snapshot_date)
);

-- ------------------------------------------------------------------
-- Close management support
-- ------------------------------------------------------------------
create table if not exists public.close_checklists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  checklist_name text not null,
  close_period_start date,
  close_period_end date,
  checklist_status text not null default 'draft' check (checklist_status in ('draft', 'open', 'completed', 'archived')),
  created_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.close_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  close_checklist_id uuid not null references public.close_checklists(id) on delete cascade,
  task_code text not null,
  task_name text not null,
  task_status text not null default 'open' check (task_status in ('open', 'in_progress', 'completed', 'blocked')),
  assigned_to uuid references public.platform_users(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  completed_by uuid references public.platform_users(id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint close_tasks_uk unique (close_checklist_id, task_code)
);

-- ------------------------------------------------------------------
-- View layer for foundational reporting
-- ------------------------------------------------------------------
create or replace view public.v_ar_aging_summary as
select
  i.tenant_id,
  i.entity_id,
  i.customer_id,
  count(*) as invoice_count,
  sum(i.balance_due) as total_balance_due,
  sum(case when i.due_date is not null and i.due_date >= current_date then i.balance_due else 0 end) as current_balance,
  sum(case when i.due_date is not null and current_date - i.due_date between 1 and 30 then i.balance_due else 0 end) as past_due_1_30,
  sum(case when i.due_date is not null and current_date - i.due_date between 31 and 60 then i.balance_due else 0 end) as past_due_31_60,
  sum(case when i.due_date is not null and current_date - i.due_date between 61 and 90 then i.balance_due else 0 end) as past_due_61_90,
  sum(case when i.due_date is not null and current_date - i.due_date > 90 then i.balance_due else 0 end) as past_due_over_90
from public.invoices i
where i.invoice_status in ('issued', 'partially_paid', 'paid')
group by i.tenant_id, i.entity_id, i.customer_id;

create or replace view public.v_ap_aging_summary as
select
  b.tenant_id,
  b.entity_id,
  b.vendor_id,
  count(*) as bill_count,
  sum(b.balance_due) as total_balance_due,
  sum(case when b.due_date is not null and b.due_date >= current_date then b.balance_due else 0 end) as current_balance,
  sum(case when b.due_date is not null and current_date - b.due_date between 1 and 30 then b.balance_due else 0 end) as past_due_1_30,
  sum(case when b.due_date is not null and current_date - b.due_date between 31 and 60 then b.balance_due else 0 end) as past_due_31_60,
  sum(case when b.due_date is not null and current_date - b.due_date between 61 and 90 then b.balance_due else 0 end) as past_due_61_90,
  sum(case when b.due_date is not null and current_date - b.due_date > 90 then b.balance_due else 0 end) as past_due_over_90
from public.bills b
where b.bill_status in ('approved', 'posted', 'paid')
group by b.tenant_id, b.entity_id, b.vendor_id;

create or replace view public.v_payroll_run_summary as
select
  pr.tenant_id,
  pr.entity_id,
  pr.id as payroll_run_id,
  pr.run_number,
  pr.run_type,
  pr.run_status,
  pr.pay_date,
  pr.period_start,
  pr.period_end,
  pr.total_gross,
  pr.total_net,
  pr.total_employee_taxes,
  pr.total_employer_taxes,
  pr.total_deductions,
  count(pri.id) as employee_count
from public.payroll_runs pr
left join public.payroll_run_items pri on pri.payroll_run_id = pr.id
group by
  pr.tenant_id, pr.entity_id, pr.id, pr.run_number, pr.run_type, pr.run_status,
  pr.pay_date, pr.period_start, pr.period_end, pr.total_gross, pr.total_net,
  pr.total_employee_taxes, pr.total_employer_taxes, pr.total_deductions;

create or replace view public.v_leave_balance_summary as
select
  elp.tenant_id,
  elp.entity_id,
  elp.finance_person_id,
  elp.leave_type_id,
  elp.current_balance_hours,
  elp.available_balance_hours,
  elp.pending_balance_hours,
  elp.ytd_used_hours,
  elp.last_accrual_at
from public.employee_leave_profiles elp;

create or replace view public.v_bank_cash_position as
select
  ba.tenant_id,
  ba.entity_id,
  ba.id as bank_account_id,
  ba.account_name,
  ba.bank_name,
  coalesce(sum(
    case
      when bt.transaction_type in ('credit') then bt.amount
      when bt.transaction_type in ('debit', 'fee', 'transfer', 'other') then -1 * bt.amount
      else 0
    end
  ), 0) as ledger_balance
from public.bank_accounts ba
left join public.bank_transactions bt on bt.bank_account_id = ba.id
group by ba.tenant_id, ba.entity_id, ba.id, ba.account_name, ba.bank_name;

create or replace view public.v_inventory_position as
select
  isb.tenant_id,
  isb.entity_id,
  isb.inventory_item_id,
  isb.inventory_location_id,
  isb.quantity_on_hand,
  isb.quantity_available,
  isb.quantity_reserved,
  isb.total_value
from public.inventory_stock_balances isb;

create or replace view public.v_billable_candidate_summary as
select
  bec.tenant_id,
  bec.entity_id,
  bec.customer_id,
  bec.catalog_item_id,
  bec.candidate_status,
  count(*) as candidate_count,
  sum(coalesce(bec.candidate_amount, 0)) as candidate_amount_total
from public.billable_event_candidates bec
group by bec.tenant_id, bec.entity_id, bec.customer_id, bec.catalog_item_id, bec.candidate_status;

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------
create index if not exists report_definitions_tenant_idx on public.report_definitions (tenant_id);
create index if not exists report_snapshots_tenant_idx on public.report_snapshots (tenant_id);
create index if not exists dashboard_definitions_tenant_idx on public.dashboard_definitions (tenant_id);
create index if not exists dashboard_snapshots_tenant_idx on public.dashboard_snapshots (tenant_id);
create index if not exists kpi_definitions_tenant_idx on public.kpi_definitions (tenant_id);
create index if not exists kpi_snapshots_tenant_idx on public.kpi_snapshots (tenant_id);
create index if not exists close_checklists_tenant_idx on public.close_checklists (tenant_id);
create index if not exists close_tasks_tenant_idx on public.close_tasks (tenant_id);

-- ------------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------------
drop trigger if exists set_updated_at_report_definitions on public.report_definitions;
create trigger set_updated_at_report_definitions before update on public.report_definitions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_dashboard_definitions on public.dashboard_definitions;
create trigger set_updated_at_dashboard_definitions before update on public.dashboard_definitions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_kpi_definitions on public.kpi_definitions;
create trigger set_updated_at_kpi_definitions before update on public.kpi_definitions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_close_checklists on public.close_checklists;
create trigger set_updated_at_close_checklists before update on public.close_checklists
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_close_tasks on public.close_tasks;
create trigger set_updated_at_close_tasks before update on public.close_tasks
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Seed starter report definitions (only when a real tenant exists; idempotent)
-- ------------------------------------------------------------------
insert into public.report_definitions (tenant_id, entity_id, report_code, report_name, report_category, output_type, status)
select s.id, null, 'ar_aging', 'Accounts Receivable Aging', 'ar', 'table', 'inactive'
from (
  select t.id
  from public.tenants t
  order by t.created_at asc
  limit 1
) s
where not exists (
  select 1
  from public.report_definitions rd
  where rd.tenant_id = s.id
    and rd.entity_id is null
    and rd.report_code = 'ar_aging'
);

-- ------------------------------------------------------------------
-- Enable RLS
-- ------------------------------------------------------------------
alter table public.report_definitions enable row level security;
alter table public.report_snapshots enable row level security;
alter table public.dashboard_definitions enable row level security;
alter table public.dashboard_snapshots enable row level security;
alter table public.kpi_definitions enable row level security;
alter table public.kpi_snapshots enable row level security;
alter table public.close_checklists enable row level security;
alter table public.close_tasks enable row level security;

drop policy if exists report_definitions_select on public.report_definitions;
create policy report_definitions_select on public.report_definitions
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists report_snapshots_select on public.report_snapshots;
create policy report_snapshots_select on public.report_snapshots
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists dashboard_definitions_select on public.dashboard_definitions;
create policy dashboard_definitions_select on public.dashboard_definitions
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists dashboard_snapshots_select on public.dashboard_snapshots;
create policy dashboard_snapshots_select on public.dashboard_snapshots
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists kpi_definitions_select on public.kpi_definitions;
create policy kpi_definitions_select on public.kpi_definitions
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists kpi_snapshots_select on public.kpi_snapshots;
create policy kpi_snapshots_select on public.kpi_snapshots
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists close_checklists_select on public.close_checklists;
create policy close_checklists_select on public.close_checklists
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

drop policy if exists close_tasks_select on public.close_tasks;
create policy close_tasks_select on public.close_tasks
for select to authenticated
using (
  exists (
    select 1 from public.close_checklists cc
    where cc.id = close_checklist_id
      and public.has_active_tenant_membership(cc.tenant_id)
      and public.has_entity_scope(cc.tenant_id, cc.entity_id)
  )
);

-- No browser mutation policies for reporting control and close tables.
