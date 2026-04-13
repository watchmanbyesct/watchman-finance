"use client";

import { useEffect } from "react";

export default function FinanceSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[finance_error]", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto rounded-xl border border-red-500/25 bg-red-950/20 p-8 mt-8">
      <h1 className="text-lg font-semibold text-neutral-100 mb-2">Finance workspace error</h1>
      <p className="text-sm text-neutral-400 mb-4 leading-relaxed">
        This page could not load. Common causes: database connectivity, RLS blocking a query, or a missing
        environment variable.
      </p>
      {error.message ? (
        <pre className="text-xs text-red-300/90 bg-black/30 rounded-md p-3 mb-6 overflow-auto max-h-48">
          {error.message}
        </pre>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-amber-500 text-black text-sm font-medium px-4 py-2 hover:bg-amber-400"
        >
          Retry
        </button>
        <a
          href="/finance/dashboard"
          className="rounded-md border border-white/15 text-sm text-neutral-300 px-4 py-2 hover:bg-white/5 inline-flex items-center"
        >
          Dashboard
        </a>
      </div>
    </div>
  );
}
