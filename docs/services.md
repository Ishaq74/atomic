# Services CMS module

Services is the second first-class Atomic CMS module after Blog. It exists both as a complete business-domain implementation and as an architectural validation of the shared CMS/Admin foundation.

The module keeps service-specific semantics inside `src/modules/services` while consuming the same platform contracts as Blog for content, media, localization, SEO, search, taxonomy, publication, workflow, revisions, locks, engagement, moderation, notifications, audit and cache.

## 1. Module boundary

```text
src/modules/services/
├── admin/
│   ├── index.ts
│   ├── loader.ts
│   └── resource.ts
├── actions/
│   └── index.ts
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
├── workflow.ts
└── index.ts
```

The module boundary is semantic. The shared design system remains under Atomic's existing `atoms`, `molecules` and `organisms` hierarchy. Services components are consumers of that design system, not a second design system.

## 2. Shared CMS contract

Services declares and provides every capability it consumes through the canonical module/capability contracts:

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

Registration is deterministic through the platform module registry. Services does not create a private content engine, search engine, workflow engine, media store, revision engine, notification engine or audit engine.

## 3. Presentation grammar

Services follows the same presentation vocabulary as Blog and every future first-class module:

```text
src/modules/services/components/
├── cards/
├── lists/
├── single/
└── ui/
```

The current presentation surface is intentionally domain-specific:

```text
ServiceCard
ServiceGrid
ServiceDetail
ServiceMeta
```

Presentation variants are allowed to change composition and density without changing domain behavior. Visual styling comes from Atomic's existing tokens and primitives.

The intended product pattern is reusable vocabulary, not a `UniversalCard<T>` abstraction. A future `ProductCard` or `CourseCard` should have analogous responsibilities while remaining semantically typed to its own domain.

## 4. Service domain

A Service is an editorial/business resource owned by a provider (`user.id`) and optionally scoped to one organization.

The current domain includes:

```text
identity
provider
localized title / slug / excerpt / content
price + currency
duration
maximum participants
mobile availability flag
featured flag
availability windows
categories
tags
media
galleries/media metadata
SEO
reviews + helpful votes
comments
reports
reactions
favorites
view analytics
notifications
revisions
locks
configurable attributes
```

Core service fields remain strongly typed. Configurable attributes are an extension mechanism for genuinely dynamic fields; they do not replace typed columns with unrestricted JSONB.

## 5. Tenant model and authorization

A service is either global (`organizationId = NULL`) or belongs to one organization.

Every service mutation follows the tenant-first rule:

```text
validate input
→ resolve tenant
→ authorize
→ validate referenced resources in tenant
→ enforce domain invariants
→ transaction
→ audit/event/revision where applicable
→ targeted cache invalidation
```

Referenced categories, tags and media are checked against the same tenant before persistence. Organization membership and permissions are evaluated from the authenticated server-side session, not inferred from a client-supplied URL or identifier.

The same rule applies to organization administration: the URL establishes the requested tenant context, but never replaces server-side ownership/permission checks.

## 6. Lifecycle

Services uses an explicit state machine:

```text
DRAFT      → PUBLISHED | ARCHIVED | DELETED
PUBLISHED  → DRAFT | ARCHIVED | DELETED
ARCHIVED   → DRAFT | DELETED
DELETED    → DRAFT
```

Ordinary content updates cannot directly set `status` or `publishedAt`. Publication and destructive lifecycle changes use dedicated Actions.

Lifecycle operations are:

```text
publishService
unpublishService
archiveService
restoreService
deleteService
duplicateService
lockService
unlockService
listServiceRevisions
restoreServiceRevision
```

Revision restoration applies the stored revision state and records a new revision instead of mutating historical history.

## 7. Duplication

`duplicateService` creates a new editorial object:

### Copied

```text
localized translations
categories
tags
media associations
availability
SEO configuration
service content
service settings such as price/duration/capacity/mobile state
```

### Reset or intentionally not copied

```text
identity
publication state
publishedAt
view counters
rating aggregates
comments
reviews
reactions
favorites
notifications
locks
revision history
```

The copy is a draft with a newly generated identity and a fresh creation revision.

## 8. Localization and SEO

The module supports:

```text
fr
 en
es
ar
```

Service translations use one relational row per service/locale. Localized slugs remain canonical public identifiers.

The editor keeps service content, metadata and SEO typed by locale. Runtime validation uses the platform's real locale set rather than accepting arbitrary strings.

SEO remains localized and includes metadata such as:

```text
meta title
meta description
keywords
canonical URL
OG title/description/image
focus keyword
SEO score
```

The SEO score remains a derived value; it is recalculated from the current editorial inputs rather than becoming an independent source of truth.

## 9. Media and ContentEditor

Services uses Atomic's shared content and media infrastructure.

```text
ContentEditor
MediaPicker
mediaFiles
HTML sanitization
internal-link resolver registry
```

The service editor registers the `services` internal-link resolver. The resolver is tenant-aware, locale-aware and public-content aware, so Service links do not accidentally use Blog's resolver or cross tenant boundaries.

Service media operations validate both service ownership and media ownership before changing associations.

## 10. Categories and tags

Categories are explicit relational entities and can be hierarchical.

The shared taxonomy invariant rejects both:

```text
A → A
```

and indirect cycles such as:

```text
A → B → C → A
```

Tags remain a separate typed vocabulary. No polymorphic `entityType/entityId` relation is used as a shortcut for unrelated domain taxonomies.

## 11. Availability

Availability is modeled as explicit service records with:

```text
day of week
start time
end time
timezone
optional participant limit
```

Validation rejects invalid days, invalid time syntax, non-positive limits and intervals where the end is not after the start.

Availability is a domain capability of Services. A future booking engine may consume it, but booking and payment logic remain outside the editorial CMS core.

## 12. Engagement and moderation

Services supports the same reusable interaction family used by other modules:

```text
favorites
reactions
reviews
helpful votes
comments
reports
moderation
```

Rules include:

```text
one favorite per user/service
one active reaction per user/service
reaction type changes replace the previous value
one review per author/service
comments are scoped to their service
parent comments must belong to the same service
reports have exactly one target
```

Approved review aggregates are materialized back to the service as `ratingAverage100` and `ratingCount` after moderation.

## 13. Notifications

Service notifications are semantic, typed events rather than a bag of unrelated nullable ids.

Current event families include:

```text
NEW_COMMENT
REPLY_TO_COMMENT
NEW_REVIEW
REVIEW_APPROVED
REVIEW_REJECTED
SERVICE_PUBLISHED
SERVICE_MENTION
```

Comment/review notifications carry the service context plus the relevant comment/review target. Notification reads are restricted to the recipient and the tenant owning the service context.

## 14. Analytics

Public views are recorded only for published services.

View recording is rate-limited using the request IP and updates the service counter atomically. The analytics record also captures the observation time, date, hour and optional referrer/country fields.

SSR rendering itself does not synchronously count a view merely because a page was rendered.

## 15. Search

Services registers a typed Search resource definition with fields for:

```text
title
slug
content
excerpt
status
provider
category
tag
mobile
featured
price
rating
publication date
views
```

The module-specific definition describes what is searchable, filterable and sortable; the search infrastructure itself remains shared.

Public and admin read contracts remain separate. Admin loaders may expose drafts, archives and other allowed states; public loaders expose published content only.

## 16. Public URLs

```text
/{lang}/services
/{lang}/services/{categorySlug}
/{lang}/services/{categorySlug}/{slug}
/{lang}/services/tags/{tagSlug}

/{lang}/organizations/{slug}/services
/{lang}/organizations/{slug}/services/{categorySlug}/{slug}
```

Localized slugs are canonical. A service reached through a category URL must actually belong to that category; otherwise the route redirects back to the canonical service location.

Only published services are exposed by the public loaders.

## 17. Administration

Services uses the shared Admin Resource model for both global and organization administration.

### Global

```text
/{lang}/admin/services
/{lang}/admin/services/new
/{lang}/admin/services/{id}/edit
```

### Organization

```text
/{lang}/organizations/{slug}/admin/services
/{lang}/organizations/{slug}/admin/services/new
/{lang}/organizations/{slug}/admin/services/{id}/edit
```

Both surfaces share the same resource semantics and domain Actions. The only structural difference is tenant context.

The resource provides:

```text
list
search
filters
sort
pagination
stats
create
read
update
duplicate
publish
unpublish
archive
restore
delete
lock
unlock
revisions
```

The admin list is responsive: desktop receives a tabular representation while narrow layouts fall back to service cards rather than forcing an unusable wide table.

## 18. Admin form

The service editor is the domain form for:

```text
Content
pricing
capacity / duration
mobile/featured state
categories
tags
cover / OG media
SEO
location
availability
```

The editor uses the shared `AdminFormShell` and `ContentEditor`. Updates are partial and do not silently reset lifecycle fields, existing taxonomy associations or current editorial data.

Publication remains outside ordinary update payloads, so publish/unpublish/archive/restore continue through explicit lifecycle Actions.

## 19. Global Admin and Organization Admin

The platform exposes Services in both administration contexts:

```text
Global Admin
  AdminSidebar → Services

Organization Admin
  OrgSidebar → Services
```

The same permission namespace and resource model are used on both surfaces. Organization-scoped routes always pass the resolved organization id into the domain tenant boundary.

The organization UX therefore remains part of the same CMS resource system instead of becoming a second mini-CMS.

## 20. Permissions

Services uses the canonical Atomic RBAC statement namespace:

```text
service
serviceCategory
serviceTag
serviceComment
serviceReview
```

Global/admin and organization roles are extended consistently for these resources. Read-only roles do not gain editorial mutation privileges merely because a Service URL is visible.

## 21. Data integrity

Important database invariants include:

```text
published service → publishedAt required
price ≥ 0
currency matches 3-letter format at validation boundary
duration > 0 when present
max participants > 0 when present
rating average between 0 and 500
availability day ∈ 0..6
availability end > start
category cannot self-parent
reports have exactly one target
service/user reaction is unique
review helpful vote is unique per user/review
favorite is unique per user/service
localized service translation is unique per service/locale
localized slug is unique within tenant/locale
```

The application layer mirrors these invariants before writes and the migration contains corresponding database constraints/indexes where appropriate.

## 22. Compatibility and legacy boundaries

The canonical domain entry point is:

```text
src/modules/services
```

Existing platform implementations remain in their established locations when moving them would add no value. Compatibility exports are allowed only as bridges; they must not become alternate implementations.

A new implementation under `src/lib/services` or `src/components/services` is not valid merely because it duplicates an existing module capability.

## 23. Tests

The module's intended validation matrix is:

```text
module contract
admin resource compatibility
service validation
status transition legality
revision restore
lock acquisition / conflict / expiry
slug uniqueness
localized translation uniqueness
tenant isolation
cross-tenant media/category/tag protection
category cycle prevention
availability validation
reaction replacement
favorite toggle
review uniqueness
helpful vote idempotence
report single-target invariant
notification target semantics
notification tenant scope
review aggregate recalculation
view-rate limiting
atomic view counter increment
public draft/archive/deleted invisibility
category URL ownership
internal-link tenant + locale scope
admin global surface
admin organization surface
FR / EN / ES / AR
RTL behavior
responsive admin presentation
```

Database-backed behavior must be exercised against PostgreSQL by the repository integration/E2E suite. The existence of unit contracts does not replace integration coverage.

## 24. Future modules

Services is intentionally the second reference implementation. Future modules should reuse the same platform surfaces:

```text
Blog        → editorial publishing
Services    → editorial/business service catalogue
Formations  → content + curriculum + enrollment integration
Courses     → content + hierarchy + progress/enrollment integration
Shop        → catalog + variants + inventory/order integration
Events      → content + scheduling + registration integration
```

The CMS owns editorial concerns. Transactional engines remain distinct.

## 25. Architectural decision

The purpose of Services is not merely to add another feature set. It demonstrates that Atomic can support two materially different domains without creating:

```text
service-specific CMS engine
service-specific Media engine
service-specific Search engine
service-specific Workflow engine
service-specific Revision engine
service-specific Audit engine
service-specific Notification engine
```

That is the intended outcome of the Concordia → Atomic convergence: Concordia contributes the product grammar and administrative ergonomics; Atomic retains the typed, tenant-safe, transactional architecture and turns those ideas into reusable platform contracts.
