"use server";

import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";

const CreateBranchSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().nullable().optional(),
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
});

/** Permission: tenant.update */
export async function createBranch(
  input: z.infer<typeof CreateBranchSchema>
): Promise<ActionResult<{ branchId: string }>> {
  try {
    const v = CreateBranchSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "tenant.update");
    if (v.entityId) requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("branches")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId ?? null,
        code: v.code,
        name: v.name,
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "org.branch.create",
      targetTable: "branches",
      targetRecordId: row.id,
      newValues: { code: v.code },
    });

    return { success: true, message: "Branch created.", data: { branchId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateDepartmentSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().nullable().optional(),
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
});

/** Permission: tenant.update */
export async function createDepartment(
  input: z.infer<typeof CreateDepartmentSchema>
): Promise<ActionResult<{ departmentId: string }>> {
  try {
    const v = CreateDepartmentSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "tenant.update");
    if (v.entityId) requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("departments")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId ?? null,
        code: v.code,
        name: v.name,
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "org.department.create",
      targetTable: "departments",
      targetRecordId: row.id,
      newValues: { code: v.code },
    });

    return { success: true, message: "Department created.", data: { departmentId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateLocationSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid().nullable().optional(),
  branchId: z.union([z.string().uuid(), z.null()]).optional(),
  name: z.string().min(1).max(255),
  locationType: z.string().max(64).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(32).optional(),
});

/** Permission: tenant.update */
export async function createLocation(
  input: z.infer<typeof CreateLocationSchema>
): Promise<ActionResult<{ locationId: string }>> {
  try {
    const v = CreateLocationSchema.parse(input);
    const ctx = await resolveRequestContext(v.tenantId);
    requirePermission(ctx, "tenant.update");
    if (v.entityId) requireEntityScope(ctx, v.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("locations")
      .insert({
        tenant_id: v.tenantId,
        entity_id: v.entityId ?? null,
        branch_id: v.branchId ?? null,
        name: v.name,
        location_type: v.locationType ?? null,
        city: v.city ?? null,
        state: v.state ?? null,
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: v.tenantId,
      entityId: v.entityId ?? null,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "finance_core",
      actionCode: "org.location.create",
      targetTable: "locations",
      targetRecordId: row.id,
      newValues: { name: v.name },
    });

    return { success: true, message: "Location created.", data: { locationId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
