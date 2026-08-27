# Atomic CMS Platform Architecture

Atomic's CMS is a shared editorial platform consumed by first-class business modules. Blog and Services are the first two complete modules and are the reference implementations for the architecture.

For the canonical implementation map, see [CMS Foundation](./cms-foundation.md). For the module contract, see [Module System](./module-system.md).

## Platform shape

```text
PLATFORM CORE
  Auth / RBAC / tenant resolution / rate limiting / audit / notifications

CMS / CONTENT CORE
  Content / Localization / Media / Taxonomy / SEO / Search
  Publication / Workflow / Revision / Lock / Moderation / Cache
  Admin Resource / Presentation contracts

BUSINESS MODULES
  Blog / Services / Formations / Courses / Shop / Events / ...
```

Transactional concerns (`orders`, `payments`, `inventory`, `booking`, `enrollment`, `shipping`) remain outside the editorial CMS.

## First-class module contract

A module declares:

- a stable module id and canonical entity;
- the CMS capabilities it consumes;
- a provider for every enabled capability;
- a presentation grammar (`card`, `list`, `single`, `ui`);
- a Search resource definition when search is enabled;
- an Admin Resource definition when it is administrable.

Registration is explicit and deterministic. The registry is not filesystem-driven.

## Presentation grammar

```text
src/modules/<module>/components/
  cards/
  lists/
  single/
  ui/
```

The folders express responsibility, not a requirement to build identical components. Domain components remain semantic to their module and are built from Atomic's design-system primitives.

Supported presentation variants may include `default`, `compact`, `featured`, `horizontal`, `dense` and `search`. Variants alter presentation only; they do not create separate domain behavior or styling systems.

## Admin Resource contract

Admin is a resource-management system, not a set of unrelated pages. An administrable module describes:

```text
management
  list
  search
  filters
  sort
  pagination
  stats

actions
  create
  read
  update
  duplicate
  publish
  unpublish
  archive
  restore
  delete
  bulk (opt-in)
```

The contract also describes typed filter/sort state, presentation variants and the RBAC permission namespace. Compatibility validation prevents impossible combinations.

Global and organization administration share the resource contract and UI. Only tenant context changes.

## Shared capabilities

Atomic has one canonical capability catalogue for:

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

Existing Atomic implementations remain authoritative. Capability contracts are boundaries and adapters, not excuses to duplicate working services under new folder names.

## Tenancy and authorization

A tenant-aware module must resolve tenant context first and validate every referenced resource in that tenant. URL scope is never sufficient authorization.

Mutations follow the domain pattern:

```text
validate
→ authorize
→ resolve/check tenant
→ validate referenced resources
→ enforce business invariant
→ transaction
→ revision/event/audit where applicable
→ cache invalidation
```

## Workflow, revisions and locking

Workflow validation is shared while state machines remain domain-specific. Blog and Services currently use explicit lifecycle Actions and do not let ordinary update operations silently change publication state.

Revisions are append-only. Restoration writes a new revision. Locks are session-aware and expiring.

## Localization and RTL

The platform supports `fr`, `en`, `es` and `ar`. Localized domain data remains typed per locale. Shared admin shells own the interaction pattern for locale switching and dirty-state protection. RTL is implemented by shared layout and UI primitives.

## Media and content

Modules reuse the shared Media and Content systems:

```text
MediaPicker
mediaFiles
ContentEditor
RichContent
sanitization
internal-link resolver registry
```

A module does not create a private media table or a second content engine merely to expose similar UX.

## Search

Search definitions are module-specific while the underlying Atomic search infrastructure remains shared. A resource declares searchable, filterable and sortable fields. Public loaders and admin loaders remain separate domain contracts even when both consume shared lower-level search utilities.

## Taxonomy

Taxonomy is explicit and typed. Hierarchical categories use a shared acyclicity invariant. Modules may own separate vocabularies when their meanings differ. A polymorphic `entityType/entityId` taxonomy relation is intentionally not the default architecture.

## Engagement and moderation

Comments, reviews, reactions, favorites, reports and moderation are capabilities that modules can activate. Target ownership remains explicit and tenant-scoped.

Notifications use semantic types and explicit context relationships. Audit uses the same platform boundary whether the actor is publishing a post or a service.

## Module validation strategy

Blog is the first complete editorial reference. Services is the second and is intentionally different enough to test the abstraction: it adds pricing, duration, capacity, provider identity, recurring availability and configurable attributes without introducing a second CMS.

The next module should only be started after Services demonstrates that most admin, content, media, localization, workflow and search infrastructure can be reused unchanged.

## Forbidden patterns

```text
universal polymorphic content table
per-module CMS engines
parallel REST admin API when Astro Actions already own mutations
JSONB translation maps as the primary localization model
untyped Record<string, unknown> domain contracts
any-based module boundaries
module-specific design systems that bypass Atomic tokens/primitives
```
