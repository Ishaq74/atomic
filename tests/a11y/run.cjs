/**
 * A11y/Lighthouse orchestrator — single command to run all audits.
 *
 * 1. Checks if preview server is already running
 * 2. If not → builds + starts it in background
 * 3. Waits for server readiness
 * 4. Runs a11y setup (seed users + auth cookies)
 * 5. Runs Pa11y-ci
 * 6. Runs Lighthouse CI (public + authenticated)
 * 7. Renames LHCI reports to readable names
 * 8. Tears down (cleanup seeded users)
 * 9. Kills server if we started it
 *
 * Usage:
 *   node tests/a11y/run.cjs                  # run everything
 *   node tests/a11y/run.cjs --pa11y          # Pa11y only
 *   node tests/a11y/run.cjs --lighthouse     # Lighthouse only
 */

const { execSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

const PORT = 4321;
const HOST = process.platform === 'win32' ? '[::1]' : 'localhost';
const MAX_WAIT = 60_000; // 60s max wait for server
const POLL_INTERVAL = 1_000;

const args = process.argv.slice(2);
const runPa11y = args.length === 0 || args.includes('--pa11y');
const runLighthouse = args.length === 0 || args.includes('--lighthouse');

let serverProcess = null;
let weStartedServer = false;

// ── Helpers ──────────────────────────────────────────────────────────

function log(msg) {
  console.log(`\x1b[36m[a11y]\x1b[0m ${msg}`);
}

function logError(msg) {
  console.error(`\x1b[31m[a11y]\x1b[0m ${msg}`);
}

function run(cmd, label) {
  log(`Running: ${label || cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', shell: true, cwd: process.cwd() });
    return true;
  } catch (e) {
    logError(`"${label || cmd}" exited with code ${e.status}`);
    return false;
  }
}

/** Check if something is listening on PORT */
function isPortOpen() {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(2000);
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('timeout', () => { sock.destroy(); resolve(false); });
    sock.once('error', () => { sock.destroy(); resolve(false); });
    sock.connect(PORT, HOST);
  });
}

/** Wait until server responds with HTTP 2xx/3xx */
async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(`http://${HOST}:${PORT}/`, (res) => {
          resolve(res.statusCode < 400);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => { req.destroy(); resolve(false); });
      });
      if (ok) return true;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
  return false;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  let exitCode = 0;

  try {
    // 1. Check if server is already running
    const alreadyRunning = await isPortOpen();

    if (alreadyRunning) {
      log(`Server already running on port ${PORT}`);
    } else {
      // 2. Build
      log('Building project...');
      run('pnpm build', 'build');

      // 3. Start preview server in background
      log('Starting preview server...');
      serverProcess = spawn('node', ['dist/server/entry.mjs'], {
        cwd: process.cwd(),
        stdio: 'ignore',
        detached: false,
        env: { ...process.env, HOST: '0.0.0.0', PORT: String(PORT) },
      });
      weStartedServer = true;

      // 4. Wait for server
      log(`Waiting for server on ${HOST}:${PORT}...`);
      const ready = await waitForServer();
      if (!ready) {
        logError('Server did not start within 60s, aborting.');
        process.exit(1);
      }
      log('Server is ready!');
    }

    // 5. A11y setup (seed users + export cookies)
    log('Setting up a11y test users...');
    run('pnpm a11y:setup', 'a11y:setup');

    // 6. Run audits
    if (runPa11y) {
      log('─── Pa11y-ci ───');
      if (!run('pnpm a11y:pa11y', 'pa11y-ci')) exitCode = 1;
    }

    if (runLighthouse) {
      // Clean previous reports so they don't accumulate across runs
      const lhDir = path.resolve(__dirname, '../../.lighthouseci');
      if (fs.existsSync(lhDir)) {
        fs.rmSync(lhDir, { recursive: true });
        log('Cleaned previous .lighthouseci/ reports');
      }

      log('─── Lighthouse CI (public) ───');
      if (!run('pnpm a11y:lighthouse', 'lighthouse')) exitCode = 1;
      run('pnpm a11y:lighthouse:rename', 'lighthouse:rename');

      log('─── Lighthouse CI (authenticated) ───');
      if (!run('pnpm a11y:lighthouse:authed', 'lighthouse:authed')) exitCode = 1;
      run('pnpm a11y:lighthouse:rename', 'lighthouse:rename');
    }

  } finally {
    // 7. Teardown (always)
    log('Tearing down a11y test users...');
    run('pnpm a11y:teardown', 'a11y:teardown');

    // 8. Kill server if we started it
    if (weStartedServer && serverProcess) {
      log('Stopping preview server...');
      serverProcess.kill('SIGTERM');
      // Give it a moment, then force kill
      setTimeout(() => {
        try { serverProcess.kill('SIGKILL'); } catch { /* already dead */ }
      }, 3000);
    }

    log(exitCode === 0 ? '✅ All audits passed!' : '⚠️  Some audits had failures (see above)');
  }

  process.exit(exitCode);
}

main();
