"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";
import { ACCOUNT_CATEGORY_SEED_ROWS } from "@/lib/finance/account-category-seed";
import {
  INTEGRATION_ACCOUNT_TYPE_VALUES,
  SOURCE_OF_TRUTH_VALUES,
} from "@/lib/finance/account-integration-taxonomy";
import { z } from "zod";

// ── Schemas ───────────────────────────────────────────────────────────────────

const CreateEntitySchema = z.object({
  tenantId:     z.string().uuid(),
  entityCode:   z.string().min(1).max(20).toUpperCase(),
  legalName:    z.string().min(1).max(255),
  displayName:  z.string().min(1).max(255),
  entityType:   z.enum(["operating_company", "holding_company", "subsidiary", "branch_entity", "other"]),
  baseCurrency: z.string().length(3).default("USD"),
});

const CreateAccountSchema = z.object({
  tenantId:          z.string().uuid(),
  entityId:          z.string().uuid(),
  accountCategoryId: z.string().uuid(),
  code:              z.string().min(1).max(50),
  name:              z.string().min(1).max(255),
  /** Deprecated: GL type and normal balance are taken from the category (integration taxonomy). */
  accountType: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().min(1).optional()
  ),
  normalBalance: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.enum(["debit", "credit"]).optional()
  ),
  allowPosting: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return true;
    if (v === false || v === "false") return false;
    return v === true || v === "true" || v === "on";
  }, z.boolean()),
  parentAccountId: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().uuid().optional()
  ),
  description: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().optional()
  ),
});

const SeedChartOfAccountsSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
});

const CreateFiscalPeriodSchema = z.object({
  tenantId:    z.string().uuid(),
  entityId:    z.string().uuid(),
  periodName:  z.string().min(1).max(100),
  startDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fiscalYear:  z.coerce.number().int().min(2000).max(2100),
  fiscalMonth: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }, z.number().int().min(1).max(12).optional()),
});

const SeedFiscalPeriodsSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  fiscalYear: z.coerce.number().int().min(2000).max(2100),
});

const SourceOfTruthZ = z.enum(SOURCE_OF_TRUTH_VALUES as unknown as [string, ...string[]]);
const IntegrationAccountTypeZ = z.enum(INTEGRATION_ACCOUNT_TYPE_VALUES as unknown as [string, ...string[]]);

const SeedIntegrationAccountCategoriesSchema = z.object({
  tenantId: z.string().uuid(),
});

const CreateAccountCategorySchema = z.object({
  tenantId: z.string().uuid(),
  code: z
    .string()
    .min(1)
    .max(80)
    .transform((s) => s.trim().toLowerCase())
    .refine((s) => /^[a-z][a-z0-9_]*$/.test(s), {
      message: "Use lowercase letters, numbers, and underscores (start with a letter).",
    }),
  name: z.string().min(1).max(255).transform((s) => s.trim()),
  categoryType: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  normalBalance: z.enum(["debit", "credit"]),
  integrationAccountType: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    IntegrationAccountTypeZ.optional()
  ),
});

function defaultIntegrationTypeForGlCategory(glType: string): string {
  switch (glType) {
    case "asset":
      return "other_current_asset";
    case "liability":
      return "other_current_liability";
    case "equity":
      return "equity";
    case "revenue":
      return "income";
    default:
      return "expense";
  }
}

const UpdateAccountSchema = z.object({
  tenantId:        z.string().uuid(),
  entityId:        z.string().uuid(),
  accountId:       z.string().uuid(),
  name:            z.string().min(1).max(255).optional(),
  description:     z.string().optional().nullable(),
  allowPosting:    z.boolean().optional(),
  isActive:        z.boolean().optional(),
  parentAccountId: z.string().uuid().optional().nullable(),
  /** null clears integration taxonomy type in DB */
  integrationAccountType: z.union([IntegrationAccountTypeZ, z.null()]).optional(),
  integrationDetailType: z.preprocess(
    (v) => (v === "" ? null : v),
    z.union([z.string().max(200), z.null()]).optional()
  ),
  sourceOfTruth: SourceOfTruthZ.optional(),
  sourceReferenceTable: z.preprocess(
    (v) => (v === "" ? null : v),
    z.union([z.string().max(200), z.null()]).optional()
  ),
  externalAccountRef: z.preprocess(
    (v) => (v === "" ? null : v),
    z.union([z.string().max(200), z.null()]).optional()
  ),
});

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Create a new entity inside an existing tenant.
 * Permission: entity.create
 */
export async function createEntity(
  formData: FormData | Record<string, unknown>
): Promise<ActionResult<{ entityId: string }>> {
  try {
    const raw = formData instanceof FormData ? Object.fromEntries(formData) : formData;
    const input = CreateEntitySchema.parse(raw);
    const ctx = await resolveRequestContext(input.tenantId);
    requirePermission(ctx, "entity.create");

    const admin = createSupabaseAdminClient();

    // Check unique entity code within tenant
    const { data: existing } = await admin
      .from("entities")
      .select("id")
      .eq("tenant_id", input.tenantId)
      .eq("code", input.entityCode)
      .single();

    if (existing) {
      return {
        success: false,
        message: `Entity code ${input.entityCode} already exists in this tenant.`,
        errors: [{ code: "conflict", message: "entity_code_conflict" }],
      };
    }

    const { data: entity, error } = await admin
      .from("entities")
      .insert({
        tenant_id:     input.tenantId,
        code:          input.entityCode,
        legal_name:    input.legalName,
        display_name:  input.displayName,
        entity_type:   input.entityType,
        base_currency: input.baseCurrency,
        status:        "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:             input.tenantId,
      entityId:             entity.id,
      actorPlatformUserId:  ctx.platformUserId,
      moduleKey:            "finance_core",
      actionCode:           "entity.create",
      targetTable:          "entities",
      targetRecordId:       entity.id,
      newValues:            input,
    });

    return {
      success: true,
      message: `Entity ${input.entityCode} created successfully.`,
      data: { entityId: entity.id },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Create a GL account for an entity.
 * Permission: gl.account.manage
 */
export async function createAccount(
  formData: FormData | Record<string, unknown>
): Promise<ActionResult<{ accountId: string }>> {
  try {
    const raw = formData instanceof FormData ? Object.fromEntries(formData) : formData;
    const input = CreateAccountSchema.parse(raw);
    const ctx = await resolveRequestContext(input.tenantId);
    requirePermission(ctx, "gl.account.manage");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: catRow, error: catErr } = await admin
      .from("account_categories")
      .select("id, category_type, normal_balance, integration_account_type")
      .eq("id", input.accountCategoryId)
      .eq("tenant_id", input.tenantId)
      .maybeSingle();

    if (catErr) throw new Error(catErr.message);
    if (!catRow) {
      return {
        success: false,
        message: "Account category not found for this tenant. Seed integration categories or create a custom category.",
      };
    }

    const accountType = String(catRow.category_type);
    const normalBalance = String(catRow.normal_balance) as "debit" | "credit";
    const integrationAccountType =
      catRow.integration_account_type != null && String(catRow.integration_account_type).length > 0
        ? String(catRow.integration_account_type)
        : defaultIntegrationTypeForGlCategory(accountType);

    // Unique code per entity
    const { data: existing } = await admin
      .from("accounts")
      .select("id")
      .eq("entity_id", input.entityId)
      .eq("code", input.code)
      .single();

    if (existing) {
      return {
        success: false,
        message: `Account code ${input.code} already exists for this entity.`,
        errors: [{ code: "conflict", message: "account_code_conflict" }],
      };
    }

    const { data: account, error } = await admin
      .from("accounts")
      .insert({
        tenant_id:           input.tenantId,
        entity_id:           input.entityId,
        account_category_id: input.accountCategoryId,
        code:                input.code,
        name:                input.name,
        account_type:        accountType,
        integration_account_type:    integrationAccountType,
        source_of_truth:     "gl_manual",
        normal_balance:      normalBalance,
        allow_posting:       input.allowPosting,
        parent_account_id:   input.parentAccountId ?? null,
        description:         input.description ?? null,
        is_active:           true,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            input.tenantId,
      entityId:            input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "gl.account.create",
      targetTable:         "accounts",
      targetRecordId:      account.id,
      newValues:           input,
    });

    revalidatePath("/finance/accounts");

    return {
      success: true,
      message: `Account ${input.code} — ${input.name} created.`,
      data: { accountId: account.id },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

type SeedAccountTemplate = {
  code: string;
  name: string;
  categoryCode: string;
  accountType: string;
  integrationAccountType: string;
  integrationDetailType: string;
  sourceOfTruth:
    | "gl_manual"
    | "bank_register"
    | "ar_subledger"
    | "ap_subledger"
    | "payroll_subledger"
    | "system";
  normalBalance: "debit" | "credit";
  allowPosting: boolean;
};

const DEFAULT_COA_TEMPLATES: SeedAccountTemplate[] = [
  { code: "1000", name: "Cash", categoryCode: "assets_current", accountType: "asset", integrationAccountType: "bank", integrationDetailType: "checking", sourceOfTruth: "bank_register", normalBalance: "debit", allowPosting: true },
  { code: "1100", name: "Accounts Receivable", categoryCode: "assets_current", accountType: "asset", integrationAccountType: "accounts_receivable", integrationDetailType: "ar", sourceOfTruth: "ar_subledger", normalBalance: "debit", allowPosting: true },
  { code: "1200", name: "Undeposited Funds", categoryCode: "assets_current", accountType: "asset", integrationAccountType: "other_current_asset", integrationDetailType: "undeposited_funds", sourceOfTruth: "ar_subledger", normalBalance: "debit", allowPosting: true },
  { code: "1300", name: "Prepaid Expenses", categoryCode: "assets_current", accountType: "asset", integrationAccountType: "other_current_asset", integrationDetailType: "prepaid_expenses", sourceOfTruth: "gl_manual", normalBalance: "debit", allowPosting: true },
  { code: "1500", name: "Equipment", categoryCode: "assets_fixed", accountType: "asset", integrationAccountType: "fixed_asset", integrationDetailType: "machinery_and_equipment", sourceOfTruth: "gl_manual", normalBalance: "debit", allowPosting: true },
  { code: "2000", name: "Accounts Payable", categoryCode: "liabilities_current", accountType: "liability", integrationAccountType: "accounts_payable", integrationDetailType: "ap", sourceOfTruth: "ap_subledger", normalBalance: "credit", allowPosting: true },
  { code: "2100", name: "Accrued Expenses", categoryCode: "liabilities_current", accountType: "liability", integrationAccountType: "other_current_liability", integrationDetailType: "accrued_liabilities", sourceOfTruth: "gl_manual", normalBalance: "credit", allowPosting: true },
  { code: "2200", name: "Payroll Liabilities", categoryCode: "liabilities_current", accountType: "liability", integrationAccountType: "other_current_liability", integrationDetailType: "payroll_liabilities", sourceOfTruth: "payroll_subledger", normalBalance: "credit", allowPosting: true },
  { code: "2500", name: "Long-Term Debt", categoryCode: "liabilities_lt", accountType: "liability", integrationAccountType: "long_term_liability", integrationDetailType: "notes_payable", sourceOfTruth: "gl_manual", normalBalance: "credit", allowPosting: true },
  { code: "3000", name: "Owner's Equity", categoryCode: "equity", accountType: "equity", integrationAccountType: "equity", integrationDetailType: "owners_equity", sourceOfTruth: "system", normalBalance: "credit", allowPosting: true },
  { code: "4000", name: "Service Revenue", categoryCode: "revenue", accountType: "revenue", integrationAccountType: "income", integrationDetailType: "service_fee_income", sourceOfTruth: "ar_subledger", normalBalance: "credit", allowPosting: true },
  { code: "5000", name: "Cost of Services", categoryCode: "cogs", accountType: "expense", integrationAccountType: "cogs", integrationDetailType: "supplies_materials_cogs", sourceOfTruth: "ap_subledger", normalBalance: "debit", allowPosting: true },
  { code: "6000", name: "Operating Expense", categoryCode: "operating_expense", accountType: "expense", integrationAccountType: "expense", integrationDetailType: "office_general_administrative", sourceOfTruth: "ap_subledger", normalBalance: "debit", allowPosting: true },
  { code: "6100", name: "Payroll Expense", categoryCode: "payroll_expense", accountType: "expense", integrationAccountType: "expense", integrationDetailType: "payroll_expenses", sourceOfTruth: "payroll_subledger", normalBalance: "debit", allowPosting: true },
  { code: "7000", name: "Other Income", categoryCode: "other_income", accountType: "revenue", integrationAccountType: "other_income", integrationDetailType: "other_miscellaneous_income", sourceOfTruth: "gl_manual", normalBalance: "credit", allowPosting: true },
  { code: "8000", name: "Other Expense", categoryCode: "other_expense", accountType: "expense", integrationAccountType: "other_expense", integrationDetailType: "other_miscellaneous_expense", sourceOfTruth: "gl_manual", normalBalance: "debit", allowPosting: true },
];

/**
 * Seed a default Chart of Accounts template for an entity.
 * Permission: gl.account.manage
 */
export async function seedChartOfAccounts(
  formData: FormData | Record<string, unknown>
): Promise<ActionResult<{ seededCount: number }>> {
  try {
    const raw = formData instanceof FormData ? Object.fromEntries(formData) : formData;
    const input = SeedChartOfAccountsSchema.parse(raw);
    const ctx = await resolveRequestContext(input.tenantId);
    requirePermission(ctx, "gl.account.manage");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: categories, error: catError } = await admin
      .from("account_categories")
      .select("id, code")
      .eq("tenant_id", input.tenantId)
      .eq("status", "active");

    if (catError) throw new Error(catError.message);

    const categoryByCode = new Map<string, string>(
      (categories ?? []).map((c: { id: string; code: string }) => [c.code, c.id])
    );

    const missingCategory = DEFAULT_COA_TEMPLATES.find((a) => !categoryByCode.has(a.categoryCode));
    if (missingCategory) {
      return {
        success: false,
        message: `Missing account category ${missingCategory.categoryCode}. Seed categories first.`,
      };
    }

    const rows = DEFAULT_COA_TEMPLATES.map((a) => ({
      tenant_id: input.tenantId,
      entity_id: input.entityId,
      account_category_id: categoryByCode.get(a.categoryCode)!,
      code: a.code,
      name: a.name,
      account_type: a.accountType,
      integration_account_type: a.integrationAccountType,
      integration_detail_type: a.integrationDetailType,
      source_of_truth: a.sourceOfTruth,
      normal_balance: a.normalBalance,
      allow_posting: a.allowPosting,
      is_active: true,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await admin
      .from("accounts")
      .upsert(rows, { onConflict: "entity_id,code" });

    if (upsertError) throw new Error(upsertError.message);

    await writeAuditLog({
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "gl.account.seed_default",
      targetTable: "accounts",
      newValues: { seededCodes: DEFAULT_COA_TEMPLATES.map((a) => a.code) },
    });

    revalidatePath("/finance/accounts");
    return {
      success: true,
      message: `Seeded ${DEFAULT_COA_TEMPLATES.length} chart of accounts rows (upserted).`,
      data: { seededCount: DEFAULT_COA_TEMPLATES.length },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Upsert standard integration account categories for the tenant.
 * Permission: gl.account.manage
 */
export async function seedIntegrationAccountCategories(
  input: z.infer<typeof SeedIntegrationAccountCategoriesSchema>
): Promise<ActionResult<{ seededCount: number }>> {
  try {
    const v = SeedIntegrationAccountCategoriesSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "gl.account.manage");

    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const rows = ACCOUNT_CATEGORY_SEED_ROWS.map((r) => ({
      tenant_id: v.tenantId,
      code: r.code,
      name: r.name,
      category_type: r.category_type,
      normal_balance: r.normal_balance,
      integration_account_type: r.integration_account_type,
      status: "active",
      updated_at: now,
    }));

    const { error } = await admin.from("account_categories").upsert(rows, { onConflict: "tenant_id,code" });
    if (error) {
      console.error("[seedIntegrationAccountCategories]", error.message, error);
      return {
        success: false,
        message: error.message,
        errors: [{ code: "integration_error", message: error.message }],
      };
    }

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "gl.account_category.seed_integration_taxonomy",
      targetTable: "account_categories",
      newValues: { seededCount: rows.length },
    });

    revalidatePath("/finance/accounts");
    return {
      success: true,
      message: `Seeded ${rows.length} integration account categories (upserted).`,
      data: { seededCount: rows.length },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Create a tenant-specific account category (custom COA grouping).
 * Permission: gl.account.manage
 */
export async function createAccountCategory(
  input: z.infer<typeof CreateAccountCategorySchema>
): Promise<ActionResult<{ accountCategoryId: string }>> {
  try {
    const parsed = CreateAccountCategorySchema.parse(input);
    const ctx = await resolveRequestContext(parsed.tenantId);
    requirePermission(ctx, "gl.account.manage");

    const admin = createSupabaseAdminClient();
    const integrationTypeDefault =
      parsed.integrationAccountType ?? defaultIntegrationTypeForGlCategory(parsed.categoryType);

    const { data: row, error } = await admin
      .from("account_categories")
      .insert({
        tenant_id: parsed.tenantId,
        code: parsed.code,
        name: parsed.name,
        category_type: parsed.categoryType,
        normal_balance: parsed.normalBalance,
        integration_account_type: integrationTypeDefault,
        status: "active",
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          message: `Category code ${parsed.code} already exists for this tenant.`,
          errors: [{ code: "conflict", message: "account_category_code_conflict" }],
        };
      }
      throw new Error(error.message);
    }

    await writeAuditLog({
      tenantId: parsed.tenantId,
      entityId: null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "gl.account_category.create",
      targetTable: "account_categories",
      targetRecordId: row.id,
      newValues: { code: parsed.code, categoryType: parsed.categoryType, integrationAccountType: integrationTypeDefault },
    });

    revalidatePath("/finance/accounts");
    return {
      success: true,
      message: `Category ${parsed.name} created.`,
      data: { accountCategoryId: row.id },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Create a fiscal period for an entity.
 * Permission: gl.period.close (reused as period management permission)
 */
export async function createFiscalPeriod(
  formData: FormData | Record<string, unknown>
): Promise<ActionResult<{ fiscalPeriodId: string }>> {
  try {
    const raw = formData instanceof FormData ? Object.fromEntries(formData) : formData;
    const input = CreateFiscalPeriodSchema.parse(raw);
    const ctx = await resolveRequestContext(input.tenantId);
    requirePermission(ctx, "gl.period.close");
    requireEntityScope(ctx, input.entityId);

    if (input.startDate >= input.endDate) {
      return {
        success: false,
        message: "Start date must be before end date.",
        errors: [{ code: "validation_failed", message: "invalid_date_range" }],
      };
    }

    const admin = createSupabaseAdminClient();

    const { data: period, error } = await admin
      .from("fiscal_periods")
      .insert({
        tenant_id:    input.tenantId,
        entity_id:    input.entityId,
        period_name:  input.periodName,
        start_date:   input.startDate,
        end_date:     input.endDate,
        fiscal_year:  input.fiscalYear,
        fiscal_month: input.fiscalMonth ?? null,
        status:       "open",
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          message: "A fiscal period with overlapping dates already exists for this entity.",
          errors: [{ code: "conflict", message: "fiscal_period_overlap" }],
        };
      }
      throw new Error(error.message);
    }

    await writeAuditLog({
      tenantId:            input.tenantId,
      entityId:            input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "gl.period.create",
      targetTable:         "fiscal_periods",
      targetRecordId:      period.id,
      newValues:           input,
    });

    revalidatePath("/finance/periods");

    return {
      success: true,
      message: `Fiscal period ${input.periodName} created.`,
      data: { fiscalPeriodId: period.id },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

type SeedPeriodRow = {
  period_name: string;
  start_date: string;
  end_date: string;
  fiscal_month: number;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function isoDate(y: number, m1: number, d: number): string {
  return new Date(Date.UTC(y, m1 - 1, d)).toISOString().slice(0, 10);
}

function buildMonthlyPeriods(year: number): SeedPeriodRow[] {
  const rows: SeedPeriodRow[] = [];
  for (let month = 1; month <= 12; month++) {
    const start = isoDate(year, month, 1);
    const end = isoDate(year, month + 1, 0);
    rows.push({
      period_name: `${MONTH_NAMES[month - 1]} ${year}`,
      start_date: start,
      end_date: end,
      fiscal_month: month,
    });
  }
  return rows;
}

/**
 * Seed 12 monthly fiscal periods for a year.
 * Permission: gl.period.close (same period management permission as createFiscalPeriod)
 */
export async function seedFiscalPeriods(
  formData: FormData | Record<string, unknown>
): Promise<ActionResult<{ seededCount: number }>> {
  try {
    const raw = formData instanceof FormData ? Object.fromEntries(formData) : formData;
    const input = SeedFiscalPeriodsSchema.parse(raw);
    const ctx = await resolveRequestContext(input.tenantId);
    requirePermission(ctx, "gl.period.close");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();
    const periodRows = buildMonthlyPeriods(input.fiscalYear).map((p) => ({
      tenant_id: input.tenantId,
      entity_id: input.entityId,
      period_name: p.period_name,
      start_date: p.start_date,
      end_date: p.end_date,
      fiscal_year: input.fiscalYear,
      fiscal_month: p.fiscal_month,
      status: "open",
      updated_at: new Date().toISOString(),
    }));

    const { error } = await admin
      .from("fiscal_periods")
      .upsert(periodRows, { onConflict: "entity_id,start_date,end_date" });

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "gl.period.seed_year",
      targetTable: "fiscal_periods",
      newValues: { fiscalYear: input.fiscalYear, months: 12 },
    });

    revalidatePath("/finance/periods");
    return {
      success: true,
      message: `Seeded fiscal periods for ${input.fiscalYear} (upserted 12 months).`,
      data: { seededCount: 12 },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Close a fiscal period.
 * Permission: gl.period.close
 */
export async function closeFiscalPeriod(input: {
  tenantId: string;
  entityId: string;
  fiscalPeriodId: string;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await resolveRequestContext(input.tenantId);
    requirePermission(ctx, "gl.period.close");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: period } = await admin
      .from("fiscal_periods")
      .select("status, entity_id")
      .eq("id", input.fiscalPeriodId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .single();

    if (!period) return { success: false, message: "Fiscal period not found." };
    if (period.status === "closed") return { success: false, message: "Fiscal period is already closed." };
    if (period.status === "locked") return { success: false, message: "Fiscal period is locked and cannot be modified." };

    const now = new Date().toISOString();

    const { error: closureErr } = await admin.from("fiscal_period_closures").insert({
      tenant_id:         input.tenantId,
      entity_id:         input.entityId,
      fiscal_period_id:  input.fiscalPeriodId,
      closure_type:      "period_close",
      status:            "closed",
      closed_at:         now,
      closed_by:         ctx.platformUserId,
      notes:             input.notes ?? null,
    });

    if (closureErr) throw new Error(closureErr.message);

    const { error } = await admin
      .from("fiscal_periods")
      .update({ status: "closed", updated_at: now })
      .eq("id", input.fiscalPeriodId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            input.tenantId,
      entityId:            input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "gl.period.close",
      targetTable:         "fiscal_periods",
      targetRecordId:      input.fiscalPeriodId,
      oldValues:           { status: period.status },
      newValues:           { status: "closed" },
    });

    revalidatePath("/finance/periods");

    return { success: true, message: "Fiscal period closed." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Update GL account fields. Permission: gl.account.manage
 */
export async function updateAccount(
  input: z.infer<typeof UpdateAccountSchema>
): Promise<ActionResult> {
  try {
    const parsed = UpdateAccountSchema.parse(input);
    const ctx = await resolveRequestContext(parsed.tenantId);
    requirePermission(ctx, "gl.account.manage");
    requireEntityScope(ctx, parsed.entityId);

    if (
      parsed.name === undefined &&
      parsed.description === undefined &&
      parsed.allowPosting === undefined &&
      parsed.isActive === undefined &&
      parsed.parentAccountId === undefined &&
      parsed.integrationAccountType === undefined &&
      parsed.integrationDetailType === undefined &&
      parsed.sourceOfTruth === undefined &&
      parsed.sourceReferenceTable === undefined &&
      parsed.externalAccountRef === undefined
    ) {
      return { success: false, message: "No fields to update." };
    }

    const admin = createSupabaseAdminClient();

    const { data: row } = await admin
      .from("accounts")
      .select(
        "id, name, description, allow_posting, is_active, parent_account_id, integration_account_type, integration_detail_type, source_of_truth, source_reference_table, external_account_ref"
      )
      .eq("id", parsed.accountId)
      .eq("tenant_id", parsed.tenantId)
      .eq("entity_id", parsed.entityId)
      .single();

    if (!row) return { success: false, message: "Account not found." };

    if (parsed.parentAccountId) {
      const { data: parent } = await admin
        .from("accounts")
        .select("id")
        .eq("id", parsed.parentAccountId)
        .eq("entity_id", parsed.entityId)
        .single();
      if (!parent) {
        return {
          success: false,
          message: "Parent account must belong to the same entity.",
          errors: [{ code: "validation_failed", message: "invalid_parent_account" }],
        };
      }
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.name !== undefined) patch.name = parsed.name;
    if (parsed.description !== undefined) patch.description = parsed.description;
    if (parsed.allowPosting !== undefined) patch.allow_posting = parsed.allowPosting;
    if (parsed.isActive !== undefined) patch.is_active = parsed.isActive;
    if (parsed.parentAccountId !== undefined) patch.parent_account_id = parsed.parentAccountId;
    if (parsed.integrationAccountType !== undefined) patch.integration_account_type = parsed.integrationAccountType;
    if (parsed.integrationDetailType !== undefined) {
      patch.integration_detail_type =
        parsed.integrationDetailType === null || parsed.integrationDetailType === "" ? null : parsed.integrationDetailType;
    }
    if (parsed.sourceOfTruth !== undefined) patch.source_of_truth = parsed.sourceOfTruth;
    if (parsed.sourceReferenceTable !== undefined) {
      patch.source_reference_table =
        parsed.sourceReferenceTable === null || parsed.sourceReferenceTable === ""
          ? null
          : parsed.sourceReferenceTable;
    }
    if (parsed.externalAccountRef !== undefined) {
      patch.external_account_ref =
        parsed.externalAccountRef === null || parsed.externalAccountRef === ""
          ? null
          : parsed.externalAccountRef;
    }

    const { error } = await admin.from("accounts").update(patch).eq("id", parsed.accountId);
    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            parsed.tenantId,
      entityId:            parsed.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "gl.account.update",
      targetTable:         "accounts",
      targetRecordId:      parsed.accountId,
      oldValues:           row,
      newValues:           patch,
    });

    revalidatePath("/finance/accounts");

    return { success: true, message: "Account updated." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Deactivate an account (soft archive). Permission: gl.account.manage
 */
export async function archiveAccount(input: {
  tenantId: string;
  entityId: string;
  accountId: string;
}): Promise<ActionResult> {
  try {
    const ctx = await resolveRequestContext(input.tenantId);
    requirePermission(ctx, "gl.account.manage");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row } = await admin
      .from("accounts")
      .select("is_active, code")
      .eq("id", input.accountId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .single();

    if (!row) return { success: false, message: "Account not found." };
    if (!row.is_active) return { success: false, message: "Account is already inactive." };

    const now = new Date().toISOString();
    const { error } = await admin
      .from("accounts")
      .update({ is_active: false, updated_at: now })
      .eq("id", input.accountId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            input.tenantId,
      entityId:            input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "gl.account.archive",
      targetTable:         "accounts",
      targetRecordId:      input.accountId,
      oldValues:           { is_active: true },
      newValues:           { is_active: false },
    });

    revalidatePath("/finance/accounts");

    return { success: true, message: `Account ${row.code} archived.` };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Reopen a closed fiscal period. Permission: gl.period.reopen
 */
export async function reopenFiscalPeriod(input: {
  tenantId: string;
  entityId: string;
  fiscalPeriodId: string;
  reopenReason: string;
}): Promise<ActionResult> {
  try {
    if (!input.reopenReason?.trim()) {
      return { success: false, message: "A reopen reason is required." };
    }

    const ctx = await resolveRequestContext(input.tenantId);
    requirePermission(ctx, "gl.period.reopen");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: period } = await admin
      .from("fiscal_periods")
      .select("status")
      .eq("id", input.fiscalPeriodId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .single();

    if (!period) return { success: false, message: "Fiscal period not found." };
    if (period.status !== "closed") {
      return { success: false, message: "Only a closed fiscal period can be reopened." };
    }

    const now = new Date().toISOString();

    const { data: openClosure } = await admin
      .from("fiscal_period_closures")
      .select("id")
      .eq("fiscal_period_id", input.fiscalPeriodId)
      .is("reopened_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openClosure) {
      await admin
        .from("fiscal_period_closures")
        .update({
          reopened_at:  now,
          reopened_by:  ctx.platformUserId,
          notes:        input.reopenReason.trim(),
          updated_at:   now,
        })
        .eq("id", openClosure.id);
    }

    const { error } = await admin
      .from("fiscal_periods")
      .update({ status: "open", updated_at: now })
      .eq("id", input.fiscalPeriodId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId:            input.tenantId,
      entityId:            input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey:           "finance_core",
      actionCode:          "gl.period.reopen",
      targetTable:         "fiscal_periods",
      targetRecordId:      input.fiscalPeriodId,
      oldValues:           { status: "closed" },
      newValues:           { status: "open", reason: input.reopenReason.trim() },
    });

    revalidatePath("/finance/periods");

    return { success: true, message: "Fiscal period reopened." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

// ── GL journal batches & lines (Pack 016) ───────────────────────────────────

const CreateGlJournalBatchSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  journalNumber: z.string().min(1).max(64),
  journalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(2000).optional(),
  fiscalPeriodId: z.string().uuid().optional(),
});

/** Permission: journal.post */
export async function createGlJournalBatch(
  input: z.infer<typeof CreateGlJournalBatchSchema>
): Promise<ActionResult<{ journalBatchId: string }>> {
  try {
    const v = CreateGlJournalBatchSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "journal.post");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    if (v.fiscalPeriodId) {
      const { data: fp, error: fe } = await admin
        .from("fiscal_periods")
        .select("id, entity_id, status")
        .eq("id", v.fiscalPeriodId)
        .eq("tenant_id", v.tenantId)
        .single();
      if (fe || !fp || fp.entity_id !== v.entityId) {
        return { success: false, message: "Fiscal period not found for this entity." };
      }
    }

    const { data: row, error } = await admin
      .from("gl_journal_batches")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        fiscal_period_id: v.fiscalPeriodId ?? null,
        journal_number: v.journalNumber.trim(),
        journal_date: v.journalDate,
        description: v.description?.trim() ?? null,
        batch_status: "draft",
        created_by: ctx.platformUserId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "gl.journal_batch.create",
      targetTable: "gl_journal_batches",
      targetRecordId: row.id,
      newValues: { journalNumber: v.journalNumber },
    });

    revalidatePath("/finance/journals");
    revalidatePath(`/finance/journals/${row.id}`);

    return { success: true, message: "Journal batch created.", data: { journalBatchId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const AddGlJournalLineSchema = z.object({
  tenantId: z.string().uuid(),
  journalBatchId: z.string().uuid(),
  accountId: z.string().uuid(),
  memo: z.string().max(500).optional(),
  debitAmount: z.number().min(0),
  creditAmount: z.number().min(0),
});

/** Permission: journal.post */
export async function addGlJournalLine(
  input: z.infer<typeof AddGlJournalLineSchema>
): Promise<ActionResult<{ lineId: string }>> {
  try {
    const v = AddGlJournalLineSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "journal.post");

    const admin = createSupabaseAdminClient();
    const { data: batch, error: be } = await admin
      .from("gl_journal_batches")
      .select("id, entity_id, batch_status")
      .eq("id", v.journalBatchId)
      .eq("tenant_id", v.tenantId)
      .single();
    if (be || !batch) return { success: false, message: "Journal batch not found." };
    if (batch.batch_status !== "draft") return { success: false, message: "Only draft journals accept lines." };
    requireEntityScope(ctx, batch.entity_id);

    const debit = Number(v.debitAmount.toFixed(2));
    const credit = Number(v.creditAmount.toFixed(2));
    if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
      return { success: false, message: "Enter either a debit or a credit amount (not both, not zero)." };
    }

    const { data: acct, error: ae } = await admin
      .from("accounts")
      .select("id, entity_id, allow_posting, is_active")
      .eq("id", v.accountId)
      .eq("tenant_id", v.tenantId)
      .single();
    if (ae || !acct || acct.entity_id !== batch.entity_id) {
      return { success: false, message: "Account not found on this entity." };
    }
    if (!acct.allow_posting || !acct.is_active) {
      return { success: false, message: "Account is not active for posting." };
    }

    const { data: maxRow } = await admin
      .from("gl_journal_lines")
      .select("line_number")
      .eq("journal_batch_id", v.journalBatchId)
      .order("line_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextLine = (maxRow?.line_number ?? 0) + 1;

    const { data: line, error: le } = await admin
      .from("gl_journal_lines")
      .insert({
        tenant_id: v.tenantId,
        journal_batch_id: v.journalBatchId,
        line_number: nextLine,
        account_id: v.accountId,
        memo: v.memo?.trim() ?? null,
        debit_amount: debit,
        credit_amount: credit,
      })
      .select("id")
      .single();

    if (le) throw new Error(le.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: batch.entity_id,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "gl.journal_line.add",
      targetTable: "gl_journal_lines",
      targetRecordId: line.id,
      newValues: { lineNumber: nextLine, debit, credit },
    });

    revalidatePath("/finance/journals");
    revalidatePath(`/finance/journals/${v.journalBatchId}`);

    return { success: true, message: "Line added.", data: { lineId: line.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const DeleteGlJournalLineSchema = z.object({
  tenantId: z.string().uuid(),
  journalLineId: z.string().uuid(),
});

/** Permission: journal.post */
export async function deleteGlJournalLine(
  input: z.infer<typeof DeleteGlJournalLineSchema>
): Promise<ActionResult<void>> {
  try {
    const v = DeleteGlJournalLineSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "journal.post");

    const admin = createSupabaseAdminClient();
    const { data: line, error: le } = await admin
      .from("gl_journal_lines")
      .select("id, journal_batch_id, tenant_id")
      .eq("id", v.journalLineId)
      .eq("tenant_id", v.tenantId)
      .single();
    if (le || !line) return { success: false, message: "Line not found." };

    const { data: batch, error: be } = await admin
      .from("gl_journal_batches")
      .select("id, entity_id, batch_status")
      .eq("id", line.journal_batch_id)
      .single();
    if (be || !batch || batch.batch_status !== "draft") {
      return { success: false, message: "Only draft journal lines can be removed." };
    }
    requireEntityScope(ctx, batch.entity_id);

    const { error: de } = await admin.from("gl_journal_lines").delete().eq("id", v.journalLineId);
    if (de) throw new Error(de.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: batch.entity_id,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "gl.journal_line.delete",
      targetTable: "gl_journal_lines",
      targetRecordId: v.journalLineId,
      oldValues: { journalBatchId: batch.id },
    });

    revalidatePath("/finance/journals");
    revalidatePath(`/finance/journals/${batch.id}`);

    return { success: true, message: "Line removed." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const PostGlJournalBatchSchema = z.object({
  tenantId: z.string().uuid(),
  journalBatchId: z.string().uuid(),
});

/** Permission: journal.post */
export async function postGlJournalBatch(
  input: z.infer<typeof PostGlJournalBatchSchema>
): Promise<ActionResult<void>> {
  try {
    const v = PostGlJournalBatchSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "journal.post");

    const admin = createSupabaseAdminClient();
    const { data: batch, error: be } = await admin
      .from("gl_journal_batches")
      .select("id, entity_id, batch_status, journal_date, fiscal_period_id")
      .eq("id", v.journalBatchId)
      .eq("tenant_id", v.tenantId)
      .single();
    if (be || !batch) return { success: false, message: "Journal batch not found." };
    if (batch.batch_status !== "draft") return { success: false, message: "Journal is not in draft status." };
    requireEntityScope(ctx, batch.entity_id);

    if (batch.fiscal_period_id) {
      const { data: fp, error: fe } = await admin
        .from("fiscal_periods")
        .select("start_date, end_date, status")
        .eq("id", batch.fiscal_period_id)
        .single();
      if (fe || !fp) return { success: false, message: "Fiscal period missing." };
      if (fp.status !== "open") return { success: false, message: "Fiscal period is not open." };
      const jd = batch.journal_date;
      if (jd < fp.start_date || jd > fp.end_date) {
        return { success: false, message: "Journal date is outside the selected fiscal period." };
      }
    }

    const { data: lines, error: le } = await admin
      .from("gl_journal_lines")
      .select("debit_amount, credit_amount")
      .eq("journal_batch_id", v.journalBatchId);
    if (le) throw new Error(le.message);
    const arr = lines ?? [];
    if (arr.length < 2) {
      return { success: false, message: "At least two lines are required to post." };
    }
    const totalDebit = arr.reduce((s: number, r: { debit_amount?: unknown; credit_amount?: unknown }) => s + Number(r.debit_amount ?? 0), 0);
    const totalCredit = arr.reduce((s: number, r: { debit_amount?: unknown; credit_amount?: unknown }) => s + Number(r.credit_amount ?? 0), 0);
    if (Number(totalDebit.toFixed(2)) !== Number(totalCredit.toFixed(2)) || totalDebit <= 0) {
      return { success: false, message: "Debits and credits must balance and be greater than zero." };
    }

    const now = new Date().toISOString();
    const { error: ue } = await admin
      .from("gl_journal_batches")
      .update({
        batch_status: "posted",
        posted_at: now,
        posted_by: ctx.platformUserId,
        updated_at: now,
      })
      .eq("id", v.journalBatchId);

    if (ue) throw new Error(ue.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: batch.entity_id,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "gl.journal_batch.post",
      targetTable: "gl_journal_batches",
      targetRecordId: v.journalBatchId,
      newValues: { totalDebit, totalCredit },
    });

    revalidatePath("/finance/journals");
    revalidatePath(`/finance/journals/${v.journalBatchId}`);

    return { success: true, message: "Journal posted." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const VoidGlJournalBatchSchema = z.object({
  tenantId: z.string().uuid(),
  journalBatchId: z.string().uuid(),
  voidReason: z.string().min(1).max(2000),
});

/** Permission: journal.reverse */
export async function voidGlJournalBatch(
  input: z.infer<typeof VoidGlJournalBatchSchema>
): Promise<ActionResult<void>> {
  try {
    const v = VoidGlJournalBatchSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "journal.reverse");

    const admin = createSupabaseAdminClient();
    const { data: batch, error: be } = await admin
      .from("gl_journal_batches")
      .select("id, entity_id, batch_status")
      .eq("id", v.journalBatchId)
      .eq("tenant_id", v.tenantId)
      .single();
    if (be || !batch) return { success: false, message: "Journal batch not found." };
    if (batch.batch_status !== "posted") return { success: false, message: "Only posted journals can be voided." };
    requireEntityScope(ctx, batch.entity_id);

    const now = new Date().toISOString();
    const { error: ue } = await admin
      .from("gl_journal_batches")
      .update({
        batch_status: "void",
        voided_at: now,
        void_reason: v.voidReason.trim(),
        updated_at: now,
      })
      .eq("id", v.journalBatchId);

    if (ue) throw new Error(ue.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: batch.entity_id,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "gl.journal_batch.void",
      targetTable: "gl_journal_batches",
      targetRecordId: v.journalBatchId,
      newValues: { voidReason: v.voidReason.trim() },
    });

    revalidatePath("/finance/journals");
    revalidatePath(`/finance/journals/${v.journalBatchId}`);

    return { success: true, message: "Journal voided." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

// ── Pack 017 — GL account bindings for subledger automation ───────────────────

const UpsertGlBindingSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  bindingKey: z.enum([
    "ar_receivable",
    "ar_revenue",
    "ar_cash_clearing",
    "payroll_expense",
    "payroll_liability",
    "ap_payable",
    "ap_expense",
    "ap_cash_clearing",
  ]),
  accountId: z.string().uuid(),
});

const ALLOWED_SOURCE_BY_BINDING_KEY: Record<
  z.infer<typeof UpsertGlBindingSchema>["bindingKey"],
  Array<"ar_subledger" | "ap_subledger" | "payroll_subledger" | "bank_register" | "system">
> = {
  ar_receivable: ["ar_subledger", "system"],
  ar_revenue: ["ar_subledger", "system"],
  ar_cash_clearing: ["ar_subledger", "bank_register", "system"],
  payroll_expense: ["payroll_subledger", "system"],
  payroll_liability: ["payroll_subledger", "system"],
  ap_payable: ["ap_subledger", "system"],
  ap_expense: ["ap_subledger", "system"],
  ap_cash_clearing: ["ap_subledger", "bank_register", "system"],
};

/** Permission: gl.binding.manage */
export async function upsertEntityGlAccountBinding(
  input: z.infer<typeof UpsertGlBindingSchema>
): Promise<ActionResult<{ bindingId: string }>> {
  try {
    const v = UpsertGlBindingSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "gl.binding.manage");
    requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    const { data: acct, error: ae } = await admin
      .from("accounts")
      .select("id, entity_id, allow_posting, is_active, source_of_truth")
      .eq("id", v.accountId)
      .eq("tenant_id", v.tenantId)
      .single();
    if (ae || !acct || acct.entity_id !== v.entityId) {
      return { success: false, message: "Account not found on this entity." };
    }
    if (!acct.allow_posting || !acct.is_active) {
      return { success: false, message: "Account must be active and allow posting." };
    }
    const allowedSources = ALLOWED_SOURCE_BY_BINDING_KEY[v.bindingKey];
    const source = String(acct.source_of_truth ?? "gl_manual");
    if (source === "gl_manual") {
      const { error: se } = await admin
        .from("accounts")
        .update({ source_of_truth: allowedSources[0], updated_at: new Date().toISOString() })
        .eq("id", v.accountId)
        .eq("tenant_id", v.tenantId);
      if (se) throw new Error(se.message);
    } else if (!allowedSources.includes(source as (typeof allowedSources)[number])) {
      return {
        success: false,
        message: `Account source-of-truth is ${source}. Binding ${v.bindingKey} expects ${allowedSources.join(" or ")}.`,
      };
    }

    const { data: row, error } = await admin
      .from("entity_gl_account_bindings")
      .upsert(
        {
          tenant_id: v.tenantId,
          entity_id: v.entityId,
          binding_key: v.bindingKey,
          account_id: v.accountId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,entity_id,binding_key" }
      )
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "gl.binding.upsert",
      targetTable: "entity_gl_account_bindings",
      targetRecordId: row.id,
      newValues: { bindingKey: v.bindingKey, accountId: v.accountId },
    });

    revalidatePath("/finance/gl/posting-bindings");

    return { success: true, message: "GL binding saved.", data: { bindingId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Use with `<form action={submitCreateAccountForm}>` — must be a module-level export
 * from this `"use server"` file (not an inline closure) so the action can sit beside
 * Client Components on the same page.
 */
export async function submitCreateAccountForm(formData: FormData): Promise<void> {
  await createAccount(formData);
}

/** @see submitCreateAccountForm */
export async function submitCreateFiscalPeriodForm(formData: FormData): Promise<void> {
  await createFiscalPeriod(formData);
}

/** @see submitCreateFiscalPeriodForm */
export async function submitSeedFiscalPeriodsForm(formData: FormData): Promise<void> {
  await seedFiscalPeriods(formData);
}

/** @see submitCreateAccountForm */
export async function submitSeedChartOfAccountsForm(formData: FormData): Promise<void> {
  await seedChartOfAccounts(formData);
}
