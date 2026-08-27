# Services CMS — Architecture & Reference

`Services` is Atomic's second complete CMS module after Blog and the first proof that the shared module/Admin architecture works beyond editorial posts.

## Positioning

Services is a business-domain module, not a second CMS. It consumes Atomic's shared content, media, localization, SEO, taxonomy, search, publication, revisions, locks, engagement, moderation, notifications, audit and cache capabilities.

## Module structure

```text
src/modules/services/
├── admin/
├── actions/
├── components/
│   ├── cards/
│   ├── lists/
│   ├── single/
│   └── ui/
├── domain/
├── i18n/
├── loaders/
├── permissions/
├── schema/
├── search/
├── seo/
├── utils/
├── validation/
├── capabilities.ts
├── module.ts
└── workflow.ts
```

The module follows the common presentation grammar:

```text
cards/
lists/
single/
ui/
```

Variants affect presentation only. Shared visual primitives remain in Atomic's design system.

## Domain model

Services are represented by a typed `services` record and localized `service_translations` rows. The domain supports:

- canonical `user` provider identity;
- tenant ownership through `organizationId`;
- editorial status `DRAFT`, `PUBLISHED`, `ARCHIVED`, `DELETED`;
- localized titles, slugs and content;
- cover and gallery media through Atomic Media;
- price stored in minor units plus three-letter currency;
- positive duration and maximum participant capacity;
- mobile/on-site availability flag;
- featured flag;
- rating aggregates and view count;
- recurring availability slots;
- revisions and editorial locks;
- localized SEO;
- favorites, reactions, reviews, comments and reports;
- configurable service attributes.

Strongly structured business fields remain typed. Extensible attributes do not replace them.

## Localization

Each `service_translations` row is one `service × locale` representation. Current supported locales are:

```text
fr
en
es
ar
```

Localized slugs are unique inside the relevant tenant and locale. The admin locale workflow is shared with other CMS modules and must protect dirty changes.

## Tenancy and ownership

A Service is either global (`organizationId = NULL`) or owned by one organization.

Every mutation resolves the tenant before operating on resource ids. Referenced categories, tags and media must belong to the same tenant. Public loaders and internal-link resolution carry the tenant context.

Organization administration resolves the organization from the authenticated organization context rather than trusting a client-supplied membership identity.

## Lifecycle

Service publication is explicit and cannot be simulated through a generic update:

```text
DRAFT      -> PUBLISHED | ARCHIVED | DELETED
PUBLISHED  -> DRAFT | ARCHIVED | DELETED
ARCHIVED   -> DRAFT | DELETED
DELETED    -> DRAFT
```

`updateService` rejects direct `status` and `publishedAt` mutation. Lifecycle operations perform validation, authorization, tenant checks, audit and cache invalidation.

## Revisions

Editorial revisions are append-only snapshots. Creation and meaningful content mutations create revisions. Restoring a revision changes current state and creates a new revision recording the restoration. Historical revisions are never overwritten.

## Locks

Service editing locks are session-aware leases with expiration. A second editor cannot acquire an active lock. Expired locks can be reacquired. Admin UI exposes lock state and explicit acquire/release behavior.

## Taxonomy

Services has dedicated localized categories and tags:

```text
service_categories
service_category_translations
service_tags
service_tag_translations
service_category_links
service_tag_links
```

Categories are hierarchical and use Atomic's shared acyclicity invariant. Self-parenting and ancestor cycles are rejected before mutation. Category/tag ids are tenant checked before association.

## Media

Services uses Atomic's existing `mediaFiles` and `MediaPicker`. There is no `service_media_engine` and no second upload lifecycle.

The service module supports:

- cover selection;
- OG image selection;
- gallery media;
- alt text;
- caption;
- ordering;
- safe tenant ownership checks.

## Availability

`service_availability` stores recurring availability using:

```text
dayOfWeek
startTime
endTime
timezone
maxParticipants
```

Runtime validation and SQL constraints enforce valid weekday values, valid time format, end-after-start ordering and positive capacities.

Availability is a CMS-adjacent service capability. Booking/execution logic remains outside the editorial CMS.

## SEO

Localized translations carry page-level metadata while `service_seo` carries optimization metadata. The module uses one canonical score calculation instead of keeping competing score implementations.

Supported fields include meta title/description/keywords, canonical URL, OG title/description/image, focus keyword and structured SEO metadata.

## Search

Services declares a typed `SearchResourceDefinition` with explicit searchable, filterable and sortable fields.

Search remains implemented through Atomic's shared SSR/PostgreSQL search architecture. No service-specific `%query%` search engine is introduced.

Admin list state is URL-addressable through validated query parameters for deterministic SSR and browser navigation.

## Public frontend

Canonical public routes are:

```text
/{lang}/services
/{lang}/services/{categorySlug}
/{lang}/services/tags/{tagSlug}
/{lang}/services/{categorySlug}/{slug}

/{lang}/organizations/{slug}/services
/{lang}/organizations/{slug}/services/{categorySlug}/{slug}
```

Public loaders expose only `PUBLISHED` services.

A category-scoped service URL is valid only when the service actually belongs to that localized category. The resolver rejects mismatched category URLs instead of rendering a misleading page.

Service detail pages use the shared design system and the module's `ServiceDetail` presentation component and expose structured JSON-LD appropriate to the service domain.

## Global administration

```text
/{lang}/admin/services
/{lang}/admin/services/new
/{lang}/admin/services/{id}/edit
```

The global Admin surface uses the common Admin Resource contract and the shared admin navigation shell.

The list supports tenant-wide aggregate statistics, URL state, search, status, category, tag, provider, mobile, locale, sorting and pagination.

## Organization administration

```text
/{lang}/organizations/{slug}/admin/services
/{lang}/organizations/{slug}/admin/services/new
/{lang}/organizations/{slug}/admin/services/{id}/edit
```

The organization surface uses the same Admin Resource, form, action and domain code as global administration while passing the resolved organization id as tenant context.

The organization sidebar exposes Services only to users with the appropriate organization role. Server-side permissions remain authoritative even when navigation hides a capability.

## Admin editor

The Service editor reuses the shared `AdminFormShell` and the shared ContentEditor/MediaPicker primitives. Its sections cover:

```text
Content
Pricing
Taxonomy
Media
Availability
SEO
Revisions
Locks
Publication actions
```

Slug generation is based on Atomic's shared text helpers. Explicit lifecycle actions are not hidden inside save/update.

Form submission uses a typed service payload compatible with the server Action contract. No `Record<string, unknown>` domain payload is required.

## Engagement and moderation

Services supports:

```text
favorites
reactions
reviews
helpful votes
comments
reports
moderation
notifications
```

Reactions are single-valued per `(serviceId, userId)` and changing reaction type replaces the previous type. Reviews are unique per author/service and start as `PENDING`. Approved-review aggregates are recalculated into the service row.

Reports have a database-enforced single target and server-side ownership checks. Comment parents must belong to the same service.

## Notifications

Service notifications are tenant-scoped through the service resource. Comment notification types require a `commentId`; review notification types require a `reviewId`.

System-generated notifications are not emitted back to the acting user when actor and recipient are identical.

## Analytics

Public service view recording is client-action based, not SSR-side. It requires the service to be published, applies IP-based rate limiting and atomically increments the aggregate view counter while recording the view event.

## Extensible attributes

Services may define typed configurable attributes:

```text
STRING
NUMBER
BOOLEAN
SELECT
```

Definitions are tenant-owned. Values are keyed by `(serviceId, definitionId)`. These attributes are extension points, not a reason to turn the core Service schema into untyped JSON.

## Security invariant

A Service mutation follows this conceptual pipeline:

```text
validate
→ resolve tenant
→ authorize
→ validate referenced ownership
→ enforce business invariant
→ transaction
→ audit
→ cache invalidation
```

Cross-tenant service, taxonomy, media, comment, review and report access is rejected.

## Database

The database source of truth is:

```text
src/database/schemas/services.schema.ts
src/database/schemas/services-engagement.schema.ts
```

The module migration is:

```text
src/database/migrations/0006_services_module.sql
```

It creates the Service domain, engagement tables, constraints, indexes and foreign keys. The Drizzle snapshot should be generated from the authoritative schema in the repository's normal migration workflow rather than hand-maintained independently.

## Tests

The intended test matrix covers:

```text
module contract
Admin Resource contract
runtime validation
slug/locale validation
lifecycle transitions
duplication
revision restoration
locks
taxonomy cycles
tenant isolation
media ownership
reaction replacement
report target invariants
notification target invariants
review aggregation
public published-only visibility
category URL ownership
global admin
authenticated organization admin
```

Integration and E2E suites should exercise the shared Blog/Services tenancy and locale matrix, especially `fr`, `en`, `es`, and `ar`, including RTL rendering for Arabic.

## Architectural exclusions

Services must not introduce:

```text
blog_media
service_media_engine
service_search_engine
service_workflow_engine
service_revision_engine
service_notification_engine
service_audit_engine
universal content tables
parallel REST mutation APIs
primary JSONB localization maps
```

Future `Courses`, `Formations`, `Shop` and `Events` modules should consume the same CMS/Admin foundations and add only their domain-specific concerns. Payments, orders, inventory, booking and enrollment remain outside the editorial CMS.