# Atomic CMS + Blog convergence

## Architecture

The Blog is an Atomic-native domain. It uses Astro SSR, Astro Actions, Drizzle, Zod, shared Media, the generic ContentEditor, tenant guards, RBAC, audit logging, loaders, cache and the shared search infrastructure.

Concordia's contribution is limited to validated editorial and admin UX patterns. Its API and schema architecture are not part of Atomic.

## Editorial lifecycle

A post uses the following state machine:

- `DRAFT -> PUBLISHED | ARCHIVED | DELETED`
- `PUBLISHED -> DRAFT | ARCHIVED | DELETED`
- `ARCHIVED -> DRAFT | DELETED`
- `DELETED -> DRAFT`

Ordinary post updates cannot change status or publication date. Lifecycle mutations are explicit Actions so authorization, transition validation, revisions, audit and cache invalidation cannot be bypassed.

## Duplication

`duplicateBlogPost` creates a new draft and copies editorial state only:

- translations
- categories
- tags
- localized SEO
- galleries and gallery media
- safe outgoing Blog links
- author and editorial flags

Runtime state is not copied: publication state, views, comments, reviews, reactions, favorites, locks, notifications, analytics and revision history are reset.

## Revisions

Every editorial lifecycle transition and content mutation creates a new revision. Restoring a revision never rewrites history: it applies the selected state and creates another revision recording the restoration.

## Locking

Editing locks are session-aware and expire. The admin editor refreshes active locks and releases them when the page is left.

## Taxonomy

Categories are hierarchical and must remain acyclic. Category/tag references are tenant-scoped and cannot cross organizations.

## Administration

The unified Blog admin exposes Posts, Categories, Tags, Moderation and Statistics. Post management includes search, status/category/tag/author/featured/sticky/translation-locale filters, sorting, pagination and explicit lifecycle actions.

Statistics are tenant-wide aggregates, not values derived from the current pagination page. Moderation badges use a dedicated global aggregate rather than a limited moderation queue.

## Localization

The editor supports the four Atomic locales (`fr`, `en`, `es`, `ar`). Locale switching is protected against accidental loss of unsaved changes. Post lists can filter by the translation locale being managed while the surrounding admin UI remains in the current interface locale.

## Content and links

The generic `ContentEditor` remains domain-agnostic and resolves Blog links through the registered Blog resolver. Admin link management uses searchable target selection instead of free-form prompt dialogs and rejects self-links.

## Media

Blog uses Atomic's shared MediaPicker and `mediaFiles`. There is no Blog-specific media table.

## Security and tenancy

Every mutation resolves a Blog tenant and validates referenced posts, categories, tags and media within the same tenant. Public loaders expose only canonical published content.
