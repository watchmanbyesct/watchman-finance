/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIntegrationRequest, integrationErrorResponse } from "@/lib/auth/verify-integration-request";
import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import crypto from "crypto";

/**
 * POST /api/integrations/operations/invoices
 *
 * Receives invoice payloads from Watchman Operations and stages them
 * in staged_service_events for AR validation/promotion.
 *
 * Idempotent via source_record_id + invoice payload hash.
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
    invoice,
  } = payload as any;

  if (!tenant_id || !source_record_id || !invoice) {
    return integrationErrorResponse("missing_required_fields", 400);
  }

  const dedupeKey = crypto
    .createHash("sha256")
    .update(`watchman_operations:invoice:${source_record_id}:${JSON.stringify(invoice)}`)
    .digest("hex");

  try {
    const admin = createSupabaseAdminClient();
    const eventDate = invoice?.due_date ?? invoice?.period_end ?? new Date().toISOString().slice(0, 10);
    const serviceType = "invoice";

    const { data, error } = await admin
      .from("staged_service_events")
      .upsert(
        {
          tenant_id,
          entity_id: entity_id ?? null,
          source_system_key: "watchman_operations",
          source_record_id,
          correlation_id: req.headers.get("x-watchman-correlation-id") ?? crypto.randomUUID(),
          dedupe_key: dedupeKey,
          payload_json: invoice,
          normalized_json: {},
          event_date: eventDate,
          service_type: serviceType,
          validation_status: "pending",
        },
        { onConflict: "tenant_id,dedupe_key" },
      )
      .select("id")
      .single();

    if (error) {
      console.error("[integration:operations:invoices]", error.message);
      return NextResponse.json({ success: false, error: "staging_failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      staged_service_event_id: data.id,
      message: "Invoice payload staged for finance processing.",
    });
  } catch (err: any) {
    console.error("[integration:operations:invoices]", err.message);
    return NextResponse.json({ success: false, error: "internal_error" }, { status: 500 });
  }
}
