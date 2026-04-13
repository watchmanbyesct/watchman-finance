export type FinanceErrorCode =
  | "forbidden"
  | "entity_scope_mismatch"
  | "module_not_entitled"
  | "context_error"
  | "validation_failed"
  | "not_found"
  | "conflict"
  | "period_locked"
  | "workflow_violation"
  | "integration_error"
  | "internal_error";

export interface FinanceError {
  code: FinanceErrorCode;
  message: string;
  field?: string;
}

export interface ActionResult<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  errors?: FinanceError[];
  warnings?: string[];
  correlationId?: string;
}

/**
 * Maps a thrown error into a structured ActionResult.
 * All server actions should catch and route through this.
 * `T` matches the action's success `data` shape so catch paths type-check
 * (failure results omit `data`).
 */
export function mapErrorToResult<T = undefined>(err: unknown): ActionResult<T> {
  const message = err instanceof Error ? err.message : "internal_error";

  if (message.startsWith("context_error:")) {
    return {
      success: false,
      message:
        "We could not verify your access to this organization. Try signing out and back in, or contact support if this persists.",
      errors: [{ code: "context_error", message }],
    };
  }

  if (message.startsWith("forbidden:")) {
    return {
      success: false,
      message: "You do not have permission to perform this action.",
      errors: [{ code: "forbidden", message }],
    };
  }

  if (message.startsWith("entity_scope_mismatch:")) {
    return {
      success: false,
      message: "You do not have access to this entity.",
      errors: [{ code: "entity_scope_mismatch", message }],
    };
  }

  if (message.startsWith("module_not_entitled:")) {
    return {
      success: false,
      message: "This module is not enabled for your organization.",
      errors: [{ code: "module_not_entitled", message }],
    };
  }

  if (message.startsWith("validation_failed")) {
    return {
      success: false,
      message: "Validation failed. Please review the submitted data.",
      errors: [{ code: "validation_failed", message }],
    };
  }

  if (message.startsWith("period_locked")) {
    return {
      success: false,
      message: "This fiscal period is locked and cannot be modified.",
      errors: [{ code: "period_locked", message }],
    };
  }

  console.error("[finance_action_error]", message);
  return {
    success: false,
    message: "An internal error occurred. Please try again or contact support.",
    errors: [{ code: "internal_error", message }],
  };
}
