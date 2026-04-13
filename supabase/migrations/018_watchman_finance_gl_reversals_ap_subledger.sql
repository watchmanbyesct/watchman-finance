-- Watchman Finance Migration Pack 018 — GL reversals (void / payroll reverse), AP subledger domain & bindings
-- Depends on: 017 (entity_gl_account_bindings, gl_subledger_postings)

-- ------------------------------------------------------------------
-- Extend semantic binding keys for AP → GL
-- ------------------------------------------------------------------
alter table public.entity_gl_account_bindings drop constraint if exists entity_gl_account_bindings_binding_key_check;
alter table public.entity_gl_account_bindings add constraint entity_gl_account_bindings_binding_key_check check (binding_key in (
  'ar_receivable',
  'ar_revenue',
  'ar_cash_clearing',
  'payroll_expense',
  'payroll_liability',
  'ap_payable',
  'ap_expense',
  'ap_cash_clearing'
));

-- ------------------------------------------------------------------
-- Extend subledger trace for AP and reversal events
-- ------------------------------------------------------------------
alter table public.gl_subledger_postings drop constraint if exists gl_subledger_postings_source_domain_check;
alter table public.gl_subledger_postings add constraint gl_subledger_postings_source_domain_check check (source_domain in ('ar', 'payroll', 'ap'));

alter table public.gl_subledger_postings drop constraint if exists gl_subledger_postings_source_event_check;
alter table public.gl_subledger_postings add constraint gl_subledger_postings_source_event_check check (source_event in (
  'invoice_issue',
  'invoice_issue_void',
  'invoice_payment',
  'invoice_payment_void',
  'payroll_finalize',
  'payroll_finalize_reversal',
  'bill_approve',
  'bill_approve_void',
  'bill_payment'
));

-- ------------------------------------------------------------------
-- Payroll run reversal permission
-- ------------------------------------------------------------------
insert into public.permissions (code, name, is_system) values
  ('payroll.run.reverse', 'Reverse a finalized payroll run (status + GL reversal)', true)
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('finance_admin', 'tenant_owner')
  and p.code = 'payroll.run.reverse'
on conflict (role_id, permission_id) do nothing;
