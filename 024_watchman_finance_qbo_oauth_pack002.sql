-- Watchman Finance Migration Pack 024 — QuickBooks Online OAuth (Pack 002 extension)
-- Target: Supabase Postgres
-- Depends on: Pack 001 (tenants, platform_users), Pack 002 (integration_systems)

-- ------------------------------------------------------------------
-- Short-lived OAuth CSRF / session binding (server exchanges code using service role)
-- ------------------------------------------------------------------
create table if not exists public.qbo_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state text not null unique,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  platform_user_id uuid not null references public.platform_users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null
);

create index if not exists qbo_oauth_states_expires_idx on public.qbo_oauth_states (expires_at);

-- ------------------------------------------------------------------
-- Stored QBO tokens (service_role only — never expose to PostgREST anon/authenticated)
-- ------------------------------------------------------------------
create table if not exists public.qbo_oauth_credentials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  realm_id text not null,
  company_name text,
  access_token text not null,
  refresh_token text not null,
  access_token_expires_at timestamptz not null,
  refresh_token_expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint qbo_oauth_credentials_tenant_uk unique (tenant_id)
);

create index if not exists qbo_oauth_credentials_realm_idx on public.qbo_oauth_credentials (realm_id);

drop trigger if exists set_updated_at_qbo_oauth_credentials on public.qbo_oauth_credentials;
create trigger set_updated_at_qbo_oauth_credentials before update on public.qbo_oauth_credentials
for each row execute function public.set_updated_at();

alter table public.qbo_oauth_states enable row level security;
alter table public.qbo_oauth_credentials enable row level security;

-- No policies: default deny for authenticated/anon. Service role bypasses RLS for API routes.

revoke all on public.qbo_oauth_states from public;
revoke all on public.qbo_oauth_credentials from public;
grant select, insert, update, delete on public.qbo_oauth_states to service_role;
grant select, insert, update, delete on public.qbo_oauth_credentials to service_role;
