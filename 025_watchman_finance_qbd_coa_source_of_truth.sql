-- Watchman Finance Migration Pack 025 — QBD-style Chart of Accounts + source-of-truth mapping
-- Target: Supabase Postgres
-- Depends on: Pack 001 (accounts), Pack 017 (entity_gl_account_bindings)

-- ------------------------------------------------------------------
-- Extend Chart of Accounts to mimic QuickBooks Desktop taxonomy
-- ------------------------------------------------------------------
alter table public.accounts
  add column if not exists qbd_account_type text,
  add column if not exists qbd_detail_type text,
  add column if not exists source_of_truth text not null default 'gl_manual',
  add column if not exists source_reference_table text,
  add column if not exists external_account_ref text;

alter table public.accounts
  drop constraint if exists accounts_qbd_account_type_check;
alter table public.accounts
  add constraint accounts_qbd_account_type_check check (
    qbd_account_type is null or qbd_account_type in (
      'bank',
      'accounts_receivable',
      'other_current_asset',
      'fixed_asset',
      'other_asset',
      'accounts_payable',
      'credit_card',
      'other_current_liability',
      'long_term_liability',
      'equity',
      'income',
      'cogs',
      'expense',
      'other_income',
      'other_expense'
    )
  );

alter table public.accounts
  drop constraint if exists accounts_source_of_truth_check;
alter table public.accounts
  add constraint accounts_source_of_truth_check check (
    source_of_truth in (
      'gl_manual',
      'bank_register',
      'ar_subledger',
      'ap_subledger',
      'payroll_subledger',
      'inventory_subledger',
      'tax_subledger',
      'system'
    )
  );

create index if not exists accounts_source_of_truth_idx on public.accounts (source_of_truth);
create index if not exists accounts_qbd_account_type_idx on public.accounts (qbd_account_type);

-- ------------------------------------------------------------------
-- Backfill sensible defaults for legacy rows
-- ------------------------------------------------------------------
update public.accounts
set qbd_account_type = case
  when qbd_account_type is not null then qbd_account_type
  when code = '1000' then 'bank'
  when code = '1100' then 'accounts_receivable'
  when code = '1200' then 'other_current_asset'
  when code = '1300' then 'other_current_asset'
  when code = '1500' then 'fixed_asset'
  when code = '2000' then 'accounts_payable'
  when code = '2100' then 'other_current_liability'
  when code = '2200' then 'other_current_liability'
  when code = '2500' then 'long_term_liability'
  when code = '3000' then 'equity'
  when code = '4000' then 'income'
  when code = '5000' then 'cogs'
  when code = '6000' then 'expense'
  when code = '6100' then 'expense'
  when code = '7000' then 'other_income'
  when code = '8000' then 'other_expense'
  when account_type = 'asset' then 'other_current_asset'
  when account_type = 'liability' then 'other_current_liability'
  when account_type = 'equity' then 'equity'
  when account_type = 'revenue' then 'income'
  when account_type = 'expense' then 'expense'
  else null
end;

update public.accounts
set source_of_truth = case
  when source_of_truth is not null and source_of_truth <> 'gl_manual' then source_of_truth
  when code = '1000' then 'bank_register'
  when code = '1100' then 'ar_subledger'
  when code = '1200' then 'ar_subledger'
  when code = '2000' then 'ap_subledger'
  when code = '2200' then 'payroll_subledger'
  when code = '4000' then 'ar_subledger'
  when code = '5000' then 'ap_subledger'
  when code = '6100' then 'payroll_subledger'
  else 'gl_manual'
end;

comment on column public.accounts.qbd_account_type is
  'QuickBooks Desktop-style account type classification.';
comment on column public.accounts.qbd_detail_type is
  'QuickBooks Desktop detail type (free text for flexibility).';
comment on column public.accounts.source_of_truth is
  'Primary subsystem that should originate transactions for this account.';
