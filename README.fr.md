# Atomic

[EN](./README.md) | [**FR**](./README.fr.md) | [AR](./README.ar.md) | [ES](./README.es.md)

Application web SSR full-stack — authentification, organisations, CMS, médias, SMTP et i18n sur 4 locales.

_Ce README est généré automatiquement pour fournir un contexte complet à l'IA._

## Sommaire

- [Vue d'ensemble](#vue-densemble)
- [Démarrage](#démarrage)
- [Système de design](#système-de-design)
- [Base de données](#base-de-données)
- [Authentification](#authentification)
- [Contenu et CMS](#contenu-et-cms)
- [Médias](#médias)
- [Email et notifications](#email-et-notifications)
- [Internationalisation](#internationalisation)
- [CI/CD et qualité](#cicd-et-qualité)

## Vue d'ensemble

Application web SSR multi-langue avec authentification complète, gestion d'organisations, CMS, médias et audit trail.

- ⚡ **Astro 6** (SSR, `@astrojs/node`) — Rendu côté serveur, Tailwind CSS 4, TypeScript
- 🔐 **better-auth** — Email/mot de passe, vérification email, organisations, rôles, impersonation admin
- 🗄️ **Drizzle ORM** + **PostgreSQL 16** — Migrations type-safe, loaders, recherche plein texte
- 🎨 **Starwind** — 47+ composants UI Astro accessibles
- 🌍 **i18n** — fr, en, es, ar (RTL) avec routes localisées
- 📋 **CMS** — Pages, sections JSON typées, navigation, scheduling, versioning, import/export
- 📁 **Médias** — Upload, traitement Sharp, organisation en dossiers
- 📧 **SMTP** — Brevo / Resend / Nodemailer + file morte de mails
- 🛡️ **Sécurité** — Audit trail, rate limiting, sanitization des inputs
- ✅ **Tests** — 741 Vitest + 34 scénarios E2E Playwright × 3 navigateurs

### Stack technique

| Technologie | Rôle |
|:--|:--|
| **Astro 6** (`@astrojs/node`) | Framework SSR |
| **better-auth** | Auth, organisations, sessions |
| **Drizzle ORM** + **PostgreSQL 16** | Base de données |
| **Tailwind CSS 4** + **Starwind** | Design system (47+ composants) |
| **Vitest** + **Playwright** | Tests unitaires, intégration & E2E |
| **GitHub Actions** | CI/CD |

## Démarrage

### Prérequis

- **Node.js** >= 22.12.0
- **pnpm** >= 10
- **PostgreSQL** >= 16

### Installation

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm dev
```

### Variables d'environnement

| Variable | Description |
|:---------|:------------|
| `DB_ENV` | Active DB environment (LOCAL | PROD | TEST) |
| `DATABASE_URL_LOCAL` | PostgreSQL connection URL — local environment |
| `DATABASE_URL_PROD` | PostgreSQL connection URL — production environment |
| `DATABASE_URL_TEST` | PostgreSQL connection URL — test suite |
| `BETTER_AUTH_SECRET` | Auth secret key (min. 32 random chars) |
| `BETTER_AUTH_URL` | Public URL of the application (used by better-auth) |
| `SITE_URL` | Canonical URL used by Astro / sitemap |
| `SMTP_PROVIDER` | Email provider: BREVO | RESEND | NODEMAILER |
| `SMTP_FROM_EMAIL` | Sender email address |
| `SMTP_FROM_NAME` | Sender display name |
| `SMTP_HOST` | SMTP server hostname (Nodemailer only) |
| `SMTP_PORT` | SMTP server port, e.g. 587 (Nodemailer only) |
| `SMTP_SECURE` | Enable TLS/SSL — true | false (Nodemailer only) |

### Alias TypeScript

- `@/*` → `src/*`
- `@styles/*` → `src/styles/*`
- `@layouts/*` → `src/layouts/*`
- `@components/*` → `src/components/*`
- `@atoms/*` → `src/components/atoms/*`
- `@molecules/*` → `src/components/molecules/*`
- `@organisms/*` → `src/components/organisms/*`
- `@wow/*` → `src/components/wow/*`
- `@assets/*` → `src/assets/*`
- `@starwind/*` → `src/lib/starwind/*`
- `@i18n/*` → `src/i18n/*`
- `@pages/*` → `src/components/pages/*`
- `@lib/*` → `src/lib/*`
- `@database/*` → `src/database/*`
- `@smtp/*` → `src/smtp/*`
- `@media/*` → `src/media/*`

## Système de design

### Fichiers

```
src/components/
atoms/
  accordion/
  alert/
  alert-dialog/
  aspect-ratio/
  avatar/
  badge/
  breadcrumb/
  button/
  button-group/
  card/
  carousel/
  checkbox/
  collapsible/
  container/
  dialog/
  dropdown/
  dropzone/
  icon-picker/
  image/
  input/
  input-group/
  input-otp/
  item/
  kbd/
  label/
  media-picker/
  native-select/
  pagination/
  popover/
  progress/
  prose/
  radio-group/
  select/
  separator/
  sheet/
  sidebar/
  skeleton/
  slider/
  spinner/
  switch/
  table/
  tabs/
  textarea/
  theme-toggle/
  toast/
  toggle/
  tooltip/
  video/
molecules/
  AdminPagination/
  DataView/
organisms/
  AdminSidebar/
  AuthLayout/
  AuthSidebar/
  Category/
  CookieConsent/
  Footer/
  Header/
  OrgSidebar/
  Testimonials/
pages/
  AboutPage/
  admin/
  auth/
  cms/
  CmsPage.astro
  ContactPage/
  HomePage/
  LegalPage.astro
  org/
wow/
  AsyncButton.astro
  FallingParticles.astro
  HorizontalScrollCarousel/
  HoverBlurCards.astro
  LogoCloud.astro
  MarqueeContent.astro
  MouseRepelParticles.astro
  RisingParticles.astro
  ScrollReveal.astro
src/styles/
global.css
src/assets/
images/
  avatars/
  brand/
```

### Composants

- **atoms/** — 48 components
- **molecules/** — 2 components
- **organisms/** — 9 components
- **pages/** — 9 components
- **wow/** — 9 components

### Styles et tokens

`global.css` — 86 CSS custom properties

```css
--animate-accordion-down: accordion-down 0.2s ease-out;
--animate-accordion-up: accordion-up 0.2s ease-out;
--color-background: var(--background);
--color-foreground: var(--foreground);
--color-card: var(--card);
--color-card-foreground: var(--card-foreground);
/* ... 80 more */
```

### Tests

- `tests/unit/sanitize.test.ts`
- `tests/unit/section-content-xss.test.ts`
- `tests/unit/section-schemas.test.ts`
- `tests/unit/sections-sanitize.test.ts`
- `tests/unit/seo.test.ts`
- `tests/unit/theme-tokens.test.ts`

## Base de données

### Fichiers

```
src/database/
cache.ts
commands/
  db.check.ts
  db.clean-media.ts
  db.cleanup-audit.ts
  db.compare.ts
  db.generate.ts
  db.infra.ts
  db.migrate.ts
  db.reset.ts
  db.seed-media.ts
  db.seed.ts
  db.sync.ts
  _utils.ts
data/
  03-site-settings.data.ts
  04-social-links.data.ts
  05-contact-info.data.ts
  06-opening-hours.data.ts
  07-navigation.data.ts
  07b-navigation-items.data.ts
  08-theme.data.ts
  09-legal-pages.data.ts
  09b-legal-sections.data.ts
  10-consent-settings.data.ts
  manifest.ts
drizzle.ts
env.ts
infra/
  00-functions.sql
  01-triggers.sql
  02-indexes.sql
  03-constraints.sql
loaders/
  consent.loader.ts
  media.loader.ts
  navigation.loader.ts
  page.loader.ts
  site.loader.ts
migrations/
  0000_plain_old_lace.sql
  meta/
    0000_snapshot.json
    _journal.json
schemas/
  audit-log.schema.ts
  auth.schema.ts
  consent.schema.ts
  media.schema.ts
  navigation.schema.ts
  page-version.schema.ts
  page.schema.ts
  site.schema.ts
schemas.ts
```

### Schémas et tables

**auth.schema.ts**
- `user`: `id`, `name`, `email`, `emailVerified`, `image`, `createdAt`, `updatedAt`, `username`, `displayUsername`, `role`, `banned`, `banReason`, `banExpires` _(sessions: many, accounts: many, members: many, invitations: many)_
- `session`: `id`, `expiresAt`, `token`, `createdAt`, `updatedAt`, `ipAddress`, `userAgent`, `userId`, `impersonatedBy`, `activeOrganizationId` _(user: one)_
- `account`: `id`, `accountId`, `providerId`, `userId`, `accessToken`, `refreshToken`, `idToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`, `password`, `createdAt`, `updatedAt` _(user: one)_
- `verification`: `id`, `identifier`, `value`, `expiresAt`, `createdAt`, `updatedAt`
- `organization`: `id`, `name`, `slug`, `logo`, `createdAt`, `updatedAt`, `metadata` _(organizationRoles: many, members: many, invitations: many)_
- `member`: `id`, `organizationId`, `userId`, `role`, `createdAt` _(organization: one, user: one)_
- `invitation`: `id`, `organizationId`, `email`, `role`, `status`, `expiresAt`, `createdAt`, `inviterId` _(organization: one, user: one)_
- `organization_role`: `id`, `organizationId`, `role`, `permission`, `createdAt`, `updatedAt` _(organization: one)_

**audit-log.schema.ts**
- `audit_log`: `id`, `userId`, `action`, `resource`, `resourceId`, `metadata`, `ipAddress`, `userAgent`, `createdAt` _(user: one)_

**site.schema.ts**
- `site_settings`: `id`, `locale`, `siteName`, `siteDescription`, `siteSlogan`, `metaTitle`, `metaDescription`, `logoLight`, `logoDark`, `favicon`, `ogImage`, `headerCtaText`, `headerCtaUrl`, `headerSecondaryText`, `headerSecondaryUrl`, `headerSticky`, `footerCopyrightText`, `footerCopyrightUrl`, `footerSocialHeading`, `footerNavPrimaryHeading`, `footerNavSecondaryHeading`, `footerLegalHeading`, `createdAt`, `updatedAt`
- `social_links`: `id`, `platform`, `url`, `icon`, `label`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`
- `contact_info`: `id`, `email`, `phone`, `address`, `city`, `postalCode`, `country`, `mapUrl`, `latitude`, `longitude`, `createdAt`, `updatedAt`
- `opening_hours`: `id`, `dayOfWeek`, `openTime`, `closeTime`, `hasMiddayBreak`, `morningOpen`, `morningClose`, `afternoonOpen`, `afternoonClose`, `isClosed`, `createdAt`, `updatedAt`
- `theme_settings`: `id`, `name`, `isActive`, `lightTokens`, `darkTokens`, `primaryColor`, `secondaryColor`, `accentColor`, `backgroundColor`, `foregroundColor`, `mutedColor`, `mutedForegroundColor`, `fontHeading`, `fontBody`, `borderRadius`, `createdAt`, `updatedAt`

**navigation.schema.ts**
- `navigation_menus`: `id`, `name`, `description`, `isVisible`, `displayLabel`, `showHeading`, `createdAt`, `updatedAt`
- `navigation_items`: `id`, `menuId`, `parentId`, `locale`, `label`, `url`, `icon`, `showIcon`, `sortOrder`, `isActive`, `openInNewTab`, `createdAt`, `updatedAt`

**page.schema.ts**
- `pages`: `id`, `locale`, `slug`, `title`, `metaTitle`, `metaDescription`, `ogImage`, `canonical`, `robots`, `template`, `isPublished`, `publishedAt`, `scheduledAt`, `scheduledUnpublishAt`, `sortOrder`, `deletedAt`, `updatedBy`, `lockedBy`, `lockedAt`, `createdAt`, `updatedAt` _(sections: many)_
- `page_sections`: `id`, `pageId`, `type`, `content`, `sortOrder`, `isVisible`, `createdAt`, `updatedAt`, `updatedBy` _(page: one)_

**page-version.schema.ts**
- `page_versions`: `id`, `pageId`, `versionNumber`, `snapshot`, `createdBy`, `note`, `createdAt` _(page: one, author: one)_

**media.schema.ts**
- `media_folders`: `id`, `name`, `parentId`, `sortOrder`, `createdAt`, `updatedAt` _(parent: one, children: many, files: many)_
- `media_files`: `id`, `folderId`, `filename`, `url`, `mimeType`, `size`, `width`, `height`, `createdAt`, `updatedAt` _(folder: one, alts: many)_
- `media_file_alts`: `id`, `fileId`, `locale`, `alt`, `title` _(file: one)_

**consent.schema.ts**
- `consent_settings`: `id`, `locale`, `title`, `description`, `acceptAll`, `rejectAll`, `customize`, `savePreferences`, `necessaryLabel`, `necessaryDescription`, `analyticsLabel`, `analyticsDescription`, `marketingLabel`, `marketingDescription`, `privacyPolicyLabel`, `privacyPolicyUrl`, `isActive`, `createdAt`, `updatedAt`

### Migrations

- `0000_plain_old_lace.sql`

### Commandes

| Command |
|---------|
| `pnpm db:check` |
| `pnpm db:compare` |
| `pnpm db:generate` |
| `pnpm db:infra` |
| `pnpm db:migrate` |
| `pnpm db:reset` |
| `pnpm db:seed` |
| `pnpm db:seed-media` |
| `pnpm db:sync` |
| `pnpm db:cleanup-audit` |

### Tests

- `tests/integration/db-health.test.ts`
- `tests/unit/cache.test.ts`
- `tests/unit/cli-utils.test.ts`
- `tests/unit/cms-schemas.test.ts`
- `tests/unit/cms-seeds.test.ts`
- `tests/unit/db-env.test.ts`
- `tests/unit/loaders.test.ts`
- `tests/unit/navigation-loader.test.ts`
- `tests/unit/schema-validation.test.ts`
- `tests/unit/search-fts.test.ts`
- `tests/unit/site-loader.test.ts`

## Authentification

### Fichiers

```
src/lib/ (auth)
  audit.ts
  auth-client.ts
  auth-data.ts
  auth-guards.ts
  auth.ts
  permissions.ts
  rate-limit.ts
  sanitize.ts
src/actions/
  admin/
  index.ts
  org/
src/middleware.ts
```

### Flux d'authentification

- Inscription (username + email + mot de passe)
- Connexion par email
- Vérification d'email
- Réinitialisation de mot de passe
- Suppression de compte (RGPD)
- Impersonation admin

### Rôles et organisations

- **user** — accès standard
- **admin** — accès complet + impersonation
- Organisations : création, invitations, membres, rôles personnalisés

### Sécurité et audit

- Audit trail automatique sur toutes les actions sensibles
- Rate limiting in-memory
- Sanitization des inputs
- Guards sur les routes protégées
- `middleware.ts` injecte la session auth sur chaque requête

### Tests

- `tests/e2e/auth.spec.ts`
- `tests/integration/audit.test.ts`
- `tests/integration/auth-advanced.test.ts`
- `tests/integration/auth-flow.test.ts`
- `tests/integration/auth-org.test.ts`
- `tests/integration/auth.test.ts`
- `tests/integration/middleware.test.ts`
- `tests/unit/audit-fallback.test.ts`
- `tests/unit/auth-guards.test.ts`
- `tests/unit/cms-audit.test.ts`
- `tests/unit/extract-ip.test.ts`
- `tests/unit/mask-utils.test.ts`
- `tests/unit/middleware-timeout.test.ts`
- `tests/unit/permissions.test.ts`
- `tests/unit/production-hardening.test.ts`
- `tests/unit/rate-limit.test.ts`

## Contenu et CMS

### Fichiers

```
src/pages/
404.astro
500.astro
api/
  audit-export.ts
  auth/
    [...all].ts
  contact.ts
  content-export.ts
  content-import.ts
  cron/
    publish.ts
  export-data.ts
  health.ts
  media.ts
  preview.ts
  search.ts
  upload.ts
index.astro
robots.txt.ts
rss.xml.ts
sitemap-cms.xml.ts
[lang]/
  a-propos.astro
  admin/
    audit.astro
    index.astro
    media.astro
    navigation.astro
    organizations.astro
    pages.astro
    roles.astro
    site.astro
    stats.astro
    theme.astro
    users.astro
  auth/
    [slug].astro
  contact.astro
  index.astro
  organizations/
    [slug]/
  [slug].astro
src/layouts/
BaseLayout.astro
```

Le CMS gère les pages localisées avec des sections de contenu JSON typées, les menus de navigation, le versioning des pages et la publication planifiée. Le contenu peut être importé et exporté. Les routes sont préfixées par la locale (`/fr/`, `/en/`, `/es/`, `/ar/`).

### Tests

- `tests/e2e/cms-admin.spec.ts`
- `tests/integration/cms-admin.test.ts`
- `tests/integration/consent-cms.test.ts`
- `tests/integration/contact-api.test.ts`
- `tests/integration/legal-cms.test.ts`
- `tests/integration/navigation-cycle.test.ts`
- `tests/unit/admin-consent.test.ts`
- `tests/unit/admin-contact.test.ts`
- `tests/unit/admin-helpers.test.ts`
- `tests/unit/admin-hours.test.ts`
- `tests/unit/admin-menus.test.ts`
- `tests/unit/admin-navigation-items.test.ts`
- `tests/unit/admin-pages-theme.test.ts`
- `tests/unit/admin-pages.test.ts`
- `tests/unit/admin-roles.test.ts`
- `tests/unit/admin-sections.test.ts`
- `tests/unit/admin-site-social-contact-hours.test.ts`
- `tests/unit/admin-site.test.ts`
- `tests/unit/admin-social.test.ts`
- `tests/unit/admin-theme.test.ts`
- `tests/unit/admin-versions.test.ts`
- `tests/unit/contact-api.test.ts`
- `tests/unit/content-import-schema.test.ts`
- `tests/unit/content-locking.test.ts`
- `tests/unit/export-data.test.ts`
- `tests/unit/media-loader.test.ts`
- `tests/unit/navigation-menus.test.ts`
- `tests/unit/navigation-tree.test.ts`

## Médias

### Fichiers

```
src/media/
delete.ts
list.ts
types.ts
upload.ts
public/
favicon.ico
favicon.svg
uploads/
  images/
  media/
```

### Upload et traitement

- Upload sécurisé avec validation du type MIME et de la taille
- Traitement des images avec **sharp** (resize, optimisation)
- Stockage dans `public/uploads/`
- Suppression et liste des fichiers uploadés

### Commandes

| Command |
|---------|
| `pnpm db:seed-media` |

### Tests

- `tests/unit/admin-media.test.ts`
- `tests/unit/media-list.test.ts`
- `tests/unit/upload-api.test.ts`
- `tests/unit/upload.test.ts`

## Email et notifications

### Fichiers

```
src/smtp/
commands/
  logs.rotate.ts
  smtp.check.ts
  _utils.ts
env.ts
providers/
  brevo.ts
  nodemailer.ts
  resend.ts
send.ts
templates/
  contact-form.ts
  delete-account.ts
  i18n.ts
  layout.ts
  organization-invitation.ts
  reset-password.ts
  verify-email.ts
types.ts
logs/ ← email dead-letter queue (JSONL, one file per day)
```

### Fournisseurs

- **Brevo** (`SMTP_PROVIDER=BREVO`)
- **Resend** (`SMTP_PROVIDER=RESEND`)
- **Nodemailer** (`SMTP_PROVIDER=NODEMAILER`) — SMTP standard

Le provider est sélectionné via la variable d'environnement `SMTP_PROVIDER`.

### Modèles

Templates d'email i18n pour : vérification d'email, réinitialisation de mot de passe, invitations organisations.

### Commandes

| Command |
|---------|
| `pnpm smtp:check` |
| `pnpm logs:rotate` |

### Tests

- `tests/unit/contact-form-template.test.ts`
- `tests/unit/send-email.test.ts`
- `tests/unit/smtp-env.test.ts`
- `tests/unit/smtp-providers.test.ts`

## Internationalisation

### Fichiers

```
src/i18n/
ar/
  about.ts
  auth.ts
  common.ts
  contact.ts
  home.ts
config.ts
en/
  about.ts
  auth.ts
  common.ts
  contact.ts
  home.ts
es/
  about.ts
  auth.ts
  common.ts
  contact.ts
  home.ts
fr/
  about.ts
  auth.ts
  common.ts
  contact.ts
  home.ts
utils.ts
```

### Locales supportées

| Locale | Language | Direction |
|--------|----------|-----------|
| `fr` | Français (default) | LTR |
| `en` | English | LTR |
| `es` | Español | LTR |
| `ar` | العربية | RTL |

### Routage

Toutes les routes sont préfixées par la locale : `/fr/`, `/en/`, `/es/`, `/ar/`. La locale par défaut est `fr`.

### Tests

- `tests/unit/cms-i18n.test.ts`
- `tests/unit/i18n-key-completeness.test.ts`
- `tests/unit/i18n-translations.test.ts`
- `tests/unit/i18n-urls.test.ts`
- `tests/unit/i18n-utils.test.ts`

## CI/CD et qualité

### Fichiers

```
tests/
  a11y/
  e2e/
  helpers/
  integration/
  unit/
.github/
agents/
  AtomicFullStackEngineer.agent.md
  AtomicUIDesigner.agent.md
  DevOpsExpert.agent.md
dependabot.yml
prompts/
  plan-codeReview.prompt.md
workflows/
  ci.yml
  codeql.yml
```

### Pipeline CI/CD

Pipeline GitHub Actions sur chaque push/PR vers `main` :

1. **Lint & Type Check** — ESLint + `astro check` + `pnpm audit`
2. **Unit & Integration** — Vitest + coverage (PostgreSQL 16)
3. **E2E** — Playwright (Chromium + Firefox + WebKit)
4. **Accessibilité & Performance** — Pa11y + Lighthouse CI
5. **Build** — artefact de production sur `main`

### Accessibilité et performance

- **Pa11y** — conformité WCAG AAA
- **Lighthouse CI** — performance, accessibilité, bonnes pratiques, SEO

### Commandes

| Command |
|---------|
| `pnpm lint` |
| `pnpm lint:fix` |
| `pnpm check` |
| `pnpm test` |
| `pnpm test:watch` |
| `pnpm test:report` |
| `pnpm test:e2e` |
| `pnpm test:e2e:ui` |
| `pnpm test:e2e:report` |
| `pnpm a11y:setup` |
| `pnpm a11y:teardown` |
| `pnpm a11y:pa11y` |
| `pnpm a11y:lighthouse` |
| `pnpm a11y:lighthouse:authed` |
| `pnpm a11y:lighthouse:rename` |
| `pnpm a11y:lighthouse:report` |
| `pnpm a11y:lighthouse:report:contrast` |
| `pnpm a11y:report` |
| `pnpm a11y` |
| `pnpm a11y:pa11y-only` |
| `pnpm a11y:lighthouse-only` |
| `pnpm qa` |
| `pnpm qa:offline` |

