/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

export type EmployeeSchemaVersion = "employee.v1" | "employee.v2";

/**
 * Single downstream projection for Finance staging from coexistence payloads.
 * v1 payloads omit `employment`; v2 carries optional `employment`.
 * See: esct-watchman-operations docs/contracts/employee-canonical-schema-v2.md
 */
export function normalizeEmployeePayloadForStaging(
  schemaVersion: EmployeeSchemaVersion,
  employee: Record<string, unknown>,
): Record<string, unknown> {
  const employment =
    schemaVersion === "employee.v2" &&
    employee.employment !== null &&
    employee.employment !== undefined &&
    typeof employee.employment === "object"
      ? (employee.employment as Record<string, unknown>)
      : null;

  return {
    schema_version: schemaVersion,
    employee_id: String(employee.employee_id ?? ""),
    external_ref: employee.external_ref ?? null,
    auth_id: employee.auth_id ?? null,
    first_name: String(employee.first_name ?? ""),
    last_name: String(employee.last_name ?? ""),
    email: employee.email ?? null,
    phone: employee.phone ?? null,
    status: employee.status ?? null,
    hire_date: employee.hire_date ?? null,
    termination_date: employee.termination_date ?? null,
    department: employee.department ?? null,
    position: employee.position ?? null,
    branch_code: employee.branch_code ?? null,
    roles: Array.isArray(employee.roles) ? employee.roles : [],
    employment:
      employment && Object.keys(employment).length > 0
        ? {
            employment_type: employment.employment_type ?? null,
            manager_employee_id: employment.manager_employee_id ?? null,
            work_location_code: employment.work_location_code ?? null,
          }
        : null,
    /** HR-authoritative payloads (v2) vs legacy Launch-era (v1); used by promotion validators. */
    governance: schemaVersion === "employee.v2" ? "hr_authoritative" : "launch_era_v1",
  };
}
