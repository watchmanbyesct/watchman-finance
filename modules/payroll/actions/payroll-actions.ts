"use server";

import { randomUUID } from "crypto";
import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope, requireModuleEntitlement } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";
import { z } from "zod";

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

const CreatePayGroupSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  groupCode: z.string().min(1).max(80),
  groupName: z.string().min(1),
  payFrequency: z.enum(["weekly", "biweekly", "semimonthly", "monthly", "off_cycle"]),
  payScheduleAnchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Permission: payroll.profile.manage */
export async function createPayGroup(
  input: z.infer<typeof CreatePayGroupSchema>
): Promise<ActionResult<{ payGroupId: string }>> {
  try {
    const validated = CreatePayGroupSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "payroll");
    requirePermission(ctx, "payroll.profile.manage");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("pay_groups")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        group_code: validated.groupCode,
        group_name: validated.groupName,
        pay_frequency: validated.payFrequency,
        pay_schedule_anchor_date: validated.payScheduleAnchorDate ?? null,
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "payroll",
      actionCode: "payroll.pay_group.create",
      targetTable: "pay_groups",
      targetRecordId: row.id,
      newValues: { groupCode: validated.groupCode },
    });

    return { success: true, message: "Pay group created.", data: { payGroupId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreatePayPeriodSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  payGroupId: z.string().uuid(),
  periodName: z.string().min(1).max(120),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Permission: payroll.profile.manage */
export async function createPayPeriod(
  input: z.infer<typeof CreatePayPeriodSchema>
): Promise<ActionResult<{ payPeriodId: string }>> {
  try {
    const validated = CreatePayPeriodSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "payroll");
    requirePermission(ctx, "payroll.profile.manage");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    const { data: pg, error: pge } = await admin
      .from("pay_groups")
      .select("id")
      .eq("id", validated.payGroupId)
      .eq("tenant_id", validated.tenantId)
      .eq("entity_id", validated.entityId)
      .single();

    if (pge || !pg) return { success: false, message: "Pay group not found for this entity." };

    const { data: row, error } = await admin
      .from("pay_periods")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        pay_group_id: validated.payGroupId,
        period_name: validated.periodName,
        period_start: validated.periodStart,
        period_end: validated.periodEnd,
        pay_date: validated.payDate ?? null,
        status: "open",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "payroll",
      actionCode: "payroll.pay_period.create",
      targetTable: "pay_periods",
      targetRecordId: row.id,
      newValues: { periodName: validated.periodName },
    });

    return { success: true, message: "Pay period created.", data: { payPeriodId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateEmployeePayProfileSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  financePersonId: z.string().uuid(),
  payGroupId: z.string().uuid().optional(),
  employeeNumber: z.string().optional(),
  payType: z.enum(["hourly", "salary"]),
  baseRate: z.number().min(0).optional(),
  annualSalary: z.number().min(0).optional(),
  overtimeEligible: z.boolean().default(true),
  effectiveStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Permission: payroll.profile.manage */
export async function createEmployeePayProfile(
  input: z.infer<typeof CreateEmployeePayProfileSchema>
): Promise<ActionResult<{ employeePayProfileId: string }>> {
  try {
    const validated = CreateEmployeePayProfileSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "payroll");
    requirePermission(ctx, "payroll.profile.manage");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    const { data: existing } = await admin
      .from("employee_pay_profiles")
      .select("id")
      .eq("finance_person_id", validated.financePersonId)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        message: "This finance person already has a pay profile.",
        errors: [{ code: "conflict", message: "employee_pay_profile_exists" }],
      };
    }

    const { data: row, error } = await admin
      .from("employee_pay_profiles")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        finance_person_id: validated.financePersonId,
        pay_group_id: validated.payGroupId ?? null,
        employee_number: validated.employeeNumber ?? null,
        worker_type: "employee",
        pay_type: validated.payType,
        base_rate: validated.baseRate ?? null,
        annual_salary: validated.annualSalary ?? null,
        overtime_eligible: validated.overtimeEligible,
        payroll_status: "active",
        effective_start_date: validated.effectiveStartDate ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "payroll",
      actionCode: "payroll.profile.create",
      targetTable: "employee_pay_profiles",
      targetRecordId: row.id,
      newValues: { financePersonId: validated.financePersonId },
    });

    return { success: true, message: "Employee pay profile created.", data: { employeePayProfileId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreatePayrollRunSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  payGroupId: z.string().uuid(),
  payPeriodId: z.string().uuid(),
  runNumber: z.string().min(1).max(80).optional(),
  runType: z.enum(["regular", "off_cycle", "adjustment"]).default("regular"),
});

/**
 * Create a payroll run (Pack 004).
 * Permission: payroll.run.create
 */
export async function createPayrollRun(
  input: z.infer<typeof CreatePayrollRunSchema>
): Promise<ActionResult<{ payrollRunId: string }>> {
  try {
    const validated = CreatePayrollRunSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "payroll");
    requirePermission(ctx, "payroll.run.create");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    const { data: dupes } = await admin
      .from("payroll_runs")
      .select("id, run_status")
      .eq("tenant_id", validated.tenantId)
      .eq("entity_id", validated.entityId)
      .eq("pay_period_id", validated.payPeriodId)
      .neq("run_status", "reversed")
      .limit(1);

    if (dupes?.length) {
      return {
        success: false,
        message: `A payroll run already exists for this pay period (status: ${dupes[0].run_status}).`,
        errors: [{ code: "conflict", message: "payroll_run_already_exists" }],
      };
    }

    const { data: payPeriod, error: ppe } = await admin
      .from("pay_periods")
      .select("status, period_start, period_end, pay_date, pay_group_id")
      .eq("id", validated.payPeriodId)
      .eq("tenant_id", validated.tenantId)
      .eq("entity_id", validated.entityId)
      .single();

    if (ppe || !payPeriod) return { success: false, message: "Pay period not found." };
    if (payPeriod.pay_group_id !== validated.payGroupId) {
      return { success: false, message: "Pay group does not match this pay period." };
    }
    if (payPeriod.status === "closed") {
      return { success: false, message: "Cannot create a payroll run for a closed pay period." };
    }

    const runNumber =
      validated.runNumber ??
      `AUTO-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;

    const { data: run, error } = await admin
      .from("payroll_runs")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        pay_group_id: validated.payGroupId,
        pay_period_id: validated.payPeriodId,
        run_number: runNumber,
        run_type: validated.runType,
        run_status: "draft",
        pay_date: payPeriod.pay_date ?? null,
        period_start: payPeriod.period_start ?? null,
        period_end: payPeriod.period_end ?? null,
        total_gross: 0,
        total_net: 0,
        total_employee_taxes: 0,
        total_employer_taxes: 0,
        total_deductions: 0,
        created_by: ctx.platformUserId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "payroll",
      actionCode: "payroll.run.create",
      targetTable: "payroll_runs",
      targetRecordId: run.id,
      newValues: { payGroupId: validated.payGroupId, payPeriodId: validated.payPeriodId, runNumber },
    });

    return {
      success: true,
      message: "Payroll run created in draft. Load time and calculate when ready.",
      data: { payrollRunId: run.id },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Loads approved staged time into payroll_input_records for this run.
 * Permission: payroll.run.calculate
 */
export async function loadApprovedTimeIntoPayrollRun(input: {
  tenantId: string;
  entityId: string;
  payrollRunId: string;
}): Promise<ActionResult<{ insertedCount: number }>> {
  try {
    const ctx = await resolveRequestContext(input.tenantId);
    requireModuleEntitlement(ctx, "payroll");
    requirePermission(ctx, "payroll.run.calculate");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: run, error: re } = await admin
      .from("payroll_runs")
      .select("id")
      .eq("id", input.payrollRunId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .single();

    if (re || !run) return { success: false, message: "Payroll run not found." };

    const { error: delIn } = await admin
      .from("payroll_input_records")
      .delete()
      .eq("payroll_run_id", input.payrollRunId);
    if (delIn) throw new Error(delIn.message);

    const { data: entries, error: ee } = await admin
      .from("staged_time_entries")
      .select("id, employee_source_record_id, pay_period_start, source_record_id")
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .eq("approval_status", "approved")
      .in("validation_status", ["pending", "valid"]);

    if (ee) throw new Error(ee.message);

    type SteRow = {
      id: string;
      employee_source_record_id: string | null;
      pay_period_start: string | null;
      source_record_id: string;
    };
    const entryRows = (entries ?? []) as SteRow[];

    const empIds = [
      ...new Set(
        entryRows
          .map((e) => e.employee_source_record_id)
          .filter((x): x is string => Boolean(x))
      ),
    ];

    if (!empIds.length) {
      await writeAuditLog({
        tenantId: input.tenantId,
        entityId: input.entityId,
        actorPlatformUserId: ctx.platformUserId,
        moduleKey: "payroll",
        actionCode: "payroll.run.load_approved_time",
        targetTable: "payroll_input_records",
        metadata: { insertedCount: 0, payrollRunId: input.payrollRunId },
      });
      return { success: true, message: "No staged time rows matched.", data: { insertedCount: 0 } };
    }

    const { data: people, error: pe } = await admin
      .from("finance_people")
      .select("id, source_record_id")
      .eq("tenant_id", input.tenantId)
      .eq("source_system_key", "watchman_launch")
      .in("source_record_id", empIds);

    if (pe) throw new Error(pe.message);

    const fpByEmp = new Map<string, string>(
      (people ?? []).map((p: { id: string; source_record_id: string }) => [p.source_record_id, p.id])
    );

    type Agg = {
      finance_person_id: string;
      source_record_id: string;
      work_date: string | null;
      reg: number;
      ot: number;
      hol: number;
      un: number;
    };
    const agg = new Map<string, Agg>();

    for (const ste of entryRows) {
      const emp = ste.employee_source_record_id;
      if (!emp) continue;
      const fpId = fpByEmp.get(emp);
      if (!fpId) continue;

      const { data: sphs, error: se } = await admin
        .from("staged_payroll_hours")
        .select("regular_hours, overtime_hours, holiday_hours, unpaid_hours")
        .eq("staged_time_entry_id", ste.id);

      if (se) throw new Error(se.message);

      const wd = ste.pay_period_start ?? null;
      const key = `${fpId}|${wd ?? ""}`;
      const cur: Agg =
        agg.get(key) ??
        {
          finance_person_id: fpId,
          source_record_id: ste.source_record_id,
          work_date: wd,
          reg: 0,
          ot: 0,
          hol: 0,
          un: 0,
        };

      for (const h of sphs ?? []) {
        cur.reg += Number(h.regular_hours ?? 0);
        cur.ot += Number(h.overtime_hours ?? 0);
        cur.hol += Number(h.holiday_hours ?? 0);
        cur.un += Number(h.unpaid_hours ?? 0);
      }
      agg.set(key, cur);
    }

    const insertRows = [...agg.values()].map((a) => ({
      tenant_id: input.tenantId,
      entity_id: input.entityId,
      payroll_run_id: input.payrollRunId,
      finance_person_id: a.finance_person_id,
      source_type: "approved_time" as const,
      source_table: "staged_time_entries",
      source_record_id: a.source_record_id,
      work_date: a.work_date,
      hours_regular: a.reg,
      hours_overtime: a.ot,
      hours_holiday: a.hol,
      hours_unpaid: a.un,
      validation_status: "valid" as const,
    }));

    if (!insertRows.length) {
      await writeAuditLog({
        tenantId: input.tenantId,
        entityId: input.entityId,
        actorPlatformUserId: ctx.platformUserId,
        moduleKey: "payroll",
        actionCode: "payroll.run.load_approved_time",
        targetTable: "payroll_input_records",
        metadata: { insertedCount: 0, payrollRunId: input.payrollRunId },
      });
      return { success: true, message: "No finance people resolved for staged time.", data: { insertedCount: 0 } };
    }

    const { error: ie } = await admin.from("payroll_input_records").insert(insertRows);
    if (ie) throw new Error(ie.message);

    await writeAuditLog({
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "payroll",
      actionCode: "payroll.run.load_approved_time",
      targetTable: "payroll_input_records",
      metadata: { insertedCount: insertRows.length, payrollRunId: input.payrollRunId },
    });

    return {
      success: true,
      message: "Approved time loaded into payroll inputs.",
      data: { insertedCount: insertRows.length },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * Calculates payroll run items from input records (hourly gross heuristic, Pack 004).
 * Permission: payroll.run.calculate
 */
export async function calculatePayrollRun(input: {
  tenantId: string;
  entityId: string;
  payrollRunId: string;
}): Promise<ActionResult<{ payrollRunId: string; itemCount: number }>> {
  try {
    const ctx = await resolveRequestContext(input.tenantId);
    requireModuleEntitlement(ctx, "payroll");
    requirePermission(ctx, "payroll.run.calculate");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: run, error: re } = await admin
      .from("payroll_runs")
      .select("run_status")
      .eq("id", input.payrollRunId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .single();

    if (re || !run) return { success: false, message: "Payroll run not found." };
    if (run.run_status !== "draft" && run.run_status !== "calculating") {
      return {
        success: false,
        message: `Run must be draft or calculating to calculate. Current: ${run.run_status}.`,
      };
    }

    const { error: ue0 } = await admin
      .from("payroll_runs")
      .update({ run_status: "calculating" })
      .eq("id", input.payrollRunId);

    if (ue0) throw new Error(ue0.message);

    const { error: de } = await admin.from("payroll_run_items").delete().eq("payroll_run_id", input.payrollRunId);
    if (de) throw new Error(de.message);

    const { data: inputs, error: ie } = await admin
      .from("payroll_input_records")
      .select(
        "finance_person_id, hours_regular, hours_overtime, hours_holiday, hours_unpaid"
      )
      .eq("payroll_run_id", input.payrollRunId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .not("finance_person_id", "is", null);

    if (ie) throw new Error(ie.message);

    type InputRow = {
      finance_person_id: string;
      hours_regular: string | number | null;
      hours_overtime: string | number | null;
      hours_holiday: string | number | null;
      hours_unpaid: string | number | null;
    };
    const inputRows = (inputs ?? []) as InputRow[];

    type H = { reg: number; ot: number; hol: number; un: number };
    const byFp = new Map<string, H>();
    for (const row of inputRows) {
      const id = row.finance_person_id;
      const cur = byFp.get(id) ?? { reg: 0, ot: 0, hol: 0, un: 0 };
      cur.reg += Number(row.hours_regular ?? 0);
      cur.ot += Number(row.hours_overtime ?? 0);
      cur.hol += Number(row.hours_holiday ?? 0);
      cur.un += Number(row.hours_unpaid ?? 0);
      byFp.set(id, cur);
    }

    const fpIds = [...byFp.keys()];
    if (!fpIds.length) {
      const { error: ue1 } = await admin
        .from("payroll_runs")
        .update({
          run_status: "review",
          total_gross: 0,
          total_net: 0,
          total_employee_taxes: 0,
          total_employer_taxes: 0,
          total_deductions: 0,
        })
        .eq("id", input.payrollRunId);

      if (ue1) throw new Error(ue1.message);

      await admin.from("payroll_approval_logs").insert({
        tenant_id: input.tenantId,
        entity_id: input.entityId,
        payroll_run_id: input.payrollRunId,
        action_code: "calculated",
        actor_platform_user_id: ctx.platformUserId,
        action_notes: "Payroll run calculated (no inputs)",
      });

      await writeAuditLog({
        tenantId: input.tenantId,
        entityId: input.entityId,
        actorPlatformUserId: ctx.platformUserId,
        moduleKey: "payroll",
        actionCode: "payroll.run.calculate",
        targetTable: "payroll_runs",
        targetRecordId: input.payrollRunId,
        metadata: { itemCount: 0 },
      });

      return { success: true, message: "Calculated with no line items.", data: { payrollRunId: input.payrollRunId, itemCount: 0 } };
    }

    const { data: profiles, error: pe } = await admin
      .from("employee_pay_profiles")
      .select("id, finance_person_id, base_rate")
      .eq("tenant_id", input.tenantId)
      .in("finance_person_id", fpIds);

    if (pe) throw new Error(pe.message);

    type EppRow = { id: string; finance_person_id: string; base_rate: number | string | null };
    const profileByFp = new Map<string, EppRow>(
      (profiles ?? []).map((p: EppRow) => [p.finance_person_id, p])
    );

    const itemRows: Record<string, unknown>[] = [];
    for (const [fpId, h] of byFp) {
      const epp = profileByFp.get(fpId);
      if (!epp) continue;
      const base = Number(epp.base_rate ?? 0);
      const gross = roundMoney(
        h.reg * base + h.ot * base * 1.5 + h.hol * base
      );
      itemRows.push({
        tenant_id: input.tenantId,
        entity_id: input.entityId,
        payroll_run_id: input.payrollRunId,
        finance_person_id: fpId,
        employee_pay_profile_id: epp.id,
        item_status: "calculated",
        regular_hours: h.reg,
        overtime_hours: h.ot,
        holiday_hours: h.hol,
        unpaid_hours: h.un,
        gross_pay: gross,
        employee_taxes: 0,
        employer_taxes: 0,
        deductions_total: 0,
        net_pay: gross,
      });
    }

    if (itemRows.length) {
      const { error: insE } = await admin.from("payroll_run_items").insert(itemRows);
      if (insE) throw new Error(insE.message);
    }

    const { data: sums } = await admin
      .from("payroll_run_items")
      .select("gross_pay, net_pay, employee_taxes, employer_taxes, deductions_total")
      .eq("payroll_run_id", input.payrollRunId);

    type SumRow = {
      gross_pay: string | number;
      net_pay: string | number;
      employee_taxes: string | number;
      employer_taxes: string | number;
      deductions_total: string | number;
    };
    const sumList = (sums ?? []) as SumRow[];
    const totalGross = roundMoney(sumList.reduce((s, r) => s + Number(r.gross_pay), 0));
    const totalNet = roundMoney(sumList.reduce((s, r) => s + Number(r.net_pay), 0));
    const totalEmpTax = roundMoney(sumList.reduce((s, r) => s + Number(r.employee_taxes), 0));
    const totalErTax = roundMoney(sumList.reduce((s, r) => s + Number(r.employer_taxes), 0));
    const totalDed = roundMoney(sumList.reduce((s, r) => s + Number(r.deductions_total), 0));

    const { error: ue2 } = await admin
      .from("payroll_runs")
      .update({
        run_status: "review",
        total_gross: totalGross,
        total_net: totalNet,
        total_employee_taxes: totalEmpTax,
        total_employer_taxes: totalErTax,
        total_deductions: totalDed,
      })
      .eq("id", input.payrollRunId);

    if (ue2) throw new Error(ue2.message);

    await admin.from("payroll_approval_logs").insert({
      tenant_id: input.tenantId,
      entity_id: input.entityId,
      payroll_run_id: input.payrollRunId,
      action_code: "calculated",
      actor_platform_user_id: ctx.platformUserId,
      action_notes: "Payroll run calculated",
    });

    await writeAuditLog({
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "payroll",
      actionCode: "payroll.run.calculate",
      targetTable: "payroll_runs",
      targetRecordId: input.payrollRunId,
      metadata: { itemCount: itemRows.length },
    });

    return {
      success: true,
      message: "Payroll run calculated.",
      data: { payrollRunId: input.payrollRunId, itemCount: itemRows.length },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/**
 * @deprecated Prefer calculatePayrollRun — kept for callers that still invoke this name.
 * Runs the same calculation pipeline.
 */
export async function submitPayrollRunForCalculation(input: {
  tenantId: string;
  entityId: string;
  payrollRunId: string;
}): Promise<ActionResult<{ payrollRunId: string; itemCount: number }>> {
  return calculatePayrollRun(input);
}

/** Permission: payroll.run.approve */
export async function approvePayrollRun(input: {
  tenantId: string;
  entityId: string;
  payrollRunId: string;
  actionNotes?: string;
  /** @deprecated use actionNotes */
  approvalNotes?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await resolveRequestContext(input.tenantId);
    requireModuleEntitlement(ctx, "payroll");
    requirePermission(ctx, "payroll.run.approve");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: run, error: re } = await admin
      .from("payroll_runs")
      .select("run_status")
      .eq("id", input.payrollRunId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .single();

    if (re || !run) return { success: false, message: "Payroll run not found." };
    if (run.run_status !== "review") {
      return {
        success: false,
        message: `Payroll run must be in 'review' status to approve. Current status: ${run.run_status}.`,
      };
    }

    const { error } = await admin
      .from("payroll_runs")
      .update({
        run_status: "approved",
        approved_by: ctx.platformUserId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", input.payrollRunId);

    if (error) throw new Error(error.message);

    await admin.from("payroll_approval_logs").insert({
      tenant_id: input.tenantId,
      entity_id: input.entityId,
      payroll_run_id: input.payrollRunId,
      action_code: "approved",
      actor_platform_user_id: ctx.platformUserId,
      action_notes: input.actionNotes ?? input.approvalNotes ?? null,
    });

    await writeAuditLog({
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "payroll",
      actionCode: "payroll.run.approve",
      targetTable: "payroll_runs",
      targetRecordId: input.payrollRunId,
      newValues: { runStatus: "approved" },
    });

    return { success: true, message: "Payroll run approved. You may finalize when ready." };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/** Permission: payroll.run.finalize */
export async function finalizePayrollRun(input: {
  tenantId: string;
  entityId: string;
  payrollRunId: string;
}): Promise<ActionResult<{ payrollRunId: string; statementsGenerated: number }>> {
  try {
    const ctx = await resolveRequestContext(input.tenantId);
    requireModuleEntitlement(ctx, "payroll");
    requirePermission(ctx, "payroll.run.finalize");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: run, error: re } = await admin
      .from("payroll_runs")
      .select("run_status")
      .eq("id", input.payrollRunId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .single();

    if (re || !run) return { success: false, message: "Payroll run not found." };
    if (run.run_status !== "approved") {
      return {
        success: false,
        message: `Payroll run must be approved before finalize. Current: ${run.run_status}.`,
      };
    }

    const { data: items, error: ie } = await admin
      .from("payroll_run_items")
      .select("id, finance_person_id, gross_pay, net_pay")
      .eq("payroll_run_id", input.payrollRunId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId);

    if (ie) throw new Error(ie.message);

    type RunItemRow = {
      id: string;
      finance_person_id: string;
      gross_pay: string | number;
      net_pay: string | number;
    };
    const statementRows = ((items ?? []) as RunItemRow[]).map((pri) => ({
      tenant_id: input.tenantId,
      entity_id: input.entityId,
      payroll_run_item_id: pri.id,
      finance_person_id: pri.finance_person_id,
      statement_status: "generated" as const,
      statement_date: new Date().toISOString().slice(0, 10),
      gross_pay: pri.gross_pay,
      net_pay: pri.net_pay,
      ytd_gross: pri.gross_pay,
      ytd_net: pri.net_pay,
    }));

    let statementsGenerated = 0;
    if (statementRows.length) {
      const { error: se } = await admin.from("pay_statements").insert(statementRows);
      if (se) throw new Error(se.message);
      statementsGenerated = statementRows.length;
    }

    const { error: ue } = await admin
      .from("payroll_runs")
      .update({
        run_status: "finalized",
        finalized_by: ctx.platformUserId,
        finalized_at: new Date().toISOString(),
      })
      .eq("id", input.payrollRunId);

    if (ue) throw new Error(ue.message);

    await admin.from("payroll_approval_logs").insert({
      tenant_id: input.tenantId,
      entity_id: input.entityId,
      payroll_run_id: input.payrollRunId,
      action_code: "finalized",
      actor_platform_user_id: ctx.platformUserId,
      action_notes: "Payroll run finalized",
    });

    await writeAuditLog({
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "payroll",
      actionCode: "payroll.run.finalize",
      targetTable: "payroll_runs",
      targetRecordId: input.payrollRunId,
      metadata: { statementsGenerated },
    });

    return {
      success: true,
      message: "Payroll run finalized.",
      data: { payrollRunId: input.payrollRunId, statementsGenerated },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
