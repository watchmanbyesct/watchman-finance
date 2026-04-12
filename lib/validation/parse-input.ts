import { z, ZodSchema } from "zod";
import type { ActionResult } from "@/lib/errors/app-error";

/**
 * Parses and validates input against a Zod schema.
 * Returns the parsed data or throws a validation_failed error.
 */
export function parseInput<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`validation_failed: ${issues}`);
  }
  return result.data;
}

/**
 * Validates and returns field-level errors for a form submission
 * without throwing. Use in UI-facing server actions where you want
 * to return field errors to the form.
 */
export function validateInput<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; fieldErrors: Record<string, string> } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "_root";
      fieldErrors[key] = issue.message;
    }
    return { success: false, fieldErrors };
  }
  return { success: true, data: result.data };
}

// ── Common reusable schemas ───────────────────────────────────────────────────

export const TenantEntitySchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID"),
  entityId: z.string().uuid("Invalid entity ID"),
});

export const UUIDSchema = z.string().uuid();

export const DateStringSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  "Date must be in YYYY-MM-DD format"
);

export const CurrencyAmountSchema = z
  .number()
  .min(0, "Amount must be zero or positive")
  .multipleOf(0.01, "Amount must have at most 2 decimal places");

export const CurrencyCodeSchema = z
  .string()
  .length(3, "Currency code must be 3 characters")
  .toUpperCase();
