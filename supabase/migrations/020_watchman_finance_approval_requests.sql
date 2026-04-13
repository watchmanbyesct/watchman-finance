-- Watchman Finance Migration Pack 020 — Generic finance approval requests (cross-module workflow shell)
-- Target: Supabase Postgres
-- Depends on: Pack 001, through 019

-- ------------------------------------------------------------------
-- Approval requests: subject is any finance row identified by table + record id (server-enforced invariants)
-- ------------------------------------------------------------------
create table if not exists public.finance_approval_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  subject_domain text not null check (subject_domain in (
    'ar', 'ap', 'gl', 'payroll', 'banking', 'tax', 'catalog', 'billing', 'inventory', 'other'
  )),
  subject_table text not null,
  subject_record_id uuid not null,
  request_code text not null,
  request_title text not null,
  request_status text not null default 'draft' check (request_status in (
    'draft', 'submitted', 'approved', 'rejected', 'cancelled', 'expired'
  )),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  submitted_at timestamptz,
  submitted_by uuid references public.platform_users(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references public.platform_users(id) on delete set null,
  resolution_notes text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists finance_approval_requests_tenant_idx on public.finance_approval_requests (tenant_id);
create index if not exists finance_approval_requests_entity_idx on public.finance_approval_requests (entity_id);
create index if not exists finance_approval_requests_subject_idx
  on public.finance_approval_requests (tenant_id, subject_table, subject_record_id);
create index if not exists finance_approval_requests_status_idx on public.finance_approval_requests (tenant_id, request_status);

drop trigger if exists set_updated_at_finance_approval_requests on public.finance_approval_requests;
create trigger set_updated_at_finance_approval_requests before update on public.finance_approval_requests
for each row execute function public.set_updated_at();

alter table public.finance_approval_requests enable row level security;

drop policy if exists finance_approval_requests_select on public.finance_approval_requests;
create policy finance_approval_requests_select on public.finance_approval_requests
for select using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);
