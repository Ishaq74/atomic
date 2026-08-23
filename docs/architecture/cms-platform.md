# Atomic CMS Platform Architecture

Atomic modules are first-class domain modules built on shared platform capabilities.

## Module shape

Every future module such as Blog, Services, Formations, Courses or Shop owns its domain model, routes, actions, loaders and module-specific UI. Shared capabilities are implemented once in the platform layer.

A module should provide a consistent presentation grammar:

- `cards`: compact/high-density representations
- `lists`: collection and search representations
- `single`: canonical detail representation
- `ui`: module-specific presentation primitives

These are conventions, not mandatory directory names. Existing Atomic components remain authoritative until an extraction is proven useful.

## Shared platform capabilities

The platform owns cross-module behavior for:

- authentication, RBAC and tenant isolation
- audit
- media storage, validation and lifecycle
- localization and localized routing
- SEO metadata and structured data
- taxonomy primitives
- search/indexing
- publication workflows
- revisions and editing locks
- moderation
- notifications
- caching and invalidation
- administrative resource UX

A module opts into capabilities explicitly through `AtomicModuleDefinition`.

## Administrative resource grammar

Resource administration follows the same mental model for every module:

`search → filters → sort → pagination → list/card presentation → row actions → bulk actions → create/edit/detail → audit`

Shared UI primitives must remain domain-neutral. A Blog table and a Product table may look coherent without becoming the same semantic component.

## Workflow rule

The workflow core validates transitions. Each module defines its own states and legal transitions. Workflow execution belongs to the domain action because authorization, revisions, audit and cache invalidation are domain-specific.

## Transaction boundary

CMS infrastructure must not absorb transactional domains such as payments, carts, inventory or enrollment. Shop, Courses and Formations may consume CMS capabilities for editorial content while retaining independent transactional cores.

## Design principle

Do not introduce a universal polymorphic content table merely to share infrastructure. Share capabilities and contracts; keep domain entities explicit.
