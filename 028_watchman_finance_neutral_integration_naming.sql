-- Watchman Finance Migration Pack 028 — Neutral integration naming (schema + OAuth tables)
-- Target: Supabase Postgres
-- Depends on: 002 (integration_systems), 024 (qbo_oauth_*), 025 (accounts), 027 (account_categories)

-- Integration catalog row (Pack 002 seed may still use legacy key until updated here)
update public.integration_systems
set
  system_key = 'external_accounting_oauth',
  display_name = 'External accounting (OAuth)'
where system_key = 'quickbooks_online';

-- OAuth state + credentials (service_role only)
alter table if exists public.qbo_oauth_states rename to accounting_oauth_states;
alter index if exists qbo_oauth_states_expires_idx rename to accounting_oauth_states_expires_idx;

alter table if exists public.qbo_oauth_credentials rename to accounting_oauth_credentials;
alter index if exists qbo_oauth_credentials_realm_idx rename to accounting_oauth_credentials_realm_idx;
alter table public.accounting_oauth_credentials
  rename constraint qbo_oauth_credentials_tenant_uk to accounting_oauth_credentials_tenant_uk;

drop trigger if exists set_updated_at_qbo_oauth_credentials on public.accounting_oauth_credentials;
create trigger set_updated_at_accounting_oauth_credentials
  before update on public.accounting_oauth_credentials
  for each row execute function public.set_updated_at();

revoke all on public.accounting_oauth_states from public;
revoke all on public.accounting_oauth_credentials from public;
grant select, insert, update, delete on public.accounting_oauth_states to service_role;
grant select, insert, update, delete on public.accounting_oauth_credentials to service_role;

-- Chart of accounts: integration taxonomy columns
alter table public.accounts rename column qbd_account_type to integration_account_type;
alter table public.accounts rename column qbd_detail_type to integration_detail_type;
alter index if exists accounts_qbd_account_type_idx rename to accounts_integration_account_type_idx;
alter table public.accounts
  rename constraint accounts_qbd_account_type_check to accounts_integration_account_type_check;

comment on column public.accounts.integration_account_type is
  'External ERP / integration account taxonomy classification.';
comment on column public.accounts.integration_detail_type is
  'Integration-specific detail subtype (free text).';

-- Account categories
alter table public.account_categories rename column qbd_account_type to integration_account_type;
alter table public.account_categories
  rename constraint account_categories_qbd_account_type_check to account_categories_integration_account_type_check;

comment on column public.account_categories.integration_account_type is
  'Default integration taxonomy for new GL accounts in this category.';
