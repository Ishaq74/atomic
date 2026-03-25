import type { APIRoute } from "astro";
import { checkConnection } from "@database/drizzle";
import { getCacheStats } from "@database/cache";

export const prerender = false;

const startedAt = Date.now();

export const GET: APIRoute = async () => {
  try {
    const db = await checkConnection();
    const uptime = Math.floor((Date.now() - startedAt) / 1000);
    const cache = getCacheStats();

    const status = db.ok ? 200 : 503;
    const body = {
      status: db.ok ? "ok" : "degraded",
      version: "0.0.1",
      uptime,
      timestamp: new Date().toISOString(),
      db: { ok: db.ok },
      cache: { size: cache.size, hits: cache.hits, misses: cache.misses },
    };

    return new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error('[health] Check failed:', err);
    return new Response(JSON.stringify({
      status: "error",
      version: "0.0.1",
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
      db: { ok: false },
    }), {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }
};
