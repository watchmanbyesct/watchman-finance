"use client";

/**
 * Root-level error UI when the root layout fails. Must define its own <html>/<body>
 * and cannot rely on Tailwind from the main bundle — use inline styles to avoid a blank white screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#0d0d0d",
          color: "#e5e5e5",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 440 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 12px" }}>Watchman Finance</h1>
          <p style={{ color: "#a3a3a3", margin: "0 0 8px", lineHeight: 1.5 }}>
            The app hit a critical error before the normal layout could render.
          </p>
          {error?.message ? (
            <pre
              style={{
                fontSize: 12,
                color: "#fca5a5",
                background: "rgba(127,29,29,0.35)",
                padding: 12,
                borderRadius: 8,
                overflow: "auto",
                marginBottom: 16,
              }}
            >
              {error.message}
            </pre>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "10px 18px",
              background: "#f59e0b",
              color: "#0a0a0a",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
