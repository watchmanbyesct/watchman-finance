-- Watchman Finance Migration Pack 002 Integration Staging and Sync v1
-- Target: Supabase Postgres
-- Depends on: Pack 001 Foundation

-- ------------------------------------------------------------------
-- Prerequisites (minimal org + helpers for finance_people FKs & RLS)
-- ------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  code text not null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint branches_tenant_code_uk unique (tenant_id, code)
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  code text not null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint departments_tenant_code_uk unique (tenant_id, code)
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  location_type text,
  address_line_1 text,
  city text,
  state text,
  postal_code text,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.has_active_tenant_membership(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    join public.platform_users pu on pu.id = tm.platform_user_id
    where tm.tenant_id = p_tenant_id
      and tm.membership_status = 'active'
      and pu.auth_user_id = auth.uid()
  );
$$;

create or replace function public.has_entity_scope(p_tenant_id uuid, p_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_entity_scopes ues
    join public.platform_users pu on pu.id = ues.platform_user_id
    where ues.tenant_id = p_tenant_id
      and ues.entity_id = p_entity_id
      and pu.auth_user_id = auth.uid()
  )
  or exists (
    select 1 from public.tenant_memberships tm
    join public.platform_users pu on pu.id = tm.platform_user_id
    where tm.tenant_id = p_tenant_id
      and tm.default_entity_id is not distinct from p_entity_id
      and tm.membership_status = 'active'
      and pu.auth_user_id = auth.uid()
  );
$$;

revoke all on function public.has_active_tenant_membership(uuid) from public;
grant execute on function public.has_active_tenant_membership(uuid) to authenticated, service_role;

revoke all on function public.has_entity_scope(uuid, uuid) from public;
grant execute on function public.has_entity_scope(uuid, uuid) to authenticated, service_role;

-- ------------------------------------------------------------------
-- Integration registry and orchestration
-- ------------------------------------------------------------------
create table if not exists public.integration_systems (
  id uuid primary key default gen_random_uuid(),
  system_key text not null unique,
  name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_system_id uuid not null references public.integration_systems(id) on delete restrict,
  connection_name text not null,
  connection_status text not null default 'active' check (connection_status in ('active', 'inactive', 'error')),
  config_json jsonb not null default '{}'::jsonb,
  last_tested_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint integration_connections_tenant_system_name_uk unique (tenant_id, integration_system_id, connection_name)
);

create table if not exists public.integration_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_connection_id uuid references public.integration_connections(id) on delete cascade,
  job_key text not null,
  source_system_key text not null,
  target_domain text not null,
  schedule_mode text not null default 'manual' check (schedule_mode in ('manual', 'scheduled', 'event_driven')),
  status text not null default 'active' check (status in ('active', 'paused', 'inactive')),
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint integration_sync_jobs_tenant_job_key_uk unique (tenant_id, job_key)
);

create table if not exists public.integration_sync_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_sync_job_id uuid not null references public.integration_sync_jobs(id) on delete cascade,
  run_status text not null default 'started' check (run_status in ('started', 'completed', 'failed', 'partial')),
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  records_received integer not null default 0,
  records_promoted integer not null default 0,
  records_failed integer not null default 0,
  error_summary text,
  metadata_json jsonb not null default '{}'::jsonb
);

create table if not exists public.integration_event_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  source_system_key text not null,
  event_type text not null,
  event_version integer not null default 1,
  source_record_type text not null,
  source_record_id text not null,
  dedupe_key text not null,
  correlation_id text,
  occurred_at timestamptz not null,
  received_at timestamptz not null default timezone('utc', now()),
  actor_type text,
  actor_id text,
  payload_json jsonb not null,
  processing_status text not null default 'received' check (processing_status in ('received', 'validated', 'promoted', 'failed', 'ignored')),
  error_message text,
  constraint integration_event_log_dedupe_uk unique (tenant_id, dedupe_key)
);

create table if not exists public.integration_dead_letter_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_event_log_id uuid references public.integration_event_log(id) on delete set null,
  source_system_key text not null,
  event_type text not null,
  dedupe_key text not null,
  payload_json jsonb not null,
  failure_reason text not null,
  moved_at timestamptz not null default timezone('utc', now()),
  resolution_status text not null default 'open' check (resolution_status in ('open', 'resolved', 'ignored'))
);

create table if not exists public.integration_replay_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_event_log_id uuid references public.integration_event_log(id) on delete set null,
  requested_by uuid references public.platform_users(id) on delete set null,
  reason text not null,
  request_status text not null default 'requested' check (request_status in ('requested', 'approved', 'replayed', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

create table if not exists public.external_id_mappings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  source_system_key text not null,
  source_record_type text not null,
  source_record_id text not null,
  target_table text not null,
  target_record_id uuid not null,
  mapping_status text not null default 'active' check (mapping_status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint external_id_mappings_uk unique (tenant_id, source_system_key, source_record_type, source_record_id, target_table)
);

create table if not exists public.sync_watermarks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_sync_job_id uuid references public.integration_sync_jobs(id) on delete cascade,
  watermark_key text not null,
  watermark_value text not null,
  recorded_at timestamptz not null default timezone('utc', now()),
  constraint sync_watermarks_uk unique (tenant_id, integration_sync_job_id, watermark_key)
);

-- ------------------------------------------------------------------
-- Validation and promotion control
-- ------------------------------------------------------------------
create table if not exists public.ingestion_validation_errors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_table text not null,
  source_record_pk uuid,
  error_code text not null,
  error_message text not null,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create table if not exists public.ingestion_review_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_table text not null,
  source_record_pk uuid not null,
  queue_type text not null,
  review_status text not null default 'open' check (review_status in ('open', 'resolved', 'ignored')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  summary text not null,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create table if not exists public.ingestion_promotion_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_table text not null,
  run_status text not null default 'started' check (run_status in ('started', 'completed', 'failed', 'partial')),
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  records_attempted integer not null default 0,
  records_promoted integer not null default 0,
  records_failed integer not null default 0,
  metadata_json jsonb not null default '{}'::jsonb
);

create table if not exists public.ingestion_promotion_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  ingestion_promotion_run_id uuid not null references public.ingestion_promotion_runs(id) on delete cascade,
  source_table text not null,
  source_record_pk uuid not null,
  target_table text,
  target_record_id uuid,
  item_status text not null default 'pending' check (item_status in ('pending', 'promoted', 'failed', 'ignored')),
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

-- ------------------------------------------------------------------
-- Finance-owned employee reference table
-- ------------------------------------------------------------------
create table if not exists public.finance_people (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  person_type text not null default 'employee' check (person_type in ('employee', 'contractor', 'other')),
  legal_first_name text not null,
  legal_last_name text not null,
  middle_name text,
  preferred_name text,
  email text,
  phone text,
  employment_status text not null default 'active' check (employment_status in ('active', 'inactive', 'terminated', 'leave')),
  hire_date date,
  default_department_id uuid references public.departments(id) on delete set null,
  default_branch_id uuid references public.branches(id) on delete set null,
  default_location_id uuid references public.locations(id) on delete set null,
  source_system_key text not null default 'watchman_launch',
  source_record_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists finance_people_source_uk
  on public.finance_people (tenant_id, source_system_key, source_record_id)
  where source_record_id is not null;

-- ------------------------------------------------------------------
-- Launch staging
-- ------------------------------------------------------------------
create table if not exists public.staged_employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  source_system_key text not null default 'watchman_launch',
  source_record_id text not null,
  correlation_id text,
  dedupe_key text not null,
  payload_json jsonb not null,
  normalized_json jsonb not null default '{}'::jsonb,
  validation_status text not null default 'pending' check (validation_status in ('pending', 'valid', 'invalid', 'promoted')),
  review_status text not null default 'not_required' check (review_status in ('not_required', 'required', 'resolved')),
  received_at timestamptz not null default timezone('utc', now()),
  promoted_at timestamptz,
  promoted_record_id uuid,
  constraint staged_employees_dedupe_uk unique (tenant_id, dedupe_key)
);

create table if not exists public.staged_customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  source_system_key text not null default 'watchman_launch',
  source_record_id text not null,
  correlation_id text,
  dedupe_key text not null,
  payload_json jsonb not null,
  normalized_json jsonb not null default '{}'::jsonb,
  validation_status text not null default 'pending' check (validation_status in ('pending', 'valid', 'invalid', 'promoted')),
  review_status text not null default 'not_required' check (review_status in ('not_required', 'required', 'resolved')),
  received_at timestamptz not null default timezone('utc', now()),
  promoted_at timestamptz,
  promoted_record_id uuid,
  constraint staged_customers_dedupe_uk unique (tenant_id, dedupe_key)
);

create table if not exists public.staged_contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  source_system_key text not null default 'watchman_launch',
  source_record_id text not null,
  correlation_id text,
  dedupe_key text not null,
  payload_json jsonb not null,
  normalized_json jsonb not null default '{}'::jsonb,
  validation_status text not null default 'pending' check (validation_status in ('pending', 'valid', 'invalid', 'promoted')),
  review_status text not null default 'not_required' check (review_status in ('not_required', 'required', 'resolved')),
  received_at timestamptz not null default timezone('utc', now()),
  promoted_at timestamptz,
  promoted_record_id uuid,
  constraint staged_contracts_dedupe_uk unique (tenant_id, dedupe_key)
);

-- ------------------------------------------------------------------
-- Operations staging
-- ------------------------------------------------------------------
create table if not exists public.staged_time_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  source_system_key text not null default 'watchman_operations',
  source_record_id text not null,
  correlation_id text,
  dedupe_key text not null,
  payload_json jsonb not null,
  normalized_json jsonb not null default '{}'::jsonb,
  employee_source_record_id text,
  pay_period_start date,
  pay_period_end date,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  validation_status text not null default 'pending' check (validation_status in ('pending', 'valid', 'invalid', 'promoted')),
  received_at timestamptz not null default timezone('utc', now()),
  promoted_at timestamptz,
  constraint staged_time_entries_dedupe_uk unique (tenant_id, dedupe_key)
);

create table if not exists public.staged_payroll_hours (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  staged_time_entry_id uuid references public.staged_time_entries(id) on delete cascade,
  employee_source_record_id text not null,
  regular_hours numeric(10,2) not null default 0,
  overtime_hours numeric(10,2) not null default 0,
  holiday_hours numeric(10,2) not null default 0,
  unpaid_hours numeric(10,2) not null default 0,
  differential_hours numeric(10,2) not null default 0,
  source_work_date date,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.staged_service_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  source_system_key text not null default 'watchman_operations',
  source_record_id text not null,
  correlation_id text,
  dedupe_key text not null,
  payload_json jsonb not null,
  normalized_json jsonb not null default '{}'::jsonb,
  event_date date,
  service_type text,
  validation_status text not null default 'pending' check (validation_status in ('pending', 'valid', 'invalid', 'promoted')),
  received_at timestamptz not null default timezone('utc', now()),
  promoted_at timestamptz,
  constraint staged_service_events_dedupe_uk unique (tenant_id, dedupe_key)
);

create table if not exists public.staged_leave_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  source_system_key text not null default 'watchman_operations',
  source_record_id text not null,
  correlation_id text,
  dedupe_key text not null,
  payload_json jsonb not null,
  normalized_json jsonb not null default '{}'::jsonb,
  validation_status text not null default 'pending' check (validation_status in ('pending', 'valid', 'invalid', 'promoted')),
  received_at timestamptz not null default timezone('utc', now()),
  promoted_at timestamptz,
  constraint staged_leave_events_dedupe_uk unique (tenant_id, dedupe_key)
);

create table if not exists public.staged_inventory_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  source_system_key text not null default 'watchman_operations',
  source_record_id text not null,
  correlation_id text,
  dedupe_key text not null,
  payload_json jsonb not null,
  normalized_json jsonb not null default '{}'::jsonb,
  validation_status text not null default 'pending' check (validation_status in ('pending', 'valid', 'invalid', 'promoted')),
  received_at timestamptz not null default timezone('utc', now()),
  promoted_at timestamptz,
  constraint staged_inventory_events_dedupe_uk unique (tenant_id, dedupe_key)
);

create table if not exists public.staged_payment_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  source_system_key text not null,
  source_record_id text not null,
  correlation_id text,
  dedupe_key text not null,
  payload_json jsonb not null,
  normalized_json jsonb not null default '{}'::jsonb,
  validation_status text not null default 'pending' check (validation_status in ('pending', 'valid', 'invalid', 'promoted')),
  received_at timestamptz not null default timezone('utc', now()),
  promoted_at timestamptz,
  constraint staged_payment_events_dedupe_uk unique (tenant_id, dedupe_key)
);

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------
create index if not exists integration_connections_tenant_idx on public.integration_connections (tenant_id);
create index if not exists integration_sync_jobs_tenant_idx on public.integration_sync_jobs (tenant_id);
create index if not exists integration_sync_runs_tenant_idx on public.integration_sync_runs (tenant_id);
create index if not exists integration_event_log_tenant_idx on public.integration_event_log (tenant_id);
create index if not exists integration_event_log_status_idx on public.integration_event_log (processing_status);
create index if not exists external_id_mappings_tenant_idx on public.external_id_mappings (tenant_id);
create index if not exists staged_employees_tenant_idx on public.staged_employees (tenant_id);
create index if not exists staged_customers_tenant_idx on public.staged_customers (tenant_id);
create index if not exists staged_contracts_tenant_idx on public.staged_contracts (tenant_id);
create index if not exists staged_time_entries_tenant_idx on public.staged_time_entries (tenant_id);
create index if not exists staged_service_events_tenant_idx on public.staged_service_events (tenant_id);
create index if not exists staged_leave_events_tenant_idx on public.staged_leave_events (tenant_id);
create index if not exists staged_inventory_events_tenant_idx on public.staged_inventory_events (tenant_id);
create index if not exists staged_payment_events_tenant_idx on public.staged_payment_events (tenant_id);
create index if not exists finance_people_tenant_idx on public.finance_people (tenant_id);

-- ------------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------------
drop trigger if exists set_updated_at_integration_systems on public.integration_systems;
create trigger set_updated_at_integration_systems before update on public.integration_systems
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_integration_connections on public.integration_connections;
create trigger set_updated_at_integration_connections before update on public.integration_connections
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_integration_sync_jobs on public.integration_sync_jobs;
create trigger set_updated_at_integration_sync_jobs before update on public.integration_sync_jobs
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_external_id_mappings on public.external_id_mappings;
create trigger set_updated_at_external_id_mappings before update on public.external_id_mappings
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_finance_people on public.finance_people;
create trigger set_updated_at_finance_people before update on public.finance_people
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Seed integration systems
-- ------------------------------------------------------------------
insert into public.integration_systems (system_key, name)
values
  ('watchman_launch', 'Watchman Launch'),
  ('watchman_operations', 'Watchman Operations'),
  ('watchman_finance', 'Watchman Finance'),
  ('quickbooks_online', 'QuickBooks Online')
on conflict (system_key) do nothing;

-- ------------------------------------------------------------------
-- Enable RLS on reviewable tenant-owned integration tables
-- ------------------------------------------------------------------
alter table public.integration_sync_jobs enable row level security;
alter table public.integration_sync_runs enable row level security;
alter table public.integration_event_log enable row level security;
alter table public.ingestion_validation_errors enable row level security;
alter table public.ingestion_review_queue enable row level security;
alter table public.staged_employees enable row level security;
alter table public.staged_customers enable row level security;
alter table public.staged_contracts enable row level security;
alter table public.staged_time_entries enable row level security;
alter table public.staged_service_events enable row level security;
alter table public.finance_people enable row level security;

drop policy if exists integration_sync_jobs_select on public.integration_sync_jobs;
create policy integration_sync_jobs_select on public.integration_sync_jobs
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists integration_sync_runs_select on public.integration_sync_runs;
create policy integration_sync_runs_select on public.integration_sync_runs
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists integration_event_log_select on public.integration_event_log;
create policy integration_event_log_select on public.integration_event_log
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists ingestion_validation_errors_select on public.ingestion_validation_errors;
create policy ingestion_validation_errors_select on public.ingestion_validation_errors
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists ingestion_review_queue_select on public.ingestion_review_queue;
create policy ingestion_review_queue_select on public.ingestion_review_queue
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists staged_employees_select on public.staged_employees;
create policy staged_employees_select on public.staged_employees
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists staged_customers_select on public.staged_customers;
create policy staged_customers_select on public.staged_customers
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists staged_contracts_select on public.staged_contracts;
create policy staged_contracts_select on public.staged_contracts
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists staged_time_entries_select on public.staged_time_entries;
create policy staged_time_entries_select on public.staged_time_entries
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists staged_service_events_select on public.staged_service_events;
create policy staged_service_events_select on public.staged_service_events
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists finance_people_select on public.finance_people;
create policy finance_people_select on public.finance_people
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

-- No client-side mutation policies for staging or finance-owned promotion targets.
