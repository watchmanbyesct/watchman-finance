# Watchman Finance

Financial operating system for the Watchman ecosystem.

Built for EST Holdings / ESCT. Multi-tenant and multi-entity from day one.

---

## Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | Next.js 14 App Router + TypeScript |
| Styling     | Tailwind CSS                      |
| Backend     | Supabase (Postgres + Auth + RLS)  |
| Deployment  | Vercel                            |
| Source      | GitHub                            |

---

## First-Time Setup

### 1. Clone the repo

```bash
git clone https://github.com/watchmanbyesct/watchman-finance.git
cd watchman-finance
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Create a Supabase project

Create a new project at [supabase.com](https://supabase.com).
Copy the project URL, anon key, and service role key into `.env.local`.

### 5. Apply Pack 001 migration

In the Supabase Dashboard SQL Editor, paste and run:
```
supabase/migrations/001_watchman_finance_foundation.sql
```

Or via CLI:
```bash
npx supabase db push --project-ref YOUR_PROJECT_REF
```

### 6. Run the greenfield bootstrap

```bash
npm run greenfield:bootstrap -- \
  --email=oshepard@esctroc.com \
  --password='YourPassword!' \
  --name='Owens Shepard'
```

This creates the EST Holdings tenant, ESCT entity, seeds all roles,
permissions, module entitlements, and account categories.

### 7. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

---

## Architecture

```
app/
  (platform)/admin/       # Tenant, module, user admin screens
  (finance)/finance/      # All finance module screens
  api/                    # Route handlers for integrations, exports, webhooks
  login/                  # Auth
  auth/callback/          # Supabase OAuth callback

components/
  layout/                 # Sidebar, topbar
  shared/                 # Forms, badges, cards
  finance/                # Module-specific components

lib/
  auth/                   # Session resolution
  context/                # Request context (tenant, entity, permissions)
  permissions/            # Permission and scope enforcement
  audit/                  # Audit log writer
  db/                     # Supabase server and admin clients
  errors/                 # Typed error codes and result mapper

modules/                  # Business logic per finance domain
  finance-core/           # Tenant bootstrap, entity, accounts, periods
  ar/                     # Invoices, payments, customers
  ap/                     # Bills, vendors, payments
  payroll/                # Pay profiles, runs, statements
  leave/                  # Leave types, policies, balances
  banking/                # Accounts, reconciliation
  catalog/                # Items, pricing
  billing/                # Billing rules, candidates, exceptions
  inventory/              # Items, stock, assets
  reporting/              # Report generation
  planning/               # Budgets, forecasts
  consolidation/          # Multi-entity consolidation
  integration/            # Launch and Operations sync

types/                    # Shared domain types

supabase/
  migrations/             # 12 migration packs (001 through 012)
  functions/              # Edge functions

scripts/
  bootstrap.cjs           # greenfield:bootstrap seed script
```

---

## Module Build Order

Follow the pack sequence exactly. Do not build transactional UI
before the foundation schema is stable and RLS-tested.

| Wave | Packs       | Scope                                              |
|------|-------------|----------------------------------------------------|
| 1    | 001, 002    | Platform foundation, integration backbone          |
| 2    | 003-006     | AR, AP, Payroll, Leave, Banking                    |
| 3    | 007, 008    | Catalog, Billing, Inventory, Assets                |
| 4    | 009, 010    | Reporting, Budgeting, Forecasting                  |
| 5    | 011, 012    | Consolidation, Hardening, Production readiness     |

---

## Key Rules

1. Sensitive finance mutations never use direct browser CRUD.
2. Every server action must resolve context, check permissions, and write an audit log.
3. Every table must be scoped by `tenant_id`. Entity-financial tables also require `entity_id`.
4. Migrations run in strict sequence. Never skip a pack.
5. No module UI is released until RLS is verified for that module.

---

## Watchman Ecosystem

| Product             | Role                                      |
|---------------------|-------------------------------------------|
| Watchman Launch     | Employee master, onboarding, training     |
| Watchman Operations | Scheduling, timekeeping, service delivery |
| Watchman Finance    | Accounting, payroll, AR/AP, reporting     |

Finance consumes data from Launch and Operations.
It does not replace them.
