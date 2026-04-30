-- Watchman Finance Migration Pack 028 — Neutral integration naming (schema + OAuth tables)
-- Target: Supabase Postgres
-- Depends on: 002 (integration_systems), 024 (qbo_oauth_*), 025 (accounts), 027 (account_categories)

-- Integration catalog row (Pack 002 seed may still use legacy key until updated here)
update public.integration_systems
set
  system_key = 'external_accounting_oauth',
  name = 'External accounting (OAuth)',
  updated_at = timezone('utc', now())
where system_key = 'quickbooks_online';

-- OAuth state + credentials (service_role only)
do $$
begin
  if to_regclass('public.accounting_oauth_states') is null
     and to_regclass('public.qbo_oauth_states') is not null then
    execute 'alter table public.qbo_oauth_states rename to accounting_oauth_states';
  end if;
end $$;

do $$
begin
  if to_regclass('public.accounting_oauth_states_expires_idx') is null
     and to_regclass('public.qbo_oauth_states_expires_idx') is not null then
    execute 'alter index public.qbo_oauth_states_expires_idx rename to accounting_oauth_states_expires_idx';
  end if;
end $$;

do $$
begin
  if to_regclass('public.accounting_oauth_credentials') is null
     and to_regclass('public.qbo_oauth_credentials') is not null then
    execute 'alter table public.qbo_oauth_credentials rename to accounting_oauth_credentials';
  end if;
end $$;

do $$
begin
  if to_regclass('public.accounting_oauth_credentials_realm_idx') is null
     and to_regclass('public.qbo_oauth_credentials_realm_idx') is not null then
    execute 'alter index public.qbo_oauth_credentials_realm_idx rename to accounting_oauth_credentials_realm_idx';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'accounting_oauth_credentials'
      and constraint_name = 'qbo_oauth_credentials_tenant_uk'
  ) then
    execute 'alter table public.accounting_oauth_credentials rename constraint qbo_oauth_credentials_tenant_uk to accounting_oauth_credentials_tenant_uk';
  end if;
end $$;

drop trigger if exists set_updated_at_qbo_oauth_credentials on public.accounting_oauth_credentials;
drop trigger if exists set_updated_at_accounting_oauth_credentials on public.accounting_oauth_credentials;
create trigger set_updated_at_accounting_oauth_credentials
  before update on public.accounting_oauth_credentials
  for each row execute function public.set_updated_at();

revoke all on public.accounting_oauth_states from public;
revoke all on public.accounting_oauth_credentials from public;
grant select, insert, update, delete on public.accounting_oauth_states to service_role;
grant select, insert, update, delete on public.accounting_oauth_credentials to service_role;

-- Chart of accounts: integration taxonomy columns
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'accounts' and column_name = 'qbd_account_type'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'accounts' and column_name = 'integration_account_type'
  ) then
    execute 'alter table public.accounts rename column qbd_account_type to integration_account_type';
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'accounts' and column_name = 'qbd_detail_type'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'accounts' and column_name = 'integration_detail_type'
  ) then
    execute 'alter table public.accounts rename column qbd_detail_type to integration_detail_type';
  end if;
end $$;

do $$
begin
  if to_regclass('public.accounts_integration_account_type_idx') is null
     and to_regclass('public.accounts_qbd_account_type_idx') is not null then
    execute 'alter index public.accounts_qbd_account_type_idx rename to accounts_integration_account_type_idx';
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='accounts' and constraint_name='accounts_qbd_account_type_check'
  ) and not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='accounts' and constraint_name='accounts_integration_account_type_check'
  ) then
    execute 'alter table public.accounts rename constraint accounts_qbd_account_type_check to accounts_integration_account_type_check';
  end if;
end $$;

comment on column public.accounts.integration_account_type is
  'External ERP / integration account taxonomy classification.';
comment on column public.accounts.integration_detail_type is
  'Integration-specific detail subtype (free text).';

-- Account categories
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'account_categories' and column_name = 'qbd_account_type'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'account_categories' and column_name = 'integration_account_type'
  ) then
    execute 'alter table public.account_categories rename column qbd_account_type to integration_account_type';
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='account_categories' and constraint_name='account_categories_qbd_account_type_check'
  ) and not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='account_categories' and constraint_name='account_categories_integration_account_type_check'
  ) then
    execute 'alter table public.account_categories rename constraint account_categories_qbd_account_type_check to account_categories_integration_account_type_check';
  end if;
end $$;

comment on column public.account_categories.integration_account_type is
  'Default integration taxonomy for new GL accounts in this category.';
