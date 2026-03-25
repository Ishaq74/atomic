/**
 * Simple in-memory fixed-window rate limiter for non-auth endpoints.
 * Suitable for single-node SSR (Astro + Node adapter).
 *
 * Limitation: state is process-local. In a multi-instance deployment each
 * node tracks limits independently, effectively multiplying the allowed
 * throughput by the number of instances.
 *
 * Migration path: replace the in-memory `store` with a Redis-backed counter
 * (e.g. via ioredis) when scaling to multiple nodes behind a load balancer.
 * See: https://redis.io/commands/incr — "Pattern: Rate limiter".
 *
 * ⚠️  PRODUCTION NOTE: If running more than one Node process (cluster, k8s
 * replicas, etc.), switch to a shared store (Redis / Valkey). Otherwise the
 * effective limit is `max × number_of_instances`.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const MAX_ENTRIES = 10_000;

// Cleanup stale entries every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);
cleanupInterval.unref();

export interface RateLimitOptions {
  /** Time window in seconds */
  window: number;
  /** Max requests allowed in the window */
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request from the given key (typically IP) is within rate limits.
 */
export function checkRateLimit(
  key: string,
  opts: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const windowMs = opts.window * 1000;
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    if (store.size >= MAX_ENTRIES) {
      // Purge expired entries first
      for (const [k, v] of store) { if (now >= v.resetAt) store.delete(k); }
      // If still at capacity after purge, reject (fail-closed) to prevent store-flooding attacks
      if (store.size >= MAX_ENTRIES) {
        return { allowed: false, remaining: 0, resetAt: now + windowMs };
      }
    }
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: opts.max - 1, resetAt: now + windowMs };
  }

  if (entry.count < opts.max) {
    entry.count++;
    return { allowed: true, remaining: opts.max - entry.count, resetAt: entry.resetAt };
  }

  // Add jitter (±2s) to prevent attackers from timing requests to the exact reset
  const jitter = Math.floor(Math.random() * 4000) - 2000;
  return { allowed: false, remaining: 0, resetAt: entry.resetAt + jitter };
}

/** Clear all rate limit entries — exposed for testing only. */
export function resetRateLimiter(): void {
  store.clear();
}
