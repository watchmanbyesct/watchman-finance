import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { WorkflowDataTable } from "@/components/finance/workflow-data-table";
import {
  CostProfileCreateForm,
  EstimateQuickCreateForm,
  ProfitIntelligenceForms,
  ProposalAndOutcomeForms,
  TemplateAndApprovalForms,
} from "@/components/finance/connected/estimates-proposals-forms";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import {
  getFinanceEstimatesDashboardMetrics,
  listFinanceCostProfilesForTenant,
  listFinanceContractProfitAuditsForTenant,
  listFinanceDealOutcomesForTenant,
  listFinanceEstimateApprovalsForTenant,
  listFinanceEstimatesForEntity,
  listFinancePricingTemplatesForTenant,
  listFinanceProposalsForTenant,
  listFinanceRenewalRecommendationsForTenant,
} from "@/lib/finance/read-queries";

export const metadata = { title: "Estimates & Proposals - Watchman Finance" };

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export default async function Page() {
  const workspace = await resolveFinanceWorkspace();
  let loadError: string | null = null;
  let costProfiles: Awaited<ReturnType<typeof listFinanceCostProfilesForTenant>> = [];
  let estimates: Awaited<ReturnType<typeof listFinanceEstimatesForEntity>> = [];
  let proposals: Awaited<ReturnType<typeof listFinanceProposalsForTenant>> = [];
  let outcomes: Awaited<ReturnType<typeof listFinanceDealOutcomesForTenant>> = [];
  let approvals: Awaited<ReturnType<typeof listFinanceEstimateApprovalsForTenant>> = [];
  let templates: Awaited<ReturnType<typeof listFinancePricingTemplatesForTenant>> = [];
  let audits: Awaited<ReturnType<typeof listFinanceContractProfitAuditsForTenant>> = [];
  let renewals: Awaited<ReturnType<typeof listFinanceRenewalRecommendationsForTenant>> = [];
  let metrics = { totalPipelineValue: 0, wonValue: 0, lostValue: 0, averageMargin: 0, winRatio: 0 };

  if (workspace) {
    try {
      const [cp, est, prop, out, appr, tmpl, aud, ren, m] = await Promise.all([
        listFinanceCostProfilesForTenant(workspace.tenantId),
        listFinanceEstimatesForEntity(workspace.tenantId, workspace.entityId),
        listFinanceProposalsForTenant(workspace.tenantId),
        listFinanceDealOutcomesForTenant(workspace.tenantId),
        listFinanceEstimateApprovalsForTenant(workspace.tenantId),
        listFinancePricingTemplatesForTenant(workspace.tenantId),
        listFinanceContractProfitAuditsForTenant(workspace.tenantId),
        listFinanceRenewalRecommendationsForTenant(workspace.tenantId),
        getFinanceEstimatesDashboardMetrics(workspace.tenantId, workspace.entityId),
      ]);
      costProfiles = cp;
      estimates = est;
      proposals = prop;
      outcomes = out;
      approvals = appr;
      templates = tmpl;
      audits = aud;
      renewals = ren;
      metrics = m;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load estimates and proposals.";
    }
  }

  return (
    <WorkflowPageFrame
      title="Estimates & Proposals"
      moduleLine="Phase 1 + 2 + 3 active: estimate/proposal workflow, approvals, risk pricing, and profit intelligence (audit + scenario stress testing). Internal service: finance_pricing_engine."
      packNumber={29}
      workspaceName="Pricing and proposal engine"
      workspace={workspace}
      loadError={loadError}
    >
      {workspace && !loadError && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="wf-card"><p className="text-xs text-neutral-500">Total pipeline</p><p className="mt-1 text-lg font-semibold text-neutral-100">${metrics.totalPipelineValue.toFixed(2)}</p></div>
            <div className="wf-card"><p className="text-xs text-neutral-500">Won value</p><p className="mt-1 text-lg font-semibold text-green-300">${metrics.wonValue.toFixed(2)}</p></div>
            <div className="wf-card"><p className="text-xs text-neutral-500">Lost value</p><p className="mt-1 text-lg font-semibold text-red-300">${metrics.lostValue.toFixed(2)}</p></div>
            <div className="wf-card"><p className="text-xs text-neutral-500">Average margin</p><p className="mt-1 text-lg font-semibold text-neutral-100">{pct(metrics.averageMargin)}</p></div>
            <div className="wf-card"><p className="text-xs text-neutral-500">Win ratio</p><p className="mt-1 text-lg font-semibold text-neutral-100">{pct(metrics.winRatio)}</p></div>
          </div>

          <CostProfileCreateForm workspace={workspace} />
          <EstimateQuickCreateForm
            workspace={workspace}
            costProfiles={costProfiles as { id: string; name: string; is_default: boolean }[]}
            templates={templates as { id: string; template_name: string; personnel_type: string; default_margin: number }[]}
          />
          <TemplateAndApprovalForms workspace={workspace} estimates={estimates as { id: string; estimate_number: string; title: string; margin_percent: number }[]} />
          <ProposalAndOutcomeForms workspace={workspace} estimates={estimates as { id: string; estimate_number: string; title: string; margin_percent: number }[]} />
          <ProfitIntelligenceForms workspace={workspace} estimates={estimates as { id: string; estimate_number: string; title: string; margin_percent: number }[]} />

          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-medium text-neutral-300 mb-3">Estimates dashboard</h2>
              <WorkflowDataTable
                columns={[
                  { key: "estimate_number", label: "Estimate #" },
                  { key: "title", label: "Title" },
                  { key: "stage", label: "Stage" },
                  { key: "total_revenue", label: "Revenue" },
                  { key: "total_cost", label: "Cost" },
                  { key: "margin_percent", label: "Margin" },
                  { key: "approval_status", label: "Approval" },
                ]}
                rows={estimates as Record<string, unknown>[]}
                emptyMessage="No estimates yet."
              />
            </div>

            <div>
              <h2 className="text-sm font-medium text-neutral-300 mb-3">Proposal delivery</h2>
              <WorkflowDataTable
                columns={[
                  { key: "proposal_number", label: "Proposal #" },
                  { key: "estimate_id", label: "Estimate ID" },
                  { key: "status", label: "Status" },
                  { key: "sent_to", label: "Sent to" },
                  { key: "sent_at", label: "Sent at" },
                ]}
                rows={proposals as Record<string, unknown>[]}
                emptyMessage="No proposals yet."
              />
            </div>

            <div>
              <h2 className="text-sm font-medium text-neutral-300 mb-3">Approval queue</h2>
              <WorkflowDataTable
                columns={[
                  { key: "estimate_id", label: "Estimate ID" },
                  { key: "approval_rule", label: "Rule" },
                  { key: "required_role", label: "Required role" },
                  { key: "status", label: "Status" },
                  { key: "requested_at", label: "Requested at" },
                ]}
                rows={approvals as Record<string, unknown>[]}
                emptyMessage="No approval requests yet."
              />
            </div>

            <div>
              <h2 className="text-sm font-medium text-neutral-300 mb-3">Contract profit audits (estimated vs actual)</h2>
              <WorkflowDataTable
                columns={[
                  { key: "estimate_id", label: "Estimate ID" },
                  { key: "period_start", label: "Period start" },
                  { key: "period_end", label: "Period end" },
                  { key: "estimated_margin", label: "Estimated margin" },
                  { key: "actual_margin", label: "Actual margin" },
                  { key: "margin_variance", label: "Variance" },
                  { key: "risk_level", label: "Risk" },
                ]}
                rows={audits as Record<string, unknown>[]}
                emptyMessage="No profit audits yet."
              />
            </div>

            <div>
              <h2 className="text-sm font-medium text-neutral-300 mb-3">Renewal recommendations</h2>
              <WorkflowDataTable
                columns={[
                  { key: "estimate_id", label: "Estimate ID" },
                  { key: "contract_anniversary_date", label: "Anniversary" },
                  { key: "current_bill_rate", label: "Current rate" },
                  { key: "recommended_escalation_rate", label: "Escalation" },
                  { key: "recommended_bill_rate", label: "Recommended rate" },
                  { key: "rationale", label: "Rationale" },
                ]}
                rows={renewals as Record<string, unknown>[]}
                emptyMessage="No renewal recommendations yet."
              />
            </div>

            <div>
              <h2 className="text-sm font-medium text-neutral-300 mb-3">Deal outcomes</h2>
              <WorkflowDataTable
                columns={[
                  { key: "estimate_id", label: "Estimate ID" },
                  { key: "outcome", label: "Outcome" },
                  { key: "outcome_reason", label: "Reason" },
                  { key: "final_value", label: "Final value" },
                  { key: "final_margin", label: "Final margin" },
                  { key: "decided_at", label: "Decided at" },
                ]}
                rows={outcomes as Record<string, unknown>[]}
                emptyMessage="No outcomes yet."
              />
            </div>
          </div>
        </>
      )}
    </WorkflowPageFrame>
  );
}
