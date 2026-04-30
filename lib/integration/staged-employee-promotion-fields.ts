/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

/** True when staging wrote a usable Finance normalized_json (canonical names required). */
export function stagedEmployeeHasUsableNormalization(normalizedUnknown: unknown): boolean {
  if (!normalizedUnknown || typeof normalizedUnknown !== "object" || Array.isArray(normalizedUnknown)) {
    return false;
  }
  const n = normalizedUnknown as Record<string, unknown>;
  if (Object.keys(n).length === 0) return false;
  const fn = String(n.first_name ?? "").trim();
  const ln = String(n.last_name ?? "").trim();
  return Boolean(fn && ln);
}

const FINANCE_ALLOWED = new Set(["active", "inactive", "terminated", "leave"]);

/** Map coexistence canonical `status` or legacy employment_status into finance_people.check constraint. */
export function mapToFinanceEmploymentStatus(args: {
  normalized: Record<string, unknown> | null;
  payload: Record<string, unknown>;
}): string {
  const { normalized, payload } = args;
  if (normalized) {
    const raw = String(normalized.status ?? "").trim().toLowerCase().replace(/\s+/g, "_");
    if (raw && FINANCE_ALLOWED.has(raw)) return raw;
    if (raw === "pre_hire" || raw === "prehire") return "inactive";
    if (raw.includes("terminated")) return "terminated";
    if (raw === "on_leave" || raw.includes("leave")) return "leave";
    if (raw === "inactive") return "inactive";
  }
  const fromPayload = String(payload.employment_status ?? "active")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (FINANCE_ALLOWED.has(fromPayload)) return fromPayload;
  if (fromPayload === "pre_hire" || fromPayload === "prehire") return "inactive";
  return "active";
}

export type ResolvedPromotionNames = {
  legalFirstName: string;
  legalLastName: string;
  email: string | null | undefined;
  phone: string | null | undefined;
  middleName: string | null | undefined;
  preferredName: string | null | undefined;
  hireDate: string | null | undefined;
};

export function resolvePromotionPersonFields(args: {
  payload: Record<string, unknown>;
  normalized: Record<string, unknown> | null;
}): ResolvedPromotionNames | null {
  const { payload, normalized } = args;
  if (normalized && stagedEmployeeHasUsableNormalization(normalized)) {
    const legalFirstName = String(normalized.first_name ?? "").trim();
    const legalLastName = String(normalized.last_name ?? "").trim();
    if (!legalFirstName || !legalLastName) return null;
    const emailRaw = normalized.email ?? payload.email;
    const phoneRaw = normalized.phone ?? payload.phone;
    const hireRaw = normalized.hire_date ?? payload.hire_date;
    return {
      legalFirstName,
      legalLastName,
      middleName: (payload.middle_name as string | undefined) ?? null,
      preferredName: (payload.preferred_name as string | undefined) ?? null,
      email: emailRaw === null || emailRaw === undefined ? null : String(emailRaw),
      phone: phoneRaw === null || phoneRaw === undefined ? null : String(phoneRaw),
      hireDate:
        hireRaw === null || hireRaw === undefined || hireRaw === ""
          ? undefined
          : String(hireRaw),
    };
  }

  const legalFirstName = String(payload.legal_first_name ?? payload.first_name ?? "").trim();
  const legalLastName = String(payload.legal_last_name ?? payload.last_name ?? "").trim();
  if (!legalFirstName || !legalLastName) return null;
  return {
    legalFirstName,
    legalLastName,
    middleName: (payload.middle_name as string | undefined) ?? null,
    preferredName: (payload.preferred_name as string | undefined) ?? null,
    email: (payload.email as string | undefined) ?? null,
    phone: (payload.phone as string | undefined) ?? null,
    hireDate: (payload.hire_date as string | undefined) ?? null,
  };
}
