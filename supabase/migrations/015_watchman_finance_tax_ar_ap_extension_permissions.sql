-- Pack 015: Permissions for Pack 014 tax / AR collections / AP recurring shells + tax module entitlement.
-- Idempotent: safe to re-run after 014.

insert into public.permissions (code, name, is_system) values
  ('tax.profile.manage', 'Manage tax jurisdictions and employer tax profiles', true),
  ('tax.liability.record', 'Record tax liabilities, filings, compliance tasks, and deposit batches', true),
  ('ar.collection.manage', 'Manage AR collection tasks and statement runs', true),
  ('ap.recurring.manage', 'Manage recurring vendor charge templates', true)
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('finance_admin', 'tenant_owner')
  and p.code in (
    'tax.profile.manage',
    'tax.liability.record',
    'ar.collection.manage',
    'ap.recurring.manage'
  )
on conflict (role_id, permission_id) do nothing;

insert into public.tenant_module_entitlements (tenant_id, module_key, is_enabled)
select t.id, 'tax', true
from public.tenants t
on conflict (tenant_id, module_key) do nothing;
