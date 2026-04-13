-- Watchman Finance Migration Pack 017 — Subledger→GL bindings & trace, integration pipeline ops, report execution log
-- Target: Supabase Postgres
-- Depends on: 001 (accounts, entities), 002 (integration tables), 003 (invoices, payments), 004 (payroll_runs), 009 (report_definitions, report_snapshots), 016 (gl_journal_batches/lines)

-- ------------------------------------------------------------------
-- Map semantic GL roles to entity chart-of-accounts rows (for automated posting).
-- ------------------------------------------------------------------
create table if not exists public.entity_gl_account_bindings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  binding_key text not null check (binding_key in (
    'ar_receivable',
    'ar_revenue',
    'ar_cash_clearing',
    'payroll_expense',
    'payroll_liability'
  )),
  account_id uuid not null references public.accounts(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint entity_gl_account_bindings_uk unique (tenant_id, entity_id, binding_key)
);

create index if not exists entity_gl_account_bindings_tenant_idx on public.entity_gl_account_bindings (tenant_id);
create index if not exists entity_gl_account_bindings_entity_idx on public.entity_gl_account_bindings (entity_id);

drop trigger if exists set_updated_at_entity_gl_account_bindings on public.entity_gl_account_bindings;
create trigger set_updated_at_entity_gl_account_bindings before update on public.entity_gl_account_bindings
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Idempotent link from subledger source events → posted GL journal batches.
-- ------------------------------------------------------------------
create table if not exists public.gl_subledger_postings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  source_domain text not null check (source_domain in ('ar', 'payroll')),
  source_table text not null,
  source_record_id uuid not null,
  source_event text not null check (source_event in (
    'invoice_issue',
    'invoice_payment',
    'payroll_finalize'
  )),
  journal_batch_id uuid not null references public.gl_journal_batches(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  constraint gl_subledger_postings_source_uk unique (tenant_id, source_table, source_record_id, source_event),
  constraint gl_subledger_postings_batch_uk unique (journal_batch_id)
);

create index if not exists gl_subledger_postings_tenant_idx on public.gl_subledger_postings (tenant_id);
create index if not exists gl_subledger_postings_entity_idx on public.gl_subledger_postings (entity_id);

-- ------------------------------------------------------------------
-- Deep reporting automation — execution audit (snapshots live in report_snapshots).
-- ------------------------------------------------------------------
create table if not exists public.report_execution_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  report_definition_id uuid not null references public.report_definitions(id) on delete cascade,
  as_of_date date not null,
  execution_status text not null default 'started' check (execution_status in ('started', 'completed', 'failed')),
  report_snapshot_id uuid references public.report_snapshots(id) on delete set null,
  error_message text,
  triggered_by uuid references public.platform_users(id) on delete set null,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists report_execution_log_tenant_idx on public.report_execution_log (tenant_id);
create index if not exists report_execution_log_def_idx on public.report_execution_log (report_definition_id);

-- ------------------------------------------------------------------
-- Permissions (Pack 017)
-- ------------------------------------------------------------------
insert into public.permissions (code, name, is_system) values
  ('integration.pipeline.operate', 'Operate integration sync jobs, runs, and event disposition', true),
  ('reporting.automation.execute', 'Execute report snapshot automation and materialization jobs', true),
  ('gl.binding.manage', 'Manage entity GL account bindings for subledger automation', true)
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('finance_admin', 'tenant_owner')
  and p.code in (
    'integration.pipeline.operate',
    'reporting.automation.execute',
    'gl.binding.manage'
  )
on conflict (role_id, permission_id) do nothing;

-- ------------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------------
alter table public.entity_gl_account_bindings enable row level security;
alter table public.gl_subledger_postings enable row level security;
alter table public.report_execution_log enable row level security;

drop policy if exists entity_gl_account_bindings_select on public.entity_gl_account_bindings;
create policy entity_gl_account_bindings_select on public.entity_gl_account_bindings
for select using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists gl_subledger_postings_select on public.gl_subledger_postings;
create policy gl_subledger_postings_select on public.gl_subledger_postings
for select using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists report_execution_log_select on public.report_execution_log;
create policy report_execution_log_select on public.report_execution_log
for select using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);
