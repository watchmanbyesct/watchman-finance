import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import type { Account, FiscalPeriod } from "@/types";

/**
 * Fetch all accounts for an entity, ordered by code.
 */
export async function getAccountsByEntity(
  tenantId: string,
  entityId: string
): Promise<Account[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .select(`
      id, tenant_id, entity_id, account_category_id,
      code, name, description, account_type, integration_account_type, integration_detail_type, source_of_truth,
      source_reference_table, external_account_ref, normal_balance,
      allow_posting, is_active, parent_account_id
    `)
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("code");

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToAccount);
}

/**
 * Fetch all fiscal periods for an entity, most recent first.
 */
export async function getFiscalPeriodsByEntity(
  tenantId: string,
  entityId: string
): Promise<FiscalPeriod[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fiscal_periods")
    .select("id, tenant_id, entity_id, period_name, start_date, end_date, fiscal_year, fiscal_month, status")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToFiscalPeriod);
}

/**
 * Fetch the currently open fiscal period for an entity.
 * Returns null if no open period exists.
 */
export async function getOpenFiscalPeriod(
  tenantId: string,
  entityId: string
): Promise<FiscalPeriod | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("fiscal_periods")
    .select("id, tenant_id, entity_id, period_name, start_date, end_date, fiscal_year, fiscal_month, status")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .eq("status", "open")
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  return data ? rowToFiscalPeriod(data) : null;
}

/**
 * Fetch account categories for a tenant (includes system-level nulls).
 */
export async function getAccountCategories(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("account_categories")
    .select("id, code, name, category_type, normal_balance, integration_account_type, status")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("category_type")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Row mappers ───────────────────────────────────────────────────────────────

function rowToAccount(row: any): Account {
  return {
    id:                row.id,
    tenantId:          row.tenant_id,
    entityId:          row.entity_id,
    accountCategoryId: row.account_category_id,
    code:              row.code,
    name:              row.name,
    description:       row.description ?? null,
    accountType:       row.account_type,
    integrationAccountType:    row.integration_account_type ?? null,
    integrationDetailType:     row.integration_detail_type ?? null,
    sourceOfTruth:     row.source_of_truth,
    sourceReferenceTable: row.source_reference_table ?? null,
    externalAccountRef: row.external_account_ref ?? null,
    normalBalance:     row.normal_balance,
    allowPosting:      row.allow_posting,
    isActive:          row.is_active,
    parentAccountId:   row.parent_account_id ?? null,
  };
}

function rowToFiscalPeriod(row: any): FiscalPeriod {
  return {
    id:          row.id,
    tenantId:    row.tenant_id,
    entityId:    row.entity_id,
    periodName:  row.period_name,
    startDate:   row.start_date,
    endDate:     row.end_date,
    fiscalYear:  row.fiscal_year,
    fiscalMonth: row.fiscal_month ?? null,
    status:      row.status,
  };
}
