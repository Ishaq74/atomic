# Testing — Configuration & Setup

> Retour à l'[index](index.md)

---

## Arborescence des tests

```text
tests/
├── unit/                              # Tests unitaires (Vitest)
│   ├── rate-limit.test.ts             #   7 tests — checkRateLimit()
│   ├── i18n-utils.test.ts             #   6 tests — toLocale, isRTL, getDirection
│   ├── extract-ip.test.ts             #   8 tests — extractIp()
│   ├── upload.test.ts                 #  10 tests — processUpload, deleteUpload, constantes
│   ├── mask-utils.test.ts             #  10 tests — maskUrl, dbNameFromUrl, maskApiKey
│   ├── i18n-urls.test.ts              #  22 tests — getAuthUrl, resolveAuthSlug, getPageUrl
│   ├── i18n-translations.test.ts      #  16 tests — 4 loaders × 4 locales
│   ├── send-email.test.ts             #   5 tests — routage providers (mock)
│   ├── schema-validation.test.ts      #  12 tests — 8 table exports + 4 colonnes critiques
│   └── cli-utils.test.ts              #  12 tests — formatPgError + ANSI colors
│                                      # ─────────
│                                      # 108 tests unitaires
├── integration/                       # Tests d'intégration (Vitest + PostgreSQL)
│   ├── auth.test.ts                   #  13 tests — session, admin, org, impersonation, RGPD
│   ├── auth-flow.test.ts              #   5 tests — sign-up → sign-in → sign-out
│   ├── audit.test.ts                  #   6 tests — logAuditEvent + hooks
│   ├── export.test.ts                 #   3 tests — /api/export-data
│   ├── auth-advanced.test.ts          #  10 tests — password, email, profile
│   ├── auth-org.test.ts               #   5 tests — org CRUD, invitations, membres
│   ├── middleware.test.ts             #   4 tests — getSession headers
│   └── db-health.test.ts             #   3 tests — checkConnection, singleton, raw query
│                                      # ─────────
│                                      #  49 tests d'intégration
└── e2e/                               # Tests E2E (Playwright)
    ├── global-setup.ts                #  Setup : seed user vérifié
    ├── global-teardown.ts             #  Teardown : cleanup user
    ├── app.spec.ts                    #  10 tests — homepage, i18n, guest guards
    └── auth.spec.ts                   #  12 tests — sign-up/in, dashboard, profil, pages publiques
                                       # ─────────
                                       #  22 tests E2E

TOTAL : 179 tests (157 Vitest + 22 Playwright)
        20 fichiers de test
```

---

## Vitest — Configuration

**Fichier** : `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@i18n': resolve(__dirname, 'src/i18n'),
      '@lib': resolve(__dirname, 'src/lib'),
      '@database': resolve(__dirname, 'src/database'),
      '@smtp': resolve(__dirname, 'src/smtp'),
      '@media': resolve(__dirname, 'src/media'),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    environment: 'node',
    env: { NODE_ENV: 'test' },
    testTimeout: 15_000,
  },
});
```

### Points clés

| Config | Valeur | Rôle |
| :-- | :-- | :-- |
| `include` | `tests/unit/**/*.test.ts`, `tests/integration/**/*.test.ts` | Sépare unit & integration dans le même runner |
| `environment` | `node` | Pas de JSDOM — tests backend purs |
| `env.NODE_ENV` | `'test'` | Désactive l'envoi d'emails SMTP (dynamic import skip) |
| `testTimeout` | `15_000` | 15s max par test (tests DB peuvent être lents) |
| `alias` | 6 alias | Mêmes alias que `tsconfig.json` — nécessaire pour Vitest |

### Alias résolution

| Alias | Cible |
| :-- | :-- |
| `@/` | `src/` |
| `@i18n` | `src/i18n/` |
| `@lib` | `src/lib/` |
| `@database` | `src/database/` |
| `@smtp` | `src/smtp/` |
| `@media` | `src/media/` |

---

## Playwright — Configuration

**Fichier** : `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { NODE_ENV: 'test' },       // ← Désactive SMTP dans le serveur preview
  },
});
```

### Points clés — Playwright

| Config | Valeur | Rôle |
| :-- | :-- | :-- |
| `globalSetup` | `global-setup.ts` | Seed un user vérifié avant les tests |
| `globalTeardown` | `global-teardown.ts` | Supprime le user après les tests |
| `fullyParallel` | `true` | Tests parallèles en local |
| `workers` | `1` en CI | Séquentiel en CI pour stabilité |
| `retries` | `2` en CI, `0` en local | Retries en CI uniquement |
| `webServer.command` | `pnpm preview` | Lance le serveur SSR Astro |
| `webServer.env` | `{ NODE_ENV: 'test' }` | **Critique** — désactive SMTP dans le serveur |
| `reuseExistingServer` | `true` en local | Réutilise un serveur déjà lancé |
| `reporter` | `html` | Rapport HTML dans `playwright-report/` |

---

## Variables d'environnement

### En local (`.env` ou export)

```bash
# Base de données
DATABASE_URL_LOCAL=postgresql://user:pass@localhost:5432/atomic_dev
DB_ENV=LOCAL

# Auth
BETTER_AUTH_SECRET=your-secret-key-minimum-32-chars
BETTER_AUTH_URL=http://localhost:4321

# SMTP (non requis pour les tests)
# BREVO_API_KEY=...        # NON chargé en mode test
# SMTP_PROVIDER=BREVO      # NON chargé en mode test
```

### En CI (automatique via `ci.yml`)

```bash
DATABASE_URL_LOCAL=postgresql://test:test@localhost:5432/atomic_test
DB_ENV=LOCAL
NODE_ENV=test
BETTER_AUTH_SECRET=ci-test-secret-key-minimum-32-chars!!
BETTER_AUTH_URL=http://localhost:4321
```

### Protection SMTP en mode test

Le fichier `src/lib/auth.ts` utilise un pattern de **dynamic import conditionnel** pour ne jamais charger le module SMTP en mode test :

```ts
const isTest = process.env.NODE_ENV === 'test';

// Au lieu d'un import statique :
// import { sendEmail } from "@smtp/send";   ← SUPPRIMÉ

// On utilise un import dynamique conditionnel :
if (!isTest) {
  import("@smtp/send")
    .then(m => m.sendEmail({ to, subject, html, text }))
    .catch(() => {});
}
```

**Pourquoi ?** Un `import` statique de `@smtp/send` charge `src/smtp/env.ts` qui exécute `requireEnv('BREVO_API_KEY')` au top-level — ce qui appelle `process.exit(1)` si la variable n'existe pas. Le dynamic import évite complètement le chargement du module.

---

## Commandes disponibles

```bash
# Tests unitaires + intégration (Vitest)
pnpm test                    # Tous les tests Vitest
pnpm test -- --watch         # Watch mode
pnpm test -- tests/unit/     # Seulement les unit
pnpm test -- tests/integration/  # Seulement les integration

# Tests E2E (Playwright)
pnpm test:e2e                # Tous les E2E
npx playwright test --headed # Mode debug avec navigateur visible
npx playwright test --ui     # Mode UI interactif
npx playwright show-report   # Rapport HTML

# Validation complète (séquentielle)
pnpm lint && npx astro check && pnpm build && pnpm test && pnpm test:e2e
```

---

## Utilitaires de test

### `tests/e2e/global-setup.ts`

- Exporte `SEED_EMAIL`, `SEED_PASSWORD`, `SEED_NAME` (utilisés dans `auth.spec.ts`)
- Set `process.env.NODE_ENV = 'test'` avant import de auth
- Crée et vérifie un user seed via `auth.api.signUpEmail()` + SQL update

### `tests/e2e/global-teardown.ts`

- Supprime account → session → user pour le SEED_EMAIL
- Nettoyage complet pour éviter les conflits entre runs

### Mocks Vitest courants

| Module mocké | Fichier test | Ce qui est mocké |
| :-- | :-- | :-- |
| `@smtp/env` | `send-email.test.ts` | `getSmtpProvider()`, `getSmtpFrom()` |
| `@smtp/providers/brevo` | `send-email.test.ts` | `send()` |
| `@smtp/providers/resend` | `send-email.test.ts` | `send()` |
| `@smtp/providers/nodemailer` | `send-email.test.ts` | `send()` |
| `node:fs/promises` | `upload.test.ts` | Filesystem operations |
