-- Watchman Finance Migration Pack 022 — API idempotency keys + outbound webhook delivery log (integrations hardening)
-- Target: Supabase Postgres
-- Depends on: Pack 001, through 021

-- ------------------------------------------------------------------
-- Idempotency: dedupe inbound API / Edge writes per tenant + client key (response cached as JSON text)
-- ------------------------------------------------------------------
create table if not exists public.finance_api_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  idempotency_key text not null,
  route_key text not null,
  request_hash text,
  response_http_status integer,
  response_body_json jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  constraint finance_api_idempotency_keys_uk unique (tenant_id, idempotency_key, route_key)
);

create index if not exists finance_api_idempotency_keys_tenant_idx on public.finance_api_idempotency_keys (tenant_id);
create index if not exists finance_api_idempotency_keys_expires_idx on public.finance_api_idempotency_keys (expires_at);

-- ------------------------------------------------------------------
-- Webhook delivery attempts (outbound notifications to tenant-configured HTTPS endpoints)
-- ------------------------------------------------------------------
create table if not exists public.finance_webhook_delivery_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  webhook_key text not null,
  event_type text not null,
  destination_url_host text not null,
  payload_digest text,
  delivery_status text not null default 'pending' check (delivery_status in (
    'pending', 'sending', 'delivered', 'failed', 'abandoned'
  )),
  attempt_count integer not null default 0,
  last_http_status integer,
  last_error text,
  next_retry_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists finance_webhook_delivery_log_tenant_idx on public.finance_webhook_delivery_log (tenant_id);
create index if not exists finance_webhook_delivery_log_status_idx on public.finance_webhook_delivery_log (tenant_id, delivery_status);

drop trigger if exists set_updated_at_finance_webhook_delivery_log on public.finance_webhook_delivery_log;
create trigger set_updated_at_finance_webhook_delivery_log before update on public.finance_webhook_delivery_log
for each row execute function public.set_updated_at();

alter table public.finance_api_idempotency_keys enable row level security;
alter table public.finance_webhook_delivery_log enable row level security;

drop policy if exists finance_api_idempotency_keys_select on public.finance_api_idempotency_keys;
create policy finance_api_idempotency_keys_select on public.finance_api_idempotency_keys
for select using (public.has_active_tenant_membership(tenant_id));

drop policy if exists finance_webhook_delivery_log_select on public.finance_webhook_delivery_log;
create policy finance_webhook_delivery_log_select on public.finance_webhook_delivery_log
for select using (public.has_active_tenant_membership(tenant_id));
