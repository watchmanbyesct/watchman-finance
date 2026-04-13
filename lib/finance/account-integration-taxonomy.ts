/** Pack 025 — must match DB check constraints on public.accounts.integration_account_type */

export const SOURCE_OF_TRUTH_VALUES = [
  "gl_manual",
  "bank_register",
  "ar_subledger",
  "ap_subledger",
  "payroll_subledger",
  "inventory_subledger",
  "tax_subledger",
  "system",
] as const;

export type SourceOfTruth = (typeof SOURCE_OF_TRUTH_VALUES)[number];

export const INTEGRATION_ACCOUNT_TYPE_VALUES = [
  "bank",
  "accounts_receivable",
  "other_current_asset",
  "fixed_asset",
  "other_asset",
  "accounts_payable",
  "credit_card",
  "other_current_liability",
  "long_term_liability",
  "equity",
  "income",
  "cogs",
  "expense",
  "other_income",
  "other_expense",
] as const;

export type IntegrationAccountType = (typeof INTEGRATION_ACCOUNT_TYPE_VALUES)[number];
