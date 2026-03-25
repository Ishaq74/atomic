import { Client } from 'pg';
import { type DbEnv, getDbUrl, maskUrl } from '../env';
import { c, confirmDestructive, safeConnect } from './_utils';

// ─── Environnements valides ──────────────────────────────────────────
const VALID_ENVS: DbEnv[] = ['LOCAL', 'PROD', 'TEST'];

// ─── Parse arguments ─────────────────────────────────────────────────

function parseArgs(): { source: DbEnv; target: DbEnv } {
  const args = process.argv.slice(2).map(a => a.trim().toUpperCase());

  if (args.length !== 2) {
    console.error(c.red(c.bold(`\n❌ Usage : pnpm db:sync <SOURCE> <TARGET>`)));
    console.error(c.yellow(`   Environnements disponibles : ${VALID_ENVS.join(', ')}`));
    console.error(c.dim(`   Exemple : pnpm db:sync LOCAL PROD   (écrase PROD avec LOCAL)`));
    console.error(c.dim(`             pnpm db:sync PROD LOCAL   (écrase LOCAL avec PROD)`));
    console.error(c.dim(`             pnpm db:sync TEST LOCAL   (écrase LOCAL avec TEST)\n`));
    return process.exit(1);
  }

  const [rawSrc, rawTgt] = args;
  const invalid = [rawSrc, rawTgt].filter(e => !VALID_ENVS.includes(e as DbEnv));
  if (invalid.length) {
    console.error(c.red(c.bold(`\n❌ Environnement(s) invalide(s) : ${invalid.join(', ')}`)));
    console.error(c.yellow(`   Valeurs acceptées : ${VALID_ENVS.join(', ')}\n`));
    return process.exit(1);
  }

  if (rawSrc === rawTgt) {
    console.error(c.red(c.bold(`\n❌ Source et cible sont identiques : ${rawSrc}`)));
    console.error(c.yellow(`   Choisissez deux environnements différents.\n`));
    return process.exit(1);
  }

  return { source: rawSrc as DbEnv, target: rawTgt as DbEnv };
}

// ── Helpers ──────────────────────────────────────────────────────────

// Safe identifier regex — only allow normal PostgreSQL identifiers
const SAFE_IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

async function getTables(client: Client): Promise<string[]> {
  const res = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
  );
  return res.rows.map(r => r.table_name);
}

async function copyTableData(from: Client, to: Client, table: string) {
  if (!SAFE_IDENT.test(table)) throw new Error(`Invalid table name: ${table}`);
  const { rows } = await from.query(`SELECT * FROM "${table}"`);
  if (rows.length === 0) {
    console.log(c.dim(`  [SKIP] ${table} — vide`));
    return;
  }
  const columns = Object.keys(rows[0]);
  for (const col of columns) {
    if (!SAFE_IDENT.test(col)) throw new Error(`Invalid column name: ${col}`);
  }
  const cols = columns.map(col => `"${col}"`).join(',');
  await to.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);

  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const valueSets: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    for (const row of batch) {
      const placeholders = columns.map(() => `$${paramIdx++}`);
      valueSets.push(`(${placeholders.join(',')})`);
      for (const col of columns) params.push(row[col]);
    }

    await to.query(
      `INSERT INTO "${table}" (${cols}) VALUES ${valueSets.join(',')}`,
      params,
    );
  }
  console.log(c.green(`  [OK] ${table} (${rows.length} lignes)`));
}

// ── Main ─────────────────────────────────────────────────────────────

async function sync() {
  const { source, target } = parseArgs();

  console.log(c.cyan(c.bold(`\n═══════════════════════════════════════════════════════`)));
  console.log(c.cyan(c.bold(`   🔄 Sync ${source} → ${target}`)));
  console.log(c.cyan(c.bold(`═══════════════════════════════════════════════════════\n`)));

  const urlSource = getDbUrl(source);
  const urlTarget = getDbUrl(target);

  console.log(`  Source : ${c.bold(source)} ${c.dim(maskUrl(urlSource))}`);
  console.log(`  Cible  : ${c.bold(target)} ${c.dim(maskUrl(urlTarget))}`);
  console.log();

  await confirmDestructive(`SYNC ${source} → ${target} (ÉCRASER ${target} avec les données de ${source})`);

  const connSource = await safeConnect(source, urlSource);
  const connTarget = await safeConnect(target, urlTarget);

  const errors: string[] = [];
  if (!connSource.ok) errors.push(source);
  if (!connTarget.ok) errors.push(target);

  if (errors.length > 0) {
    console.error(c.red(c.bold(`\n❌ Connexion impossible : ${errors.join(' + ')}`)));
    console.error(c.yellow(`   Corrigez les identifiants/URLs ci-dessus dans .env puis relancez.`));
    if (connSource.ok) await connSource.client.end();
    if (connTarget.ok) await connTarget.client.end();
    process.exit(1);
  }

  const from = connSource.client!;
  const to = connTarget.client!;

  try {
    const tables = await getTables(from);
    if (tables.length === 0) {
      console.log(c.yellow('[INFO] Aucune table trouvée dans la source.'));
    } else {
      console.log(`\nSynchronisation de ${c.bold(String(tables.length))} tables…\n`);
      await to.query('BEGIN');
      try {
        await to.query('SET LOCAL session_replication_role = replica;');
        for (const table of tables) {
          await copyTableData(from, to, table);
        }
        await to.query('COMMIT');
      } catch (err) {
        await to.query('ROLLBACK').catch(() => {});
        throw err;
      }
    }

    console.log(c.green(c.bold('\n✔️  Synchronisation terminée.')));
  } finally {
    await from.end();
    await to.end();
  }
}

sync().catch(e => {
  console.error(c.red('[sync] Échec inattendu:'), e?.message || e);
  process.exit(1);
});