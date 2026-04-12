-- Watchman Finance Migration Pack 006 Banking and Reconciliation v1
-- Target: Supabase Postgres
-- Depends on: Pack 001 Foundation, Pack 003 AR/AP Core, Pack 004 Payroll Core

-- ------------------------------------------------------------------
-- Bank accounts and transactions
-- ------------------------------------------------------------------
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  account_name text not null,
  bank_name text not null,
  account_type text not null check (account_type in ('operating', 'payroll', 'tax', 'savings', 'other')),
  account_number_last4 text,
  routing_number_last4 text,
  currency_code text not null default 'USD',
  is_active boolean not null default true,
  allow_incoming boolean not null default true,
  allow_outgoing boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  transaction_date date not null,
  posted_date date,
  transaction_type text not null check (transaction_type in ('debit', 'credit', 'fee', 'transfer', 'other')),
  amount numeric(14,2) not null,
  description text not null,
  reference_number text,
  source_type text not null default 'import' check (source_type in ('import', 'manual', 'system')),
  match_status text not null default 'unmatched' check (match_status in ('unmatched', 'matched', 'partially_matched', 'ignored')),
  statement_cycle_key text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ------------------------------------------------------------------
-- Reconciliation
-- ------------------------------------------------------------------
create table if not exists public.reconciliations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  reconciliation_name text not null,
  statement_start_date date not null,
  statement_end_date date not null,
  statement_ending_balance numeric(14,2) not null,
  book_ending_balance numeric(14,2) not null default 0,
  unreconciled_difference numeric(14,2) not null default 0,
  reconciliation_status text not null default 'draft' check (reconciliation_status in ('draft', 'in_review', 'approved', 'closed')),
  prepared_by uuid references public.platform_users(id) on delete set null,
  prepared_at timestamptz,
  approved_by uuid references public.platform_users(id) on delete set null,
  approved_at timestamptz,
  closed_by uuid references public.platform_users(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint reconciliations_account_range_uk unique (bank_account_id, statement_start_date, statement_end_date)
);

create table if not exists public.reconciliation_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reconciliation_id uuid not null references public.reconciliations(id) on delete cascade,
  bank_transaction_id uuid references public.bank_transactions(id) on delete set null,
  line_status text not null default 'open' check (line_status in ('open', 'matched', 'adjusted', 'ignored')),
  matched_amount numeric(14,2) not null default 0,
  adjustment_reason text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint reconciliation_lines_recon_transaction_uk unique (reconciliation_id, bank_transaction_id)
);

-- ------------------------------------------------------------------
-- Treasury and transfer controls
-- ------------------------------------------------------------------
create table if not exists public.transfer_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  from_bank_account_id uuid not null references public.bank_accounts(id) on delete restrict,
  to_bank_account_id uuid not null references public.bank_accounts(id) on delete restrict,
  requested_amount numeric(14,2) not null,
  transfer_date date,
  transfer_status text not null default 'draft' check (transfer_status in ('draft', 'submitted', 'approved', 'released', 'void')),
  request_reason text,
  requested_by uuid references public.platform_users(id) on delete set null,
  requested_at timestamptz,
  approved_by uuid references public.platform_users(id) on delete set null,
  approved_at timestamptz,
  released_by uuid references public.platform_users(id) on delete set null,
  released_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.receipt_matches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  bank_transaction_id uuid not null references public.bank_transactions(id) on delete cascade,
  invoice_payment_id uuid references public.invoice_payments(id) on delete set null,
  vendor_payment_id uuid references public.vendor_payments(id) on delete set null,
  match_amount numeric(14,2) not null,
  match_status text not null default 'matched' check (match_status in ('matched', 'reversed')),
  created_by uuid references public.platform_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------
create index if not exists bank_accounts_tenant_idx on public.bank_accounts (tenant_id);
create index if not exists bank_accounts_entity_idx on public.bank_accounts (entity_id);
create index if not exists bank_transactions_tenant_idx on public.bank_transactions (tenant_id);
create index if not exists bank_transactions_account_idx on public.bank_transactions (bank_account_id);
create index if not exists bank_transactions_match_status_idx on public.bank_transactions (match_status);
create index if not exists reconciliations_tenant_idx on public.reconciliations (tenant_id);
create index if not exists reconciliations_account_idx on public.reconciliations (bank_account_id);
create index if not exists reconciliations_status_idx on public.reconciliations (reconciliation_status);
create index if not exists reconciliation_lines_tenant_idx on public.reconciliation_lines (tenant_id);
create index if not exists transfer_requests_tenant_idx on public.transfer_requests (tenant_id);
create index if not exists transfer_requests_status_idx on public.transfer_requests (transfer_status);
create index if not exists receipt_matches_tenant_idx on public.receipt_matches (tenant_id);
create index if not exists receipt_matches_transaction_idx on public.receipt_matches (bank_transaction_id);

-- ------------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------------
drop trigger if exists set_updated_at_bank_accounts on public.bank_accounts;
create trigger set_updated_at_bank_accounts before update on public.bank_accounts
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_bank_transactions on public.bank_transactions;
create trigger set_updated_at_bank_transactions before update on public.bank_transactions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_reconciliations on public.reconciliations;
create trigger set_updated_at_reconciliations before update on public.reconciliations
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_transfer_requests on public.transfer_requests;
create trigger set_updated_at_transfer_requests before update on public.transfer_requests
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Enable RLS
-- ------------------------------------------------------------------
alter table public.bank_accounts enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.reconciliations enable row level security;
alter table public.reconciliation_lines enable row level security;
alter table public.transfer_requests enable row level security;
alter table public.receipt_matches enable row level security;

drop policy if exists bank_accounts_select on public.bank_accounts;
create policy bank_accounts_select on public.bank_accounts
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists bank_transactions_select on public.bank_transactions;
create policy bank_transactions_select on public.bank_transactions
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists reconciliations_select on public.reconciliations;
create policy reconciliations_select on public.reconciliations
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists reconciliation_lines_select on public.reconciliation_lines;
create policy reconciliation_lines_select on public.reconciliation_lines
for select to authenticated
using (
  exists (
    select 1
    from public.reconciliations r
    where r.id = reconciliation_id
      and public.has_active_tenant_membership(r.tenant_id)
      and public.has_entity_scope(r.tenant_id, r.entity_id)
  )
);

drop policy if exists transfer_requests_select on public.transfer_requests;
create policy transfer_requests_select on public.transfer_requests
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

drop policy if exists receipt_matches_select on public.receipt_matches;
create policy receipt_matches_select on public.receipt_matches
for select to authenticated
using (
  public.has_active_tenant_membership(tenant_id)
  and public.has_entity_scope(tenant_id, entity_id)
);

-- No client-side mutation policies for banking and treasury tables.
