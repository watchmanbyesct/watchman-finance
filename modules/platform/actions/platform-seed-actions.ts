/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use server";

import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { type ActionResult } from "@/lib/errors/app-error";
import { createCustomer } from "@/modules/ar/actions/ar-actions";
import { createVendor } from "@/modules/ap/actions/ap-actions";
import {
  seedChartOfAccounts,
  seedFiscalPeriods,
  seedIntegrationAccountCategories,
} from "@/modules/finance-core/actions/finance-core-actions";
import {
  createPayGroup,
  createPayPeriod,
  createPayrollRun,
  seedEmployeePayProfiles,
} from "@/modules/payroll/actions/payroll-actions";
import { seedBankAccounts } from "@/modules/banking/actions/banking-actions";
import { seedPack007CatalogBilling } from "@/modules/catalog/actions/catalog-actions";

const SeedAllPlatformSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  fiscalYear: z.coerce.number().int().min(2000).max(2100).optional(),
});

type SeedStep = {
  key: string;
  success: boolean;
  message: string;
};

type SeedAllPlatformData = {
  steps: SeedStep[];
  completed: number;
  failed: number;
};

function asMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function currentYear(): number {
  return new Date().getUTCFullYear();
}

/**
 * One-click orchestration for currently supported platform seeds.
 * Runs each step independently and returns per-step status.
 */
export async function seedAllPlatformWorkflows(
  input: z.infer<typeof SeedAllPlatformSchema>,
): Promise<ActionResult<SeedAllPlatformData>> {
  const steps: SeedStep[] = [];
  try {
    const parsed = SeedAllPlatformSchema.parse(input);
    const fiscalYear = parsed.fiscalYear ?? currentYear();
    const admin = createSupabaseAdminClient();

    const push = (key: string, success: boolean, message: string) => {
      steps.push({ key, success, message });
    };

    const integrationCats = await seedIntegrationAccountCategories({ tenantId: parsed.tenantId });
    push("account_categories_integration", integrationCats.success, integrationCats.message);

    const coa = await seedChartOfAccounts({
      tenantId: parsed.tenantId,
      entityId: parsed.entityId,
    });
    push("chart_of_accounts", coa.success, coa.message);

    const periods = await seedFiscalPeriods({
      tenantId: parsed.tenantId,
      entityId: parsed.entityId,
      fiscalYear,
    });
    push("fiscal_periods", periods.success, periods.message);

    let customerId: string | null = null;
    try {
      const { data: existingCustomer, error } = await admin
        .from("customers")
        .select("id")
        .eq("tenant_id", parsed.tenantId)
        .eq("entity_id", parsed.entityId)
        .eq("customer_code", "SEED-CUST-001")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (existingCustomer?.id) {
        customerId = existingCustomer.id;
        push("customer", true, "Seed customer already exists.");
      } else {
        const res = await createCustomer({
          tenantId: parsed.tenantId,
          entityId: parsed.entityId,
          customerCode: "SEED-CUST-001",
          legalName: "Seed Customer LLC",
          displayName: "Seed Customer",
          billingEmail: "billing.seed.customer@example.com",
          paymentTermsDays: 30,
        });
        customerId = res.data?.customerId ?? null;
        push("customer", res.success, res.message);
      }
    } catch (err) {
      push("customer", false, asMessage(err));
    }

    try {
      const { data: existingVendor, error } = await admin
        .from("vendors")
        .select("id")
        .eq("tenant_id", parsed.tenantId)
        .eq("entity_id", parsed.entityId)
        .eq("vendor_code", "SEED-VEND-001")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (existingVendor?.id) {
        push("vendor", true, "Seed vendor already exists.");
      } else {
        const res = await createVendor({
          tenantId: parsed.tenantId,
          entityId: parsed.entityId,
          vendorCode: "SEED-VEND-001",
          legalName: "Seed Vendor Inc",
          displayName: "Seed Vendor",
          remitEmail: "ap.seed.vendor@example.com",
          paymentTermsDays: 30,
        });
        push("vendor", res.success, res.message);
      }
    } catch (err) {
      push("vendor", false, asMessage(err));
    }

    let payGroupId: string | null = null;
    try {
      const { data: existingGroup, error } = await admin
        .from("pay_groups")
        .select("id")
        .eq("tenant_id", parsed.tenantId)
        .eq("entity_id", parsed.entityId)
        .eq("group_code", "SEED-WEEKLY")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (existingGroup?.id) {
        payGroupId = existingGroup.id;
        push("pay_group", true, "Seed pay group already exists.");
      } else {
        const res = await createPayGroup({
          tenantId: parsed.tenantId,
          entityId: parsed.entityId,
          groupCode: "SEED-WEEKLY",
          groupName: "Seed Weekly",
          payFrequency: "weekly",
          payScheduleAnchorDate: `${fiscalYear}-01-01`,
        });
        payGroupId = res.data?.payGroupId ?? null;
        push("pay_group", res.success, res.message);
      }
    } catch (err) {
      push("pay_group", false, asMessage(err));
    }

    let payPeriodId: string | null = null;
    if (payGroupId) {
      try {
        const { data: existingPeriod, error } = await admin
          .from("pay_periods")
          .select("id")
          .eq("tenant_id", parsed.tenantId)
          .eq("entity_id", parsed.entityId)
          .eq("pay_group_id", payGroupId)
          .eq("period_name", `Seed Week 1 ${fiscalYear}`)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (existingPeriod?.id) {
          payPeriodId = existingPeriod.id;
          push("pay_period", true, "Seed pay period already exists.");
        } else {
          const res = await createPayPeriod({
            tenantId: parsed.tenantId,
            entityId: parsed.entityId,
            payGroupId,
            periodName: `Seed Week 1 ${fiscalYear}`,
            periodStart: `${fiscalYear}-01-01`,
            periodEnd: `${fiscalYear}-01-07`,
            payDate: `${fiscalYear}-01-10`,
          });
          payPeriodId = res.data?.payPeriodId ?? null;
          push("pay_period", res.success, res.message);
        }
      } catch (err) {
        push("pay_period", false, asMessage(err));
      }
    } else {
      push("pay_period", false, "Skipped because pay group step failed.");
    }

    const profiles = await seedEmployeePayProfiles({
      tenantId: parsed.tenantId,
      entityId: parsed.entityId,
      defaultPayType: "hourly",
      defaultBaseRate: 30,
    });
    push("employee_pay_profiles", profiles.success, profiles.message);

    const bank = await seedBankAccounts({
      tenantId: parsed.tenantId,
      entityId: parsed.entityId,
    });
    push("bank_accounts", bank.success, bank.message);

    const pack007 = await seedPack007CatalogBilling({
      tenantId: parsed.tenantId,
      entityId: parsed.entityId,
    });
    push("pack_007_catalog_billing", pack007.success, pack007.message);

    if (payGroupId && payPeriodId) {
      try {
        const { data: existingRun, error } = await admin
          .from("payroll_runs")
          .select("id")
          .eq("tenant_id", parsed.tenantId)
          .eq("entity_id", parsed.entityId)
          .eq("pay_group_id", payGroupId)
          .eq("pay_period_id", payPeriodId)
          .neq("run_status", "reversed")
          .limit(1)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (existingRun?.id) {
          push("payroll_run", true, "Seed payroll run already exists.");
        } else {
          const run = await createPayrollRun({
            tenantId: parsed.tenantId,
            entityId: parsed.entityId,
            payGroupId,
            payPeriodId,
            runType: "regular",
            runNumber: `SEED-RUN-${fiscalYear}`,
          });
          push("payroll_run", run.success, run.message);
        }
      } catch (err) {
        push("payroll_run", false, asMessage(err));
      }
    } else {
      push("payroll_run", false, "Skipped because pay group/pay period is missing.");
    }

    const completed = steps.filter((s) => s.success).length;
    const failed = steps.length - completed;
    return {
      success: failed === 0,
      message:
        failed === 0
          ? `All ${completed} platform seed steps completed.`
          : `Completed ${completed} step(s), ${failed} failed.`,
      data: { steps, completed, failed },
    };
  } catch (err) {
    return {
      success: false,
      message: asMessage(err),
      data: {
        steps,
        completed: steps.filter((s) => s.success).length,
        failed: steps.filter((s) => !s.success).length,
      },
    };
  }
}
