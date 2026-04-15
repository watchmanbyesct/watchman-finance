/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/db/supabase-browser";

/**
 * Home (`/`) for authenticated users: show a visible shell, then route to the dashboard.
 * Avoids a blank first paint if the server redirect path misbehaves in the browser.
 */
export function HomeRedirectClient() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) {
          if (!cancelled) {
            setStatus("error");
            setDetail("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check .env.local.");
          }
          return;
        }

        const supabase = createSupabaseBrowserClient();
        const { data: { session }, error } = await supabase.auth.getSession();

        if (cancelled) return;

        if (error) {
          setStatus("error");
          setDetail(error.message);
          return;
        }

        router.replace(session ? "/finance/dashboard" : "/login");
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setDetail(e instanceof Error ? e.message : "Unknown error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0d0d] text-neutral-300 px-6 gap-4">
        <p className="text-sm font-medium text-red-400">Could not start Watchman Finance</p>
        <p className="text-xs text-neutral-500 text-center max-w-md leading-relaxed">{detail}</p>
        <a href="/login" className="text-sm text-amber-500 hover:text-amber-400">
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0d0d] text-neutral-400 gap-3 px-6">
      <p className="text-xs uppercase tracking-[0.2em] text-amber-500/90">Watchman Finance</p>
      <p className="text-sm text-neutral-500">Loading your workspace…</p>
    </div>
  );
}
