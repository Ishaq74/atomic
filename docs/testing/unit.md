# Testing — Tests Unitaires

> Retour à l'[index](index.md) · Voir aussi [setup](setup.md)

---

## Vue d'ensemble

| Fichier | Cible | Tests | Status |
| :-- | :-- | :-- | :-- |
| `tests/unit/rate-limit.test.ts` | `src/lib/rate-limit.ts` → `checkRateLimit()` | 7 | ✅ |
| `tests/unit/i18n-utils.test.ts` | `src/i18n/utils.ts` → `toLocale()`, `isRTL()`, `getDirection()` | 6 | ✅ |
| `tests/unit/extract-ip.test.ts` | `src/lib/audit.ts` → `extractIp()` | 8 | ✅ |
| `tests/unit/upload.test.ts` | `src/media/upload.ts`, `delete.ts`, `types.ts` | 10 | ✅ |
| `tests/unit/mask-utils.test.ts` | `src/database/env.ts`, `src/smtp/env.ts` | 10 | ✅ |
| `tests/unit/i18n-urls.test.ts` | `src/i18n/utils.ts` → URLs, slugs, loaders | 22 | ✅ |
| `tests/unit/i18n-translations.test.ts` | `src/i18n/utils.ts` → `get*Translations()` ×4 loaders ×4 locales | 16 | ✅ |
| `tests/unit/send-email.test.ts` | `src/smtp/send.ts` → `sendEmail()` (mock providers) | 5 | ✅ |
| `tests/unit/schema-validation.test.ts` | `src/database/schemas.ts` → 8 table exports + colonnes critiques | 12 | ✅ |
| `tests/unit/cli-utils.test.ts` | `src/database/commands/_utils.ts` → `formatPgError()`, ANSI helpers | 12 | ✅ |
| **Total** | | **108** | **✅** |

---

## `rate-limit.test.ts` — Rate Limiter

**Cible** : `checkRateLimit(key, opts)` → `RateLimitResult`

| # | Test | Ce qu'il vérifie | Inputs | Expected |
| :-- | :-- | :-- | :-- | :-- |
| 1 | `allows requests within the limit` | Première requête acceptée | `max: 5, window: 60` | `allowed: true, remaining: 4` |
| 2 | `decrements remaining on each call` | Le compteur décrémente | 3 appels avec `max: 3` | `remaining: 1` puis `0` |
| 3 | `blocks requests when limit is exceeded` | Blocage après épuisement | 4 appels avec `max: 3` | `allowed: false, remaining: 0` |
| 4 | `returns a valid resetAt timestamp` | Le timestamp est dans la fenêtre | `window: 10` | `now < resetAt ≤ now + 10s` |
| 5 | `uses different counters for different keys` | Isolation par clé | 2 clés différentes | clé A bloquée, clé B autorisée |
| 6 | `resets after window expires` | La fenêtre expire correctement | `vi.useFakeTimers()` + `advanceTimersByTime(11000)` | `allowed: true` après expiration |
| 7 | `returns fresh remaining after reset` | Le compteur est neuf après expiration | Même clé après reset | `remaining` frais (pas cumulé) |

### Stratégie — rate-limit

- **Isolation** : chaque test utilise un `keyPrefix` unique (`Date.now() + Math.random()`) pour éviter les collisions
- **Fake timers** : tests 6-7 utilisent `vi.useFakeTimers()` pour tester l'expiration de la fenêtre sans attendre

---

## `i18n-utils.test.ts` — Utilitaires i18n

**Cible** : `toLocale()`, `isRTL()`, `getDirection()`

| # | Describe | Test | Inputs | Expected |
| :-- | :-- | :-- | :-- | :-- |
| 1 | `toLocale` | `returns the locale if valid` | `'fr'`, `'en'`, `'es'`, `'ar'` | Retourne la même valeur |
| 2 | `toLocale` | `returns default locale for invalid input` | `'xx'`, `undefined`, `''` | `'fr'` (DEFAULT_LOCALE) |
| 3 | `isRTL` | `returns true for Arabic` | `'ar'` | `true` |
| 4 | `isRTL` | `returns false for LTR locales` | `'fr'`, `'en'`, `'es'` | `false` |
| 5 | `getDirection` | `returns rtl for Arabic` | `'ar'` | `'rtl'` |
| 6 | `getDirection` | `returns ltr for other locales` | `'fr'`, `'en'` | `'ltr'` |

### Stratégie — i18n-utils

- **Fonctions pures** : pas de dépendances, pas de mocks
- **Couverture des 4 locales** : fr, en, es, ar

---

## `extract-ip.test.ts` — Extraction d'IP

**Cible** : `extractIp(headers)` → `string | null`

| # | Test | Headers | Expected |
| :-- | :-- | :-- | :-- |
| 1 | `returns first IP from x-forwarded-for` | `x-forwarded-for: 1.2.3.4, 5.6.7.8` | `'1.2.3.4'` |
| 2 | `returns single x-forwarded-for value` | `x-forwarded-for: 10.0.0.1` | `'10.0.0.1'` |
| 3 | `falls back to x-real-ip` | `x-real-ip: 192.168.0.1` | `'192.168.0.1'` |
| 4 | `prefers x-forwarded-for over x-real-ip` | Les deux headers | `'1.1.1.1'` (forwarded-for) |
| 5 | `returns null when no IP headers` | `Headers()` vide | `null` |
| 6 | `trims whitespace from forwarded IP` | `x-forwarded-for: '  3.3.3.3 , 4.4.4.4'` | `'3.3.3.3'` |
| 7 | `handles IPv6 loopback address` | `x-forwarded-for: ::1` | `'::1'` |
| 8 | `handles full IPv6 address` | `x-forwarded-for: 2001:db8::1, ::1` | `'2001:db8::1'` |

### Stratégie — extract-ip

- **Fonction pure** : `Headers` natif Web API, pas de mock
- **Sécurité** : vérifie que le premier IP est pris (proxy chain)
- **IPv6** : vérifie les adresses IPv6 (loopback `::1` et full `2001:db8::1`)

---

## `upload.test.ts` — Upload & Fichiers

**Cibles** : `processUpload()` (`src/media/upload.ts`), `deleteUpload()` (`src/media/delete.ts`), constantes (`src/media/types.ts`)

### `processUpload` (5 tests)

| # | Test | Ce qu'il vérifie | Expected |
| :-- | :-- | :-- | :-- |
| 1 | `accepts a valid image upload` | Upload JPEG valide accepté | `url` contient `/uploads/`, `filename` existe |
| 2 | `rejects invalid MIME type` | MIME `text/html` rejeté | Throw `UploadError` |
| 3 | `rejects file exceeding max size` | Fichier > 2MB rejeté | Throw `UploadError` |
| 4 | `respects custom maxSize option` | `maxSize: 500` respecté | Throw pour fichier de 1000 bytes |
| 5 | `generates UUID filename (not original name)` | Le nom original n'est pas utilisé | `filename ≠ 'malicious.jpg'`, format UUID |

### `Media constants` (3 tests)

| # | Test | Ce qu'il vérifie |
| :-- | :-- | :-- |
| 6 | `ALLOWED_MIME_TYPES contains only image types` | Tous les MIME commencent par `image/` |
| 7 | `DEFAULT_MAX_SIZE is 2MB` | `DEFAULT_MAX_SIZE === 2 * 1024 * 1024` |
| 8 | `UPLOAD_DIRS maps avatar and logo` | Clés `avatar` et `logo` présentes |

### `deleteUpload` (2 tests)

| # | Test | Ce qu'il vérifie |
| :-- | :-- | :-- |
| 9 | `rejects URLs not starting with /uploads/` | Throw pour `/etc/passwd` |
| 10 | `strips path traversal from URL` | `../` nettoyé avant suppression |

### Stratégie — upload

- **Filesystem** : les tests utilisent un répertoire temp (`os.tmpdir()`) nettoyé en `afterAll`
- **Sécurité** : vérifie path traversal, MIME spoofing, nom de fichier UUID

---

## `mask-utils.test.ts` — Masquage de secrets

**Cibles** : `maskUrl()`, `dbNameFromUrl()` (`src/database/env.ts`), `maskApiKey()` (`src/smtp/env.ts`)

### `maskUrl` (3 tests)

| # | Test | Input | Expected |
| :-- | :-- | :-- | :-- |
| 1 | `masks credentials in a PostgreSQL URL` | `postgresql://user:pass@host/db` | `postgresql://***:***@host/db` |
| 2 | `masks complex passwords with special chars` | Password avec `@`, `#`, etc. | Credentials masqués |
| 3 | `handles URL without credentials` | `postgresql://host/db` | Retourné tel quel |

### `dbNameFromUrl` (3 tests)

| # | Test | Input | Expected |
| :-- | :-- | :-- | :-- |
| 4 | `extracts database name from a standard URL` | `postgresql://…/mydb` | `'mydb'` |
| 5 | `extracts from URL with query params` | `…/mydb?sslmode=require` | `'mydb'` |
| 6 | `returns fallback for invalid URL` | `'not-a-url'` | Valeur fallback |

### `maskApiKey` (4 tests)

| # | Test | Input | Expected |
| :-- | :-- | :-- | :-- |
| 7 | `masks a long API key` | `'abcd1234efgh5678ijkl'` | `'abcd…ijkl'` |
| 8 | `masks a short key completely` | `'abc'` | `'***'` |
| 9 | `handles exactly 8 chars` | `'12345678'` | Totalement masqué |
| 10 | `handles 9 chars (shows partial)` | `'123456789'` | `'1234…6789'` |

---

## `i18n-urls.test.ts` — URLs & Slugs i18n

**Cibles** : `getAuthUrl()`, `resolveAuthSlug()`, `getPageUrl()`, `resolvePageSlug()`, `getAuthTranslations()`, `getCommonTranslations()`

### `getAuthUrl` (4 tests paramétrisés — ×4 locales)

Vérifie que chaque `AuthPageId` génère la bonne URL traduite pour `fr`, `en`, `es`, `ar`.

### `resolveAuthSlug` (5 tests — 4 paramétrisés + 1)

| # | Test | Ce qu'il vérifie |
| :-- | :-- | :-- |
| 1-4 | `resolves all auth slugs back to pageId for locale %s` | Round-trip : `getAuthUrl()` → `resolveAuthSlug()` identité |
| 5 | `returns null for an unknown slug` | Slug inconnu → `null` |

### `getPageUrl` (2 tests paramétrisés — ×2 locales)

Vérifie les URLs des pages publiques (about, contact, legal) pour `fr` et `en`.

### `resolvePageSlug` (3 tests — 2 paramétrisés + 1)

Round-trip et cas `null` pour slug inconnu.

### `Translation loaders` (8 tests paramétrisés)

| # | Test | Ce qu'il vérifie |
| :-- | :-- | :-- |
| 1-4 | `getAuthTranslations(%s) returns valid routes object` | Les traductions auth existent pour chaque locale |
| 5-8 | `getCommonTranslations(%s) returns valid nav and pageRoutes` | Les traductions communes ont `nav` et `pageRoutes` |

### Stratégie — i18n-urls

- **Paramétrisé** : `it.each` sur les 4 locales → 22 tests effectifs pour 8 définitions logiques
- **Round-trip** : génère URL → résout slug → vérifie identité (empêche les 404 silencieux)

---

## `i18n-translations.test.ts` — Loaders de traductions (home, legal, about, contact)

**Cibles** : `getHomeTranslations()`, `getLegalTranslations()`, `getAboutTranslations()`, `getContactTranslations()` ×4 locales

| # | Describe | Test (×4 locales via `it.each`) | Clés validées | Status |
| :-- | :-- | :-- | :-- | :-- |
| 1-4 | `getHomeTranslations` | `loads %s translations with required keys` | `meta`, `hero`, `sections` | ✅ |
| 5-8 | `getLegalTranslations` | `loads %s translations with required keys` | `meta`, `title`, `sections` | ✅ |
| 9-12 | `getAboutTranslations` | `loads %s translations with required keys` | `meta`, `hero` | ✅ |
| 13-16 | `getContactTranslations` | `loads %s translations with required keys` | `meta`, `hero`, `form` | ✅ |

### Stratégie — i18n-translations

- **`it.each(['fr', 'en', 'es', 'ar'])`** : chaque loader testé contre les 4 locales → 16 tests
- **Clés structurelles** : valide que chaque fichier de traduction contient les clés indispensables
- **Protection contre les locales manquantes** : si un fichier est supprimé, le test échoue immédiatement

---

## `send-email.test.ts` — Routage des emails (mock)

**Cible** : `sendEmail(payload)` (`src/smtp/send.ts`) — teste le routage sans envoyer de vrais emails

| # | Test | Provider mocké | Ce qu'il vérifie | Status |
| :-- | :-- | :-- | :-- | :-- |
| 1 | `routes to BREVO provider` | `getSmtpProvider → 'BREVO'` | `brevo.send()` appelé, pas les autres | ✅ |
| 2 | `routes to RESEND provider` | `getSmtpProvider → 'RESEND'` | `resend.send()` appelé | ✅ |
| 3 | `routes to NODEMAILER provider` | `getSmtpProvider → 'NODEMAILER'` | `nodemailer.send()` appelé | ✅ |
| 4 | `does not call other providers` | `getSmtpProvider → 'BREVO'` | `resend.send()` et `nodemailer.send()` non appelés | ✅ |
| 5 | `passes correct from config` | N'importe quel provider | `getSmtpFrom()` est bien transmis en second argument | ✅ |

### Stratégie — send-email

- **`vi.mock('@smtp/env')`** : mock `getSmtpProvider()` et `getSmtpFrom()` pour contrôler le routage
- **`vi.mock('@smtp/providers/*')`** : mock les 3 providers pour vérifier les appels sans réseau
- **Aucun email envoyé** : zéro requête SMTP, zéro coût

---

## `schema-validation.test.ts` — Exports de schéma DB

**Cible** : `src/database/schemas.ts` — vérifie que toutes les tables sont exportées avec les bonnes colonnes

### Table exports (8 tests via `it.each`)

| # | Table testée |
| :-- | :-- |
| 1-8 | `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `auditLog` |

### Colonnes critiques (4 tests)

| # | Table | Colonnes vérifiées |
| :-- | :-- | :-- |
| 9 | `user` | `id`, `email`, `name`, `emailVerified`, `role`, `banned` |
| 10 | `session` | `id`, `userId`, `token`, `expiresAt` |
| 11 | `auditLog` | `id`, `action`, `resource`, `userId` |
| 12 | `organization` | `id`, `name`, `slug` |

### Stratégie — schema-validation

- **Cast `as unknown as Record<string, unknown>`** : nécessaire car les types PgTable de Drizzle n'ont pas d'index signature
- **Détection de drift** : si une colonne est renommée ou supprimée, le test échoue

---

## `cli-utils.test.ts` — Utilitaires CLI (formatPgError + ANSI)

**Cible** : `formatPgError(err)` et `c` (ANSI color helpers) depuis `src/database/commands/_utils.ts`

### `formatPgError` (10 tests)

| # | Test | Code PG / Erreur | Message attendu |
| :-- | :-- | :-- | :-- |
| 1 | `28P01 authentication failure` | `{ code: '28P01' }` | Contient "Authentification" |
| 2 | `3D000 database not found` | `{ code: '3D000' }` | Contient "base de données" |
| 3 | `28000 authorization refused` | `{ code: '28000' }` | Contient "Autorisation" |
| 4 | `ECONNREFUSED` | `{ code: 'ECONNREFUSED' }` | Contient "Connexion refusée" |
| 5 | `ENOTFOUND` | `{ code: 'ENOTFOUND' }` | Contient "introuvable" |
| 6 | `ETIMEDOUT` | `{ code: 'ETIMEDOUT' }` | Contient "Timeout" |
| 7 | `ECONNRESET` | `{ code: 'ECONNRESET' }` | Contient "réinitialisée" |
| 8 | `57P03 server starting` | `{ code: '57P03' }` | Contient "démarrage" |
| 9 | `fallback to message` | `{ message: 'Custom error' }` | Contient "Custom error" |
| 10 | `fallback to string coercion` | `'some string error'` | Contient "some string error" |

### ANSI color helpers (2 tests)

| # | Test | Ce qu'il vérifie |
| :-- | :-- | :-- |
| 11 | `c.green wraps text with ANSI green codes` | `c.green('ok')` contient `\x1b[32m` et `\x1b[0m` |
| 12 | `c.red wraps text with ANSI red codes` | `c.red('err')` contient `\x1b[31m` et `\x1b[0m` |

### Stratégie — cli-utils

- **Erreurs PostgreSQL réelles** : simule les objets d'erreur avec les vrais codes PG
- **Couverture exhaustive** : 8 codes d'erreur connus + 2 fallbacks (message, string)

---

## Résumé couverture unitaire

```text
Fonctions pures testées :     28 / ~30 fonctions pures du projet = 93 %
Fonctions side-effect :       1 testée en unit (sendEmail mock) + reste couvert en intégration
Total tests unitaires :       108
Fichiers de test :            10
Temps d'exécution :           ~400 ms (les 10 fichiers)
```
