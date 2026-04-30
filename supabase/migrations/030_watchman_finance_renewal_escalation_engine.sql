-- Watchman Finance Migration Pack 030 — Renewal and escalation recommendations
-- Target: Supabase Postgres
-- Depends on: 029 (estimates and proposals)

create table if not exists public.finance_contract_renewal_recommendations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  estimate_id uuid not null references public.finance_estimates(id) on delete cascade,
  contract_id uuid,
  contract_anniversary_date date not null,
  current_bill_rate numeric(10,2) not null default 0,
  wage_increase_rate numeric(8,4) not null default 0,
  insurance_increase_rate numeric(8,4) not null default 0,
  overtime_trend_rate numeric(8,4) not null default 0,
  inflation_rate numeric(8,4) not null default 0,
  recommended_escalation_rate numeric(8,4) not null default 0,
  recommended_bill_rate numeric(10,2) not null default 0,
  rationale text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists finance_contract_renewal_recs_tenant_idx
  on public.finance_contract_renewal_recommendations (tenant_id, contract_anniversary_date);
create index if not exists finance_contract_renewal_recs_estimate_idx
  on public.finance_contract_renewal_recommendations (tenant_id, estimate_id);

alter table public.finance_contract_renewal_recommendations enable row level security;

drop policy if exists finance_contract_renewal_recommendations_select on public.finance_contract_renewal_recommendations;
create policy finance_contract_renewal_recommendations_select on public.finance_contract_renewal_recommendations
for select using (public.has_active_tenant_membership(tenant_id));
