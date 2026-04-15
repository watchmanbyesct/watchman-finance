const requireTargets = String(process.env.WATCHMAN_SYNTHETIC_REQUIRE_TARGETS ?? "").toLowerCase() === "1";
const timeoutMs = Number(process.env.WATCHMAN_SYNTHETIC_TIMEOUT_MS ?? 8000);

function withTimeout(promise, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), ms);
  return {
    signal: controller.signal,
    run: promise(controller.signal).finally(() => clearTimeout(timer)),
  };
}

async function probe(name, url, init, expect) {
  const start = Date.now();
  try {
    const wrapped = withTimeout((signal) => fetch(url, { ...init, signal }), timeoutMs);
    const res = await wrapped.run;
    const ok = expect(res.status);
    return {
      name,
      ok,
      status: res.status,
      elapsed_ms: Date.now() - start,
      detail: ok ? "ok" : `unexpected_status_${res.status}`,
    };
  } catch (err) {
    return {
      name,
      ok: false,
      status: 0,
      elapsed_ms: Date.now() - start,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const checks = [];
  const skipped = [];
  const financeBase = process.env.WATCHMAN_FINANCE_BASE_URL?.trim();

  if (financeBase) {
    const base = financeBase.replace(/\/$/, "");
    checks.push(
      await probe("finance_health", `${base}/api/health`, { method: "GET" }, (s) => s >= 200 && s < 400),
    );
    checks.push(
      await probe(
        "finance_invoice_ingest_route",
        `${base}/api/integrations/operations/invoices`,
        { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
        (s) => s === 400 || s === 401 || s === 403,
      ),
    );
    checks.push(
      await probe(
        "finance_approved_time_ingest_route",
        `${base}/api/integrations/operations/approved-time`,
        { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
        (s) => s === 400 || s === 401 || s === 403,
      ),
    );
  } else {
    skipped.push("finance probes (WATCHMAN_FINANCE_BASE_URL not set)");
  }

  if (requireTargets && checks.length === 0) {
    console.error("No live synthetic targets configured and WATCHMAN_SYNTHETIC_REQUIRE_TARGETS=1");
    process.exit(1);
  }

  for (const s of skipped) console.log(`SKIP ${s}`);
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name} status=${c.status} elapsed=${c.elapsed_ms}ms detail=${c.detail}`);
  }

  if (checks.some((c) => !c.ok)) process.exit(1);
  console.log("Synthetic live probe passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
