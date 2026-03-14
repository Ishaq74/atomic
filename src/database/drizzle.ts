import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import * as schema from './schemas';
import { getDbUrl, getPoolConfig } from './env';

export type DrizzleDB = NodePgDatabase<typeof schema>;

// ─── Pool singleton ──────────────────────────────────────────────────
let pool: Pool | null = null;
let cachedDrizzle: DrizzleDB | null = null;

function getPool(): Pool {
  if (pool) return pool;

  const url = getDbUrl();
  const poolConfig = getPoolConfig();

  pool = new Pool({
    connectionString: url,
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
    ...poolConfig,
  });

  pool.on('error', (err) => {
    console.error('[DB] Erreur de pool inattendue:', err.message);
    // Reset singleton so next getDrizzle() call creates a fresh connection
    pool = null;
    cachedDrizzle = null;
  });

  return pool;
}

// ─── Public API ──────────────────────────────────────────────────────
export function getDrizzle(): DrizzleDB {
  if (cachedDrizzle) return cachedDrizzle;
  cachedDrizzle = drizzle(getPool(), { schema });
  return cachedDrizzle;
}

export async function getPgClient(): Promise<PoolClient> {
  return getPool().connect();
}

export async function checkConnection(): Promise<{ ok: boolean; latency: number; error?: unknown }> {
  const start = Date.now();
  try {
    const client = await getPgClient();
    try {
      await client.query('SELECT 1');
      return { ok: true, latency: Date.now() - start };
    } catch (err) {
      return { ok: false, latency: Date.now() - start, error: err };
    } finally {
      client.release();
    }
  } catch (err) {
    return { ok: false, latency: Date.now() - start, error: err };
  }
}

export async function shutdownDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    cachedDrizzle = null;
  }
}

export { schema };