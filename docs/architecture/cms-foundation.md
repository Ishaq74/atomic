# Atomic CMS Foundation

## Status

This document describes the implemented CMS foundation used by Atomic's first two complete domain modules:

```text
Blog
Services
```

The foundation is designed for the next modules (`Formations`, `Courses`, `Shop`, `Events`, and others) without requiring a second CMS architecture.

## Architecture

Atomic separates three concerns:

```text
PLATFORM CORE
  Auth / RBAC / tenancy / rate limiting / audit / notifications

CMS / CONTENT CORE
  content / localization / media / taxonomy / SEO / search
  publication / workflow / revisions / locks / moderation / cache
  admin resource management / presentation contracts

BUSINESS MODULES
  Blog / Services / Formations / Courses / Shop / Events / ...
```

Transactional capabilities such as payments, orders, inventory, booking and enrollment are not part of the editorial CMS core.

## Physical module boundaries

```text
src/core/
  admin/
  attributes/
  audit/
  cache/
  capabilities/
  content/
  engagement/
  localization/
  locks/
  media/
  moderation/
  modules/
  notifications/
  presentation/
  revision/
  search/
  seo/
  taxonomy/
  workflow/

src/modules/
  blog/
  services/
```

A module is expected to converge on:

```text
src/modules/<module>/
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
  capabilities.ts
  module.ts
```

Not every future module must implement every capability. The module contract declares the capabilities it consumes and the providers that implement them.

## Presentation grammar

The module presentation contract is deliberately semantic, not generic:

```text
cards/     compact, featured, horizontal, result variants
lists/     collection and search representations
single/    canonical detail representations
ui/        module-specific semantic presentation primitives
```

Domain components are allowed to understand domain semantics. Shared design-system primitives remain under Atomic's existing `atoms`, `molecules` and `organisms` hierarchy.

Do not introduce a `UniversalCard<T>` or a generic polymorphic presentation model. The reusable abstraction is the vocabulary and the contract, not one component pretending every domain is the same.

## CMS capabilities

The canonical capability catalogue covers:

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

The catalogue is a binding and compatibility mechanism. Existing Atomic implementations remain authoritative when they already provide the capability. A capability entry must not create a duplicate engine solely to make the filesystem look uniform.

## Admin Resource model

Every administrable module exposes a resource definition with:

```text
management:
  list
  search
  filters
  sort
  pagination
  stats

actions:
  create
  read
  update
  duplicate
  publish
  unpublish
  archive
  restore
  delete
  optional bulk
```

The resource also describes presentation variants, typed list state and its RBAC namespace.

The compatibility layer rejects impossible combinations such as:

```text
filters without list
search without list
sort without list
pagination without list
default sort without sort support
publication actions without publication capability
```

## URL state

Admin list state is represented in the URL so SSR, navigation and bookmarking remain deterministic:

```text
?page=2
&search=...
&status=...
&categoryId=...
&sortBy=updatedAt
&sortOrder=desc
```

Domain loaders validate that state with typed domain schemas. Public search and admin search remain distinct query contracts even when they share lower-level search infrastructure.

## Global and organization administration

A tenant-aware module exposes the same conceptual resource on both surfaces:

```text
Global
/{lang}/admin/<module>
/{lang}/admin/<module>/new
/{lang}/admin/<module>/{id}/edit

Organization
/{lang}/organizations/{slug}/admin/<module>
/{lang}/organizations/{slug}/admin/<module>/new
/{lang}/organizations/{slug}/admin/<module>/{id}/edit
```

The UI and resource contract are shared. The organization route supplies an explicit tenant context. Every loader and mutation re-checks tenant ownership server-side.

An organization being identified in the URL is never treated as sufficient authorization by itself.

## Editorial workflow

Workflow is explicit and domain-defined. The shared layer validates legal transitions; domain actions retain responsibility for authorization, transactions, revisions, audit and cache invalidation.

The Blog and Services lifecycle is:

```text
DRAFT      -> PUBLISHED | ARCHIVED | DELETED
PUBLISHED  -> DRAFT | ARCHIVED | DELETED
ARCHIVED   -> DRAFT | DELETED
DELETED    -> DRAFT
```

Ordinary content updates do not silently change lifecycle state.

## Revisions and locks

Editorially meaningful changes create immutable revisions. Restoring a revision applies its state to the current object and records a new revision; historical rows are never overwritten.

Locks are resource-scoped, session-aware and expiring. A live lock belonging to another editor is a conflict, not a silently replaceable value.

## Localization and RTL

Atomic currently supports:

```text
fr
 en
es
ar
```

Localized content, localized slugs and localized SEO remain domain data. Locale switching in complex admin forms participates in the shared dirty-state pattern.

RTL is a property of shared layout and UI primitives, not a module-specific implementation.

## Media and content

Modules reuse Atomic's shared media and content infrastructure:

```text
MediaPicker
mediaFiles
ContentEditor
RichContent
internal-link resolvers
sanitization
```

There is no per-module media storage engine and no second content representation introduced merely for convenience.

## Taxonomy

Taxonomy remains explicit and typed. Hierarchical categories use a shared acyclicity invariant. Modules may own their vocabulary when the domain vocabulary differs; they must not introduce a polymorphic `entityType/entityId` relation simply to avoid explicit schemas.

## Engagement, moderation and notifications

Comments, reviews, reactions, favorites, reports and moderation are modeled as capabilities that a module can opt into. The semantic target remains explicit and tenant-scoped.

Notifications are target-aware rather than a generic bag of nullable identifiers. For example, a comment notification may carry both the service/post context and its comment target.

## Services as architecture proof

Services is the second complete module after Blog. Its purpose is not only to add functionality, but to prove that the CMS foundation supports a materially different domain without introducing:

```text
service_search_engine
service_workflow_engine
service_media_engine
service_notification_engine
service_audit_engine
```

Services instead consumes shared contracts and adds only service-specific data and rules such as price, duration, capacity, availability, provider identity and configurable attributes.

## Future modules

The next module should consume the existing foundation first and add only domain-specific infrastructure.

```text
Formations
  editorial content + curriculum + enrollment integration

Courses
  editorial content + hierarchy + instructors + progress integration

Shop
  catalog/editorial content + variants + inventory/order integration

Events
  editorial content + schedule + registration integration
```

The CMS owns the editorial layer. Transactional cores remain separate.

## Forbidden architecture

The following patterns are intentionally excluded:

```text
blog_authors as a duplicate identity layer
blog_media as a duplicate media system
REST admin APIs parallel to Astro Actions
JSONB maps as the primary localization architecture
UniversalCard<T>
universal polymorphic content table
per-module copies of search/workflow/revision/audit/cache engines
untyped Record<string, unknown> domain mutation contracts
any-based module boundaries
```

## Implementation rule

A new abstraction is accepted only when:

1. it has a real consumer;
2. it removes duplicate domain infrastructure;
3. it preserves strong typing and invariants;
4. it does not hide authorization or tenant checks;
5. it is documented and tested at its boundary.

The quality test for the CMS is therefore not the number of generic files. It is whether a new module can be added mostly by implementing its domain rather than rebuilding the platform.