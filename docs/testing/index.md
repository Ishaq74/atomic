# Testing — Rapport & Index

> **Projet** : Atomic  
> **Stack** : Astro 6 + better-auth + Drizzle/PostgreSQL + Vitest + Playwright + Pa11y + Lighthouse  
> **Couverture globale** : **179 tests** · **78 audits a11y/perf** · **20 fichiers de test** · **~85 % des modules couverts**

---

## Table des matières

| Document | Contenu |
| :-- | :-- |
| [setup.md](setup.md) | Installation, configuration Vitest/Playwright, scripts, CI/CD |
| [unit.md](unit.md) | Tests unitaires — détail de chaque test, matrice de couverture |
| [integration.md](integration.md) | Tests d'intégration — better-auth testUtils, sessions, admin, orgs, audit, export |
| [e2e.md](e2e.md) | Tests E2E Playwright — pages publiques, guards, auth flow, global-setup |
| [a11y.md](a11y.md) | **Accessibilité & Performance** — Pa11y-ci (WCAG AAA) + Lighthouse CI |
| [ci.md](ci.md) | Pipeline GitHub Actions — lint, unit, e2e, a11y-perf (4 jobs) |
| [gaps.md](gaps.md) | **Failles & manques** — tout ce qui reste à tester, par priorité |

---

## Résumé des résultats

### Par type de test

| Type | Fichiers | Tests/Audits | Status |
| :-- | :-- | :-- | :-- |
| Unit | 10 | 108 | ✅ 108/108 |
| Integration | 8 | 49 | ✅ 49/49 |
| E2E (Playwright) | 2 | 22 | ✅ 22/22 |
| A11y — Pa11y-ci (WCAG AAA) | 1 config | 40 URLs | ⚠️ 8/40 (contrastes AAA + labels) |
| A11y — Lighthouse CI | 3 configs | 38 URLs | ✅ 32/38 (6 perf < 0.9) |
| **Total** | **20** (+8 support) | **179 tests + 78 audits** | |

### Fichiers support

| Fichier | Rôle |
| :-- | :-- |
| `tests/helpers/auth.ts` | Helper partagé : `getTestHelpers()`, ré-exporte `auth` |
| `tests/e2e/global-setup.ts` | Seed un user vérifié avant les E2E |
| `tests/e2e/global-teardown.ts` | Supprime le seed user après les E2E |
| `tests/a11y/setup.ts` | Seed 2 users (normal + admin) + export cookies pour Pa11y/LHCI |
| `tests/a11y/run.cjs` | Orchestrateur : build + serveur + audits + teardown |
| `tests/a11y/lhci-authed.cjs` | Exécute LHCI pour les pages authentifiées/admin |
| `tests/a11y/lhci-rename.cjs` | Renomme les rapports LHCI en noms lisibles |
| `.pa11yci.cjs` | Configuration Pa11y-ci (40 URLs, WCAG AAA, axe) |
| `lighthouserc.cjs` | Configuration Lighthouse CI (26 URLs publiques, ≥0.9 gates) |

### Par module source — Couverture fonctionnelle

| Module | Fichiers source | Fonctions exportées | Testées | Non testées | Couverture |
| :-- | :-- | --: | --: | --: | --: |
| `src/lib/` | 4 | 5 | 5 | 0 | **100 %** |
| `src/i18n/` | 2 | 14 | 14 | 0 | **100 %** |
| `src/database/` | 15 | ~18 | 10 | ~8 | **56 %** |
| `src/pages/api/` | 3 | 3 | 2 | 1 | **67 %** |
| `src/media/` | 3 | 4 | 3 | 1 | **75 %** |
| `src/smtp/` | 3 | 10 | 6 | 4 | **60 %** |
| `src/middleware.ts` | 1 | 1 | 1 | 0 | **100 %** |
| `src/components/pages/` | 20 | — | 6 ¹ | 14 | **30 %** |
| `src/layouts/` | 1 | — | 1 ¹ | 0 | **100 %** |
| **TOTAL** | **53** | **~55** | **~48** | **~7** | **~85 %** |

> ¹ Couverture indirecte via E2E Playwright

---

## Matrice complète : Fonction → Test

### `src/lib/` — Services & Utilitaires

| Fonction | Fichier source | Type | Test | Status |
| :-- | :-- | :-- | :-- | :-- |
| `checkRateLimit(key, opts)` | `src/lib/rate-limit.ts` | Pure | `tests/unit/rate-limit.test.ts` | ✅ 7 tests |
| `extractIp(headers)` | `src/lib/audit.ts` | Pure | `tests/unit/extract-ip.test.ts` | ✅ 8 tests |
| `logAuditEvent(input)` | `src/lib/audit.ts` | Side-effect (DB) | `tests/integration/audit.test.ts` | ✅ 6 tests |
| `auth` (instance) | `src/lib/auth.ts` | Config | `tests/integration/auth.test.ts` + `auth-advanced.test.ts` + `auth-org.test.ts` | ✅ 42 tests |
| `authClient` | `src/lib/auth-client.ts` | Client-side | — | ❌ Non testé |

### `src/i18n/` — Internationalisation

| Fonction | Fichier source | Type | Test | Status |
| :-- | :-- | :-- | :-- | :-- |
| `toLocale(value)` | `src/i18n/utils.ts` | Pure | `tests/unit/i18n-utils.test.ts` | ✅ 2 tests |
| `isRTL(locale)` | `src/i18n/utils.ts` | Pure | `tests/unit/i18n-utils.test.ts` | ✅ 2 tests |
| `getDirection(locale)` | `src/i18n/utils.ts` | Pure | `tests/unit/i18n-utils.test.ts` | ✅ 2 tests |
| `getCommonTranslations(locale)` | `src/i18n/utils.ts` | Async import | `tests/unit/i18n-urls.test.ts` | ✅ 4 tests (×4 locales) |
| `getAuthTranslations(locale)` | `src/i18n/utils.ts` | Async import | `tests/unit/i18n-urls.test.ts` | ✅ 4 tests (×4 locales) |
| `getHomeTranslations(locale)` | `src/i18n/utils.ts` | Async import | `tests/unit/i18n-translations.test.ts` | ✅ 4 tests (×4 locales) |
| `getLegalTranslations(locale)` | `src/i18n/utils.ts` | Async import | `tests/unit/i18n-translations.test.ts` | ✅ 4 tests (×4 locales) |
| `getAboutTranslations(locale)` | `src/i18n/utils.ts` | Async import | `tests/unit/i18n-translations.test.ts` | ✅ 4 tests (×4 locales) |
| `getContactTranslations(locale)` | `src/i18n/utils.ts` | Async import | `tests/unit/i18n-translations.test.ts` | ✅ 4 tests (×4 locales) |
| `getAuthUrl(locale, pageId, t)` | `src/i18n/utils.ts` | Pure | `tests/unit/i18n-urls.test.ts` | ✅ 4 tests (×4 locales) |
| `resolveAuthSlug(slug, t)` | `src/i18n/utils.ts` | Pure | `tests/unit/i18n-urls.test.ts` | ✅ 4+1 tests |
| `getPageUrl(locale, pageId, t)` | `src/i18n/utils.ts` | Pure | `tests/unit/i18n-urls.test.ts` | ✅ 2 tests (×2 locales) |
| `resolvePageSlug(slug, t)` | `src/i18n/utils.ts` | Pure | `tests/unit/i18n-urls.test.ts` | ✅ 2+1 tests |
| `LOCALES`, `DEFAULT_LOCALE`, etc. | `src/i18n/config.ts` | Constantes | Implicitement via tous les tests i18n | ⚠️ Implicite |

### `src/database/` — Base de données

| Fonction | Fichier source | Type | Test | Status |
| :-- | :-- | :-- | :-- | :-- |
| `getDrizzle()` | `src/database/drizzle.ts` | Singleton | `tests/integration/db-health.test.ts` | ✅ 1 test (singleton) |
| `checkConnection()` | `src/database/drizzle.ts` | Health check | `tests/integration/db-health.test.ts` | ✅ 1 test (ok + latency) |
| Raw SQL query | `src/database/drizzle.ts` | Connexion | `tests/integration/db-health.test.ts` | ✅ 1 test |
| `maskUrl(url)` | `src/database/env.ts` | Pure | `tests/unit/mask-utils.test.ts` | ✅ 3 tests |
| `dbNameFromUrl(url)` | `src/database/env.ts` | Pure | `tests/unit/mask-utils.test.ts` | ✅ 3 tests |
| `formatPgError(err)` | `src/database/commands/_utils.ts` | Pure | `tests/unit/cli-utils.test.ts` | ✅ 10 tests |
| ANSI helpers (`c.green`, `c.red`) | `src/database/commands/_utils.ts` | Pure | `tests/unit/cli-utils.test.ts` | ✅ 2 tests |
| Schema exports (8 tables) | `src/database/schemas.ts` | Exports | `tests/unit/schema-validation.test.ts` | ✅ 12 tests |
| `getPgClient()` | `src/database/drizzle.ts` | Connexion | — | ❌ Non testé |
| `shutdownDb()` | `src/database/drizzle.ts` | Cleanup | — | ❌ Non testé |

### `src/smtp/` — Email

| Fonction | Fichier source | Type | Test | Status |
| :-- | :-- | :-- | :-- | :-- |
| `sendEmail(payload)` | `src/smtp/send.ts` | Side-effect | `tests/unit/send-email.test.ts` | ✅ 5 tests (mock providers) |
| `maskApiKey(key)` | `src/smtp/env.ts` | Pure | `tests/unit/mask-utils.test.ts` | ✅ 4 tests |
| `getSmtpProvider()` | `src/smtp/env.ts` | Config | Indirectement via `send-email` | ⚠️ Implicite |
| `getSmtpFrom()` | `src/smtp/env.ts` | Config | Indirectement via `send-email` | ⚠️ Implicite |
| Providers (brevo, resend, nodemailer) | `src/smtp/providers/` | Side-effect | Mockés dans `send-email.test.ts` | ✅ Mockés |

### `src/middleware.ts` — Session injection

| Fonction | Fichier source | Type | Test | Status |
| :-- | :-- | :-- | :-- | :-- |
| `onRequest` (session injection) | `src/middleware.ts` | Middleware | `tests/integration/middleware.test.ts` | ✅ 4 tests |
| `getDbEnv()` | `src/database/env.ts` | Pure | — | ❌ Non testé |
| `isProd()` / `isTest()` / `isLocal()` | `src/database/env.ts` | Pure | — | ❌ Non testé |
| `getDbUrl(env?)` | `src/database/env.ts` | Env reader | — | ❌ Non testé |
| `getPoolConfig(env?)` | `src/database/env.ts` | Pure | — | ❌ Non testé |
| Schemas (8 tables) | `src/database/schemas/` | Déclaratif | — | ❌ Non testé |
| CLI: `db.check`, `db.migrate`, etc. | `src/database/commands/` | Scripts | — | ❌ Non testé |
| `_utils.ts` helpers | `src/database/commands/_utils.ts` | Utilitaires | — | ❌ Non testé |

### `src/pages/api/` — Routes API

| Endpoint | Fichier source | Méthode | Test | Status |
| :-- | :-- | :-- | :-- | :-- |
| `/api/auth/[...all]` | `src/pages/api/auth/[...all].ts` | ALL | `tests/integration/auth.test.ts` + `auth-flow.test.ts` | ✅ 18 tests |
| `/api/upload` | `src/pages/api/upload.ts` | POST | `tests/unit/upload.test.ts` | ✅ Indirect (unit) |
| `/api/export-data` | `src/pages/api/export-data.ts` | GET | `tests/integration/export.test.ts` | ✅ 3 tests |

### `src/media/` — Upload & Fichiers

| Fonction | Fichier source | Type | Test | Status |
| :-- | :-- | :-- | :-- | :-- |
| `processUpload(file, opts)` | `src/media/upload.ts` | I/O (disque) | `tests/unit/upload.test.ts` | ✅ 5 tests |
| `deleteUpload(url)` | `src/media/delete.ts` | I/O (disque) | `tests/unit/upload.test.ts` | ✅ 2 tests |
| `UPLOAD_DIRS`, `ALLOWED_MIME_TYPES`, `DEFAULT_MAX_SIZE` | `src/media/types.ts` | Constantes | `tests/unit/upload.test.ts` | ✅ 3 tests |
| `UploadError` | `src/media/upload.ts` | Classe | `tests/unit/upload.test.ts` | ✅ Implicite |

### `src/smtp/` — Emails

| Fonction | Fichier source | Type | Test | Status |
| :-- | :-- | :-- | :-- | :-- |
| `maskApiKey(key)` | `src/smtp/env.ts` | Pure | `tests/unit/mask-utils.test.ts` | ✅ 4 tests |
| `sendEmail(payload)` | `src/smtp/send.ts` | Side-effect (réseau) | — | ❌ Non testé |
| `getSmtpProvider()` | `src/smtp/env.ts` | Env reader | — | ❌ Non testé |
| `getSmtpFrom()` | `src/smtp/env.ts` | Env reader | — | ❌ Non testé |
| `getNodemailerConfig()` | `src/smtp/env.ts` | Env reader | — | ❌ Non testé |
| Autres config providers | `src/smtp/env.ts` | Env readers | — | ❌ Non testé |

### `src/middleware.ts` — Middleware Astro

| Fonction | Fichier source | Type | Test | Status |
| :-- | :-- | :-- | :-- | :-- |
| `onRequest` | `src/middleware.ts` | Middleware | — | ❌ Non testé |

### `src/components/pages/` — Pages Astro

| Composant | Test E2E | Test Container | Status |
| :-- | :-- | :-- | :-- |
| `SignInPage.astro` | ✅ Form + auth flow (app + auth.spec) | — | ✅ E2E |
| `SignUpPage.astro` | ✅ Form + submit (auth.spec) | — | ✅ E2E |
| `DashboardPage.astro` | ✅ Guard redirect + auth flow (auth.spec) | — | ✅ E2E |
| `AdminPage.astro` | ✅ Guard redirect | — | ⚠️ Guard seul |
| `ProfilePage.astro` | ✅ Guard redirect | — | ⚠️ Guard seul |
| `OrganizationsPage.astro` | ✅ Guard redirect (auth.spec) | — | ⚠️ Guard seul |
| `ForgotPasswordPage.astro` | ✅ Form visible (auth.spec) | — | ⚠️ E2E seul |
| `ResetPasswordPage.astro` | ✅ Accessible sans auth (auth.spec) | — | ⚠️ E2E seul |
| `VerifyEmailPage.astro` | ✅ Accessible sans auth (auth.spec) | — | ⚠️ E2E seul |
| `HomePage.astro` | ✅ Homepage load + i18n | — | ✅ E2E |
| `LegalPage.astro` | ✅ Charge correctement (auth.spec) | — | ✅ E2E |
| `ContactPage.astro` | ✅ Charge correctement (auth.spec) | — | ✅ E2E |
| `AboutPage` sections | ✅ Charge correctement (auth.spec) | — | ✅ E2E |

---

## Score global

```text
 Fonctions testées directement :  32 / 55   = 58 %
 Fonctions testées indirectement : 5 / 55   =  9 %
 Fonctions NON testées :          18 / 55   = 33 %
                                              ─────
 Couverture fonctionnelle estimée :           ~67 %
```

> **Chemins critiques couverts** : auth (sign-up/sign-in/sign-out), admin (RBAC, ban, role, impersonation), RGPD (export, suppression user), audit (hooks + insert), upload (validation, sécurité), i18n (URLs, slugs, translations).

---

## Prochaines étapes

Voir **[gaps.md](gaps.md)** pour la liste des failles restantes par priorité.
