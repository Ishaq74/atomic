# Testing — Couverture & Gaps restants

> Retour à l'[index](index.md)

---

## Historique des gaps (tous résolus)

Lors de l'audit initial, 14 gaps prioritaires (P2) et 5 gaps secondaires (P3) avaient été identifiés. **Tous les gaps P2 et P3 ont été fermés** au cours des phases d'implémentation.

### P0 — Bloquants (0 restants)

Tous les bloquants (rate-limit, i18n, extract-ip) étaient déjà couverts dans les phases précédentes.

### P1 — Fonctionnels (0 restants)

Tous les fonctionnels (auth, audit, admin, export) étaient déjà couverts dans les phases précédentes.

### P2 — Résolus ✅

| ID | Gap initial | Solution | Fichier |
| :-- | :-- | :-- | :-- |
| P2-1 | Upload unit manquant | 10 tests upload (processUpload, deleteUpload, constantes, sécurité) | `tests/unit/upload.test.ts` |
| P2-2 | Mask-utils non testé | 10 tests (maskUrl, dbNameFromUrl, maskApiKey) | `tests/unit/mask-utils.test.ts` |
| P2-3 | i18n-urls manquant | 22 tests (getAuthUrl, resolveAuthSlug, getPageUrl ×4 locales) | `tests/unit/i18n-urls.test.ts` |
| P2-4 | i18n-translations manquant | 16 tests (4 loaders ×4 locales, clés structurelles) | `tests/unit/i18n-translations.test.ts` |
| P2-5 | send-email non testé | 5 tests mock (routage 3 providers, from config) | `tests/unit/send-email.test.ts` |
| P2-6 | schema-validation manquant | 12 tests (8 table exports + 4 colonnes critiques) | `tests/unit/schema-validation.test.ts` |
| P2-7 | CLI utils non testé | 12 tests (formatPgError 10 codes + ANSI 2) | `tests/unit/cli-utils.test.ts` |
| P2-8 | auth-advanced manquant | 10 tests (password reset/change, email verif, updateUser) | `tests/integration/auth-advanced.test.ts` |
| P2-9 | auth-org manquant | 5 tests (updateOrg, invite, accept, remove, delete) | `tests/integration/auth-org.test.ts` |
| P2-10 | middleware non testé | 4 tests (getSession avec 4 types de headers) | `tests/integration/middleware.test.ts` |
| P2-11 | db-health non testé | 3 tests (checkConnection, singleton, raw query) | `tests/integration/db-health.test.ts` |
| P2-12 | E2E password-forgot page | Test ajouté : `forgot password page loads` | `tests/e2e/auth.spec.ts` |
| P2-13 | E2E Spanish locale | Test ajouté : `Spanish locale loads correctly` | `tests/e2e/auth.spec.ts` |
| P2-14 | E2E profile access | Test ajouté : `authenticated user can access profile page` | `tests/e2e/auth.spec.ts` |

### P3 — Résolus ✅

| ID | Gap initial | Résolution |
| :-- | :-- | :-- |
| P3-1 | Auth sign-up/in/out flow | Couvert dans `auth-flow.test.ts` (5 tests) |
| P3-2 | Audit hooks deeply | Couvert dans `audit.test.ts` (4 tests hooks) |
| P3-3 | RGPD deletion flow | Couvert dans `auth.test.ts` (2 tests deletion) |
| P3-4 | Impersonation admin | Couvert dans `auth.test.ts` (2 tests impersonation) |
| P3-5 | Organization CRUD | Couvert dans `auth-org.test.ts` (5 tests) |

---

## Gaps restants (faible priorité)

Les gaps ci-dessous sont de **priorité très basse** (P4) — ils ne bloquent rien et ne représentent pas de risque fonctionnel.

| ID | Module | Description | Raison de non-implémentation |
| :-- | :-- | :-- | :-- |
| P4-1 | `authClient` | Client-side auth (React/Astro islands) | Nécessiterait JSDOM + mocking complet du runtime navigateur |
| P4-2 | `getPgClient` | Ouverture/fermeture de la connexion PG brute | Déjà couvert indirectement par `db-health.test.ts` |
| P4-3 | `shutdownDb` | Cleanup de la connexion au shutdown | Fonction triviale, couverte par le teardown global |
| P4-4 | Components UI | Tests de rendu des composants Astro/Starwind | Nécessiterait Container API (expérimental dans Astro) |
| P4-5 | Admin content | Vérification détaillée du contenu admin E2E | Les redirections auth sont testées, le contenu dépend des données |

---

## Gaps accessibilité & performance (Pa11y + Lighthouse)

> Identifiés lors de la mise en place des audits a11y/perf. À corriger dans un sprint séparé.

### Pa11y-ci — WCAG AAA

**Score** : 8/40 URLs passent (32 échouent)

| Type d'erreur | Nombre | Critère WCAG | Localisation |
| :-- | :-- | :-- | :-- |
| Contraste insuffisant (AAA) | ~78 | 1.4.6 Enhanced Contrast | Toutes les pages — texte gris clair, liens, boutons |
| Labels de formulaire manquants | 4 | 1.3.1 Info and Relationships | Pages sign-in, sign-up (champs sans `<label>`) |

> **Note** : WCAG AAA est le standard le plus strict. La majorité des erreurs sont des contrastes AAA (ratio 7:1) sur des éléments qui passent AA (ratio 4.5:1).

### Lighthouse CI — Performance

**Scores a11y/best-practices/SEO** : ✅ ≥ 0.9 partout

**Scores performance** : 6 URLs < 0.9

| URL | Score | Cause probable |
| :-- | :-- | :-- |
| `/fr/` (homepage) | 0.89 | Bundle JS initial, images non optimisées |
| `/en/` (homepage) | 0.87 | Idem |
| `/es/` (homepage) | 0.86 | Idem |
| `/ar/` (homepage) | 0.74 | Idem + fonts RTL |
| `/fr/mentions-legales` | 0.82 | Contenu long, CLS |
| `/ar/الشروط-القانونية` | 0.82 | Contenu long + RTL |

### Plan de correction

| Priorité | Action | Impact |
| :-- | :-- | :-- |
| P1 | Ajouter des `<label>` aux champs de formulaire auth | Fixe les 4 erreurs Pa11y labels |
| P2 | Augmenter le contraste des couleurs (design tokens) | Fixe ~78 erreurs Pa11y AAA |
| P3 | Optimiser les images homepage (WebP, lazy loading) | Améliore les scores perf |
| P3 | Réduire le bundle JS initial | Améliore les scores perf |
| P4 | Optimiser les fonts RTL pour l'arabe | Améliore le score perf arabe |

---

## Couverture par module

| Module | Fonctions | Testées | Couverture |
| :-- | :-- | :-- | :-- |
| `src/lib/rate-limit.ts` | 1 | 1 | 100 % |
| `src/lib/audit.ts` | 2 | 2 | 100 % |
| `src/lib/auth.ts` | ~15 API methods | ~15 | ~100 % |
| `src/i18n/utils.ts` | ~12 | ~12 | ~100 % |
| `src/database/env.ts` | 3 | 3 | 100 % |
| `src/database/schemas.ts` | 8 tables | 8 | 100 % |
| `src/database/commands/_utils.ts` | 3 | 3 | 100 % |
| `src/smtp/send.ts` | 1 | 1 | 100 % |
| `src/smtp/env.ts` | 2 | 2 | 100 % |
| `src/media/upload.ts` | 1 | 1 | 100 % |
| `src/media/delete.ts` | 1 | 1 | 100 % |
| `src/media/types.ts` | 3 constants | 3 | 100 % |
| `src/pages/api/export-data.ts` | 1 | 1 | 100 % |
| **Estimation globale** | | | **~85 %** |

> Note : l'estimation de 85 % exclut les composants UI (Astro/React) et le code client-side qui nécessiteraient un environnement navigateur.
