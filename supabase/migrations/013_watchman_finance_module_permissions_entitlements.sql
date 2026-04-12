-- Pack 013: Permissions and tenant module entitlements for app modules (Packs 007–012)
-- Idempotent: safe to re-run after packs 001–012.

insert into public.permissions (code, name, is_system) values
  ('catalog.category.manage', 'Manage catalog categories', true),
  ('catalog.item.manage', 'Manage catalog items', true),
  ('catalog.price.manage', 'Manage catalog item prices', true),
  ('billing.rule.manage', 'Manage billing rules', true),
  ('billing.candidate.manage', 'Manage billable event candidates', true),
  ('inventory.category.manage', 'Manage inventory categories', true),
  ('inventory.location.manage', 'Manage inventory locations', true),
  ('inventory.item.manage', 'Manage inventory items', true),
  ('reporting.definition.manage', 'Manage reports, dashboards, and KPI definitions', true),
  ('planning.budget.manage', 'Manage budgets and budget lines', true),
  ('planning.forecast.manage', 'Manage forecasts and forecast lines', true),
  ('consolidation.group.manage', 'Manage consolidation groups and entity relationships', true),
  ('operations.qa.manage', 'Manage QA, releases, and operational readiness records', true)
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('finance_admin', 'tenant_owner')
  and p.code in (
    'catalog.category.manage',
    'catalog.item.manage',
    'catalog.price.manage',
    'billing.rule.manage',
    'billing.candidate.manage',
    'inventory.category.manage',
    'inventory.location.manage',
    'inventory.item.manage',
    'reporting.definition.manage',
    'planning.budget.manage',
    'planning.forecast.manage',
    'consolidation.group.manage',
    'operations.qa.manage'
  )
on conflict (role_id, permission_id) do nothing;

insert into public.tenant_module_entitlements (tenant_id, module_key, is_enabled)
select t.id, m.module_key, true
from public.tenants t
cross join (
  values
    ('catalog'),
    ('billing'),
    ('inventory'),
    ('reporting'),
    ('planning'),
    ('consolidation'),
    ('operations')
) as m(module_key)
on conflict (tenant_id, module_key) do nothing;
