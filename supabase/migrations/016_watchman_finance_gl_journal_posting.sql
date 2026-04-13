-- Watchman Finance Migration Pack 016 — GL journal batches & lines (manual posting)
-- Target: Supabase Postgres
-- Depends on: Pack 001 (accounts, fiscal_periods), Pack 002 (has_entity_scope), through 015

-- ------------------------------------------------------------------
-- GL journal batches (header)
-- ------------------------------------------------------------------
create table if not exists public.gl_journal_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  fiscal_period_id uuid references public.fiscal_periods(id) on delete set null,
  journal_number text not null,
  journal_date date not null default (timezone('utc', now()))::date,
  description text,
  batch_status text not null default 'draft' check (batch_status in ('draft', 'posted', 'void')),
  posted_at timestamptz,
  posted_by uuid references public.platform_users(id) on delete set null,
  voided_at timestamptz,
  void_reason text,
  created_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint gl_journal_batches_entity_number_uk unique (entity_id, journal_number)
);

create table if not exists public.gl_journal_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  journal_batch_id uuid not null references public.gl_journal_batches(id) on delete cascade,
  line_number integer not null,
  account_id uuid not null references public.accounts(id) on delete restrict,
  memo text,
  debit_amount numeric(14,2) not null default 0 check (debit_amount >= 0),
  credit_amount numeric(14,2) not null default 0 check (credit_amount >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint gl_journal_lines_batch_line_uk unique (journal_batch_id, line_number),
  constraint gl_journal_lines_dc_chk check (
    (debit_amount > 0 and credit_amount = 0)
    or (credit_amount > 0 and debit_amount = 0)
  )
);

create index if not exists gl_journal_batches_tenant_idx on public.gl_journal_batches (tenant_id);
create index if not exists gl_journal_batches_entity_idx on public.gl_journal_batches (entity_id);
create index if not exists gl_journal_lines_tenant_idx on public.gl_journal_lines (tenant_id);
create index if not exists gl_journal_lines_batch_idx on public.gl_journal_lines (journal_batch_id);

drop trigger if exists set_updated_at_gl_journal_batches on public.gl_journal_batches;
create trigger set_updated_at_gl_journal_batches before update on public.gl_journal_batches
for each row execute function public.set_updated_at();

alter table public.gl_journal_batches enable row level security;
alter table public.gl_journal_lines enable row level security;

drop policy if exists gl_journal_batches_select on public.gl_journal_batches;
create policy gl_journal_batches_select on public.gl_journal_batches
for select using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists gl_journal_lines_select on public.gl_journal_lines;
create policy gl_journal_lines_select on public.gl_journal_lines
for select using (
  public.has_active_tenant_membership(tenant_id)
  and exists (
    select 1 from public.gl_journal_batches b
    where b.id = gl_journal_lines.journal_batch_id
      and b.tenant_id = gl_journal_lines.tenant_id
      and public.has_entity_scope(b.tenant_id, b.entity_id)
  )
);
