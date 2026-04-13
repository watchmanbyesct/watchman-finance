-- Watchman Finance Migration Pack 019 — Evidence / document metadata (SOC-style attachments)
-- Target: Supabase Postgres
-- Depends on: Pack 001 (tenants, entities, platform_users), through 018

-- ------------------------------------------------------------------
-- Evidence documents: logical link from finance records → Supabase Storage (or external) objects
-- ------------------------------------------------------------------
create table if not exists public.finance_evidence_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  domain text not null default 'other' check (domain in (
    'ar', 'ap', 'gl', 'payroll', 'banking', 'tax', 'integration', 'other'
  )),
  parent_table text not null,
  parent_record_id uuid not null,
  title text,
  storage_bucket text not null default 'finance-evidence',
  storage_object_path text not null,
  content_type text,
  byte_size bigint,
  uploaded_by uuid references public.platform_users(id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint finance_evidence_documents_path_uk unique (tenant_id, storage_bucket, storage_object_path)
);

create index if not exists finance_evidence_documents_tenant_idx on public.finance_evidence_documents (tenant_id);
create index if not exists finance_evidence_documents_parent_idx
  on public.finance_evidence_documents (tenant_id, parent_table, parent_record_id);
create index if not exists finance_evidence_documents_entity_idx on public.finance_evidence_documents (entity_id);

alter table public.finance_evidence_documents enable row level security;

drop policy if exists finance_evidence_documents_select on public.finance_evidence_documents;
create policy finance_evidence_documents_select on public.finance_evidence_documents
for select using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);
