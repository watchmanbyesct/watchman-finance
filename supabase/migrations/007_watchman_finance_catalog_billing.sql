-- Watchman Finance Migration Pack 007 Products, Services, and Contract Billing v1
-- Target: Supabase Postgres
-- Depends on: Pack 001 Foundation, Pack 002 Integration Staging, Pack 003 AR/AP Core

-- ------------------------------------------------------------------
-- Catalog structure
-- ------------------------------------------------------------------
create table if not exists public.catalog_item_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  category_code text not null,
  category_name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Postgres rejects UNIQUE(...) with expressions on CREATE TABLE; use partial indexes (tenant-wide vs per-entity codes).
create unique index if not exists catalog_item_categories_tenant_wide_uk
  on public.catalog_item_categories (tenant_id, category_code) where entity_id is null;
create unique index if not exists catalog_item_categories_entity_uk
  on public.catalog_item_categories (tenant_id, entity_id, category_code) where entity_id is not null;

create table if not exists public.catalog_item_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  type_code text not null,
  type_name text not null,
  status text not null default 'active' check (status in ('active', 'inactive'))
);

create unique index if not exists catalog_item_types_system_code_uk
  on public.catalog_item_types (type_code) where tenant_id is null;

create unique index if not exists catalog_item_types_tenant_code_uk
  on public.catalog_item_types (tenant_id, type_code) where tenant_id is not null;

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  item_code text not null,
  item_name text not null,
  description text,
  category_id uuid references public.catalog_item_categories(id) on delete set null,
  item_type_id uuid references public.catalog_item_types(id) on delete set null,
  billing_method text not null default 'flat_fee' check (billing_method in (
    'hourly', 'flat_fee', 'per_visit', 'per_incident', 'recurring_monthly', 'quantity'
  )),
  unit_of_measure text not null default 'each',
  is_taxable boolean not null default false,
  is_active boolean not null default true,
  source_system_key text not null default 'manual',
  source_record_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint catalog_items_code_uk unique (tenant_id, item_code)
);

create unique index if not exists catalog_items_source_uk
  on public.catalog_items (tenant_id, source_system_key, source_record_id)
  where source_record_id is not null;

create table if not exists public.catalog_item_account_mappings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  revenue_account_id uuid references public.accounts(id) on delete set null,
  expense_account_id uuid references public.accounts(id) on delete set null,
  payable_account_id uuid references public.accounts(id) on delete set null,
  receivable_account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint catalog_item_account_mappings_uk unique (catalog_item_id)
);

create table if not exists public.catalog_item_prices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  price_name text not null,
  unit_price numeric(14,4) not null,
  effective_start_date date not null,
  effective_end_date date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.customer_item_pricing (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  override_price numeric(14,4) not null,
  effective_start_date date not null,
  effective_end_date date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customer_item_pricing_uk unique (customer_id, catalog_item_id, effective_start_date)
);

create table if not exists public.contract_item_pricing (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  source_contract_id text not null,
  customer_id uuid references public.customers(id) on delete set null,
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  contract_price numeric(14,4) not null,
  effective_start_date date not null,
  effective_end_date date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint contract_item_pricing_uk unique (tenant_id, source_contract_id, catalog_item_id, effective_start_date)
);

-- ------------------------------------------------------------------
-- Bundles and billing rules
-- ------------------------------------------------------------------
create table if not exists public.catalog_bundles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  bundle_code text not null,
  bundle_name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint catalog_bundles_uk unique (tenant_id, bundle_code)
);

create table if not exists public.catalog_bundle_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  bundle_id uuid not null references public.catalog_bundles(id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  quantity numeric(14,2) not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  constraint catalog_bundle_items_uk unique (bundle_id, catalog_item_id)
);

create table if not exists public.billing_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  rule_code text not null,
  rule_name text not null,
  customer_id uuid references public.customers(id) on delete cascade,
  customer_site_id uuid references public.customer_sites(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  billing_trigger text not null default 'manual' check (billing_trigger in (
    'manual', 'service_event', 'shift_completed', 'scheduled_post', 'recurring'
  )),
  billing_frequency text not null default 'one_time' check (billing_frequency in (
    'one_time', 'daily', 'weekly', 'monthly', 'event_driven'
  )),
  rate_source text not null default 'catalog' check (rate_source in (
    'catalog', 'customer_override', 'contract_override', 'manual'
  )),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint billing_rules_uk unique (tenant_id, rule_code)
);

create table if not exists public.contract_rate_cards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  source_contract_id text not null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_site_id uuid references public.customer_sites(id) on delete set null,
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  rate_amount numeric(14,4) not null,
  billing_method text not null default 'hourly' check (billing_method in (
    'hourly', 'flat_fee', 'per_visit', 'per_incident', 'recurring_monthly', 'quantity'
  )),
  effective_start_date date not null,
  effective_end_date date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ------------------------------------------------------------------
-- Billable event and invoice candidate support
-- ------------------------------------------------------------------
create table if not exists public.billable_event_candidates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  source_table text not null,
  source_record_id text not null,
  source_contract_id text,
  customer_id uuid references public.customers(id) on delete set null,
  customer_site_id uuid references public.customer_sites(id) on delete set null,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  quantity numeric(14,2) not null default 1,
  candidate_rate numeric(14,4),
  candidate_amount numeric(14,2),
  candidate_status text not null default 'pending' check (candidate_status in (
    'pending', 'approved', 'converted', 'ignored'
  )),
  candidate_date date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint billable_event_candidates_uk unique (tenant_id, source_table, source_record_id)
);

create table if not exists public.billing_exception_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  source_table text not null,
  source_record_id text not null,
  exception_code text not null,
  exception_message text not null,
  resolution_status text not null default 'open' check (resolution_status in ('open', 'resolved', 'ignored')),
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------
create index if not exists catalog_item_categories_tenant_idx on public.catalog_item_categories (tenant_id);
create index if not exists catalog_items_tenant_idx on public.catalog_items (tenant_id);
create index if not exists catalog_item_prices_tenant_idx on public.catalog_item_prices (tenant_id);
create index if not exists customer_item_pricing_tenant_idx on public.customer_item_pricing (tenant_id);
create index if not exists contract_item_pricing_tenant_idx on public.contract_item_pricing (tenant_id);
create index if not exists billing_rules_tenant_idx on public.billing_rules (tenant_id);
create index if not exists contract_rate_cards_tenant_idx on public.contract_rate_cards (tenant_id);
create index if not exists billable_event_candidates_tenant_idx on public.billable_event_candidates (tenant_id);
create index if not exists billable_event_candidates_status_idx on public.billable_event_candidates (candidate_status);
create index if not exists billing_exception_events_tenant_idx on public.billing_exception_events (tenant_id);

-- ------------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------------
drop trigger if exists set_updated_at_catalog_item_categories on public.catalog_item_categories;
create trigger set_updated_at_catalog_item_categories before update on public.catalog_item_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_catalog_items on public.catalog_items;
create trigger set_updated_at_catalog_items before update on public.catalog_items
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_catalog_item_account_mappings on public.catalog_item_account_mappings;
create trigger set_updated_at_catalog_item_account_mappings before update on public.catalog_item_account_mappings
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_catalog_item_prices on public.catalog_item_prices;
create trigger set_updated_at_catalog_item_prices before update on public.catalog_item_prices
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_customer_item_pricing on public.customer_item_pricing;
create trigger set_updated_at_customer_item_pricing before update on public.customer_item_pricing
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_contract_item_pricing on public.contract_item_pricing;
create trigger set_updated_at_contract_item_pricing before update on public.contract_item_pricing
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_catalog_bundles on public.catalog_bundles;
create trigger set_updated_at_catalog_bundles before update on public.catalog_bundles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_billing_rules on public.billing_rules;
create trigger set_updated_at_billing_rules before update on public.billing_rules
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_contract_rate_cards on public.contract_rate_cards;
create trigger set_updated_at_contract_rate_cards before update on public.contract_rate_cards
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_billable_event_candidates on public.billable_event_candidates;
create trigger set_updated_at_billable_event_candidates before update on public.billable_event_candidates
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Seed item types
-- ------------------------------------------------------------------
insert into public.catalog_item_types (tenant_id, type_code, type_name, status)
values
  (null, 'service', 'Service', 'active'),
  (null, 'product', 'Product', 'active'),
  (null, 'fee', 'Fee', 'active'),
  (null, 'bundle', 'Bundle', 'active'),
  (null, 'adjustment', 'Adjustment', 'active'),
  (null, 'discount', 'Discount', 'active')
on conflict do nothing;

-- ------------------------------------------------------------------
-- Enable RLS
-- ------------------------------------------------------------------
alter table public.catalog_item_categories enable row level security;
alter table public.catalog_items enable row level security;
alter table public.catalog_item_account_mappings enable row level security;
alter table public.catalog_item_prices enable row level security;
alter table public.customer_item_pricing enable row level security;
alter table public.contract_item_pricing enable row level security;
alter table public.catalog_bundles enable row level security;
alter table public.catalog_bundle_items enable row level security;
alter table public.billing_rules enable row level security;
alter table public.contract_rate_cards enable row level security;
alter table public.billable_event_candidates enable row level security;
alter table public.billing_exception_events enable row level security;

drop policy if exists catalog_item_categories_select on public.catalog_item_categories;
create policy catalog_item_categories_select on public.catalog_item_categories
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

drop policy if exists catalog_items_select on public.catalog_items;
create policy catalog_items_select on public.catalog_items
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

drop policy if exists catalog_item_account_mappings_select on public.catalog_item_account_mappings;
create policy catalog_item_account_mappings_select on public.catalog_item_account_mappings
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

drop policy if exists catalog_item_prices_select on public.catalog_item_prices;
create policy catalog_item_prices_select on public.catalog_item_prices
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

drop policy if exists customer_item_pricing_select on public.customer_item_pricing;
create policy customer_item_pricing_select on public.customer_item_pricing
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

drop policy if exists contract_item_pricing_select on public.contract_item_pricing;
create policy contract_item_pricing_select on public.contract_item_pricing
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

drop policy if exists catalog_bundles_select on public.catalog_bundles;
create policy catalog_bundles_select on public.catalog_bundles
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

drop policy if exists catalog_bundle_items_select on public.catalog_bundle_items;
create policy catalog_bundle_items_select on public.catalog_bundle_items
for select to authenticated
using (
  exists (
    select 1
    from public.catalog_bundles cb
    where cb.id = bundle_id
      and public.has_active_tenant_membership(cb.tenant_id)
      and (cb.entity_id is null or public.has_entity_scope(cb.tenant_id, cb.entity_id))
  )
);

drop policy if exists billing_rules_select on public.billing_rules;
create policy billing_rules_select on public.billing_rules
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

drop policy if exists contract_rate_cards_select on public.contract_rate_cards;
create policy contract_rate_cards_select on public.contract_rate_cards
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

drop policy if exists billable_event_candidates_select on public.billable_event_candidates;
create policy billable_event_candidates_select on public.billable_event_candidates
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

drop policy if exists billing_exception_events_select on public.billing_exception_events;
create policy billing_exception_events_select on public.billing_exception_events
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

-- No client-side mutation policies for catalog and billing control tables.
