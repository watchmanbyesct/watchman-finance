# Watchman Finance Pack 003 Notes

Included:
- customers and customer sites
- vendors
- invoices and invoice lines
- credit memos
- invoice payments
- bills and bill lines
- vendor payments
- invoice item source tracking
- select-only RLS policies
- starter AR/AP server actions

What is intentionally deferred:
- journal posting from AR/AP
- customer statement generation
- payment application logic beyond basic recording
- bill posting to GL
- void/reversal workflows
- numbering services
- contract-driven invoice generation

Recommended next after Pack 003:
1. Pack 004 Payroll Core
2. Extend customer sync promotion from staged_customers into customers
3. Add invoice and bill UI shell
4. Add AR/AP aging queries and dashboards
