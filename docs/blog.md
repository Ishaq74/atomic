# Blog CMS module

Blog is Atomic's first complete editorial module. It is a first-class module built on the shared CMS/Admin foundation and is also the reference implementation for future modules such as Services, Courses, Formations and Shop.

## Canonical module boundary

```text
src/modules/blog/
├── admin/          # Admin Resource + admin loaders
├── actions/        # Domain action exports
├── components/
│   ├── cards/      # PostCard / grids / presentation variants
│   ├── lists/      # Listing/search projections
│   ├── single/     # Full article presentation
│   └── ui/         # Blog-specific metadata/presentation primitives
├── domain/         # Domain types and status semantics
├── i18n/           # FR/EN/ES/AR module translations
├── loaders/        # Public/admin read contracts
├── permissions/    # Tenant/RBAC boundaries
├── schema/         # Blog schema boundary
├── search/         # Search resource definition
├── seo/            # SEO projections/helpers
├── utils/          # URLs and pure helpers
├── validation/     # Runtime input contracts
├── capabilities.ts
├── module.ts
└── index.ts
```

Existing `src/lib/blog`, `src/actions/blog`, `src/components/blog` and database files remain compatibility/infrastructure entry points where Atomic already owns the implementation. They are not parallel Blog systems.

## Shared CMS contracts

Blog consumes the canonical Atomic capabilities:

```text
content
localization
media
seo
taxonomy
attributes
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

The module registry is explicit and deterministic. Blog does not instantiate a private workflow, search engine, Media system, notification engine or content table.

## Presentation grammar

Every first-class Atomic module follows the same presentation grammar:

```text
components/<module>/
├── cards/
├── lists/
├── single/
└── ui/
```

Blog implementations include card/list/single projections and variants such as compact, featured, dense and search-oriented presentations. Variants affect presentation only and use Atomic design-system primitives/tokens.

## Data model

Blog stores localized content one row per `post × locale` and keeps typed domain fields in the canonical schema. Core areas include:

```text
posts / translations
categories / category translations / post-category links
tags / tag translations / post-tag links
comments / comment moderation
reviews / helpful votes
reactions / favorites
reports
galleries / gallery-media links
SEO
view statistics
notifications
internal editorial links
revisions
locks
```

Localization is relational and typed. Core translation data is not represented as arbitrary JSONB maps.

## Tenant model

`organizationId = NULL` represents the global Blog. A non-null `organizationId` represents an organization Blog.

Every mutation resolves tenant context first and validates all referenced resources against that tenant before mutation:

```text
post
category
 tag
media
internal-link target
```

URL scope alone is never treated as authorization.

## Lifecycle

Blog publication is explicit and domain-controlled. Ordinary update operations cannot silently change publication state.

The lifecycle is:

```text
DRAFT
 ├─ publish  → PUBLISHED
 ├─ archive  → ARCHIVED
 └─ delete   → DELETED

PUBLISHED
 ├─ unpublish → DRAFT
 ├─ archive   → ARCHIVED
 └─ delete    → DELETED

ARCHIVED
 ├─ restore → DRAFT
 └─ delete  → DELETED

DELETED
 └─ restore → DRAFT
```

Lifecycle actions perform validation, authorization, tenant checks, transactionality, audit and cache invalidation as applicable.

## Revisions and locking

Revisions are append-only. Restoring a revision modifies current state and creates a new revision; historical revision rows are never overwritten.

Locks are expiring, session-aware leases. A competing editor receives a conflict rather than silently overwriting another editor's work.

## Admin Resource

Blog uses the shared Admin Resource contract for:

```text
list
search
filters
sort
pagination
stats
create
update
duplicate
publish
unpublish
archive
restore
delete
bulk-capable extension points
```

The admin list is tenant-scoped and supports status, category, tag, author, featured, sticky and locale filtering plus deterministic sorting. Aggregate statistics are computed from the tenant dataset, not from the current page.

The global and organization admin use the same resource contract and UI patterns; only the tenant context changes.

## Editor

The Blog editor uses the shared `ContentEditor` and `MediaPicker`.

The editing workflow supports:

- localized title/content/excerpt/SEO;
- automatic slug generation until the slug is manually overridden;
- explicit lifecycle actions;
- media selection and replacement;
- galleries;
- searchable internal links;
- dead-link reporting;
- revision inspection/restoration;
- expiring edit locks;
- unsaved-change protection.

Content is sanitized before persistence and rendered with defense-in-depth sanitization.

## Search

Blog registers a typed Search resource. Public Blog search continues to use the shared PostgreSQL full-text architecture (`tsvector`/GIN/`ts_rank`) rather than `%query%` scans.

Public and admin loaders remain distinct contracts. Admin data is not obtained by mutating a public query into an administrative query.

## Taxonomy

Categories remain relational and hierarchical. A shared taxonomy invariant rejects cycles, including indirect cycles:

```text
A → B → C → A
```

Tags remain separately typed. A polymorphic `entityType/entityId` taxonomy relation is intentionally not used.

## Engagement and moderation

The module supports comments, reviews, helpful votes, reactions, favorites and reports with explicit ownership checks.

Reactions are unique per `(postId, userId)`: changing reaction type replaces the active reaction rather than creating multiple simultaneous reaction types.

Moderation remains integrated into the shared admin resource surface rather than creating a parallel Blog moderation application.

## Notifications and audit

Blog notifications use semantic target relationships. Audit events use the shared Atomic audit boundary so Blog mutations follow the same audit model as other platform modules.

## Public routing

Global Blog:

```text
/{lang}/blog
/{lang}/blog/{categorySlug}
/{lang}/blog/tags/{tagSlug}
/{lang}/blog/{authorRoute}/{username}
/{lang}/blog/{categorySlug}/{postSlug}
```

Organization Blog uses the equivalent `/organizations/{slug}/blog/...` scope.

Canonical URLs use localized slugs. Public loaders expose published content only and remain locale- and tenant-scoped.

## Localization and RTL

The module supports:

```text
fr
 en
es
ar
```

Module UI strings, statuses, validation feedback and admin interaction messages are localized. Arabic uses the shared RTL platform primitives.

## Security invariants

The Blog preserves:

```text
RBAC
tenant isolation
rate limiting
HTML sanitization
resource ownership checks
transactional mutations
explicit lifecycle transitions
append-only revisions
expiring locks
cross-tenant media protection
```

## Tests

The module includes unit, integration and E2E coverage for the domain contracts and public/admin workflows. The intended final validation surface includes:

```text
lifecycle transitions
taxonomy cycle prevention
tenant isolation
reaction replacement
notification target semantics
revision restore
locking
admin filters/pagination/actions
slug behavior
locale switching
internal-link selection
public visibility
organization Blog
FR / EN / ES / AR
RTL
accessibility
```

## Architecture rule for future modules

Blog is not the template to copy mechanically. It is the reference consumer of the shared CMS/Admin contracts.

A future module such as Services should introduce its own domain semantics while reusing:

```text
Admin Resource
Content
Media
Localization
SEO
Search
Taxonomy
Workflow
Revision
Lock
Moderation
Notifications
Audit
Cache
```

A future transactional module may add booking, enrollment, payments, inventory or orders, but those concerns remain outside the editorial CMS core.
