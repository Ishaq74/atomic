# Atomic CMS + Blog convergence

## Architecture

The Blog is an Atomic-native domain and the first complete CMS validation module. Its authoritative module boundary is `src/modules/blog/` and it consumes Atomic's shared CMS/Admin capabilities.

```text
src/modules/blog/
  admin/
  actions/
  components/
    cards/
    lists/
    single/
    ui/
  domain/
  i18n/
  loaders/
  permissions/
  schema/
  search/
  seo/
  utils/
  validation/
```

Legacy `src/lib/blog/*` paths are compatibility boundaries where still required; they are not a second domain implementation.

The module uses Astro SSR, Astro Actions, Drizzle, Zod, shared Media, the generic ContentEditor, tenant guards, RBAC, audit logging, loaders, cache and shared search infrastructure.

Concordia's contribution is limited to validated editorial and admin UX patterns. Its API and schema architecture are not part of Atomic.

## Module and presentation contracts

Blog declares the shared Atomic module contract, capability providers and search definition. Presentation follows the common module grammar:

```text
cards/
lists/
single/
ui/
```

Domain presentation components remain Blog-specific and are built on Atomic design-system primitives. Visual variants modify presentation rather than duplicating behavior or introducing a separate styling system.

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

Every meaningful editorial mutation creates a new revision. Restoring a revision never rewrites history: it applies the selected state and creates another revision recording the restoration.

## Locking

Editing locks are session-aware and expire. The admin editor refreshes active locks and releases them when the page is left. A concurrent editor receives an explicit conflict instead of silently taking ownership.

## Taxonomy

Categories are hierarchical and must remain acyclic. Category/tag references are tenant-scoped and cannot cross organizations. The hierarchy invariant is exposed through the shared CMS taxonomy boundary so future modules can reuse it.

## Administration

The unified Blog admin exposes Posts, Categories, Tags, Moderation and Statistics. Post management includes search, status/category/tag/author/featured/sticky/translation-locale filters, sorting and pagination. Statistics are tenant-wide aggregates, not values derived from the current pagination page.

Blog and organization Blog administration use the same resource contract and UI primitives. The organization route supplies an explicit organization tenant context; it does not fork the admin implementation.

## Localization

The editor supports `fr`, `en`, `es` and `ar`. Locale switching is protected against accidental loss of unsaved changes. Localized content, slugs and SEO remain domain data; the shared admin framework owns the locale-state interaction pattern. Arabic uses Atomic's shared RTL behavior.

## Content and links

The generic `ContentEditor` remains domain-agnostic and resolves Blog links through the registered Blog resolver. Admin link management uses searchable target selection instead of free-form prompt dialogs and rejects self-links.

## Media

Blog uses Atomic's shared MediaPicker and `mediaFiles`. There is no Blog-specific media table or upload engine.

## Security and tenancy

Every mutation resolves a Blog tenant and validates referenced posts, categories, tags and media within the same tenant. Public loaders expose only canonical published content. Global and organization routes use the same domain invariants with different tenant contexts.

## Shared CMS boundaries

Blog consumes the shared Atomic capabilities for:

```text
content
localization
media
seo
taxonomy
search
publication
revisions
locks
engagement
moderation
notifications
audit
cache
```

The Blog owns Blog-specific schema, loaders, Actions, validation and UI. It does not create parallel infrastructure for Media, Search, Workflow, Revision, Notification or Audit.

## Relationship to Services

`Services` is the second complete validation module. It follows the same module and Admin Resource contracts, including `cards/lists/single/ui`, while adding service-specific concerns such as price, duration, capacity, availability, provider presentation and configurable attributes. Blog and Services are therefore implementations of one CMS architecture rather than two competing CMS architectures.
