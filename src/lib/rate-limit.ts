/**
 * Simple in-memory sliding-window rate limiter for non-auth endpoints.
 * Suitable for single-node SSR (Astro + Node adapter).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

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

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: opts.max - 1, resetAt: now + windowMs };
  }

  if (entry.count < opts.max) {
    entry.count++;
    return { allowed: true, remaining: opts.max - entry.count, resetAt: entry.resetAt };
  }

  return { allowed: false, remaining: 0, resetAt: entry.resetAt };
}
