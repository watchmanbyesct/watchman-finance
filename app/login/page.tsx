/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { Suspense } from "react";
import { WatchmanLogo } from "@/components/branding/watchman-logo";
import { LoginForm } from "@/components/shared/login-form";

export const metadata = {
  title: "Sign In — Watchman Finance",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center wf-app-shell px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-10 text-center">
          <WatchmanLogo className="h-28 w-auto mx-auto" priority />
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-amber-500 font-medium">
            Watchman Finance
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Financial operating system for ESCT Holdings
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-white/10 bg-[#141414] p-8 wf-login-card-in shadow-xl shadow-black/40 transition-shadow duration-300 hover:shadow-2xl hover:shadow-black/50">
          <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-600">
          Watchman Finance &copy; {new Date().getFullYear()} ESCT &mdash; All rights reserved
        </p>
      </div>
    </main>
  );
}
