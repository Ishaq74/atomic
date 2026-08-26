# Atomic CMS Platform Architecture

Atomic modules are first-class domain modules built on shared platform capabilities.

## Module contract

Every future module such as Blog, Services, Formations, Courses or Shop owns its domain model, routes, actions, loaders and module-specific UI. Shared capabilities are implemented once in the platform layer.

Each module declares:

- a stable `id` and canonical `entity`;
- explicit platform capabilities: content, localization, media, SEO, taxonomy, search, publication, revisions, locks, engagement, moderation, notifications, audit and cache;
- a presentation grammar shared across public, search and admin contexts: `card`, `list`, `single`, `ui`.

The module registry is explicit and deterministic. Registration happens once during application bootstrap; module discovery is not dynamic or filesystem-driven.

## Module presentation grammar

A module's domain-specific components may use the following roles:

- `cards`: compact/high-density representations;
- `lists`: collection and search representations;
- `single`: canonical detail representation;
- `ui`: module-specific presentation primitives.

These are contracts, not mandatory directory names. Existing Atomic components remain authoritative until an extraction is proven useful.

## Administrative resource contract

Every admin resource declares two distinct surfaces:

1. **Management capabilities**: list, search, filters, sort, pagination and stats.
2. **Editorial actions**: create, read, update, duplicate, publish, unpublish, archive, restore, delete and optional bulk operations.

The resource also declares its presentation variants and permission namespace. Compatibility is validated at module registration time, including publication actions requiring the module's publication capability and list-dependent features requiring list support.

Resource administration follows the same mental model for every module:

`search → filters → sort → pagination → list/card presentation → row actions → create/edit/detail → audit`

Bulk operations are opt-in. A resource must not advertise bulk functionality until its domain actions provide safe batch semantics.

Shared UI primitives must remain domain-neutral. A Blog table and a Product table may look coherent without becoming the same semantic component.

## Shared platform capabilities

The platform owns cross-module behavior for:

- content editing/rendering/sanitization/internal-link resolution;
- authentication, RBAC and tenant isolation;
- audit;
- media storage, validation and lifecycle;
- localization and localized routing;
- SEO metadata and structured data;
- taxonomy primitives and hierarchy invariants;
- search/indexing;
- publication workflows;
- revisions and editing locks;
- engagement capabilities such as comments, reviews, reactions and favorites;
- moderation;
- notifications;
- caching and invalidation;
- administrative resource UX, responsive data views and dirty-form protection.

The current implementations remain authoritative in their established Atomic locations. The CMS capability catalog binds modules to those implementations without duplicating services merely to make the filesystem look uniform.

## Workflow rule

The workflow core validates transitions. Each module defines its own states and legal transitions. Workflow execution remains in the domain action because authorization, revisions, audit and cache invalidation are domain-specific.

The Blog consumes the shared workflow definition; its legacy standalone workflow module was removed to avoid competing sources of truth.

## Transaction boundary

CMS infrastructure must not absorb transactional domains such as payments, carts, inventory or enrollment. Shop, Courses and Formations may consume CMS capabilities for editorial content while retaining independent transactional cores.

## Design principle

Do not introduce a universal polymorphic content table merely to share infrastructure. Share capabilities and contracts; keep domain entities explicit.
