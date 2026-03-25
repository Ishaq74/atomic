# CMS Admin — Architecture & Référence

> Voir aussi : [database/create-schemas](../database/create-schemas.md) · [design/theming](../design/theming.md) · [testing/e2e](../testing/e2e.md)

---

## Vue d'ensemble

Le CMS admin permet la gestion du contenu du site (identité, navigation, pages, thèmes) via une interface d'administration protégée par rôle `admin`.

| Composant | Fichiers | Rôle |
| :-- | :-- | :-- |
| Routes | 9 pages dans `src/pages/[lang]/admin/` | Routage i18n avec garde admin |
| Composants | 9 dans `src/components/pages/admin/` | UI des pages admin |
| Actions | 25 dans `src/actions/admin/` (9 fichiers) | CRUD server-side via Astro Actions |
| Loaders | 3 dans `src/database/loaders/` | Lecture DB pour SSR |
| Schémas | 3 dans `src/database/schemas/` (9 tables) | Modèle de données |
| Seeds | 7 fichiers dans `src/database/data/` | Données initiales CMS |
| i18n | Clés `admin.*` dans `src/i18n/{locale}/auth.ts` | Traductions 4 locales |

---

## Routes admin

Toutes les routes admin sont sous `src/pages/[lang]/admin/` et protégées par `assertAdmin()`.

| Route | Composant | Description |
| :-- | :-- | :-- |
| `/admin/` | — | Index admin (redirection) |
| `/admin/stats` | `AdminStatsPage` | Tableau de bord statistiques |
| `/admin/users` | `AdminUsersPage` | Gestion des utilisateurs |
| `/admin/organizations` | `AdminOrgsPage` | Gestion des organisations |
| `/admin/audit` | `AdminAuditPage` | Journal d'audit |
| `/admin/site` | `AdminSitePage` | Paramètres du site (identité, contact, horaires, réseaux sociaux) |
| `/admin/navigation` | `AdminNavigationPage` | Menus de navigation (header, footer) |
| `/admin/pages` | `AdminPagesPage` | Pages CMS (création, édition, publication) |
| `/admin/theme` | `AdminThemePage` | Thèmes design (couleurs, fonts, CSS custom) |

### Garde d'accès

```typescript
// src/lib/auth-guards.ts
requireAdmin()  // → vérifie role === 'admin', sinon redirect vers dashboard
```

Chaque route admin appelle `requireAdmin()` dans le frontmatter Astro. Les utilisateurs non connectés sont redirigés vers `/auth/sign-in`, les non-admin vers `/auth/dashboard`.

> Note : dans les **Actions** (server-side), le helper est `assertAdmin()` (`src/actions/admin/_helpers.ts`), qui throw au lieu de redirect.

---

## Modèle de données

### Schéma `site.schema.ts` (5 tables)

| Table | Clé | Description |
| :-- | :-- | :-- |
| `siteSettings` | `locale` (PK) | Identité du site par locale — nom, description, logo, favicon, OG image, SEO |
| `socialLinks` | `id` (UUID) | Liens réseaux sociaux — plateforme, URL, icône, ordre |
| `contactInfo` | `id` (singleton) | Coordonnées — email, téléphone, adresse, maps URL |
| `openingHours` | `dayOfWeek` (PK) | Horaires d'ouverture — matin/après-midi, pause déjeuner, jour fermé |
| `themeSettings` | `id` (UUID) | Thèmes design — 7 tokens couleur, fonts, border-radius, CSS custom |

### Schéma `navigation.schema.ts` (2 tables)

| Table | Clé | Description |
| :-- | :-- | :-- |
| `navigationMenus` | `id` (UUID) | Conteneurs de menu — `header`, `footer_primary`, `footer_secondary`, `footer_legal` |
| `navigationItems` | `id` (UUID) | Items hiérarchiques — locale, label, URL, icône, parent, ordre |

### Schéma `page.schema.ts` (2 tables)

| Table | Clé | Description |
| :-- | :-- | :-- |
| `pages` | `id` (UUID) | Pages CMS — locale, slug, titre, SEO, statut publication |
| `pageSections` | `id` (UUID) | Blocs de contenu typés (hero, text, image, gallery, cta, features, testimonials, faq, contact, map, video, custom) |

---

## Astro Actions

Toutes les actions sont dans `src/actions/admin/` et protégées par `assertAdmin()` + `adminRateLimit()`. Chaque mutation est auditée via `auditAdmin()`.

### Helpers (`_helpers.ts`)

| Fonction | Rôle |
| :-- | :-- |
| `assertAdmin(context)` | Vérifie le rôle admin dans le contexte de l'action |
| `adminRateLimit(context, userId, scope, opts?)` | Rate limit par utilisateur + scope (30 req / 60s) |
| `auditAdmin(context, userId, action, opts?)` | Log l'action dans `auditLog` |

### Actions par domaine

| Fichier | Actions | Table(s) cible |
| :-- | :-- | :-- |
| `site.ts` | `updateSiteSettings` | `siteSettings` |
| `contact.ts` | `updateContactInfo` | `contactInfo` |
| `hours.ts` | `updateOpeningHours` | `openingHours` |
| `social.ts` | `createSocialLink`, `updateSocialLink`, `deleteSocialLink`, `reorderSocialLinks` | `socialLinks` |
| `navigation.ts` | `createNavigationItem`, `updateNavigationItem`, `deleteNavigationItem`, `reorderNavigationItems` | `navigationItems` |
| `pages.ts` | `createPage`, `updatePage`, `deletePage`, `publishPage` | `pages` |
| `sections.ts` | `createSection`, `updateSection`, `deleteSection`, `reorderSections` | `pageSections` |
| `theme.ts` | `createTheme`, `updateTheme`, `deleteTheme` | `themeSettings` |

---

## Loaders (lecture DB)

| Fichier | Fonctions | Utilisé par |
| :-- | :-- | :-- |
| `site.loader.ts` | `getSiteSettings()`, `getSocialLinks()`, `getContactInfo()`, `getOpeningHours()`, `getActiveTheme()`, `getAllThemes()` | AdminSitePage, AdminThemePage, BaseLayout |
| `navigation.loader.ts` | `getMenu()` | AdminNavigationPage, Header |
| `page.loader.ts` | `getPage()`, `getPagesList()` | AdminPagesPage, routes CMS dynamiques |

---

## Composants admin

| Composant | Fichier | Onglets / Sections |
| :-- | :-- | :-- |
| `AdminSitePage` | `src/components/pages/admin/AdminSitePage.astro` | Identité, Contact, Horaires, Réseaux sociaux |
| `AdminNavigationPage` | `src/components/pages/admin/AdminNavigationPage.astro` | Menus (header, footer), items avec icônes, drag & drop |
| `AdminThemePage` | `src/components/pages/admin/AdminThemePage.astro` | Liste des thèmes, CRUD, 7 tokens couleur, preview |
| `AdminPagesPage` | `src/components/pages/admin/AdminPagesPage.astro` | Liste des pages, création, sections typées |
| `AdminStatsPage` | `src/components/pages/admin/AdminStatsPage.astro` | Statistiques (users, orgs, signups récents) |
| `AdminUsersPage` | `src/components/pages/admin/AdminUsersPage.astro` | Table users, recherche, ban, rôles |
| `AdminOrgsPage` | `src/components/pages/admin/AdminOrgsPage.astro` | Table organisations |
| `AdminAuditPage` | `src/components/pages/admin/AdminAuditPage.astro` | Journal d'audit (date, user, action, IP) |
| `AdminSectionsEditor` | `src/components/pages/admin/AdminSectionsEditor.astro` | Éditeur de sections de page |

### IconPicker

Le composant `AdminNavigationPage` utilise un sélecteur d'icônes basé sur l'API Iconify (`mdi:` prefix). Les icônes sont stockées dans la colonne `icon` de `navigationItems`.

### Upload d'images

`AdminSitePage` intègre l'upload d'images via `POST /api/upload` (type `site`) pour :

- Logo clair (`logoLight`)
- Logo sombre (`logoDark`)
- Favicon (`favicon`)
- Image OG (`ogImage`)

Les fichiers sont stockés dans `public/uploads/images/site/`.

---

## i18n

Les traductions CMS sont sous la clé `admin` dans `src/i18n/{locale}/auth.ts` (4 locales : `fr`, `en`, `es`, `ar`).

Sections traduites :

- `admin.tabs` — noms des onglets (stats, users, organizations, auditLog, site, navigation, pages, theme)
- `admin.stats` — labels du tableau de bord
- `admin.users` — colonnes, rôles, actions, confirmations
- `admin.organizations` — colonnes, actions
- `admin.auditLog` — colonnes du journal
- `admin.site` — labels des formulaires site, contact, horaires, réseaux sociaux
- `admin.navigation` — labels navigation, items, icônes
- `admin.theme` — labels thème, couleurs, fonts, actions CRUD

---

## Audit

Toutes les mutations admin sont tracées dans la table `auditLog` via `auditAdmin()`.

| Action | Déclencheur |
| :-- | :-- |
| `SITE_SETTINGS_UPDATE` | `updateSiteSettings` |
| `CONTACT_INFO_UPDATE` | `updateContactInfo` |
| `OPENING_HOURS_UPDATE` | `updateOpeningHours` |
| `SOCIAL_LINK_CREATE` / `SOCIAL_LINK_UPDATE` / `SOCIAL_LINK_DELETE` | Actions `social.*` |
| `NAVIGATION_ITEM_CREATE` / `NAVIGATION_ITEM_UPDATE` / `NAVIGATION_ITEM_DELETE` | Actions `navigation.*` |
| `PAGE_CREATE` / `PAGE_UPDATE` / `PAGE_DELETE` / `PAGE_PUBLISH` | Actions `pages.*` |
| `PAGE_SECTION_CREATE` / `PAGE_SECTION_UPDATE` / `PAGE_SECTION_DELETE` | Actions `sections.*` |
| `THEME_CREATE` / `THEME_UPDATE` / `THEME_DELETE` | Actions `theme.*` |

---

## Tests

| Type | Fichier | Tests | Couverture |
| :-- | :-- | --: | :-- |
| Unit | `tests/unit/cms-schemas.test.ts` | 80 | Exports tables, colonnes critiques |
| Unit | `tests/unit/cms-seeds.test.ts` | 11 | Données seed valides, types, contraintes |
| Unit | `tests/unit/cms-i18n.test.ts` | 16 | Clés i18n × 4 locales |
| Unit | `tests/unit/cms-audit.test.ts` | 1 | AuditAction type couvre 19 actions CMS |
| E2E | `tests/e2e/cms-admin.spec.ts` | 8 | Garde accès + chargement pages admin |
| A11y | `.pa11yci.cjs` + `lighthouserc.cjs` | 12 URLs | WCAG AAA + Lighthouse ≥ 0.9 |

> Les Astro Actions ne sont pas testées directement (pas de harness standard). La couverture E2E est structurelle (page loads + form visible).
