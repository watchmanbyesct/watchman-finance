import Link from "next/link";
import { AdminSubpage } from "@/components/admin/admin-subpage";

export const metadata = { title: "User access — Administration" };

export default function Page() {
  return (
    <AdminSubpage
      title="User access"
      description="Users, roles, entity scopes, and permissions live in Pack 001 tables (tenant_memberships, user_role_assignments, user_entity_scopes)."
    >
      <div className="wf-card space-y-3 text-sm text-neutral-400 leading-relaxed">
        <p>
          User administration UI is not wired to mutations yet. Manage memberships and roles in Supabase or via the
          greenfield bootstrap script for new environments.
        </p>
        <ul className="list-disc list-inside space-y-1 text-neutral-500">
          <li>
            <Link href="/finance/pack-013" className="text-amber-500 hover:text-amber-400">
              Permission codes reference (Pack 013)
            </Link>
          </li>
          <li>
            <code className="text-xs text-neutral-300">npm run greenfield:bootstrap</code> — seeds tenant_owner and
            role_permissions
          </li>
        </ul>
      </div>
    </AdminSubpage>
  );
}
