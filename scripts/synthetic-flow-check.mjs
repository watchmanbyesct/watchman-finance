import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const errors = [];

function requireFile(relativePath) {
  const abs = resolve(root, relativePath);
  if (!existsSync(abs)) {
    errors.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(abs, "utf8");
}

function assertIncludes(content, needle, context) {
  if (!content.includes(needle)) {
    errors.push(`Missing expected token "${needle}" in ${context}`);
  }
}

const invoiceRoute = requireFile("app/api/integrations/operations/invoices/route.ts");
const approvedTimeRoute = requireFile("app/api/integrations/operations/approved-time/route.ts");
const deliveryLog = requireFile("app/(finance)/finance/integration/delivery-log/page.tsx");

// Operations -> Finance ingestion entrypoints
assertIncludes(invoiceRoute, "export async function POST", "operations invoices route");
assertIncludes(invoiceRoute, "staged_service_events", "operations invoices route");
assertIncludes(approvedTimeRoute, "export async function POST", "operations approved-time route");
assertIncludes(approvedTimeRoute, "staged_time_entries", "operations approved-time route");

// Observability/triage UI hooks
assertIncludes(deliveryLog, "Operations invoice staging", "delivery log page");
assertIncludes(deliveryLog, "Operations approved-time staging", "delivery log page");
assertIncludes(deliveryLog, "Webhook delivery log", "delivery log page");

if (errors.length) {
  console.error("Synthetic flow check failed (Finance):");
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log("Synthetic flow check passed (Finance).");
