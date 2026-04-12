import { NextRequest } from "next/server";
import crypto from "crypto";

/**
 * Verifies the WATCHMAN_INTEGRATION_SECRET HMAC signature on inbound
 * requests from Watchman Launch and Watchman Operations.
 *
 * Sender must include:
 *   X-Watchman-Signature: sha256=<hmac_hex>
 *   X-Watchman-Timestamp: <unix_timestamp>
 *
 * Replay window: 5 minutes.
 */
export async function verifyIntegrationRequest(
  req: NextRequest,
  body: string
): Promise<{ valid: boolean; reason?: string }> {
  const secret = process.env.WATCHMAN_INTEGRATION_SECRET;
  if (!secret) {
    console.error("[integration_auth] WATCHMAN_INTEGRATION_SECRET is not set");
    return { valid: false, reason: "integration_secret_not_configured" };
  }

  const signature = req.headers.get("x-watchman-signature");
  const timestamp  = req.headers.get("x-watchman-timestamp");

  if (!signature || !timestamp) {
    return { valid: false, reason: "missing_signature_headers" };
  }

  // Replay protection: reject if older than 5 minutes
  const ts = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) {
    return { valid: false, reason: "timestamp_out_of_window" };
  }

  // Verify HMAC
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  const expectedHeader = `sha256=${expected}`;
  const valid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedHeader)
  );

  return valid ? { valid: true } : { valid: false, reason: "signature_mismatch" };
}

export function integrationErrorResponse(reason: string, status = 401) {
  return Response.json({ success: false, error: reason }, { status });
}
