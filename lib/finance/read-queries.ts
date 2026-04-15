/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { createSupabaseServerClient } from "@/lib/db/supabase-server";

function q<T>(data: T[] | null | undefined, err: { message: string } | null): T[] {
  if (err) throw new Error(err.message);
  return data ?? [];
}

export async function listCustomersForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, customer_code, display_name, legal_name, payment_terms_days, created_at")
    .eq("tenant_id", tenantId)
    .order("customer_code");
  return q(data, error);
}

/** Customers usable on entity-scoped AR workflows (entity-specific or tenant-wide). */
export async function listCustomersForEntityScope(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, customer_code, display_name, legal_name, payment_terms_days, created_at")
    .eq("tenant_id", tenantId)
    .or(`entity_id.is.null,entity_id.eq.${entityId}`)
    .order("customer_code");
  return q(data, error);
}

export async function listCustomerSitesForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customer_sites")
    .select("id, customer_id, entity_id, site_code, site_name, status, created_at")
    .eq("tenant_id", tenantId)
    .order("site_code");
  return q(data, error);
}

export async function listCreditMemosForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("credit_memos")
    .select(
      "id, customer_id, invoice_id, memo_number, memo_status, issue_date, total_amount, remaining_amount, created_at"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listTaxJurisdictionsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tax_jurisdictions")
    .select("id, jurisdiction_code, jurisdiction_name, country_code, status, created_at")
    .eq("tenant_id", tenantId)
    .order("jurisdiction_code");
  return q(data, error);
}

export async function listTaxEmployerProfilesForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tax_employer_profiles")
    .select("id, tax_jurisdiction_id, registration_reference, profile_status, effective_date, created_at")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listTaxLiabilitiesForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tax_liabilities")
    .select("id, tax_jurisdiction_id, liability_code, amount, as_of_date, liability_status, created_at")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("as_of_date", { ascending: false });
  return q(data, error);
}

export async function listTaxFilingPeriodsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tax_filing_periods")
    .select("id, tax_jurisdiction_id, period_code, period_start, period_end, filing_due_date, filing_status, created_at")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("period_end", { ascending: false });
  return q(data, error);
}

export async function listTaxComplianceTasksForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tax_compliance_tasks")
    .select("id, task_code, task_name, task_status, due_date, completed_at, created_at")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("due_date", { ascending: true });
  return q(data, error);
}

export async function listDirectDepositBatchesForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("direct_deposit_batches")
    .select("id, payroll_run_id, batch_status, notes, created_at")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listDirectDepositBatchItemsForBatch(tenantId: string, batchId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("direct_deposit_batch_items")
    .select("id, employee_pay_profile_id, amount, trace_reference, sort_order, created_at")
    .eq("tenant_id", tenantId)
    .eq("direct_deposit_batch_id", batchId)
    .order("sort_order");
  return q(data, error);
}

export async function listDirectDepositBatchItemsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data: batches, error: be } = await supabase
    .from("direct_deposit_batches")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId);
  if (be) throw new Error(be.message);
  const ids = (batches ?? []).map((b: { id: string }) => b.id);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("direct_deposit_batch_items")
    .select("id, direct_deposit_batch_id, employee_pay_profile_id, amount, trace_reference, sort_order, created_at")
    .eq("tenant_id", tenantId)
    .in("direct_deposit_batch_id", ids)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listArStatementRunsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ar_statement_runs")
    .select("id, customer_id, statement_through_date, output_format, run_status, created_at")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listArCollectionTasksForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ar_collection_tasks")
    .select("id, customer_id, case_code, subject, task_status, priority, created_at")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listApRecurringVendorChargesForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ap_recurring_vendor_charges")
    .select("id, vendor_id, charge_code, amount_estimate, cadence, next_expected_date, is_active, created_at")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("charge_code");
  return q(data, error);
}

export async function listInvoicesForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, customer_id, invoice_number, invoice_status, issue_date, due_date, total_amount, balance_due, created_at"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listInvoicePaymentsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoice_payments")
    .select(
      "id, customer_id, invoice_id, payment_date, payment_method, amount_received, amount_applied, payment_status, payment_reference"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("payment_date", { ascending: false });
  return q(data, error);
}

export async function listVendorsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("id, vendor_code, display_name, legal_name, payment_terms_days, created_at")
    .eq("tenant_id", tenantId)
    .order("vendor_code");
  return q(data, error);
}

/** Vendors usable on entity-scoped AP workflows (entity-specific or tenant-wide). */
export async function listVendorsForEntityScope(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("id, vendor_code, display_name, legal_name, payment_terms_days, created_at")
    .eq("tenant_id", tenantId)
    .or(`entity_id.is.null,entity_id.eq.${entityId}`)
    .order("vendor_code");
  return q(data, error);
}

export async function listBillsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bills")
    .select(
      "id, vendor_id, bill_number, bill_status, bill_date, due_date, total_amount, balance_due, created_at"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listVendorPaymentsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vendor_payments")
    .select(
      "id, vendor_id, bill_id, payment_date, payment_method, amount_paid, amount_applied, payment_status, payment_reference"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("payment_date", { ascending: false });
  return q(data, error);
}

export async function listPayGroupsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pay_groups")
    .select("id, group_code, group_name, pay_frequency, status, created_at")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("group_code");
  return q(data, error);
}

export async function listPayPeriodsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pay_periods")
    .select("id, pay_group_id, period_name, period_start, period_end, pay_date, status")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("period_start", { ascending: false });
  return q(data, error);
}

export async function listFinancePeopleForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("finance_people")
    .select("id, legal_first_name, legal_last_name, email, employment_status, entity_id")
    .eq("tenant_id", tenantId)
    .order("legal_last_name")
    .order("legal_first_name");
  return q(data, error);
}

export async function listEmployeePayProfilesForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employee_pay_profiles")
    .select("id, pay_type, base_rate, annual_salary, employee_number, finance_person_id, pay_group_id, created_at")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listPayrollRunsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payroll_runs")
    .select(
      "id, run_number, run_type, run_status, period_start, period_end, pay_date, total_gross, total_net, created_at, pay_period_id"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listPayStatementsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pay_statements")
    .select(
      "id, statement_date, gross_pay, net_pay, statement_status, created_at, finance_person_id, payroll_run_item_id"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listPayrollItemCatalogForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payroll_item_catalog")
    .select(
      "id, item_code, item_name, item_type, calculation_method, default_rate, default_amount, default_percent, taxability, agency_name, is_active, created_at"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("item_code");
  return q(data, error);
}

export async function listEmployeePayItemAssignmentsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employee_pay_item_assignments")
    .select(
      "id, employee_pay_profile_id, payroll_item_id, assignment_status, override_rate, override_amount, override_percent, effective_start_date, effective_end_date, created_at"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listPayrollTaxLiabilitiesForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payroll_tax_liabilities")
    .select(
      "id, payroll_run_id, payroll_item_id, agency_name, liability_type, amount, due_date, liability_status, created_at"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(200);
  return q(data, error);
}

export async function listLeaveTypesForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("leave_types")
    .select("id, leave_code, leave_name, leave_category, is_paid, status, entity_id")
    .eq("tenant_id", tenantId)
    .order("leave_code");
  return q(data, error);
}

export async function listLeavePoliciesForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("leave_policies")
    .select("id, policy_code, policy_name, accrual_method, status, leave_type_id, created_at")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("policy_code");
  return q(data, error);
}

export async function listLeaveRequestsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("leave_requests")
    .select(
      "id, request_status, request_start_date, request_end_date, total_requested_hours, created_at, finance_person_id, leave_type_id"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listLeaveBalanceLedgersForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("leave_balance_ledgers")
    .select(
      "id, entry_type, entry_date, hours_delta, balance_after_hours, finance_person_id, leave_type_id, created_at"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("entry_date", { ascending: false });
  return q(data, error);
}

export async function listBankAccountsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("id, account_name, bank_name, account_type, currency_code, is_active, created_at")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("account_name");
  return q(data, error);
}

export async function listBankTransactionsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bank_transactions")
    .select(
      "id, transaction_date, transaction_type, amount, description, reference_number, match_status, bank_account_id, created_at"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("transaction_date", { ascending: false })
    .limit(200);
  return q(data, error);
}

export async function listReconciliationsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reconciliations")
    .select(
      "id, reconciliation_name, reconciliation_status, statement_start_date, statement_end_date, statement_ending_balance, book_ending_balance, bank_account_id, created_at"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listTransferRequestsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transfer_requests")
    .select(
      "id, transfer_status, requested_amount, transfer_date, request_reason, created_at, from_bank_account_id, to_bank_account_id"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listCatalogItemsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .select("id, item_code, item_name, billing_method, is_active, entity_id, created_at")
    .eq("tenant_id", tenantId)
    .order("item_code");
  return q(data, error);
}

export async function listCatalogCategoriesForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("catalog_item_categories")
    .select("id, category_code, category_name, status, entity_id")
    .eq("tenant_id", tenantId)
    .order("category_code");
  return q(data, error);
}

export async function listCatalogItemPricesForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("catalog_item_prices")
    .select(
      "id, price_name, unit_price, effective_start_date, effective_end_date, status, catalog_item_id, entity_id, created_at"
    )
    .eq("tenant_id", tenantId)
    .order("effective_start_date", { ascending: false });
  return q(data, error);
}

export async function listBillingRulesForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("billing_rules")
    .select("id, rule_code, rule_name, billing_trigger, billing_frequency, rate_source, status, entity_id, created_at")
    .eq("tenant_id", tenantId)
    .order("rule_code");
  return q(data, error);
}

export async function listBillableCandidatesForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("billable_event_candidates")
    .select(
      "id, source_table, source_record_id, candidate_status, candidate_date, quantity, candidate_amount, notes, entity_id, created_at"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(200);
  return q(data, error);
}

export async function listBillingExceptionEventsForTenant(tenantId: string, resolutionStatus?: "open" | "resolved" | "ignored") {
  const supabase = createSupabaseServerClient();
  let qy = supabase
    .from("billing_exception_events")
    .select(
      "id, source_table, source_record_id, exception_code, exception_message, resolution_status, entity_id, created_at, resolved_at"
    )
    .eq("tenant_id", tenantId);
  if (resolutionStatus) qy = qy.eq("resolution_status", resolutionStatus);
  const { data, error } = await qy.order("created_at", { ascending: false }).limit(200);
  return q(data, error);
}

export type FinanceDashboardMetrics = {
  arBalanceDue: number;
  apBalanceDue: number;
  openInvoiceCount: number;
  openBillCount: number;
  payGroupCount: number;
  draftPayrollRunLabel: string | null;
};

/** Live AR/AP balances and counts for the finance dashboard (entity-scoped). */
export async function getFinanceDashboardMetrics(tenantId: string, entityId: string): Promise<FinanceDashboardMetrics> {
  const supabase = createSupabaseServerClient();
  const [invRes, billRes, pgRes, runRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("balance_due, invoice_status")
      .eq("tenant_id", tenantId)
      .eq("entity_id", entityId)
      .in("invoice_status", ["issued", "partially_paid"]),
    supabase
      .from("bills")
      .select("balance_due, bill_status")
      .eq("tenant_id", tenantId)
      .eq("entity_id", entityId)
      .in("bill_status", ["approved", "posted"]),
    supabase.from("pay_groups").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("entity_id", entityId),
    supabase
      .from("payroll_runs")
      .select("run_number, run_status, pay_date")
      .eq("tenant_id", tenantId)
      .eq("entity_id", entityId)
      .in("run_status", ["draft", "calculating", "review"])
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (invRes.error) throw new Error(invRes.error.message);
  if (billRes.error) throw new Error(billRes.error.message);
  if (pgRes.error) throw new Error(pgRes.error.message);
  if (runRes.error) throw new Error(runRes.error.message);

  const invRows = invRes.data ?? [];
  const arBalanceDue = invRows.reduce((s, r) => s + Number(r.balance_due ?? 0), 0);
  const openInvoiceCount = invRows.length;

  const billRows = billRes.data ?? [];
  const apBalanceDue = billRows.filter((r) => Number(r.balance_due ?? 0) > 0).reduce((s, r) => s + Number(r.balance_due ?? 0), 0);
  const openBillCount = billRows.filter((r) => Number(r.balance_due ?? 0) > 0).length;

  const payGroupCount = pgRes.count ?? 0;
  const run = runRes.data?.[0];
  const draftPayrollRunLabel = run
    ? `${run.run_number} (${run.run_status}${run.pay_date ? ` · pay ${run.pay_date}` : ""})`
    : null;

  return {
    arBalanceDue,
    apBalanceDue,
    openInvoiceCount,
    openBillCount,
    payGroupCount,
    draftPayrollRunLabel,
  };
}

/** True when at least one GL account exists for the entity. */
export async function hasChartOfAccountsSeeded(tenantId: string, entityId: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

/** True when at least one fiscal period exists for the entity. */
export async function hasFiscalPeriodsSeeded(tenantId: string, entityId: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from("fiscal_periods")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

/** True when at least one employee pay profile exists for the entity. */
export async function hasEmployeePayProfilesConfigured(tenantId: string, entityId: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from("employee_pay_profiles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function hasCustomersSeeded(tenantId: string, entityId: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .or(`entity_id.is.null,entity_id.eq.${entityId}`);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function hasVendorsSeeded(tenantId: string, entityId: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from("vendors")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .or(`entity_id.is.null,entity_id.eq.${entityId}`);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function hasBankAccountLinked(tenantId: string, entityId: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from("bank_accounts")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function hasPayrollRunsCreated(tenantId: string, entityId: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from("payroll_runs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function listInventoryCategoriesForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inventory_categories")
    .select("id, category_code, category_name, category_type, status, entity_id")
    .eq("tenant_id", tenantId)
    .order("category_code");
  return q(data, error);
}

export async function listInventoryItemsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, item_code, item_name, tracking_mode, is_active, entity_id, created_at")
    .eq("tenant_id", tenantId)
    .order("item_code");
  return q(data, error);
}

export async function listInventoryLocationsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inventory_locations")
    .select("id, location_code, location_name, entity_id, status")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("location_code");
  return q(data, error);
}

export async function listInventoryStockBalancesForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inventory_stock_balances")
    .select(
      "id, quantity_on_hand, quantity_available, entity_id, inventory_item_id, inventory_location_id, total_value, updated_at"
    )
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .limit(200);
  return q(data, error);
}

export async function listEmployeeItemIssuesForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employee_item_issues")
    .select(
      "id, issue_status, issue_date, return_due_date, issue_quantity, inventory_item_id, finance_person_id, entity_id, created_at"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(200);
  return q(data, error);
}

export async function listEquipmentAssetsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("equipment_assets")
    .select("id, asset_tag, asset_name, asset_status, entity_id, created_at")
    .eq("tenant_id", tenantId)
    .order("asset_tag");
  return q(data, error);
}

export async function listReportDefinitionsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("report_definitions")
    .select("id, report_code, report_name, report_category, output_type, status, entity_id, created_at")
    .eq("tenant_id", tenantId)
    .order("report_code");
  return q(data, error);
}

export async function listDashboardDefinitionsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("dashboard_definitions")
    .select("id, dashboard_code, dashboard_name, dashboard_category, status, entity_id, created_at")
    .eq("tenant_id", tenantId)
    .order("dashboard_code");
  return q(data, error);
}

export async function listCloseChecklistsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("close_checklists")
    .select(
      "id, checklist_name, checklist_status, close_period_start, close_period_end, entity_id, created_at"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listCloseChecklistsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("close_checklists")
    .select(
      "id, checklist_name, checklist_status, close_period_start, close_period_end, entity_id, created_at"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listKpiDefinitionsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("kpi_definitions")
    .select("id, kpi_code, kpi_name, kpi_category, measure_type, status, entity_id, created_at")
    .eq("tenant_id", tenantId)
    .order("kpi_code");
  return q(data, error);
}

export async function listBudgetVersionsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("budget_versions")
    .select("id, budget_code, budget_name, fiscal_year, budget_status, version_number, created_at")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("fiscal_year", { ascending: false });
  return q(data, error);
}

export async function listForecastVersionsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("forecast_versions")
    .select("id, forecast_code, forecast_name, fiscal_year, forecast_status, version_number, basis_type, created_at")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("fiscal_year", { ascending: false });
  return q(data, error);
}

export async function listVarianceSnapshotsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("variance_snapshots")
    .select(
      "id, snapshot_date, comparison_type, budget_version_id, forecast_version_id, generated_at, entity_id"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("generated_at", { ascending: false });
  return q(data, error);
}

export async function listConsolidationGroupsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("consolidation_groups")
    .select("id, group_code, group_name, consolidation_currency, status, created_at")
    .eq("tenant_id", tenantId)
    .order("group_code");
  return q(data, error);
}

export async function listEntitiesForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("entities")
    .select("id, code, display_name")
    .eq("tenant_id", tenantId)
    .order("code");
  return q(data, error);
}

export async function listEntityRelationshipsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("entity_relationships")
    .select(
      "id, parent_entity_id, child_entity_id, relationship_type, ownership_percentage, effective_start_date, status, created_at"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listConsolidationSnapshotsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("consolidation_snapshots")
    .select(
      "id, consolidation_group_id, snapshot_date, snapshot_status, generated_at, published_at"
    )
    .eq("tenant_id", tenantId)
    .order("generated_at", { ascending: false });
  return q(data, error);
}

export async function listIntercompanyAccountsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("intercompany_accounts")
    .select("id, counterparty_entity_id, status, created_at")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listIntercompanyTransactionsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("intercompany_transactions")
    .select(
      "id, counterparty_entity_id, transaction_code, transaction_type, transaction_status, transaction_date, amount, created_at"
    )
    .eq("tenant_id", tenantId)
    .eq("source_entity_id", entityId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listTenantProvisioningTemplates() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenant_provisioning_templates")
    .select("id, template_code, template_name, template_status, created_at")
    .order("template_code");
  return q(data, error);
}

export async function listTenantBootstrapRunsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenant_bootstrap_runs")
    .select(
      "id, provisioning_template_id, bootstrap_status, run_notes, started_at, completed_at, tenant_id"
    )
    .eq("tenant_id", tenantId)
    .order("started_at", { ascending: false });
  return q(data, error);
}

export async function listFeatureFlagDefinitions() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("feature_flag_definitions")
    .select("id, flag_key, flag_name, flag_category, status, description")
    .order("flag_key");
  return q(data, error);
}

export async function listTenantFeatureFlagsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenant_feature_flags")
    .select("id, feature_flag_definition_id, enabled, enabled_at, updated_at")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });
  return q(data, error);
}

export async function listTenantActivationChecklistsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenant_activation_checklists")
    .select("id, checklist_name, activation_status, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listTenantActivationTasksForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenant_activation_tasks")
    .select(
      "id, tenant_activation_checklist_id, task_code, task_name, task_status, completed_at, created_at"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listClientPortalProfilesForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("client_portal_profiles")
    .select(
      "id, customer_id, portal_status, allow_invoice_view, allow_statement_view, allow_payment_submission, created_at"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listTestSuitesForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("test_suites")
    .select("id, suite_code, suite_name, suite_category, status, created_at")
    .eq("tenant_id", tenantId)
    .order("suite_code");
  return q(data, error);
}

export async function listReleaseVersionsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("release_versions")
    .select("id, release_code, release_name, release_status, release_scope, target_module_key, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listSystemHealthChecksForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("system_health_checks")
    .select("id, module_key, check_code, check_name, check_status, last_checked_at, status_message, created_at")
    .eq("tenant_id", tenantId)
    .order("module_key");
  return q(data, error);
}

export async function listOperationalAlertsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("operational_alerts")
    .select(
      "id, module_key, alert_code, alert_message, alert_severity, alert_status, detected_at, acknowledged_at, entity_id"
    )
    .eq("tenant_id", tenantId)
    .order("detected_at", { ascending: false })
    .limit(100);
  return q(data, error);
}

/** Tenant-owned suites plus platform-wide suites (tenant_id null) for run pickers. */
export async function listTestSuitesForOperationsPicker(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("test_suites")
    .select("id, suite_code, suite_name, suite_category, status, tenant_id, created_at")
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .order("suite_code");
  return q(data, error);
}

export async function listTestRunsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("test_runs")
    .select("id, test_suite_id, run_status, run_environment, started_at, completed_at, tenant_id")
    .eq("tenant_id", tenantId)
    .order("started_at", { ascending: false });
  return q(data, error);
}

export async function listTestResultsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("test_results")
    .select("id, test_run_id, test_case_code, result_status, severity, result_notes, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(200);
  return q(data, error);
}

export async function listReleaseChecklistsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("release_checklists")
    .select("id, release_version_id, checklist_name, checklist_status, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listReleaseTasksForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("release_tasks")
    .select(
      "id, release_checklist_id, task_code, task_name, task_status, completed_at, created_at"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

export async function listJobRunHistoryForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("job_run_history")
    .select("id, job_key, job_category, run_status, started_at, completed_at")
    .eq("tenant_id", tenantId)
    .order("started_at", { ascending: false })
    .limit(150);
  return q(data, error);
}

export async function listAuditReviewLogsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_review_logs")
    .select("id, entity_id, review_scope, review_status, review_date, notes, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(100);
  return q(data, error);
}

export async function listBackupVerificationRunsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("backup_verification_runs")
    .select("id, run_scope, module_key, verification_status, started_at, completed_at")
    .eq("tenant_id", tenantId)
    .order("started_at", { ascending: false });
  return q(data, error);
}

export async function listRestoreTestRunsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("restore_test_runs")
    .select("id, run_scope, module_key, restore_status, started_at, completed_at")
    .eq("tenant_id", tenantId)
    .order("started_at", { ascending: false });
  return q(data, error);
}

export async function listDisasterRecoveryExercisesForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("disaster_recovery_exercises")
    .select("id, exercise_name, exercise_scope, exercise_status, exercise_date, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return q(data, error);
}

/** Pack 016 — GL journal batches for the active entity (newest first). */
export async function listGlJournalBatchesForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("gl_journal_batches")
    .select(
      "id, fiscal_period_id, journal_number, journal_date, description, batch_status, posted_at, voided_at, created_at"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("journal_date", { ascending: false })
    .order("created_at", { ascending: false });
  return q(data, error);
}

/** Pack 016 — one journal batch for a tenant (caller should verify entity scope). */
export async function getGlJournalBatchById(tenantId: string, batchId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("gl_journal_batches")
    .select(
      "id, entity_id, fiscal_period_id, journal_number, journal_date, description, batch_status, posted_at, voided_at, void_reason, created_at, updated_at"
    )
    .eq("tenant_id", tenantId)
    .eq("id", batchId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Pack 016 — lines for a journal batch (tenant guard). */
export async function listGlJournalLinesForBatch(tenantId: string, batchId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("gl_journal_lines")
    .select("id, line_number, account_id, memo, debit_amount, credit_amount")
    .eq("tenant_id", tenantId)
    .eq("journal_batch_id", batchId)
    .order("line_number");
  return q(data, error);
}

/** Pack 017 — semantic GL account bindings for subledger posting. */
export async function listEntityGlAccountBindings(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("entity_gl_account_bindings")
    .select("id, binding_key, account_id, updated_at")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("binding_key");
  return q(data, error);
}

/** Pack 017 — trace rows from AR/payroll into posted GL batches. */
export async function listGlSubledgerPostingsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("gl_subledger_postings")
    .select("id, source_domain, source_table, source_record_id, source_event, journal_batch_id, created_at")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(100);
  return q(data, error);
}

/** Pack 017 — report automation execution history. */
export async function listReportExecutionLogForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("report_execution_log")
    .select(
      "id, entity_id, report_definition_id, as_of_date, execution_status, report_snapshot_id, error_message, started_at, completed_at"
    )
    .eq("tenant_id", tenantId)
    .order("started_at", { ascending: false })
    .limit(80);
  return q(data, error);
}

/** Pack 019 — evidence document metadata for tenant + entity scope. */
export async function listFinanceEvidenceDocumentsForScope(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("finance_evidence_documents")
    .select(
      "id, entity_id, domain, parent_table, parent_record_id, title, storage_bucket, storage_object_path, content_type, created_at"
    )
    .eq("tenant_id", tenantId)
    .or(`entity_id.is.null,entity_id.eq.${entityId}`)
    .order("created_at", { ascending: false })
    .limit(150);
  return q(data, error);
}

/** Pack 020 — approval requests for an entity. */
export async function listFinanceApprovalRequestsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("finance_approval_requests")
    .select(
      "id, subject_domain, subject_table, subject_record_id, request_code, request_title, request_status, priority, submitted_at, resolved_at, created_at"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(150);
  return q(data, error);
}

/** Pack 021 — trial balance snapshot cache rows. */
export async function listGlTrialBalanceSnapshotsForEntity(tenantId: string, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("gl_trial_balance_snapshots")
    .select(
      "id, fiscal_period_id, as_of_date, snapshot_kind, snapshot_status, total_debit, total_credit, generated_at, notes"
    )
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("as_of_date", { ascending: false })
    .limit(80);
  return q(data, error);
}

/** Pack 022 — API idempotency keys (tenant-wide). */
export async function listFinanceApiIdempotencyKeysForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("finance_api_idempotency_keys")
    .select("id, idempotency_key, route_key, response_http_status, created_at, expires_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(120);
  return q(data, error);
}

/** Pack 022 — webhook delivery attempts (tenant-wide). */
export async function listFinanceWebhookDeliveryLogForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("finance_webhook_delivery_log")
    .select(
      "id, webhook_key, event_type, destination_url_host, delivery_status, attempt_count, last_http_status, last_error, next_retry_at, created_at"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(120);
  return q(data, error);
}
