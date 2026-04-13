-- Watchman Finance Migration Pack 023 — Permissions for Packs 019–022 workflow surfaces (UI + server actions)
-- Depends on: Pack 013 (roles/permissions pattern), through 022

insert into public.permissions (code, name, is_system) values
  ('finance.evidence.document.manage', 'Register and manage finance evidence document metadata', true),
  ('finance.approval.request.manage', 'Create, submit, and resolve finance approval requests', true),
  ('finance.trial_balance.snapshot.manage', 'Create and update GL trial balance snapshot cache rows', true),
  ('finance.webhook.delivery.manage', 'View and record API idempotency / webhook delivery diagnostics', true)
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('finance_admin', 'tenant_owner')
  and p.code in (
    'finance.evidence.document.manage',
    'finance.approval.request.manage',
    'finance.trial_balance.snapshot.manage',
    'finance.webhook.delivery.manage'
  )
on conflict (role_id, permission_id) do nothing;
