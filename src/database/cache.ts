/** In-memory TTL cache for DB loaders (site settings, nav, theme, etc.). */

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 500;

// ─── Cache statistics (debug / monitoring) ────────────────────────────────────
let hits = 0;
let misses = 0;

/** Return cache hit/miss statistics. */
export function getCacheStats() {
  return { hits, misses, size: store.size, inflight: inflight.size };
}

// Cleanup expired entries every 2 minutes
let cleanupInterval: ReturnType<typeof setInterval> | null = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.expiresAt) store.delete(key);
  }
}, 2 * 60 * 1000);
cleanupInterval.unref();

/** Stop the cache cleanup interval. Call during graceful shutdown. */
export function shutdownCache(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  store.clear();
  inflight.clear();
}

/**
 * Wrap an async function with a TTL cache.
 *
 * - Coalesces concurrent calls to the same key (single DB query).
 * - Evicts oldest entries when MAX_ENTRIES is exceeded (FIFO).
 *
 * @param keyFn  Builds the cache key from the original arguments
 * @param fn     The original async function to cache
 * @param ttlMs  Time-to-live in milliseconds (default 5 min)
 */
export function cached<Args extends unknown[], R>(
  keyFn: (...args: Args) => string,
  fn: (...args: Args) => Promise<R>,
  ttlMs = DEFAULT_TTL_MS,
): (...args: Args) => Promise<R> {
  return (...args: Args): Promise<R> => {
    const key = keyFn(...args);
    const entry = store.get(key);

    if (entry && Date.now() < entry.expiresAt) {
      hits++;
      entry.expiresAt = Date.now() + ttlMs; // Sliding TTL — refresh on hit
      store.delete(key);
      store.set(key, entry); // Move to end → LRU
      return Promise.resolve(entry.data as R);
    }

    // Return existing in-flight promise if one exists (coalescing)
    const pending = inflight.get(key);
    if (pending) return pending as Promise<R>;

    misses++;
    const promise = fn(...args).then((data) => {
      // Evict oldest entries if over limit
      if (store.size >= MAX_ENTRIES) {
        const firstKey = store.keys().next().value;
        if (firstKey !== undefined) store.delete(firstKey);
      }
      store.set(key, { data, expiresAt: Date.now() + ttlMs });
      inflight.delete(key);
      return data;
    }).catch((err) => {
      inflight.delete(key);
      throw err;
    });

    inflight.set(key, promise);
    return promise;
  };
}

/**
 * Invalidate cache entries.
 *
 * - No argument → clears everything
 * - With `prefix` → removes keys starting with that prefix
 */
export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}
