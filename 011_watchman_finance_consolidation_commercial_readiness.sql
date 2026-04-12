-- Watchman Finance Migration Pack 011 Multi-Entity Consolidation and Commercial Readiness v1
-- Target: Supabase Postgres
-- Depends on: Packs 001 through 010

-- ------------------------------------------------------------------
-- Entity relationship and consolidation structure
-- ------------------------------------------------------------------
create table if not exists public.entity_relationships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  parent_entity_id uuid not null references public.entities(id) on delete cascade,
  child_entity_id uuid not null references public.entities(id) on delete cascade,
  relationship_type text not null default 'subsidiary' check (relationship_type in (
    'subsidiary', 'division', 'branch_entity', 'managed_entity', 'intercompany'
  )),
  ownership_percentage numeric(7,4),
  effective_start_date date,
  effective_end_date date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint entity_relationships_uk unique (tenant_id, parent_entity_id, child_entity_id, effective_start_date)
);

create table if not exists public.consolidation_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  group_code text not null,
  group_name text not null,
  consolidation_currency text not null default 'USD',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint consolidation_groups_uk unique (tenant_id, group_code)
);

create table if not exists public.consolidation_group_entities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  consolidation_group_id uuid not null references public.consolidation_groups(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  inclusion_status text not null default 'included' check (inclusion_status in ('included', 'excluded')),
  created_at timestamptz not null default timezone('utc', now()),
  constraint consolidation_group_entities_uk unique (consolidation_group_id, entity_id)
);

create table if not exists public.consolidation_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  consolidation_group_id uuid not null references public.consolidation_groups(id) on delete cascade,
  snapshot_date date not null,
  snapshot_status text not null default 'generated' check (snapshot_status in ('generated', 'published', 'archived')),
  snapshot_json jsonb not null default '{}'::jsonb,
  generated_by uuid references public.platform_users(id) on delete set null,
  generated_at timestamptz not null default timezone('utc', now()),
  published_at timestamptz,
  constraint consolidation_snapshots_uk unique (consolidation_group_id, snapshot_date)
);

-- ------------------------------------------------------------------
-- Intercompany support
-- ------------------------------------------------------------------
create table if not exists public.intercompany_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  counterparty_entity_id uuid not null references public.entities(id) on delete cascade,
  receivable_account_id uuid references public.accounts(id) on delete set null,
  payable_account_id uuid references public.accounts(id) on delete set null,
  revenue_account_id uuid references public.accounts(id) on delete set null,
  expense_account_id uuid references public.accounts(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint intercompany_accounts_uk unique (entity_id, counterparty_entity_id)
);

create table if not exists public.intercompany_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_entity_id uuid not null references public.entities(id) on delete cascade,
  counterparty_entity_id uuid not null references public.entities(id) on delete cascade,
  transaction_code text not null,
  transaction_type text not null default 'chargeback' check (transaction_type in (
    'chargeback', 'reimbursement', 'shared_service', 'allocation', 'other'
  )),
  transaction_status text not null default 'draft' check (transaction_status in (
    'draft', 'approved', 'posted', 'settled', 'void'
  )),
  transaction_date date,
  amount numeric(14,2) not null default 0,
  memo text,
  created_by uuid references public.platform_users(id) on delete set null,
  approved_by uuid references public.platform_users(id) on delete set null,
  approved_at timestamptz,
  posted_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint intercompany_transactions_uk unique (tenant_id, transaction_code)
);

-- ------------------------------------------------------------------
-- Commercial readiness and tenant provisioning
-- ------------------------------------------------------------------
create table if not exists public.tenant_provisioning_templates (
  id uuid primary key default gen_random_uuid(),
  template_code text not null unique,
  template_name text not null,
  template_status text not null default 'active' check (template_status in ('active', 'inactive')),
  template_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tenant_bootstrap_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  provisioning_template_id uuid references public.tenant_provisioning_templates(id) on delete set null,
  bootstrap_status text not null default 'started' check (bootstrap_status in ('started', 'completed', 'failed', 'partial')),
  run_notes text,
  started_by uuid references public.platform_users(id) on delete set null,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  result_json jsonb not null default '{}'::jsonb
);

create table if not exists public.feature_flag_definitions (
  id uuid primary key default gen_random_uuid(),
  flag_key text not null unique,
  flag_name text not null,
  flag_category text not null default 'platform' check (flag_category in ('platform', 'finance', 'billing', 'payroll', 'inventory', 'reporting', 'planning')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tenant_feature_flags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  feature_flag_definition_id uuid not null references public.feature_flag_definitions(id) on delete cascade,
  enabled boolean not null default false,
  enabled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenant_feature_flags_uk unique (tenant_id, feature_flag_definition_id)
);

create table if not exists public.tenant_activation_checklists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  checklist_name text not null,
  activation_status text not null default 'open' check (activation_status in ('open', 'in_progress', 'completed', 'archived')),
  created_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tenant_activation_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tenant_activation_checklist_id uuid not null references public.tenant_activation_checklists(id) on delete cascade,
  task_code text not null,
  task_name text not null,
  task_status text not null default 'open' check (task_status in ('open', 'in_progress', 'completed', 'blocked')),
  assigned_to uuid references public.platform_users(id) on delete set null,
  completed_by uuid references public.platform_users(id) on delete set null,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenant_activation_tasks_uk unique (tenant_activation_checklist_id, task_code)
);

create table if not exists public.client_portal_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  portal_status text not null default 'inactive' check (portal_status in ('inactive', 'active', 'suspended')),
  allow_invoice_view boolean not null default true,
  allow_statement_view boolean not null default true,
  allow_payment_submission boolean not null default false,
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint client_portal_profiles_uk unique (tenant_id, customer_id)
);

-- ------------------------------------------------------------------
-- View layer for consolidation support
-- ------------------------------------------------------------------
create or replace view public.v_consolidation_entity_list as
select
  cge.tenant_id,
  cge.consolidation_group_id,
  cg.group_code,
  cg.group_name,
  cge.entity_id,
  e.code as entity_code,
  e.display_name as entity_name,
  cge.inclusion_status
from public.consolidation_group_entities cge
join public.consolidation_groups cg on cg.id = cge.consolidation_group_id
join public.entities e on e.id = cge.entity_id;

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------
create index if not exists entity_relationships_tenant_idx on public.entity_relationships (tenant_id);
create index if not exists consolidation_groups_tenant_idx on public.consolidation_groups (tenant_id);
create index if not exists consolidation_group_entities_tenant_idx on public.consolidation_group_entities (tenant_id);
create index if not exists consolidation_snapshots_tenant_idx on public.consolidation_snapshots (tenant_id);
create index if not exists intercompany_accounts_tenant_idx on public.intercompany_accounts (tenant_id);
create index if not exists intercompany_transactions_tenant_idx on public.intercompany_transactions (tenant_id);
create index if not exists tenant_bootstrap_runs_tenant_idx on public.tenant_bootstrap_runs (tenant_id);
create index if not exists tenant_feature_flags_tenant_idx on public.tenant_feature_flags (tenant_id);
create index if not exists tenant_activation_checklists_tenant_idx on public.tenant_activation_checklists (tenant_id);
create index if not exists tenant_activation_tasks_tenant_idx on public.tenant_activation_tasks (tenant_id);
create index if not exists client_portal_profiles_tenant_idx on public.client_portal_profiles (tenant_id);

-- ------------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------------
drop trigger if exists set_updated_at_entity_relationships on public.entity_relationships;
create trigger set_updated_at_entity_relationships before update on public.entity_relationships
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_consolidation_groups on public.consolidation_groups;
create trigger set_updated_at_consolidation_groups before update on public.consolidation_groups
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_intercompany_accounts on public.intercompany_accounts;
create trigger set_updated_at_intercompany_accounts before update on public.intercompany_accounts
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_intercompany_transactions on public.intercompany_transactions;
create trigger set_updated_at_intercompany_transactions before update on public.intercompany_transactions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_tenant_provisioning_templates on public.tenant_provisioning_templates;
create trigger set_updated_at_tenant_provisioning_templates before update on public.tenant_provisioning_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_feature_flag_definitions on public.feature_flag_definitions;
create trigger set_updated_at_feature_flag_definitions before update on public.feature_flag_definitions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_tenant_feature_flags on public.tenant_feature_flags;
create trigger set_updated_at_tenant_feature_flags before update on public.tenant_feature_flags
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_tenant_activation_checklists on public.tenant_activation_checklists;
create trigger set_updated_at_tenant_activation_checklists before update on public.tenant_activation_checklists
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_tenant_activation_tasks on public.tenant_activation_tasks;
create trigger set_updated_at_tenant_activation_tasks before update on public.tenant_activation_tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_client_portal_profiles on public.client_portal_profiles;
create trigger set_updated_at_client_portal_profiles before update on public.client_portal_profiles
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Enable RLS
-- ------------------------------------------------------------------
alter table public.entity_relationships enable row level security;
alter table public.consolidation_groups enable row level security;
alter table public.consolidation_group_entities enable row level security;
alter table public.consolidation_snapshots enable row level security;
alter table public.intercompany_accounts enable row level security;
alter table public.intercompany_transactions enable row level security;
alter table public.tenant_bootstrap_runs enable row level security;
alter table public.tenant_feature_flags enable row level security;
alter table public.tenant_activation_checklists enable row level security;
alter table public.tenant_activation_tasks enable row level security;
alter table public.client_portal_profiles enable row level security;

drop policy if exists entity_relationships_select on public.entity_relationships;
create policy entity_relationships_select on public.entity_relationships
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists consolidation_groups_select on public.consolidation_groups;
create policy consolidation_groups_select on public.consolidation_groups
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists consolidation_group_entities_select on public.consolidation_group_entities;
create policy consolidation_group_entities_select on public.consolidation_group_entities
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists consolidation_snapshots_select on public.consolidation_snapshots;
create policy consolidation_snapshots_select on public.consolidation_snapshots
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists intercompany_accounts_select on public.intercompany_accounts;
create policy intercompany_accounts_select on public.intercompany_accounts
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, entity_id));

drop policy if exists intercompany_transactions_select on public.intercompany_transactions;
create policy intercompany_transactions_select on public.intercompany_transactions
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and public.has_entity_scope(tenant_id, source_entity_id));

drop policy if exists tenant_bootstrap_runs_select on public.tenant_bootstrap_runs;
create policy tenant_bootstrap_runs_select on public.tenant_bootstrap_runs
for select to authenticated
using (tenant_id is null or public.has_active_tenant_membership(tenant_id));

drop policy if exists tenant_feature_flags_select on public.tenant_feature_flags;
create policy tenant_feature_flags_select on public.tenant_feature_flags
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists tenant_activation_checklists_select on public.tenant_activation_checklists;
create policy tenant_activation_checklists_select on public.tenant_activation_checklists
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists tenant_activation_tasks_select on public.tenant_activation_tasks;
create policy tenant_activation_tasks_select on public.tenant_activation_tasks
for select to authenticated
using (
  exists (
    select 1 from public.tenant_activation_checklists tac
    where tac.id = tenant_activation_checklist_id
      and public.has_active_tenant_membership(tac.tenant_id)
  )
);

drop policy if exists client_portal_profiles_select on public.client_portal_profiles;
create policy client_portal_profiles_select on public.client_portal_profiles
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

-- No client-side mutation policies for consolidation, provisioning, and commercialization tables.
