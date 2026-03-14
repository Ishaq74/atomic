# Testing — CI/CD (GitHub Actions)

> Retour à l'[index](index.md) · Voir aussi [setup](setup.md)

---

## Pipeline

**Fichier** : `.github/workflows/ci.yml`

```text
push/PR → main
    │
    ├── [1] lint-and-check ──────────────────────┐
    │       ESLint + astro check                  │
    │                                             │
    ├── [2] unit-tests ──────────────────────────┐│
    │       Vitest (157 tests)                   ││
    │       PostgreSQL 16 service container      ││
    │       Migrations + tests                    ││
    │                                             ├┤
    └── [3] e2e-tests (needs: 1 + 2) ────────────┘│
            Playwright (22 tests)                  │
            PostgreSQL 16 service container        │
            Build + preview + chromium             │
```

### Déclencheurs

- **push** sur `main`
- **pull_request** vers `main`

---

## Job 1 : `lint-and-check`

| Étape | Commande | Ce qu'elle vérifie |
| :-- | :-- | :-- |
| Checkout | `actions/checkout@v4` | Clone le repo |
| pnpm | `pnpm/action-setup@v4` (v10) | Installe pnpm |
| Node | `actions/setup-node@v4` (v22) | Installe Node avec cache pnpm |
| Install | `pnpm install --frozen-lockfile` | Installe les dépendances |
| ESLint | `pnpm lint` | 0 erreurs / 0 warnings |
| Astro Check | `npx astro check` | 0 erreurs / 0 warnings / 0 hints |

**Runtime estimé** : ~1 min

---

## Job 2 : `unit-tests`

### Service PostgreSQL

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: atomic_test
    ports: ['5432:5432']
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

### Variables d'environnement

```yaml
env:
  DATABASE_URL_LOCAL: postgresql://test:test@localhost:5432/atomic_test
  DB_ENV: LOCAL
  NODE_ENV: test
  BETTER_AUTH_SECRET: ci-test-secret-key-minimum-32-chars!!
  BETTER_AUTH_URL: http://localhost:4321
```

### Étapes

| Étape | Commande | Ce qu'elle fait |
| :-- | :-- | :-- |
| Checkout | `actions/checkout@v4` | Clone le repo |
| pnpm + Node | Setup toolchain | pnpm 10, Node 22 |
| Install | `pnpm install --frozen-lockfile` | Dépendances |
| Migrations | `pnpm db:migrate` | Applique les migrations sur la DB de test |
| Vitest | `pnpm test` | **157 tests** (108 unit + 49 integration) |

**Runtime estimé** : ~2 min

### Ce qui est testé

- 108 tests unitaires (fonctions pures, mocks, pas de DB)
- 49 tests d'intégration (auth, audit, export, middleware, org, DB health)
- `NODE_ENV=test` → aucun email SMTP envoyé

---

## Job 3 : `e2e-tests`

**Dépendances** : attend que `lint-and-check` ET `unit-tests` soient OK.

### Service PostgreSQL — Job 3

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: atomic_e2e    # ← DB séparée pour E2E
    ports: ['5432:5432']
```

### Variables d'environnement — Job 3

```yaml
env:
  DATABASE_URL_LOCAL: postgresql://test:test@localhost:5432/atomic_e2e
  DB_ENV: LOCAL
  BETTER_AUTH_SECRET: ci-e2e-secret-key-minimum-32-chars!!
  BETTER_AUTH_URL: http://localhost:4321
```

> Note : pas de `NODE_ENV` explicite ici — c'est le `playwright.config.ts` qui le set via `webServer.env: { NODE_ENV: 'test' }`.

### Étapes — Job 3

| Étape | Commande | Ce qu'elle fait |
| :-- | :-- | :-- |
| Checkout | `actions/checkout@v4` | Clone le repo |
| pnpm + Node | Setup toolchain | pnpm 10, Node 22 |
| Install | `pnpm install --frozen-lockfile` | Dépendances |
| Playwright | `npx playwright install --with-deps chromium` | Installe Chromium + dépendances système |
| Migrations | `pnpm db:migrate` | Migrations sur `atomic_e2e` |
| Build | `pnpm build` | Build Astro SSR complet |
| E2E | `pnpm test:e2e` | **22 tests** Playwright (Chromium) |
| Artifact | `actions/upload-artifact@v4` | Upload `playwright-report/` (7 jours) |

**Runtime estimé** : ~3-4 min

### Retries & Workers

- **Workers** : 1 en CI (séquentiel pour stabilité)
- **Retries** : 2 en CI (0 en local)
- **Artifact** : rapport HTML uploadé même si le job échoue (`if: ${{ !cancelled() }}`)

---

## Résumé des compteurs CI

| Métrique | Valeur |
| :-- | :-- |
| Jobs | 3 (lint → unit → e2e) |
| Tests Vitest | 157 (108 unit + 49 integ) |
| Tests Playwright | 22 |
| **Total tests CI** | **179** |
| PostgreSQL | v16 (2 DBs : `atomic_test` + `atomic_e2e`) |
| Node | v22 |
| pnpm | v10 |
| Navigateur | Chromium (Playwright managed) |
| Rapport E2E | Artifact 7 jours |

---

## Secrets & Sécurité

| Variable | Source | Sensible ? |
| :-- | :-- | :-- |
| `DATABASE_URL_LOCAL` | Hardcodé dans `ci.yml` | Non (DB éphémère) |
| `BETTER_AUTH_SECRET` | Hardcodé dans `ci.yml` | Non (CI uniquement, pas de prod) |
| `BREVO_API_KEY` | **Non défini en CI** | N/A — jamais utilisé (dynamic import skip) |
| `SMTP_*` | **Non défini en CI** | N/A — jamais chargé en mode test |

> **Aucun secret GitHub n'est nécessaire** pour la CI. Toutes les valeurs sont des constantes de test.
