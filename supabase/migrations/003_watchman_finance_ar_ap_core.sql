-- Watchman Finance Migration Pack 003 AR and AP Core v1
-- Target: Supabase Postgres
-- Depends on: Pack 001 Foundation, Pack 002 Integration Staging

-- ------------------------------------------------------------------
-- Customer and vendor support tables
-- ------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  customer_code text not null,
  legal_name text not null,
  display_name text not null,
  customer_status text not null default 'active' check (customer_status in ('active', 'inactive')),
  billing_email text,
  billing_phone text,
  payment_terms_days integer not null default 30,
  source_system_key text not null default 'watchman_launch',
  source_record_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customers_tenant_code_uk unique (tenant_id, customer_code)
);

create unique index if not exists customers_source_uk
  on public.customers (tenant_id, source_system_key, source_record_id)
  where source_record_id is not null;

create table if not exists public.customer_sites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  site_code text not null,
  site_name text not null,
  address_json jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customer_sites_customer_code_uk unique (customer_id, site_code)
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  vendor_code text not null,
  legal_name text not null,
  display_name text not null,
  vendor_status text not null default 'active' check (vendor_status in ('active', 'inactive')),
  remit_email text,
  remit_phone text,
  payment_terms_days integer not null default 30,
  source_system_key text not null default 'manual',
  source_record_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint vendors_tenant_code_uk unique (tenant_id, vendor_code)
);

create unique index if not exists vendors_source_uk
  on public.vendors (tenant_id, source_system_key, source_record_id)
  where source_record_id is not null;

-- ------------------------------------------------------------------
-- AR core
-- ------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  customer_site_id uuid references public.customer_sites(id) on delete set null,
  invoice_number text not null,
  invoice_status text not null default 'draft' check (invoice_status in ('draft', 'issued', 'partially_paid', 'paid', 'void')),
  issue_date date,
  due_date date,
  currency_code text not null default 'USD',
  subtotal_amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  balance_due numeric(14,2) not null default 0,
  memo text,
  source_type text not null default 'manual' check (source_type in ('manual', 'contract_billing', 'service_event', 'other')),
  created_by uuid references public.platform_users(id) on delete set null,
  issued_by uuid references public.platform_users(id) on delete set null,
  issued_at timestamptz,
  voided_by uuid references public.platform_users(id) on delete set null,
  voided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint invoices_entity_number_uk unique (entity_id, invoice_number)
);

create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  line_number integer not null,
  line_type text not null default 'service' check (line_type in ('service', 'product', 'fee', 'discount', 'tax', 'adjustment')),
  description text not null,
  quantity numeric(14,2) not null default 1,
  unit_price numeric(14,4) not null default 0,
  line_amount numeric(14,2) not null default 0,
  revenue_account_id uuid references public.accounts(id) on delete set null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint invoice_lines_invoice_line_uk unique (invoice_id, line_number)
);

create table if not exists public.credit_memos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  invoice_id uuid references public.invoices(id) on delete set null,
  memo_number text not null,
  memo_status text not null default 'draft' check (memo_status in ('draft', 'issued', 'applied', 'void')),
  issue_date date,
  total_amount numeric(14,2) not null default 0,
  remaining_amount numeric(14,2) not null default 0,
  reason text,
  created_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint credit_memos_entity_number_uk unique (entity_id, memo_number)
);

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  invoice_id uuid references public.invoices(id) on delete set null,
  payment_reference text,
  payment_method text not null default 'manual' check (payment_method in ('manual', 'ach', 'card', 'check', 'other')),
  payment_date date not null,
  amount_received numeric(14,2) not null,
  amount_applied numeric(14,2) not null default 0,
  unapplied_amount numeric(14,2) not null default 0,
  payment_status text not null default 'recorded' check (payment_status in ('recorded', 'applied', 'reversed')),
  source_system_key text not null default 'manual',
  source_record_id text,
  created_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ------------------------------------------------------------------
-- AP core
-- ------------------------------------------------------------------
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  bill_number text not null,
  vendor_invoice_number text,
  bill_status text not null default 'draft' check (bill_status in ('draft', 'approved', 'posted', 'paid', 'void')),
  bill_date date,
  due_date date,
  currency_code text not null default 'USD',
  subtotal_amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  balance_due numeric(14,2) not null default 0,
  memo text,
  created_by uuid references public.platform_users(id) on delete set null,
  approved_by uuid references public.platform_users(id) on delete set null,
  approved_at timestamptz,
  posted_by uuid references public.platform_users(id) on delete set null,
  posted_at timestamptz,
  voided_by uuid references public.platform_users(id) on delete set null,
  voided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint bills_entity_number_uk unique (entity_id, bill_number)
);

create table if not exists public.bill_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  line_number integer not null,
  description text not null,
  quantity numeric(14,2) not null default 1,
  unit_cost numeric(14,4) not null default 0,
  line_amount numeric(14,2) not null default 0,
  expense_account_id uuid references public.accounts(id) on delete set null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint bill_lines_bill_line_uk unique (bill_id, line_number)
);

create table if not exists public.vendor_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  bill_id uuid references public.bills(id) on delete set null,
  payment_reference text,
  payment_method text not null default 'manual' check (payment_method in ('manual', 'ach', 'check', 'wire', 'other')),
  payment_date date not null,
  amount_paid numeric(14,2) not null,
  amount_applied numeric(14,2) not null default 0,
  unapplied_amount numeric(14,2) not null default 0,
  payment_status text not null default 'recorded' check (payment_status in ('recorded', 'applied', 'reversed')),
  created_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ------------------------------------------------------------------
-- Invoice item source support
-- ------------------------------------------------------------------
create table if not exists public.invoice_item_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_line_id uuid not null references public.invoice_lines(id) on delete cascade,
  source_table text not null,
  source_record_id text not null,
  source_type text not null,
  created_at timestamptz not null default timezone('utc', now())
);

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------
create index if not exists customers_tenant_idx on public.customers (tenant_id);
create index if not exists vendors_tenant_idx on public.vendors (tenant_id);
create index if not exists invoices_tenant_idx on public.invoices (tenant_id);
create index if not exists invoices_entity_idx on public.invoices (entity_id);
create index if not exists invoices_customer_idx on public.invoices (customer_id);
create index if not exists invoices_status_idx on public.invoices (invoice_status);
create index if not exists invoice_payments_tenant_idx on public.invoice_payments (tenant_id);
create index if not exists bills_tenant_idx on public.bills (tenant_id);
create index if not exists bills_entity_idx on public.bills (entity_id);
create index if not exists bills_vendor_idx on public.bills (vendor_id);
create index if not exists bills_status_idx on public.bills (bill_status);
create index if not exists vendor_payments_tenant_idx on public.vendor_payments (tenant_id);

-- ------------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------------
drop trigger if exists set_updated_at_customers on public.customers;
create trigger set_updated_at_customers before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_customer_sites on public.customer_sites;
create trigger set_updated_at_customer_sites before update on public.customer_sites
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_vendors on public.vendors;
create trigger set_updated_at_vendors before update on public.vendors
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_invoices on public.invoices;
create trigger set_updated_at_invoices before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_credit_memos on public.credit_memos;
create trigger set_updated_at_credit_memos before update on public.credit_memos
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_invoice_payments on public.invoice_payments;
create trigger set_updated_at_invoice_payments before update on public.invoice_payments
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_bills on public.bills;
create trigger set_updated_at_bills before update on public.bills
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_vendor_payments on public.vendor_payments;
create trigger set_updated_at_vendor_payments before update on public.vendor_payments
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Enable RLS
-- ------------------------------------------------------------------
alter table public.customers enable row level security;
alter table public.customer_sites enable row level security;
alter table public.vendors enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.credit_memos enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.bills enable row level security;
alter table public.bill_lines enable row level security;
alter table public.vendor_payments enable row level security;
alter table public.invoice_item_sources enable row level security;

drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

drop policy if exists customer_sites_select on public.customer_sites;
create policy customer_sites_select on public.customer_sites
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

drop policy if exists vendors_select on public.vendors;
create policy vendors_select on public.vendors
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and (entity_id is null or public.has_entity_scope(tenant_id, entity_id))
);

drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists invoice_lines_select on public.invoice_lines;
create policy invoice_lines_select on public.invoice_lines
for select to authenticated
using (
  exists (
    select 1
    from public.invoices i
    where i.id = invoice_id
      and public.has_active_tenant_membership(i.tenant_id)
      and public.has_entity_scope(i.tenant_id, i.entity_id)
  )
);

drop policy if exists credit_memos_select on public.credit_memos;
create policy credit_memos_select on public.credit_memos
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists invoice_payments_select on public.invoice_payments;
create policy invoice_payments_select on public.invoice_payments
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists bills_select on public.bills;
create policy bills_select on public.bills
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists bill_lines_select on public.bill_lines;
create policy bill_lines_select on public.bill_lines
for select to authenticated
using (
  exists (
    select 1
    from public.bills b
    where b.id = bill_id
      and public.has_active_tenant_membership(b.tenant_id)
      and public.has_entity_scope(b.tenant_id, b.entity_id)
  )
);

drop policy if exists vendor_payments_select on public.vendor_payments;
create policy vendor_payments_select on public.vendor_payments
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists invoice_item_sources_select on public.invoice_item_sources;
create policy invoice_item_sources_select on public.invoice_item_sources
for select to authenticated
using (public.has_active_tenant_membership(tenant_id));

-- No browser write policies for posted or payment tables.
