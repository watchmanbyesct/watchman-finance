/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { requireAuthSession } from "@/lib/auth/resolve-session";
import {
  WATCHMAN_ACTIVE_TENANT_COOKIE,
} from "@/lib/context/watchman-active-tenant";

const schema = z.object({
  tenantId: z.string().uuid(),
});

function safeRedirectHint(raw: string | null): string {
  const s = String(raw ?? "").trim();
  if (/^\/(finance|hr)(\/|$)/.test(s)) return s.split("?")[0] || "/finance/dashboard";
  return "/finance/dashboard";
}

/**
 * Persist active tenant across HR / Finance desktops (cookie). Validates membership server-side.
 */
export async function switchWatchmanTenant(formData: FormData) {
  const parsed = schema.safeParse({
    tenantId: String(formData.get("tenant_id") ?? "").trim(),
  });
  if (!parsed.success) {
    redirect(safeRedirectHint(String(formData.get("redirect_to") ?? "")));
  }

  const session = await requireAuthSession();
  const supabase = createSupabaseServerClient();

  const { data: platformUser } = await supabase
    .from("platform_users")
    .select("id")
    .eq("auth_user_id", session.userId)
    .maybeSingle();

  const nextPath = safeRedirectHint(String(formData.get("redirect_to") ?? "/finance/dashboard"));

  if (!platformUser) redirect(nextPath);

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("id")
    .eq("tenant_id", parsed.data.tenantId)
    .eq("platform_user_id", platformUser.id)
    .eq("membership_status", "active")
    .maybeSingle();

  if (!membership) redirect(nextPath);

  const isProd =
    typeof process.env.NEXT_PUBLIC_VERCEL_ENV !== "undefined"
      ? process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
      : process.env.NODE_ENV === "production";

  cookies().set(WATCHMAN_ACTIVE_TENANT_COOKIE, parsed.data.tenantId, {
    path: "/",
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 180,
  });

  redirect(nextPath);
}
