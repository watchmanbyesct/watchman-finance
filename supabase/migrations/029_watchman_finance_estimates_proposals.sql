-- Watchman Finance Migration Pack 029 — Estimates & Proposals (finance_pricing_engine)
-- Target: Supabase Postgres
-- Depends on: Pack 001+ foundational auth/context helpers

create table if not exists public.finance_cost_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  payroll_tax_rate numeric(8,4) not null default 0,
  workers_comp_rate numeric(8,4) not null default 0,
  disability_pfl_rate numeric(8,4) not null default 0,
  liability_rate numeric(8,4) not null default 0,
  overhead_rate numeric(8,4) not null default 0,
  admin_rate numeric(8,4) not null default 0,
  supervision_rate numeric(8,4) not null default 0,
  technology_rate numeric(8,4) not null default 0,
  target_margin numeric(8,4) not null default 0.30,
  minimum_margin numeric(8,4) not null default 0.20,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.finance_estimates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  estimate_number text not null,
  client_id uuid references public.customers(id) on delete set null,
  prospect_id text,
  site_id uuid references public.customer_sites(id) on delete set null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  stage text not null default 'draft' check (stage in ('draft', 'sent', 'won', 'lost', 'expired')),
  created_by uuid references public.platform_users(id) on delete set null,
  assigned_to uuid references public.platform_users(id) on delete set null,
  cost_profile_id uuid references public.finance_cost_profiles(id) on delete set null,
  target_margin numeric(8,4) not null default 0.30,
  minimum_margin numeric(8,4) not null default 0.20,
  total_revenue numeric(14,2) not null default 0,
  total_cost numeric(14,2) not null default 0,
  gross_profit numeric(14,2) not null default 0,
  margin_percent numeric(8,4) not null default 0,
  approval_status text not null default 'not_required' check (approval_status in ('not_required', 'pending', 'approved', 'rejected')),
  sent_at timestamptz,
  won_at timestamptz,
  lost_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.finance_estimate_line_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  estimate_id uuid not null references public.finance_estimates(id) on delete cascade,
  service_type_id uuid references public.catalog_items(id) on delete set null,
  personnel_type text not null,
  description text,
  hours_per_week numeric(10,2) not null default 0,
  weeks numeric(10,2) not null default 0,
  base_pay_rate numeric(10,2) not null default 0,
  overtime_hours numeric(10,2) not null default 0,
  overtime_multiplier numeric(8,4) not null default 1.50,
  burden_rate numeric(8,4) not null default 0,
  direct_expense_total numeric(14,2) not null default 0,
  indirect_expense_total numeric(14,2) not null default 0,
  loaded_cost_per_hour numeric(10,2) not null default 0,
  bill_rate numeric(10,2) not null default 0,
  total_revenue numeric(14,2) not null default 0,
  total_cost numeric(14,2) not null default 0,
  gross_profit numeric(14,2) not null default 0,
  margin_percent numeric(8,4) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.finance_estimate_expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  estimate_id uuid not null references public.finance_estimates(id) on delete cascade,
  line_item_id uuid references public.finance_estimate_line_items(id) on delete cascade,
  category text not null,
  expense_name text not null,
  calculation_method text not null default 'flat',
  amount numeric(14,2) not null default 0,
  frequency text not null default 'one_time',
  notes text
);

create table if not exists public.finance_proposals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  estimate_id uuid not null references public.finance_estimates(id) on delete cascade,
  proposal_number text not null,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired')),
  document_url text,
  public_token_hash text,
  sent_to text,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.finance_deal_outcomes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  estimate_id uuid not null references public.finance_estimates(id) on delete cascade,
  outcome text not null check (outcome in ('won', 'lost', 'expired')),
  outcome_reason text,
  final_value numeric(14,2),
  final_margin numeric(8,4),
  decided_at timestamptz not null default timezone('utc', now()),
  decided_by uuid references public.platform_users(id) on delete set null,
  notes text
);

create table if not exists public.finance_estimate_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  estimate_id uuid not null references public.finance_estimates(id) on delete cascade,
  approval_rule text not null,
  required_role text not null,
  requested_by uuid references public.platform_users(id) on delete set null,
  approver_id uuid references public.platform_users(id) on delete set null,
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected')),
  requested_at timestamptz not null default timezone('utc', now()),
  approved_at timestamptz,
  rejected_at timestamptz,
  comments text
);

create table if not exists public.finance_pricing_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  template_name text not null,
  service_type text not null,
  personnel_type text not null,
  default_margin numeric(8,4) not null default 0.30,
  default_cost_profile_id uuid references public.finance_cost_profiles(id) on delete set null,
  proposal_scope_text text,
  active_flag boolean not null default true
);

create table if not exists public.finance_contract_profit_audits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  estimate_id uuid not null references public.finance_estimates(id) on delete cascade,
  contract_id uuid,
  period_start date not null,
  period_end date not null,
  estimated_revenue numeric(14,2) not null default 0,
  actual_revenue numeric(14,2) not null default 0,
  estimated_cost numeric(14,2) not null default 0,
  actual_cost numeric(14,2) not null default 0,
  estimated_margin numeric(8,4) not null default 0,
  actual_margin numeric(8,4) not null default 0,
  margin_variance numeric(8,4) not null default 0,
  risk_level text not null default 'low' check (risk_level in ('low', 'moderate', 'high')),
  recommended_action text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists finance_cost_profiles_tenant_idx on public.finance_cost_profiles (tenant_id);
create index if not exists finance_estimates_tenant_entity_idx on public.finance_estimates (tenant_id, entity_id);
create index if not exists finance_estimates_stage_idx on public.finance_estimates (tenant_id, stage);
create unique index if not exists finance_estimates_tenant_number_uk on public.finance_estimates (tenant_id, estimate_number);
create index if not exists finance_estimate_line_items_estimate_idx on public.finance_estimate_line_items (tenant_id, estimate_id);
create index if not exists finance_proposals_estimate_idx on public.finance_proposals (tenant_id, estimate_id);
create unique index if not exists finance_proposals_tenant_number_uk on public.finance_proposals (tenant_id, proposal_number);
create index if not exists finance_deal_outcomes_estimate_idx on public.finance_deal_outcomes (tenant_id, estimate_id);
create index if not exists finance_estimate_approvals_estimate_idx on public.finance_estimate_approvals (tenant_id, estimate_id);
create index if not exists finance_pricing_templates_tenant_idx on public.finance_pricing_templates (tenant_id);
create index if not exists finance_contract_profit_audits_estimate_idx on public.finance_contract_profit_audits (tenant_id, estimate_id);

drop trigger if exists set_updated_at_finance_cost_profiles on public.finance_cost_profiles;
create trigger set_updated_at_finance_cost_profiles before update on public.finance_cost_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_finance_estimates on public.finance_estimates;
create trigger set_updated_at_finance_estimates before update on public.finance_estimates
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_finance_estimate_line_items on public.finance_estimate_line_items;
create trigger set_updated_at_finance_estimate_line_items before update on public.finance_estimate_line_items
for each row execute function public.set_updated_at();

alter table public.finance_cost_profiles enable row level security;
alter table public.finance_estimates enable row level security;
alter table public.finance_estimate_line_items enable row level security;
alter table public.finance_estimate_expenses enable row level security;
alter table public.finance_proposals enable row level security;
alter table public.finance_deal_outcomes enable row level security;
alter table public.finance_estimate_approvals enable row level security;
alter table public.finance_pricing_templates enable row level security;
alter table public.finance_contract_profit_audits enable row level security;

drop policy if exists finance_cost_profiles_select on public.finance_cost_profiles;
create policy finance_cost_profiles_select on public.finance_cost_profiles
for select using (public.has_active_tenant_membership(tenant_id));

drop policy if exists finance_estimates_select on public.finance_estimates;
create policy finance_estimates_select on public.finance_estimates
for select using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

drop policy if exists finance_estimate_line_items_select on public.finance_estimate_line_items;
create policy finance_estimate_line_items_select on public.finance_estimate_line_items
for select using (
  public.has_active_tenant_membership(tenant_id)
  and exists (
    select 1
    from public.finance_estimates e
    where e.id = finance_estimate_line_items.estimate_id
      and e.tenant_id = finance_estimate_line_items.tenant_id
      and public.has_entity_scope(e.tenant_id, e.entity_id)
  )
);

drop policy if exists finance_estimate_expenses_select on public.finance_estimate_expenses;
create policy finance_estimate_expenses_select on public.finance_estimate_expenses
for select using (public.has_active_tenant_membership(tenant_id));

drop policy if exists finance_proposals_select on public.finance_proposals;
create policy finance_proposals_select on public.finance_proposals
for select using (public.has_active_tenant_membership(tenant_id));

drop policy if exists finance_deal_outcomes_select on public.finance_deal_outcomes;
create policy finance_deal_outcomes_select on public.finance_deal_outcomes
for select using (public.has_active_tenant_membership(tenant_id));

drop policy if exists finance_estimate_approvals_select on public.finance_estimate_approvals;
create policy finance_estimate_approvals_select on public.finance_estimate_approvals
for select using (public.has_active_tenant_membership(tenant_id));

drop policy if exists finance_pricing_templates_select on public.finance_pricing_templates;
create policy finance_pricing_templates_select on public.finance_pricing_templates
for select using (public.has_active_tenant_membership(tenant_id));

drop policy if exists finance_contract_profit_audits_select on public.finance_contract_profit_audits;
create policy finance_contract_profit_audits_select on public.finance_contract_profit_audits
for select using (public.has_active_tenant_membership(tenant_id));
