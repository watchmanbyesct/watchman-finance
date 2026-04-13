import Link from "next/link";

export function GlSetupRequired() {
  return (
    <div className="wf-card border-amber-500/20 bg-amber-500/5">
      <p className="text-sm font-medium text-amber-200 mb-2">No finance workspace found</p>
      <p className="text-sm text-neutral-400 leading-relaxed mb-4">
        Sign in with a user that has an active tenant membership and at least one entity. If you have not
        bootstrapped the environment yet, run the greenfield bootstrap from the README, or create a tenant
        and entity from Administration.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/finance/dashboard" className="text-sm text-amber-500 hover:text-amber-400">
          Dashboard
        </Link>
        <Link href="/admin" className="text-sm text-amber-500 hover:text-amber-400">
          Administration
        </Link>
      </div>
    </div>
  );
}
