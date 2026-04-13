# Watchman Finance — Coverage audit (dual key)

**Sources:** `watchman_finance_module_ownership_and_schema_v1.md` §6 (core modules) and `watchman_finance_master_implementation_index_packs_001_012.md` (per-pack main outputs).  
**Codebase snapshot:** Next.js app under `app/(finance)/finance/`, `modules/*/actions/`, `lib/finance/read-queries.ts`, `supabase/migrations/00*_*.sql` (includes **014–015** tax / AR–AP extensions).  
**Legend — Schema:** **Y** = tables/views appear in repo migrations for this concern; **P** = partial (some objects exist, not the full doc list); **N** = not found in migrations reviewed for this line item.  
**Legend — UI:** **Shell** = list and/or form + server action wiring exists for at least one primary workflow; **Partial** = some sub-entities covered, major gaps; **None** = no dedicated route found.  
**Legend — Actions:** **Y** = dedicated server actions module exists with relevant mutations; **P** = partial; **N** = none / read-only pages only.

> This audit does **not** verify that Supabase has applied every migration in a live project—only that artifacts exist in the repository.

---

## A. Key: `watchman_finance_module_ownership_and_schema_v1.md` §6

| § | Module (doc) | Representative doc objects | Schema | UI | Actions |
|---|----------------|---------------------------|--------|----|--------|
| 6.1 | Foundation & governance | tenants, entities, branches, departments, locations, cost centers, roles, audit logs, settings/feature flags | **Y** (001 foundation; 011 feature flags / tenant flags) | **Partial** (org under integration; GL accounts/periods/journals; admin path `/admin` out of scope here) | **P** (`platform`, `finance-core`, permissions in lib) |
| 6.2 | General ledger | accounts, journals, periods, close controls, balances, ledger reporting | **Y** (001/002 scope + reporting close) | **Partial** (`/finance/accounts`, `periods`, `journals` — depth varies) | **P** (`finance-core-actions`) |
| 6.3 | Accounts receivable | customers, sites, invoices, lines, payments, credit memos, statements, collections | **Y** (003 + **014** `ar_statement_runs`, `ar_collection_tasks`) | **Shell** (003 core + **014** `/finance/ar/statements`, `/finance/ar/collections`) | **Y** (`ar-actions` — credit memos, **statement runs**, **collection tasks**) |
| 6.4 | Accounts payable | vendors, bills, lines, payments, recurring expenses, approvals | **Y** (003 + **014** `ap_recurring_vendor_charges`) | **Shell** (vendors, bills, payments + **014** `/finance/ap/recurring`) | **Y** (`ap-actions` — includes **recurring charges**) |
| 6.5 | Banking & reconciliation | accounts, transactions, deposits, transfers, reconciliation sessions/lines | **Y** (006) | **Shell** (`/finance/banking/*`, hub) | **Y** (`banking-actions`) |
| 6.6 | Payroll | profiles, groups, periods, runs, items, earnings/deductions, employer tax, statements, DD batches | **Y** (004 — not every doc table name) | **Shell** (`/finance/payroll/*`, hub) | **Y** (`payroll-actions`) |
| 6.7 | Leave & accruals | types, policies, accrual rules, profiles, balances, requests, adjustments, liability snapshots | **Y** (005) | **Shell** (`/finance/leave/*`, hub) | **Y** (`leave-actions`) |
| 6.8 | Tax & statutory | jurisdictions, employee/employer tax profiles, liabilities, calendar, compliance, filing | **P** (`employee_tax_profiles` in 004; **014** adds `tax_jurisdictions`, employer profiles, liabilities, filing periods, compliance tasks, `direct_deposit_batches` / items — not a full statutory calendar engine) | **Shell** (`/finance/tax/*` hub and workflows) | **Y** (`tax-actions`) |
| 6.9 | Products & services | catalog, pricing, overrides, categories, mappings | **Y** (007/008 related) | **Shell** (`/finance/catalog/*`, pricing) | **Y** (`catalog-actions`) |
| 6.10 | Contract billing & profitability | rules, source events, invoice jobs, labor cost, margin, exceptions | **Y** (007) | **Shell** (`/finance/billing/*`, hub) | **Y** (`billing-actions`) |
| 6.11 | Inventory & assets | items, categories, stock, locations, assets, assignments, damage, valuation | **Y** (008) | **Shell** (`/finance/inventory/*`, hub) | **Y** (`inventory-actions`) |
| 6.12 | Budgeting & forecasting | budget/forecast versions & lines, drivers, scenarios, variance | **Y** (010) | **Shell** (`/finance/planning/*`, `planning-hub`) | **Y** (`planning-actions`) |
| 6.13 | Reporting & analytics | financial statements, dashboards, payroll/AR/AP/contract/executive reports | **Y** (009 views + defs) | **Shell** (`/finance/reporting/*`, `reporting-hub`) | **Y** (`reporting-actions`) |

**Cross-cutting (doc §6 not a single heading):** Consolidation & commercial (Pack 011) and Operations/QA (Pack 012) align with **§5 multi-entity / production** themes more than a single §6 row — see section B.

---

## B. Key: `watchman_finance_master_implementation_index_packs_001_012.md` (main outputs)

| Pack | Doc “main outputs” (abridged) | Schema in repo | UI shells | Server actions |
|------|------------------------------|------------------|-----------|----------------|
| 001 | Tenancy, entity, security, CoA, fiscal periods, RLS, audit | **Y** (`001_*.sql`) | **Partial** (accounts, periods, journals; not every governance screen) | **P** |
| 002 | Integration registry, sync, staging, mappings, `finance_people`… | **Y** (`002_*.sql`) | **Shell** (`/finance/integration/*`, hub) | **Y** (`integration-actions`, `org-structure-actions`) |
| 003 | Customers, vendors, invoices, payments, credit memos, bills… | **Y** | **Shell** (core AR/AP + customer sites, credit memos; **014** adds statements, collections, recurring AP) | **Y** (`ar-actions`, `ap-actions`) |
| 004 | Pay groups, periods, profiles, tax profiles, runs, statements… | **Y** | **Shell** | **Y** (`payroll-actions`) |
| 005 | Leave types, policies, requests, balances, liability… | **Y** | **Shell** | **Y** (`leave-actions`) |
| 006 | Bank accounts, transactions, reconciliations, transfers, receipt matches | **Y** | **Shell** | **Y** (`banking-actions`) |
| 007 | Catalog, pricing, billing rules, candidates, exceptions | **Y** | **Shell** (`catalog-billing` hub) | **Y** (`catalog-actions`, `billing-actions`) |
| 008 | Categories, locations, items, stock, assets, issues… | **Y** | **Shell** (`inventory-assets` hub) | **Y** (`inventory-actions`) |
| 009 | Report/dashboard/KPI defs, snapshots, close checklists/tasks, views | **Y** | **Shell** (`reporting-hub`) | **Y** (`reporting-actions`) |
| 010 | Budget/forecast versions & lines, approvals, scenario inputs, variance | **Y** | **Shell** (`planning-hub`) | **P** (variance snapshot shell; full scenario engine not implied) |
| 011 | Entity relationships, consolidation, IC, provisioning, bootstrap, flags, activation, portal | **Y** | **Shell** (`consolidation-commercial-hub`) | **Y** (`consolidation-actions`) |
| 012 | Test suites/runs/results, releases & checklists/tasks, health, alerts, jobs, backup/restore, DR | **Y** | **Shell** (`operations-hub`) | **Y** (`operations-actions`) |
| 013 | Module permissions & entitlements for 007–012 modules | **Y** | **Shell** (`/finance/pack-013` hub + links from module hubs) | **N** (enforced in existing `*-actions` modules) |
| 014 | Tax shells, direct deposit batches, AR statement runs & collection tasks, AP recurring vendor charges | **Y** (`014_*.sql`) | **Shell** (`/finance/tax/*`, `/finance/ar/statements`, `/finance/ar/collections`, `/finance/ap/recurring`) | **Y** (`tax-actions`, `ar-actions`, `ap-actions`) |
| 015 | Permissions `tax.*`, `ar.collection.manage`, `ap.recurring.manage`; `tax` module entitlement | **Y** (`015_*.sql`) | **Shell** (`/finance/pack-015` hub documents connected routes) | **N** (no separate actions module; enforced in `tax-actions` / `ar-actions` / `ap-actions`) |

---

## C. Gaps called out by the master index §9 (“no pack complete until…”)

| Criterion | Repo status (high level) |
|-----------|-------------------------|
| SQL migration per pack | **Present** for 001–012 under `supabase/migrations/`. |
| RLS verified | **Not audited** in this pass (requires DB policy review + tests). |
| Server actions + permissions + audit | **Pattern exists** across modules; **coverage uneven** per §6 gaps (e.g. tax, credit memos). |
| Test coverage for critical workflows | **Not assessed** here (`*.test.*` / CI not enumerated). |

---

## D. How to use this audit

1. **Product roadmap:** Use column **§6** for stakeholder language (“AR statements still None”).  
2. **Engineering backlog:** Use column **Pack** to batch work by migration dependency.  
3. **Next file to maintain:** Re-run this matrix when adding routes under `app/(finance)/finance/` or migrations `013+`.
