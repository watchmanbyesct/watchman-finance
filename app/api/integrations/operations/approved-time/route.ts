/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIntegrationRequest, integrationErrorResponse } from "@/lib/auth/verify-integration-request";
import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import crypto from "crypto";

/**
 * POST /api/integrations/operations/approved-time
 *
 * Receives approved time entries from Watchman Operations and stages them
 * in staged_time_entries for payroll consumption.
 *
 * Called by Operations after supervisor approval of worked hours.
 * Idempotent: deduped by source_record_id + payload hash.
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

  const {
    tenant_id,
    entity_id,
    source_record_id,
    employee_source_record_id,
    pay_period_start,
    pay_period_end,
    time_entry,
  } = payload as any;

  if (!tenant_id || !source_record_id || !employee_source_record_id || !time_entry) {
    return integrationErrorResponse("missing_required_fields", 400);
  }

  const dedupeKey = crypto
    .createHash("sha256")
    .update(`watchman_operations:approved_time:${source_record_id}:${JSON.stringify(time_entry)}`)
    .digest("hex");

  try {
    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("staged_time_entries")
      .upsert(
        {
          tenant_id,
          entity_id:                 entity_id ?? null,
          source_system_key:         "watchman_operations",
          source_record_id,
          employee_source_record_id,
          pay_period_start:          pay_period_start ?? null,
          pay_period_end:            pay_period_end ?? null,
          dedupe_key:                dedupeKey,
          payload_json:              time_entry,
          normalized_json:           {},
          approval_status:           "approved",
          validation_status:         "pending",
          correlation_id:            req.headers.get("x-watchman-correlation-id") ?? crypto.randomUUID(),
        },
        { onConflict: "tenant_id,dedupe_key" }
      )
      .select("id")
      .single();

    if (error) {
      console.error("[integration:operations:approved-time]", error.message);
      return NextResponse.json({ success: false, error: "staging_failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      staged_time_entry_id: data.id,
      message: "Approved time entry staged for payroll processing.",
    });
  } catch (err: any) {
    console.error("[integration:operations:approved-time]", err.message);
    return NextResponse.json({ success: false, error: "internal_error" }, { status: 500 });
  }
}
