import path from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { getPgClient, shutdownDb } from '../drizzle';
import { getConnectionLabel, dbNameFromUrl, getDbUrl } from '../env';
import { c, logTarget, confirmProd, confirmDestructive, resetAllTables } from './_utils';
import type { PoolClient } from 'pg';

type MigrationRecord = { id: string; sql: string };

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'src/database/migrations');

async function main() {
  const label = getConnectionLabel();

  console.log(c.cyan(c.bold(`\n═══════════════════════════════════════════════════════`)));
  console.log(c.cyan(c.bold(`   🚀 Migration Drizzle — ${label}`)));
  console.log(c.cyan(c.bold(`═══════════════════════════════════════════════════════\n`)));

  logTarget();
  await confirmProd('migration');

  const client = await getPgClient();

  try {
    // --- --reset flag ───────────────────────────────────────────────
    if (process.argv.includes('--reset')) {
      const dbName = dbNameFromUrl(getDbUrl());
      console.log(c.bgRed(` DESTRUCTIF: --reset — toutes les tables de ${dbName} vont être SUPPRIMÉES ! `));
      await confirmDestructive('--reset (suppression de toutes les tables + historique migrations)');
      await resetAllTables(client);
    }

    // --- Migration logic ────────────────────────────────────────────
    await ensureMigrationsTable(client);

    const applied = await loadAppliedMigrations(client);
    const pending = collectMigrations(applied);

    if (pending.length === 0) {
      console.log(c.green(c.bold(`\n✔️  Aucune migration en attente.`)));

      if (!existsSync(MIGRATIONS_DIR)) {
        console.log(c.yellow('⚠️  Dossier de migrations introuvable.'));
        console.log(`  Générez des migrations avec : ${c.cyan('npm run db:generate')}`);
      } else {
        const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'));
        if (files.length === 0) {
          console.log(c.yellow('⚠️  Dossier de migrations vide.'));
          console.log(`  Créez des schémas puis : ${c.cyan('npm run db:generate')}`);
        } else {
          console.log(c.cyan('Toutes les migrations sont déjà appliquées.'));
        }
      }

      console.log(c.cyan(c.bold(`\n═══════════════════════════════════════════════════════\n`)));
      return;
    }

    // --- Apply pending migrations ───────────────────────────────────
    for (const migration of pending) {
      console.log(c.green(c.bold(`\n[migrate] → ${migration.id}`)));
      const statements = migration.sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);

      await client.query('BEGIN');
      try {
        for (const stmt of statements) {
          if (!stmt) continue;
          try {
            await client.query(stmt);
          } catch (error: unknown) {
            const pgCode = (error as { code?: string })?.code;
            const errMsg = error instanceof Error ? error.message : String(error);
            if (pgCode && ['42P07', '42710', '42701'].includes(pgCode)) {
              console.warn(c.yellow(`  ⚠️  Ignoré : ${errMsg}`));
            } else {
              throw error;
            }
          }
        }
        await client.query(
          "INSERT INTO __drizzle_migrations (id, hash, created_at) VALUES ($1, '', NOW()) ON CONFLICT (id) DO NOTHING",
          [migration.id],
        );
        await client.query('COMMIT');
      } catch (error: unknown) {
        await client.query('ROLLBACK');
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(c.red(`  ❌ Erreur : ${errMsg}`));
        throw error;
      }
    }

    console.log(c.green(c.bold('\n✔️  Toutes les migrations appliquées.')));
    console.log(c.cyan(c.bold(`\n═══════════════════════════════════════════════════════\n`)));
  } finally {
    client.release();
    await shutdownDb();
  }
}

function collectMigrations(applied: Set<string>): MigrationRecord[] {
  if (!existsSync(MIGRATIONS_DIR)) {
    console.warn(`[migrate] Dossier introuvable: ${MIGRATIONS_DIR}`);
    return [];
  }

  return readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort()
    .map(file => ({
      id: file.replace('.sql', ''),
      sql: readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'),
    }))
    .filter(migration => !applied.has(migration.id));
}

async function ensureMigrationsTable(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id text PRIMARY KEY,
      hash text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function loadAppliedMigrations(client: PoolClient): Promise<Set<string>> {
  try {
    const result = await client.query<{ id: string }>(
      'SELECT id FROM __drizzle_migrations ORDER BY created_at ASC'
    );
    return new Set(result.rows.map(row => row.id));
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === '42P01') return new Set<string>();
    throw error;
  }
}

main().catch((error) => {
  console.error(c.red('[migrate] Échec:'), error);
  process.exit(1);
});