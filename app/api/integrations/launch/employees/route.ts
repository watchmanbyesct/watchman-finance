import { NextRequest, NextResponse } from "next/server";
import { verifyIntegrationRequest, integrationErrorResponse } from "@/lib/auth/verify-integration-request";
import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import crypto from "crypto";

/**
 * POST /api/integrations/launch/employees
 *
 * Receives employee records from Watchman Launch and stages them
 * in staged_employees for validation and promotion to finance_people.
 *
 * Called by Launch on: hire, update, termination, reactivation.
 * Idempotent: uses source_record_id + payload hash as dedupe key.
 */
export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const { valid, reason } = await verifyIntegrationRequest(req, bodyText);
  if (!valid) return integrationErrorResponse(reason ?? "unauthorized");

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return integrationErrorResponse("invalid_json", 400);
  }

  const { tenant_id, entity_id, source_record_id, employee } = payload as any;
  if (!tenant_id || !source_record_id || !employee) {
    return integrationErrorResponse("missing_required_fields", 400);
  }

  const dedupeKey = crypto
    .createHash("sha256")
    .update(`watchman_launch:employee:${source_record_id}:${JSON.stringify(employee)}`)
    .digest("hex");

  try {
    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("staged_employees")
      .upsert(
        {
          tenant_id,
          entity_id:         entity_id ?? null,
          source_system_key: "watchman_launch",
          source_record_id,
          dedupe_key:        dedupeKey,
          payload_json:      employee,
          normalized_json:   {},
          validation_status: "pending",
          correlation_id:    req.headers.get("x-watchman-correlation-id") ?? crypto.randomUUID(),
        },
        { onConflict: "tenant_id,dedupe_key" }
      )
      .select("id")
      .single();

    if (error) {
      console.error("[integration:launch:employees]", error.message);
      return NextResponse.json({ success: false, error: "staging_failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      staged_employee_id: data.id,
      message: "Employee payload staged for validation.",
    });
  } catch (err: any) {
    console.error("[integration:launch:employees]", err.message);
    return NextResponse.json({ success: false, error: "internal_error" }, { status: 500 });
  }
}
