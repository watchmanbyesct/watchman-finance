"use server";

import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";

const CreateCostProfileSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(140),
  payrollTaxRate: z.number().min(0).max(10),
  workersCompRate: z.number().min(0).max(10),
  disabilityPflRate: z.number().min(0).max(10).default(0),
  liabilityRate: z.number().min(0).max(10).default(0),
  overheadRate: z.number().min(0).max(10).default(0),
  adminRate: z.number().min(0).max(10).default(0),
  supervisionRate: z.number().min(0).max(10).default(0),
  technologyRate: z.number().min(0).max(10).default(0),
  targetMargin: z.number().min(0.01).max(0.95),
  minimumMargin: z.number().min(0).max(0.95),
  isDefault: z.boolean().optional(),
});

export async function createFinanceCostProfile(
  input: z.infer<typeof CreateCostProfileSchema>,
): Promise<ActionResult<{ costProfileId: string }>> {
  try {
    const v = CreateCostProfileSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    const admin = createSupabaseAdminClient();

    if (v.isDefault) {
      await admin
        .from("finance_cost_profiles")
        .update({ is_default: false })
        .eq("tenant_id", v.tenantId)
        .eq("is_default", true);
    }

    const { data, error } = await admin
      .from("finance_cost_profiles")
      .insert({
        tenant_id: v.tenantId,
        name: v.name,
        is_default: Boolean(v.isDefault),
        payroll_tax_rate: v.payrollTaxRate,
        workers_comp_rate: v.workersCompRate,
        disability_pfl_rate: v.disabilityPflRate,
        liability_rate: v.liabilityRate,
        overhead_rate: v.overheadRate,
        admin_rate: v.adminRate,
        supervision_rate: v.supervisionRate,
        technology_rate: v.technologyRate,
        target_margin: v.targetMargin,
        minimum_margin: v.minimumMargin,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_pricing_engine",
      actionCode: "finance.cost_profile.create",
      targetTable: "finance_cost_profiles",
      targetRecordId: data.id,
      newValues: { name: v.name, targetMargin: v.targetMargin, minimumMargin: v.minimumMargin },
    });

    return { success: true, message: "Cost profile created.", data: { costProfileId: data.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateEstimateSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  prospectId: z.string().optional(),
  title: z.string().min(1).max(180),
  personnelType: z.string().min(1).max(80),
  serviceTypeId: z.string().uuid().optional(),
  hoursPerWeek: z.number().positive(),
  weeks: z.number().positive(),
  basePayRate: z.number().nonnegative(),
  overtimeHours: z.number().nonnegative().default(0),
  overtimeMultiplier: z.number().min(1).max(3).default(1.5),
  burdenRate: z.number().min(0).max(10),
  directExpenseTotal: z.number().nonnegative().default(0),
  indirectExpenseTotal: z.number().nonnegative().default(0),
  targetMargin: z.number().min(0.01).max(0.95),
  minimumMargin: z.number().min(0).max(0.95),
  billRateOverride: z.number().positive().optional(),
  costProfileId: z.string().uuid().optional(),
  riskLevel: z.enum(["low", "moderate", "high"]).default("low"),
  riskAdjustmentRate: z.number().min(0).max(0.5).default(0),
});

export async function createEstimateWithLineItem(
  input: z.infer<typeof CreateEstimateSchema>,
): Promise<ActionResult<{ estimateId: string; marginPercent: number; warning: string | null }>> {
  try {
    const v = CreateEstimateSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    const admin = createSupabaseAdminClient();

    const totalHours = (v.hoursPerWeek * v.weeks) + v.overtimeHours;
    const directLaborCost = v.basePayRate * v.hoursPerWeek * v.weeks;
    const overtimeCost = v.basePayRate * v.overtimeMultiplier * v.overtimeHours;
    const payrollBurden = v.basePayRate * v.burdenRate * (v.hoursPerWeek * v.weeks);
    const totalCost = directLaborCost + overtimeCost + payrollBurden + v.directExpenseTotal + v.indirectExpenseTotal;
    const loadedCostPerHour = totalHours > 0 ? totalCost / totalHours : 0;
    const riskAdjustedMargin = Math.min(0.95, v.targetMargin + v.riskAdjustmentRate);
    const recommendedBillRate = loadedCostPerHour / (1 - riskAdjustedMargin);
    const billRate = v.billRateOverride ?? recommendedBillRate;
    const totalRevenue = billRate * totalHours;
    const grossProfit = totalRevenue - totalCost;
    const marginPercent = totalRevenue > 0 ? grossProfit / totalRevenue : 0;
    const warning = marginPercent < v.minimumMargin ? "Margin below tenant minimum threshold." : null;
    const estimateNumber = `EST-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const requiresFinanceApproval = marginPercent < 0.25;
    const requiresExecutiveApproval = marginPercent < 0.18;
    const approvalStatus = requiresFinanceApproval || requiresExecutiveApproval ? "pending" : "not_required";

    const { data: estimate, error: estimateError } = await admin
      .from("finance_estimates")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId,
        estimate_number: estimateNumber,
        client_id: v.clientId ?? null,
        prospect_id: v.prospectId ?? null,
        title: v.title,
        status: "draft",
        stage: "draft",
        created_by: ctx.platformUserId,
        assigned_to: ctx.platformUserId,
        cost_profile_id: v.costProfileId ?? null,
        target_margin: v.targetMargin,
        minimum_margin: v.minimumMargin,
        total_revenue: totalRevenue,
        total_cost: totalCost,
        gross_profit: grossProfit,
        margin_percent: marginPercent,
        approval_status: approvalStatus,
      })
      .select("id")
      .single();
    if (estimateError) throw new Error(estimateError.message);

    const { error: lineError } = await admin.from("finance_estimate_line_items").insert({
      tenant_id: v.tenantId,
      estimate_id: estimate.id,
      service_type_id: v.serviceTypeId ?? null,
      personnel_type: v.personnelType,
      description: `${v.personnelType} coverage`,
      hours_per_week: v.hoursPerWeek,
      weeks: v.weeks,
      base_pay_rate: v.basePayRate,
      overtime_hours: v.overtimeHours,
      overtime_multiplier: v.overtimeMultiplier,
      burden_rate: v.burdenRate,
      direct_expense_total: v.directExpenseTotal,
      indirect_expense_total: v.indirectExpenseTotal,
      loaded_cost_per_hour: loadedCostPerHour,
      bill_rate: billRate,
      total_revenue: totalRevenue,
      total_cost: totalCost,
      gross_profit: grossProfit,
      margin_percent: marginPercent,
    });
    if (lineError) throw new Error(lineError.message);

    if (approvalStatus === "pending") {
      const approvalRule = requiresExecutiveApproval ? "margin_under_18_percent" : "margin_under_25_percent";
      const requiredRole = requiresExecutiveApproval ? "executive_approver" : "finance_admin";
      const { error: approvalError } = await admin.from("finance_estimate_approvals").insert({
        tenant_id: v.tenantId,
        estimate_id: estimate.id,
        approval_rule: approvalRule,
        required_role: requiredRole,
        requested_by: ctx.platformUserId,
        status: "requested",
      });
      if (approvalError) throw new Error(approvalError.message);
    }

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_pricing_engine",
      actionCode: "finance.estimate.create",
      targetTable: "finance_estimates",
      targetRecordId: estimate.id,
      newValues: { estimateNumber, marginPercent, warning, approvalStatus, riskLevel: v.riskLevel, riskAdjustmentRate: v.riskAdjustmentRate },
    });

    return { success: true, message: "Estimate created.", data: { estimateId: estimate.id, marginPercent, warning } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const GenerateProposalSchema = z.object({
  tenantId: z.string().uuid(),
  estimateId: z.string().uuid(),
  sentTo: z.string().email().optional(),
  expiresInDays: z.number().int().min(1).max(180).default(30),
});

export async function generateProposalFromEstimate(
  input: z.infer<typeof GenerateProposalSchema>,
): Promise<ActionResult<{ proposalId: string; publicToken: string }>> {
  try {
    const v = GenerateProposalSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    const admin = createSupabaseAdminClient();
    const { data: est, error: estError } = await admin
      .from("finance_estimates")
      .select("approval_status")
      .eq("tenant_id", v.tenantId)
      .eq("id", v.estimateId)
      .maybeSingle();
    if (estError) throw new Error(estError.message);
    if (!est) return { success: false, message: "Estimate not found." };
    if (est.approval_status === "pending") {
      return { success: false, message: "Proposal cannot be sent until required approvals are completed." };
    }

    const publicToken = randomUUID().replaceAll("-", "");
    const publicTokenHash = createHash("sha256").update(publicToken).digest("hex");
    const proposalNumber = `PRP-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + (v.expiresInDays * 24 * 60 * 60 * 1000)).toISOString();

    const { data: proposal, error } = await admin
      .from("finance_proposals")
      .insert({
        tenant_id: v.tenantId,
        estimate_id: v.estimateId,
        proposal_number: proposalNumber,
        version: 1,
        status: v.sentTo ? "sent" : "draft",
        sent_to: v.sentTo ?? null,
        sent_at: v.sentTo ? new Date().toISOString() : null,
        public_token_hash: publicTokenHash,
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await admin
      .from("finance_estimates")
      .update({
        stage: v.sentTo ? "sent" : "draft",
        sent_at: v.sentTo ? new Date().toISOString() : null,
      })
      .eq("tenant_id", v.tenantId)
      .eq("id", v.estimateId);

    await writeAuditLog({
      tenantId: v.tenantId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_pricing_engine",
      actionCode: "finance.proposal.generate",
      targetTable: "finance_proposals",
      targetRecordId: proposal.id,
      newValues: { estimateId: v.estimateId, sentTo: v.sentTo ?? null },
    });

    return { success: true, message: "Proposal generated.", data: { proposalId: proposal.id, publicToken } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const ApproveEstimateSchema = z.object({
  tenantId: z.string().uuid(),
  estimateId: z.string().uuid(),
  approve: z.boolean(),
  comments: z.string().optional(),
});

export async function reviewEstimateApproval(
  input: z.infer<typeof ApproveEstimateSchema>,
): Promise<ActionResult<{ estimateId: string }>> {
  try {
    const v = ApproveEstimateSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();

    const { data: approval, error: approvalErr } = await admin
      .from("finance_estimate_approvals")
      .select("id")
      .eq("tenant_id", v.tenantId)
      .eq("estimate_id", v.estimateId)
      .eq("status", "requested")
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (approvalErr) throw new Error(approvalErr.message);
    if (!approval) return { success: false, message: "No pending approval request found for this estimate." };

    const { error: updApprovalErr } = await admin
      .from("finance_estimate_approvals")
      .update({
        approver_id: ctx.platformUserId,
        status: v.approve ? "approved" : "rejected",
        approved_at: v.approve ? now : null,
        rejected_at: v.approve ? null : now,
        comments: v.comments ?? null,
      })
      .eq("id", approval.id)
      .eq("tenant_id", v.tenantId);
    if (updApprovalErr) throw new Error(updApprovalErr.message);

    const { error: updEstimateErr } = await admin
      .from("finance_estimates")
      .update({ approval_status: v.approve ? "approved" : "rejected" })
      .eq("tenant_id", v.tenantId)
      .eq("id", v.estimateId);
    if (updEstimateErr) throw new Error(updEstimateErr.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_pricing_engine",
      actionCode: "finance.estimate.approval.review",
      targetTable: "finance_estimates",
      targetRecordId: v.estimateId,
      newValues: { approved: v.approve, comments: v.comments ?? null },
    });

    return { success: true, message: v.approve ? "Estimate approved." : "Estimate rejected.", data: { estimateId: v.estimateId } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const SeedTemplateSchema = z.object({
  tenantId: z.string().uuid(),
});

export async function seedPricingTemplates(
  input: z.infer<typeof SeedTemplateSchema>,
): Promise<ActionResult<{ inserted: number }>> {
  try {
    const v = SeedTemplateSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    const admin = createSupabaseAdminClient();
    const templates = [
      ["Static Guard Coverage", "static_guard", "Unarmed Guard", 0.30],
      ["Armed Security Coverage", "armed_security", "Armed Guard", 0.35],
      ["Mobile Patrol Program", "mobile_patrol", "Patrol Officer", 0.32],
      ["Fire Watch Deployment", "fire_watch", "Fire Watch", 0.33],
      ["Event Security", "event_security", "Event Officer", 0.34],
      ["Concierge/Security Hybrid", "concierge_hybrid", "Concierge Officer", 0.30],
      ["Remote Guarding Support", "remote_guarding", "Remote Operator", 0.28],
    ] as const;
    const { data: existing, error: eErr } = await admin
      .from("finance_pricing_templates")
      .select("template_name")
      .eq("tenant_id", v.tenantId);
    if (eErr) throw new Error(eErr.message);
    const existingNames = new Set((existing ?? []).map((r: { template_name: string }) => r.template_name));
    const rows = templates
      .filter(([name]) => !existingNames.has(name))
      .map(([templateName, serviceType, personnelType, defaultMargin]) => ({
        tenant_id: v.tenantId,
        template_name: templateName,
        service_type: serviceType,
        personnel_type: personnelType,
        default_margin: defaultMargin,
        proposal_scope_text: `${templateName} package scope`,
        active_flag: true,
      }));
    if (rows.length) {
      const { error } = await admin.from("finance_pricing_templates").insert(rows);
      if (error) throw new Error(error.message);
    }
    await writeAuditLog({
      tenantId: v.tenantId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_pricing_engine",
      actionCode: "finance.pricing_templates.seed",
      targetTable: "finance_pricing_templates",
      newValues: { inserted: rows.length },
    });
    return { success: true, message: `Template seed complete (${rows.length} inserted).`, data: { inserted: rows.length } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const UpdateDealOutcomeSchema = z.object({
  tenantId: z.string().uuid(),
  estimateId: z.string().uuid(),
  outcome: z.enum(["won", "lost", "expired"]),
  outcomeReason: z.string().optional(),
  finalValue: z.number().nonnegative().optional(),
  finalMargin: z.number().min(0).max(0.95).optional(),
  notes: z.string().optional(),
});

export async function updateDealOutcome(
  input: z.infer<typeof UpdateDealOutcomeSchema>,
): Promise<ActionResult<{ outcomeId: string }>> {
  try {
    const v = UpdateDealOutcomeSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("finance_deal_outcomes")
      .insert({
        tenant_id: v.tenantId,
        estimate_id: v.estimateId,
        outcome: v.outcome,
        outcome_reason: v.outcomeReason ?? null,
        final_value: v.finalValue ?? null,
        final_margin: v.finalMargin ?? null,
        decided_by: ctx.platformUserId,
        notes: v.notes ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await admin
      .from("finance_estimates")
      .update({
        stage: v.outcome,
        won_at: v.outcome === "won" ? new Date().toISOString() : null,
        lost_at: v.outcome === "lost" ? new Date().toISOString() : null,
      })
      .eq("tenant_id", v.tenantId)
      .eq("id", v.estimateId);

    await writeAuditLog({
      tenantId: v.tenantId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_pricing_engine",
      actionCode: "finance.deal.outcome.update",
      targetTable: "finance_deal_outcomes",
      targetRecordId: data.id,
      newValues: { estimateId: v.estimateId, outcome: v.outcome },
    });

    return { success: true, message: "Deal outcome recorded.", data: { outcomeId: data.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateProfitAuditSchema = z.object({
  tenantId: z.string().uuid(),
  estimateId: z.string().uuid(),
  contractId: z.string().uuid().optional(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  actualRevenue: z.number().nonnegative(),
  actualCost: z.number().nonnegative(),
});

export async function generateContractProfitAudit(
  input: z.infer<typeof CreateProfitAuditSchema>,
): Promise<ActionResult<{ auditId: string }>> {
  try {
    const v = CreateProfitAuditSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    const admin = createSupabaseAdminClient();

    const { data: est, error: estErr } = await admin
      .from("finance_estimates")
      .select("id, total_revenue, total_cost, margin_percent")
      .eq("tenant_id", v.tenantId)
      .eq("id", v.estimateId)
      .maybeSingle();
    if (estErr) throw new Error(estErr.message);
    if (!est) return { success: false, message: "Estimate not found." };

    const estimatedRevenue = Number(est.total_revenue ?? 0);
    const estimatedCost = Number(est.total_cost ?? 0);
    const estimatedMargin = Number(est.margin_percent ?? 0);
    const actualMargin = v.actualRevenue > 0 ? (v.actualRevenue - v.actualCost) / v.actualRevenue : 0;
    const marginVariance = actualMargin - estimatedMargin;
    const riskLevel = marginVariance <= -0.1 ? "high" : marginVariance <= -0.05 ? "moderate" : "low";
    const recommendedAction =
      riskLevel === "high"
        ? "Immediate rate review and cost containment plan."
        : riskLevel === "moderate"
          ? "Investigate overtime, burden, and expense drift."
          : "Continue current pricing model and monitor monthly.";

    const { data, error } = await admin
      .from("finance_contract_profit_audits")
      .insert({
        tenant_id: v.tenantId,
        estimate_id: v.estimateId,
        contract_id: v.contractId ?? null,
        period_start: v.periodStart,
        period_end: v.periodEnd,
        estimated_revenue: estimatedRevenue,
        actual_revenue: v.actualRevenue,
        estimated_cost: estimatedCost,
        actual_cost: v.actualCost,
        estimated_margin: estimatedMargin,
        actual_margin: actualMargin,
        margin_variance: marginVariance,
        risk_level: riskLevel,
        recommended_action: recommendedAction,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_pricing_engine",
      actionCode: "finance.contract_profit_audit.generate",
      targetTable: "finance_contract_profit_audits",
      targetRecordId: data.id,
      newValues: { estimateId: v.estimateId, marginVariance },
    });

    return { success: true, message: "Contract profit audit generated.", data: { auditId: data.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const ScenarioStressSchema = z.object({
  tenantId: z.string().uuid(),
  estimateId: z.string().uuid(),
  wageIncreaseRate: z.number().min(0).max(0.5).default(0),
  workersCompIncreaseRate: z.number().min(0).max(0.5).default(0),
  addedSupervisorCost: z.number().nonnegative().default(0),
  addedCoverageHours: z.number().nonnegative().default(0),
  reducedBillRate: z.number().nonnegative().default(0),
});

export async function runEstimateScenarioStressTest(
  input: z.infer<typeof ScenarioStressSchema>,
): Promise<ActionResult<{ revisedMargin: number; revisedBillRate: number; riskLevel: string }>> {
  try {
    const v = ScenarioStressSchema.parse(input);
    await resolveRequestContext(v.tenantId);
    const admin = createSupabaseAdminClient();

    const { data: line, error: lineErr } = await admin
      .from("finance_estimate_line_items")
      .select("base_pay_rate, burden_rate, hours_per_week, weeks, overtime_hours, overtime_multiplier, direct_expense_total, indirect_expense_total, bill_rate")
      .eq("tenant_id", v.tenantId)
      .eq("estimate_id", v.estimateId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (lineErr) throw new Error(lineErr.message);
    if (!line) return { success: false, message: "Estimate line item not found." };

    const basePay = Number(line.base_pay_rate ?? 0);
    const burdenRate = Number(line.burden_rate ?? 0);
    const regularHours = Number(line.hours_per_week ?? 0) * Number(line.weeks ?? 0);
    const overtimeHours = Number(line.overtime_hours ?? 0);
    const totalHours = regularHours + overtimeHours + v.addedCoverageHours;
    const newBasePay = basePay * (1 + v.wageIncreaseRate);
    const newBurdenRate = burdenRate + v.workersCompIncreaseRate;
    const overtimeMultiplier = Number(line.overtime_multiplier ?? 1.5);
    const directLabor = newBasePay * regularHours;
    const overtimeCost = newBasePay * overtimeMultiplier * overtimeHours;
    const payrollBurden = newBasePay * newBurdenRate * regularHours;
    const directExpense = Number(line.direct_expense_total ?? 0);
    const indirectExpense = Number(line.indirect_expense_total ?? 0) + v.addedSupervisorCost;
    const revisedCost = directLabor + overtimeCost + payrollBurden + directExpense + indirectExpense;
    const revisedBillRate = Math.max(0, Number(line.bill_rate ?? 0) - v.reducedBillRate);
    const revisedRevenue = revisedBillRate * totalHours;
    const revisedMargin = revisedRevenue > 0 ? (revisedRevenue - revisedCost) / revisedRevenue : 0;
    const riskLevel = revisedMargin < 0.18 ? "high" : revisedMargin < 0.25 ? "moderate" : "low";

    return {
      success: true,
      message: "Scenario stress test completed.",
      data: { revisedMargin, revisedBillRate, riskLevel },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const RenewalRecommendationSchema = z.object({
  tenantId: z.string().uuid(),
  estimateId: z.string().uuid(),
  contractId: z.string().uuid().optional(),
  contractAnniversaryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currentBillRate: z.number().nonnegative(),
  wageIncreaseRate: z.number().min(0).max(0.5).default(0),
  insuranceIncreaseRate: z.number().min(0).max(0.5).default(0),
  overtimeTrendRate: z.number().min(0).max(0.5).default(0),
  inflationRate: z.number().min(0).max(0.5).default(0),
});

export async function generateRenewalRecommendation(
  input: z.infer<typeof RenewalRecommendationSchema>,
): Promise<ActionResult<{ recommendationId: string; recommendedBillRate: number; recommendedEscalationRate: number }>> {
  try {
    const v = RenewalRecommendationSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    const admin = createSupabaseAdminClient();

    const blendedOperationalPressure =
      (v.wageIncreaseRate * 0.5) + (v.insuranceIncreaseRate * 0.3) + (v.overtimeTrendRate * 0.2);
    const recommendedEscalationRate = Math.max(v.inflationRate, blendedOperationalPressure);
    const recommendedBillRate = v.currentBillRate * (1 + recommendedEscalationRate);
    const rationale = `Escalation blends wage (${(v.wageIncreaseRate * 100).toFixed(1)}%), insurance (${(v.insuranceIncreaseRate * 100).toFixed(1)}%), overtime trend (${(v.overtimeTrendRate * 100).toFixed(1)}%), and inflation floor (${(v.inflationRate * 100).toFixed(1)}%).`;

    const { data, error } = await admin
      .from("finance_contract_renewal_recommendations")
      .insert({
        tenant_id: v.tenantId,
        estimate_id: v.estimateId,
        contract_id: v.contractId ?? null,
        contract_anniversary_date: v.contractAnniversaryDate,
        current_bill_rate: v.currentBillRate,
        wage_increase_rate: v.wageIncreaseRate,
        insurance_increase_rate: v.insuranceIncreaseRate,
        overtime_trend_rate: v.overtimeTrendRate,
        inflation_rate: v.inflationRate,
        recommended_escalation_rate: recommendedEscalationRate,
        recommended_bill_rate: recommendedBillRate,
        rationale,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_pricing_engine",
      actionCode: "finance.renewal_recommendation.generate",
      targetTable: "finance_contract_renewal_recommendations",
      targetRecordId: data.id,
      newValues: { estimateId: v.estimateId, recommendedEscalationRate, recommendedBillRate },
    });

    return {
      success: true,
      message: "Renewal recommendation generated.",
      data: { recommendationId: data.id, recommendedBillRate, recommendedEscalationRate },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
