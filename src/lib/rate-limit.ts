// ponytail: per-instance memory limit, so a visitor hitting several serverless instances gets a bit more.
// Move to a Supabase counter if abuse shows up; it still stops a single script from hammering an endpoint.
const buckets = new Map<string, { count: number; reset: number }>();

/** True while `key` (e.g. "signup:1.2.3.4") has made at most `max` requests in the current window. */
export function allow(key: string, max: number, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= max;
}

/** The caller's IP as Vercel reports it. */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
