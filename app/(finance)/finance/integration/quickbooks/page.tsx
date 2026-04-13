import Link from "next/link";
import { WorkflowPageFrame } from "@/components/finance/workflow-page-frame";
import { resolveFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { getQboConnectionSummary } from "@/lib/integrations/qbo-persistence";

export const metadata = { title: "QuickBooks Online — Watchman Finance" };

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const workspace = await resolveFinanceWorkspace();
  const connected = searchParams.connected === "1";
  const err = typeof searchParams.error === "string" ? searchParams.error : undefined;

  let qbo: Awaited<ReturnType<typeof getQboConnectionSummary>> = null;
  if (workspace) {
    try {
      qbo = await getQboConnectionSummary(workspace.tenantId);
    } catch {
      qbo = null;
    }
  }

  if (!workspace) {
    return (
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="wf-page-title">QuickBooks Online</h1>
          <p className="text-sm text-neutral-500 mt-1">Pack 002 — OAuth connection to Intuit</p>
        </div>
        <p className="text-sm text-neutral-500">
          You are signed in, but no finance tenant/workspace was resolved. Complete bootstrap and tenant membership, then
          return here.
        </p>
      </div>
    );
  }

  return (
    <WorkflowPageFrame
      title="QuickBooks Online"
      moduleLine="Pack 002 + migration 024 — Connect one QBO company per tenant via Intuit OAuth 2.0 (accounting scope)."
      packNumber={24}
      workspaceName="Integration & staging"
      workspace={workspace}
    >
      <div className="space-y-4">
        {connected && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-200">
            QuickBooks was connected successfully. Tokens are stored server-side only.
          </div>
        )}
        {err && (
          <div className="rounded-lg border border-red-500/30 bg-red-950/25 px-4 py-3 text-sm text-red-200">
            Connection issue: <code className="text-xs text-red-100">{err}</code>
          </div>
        )}

        <div className="wf-card space-y-4 text-sm text-neutral-400 leading-relaxed">
          <p>
            Use <span className="text-neutral-200 font-medium">Connect QuickBooks</span> to send your signed-in browser to
            Intuit. After you authorize, you return here with tokens saved for this tenant (
            <span className="text-neutral-300">{workspace.tenantDisplayName}</span>
            ). Configure{" "}
            <code className="text-xs text-neutral-300">QBO_CLIENT_ID</code>,{" "}
            <code className="text-xs text-neutral-300">QBO_CLIENT_SECRET</code>,{" "}
            <code className="text-xs text-neutral-300">QBO_REDIRECT_URI</code>, and{" "}
            <code className="text-xs text-neutral-300">QBO_ENVIRONMENT</code> in Vercel (or <code className="text-xs text-neutral-300">.env.local</code>
            ).
          </p>
          <p>
            Webhook URL for Intuit Developer (optional):{" "}
            <code className="text-xs text-neutral-300 break-all">
              {typeof process.env.NEXT_PUBLIC_APP_URL === "string"
                ? `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/quickbooks/webhook`
                : "/api/integrations/quickbooks/webhook"}
            </code>
          </p>
        </div>

        {qbo ? (
          <div className="wf-card space-y-2 text-sm">
            <h2 className="text-sm font-medium text-neutral-200">Current connection</h2>
            <p className="text-neutral-400">
              Company: <span className="text-neutral-200">{qbo.companyName ?? "—"}</span>
            </p>
            <p className="text-neutral-400">
              Realm ID: <code className="text-xs text-neutral-300">{qbo.realmId}</code>
            </p>
            <p className="text-neutral-500 text-xs">Last updated: {new Date(qbo.updatedAt).toLocaleString()}</p>
            <p className="text-xs text-neutral-500 pt-2">
              Re-run Connect to replace tokens (same tenant, new authorization).
            </p>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No QuickBooks connection stored for this tenant yet.</p>
        )}

        <a
          href="/api/integrations/quickbooks/start"
          className="inline-flex items-center rounded-md bg-amber-600/90 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500/90"
        >
          Connect QuickBooks
        </a>

        <p className="text-xs text-neutral-600">
          <Link href="/finance/integration" className="text-amber-500 hover:text-amber-400">
            ← Integration hub
          </Link>
        </p>
      </div>
    </WorkflowPageFrame>
  );
}
