/**
 * Minimal in-memory sliding-window limiter.
 *
 * Per-instance only: on serverless platforms each warm instance keeps its own
 * window. It raises the cost of accidental double submits and casual abuse;
 * production deployments should additionally use the platform's WAF/edge limits.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const existing = (buckets.get(key) ?? []).filter((timestamp) => timestamp > cutoff);

  if (existing.length >= limit) {
    const oldest = existing[0] ?? now;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) };
  }

  existing.push(now);
  buckets.set(key, existing);

  if (buckets.size > 5000) {
    for (const [bucketKey, timestamps] of buckets) {
      if (timestamps.every((timestamp) => timestamp <= cutoff)) buckets.delete(bucketKey);
    }
  }
  return { allowed: true, retryAfterSeconds: 0 };
}
