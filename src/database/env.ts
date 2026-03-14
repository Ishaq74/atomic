import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env') });

// ─── Types ───────────────────────────────────────────────────────────
export type DbEnv = 'PROD' | 'TEST' | 'LOCAL';

export interface PoolConfig {
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  allowExitOnIdle?: boolean;
}

export interface DbConfig {
  env: DbEnv;
  url: string;
  poolConfig: PoolConfig;
}

// ─── Constants ───────────────────────────────────────────────────────
const DB_ENVS: DbEnv[] = ['PROD', 'TEST', 'LOCAL'];

const ENV_VAR_MAP: Record<DbEnv, string> = {
  PROD: 'DATABASE_URL_PROD',
  TEST: 'DATABASE_URL_TEST',
  LOCAL: 'DATABASE_URL_LOCAL',
};

const POOL_CONFIGS: Record<DbEnv, PoolConfig> = {
  PROD: {
    max: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: true,
  },
  TEST: {
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 3_000,
  },
  LOCAL: {
    max: 10,
    idleTimeoutMillis: 15_000,
    connectionTimeoutMillis: 5_000,
  },
};

const CONNECTION_LABELS: Record<DbEnv, string> = {
  PROD: 'production',
  TEST: 'test',
  LOCAL: 'local/dev',
};

// ─── Active environment (single source of truth) ────────────────────
const ACTIVE_ENV: DbEnv = (() => {
  const raw = process.env.DB_ENV;

  // DB_ENV absent du .env
  if (raw === undefined) {
    console.warn(`\x1b[33m⚠️  DB_ENV non défini dans .env — défaut : LOCAL\x1b[0m`);
    console.warn(`\x1b[2m   Ajoutez DB_ENV=LOCAL|PROD|TEST dans votre fichier .env\x1b[0m`);
    return 'LOCAL';
  }

  // DB_ENV= (présent mais vide)
  if (raw.trim() === '') {
    console.warn(`\x1b[33m⚠️  DB_ENV est vide dans .env — défaut : LOCAL\x1b[0m`);
    console.warn(`\x1b[2m   Valeurs acceptées : ${DB_ENVS.join(', ')}\x1b[0m`);
    return 'LOCAL';
  }

  const normalized = raw.trim().toUpperCase();
  if (DB_ENVS.includes(normalized as DbEnv)) return normalized as DbEnv;

  // DB_ENV contient une valeur invalide
  console.error(`\x1b[31m\x1b[1m❌ DB_ENV invalide : "${raw}"\x1b[0m`);
  console.error(`\x1b[33m   Valeurs acceptées : ${DB_ENVS.join(', ')}\x1b[0m`);
  console.error(`\x1b[2m   Vérifiez votre fichier .env\x1b[0m`);
  return process.exit(1);
})();

// ─── Lazy URL resolution (only resolves the env you ask for) ────────
function resolveUrl(env: DbEnv): string {
  const varName = ENV_VAR_MAP[env];
  const url = process.env[varName];
  if (!url) {
    console.error(`\x1b[31m\x1b[1m❌ Variable d'environnement manquante : ${varName}\x1b[0m`);
    console.error(`\x1b[33m   Environnement cible : ${env}\x1b[0m`);
    console.error(`\x1b[33m   → Ajoutez ${varName}=postgresql://... dans votre fichier .env\x1b[0m`);
    console.error(`\x1b[2m   Voir .env.example pour un modèle complet.\x1b[0m`);
    return process.exit(1);
  }
  return url;
}

// ─── Public API ─────────────────────────────────────────────────────
export const getDbEnv = (): DbEnv => ACTIVE_ENV;
export const isProd = (): boolean => ACTIVE_ENV === 'PROD';
export const isTest = (): boolean => ACTIVE_ENV === 'TEST';
export const isLocal = (): boolean => ACTIVE_ENV === 'LOCAL';

export const getDbUrl = (env?: DbEnv): string => resolveUrl(env ?? ACTIVE_ENV);
export const getPoolConfig = (env?: DbEnv): PoolConfig => POOL_CONFIGS[env ?? ACTIVE_ENV];
export const getConnectionLabel = (env?: DbEnv): string => CONNECTION_LABELS[env ?? ACTIVE_ENV];

export function getDbConfig(env?: DbEnv): DbConfig {
  const target = env ?? ACTIVE_ENV;
  return {
    env: target,
    url: resolveUrl(target),
    poolConfig: POOL_CONFIGS[target],
  };
}

/** Masque les credentials dans une URL pour les logs */
export function maskUrl(url: string): string {
  return url.replace(/:\/\/[^@]+@/, '://***@');
}

/** Extrait le nom de la base depuis une URL postgres */
export function dbNameFromUrl(url: string): string {
  try { return new URL(url).pathname.replace(/^\//, ''); }
  catch { return url.split('/').pop() ?? 'unknown'; }
}