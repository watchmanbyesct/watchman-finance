import { createSupabaseAdminClient } from "@/lib/db/supabase-server";

export interface AuditLogPayload {
  tenantId: string;
  entityId?: string | null;
  actorPlatformUserId?: string | null;
  moduleKey: string;
  actionCode: string;
  targetTable: string;
  targetRecordId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  sourceChannel?: string;
}

/**
 * Writes a structured audit log entry for a finance action.
 * Uses the admin client so audit writes are never blocked by RLS.
 * Must be called after every material finance mutation.
 */
export async function writeAuditLog(payload: AuditLogPayload): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("audit_logs").insert({
    tenant_id: payload.tenantId,
    entity_id: payload.entityId ?? null,
    actor_platform_user_id: payload.actorPlatformUserId ?? null,
    module_key: payload.moduleKey,
    action_code: payload.actionCode,
    target_table: payload.targetTable,
    target_record_id: payload.targetRecordId ?? null,
    old_values_json: payload.oldValues ?? null,
    new_values_json: payload.newValues ?? null,
    metadata_json: payload.metadata ?? null,
    source_channel: payload.sourceChannel ?? "server_action",
    occurred_at: new Date().toISOString(),
  });

  if (error) {
    // Audit failures are logged to console but never silently swallowed
    // without at minimum surfacing to telemetry.
    console.error("[audit_log_write_failed]", error.message, payload.actionCode);
  }
}
