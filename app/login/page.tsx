import { Suspense } from "react";
import { LoginForm } from "@/components/shared/login-form";

export const metadata = {
  title: "Sign In — Watchman Finance",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0d0d0d] px-4">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-500 font-medium mb-2">
            Watchman Ecosystem
          </p>
          <h1 className="font-display text-3xl font-semibold text-neutral-50">
            Finance
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Financial operating system for ESCT Holdings
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-white/10 bg-[#141414] p-8">
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
