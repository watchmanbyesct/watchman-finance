-- Watchman Finance Migration Pack 008 Inventory and Asset Control v1
-- Target: Supabase Postgres
-- Depends on: Pack 001 Foundation, Pack 003 AR/AP Core, Pack 007 Catalog and Billing

-- ------------------------------------------------------------------
-- Inventory master
-- ------------------------------------------------------------------
create table if not exists public.inventory_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  category_code text not null,
  category_name text not null,
  category_type text not null default 'inventory' check (category_type in ('inventory', 'asset', 'supply', 'uniform', 'equipment', 'other')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists inventory_categories_tenant_wide_uk
  on public.inventory_categories (tenant_id, category_code) where entity_id is null;
create unique index if not exists inventory_categories_entity_uk
  on public.inventory_categories (tenant_id, entity_id, category_code) where entity_id is not null;

create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  location_code text not null,
  location_name text not null,
  location_type text not null default 'warehouse' check (location_type in ('warehouse', 'office', 'vehicle', 'site', 'other')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists inventory_locations_tenant_wide_uk
  on public.inventory_locations (tenant_id, location_code) where entity_id is null;
create unique index if not exists inventory_locations_entity_uk
  on public.inventory_locations (tenant_id, entity_id, location_code) where entity_id is not null;

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  item_code text not null,
  item_name text not null,
  description text,
  inventory_category_id uuid references public.inventory_categories(id) on delete set null,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  tracking_mode text not null default 'quantity' check (tracking_mode in ('quantity', 'serial', 'asset')),
  unit_of_measure text not null default 'each',
  reorder_point numeric(14,2),
  reorder_quantity numeric(14,2),
  standard_cost numeric(14,4),
  replacement_cost numeric(14,4),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inventory_items_code_uk unique (tenant_id, item_code)
);

create table if not exists public.inventory_vendor_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  vendor_item_code text,
  vendor_unit_cost numeric(14,4),
  preferred_vendor boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inventory_vendor_items_uk unique (inventory_item_id, vendor_id)
);

create table if not exists public.inventory_gl_mappings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  asset_account_id uuid references public.accounts(id) on delete set null,
  expense_account_id uuid references public.accounts(id) on delete set null,
  shrinkage_account_id uuid references public.accounts(id) on delete set null,
  writeoff_account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inventory_gl_mappings_uk unique (inventory_item_id)
);

create table if not exists public.inventory_stock_balances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  inventory_location_id uuid not null references public.inventory_locations(id) on delete cascade,
  quantity_on_hand numeric(14,2) not null default 0,
  quantity_available numeric(14,2) not null default 0,
  quantity_reserved numeric(14,2) not null default 0,
  total_value numeric(14,2) not null default 0,
  last_counted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inventory_stock_balances_uk unique (inventory_item_id, inventory_location_id)
);

-- ------------------------------------------------------------------
-- Stock movement
-- ------------------------------------------------------------------
create table if not exists public.inventory_receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  inventory_location_id uuid not null references public.inventory_locations(id) on delete restrict,
  receipt_number text not null,
  receipt_status text not null default 'draft' check (receipt_status in ('draft', 'received', 'void')),
  receipt_date date,
  source_bill_id uuid references public.bills(id) on delete set null,
  notes text,
  created_by uuid references public.platform_users(id) on delete set null,
  received_by uuid references public.platform_users(id) on delete set null,
  received_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inventory_receipts_number_uk unique (tenant_id, receipt_number)
);

create table if not exists public.inventory_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  inventory_receipt_id uuid not null references public.inventory_receipts(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  line_number integer not null,
  quantity_received numeric(14,2) not null default 0,
  unit_cost numeric(14,4) not null default 0,
  line_value numeric(14,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint inventory_receipt_lines_uk unique (inventory_receipt_id, line_number)
);

create table if not exists public.inventory_transfers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  from_location_id uuid not null references public.inventory_locations(id) on delete restrict,
  to_location_id uuid not null references public.inventory_locations(id) on delete restrict,
  quantity_transferred numeric(14,2) not null,
  transfer_status text not null default 'draft' check (transfer_status in ('draft', 'approved', 'completed', 'void')),
  transfer_date date,
  notes text,
  requested_by uuid references public.platform_users(id) on delete set null,
  approved_by uuid references public.platform_users(id) on delete set null,
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  inventory_location_id uuid not null references public.inventory_locations(id) on delete restrict,
  quantity_delta numeric(14,2) not null,
  adjustment_reason text not null,
  adjustment_status text not null default 'draft' check (adjustment_status in ('draft', 'approved', 'posted', 'void')),
  effective_date date,
  notes text,
  created_by uuid references public.platform_users(id) on delete set null,
  approved_by uuid references public.platform_users(id) on delete set null,
  approved_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inventory_count_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  inventory_location_id uuid not null references public.inventory_locations(id) on delete restrict,
  session_name text not null,
  count_status text not null default 'draft' check (count_status in ('draft', 'in_progress', 'completed', 'posted')),
  count_date date,
  created_by uuid references public.platform_users(id) on delete set null,
  completed_by uuid references public.platform_users(id) on delete set null,
  completed_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inventory_count_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  inventory_count_session_id uuid not null references public.inventory_count_sessions(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  counted_quantity numeric(14,2) not null default 0,
  system_quantity numeric(14,2) not null default 0,
  variance_quantity numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint inventory_count_lines_uk unique (inventory_count_session_id, inventory_item_id)
);

-- ------------------------------------------------------------------
-- Asset control and employee issue/return
-- ------------------------------------------------------------------
create table if not exists public.equipment_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  asset_tag text not null,
  serial_number text,
  asset_status text not null default 'in_stock' check (asset_status in ('in_stock', 'issued', 'in_repair', 'lost', 'damaged', 'retired')),
  condition_status text not null default 'new' check (condition_status in ('new', 'good', 'fair', 'damaged', 'retired')),
  current_location_id uuid references public.inventory_locations(id) on delete set null,
  purchase_date date,
  purchase_cost numeric(14,2),
  replacement_cost numeric(14,2),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint equipment_assets_tag_uk unique (tenant_id, asset_tag)
);

create table if not exists public.equipment_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  equipment_asset_id uuid not null references public.equipment_assets(id) on delete cascade,
  finance_person_id uuid references public.finance_people(id) on delete set null,
  assigned_location_id uuid references public.inventory_locations(id) on delete set null,
  assigned_to_type text not null default 'employee' check (assigned_to_type in ('employee', 'location', 'vehicle', 'other')),
  assignment_status text not null default 'active' check (assignment_status in ('active', 'returned', 'void')),
  issue_date date,
  due_return_date date,
  return_date date,
  issued_by uuid references public.platform_users(id) on delete set null,
  returned_by uuid references public.platform_users(id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.equipment_condition_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  equipment_asset_id uuid not null references public.equipment_assets(id) on delete cascade,
  condition_status text not null check (condition_status in ('new', 'good', 'fair', 'damaged', 'retired')),
  notes text,
  logged_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.equipment_incidents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  equipment_asset_id uuid references public.equipment_assets(id) on delete set null,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  incident_type text not null check (incident_type in ('lost', 'damaged', 'stolen', 'repair', 'writeoff', 'other')),
  incident_status text not null default 'open' check (incident_status in ('open', 'reviewed', 'resolved', 'void')),
  incident_date date,
  reported_by uuid references public.platform_users(id) on delete set null,
  description text,
  estimated_cost numeric(14,2),
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.employee_item_issues (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  finance_person_id uuid not null references public.finance_people(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  issue_quantity numeric(14,2) not null default 1,
  issue_status text not null default 'issued' check (issue_status in ('issued', 'returned', 'void')),
  issue_date date,
  return_due_date date,
  issued_by uuid references public.platform_users(id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.employee_item_returns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  employee_item_issue_id uuid not null references public.employee_item_issues(id) on delete cascade,
  return_quantity numeric(14,2) not null default 1,
  condition_status text not null default 'good' check (condition_status in ('new', 'good', 'fair', 'damaged', 'missing')),
  returned_by uuid references public.platform_users(id) on delete set null,
  return_date date,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.employee_issue_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  finance_person_id uuid not null references public.finance_people(id) on delete cascade,
  employee_item_issue_id uuid references public.employee_item_issues(id) on delete set null,
  equipment_assignment_id uuid references public.equipment_assignments(id) on delete set null,
  acknowledgment_type text not null default 'issue_receipt' check (acknowledgment_type in ('issue_receipt', 'return_obligation', 'damage_notice', 'other')),
  acknowledged_at timestamptz not null default timezone('utc', now()),
  acknowledgment_text text,
  metadata_json jsonb not null default '{}'::jsonb
);

create table if not exists public.inventory_reorder_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  inventory_location_id uuid references public.inventory_locations(id) on delete cascade,
  reorder_point numeric(14,2) not null,
  reorder_quantity numeric(14,2) not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inventory_reorder_rules_uk unique (inventory_item_id, inventory_location_id)
);

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------
create index if not exists inventory_items_tenant_idx on public.inventory_items (tenant_id);
create index if not exists inventory_stock_balances_tenant_idx on public.inventory_stock_balances (tenant_id);
create index if not exists inventory_receipts_tenant_idx on public.inventory_receipts (tenant_id);
create index if not exists inventory_transfers_tenant_idx on public.inventory_transfers (tenant_id);
create index if not exists inventory_adjustments_tenant_idx on public.inventory_adjustments (tenant_id);
create index if not exists inventory_count_sessions_tenant_idx on public.inventory_count_sessions (tenant_id);
create index if not exists equipment_assets_tenant_idx on public.equipment_assets (tenant_id);
create index if not exists equipment_assignments_tenant_idx on public.equipment_assignments (tenant_id);
create index if not exists equipment_incidents_tenant_idx on public.equipment_incidents (tenant_id);
create index if not exists employee_item_issues_tenant_idx on public.employee_item_issues (tenant_id);

-- ------------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------------
drop trigger if exists set_updated_at_inventory_categories on public.inventory_categories;
create trigger set_updated_at_inventory_categories before update on public.inventory_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_inventory_locations on public.inventory_locations;
create trigger set_updated_at_inventory_locations before update on public.inventory_locations
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_inventory_items on public.inventory_items;
create trigger set_updated_at_inventory_items before update on public.inventory_items
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_inventory_vendor_items on public.inventory_vendor_items;
create trigger set_updated_at_inventory_vendor_items before update on public.inventory_vendor_items
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_inventory_gl_mappings on public.inventory_gl_mappings;
create trigger set_updated_at_inventory_gl_mappings before update on public.inventory_gl_mappings
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_inventory_stock_balances on public.inventory_stock_balances;
create trigger set_updated_at_inventory_stock_balances before update on public.inventory_stock_balances
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_inventory_receipts on public.inventory_receipts;
create trigger set_updated_at_inventory_receipts before update on public.inventory_receipts
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_inventory_transfers on public.inventory_transfers;
create trigger set_updated_at_inventory_transfers before update on public.inventory_transfers
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_inventory_adjustments on public.inventory_adjustments;
create trigger set_updated_at_inventory_adjustments before update on public.inventory_adjustments
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_inventory_count_sessions on public.inventory_count_sessions;
create trigger set_updated_at_inventory_count_sessions before update on public.inventory_count_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_equipment_assets on public.equipment_assets;
create trigger set_updated_at_equipment_assets before update on public.equipment_assets
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_equipment_assignments on public.equipment_assignments;
create trigger set_updated_at_equipment_assignments before update on public.equipment_assignments
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_equipment_incidents on public.equipment_incidents;
create trigger set_updated_at_equipment_incidents before update on public.equipment_incidents
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_employee_item_issues on public.employee_item_issues;
create trigger set_updated_at_employee_item_issues before update on public.employee_item_issues
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_inventory_reorder_rules on public.inventory_reorder_rules;
create trigger set_updated_at_inventory_reorder_rules before update on public.inventory_reorder_rules
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Enable RLS
-- ------------------------------------------------------------------
alter table public.inventory_categories enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_vendor_items enable row level security;
alter table public.inventory_gl_mappings enable row level security;
alter table public.inventory_stock_balances enable row level security;
alter table public.inventory_receipts enable row level security;
alter table public.inventory_receipt_lines enable row level security;
alter table public.inventory_transfers enable row level security;
alter table public.inventory_adjustments enable row level security;
alter table public.inventory_count_sessions enable row level security;
alter table public.inventory_count_lines enable row level security;
alter table public.equipment_assets enable row level security;
alter table public.equipment_assignments enable row level security;
alter table public.equipment_condition_logs enable row level security;
alter table public.equipment_incidents enable row level security;
alter table public.employee_item_issues enable row level security;
alter table public.employee_item_returns enable row level security;
alter table public.employee_issue_acknowledgments enable row level security;
alter table public.inventory_reorder_rules enable row level security;

drop policy if exists inventory_categories_select on public.inventory_categories;
create policy inventory_categories_select on public.inventory_categories
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists inventory_locations_select on public.inventory_locations;
create policy inventory_locations_select on public.inventory_locations
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists inventory_items_select on public.inventory_items;
create policy inventory_items_select on public.inventory_items
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists inventory_vendor_items_select on public.inventory_vendor_items;
create policy inventory_vendor_items_select on public.inventory_vendor_items
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists inventory_gl_mappings_select on public.inventory_gl_mappings;
create policy inventory_gl_mappings_select on public.inventory_gl_mappings
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists inventory_stock_balances_select on public.inventory_stock_balances;
create policy inventory_stock_balances_select on public.inventory_stock_balances
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists inventory_receipts_select on public.inventory_receipts;
create policy inventory_receipts_select on public.inventory_receipts
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists inventory_receipt_lines_select on public.inventory_receipt_lines;
create policy inventory_receipt_lines_select on public.inventory_receipt_lines
for select to authenticated
using (
  exists (
    select 1 from public.inventory_receipts ir
    where ir.id = inventory_receipt_id
      and public.has_active_tenant_membership(ir.tenant_id)
      and (ir.entity_id is null or public.has_entity_scope(ir.tenant_id, ir.entity_id))
  )
);

drop policy if exists inventory_transfers_select on public.inventory_transfers;
create policy inventory_transfers_select on public.inventory_transfers
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists inventory_adjustments_select on public.inventory_adjustments;
create policy inventory_adjustments_select on public.inventory_adjustments
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists inventory_count_sessions_select on public.inventory_count_sessions;
create policy inventory_count_sessions_select on public.inventory_count_sessions
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists inventory_count_lines_select on public.inventory_count_lines;
create policy inventory_count_lines_select on public.inventory_count_lines
for select to authenticated
using (
  exists (
    select 1 from public.inventory_count_sessions ics
    where ics.id = inventory_count_session_id
      and public.has_active_tenant_membership(ics.tenant_id)
      and (ics.entity_id is null or public.has_entity_scope(ics.tenant_id, ics.entity_id))
  )
);

drop policy if exists equipment_assets_select on public.equipment_assets;
create policy equipment_assets_select on public.equipment_assets
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists equipment_assignments_select on public.equipment_assignments;
create policy equipment_assignments_select on public.equipment_assignments
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists equipment_condition_logs_select on public.equipment_condition_logs;
create policy equipment_condition_logs_select on public.equipment_condition_logs
for select to authenticated
using (
  exists (
    select 1 from public.equipment_assets ea
    where ea.id = equipment_asset_id
      and public.has_active_tenant_membership(ea.tenant_id)
      and (ea.entity_id is null or public.has_entity_scope(ea.tenant_id, ea.entity_id))
  )
);

drop policy if exists equipment_incidents_select on public.equipment_incidents;
create policy equipment_incidents_select on public.equipment_incidents
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists employee_item_issues_select on public.employee_item_issues;
create policy employee_item_issues_select on public.employee_item_issues
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists employee_item_returns_select on public.employee_item_returns;
create policy employee_item_returns_select on public.employee_item_returns
for select to authenticated
using (
  exists (
    select 1 from public.employee_item_issues eii
    where eii.id = employee_item_issue_id
      and public.has_active_tenant_membership(eii.tenant_id)
      and (eii.entity_id is null or public.has_entity_scope(eii.tenant_id, eii.entity_id))
  )
);

drop policy if exists employee_issue_acknowledgments_select on public.employee_issue_acknowledgments;
create policy employee_issue_acknowledgments_select on public.employee_issue_acknowledgments
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

drop policy if exists inventory_reorder_rules_select on public.inventory_reorder_rules;
create policy inventory_reorder_rules_select on public.inventory_reorder_rules
for select to authenticated
using (public.has_active_tenant_membership(tenant_id) and (entity_id is null or public.has_entity_scope(tenant_id, entity_id)));

-- No client-side mutation policies for inventory and asset control tables.
