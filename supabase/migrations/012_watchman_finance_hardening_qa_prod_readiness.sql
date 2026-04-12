-- Watchman Finance Migration Pack 012 Hardening, QA, and Production Readiness v1
-- Target: Supabase Postgres
-- Depends on: Packs 001 through 011

-- ------------------------------------------------------------------
-- QA, testing, and release control
-- ------------------------------------------------------------------
create table if not exists public.test_suites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  suite_code text not null,
  suite_name text not null,
  suite_category text not null default 'integration' check (suite_category in (
    'unit', 'integration', 'rls', 'workflow', 'performance', 'release', 'recovery', 'other'
  )),
  status text not null default 'active' check (status in ('active', 'inactive')),
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists test_suites_platform_uk
  on public.test_suites (suite_code) where tenant_id is null;
create unique index if not exists test_suites_tenant_uk
  on public.test_suites (tenant_id, suite_code) where tenant_id is not null;

create table if not exists public.test_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  test_suite_id uuid not null references public.test_suites(id) on delete cascade,
  run_status text not null default 'started' check (run_status in ('started', 'passed', 'failed', 'partial')),
  run_environment text not null default 'staging' check (run_environment in ('dev', 'staging', 'uat', 'production')),
  started_by uuid references public.platform_users(id) on delete set null,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  summary_json jsonb not null default '{}'::jsonb
);

create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  test_run_id uuid not null references public.test_runs(id) on delete cascade,
  test_case_code text not null,
  result_status text not null check (result_status in ('passed', 'failed', 'skipped')),
  severity text not null default 'normal' check (severity in ('low', 'normal', 'high', 'critical')),
  result_notes text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint test_results_uk unique (test_run_id, test_case_code)
);

create table if not exists public.release_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  release_code text not null,
  release_name text not null,
  release_status text not null default 'draft' check (release_status in (
    'draft', 'candidate', 'approved', 'deployed', 'rolled_back', 'archived'
  )),
  release_scope text not null default 'platform' check (release_scope in ('platform', 'tenant', 'module')),
  target_tenant_id uuid references public.tenants(id) on delete cascade,
  target_module_key text,
  release_notes text,
  created_by uuid references public.platform_users(id) on delete set null,
  approved_by uuid references public.platform_users(id) on delete set null,
  approved_at timestamptz,
  deployed_at timestamptz,
  rolled_back_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists release_versions_platform_uk
  on public.release_versions (release_code) where tenant_id is null;
create unique index if not exists release_versions_tenant_uk
  on public.release_versions (tenant_id, release_code) where tenant_id is not null;

create table if not exists public.release_checklists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  release_version_id uuid not null references public.release_versions(id) on delete cascade,
  checklist_name text not null,
  checklist_status text not null default 'open' check (checklist_status in ('open', 'in_progress', 'completed', 'blocked')),
  created_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.release_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  release_checklist_id uuid not null references public.release_checklists(id) on delete cascade,
  task_code text not null,
  task_name text not null,
  task_status text not null default 'open' check (task_status in ('open', 'in_progress', 'completed', 'blocked')),
  assigned_to uuid references public.platform_users(id) on delete set null,
  completed_by uuid references public.platform_users(id) on delete set null,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint release_tasks_uk unique (release_checklist_id, task_code)
);

-- ------------------------------------------------------------------
-- Monitoring and operational readiness
-- ------------------------------------------------------------------
create table if not exists public.system_health_checks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  module_key text not null,
  check_code text not null,
  check_name text not null,
  check_status text not null default 'healthy' check (check_status in ('healthy', 'warning', 'critical', 'unknown')),
  last_checked_at timestamptz,
  status_message text,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists system_health_checks_platform_uk
  on public.system_health_checks (module_key, check_code) where tenant_id is null;
create unique index if not exists system_health_checks_tenant_uk
  on public.system_health_checks (tenant_id, module_key, check_code) where tenant_id is not null;

create table if not exists public.operational_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete cascade,
  module_key text not null,
  alert_code text not null,
  alert_severity text not null check (alert_severity in ('low', 'medium', 'high', 'critical')),
  alert_status text not null default 'open' check (alert_status in ('open', 'acknowledged', 'resolved', 'ignored')),
  alert_message text not null,
  details_json jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default timezone('utc', now()),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  acknowledged_by uuid references public.platform_users(id) on delete set null,
  resolved_by uuid references public.platform_users(id) on delete set null
);

create table if not exists public.job_run_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  job_key text not null,
  job_category text not null default 'scheduler' check (job_category in (
    'scheduler', 'integration', 'reporting', 'payroll', 'billing', 'recovery', 'other'
  )),
  run_status text not null default 'started' check (run_status in ('started', 'completed', 'failed', 'partial')),
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  result_json jsonb not null default '{}'::jsonb
);

create table if not exists public.audit_review_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete cascade,
  review_scope text not null default 'audit' check (review_scope in ('audit', 'rls', 'release', 'security', 'other')),
  review_status text not null default 'open' check (review_status in ('open', 'completed', 'closed')),
  reviewed_by uuid references public.platform_users(id) on delete set null,
  review_date date,
  findings_json jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ------------------------------------------------------------------
-- Recovery and resilience
-- ------------------------------------------------------------------
create table if not exists public.backup_verification_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  run_scope text not null default 'platform' check (run_scope in ('platform', 'tenant', 'module')),
  module_key text,
  verification_status text not null default 'started' check (verification_status in ('started', 'passed', 'failed', 'partial')),
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  result_json jsonb not null default '{}'::jsonb
);

create table if not exists public.restore_test_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  run_scope text not null default 'platform' check (run_scope in ('platform', 'tenant', 'module')),
  module_key text,
  restore_status text not null default 'started' check (restore_status in ('started', 'passed', 'failed', 'partial')),
  started_by uuid references public.platform_users(id) on delete set null,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  result_json jsonb not null default '{}'::jsonb
);

create table if not exists public.disaster_recovery_exercises (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  exercise_name text not null,
  exercise_scope text not null default 'platform' check (exercise_scope in ('platform', 'tenant', 'module')),
  exercise_status text not null default 'planned' check (exercise_status in ('planned', 'completed', 'cancelled')),
  exercise_date date,
  results_json jsonb not null default '{}'::jsonb,
  lessons_learned text,
  created_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ------------------------------------------------------------------
-- Production readiness views
-- ------------------------------------------------------------------
create or replace view public.v_open_operational_alerts as
select
  oa.tenant_id,
  oa.entity_id,
  oa.module_key,
  oa.alert_code,
  oa.alert_severity,
  oa.alert_status,
  oa.alert_message,
  oa.detected_at
from public.operational_alerts oa
where oa.alert_status in ('open', 'acknowledged');

create or replace view public.v_release_readiness_summary as
select
  rv.id as release_version_id,
  rv.tenant_id,
  rv.release_code,
  rv.release_name,
  rv.release_status,
  count(rt.id) as total_tasks,
  count(case when rt.task_status = 'completed' then 1 end) as completed_tasks,
  count(case when rt.task_status in ('open', 'in_progress', 'blocked') then 1 end) as outstanding_tasks
from public.release_versions rv
left join public.release_checklists rc on rc.release_version_id = rv.id
left join public.release_tasks rt on rt.release_checklist_id = rc.id
group by rv.id, rv.tenant_id, rv.release_code, rv.release_name, rv.release_status;

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------
create index if not exists test_suites_tenant_idx on public.test_suites (tenant_id);
create index if not exists test_runs_tenant_idx on public.test_runs (tenant_id);
create index if not exists test_results_tenant_idx on public.test_results (tenant_id);
create index if not exists release_versions_tenant_idx on public.release_versions (tenant_id);
create index if not exists release_checklists_tenant_idx on public.release_checklists (tenant_id);
create index if not exists release_tasks_tenant_idx on public.release_tasks (tenant_id);
create index if not exists system_health_checks_tenant_idx on public.system_health_checks (tenant_id);
create index if not exists operational_alerts_tenant_idx on public.operational_alerts (tenant_id);
create index if not exists job_run_history_tenant_idx on public.job_run_history (tenant_id);
create index if not exists audit_review_logs_tenant_idx on public.audit_review_logs (tenant_id);
create index if not exists backup_verification_runs_tenant_idx on public.backup_verification_runs (tenant_id);
create index if not exists restore_test_runs_tenant_idx on public.restore_test_runs (tenant_id);
create index if not exists disaster_recovery_exercises_tenant_idx on public.disaster_recovery_exercises (tenant_id);

-- ------------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------------
drop trigger if exists set_updated_at_test_suites on public.test_suites;
create trigger set_updated_at_test_suites before update on public.test_suites
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_release_versions on public.release_versions;
create trigger set_updated_at_release_versions before update on public.release_versions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_release_checklists on public.release_checklists;
create trigger set_updated_at_release_checklists before update on public.release_checklists
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_release_tasks on public.release_tasks;
create trigger set_updated_at_release_tasks before update on public.release_tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_system_health_checks on public.system_health_checks;
create trigger set_updated_at_system_health_checks before update on public.system_health_checks
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_audit_review_logs on public.audit_review_logs;
create trigger set_updated_at_audit_review_logs before update on public.audit_review_logs
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_disaster_recovery_exercises on public.disaster_recovery_exercises;
create trigger set_updated_at_disaster_recovery_exercises before update on public.disaster_recovery_exercises
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Enable RLS
-- ------------------------------------------------------------------
alter table public.test_suites enable row level security;
alter table public.test_runs enable row level security;
alter table public.test_results enable row level security;
alter table public.release_versions enable row level security;
alter table public.release_checklists enable row level security;
alter table public.release_tasks enable row level security;
alter table public.system_health_checks enable row level security;
alter table public.operational_alerts enable row level security;
alter table public.job_run_history enable row level security;
alter table public.audit_review_logs enable row level security;
alter table public.backup_verification_runs enable row level security;
alter table public.restore_test_runs enable row level security;
alter table public.disaster_recovery_exercises enable row level security;

drop policy if exists test_suites_select on public.test_suites;
create policy test_suites_select on public.test_suites
for select to authenticated
using (tenant_id is null or public.has_active_tenant_membership(tenant_id));

drop policy if exists test_runs_select on public.test_runs;
create policy test_runs_select on public.test_runs
for select to authenticated
using (tenant_id is null or public.has_active_tenant_membership(tenant_id));

drop policy if exists test_results_select on public.test_results;
create policy test_results_select on public.test_results
for select to authenticated
using (
  exists (
    select 1 from public.test_runs tr
    where tr.id = test_run_id
      and (tr.tenant_id is null or public.has_active_tenant_membership(tr.tenant_id))
  )
);

drop policy if exists release_versions_select on public.release_versions;
create policy release_versions_select on public.release_versions
for select to authenticated
using (tenant_id is null or public.has_active_tenant_membership(tenant_id));

drop policy if exists release_checklists_select on public.release_checklists;
create policy release_checklists_select on public.release_checklists
for select to authenticated
using (
  exists (
    select 1 from public.release_versions rv
    where rv.id = release_version_id
      and (rv.tenant_id is null or public.has_active_tenant_membership(rv.tenant_id))
  )
);

drop policy if exists release_tasks_select on public.release_tasks;
create policy release_tasks_select on public.release_tasks
for select to authenticated
using (
  exists (
    select 1 from public.release_checklists rc
    join public.release_versions rv on rv.id = rc.release_version_id
    where rc.id = release_checklist_id
      and (rv.tenant_id is null or public.has_active_tenant_membership(rv.tenant_id))
  )
);

drop policy if exists system_health_checks_select on public.system_health_checks;
create policy system_health_checks_select on public.system_health_checks
for select to authenticated
using (tenant_id is null or public.has_active_tenant_membership(tenant_id));

drop policy if exists operational_alerts_select on public.operational_alerts;
create policy operational_alerts_select on public.operational_alerts
for select to authenticated
using (tenant_id is null or public.has_active_tenant_membership(tenant_id));

drop policy if exists job_run_history_select on public.job_run_history;
create policy job_run_history_select on public.job_run_history
for select to authenticated
using (tenant_id is null or public.has_active_tenant_membership(tenant_id));

drop policy if exists audit_review_logs_select on public.audit_review_logs;
create policy audit_review_logs_select on public.audit_review_logs
for select to authenticated
using (tenant_id is null or public.has_active_tenant_membership(tenant_id));

drop policy if exists backup_verification_runs_select on public.backup_verification_runs;
create policy backup_verification_runs_select on public.backup_verification_runs
for select to authenticated
using (tenant_id is null or public.has_active_tenant_membership(tenant_id));

drop policy if exists restore_test_runs_select on public.restore_test_runs;
create policy restore_test_runs_select on public.restore_test_runs
for select to authenticated
using (tenant_id is null or public.has_active_tenant_membership(tenant_id));

drop policy if exists disaster_recovery_exercises_select on public.disaster_recovery_exercises;
create policy disaster_recovery_exercises_select on public.disaster_recovery_exercises
for select to authenticated
using (tenant_id is null or public.has_active_tenant_membership(tenant_id));

-- No client-side mutation policies for hardening and production-readiness tables.
