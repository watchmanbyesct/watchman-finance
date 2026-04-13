import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAuthSession } from "@/lib/auth/resolve-session";
import { getOptionalFinanceWorkspace } from "@/lib/context/resolve-finance-workspace";
import { buildQboAuthorizationUrl, resolveQboRedirectUri } from "@/lib/integrations/qbo-oauth";
import { insertQboOAuthState, pruneExpiredQboOAuthStates } from "@/lib/integrations/qbo-persistence";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";

/**
 * GET /api/integrations/quickbooks/start
 * Authenticated user — stores CSRF state and redirects to Intuit OAuth.
 */
export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "sign_in_required" }, { status: 401 });
  }

  const workspace = await getOptionalFinanceWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "no_finance_workspace" }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  const { data: pu, error: puErr } = await supabase
    .from("platform_users")
    .select("id")
    .eq("auth_user_id", session.userId)
    .maybeSingle();

  if (puErr || !pu?.id) {
    return NextResponse.json({ error: "platform_user_not_found" }, { status: 403 });
  }

  try {
    const redirectUri = resolveQboRedirectUri(req.nextUrl.origin);
    if (!redirectUri) {
      return NextResponse.json(
        { error: "Set QBO_REDIRECT_URI or QBO_REDIRECT_USE_REQUEST_ORIGIN=1 (and register that URI in Intuit)." },
        { status: 500 }
      );
    }
    await pruneExpiredQboOAuthStates();
    const state = randomBytes(24).toString("hex");
    await insertQboOAuthState(state, workspace.tenantId, pu.id);
    const url = buildQboAuthorizationUrl(state, redirectUri);
    return NextResponse.redirect(url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_start_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
