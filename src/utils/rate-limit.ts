import { createHash } from "crypto";
import { headers } from "next/headers";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

// Vercel overwrites x-forwarded-for with the real client address, so the
// first entry can't be spoofed by the caller in production.
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

// Returns true when the request is within the limit. Identifiers (emails,
// tokens) are hashed so the rate_limits table never stores them in the clear.
// Fails open on a database error: a limiter outage must not lock every
// practitioner and client out of the app.
export async function rateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const hashed = createHash("sha256").update(identifier.trim().toLowerCase()).digest("hex").slice(0, 32);
  const { data, error } = await createServiceRoleClient().rpc("rate_limit_hit", {
    p_key: `${bucket}:${hashed}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limiter unavailable:", error.code);
    return true;
  }
  return data !== false;
}

// Checks one limit per identifier and reports whether every one passed. Every
// limit is always recorded, so a blocked caller keeps counting against all of
// them rather than short-circuiting on the first failure.
export async function rateLimitAll(
  checks: { bucket: string; identifier: string; limit: number; windowSeconds: number }[],
): Promise<boolean> {
  const results = await Promise.all(checks.map((c) => rateLimit(c.bucket, c.identifier, c.limit, c.windowSeconds)));
  return results.every(Boolean);
}
