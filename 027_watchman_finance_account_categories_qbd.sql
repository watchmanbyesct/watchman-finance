-- Watchman Finance Migration Pack 027 — QBD-aligned account category metadata
-- Target: Supabase Postgres
-- Depends on: Pack 001 (account_categories)

alter table public.account_categories
  add column if not exists qbd_account_type text;

alter table public.account_categories
  drop constraint if exists account_categories_qbd_account_type_check;

alter table public.account_categories
  add constraint account_categories_qbd_account_type_check check (
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

comment on column public.account_categories.qbd_account_type is
  'QuickBooks Desktop account type for defaulting new GL accounts in this category.';
