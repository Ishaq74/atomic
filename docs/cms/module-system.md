# Atomic Module & CMS Foundation

## Purpose

Atomic treats each business domain as a first-class module. A module combines its domain model, validation, server Actions, loaders, permissions, search, SEO, presentation and administration while consuming shared platform/CMS capabilities.

The architecture is deliberately modular without introducing a universal polymorphic content table.

## Physical boundaries

```text
src/core/
  admin/          # shared admin/resource contracts and foundations
  attributes/     # extensible-attribute contracts
  audit/          # audit boundary
  cache/          # cache boundary
  capabilities/   # canonical CMS capability catalogue
  content/        # editor/rendering/internal-link boundary
  engagement/     # shared engagement contracts
  localization/   # localization contracts
  locks/          # editorial lock contracts
  moderation/     # moderation contracts
  modules/        # module contracts, registry and bootstrap
  notifications/  # notification contracts
  presentation/   # card/list/single/ui grammar
  revision/       # revision contracts
  search/         # resource search contracts
  seo/            # SEO contracts
  taxonomy/       # hierarchy and taxonomy invariants
  workflow/       # lifecycle transition contracts

src/modules/
  blog/
  services/
  # future: formations/, courses/, shop/, events/, ...
```

Existing platform implementations may remain in their established locations when moving them would add no architectural value. A Core boundary must not create a duplicate implementation merely to satisfy a directory shape.

## Module contract

A first-class module declares:

- a stable module id and owned entity;
- the CMS capabilities it consumes;
- a concrete provider for every enabled capability;
- presentation variants for `card`, `list`, `single` and `ui`;
- a search definition when search is enabled.

The canonical contract is `src/core/modules/module-contract.ts`. Registration is handled by `src/core/modules/module-registry.ts`, and deterministic startup by the module bootstrap.

Capability providers are references to authoritative Atomic implementations or module adapters. They are not copies of those implementations.

## Presentation grammar

Every module follows the same product-facing vocabulary:

```text
src/modules/<module>/components/
  cards/
  lists/
  single/
  ui/
```

Domain components remain domain-specific. Shared primitives remain in Atomic's existing design-system hierarchy (`atoms`, `molecules`, `organisms`).

Variants such as `default`, `compact`, `featured`, `horizontal`, `dense` and `search` modify presentation only. They must not duplicate business logic or introduce a second styling system.

Do not create a `UniversalCard<T>` or equivalent generic semantic component. The abstraction belongs at the primitive UI level.

## CMS capabilities

The current shared CMS capability catalogue covers:

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

A capability expresses a reusable responsibility. The catalogue points at the authoritative implementation and lets each module opt in without creating parallel infrastructure.

## Admin Resource model

An administrable module exposes an `AdminResourceDefinition` with:

- management capabilities: list, search, filters, sort, pagination and stats;
- action capabilities: create, read, update, duplicate, publish, unpublish, archive, restore and delete, with optional bulk support;
- typed filter/sort configuration;
- presentation variants;
- an RBAC permission namespace.

The compatibility layer rejects impossible combinations, such as filters without listing, a default sort without sort support, or publication actions without publication capability.

The shared admin surface is resource-oriented. Blog and Services are the first complete consumers.

## Global and organization administration

A tenant-aware module exposes the same resource contract in both scopes:

```text
/{lang}/admin/<resource>
/{lang}/organizations/{slug}/admin/<resource>
```

The global surface resolves the global tenant context. The organization surface resolves the organization by slug and carries that organization id through every loader and mutation.

Authorization is always enforced server-side. Rendering or hiding a button is not authorization.

The organization surface must reuse the same domain actions, resource UI and invariants as the global surface. Only tenant context and permissions differ.

## URL state

Admin list state belongs in the URL:

```text
?page=2
&search=...
&status=...
&categoryId=...
&sortBy=updatedAt
&sortOrder=desc
```

This preserves SSR determinism, back/forward navigation, bookmarking and shareability.

Modules validate query state with their domain schemas rather than accepting arbitrary fields.

## Forms and unsaved changes

Admin forms use a shared shell and dirty-state pattern. Locale switching and navigation must not silently discard unsaved content.

The common interaction is:

```text
form
  -> dirty tracking
  -> navigation guard
  -> accessible confirmation
  -> stay / discard
```

The same pattern is intended for Blog, Services, Courses, Products and other future editorial resources.

## Localization and RTL

Modules own localized domain content and localized SEO. The admin framework owns the interaction pattern for locale state.

The current platform supports:

```text
fr
en
es
ar
```

Arabic is RTL. Direction, focus behavior, tables, dialogs, tabs and other shared interactions are implemented by shared shells/primitives rather than by Blog-specific or Services-specific copies.

## Shared versus transactional domains

The CMS owns editorial concerns:

```text
content
localization
media
taxonomy
SEO
publication/workflow
revisions
locks
search indexing
admin CRUD
permissions
moderation hooks
audit
cache
```

Future transactional domains consume these capabilities but remain separate:

```text
pricing
orders
payments
inventory
booking
availability engines
enrollment
shipping
```

This prevents Shop, Courses or Services from turning the CMS into an ERP.

## Module examples

### Blog

Blog is the first complete editorial module. It keeps its native domain schema and uses shared ContentEditor, Media, search, taxonomy, SEO, workflow, revisions, locks, engagement, moderation, notifications, audit and cache boundaries.

### Services

Services is the second validation module. It demonstrates that the same contracts support typed price, duration, capacity, availability, provider identity, ratings, localized content and configurable attributes without introducing a second CMS.

## Forbidden patterns

Do not add:

- a universal polymorphic content table for every module;
- module-specific copies of Media, Audit, Search, Workflow, Revision or Cache engines;
- a parallel REST mutation API where Astro Actions are already authoritative;
- JSONB maps as the primary localization model;
- `any` or `Record<string, unknown>` as domain mutation contracts;
- module-specific CSS systems that bypass Atomic design tokens.

## Adding a new module

A new module should:

1. define its domain schema and invariants;
2. implement typed validation and Actions/loaders;
3. declare the shared capabilities and their providers;
4. define `cards/lists/single/ui` presentation boundaries;
5. define an Admin Resource contract;
6. reuse shared Media, ContentEditor, Search, SEO, Localization, Workflow, Revision, Lock, Moderation, Notification, Audit and Cache infrastructure where applicable;
7. provide public and global/organization admin routes when the domain supports tenancy;
8. add unit, integration and E2E coverage for its domain invariants;
9. update this documentation and the module-specific reference.

The architectural test is reuse: a new module should add domain behavior, not another copy of the CMS.