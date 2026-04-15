/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { createSupabaseServerClient } from "@/lib/db/supabase-server";

function q<T>(data: T[] | null | undefined, err: { message: string } | null): T[] {
  if (err) throw new Error(err.message);
  return data ?? [];
}

export async function listBranchesForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, tenant_id, entity_id, code, name, status, created_at")
    .eq("tenant_id", tenantId)
    .order("code");
  return q(data, error);
}

export async function listDepartmentsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, tenant_id, entity_id, code, name, status, created_at")
    .eq("tenant_id", tenantId)
    .order("code");
  return q(data, error);
}

export async function listLocationsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, tenant_id, entity_id, branch_id, name, location_type, city, state, status, created_at")
    .eq("tenant_id", tenantId)
    .order("name");
  return q(data, error);
}

export async function listStagedEmployeesForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("staged_employees")
    .select(
      "id, entity_id, source_record_id, validation_status, review_status, received_at, promoted_at, promoted_record_id"
    )
    .eq("tenant_id", tenantId)
    .order("received_at", { ascending: false })
    .limit(200);
  return q(data, error);
}

export async function listStagedTimeEntriesForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("staged_time_entries")
    .select(
      "id, entity_id, source_record_id, employee_source_record_id, pay_period_start, pay_period_end, approval_status, validation_status, received_at"
    )
    .eq("tenant_id", tenantId)
    .order("received_at", { ascending: false })
    .limit(200);
  return q(data, error);
}

export async function listStagedServiceEventsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("staged_service_events")
    .select("id, entity_id, source_record_id, event_date, service_type, validation_status, received_at, promoted_at")
    .eq("tenant_id", tenantId)
    .order("received_at", { ascending: false })
    .limit(200);
  return q(data, error);
}

export async function listIntegrationEventLogForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("integration_event_log")
    .select(
      "id, entity_id, source_system_key, event_type, source_record_type, processing_status, occurred_at, received_at, error_message"
    )
    .eq("tenant_id", tenantId)
    .order("received_at", { ascending: false })
    .limit(100);
  return q(data, error);
}

export async function listIntegrationSyncJobsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("integration_sync_jobs")
    .select("id, job_key, source_system_key, target_domain, schedule_mode, status, created_at")
    .eq("tenant_id", tenantId)
    .order("job_key");
  return q(data, error);
}

export async function listIntegrationSyncRunsForTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("integration_sync_runs")
    .select(
      "id, integration_sync_job_id, run_status, started_at, completed_at, records_received, records_promoted, records_failed, error_summary"
    )
    .eq("tenant_id", tenantId)
    .order("started_at", { ascending: false })
    .limit(100);
  return q(data, error);
}
