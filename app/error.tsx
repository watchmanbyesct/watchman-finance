"use client";


/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app_error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] px-6 py-16">
      <div className="max-w-md w-full rounded-xl border border-red-500/25 bg-red-950/20 p-8">
        <h1 className="text-lg font-semibold text-neutral-100 mb-2">Something went wrong</h1>
        <p className="text-sm text-neutral-400 mb-4 leading-relaxed">
          A part of the app failed to render. You can retry or return to the dashboard.
        </p>
        {error.message ? (
          <pre className="text-xs text-red-300/90 bg-black/30 rounded-md p-3 mb-6 overflow-auto max-h-40">
            {error.message}
          </pre>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-amber-500 text-black text-sm font-medium px-4 py-2 hover:bg-amber-400"
          >
            Try again
          </button>
          <a
            href="/finance/dashboard"
            className="rounded-md border border-white/15 text-sm text-neutral-300 px-4 py-2 hover:bg-white/5"
          >
            Dashboard
          </a>
          <a
            href="/login"
            className="rounded-md border border-white/15 text-sm text-neutral-300 px-4 py-2 hover:bg-white/5"
          >
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
