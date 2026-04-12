# Watchman Finance Pack 006 Notes

Included:
- bank accounts
- bank transactions
- reconciliations
- reconciliation lines
- transfer requests
- receipt matching
- starter select-only RLS policies
- starter banking and treasury server actions

What is intentionally simplified in this pack:
- no live bank API connector yet
- import flow is generic, not parser-specific
- no ACH batch release yet
- reconciliation difference logic is basic
- no journal posting from treasury actions yet
- no advanced cash forecasting yet

Recommended next after Pack 006:
1. Pack 007 Products, Services, and Contract Billing
2. Add bank import UI and reconciliation workspace
3. Add AR receipt matching UI
4. Add cash position and treasury dashboard queries
