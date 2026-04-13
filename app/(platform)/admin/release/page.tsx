import Link from "next/link";
import { AdminSubpage } from "@/components/admin/admin-subpage";
import { WATCHMAN_DEPLOYED_MIGRATION_PACK } from "@/lib/constants/watchman-migrations";

export const metadata = { title: "Release management — Administration" };

export default function Page() {
  const pack = String(WATCHMAN_DEPLOYED_MIGRATION_PACK).padStart(3, "0");
  return (
    <AdminSubpage
      title="Release management"
      description="Track which SQL migration packs this deployment expects versus what has been applied in Supabase."
    >
      <div className="wf-card space-y-4 text-sm text-neutral-400 leading-relaxed">
        <p>
          App constant{" "}
          <code className="text-xs text-neutral-300">WATCHMAN_DEPLOYED_MIGRATION_PACK</code> is{" "}
          <span className="text-neutral-200 font-medium">{WATCHMAN_DEPLOYED_MIGRATION_PACK}</span> (pack{" "}
          <code className="text-xs text-neutral-300">{pack}</code>). Bump it only after the matching migrations are
          applied to your database.
        </p>
        <p>
          <Link href="/finance/dashboard" className="text-amber-500 hover:text-amber-400">
            Finance dashboard — setup checklist
          </Link>{" "}
          reflects the same pack progression.
        </p>
        <p>
          SQL sources live under <code className="text-xs text-neutral-300">supabase/migrations/</code> and mirrored
          numbered files at the repo root.
        </p>
      </div>
    </AdminSubpage>
  );
}
