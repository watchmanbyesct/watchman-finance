/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIntegrationRequest, integrationErrorResponse } from "@/lib/auth/verify-integration-request";
import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { normalizeEmployeePayloadForStaging } from "@/lib/integration/employee-event-normalize";
import crypto from "crypto";

/**
 * POST /api/integrations/launch/employees
 *
 * Stages employee lifecycle payloads for Finance (Launch v1 and HR v2 coexistence).
 * `normalized_json` is a unified projection for downstream promotion logic.
 *
 * Idempotent: uses tenant_id + dedupe_key (`source_system_key`, source_record_id, payload).
 */
export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const { valid, reason } = await verifyIntegrationRequest(req, bodyText);
  if (!valid) return integrationErrorResponse(reason ?? "unauthorized");
  const contractVersion = req.headers.get("x-watchman-contract-version");
  if (!contractVersion || (contractVersion !== "v1" && contractVersion !== "v2")) {
    return integrationErrorResponse("unsupported_contract_version", 400);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return integrationErrorResponse("invalid_json", 400);
  }

  const { tenant_id, entity_id, source_record_id, employee, schema_version, source_system_key } = payload as any;
  if (!tenant_id || !source_record_id || !employee) {
    return integrationErrorResponse("missing_required_fields", 400);
  }
  if (schema_version !== "employee.v1" && schema_version !== "employee.v2") {
    return integrationErrorResponse("unsupported_schema_version", 400);
  }
  const sv = schema_version as "employee.v1" | "employee.v2";
  if (schema_version === "employee.v1" && source_system_key && source_system_key !== "watchman_launch") {
    return integrationErrorResponse("invalid_source_system_key", 400);
  }
  if (schema_version === "employee.v2" && source_system_key !== "watchman_hr") {
    return integrationErrorResponse("invalid_source_system_key", 400);
  }

  const emp = employee && typeof employee === "object" && !Array.isArray(employee) ? (employee as Record<string, unknown>) : {};

  const dedupeKey = crypto
    .createHash("sha256")
    .update(`${source_system_key ?? "watchman_launch"}:employee:${source_record_id}:${JSON.stringify(employee)}`)
    .digest("hex");

  try {
    const admin = createSupabaseAdminClient();

    const normalizedJson = normalizeEmployeePayloadForStaging(sv, emp);

    const { data, error } = await admin
      .from("staged_employees")
      .upsert(
        {
          tenant_id,
          entity_id:         entity_id ?? null,
          source_system_key: source_system_key ?? "watchman_launch",
          source_record_id,
          dedupe_key:        dedupeKey,
          payload_json:      employee,
          normalized_json:   normalizedJson,
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
