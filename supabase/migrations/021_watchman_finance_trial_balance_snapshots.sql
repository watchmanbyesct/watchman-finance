-- Watchman Finance Migration Pack 021 — Period trial balance snapshot cache (close / reporting acceleration)
-- Target: Supabase Postgres
-- Depends on: Pack 001 (fiscal_periods, entities), Pack 016 (gl journals), through 020

-- ------------------------------------------------------------------
-- Point-in-time trial balance snapshots per entity + fiscal period (JSON payload built by app jobs)
-- ------------------------------------------------------------------
create table if not exists public.gl_trial_balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  fiscal_period_id uuid not null references public.fiscal_periods(id) on delete cascade,
  as_of_date date not null,
  snapshot_kind text not null default 'trial_balance' check (snapshot_kind in (
    'trial_balance', 'adjusted_tb', 'post_close_tb'
  )),
  snapshot_status text not null default 'draft' check (snapshot_status in ('draft', 'final', 'superseded')),
  snapshot_json jsonb not null default '{}'::jsonb,
  total_debit numeric(18,2) not null default 0,
  total_credit numeric(18,2) not null default 0,
  generated_by uuid references public.platform_users(id) on delete set null,
  generated_at timestamptz not null default timezone('utc', now()),
  notes text,
  constraint gl_trial_balance_snapshots_uk unique (entity_id, fiscal_period_id, as_of_date, snapshot_kind)
);

create index if not exists gl_trial_balance_snapshots_tenant_idx on public.gl_trial_balance_snapshots (tenant_id);
create index if not exists gl_trial_balance_snapshots_entity_idx on public.gl_trial_balance_snapshots (entity_id);
create index if not exists gl_trial_balance_snapshots_period_idx on public.gl_trial_balance_snapshots (fiscal_period_id);

alter table public.gl_trial_balance_snapshots enable row level security;

drop policy if exists gl_trial_balance_snapshots_select on public.gl_trial_balance_snapshots;
create policy gl_trial_balance_snapshots_select on public.gl_trial_balance_snapshots
for select using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);
