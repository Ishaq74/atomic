# Concordia → Atomic synthesis

This document records the product patterns intentionally retained from Concordia and the architectural decisions used to implement them in Atomic.

The synthesis is now exercised by two real first-class modules: `Blog` and `Services`.

| Concordia pattern | Atomic decision | Destination | Current proof |
| --- | --- | --- | --- |
| `cards / lists / single / ui` module grammar | Keep as a semantic module presentation convention | `src/modules/<module>/components` | Blog + Services |
| Service-style rich cards | Reuse Atomic primitives for image, badges, price, rating and metadata | Design system + module UI | Services |
| Responsive admin resource management | Use shared resource shell, DataView and pagination primitives | Admin Core | Blog + Services |
| Admin filters/search/sort | Typed resource filters carried through URL/SSR | Admin Core + module loaders | Blog + Services contracts |
| Media picker workflow | Reuse Atomic shared Media/MediaPicker | Media Core | Blog + Services |
| Upload validation and replacement lifecycle | Keep ownership/security in shared Media infrastructure | Media Core | Platform implementation |
| Multilingual editor tabs | Shared localization/editor workflow | Localization + Content | Blog + Services |
| Automatic slug then manual override | Treat as shared editorial behavior with domain validation | Content/Admin | Blog + Services |
| Admin feedback/toasts | Shared accessible feedback primitives | Admin Core | Shared Admin surface |
| Unsaved form protection | Shared dirty-form guard | Admin Core | Blog + Services forms |
| Ratings/reviews/comments/reports | Capability-based engagement/moderation with explicit targets | Engagement/Moderation Core | Blog + Services |
| Notifications | Shared notification capability; modules emit semantic events | Notification Core | Blog + Services |
| Audit trail | Shared audit service | Platform Core | Blog + Services |
| Taxonomy/category/tag patterns | Shared taxonomy contracts + explicit domain relations | Taxonomy Core | Blog + Services |
| Search facets/filter state | Shared typed search adapter/contract | Search Core | Blog + Services |
| Domain cards with rich metadata | Module-specific semantic projections on shared UI primitives | Module UI | Services proves this |
| Service/module visual variants | Token-driven variant contract, no copied visual themes | Design System | Blog + Services |
| Blog-specific REST endpoint | Rejected; Astro Actions remain canonical mutation boundary | Atomic Actions | Architecture invariant |
| `jsonb` as primary localization storage | Rejected; relational locale rows remain canonical | Drizzle schemas | Blog + Services |
| Dedicated `blog_media` | Rejected; shared Media remains canonical | Media Core | Architecture invariant |
| Separate author identity | Rejected for current Atomic model; User remains canonical | Auth/Profile | Blog + Services |
| Generic polymorphic content table | Rejected; explicit module entities remain canonical | Domain schemas | Architecture invariant |

## What Atomic explicitly retained

Concordia's useful contribution is its product grammar:

```text
module composition
cards / lists / single / ui
resource-oriented administration
rich list/detail presentation
responsive admin UX
locale-aware editorial workflows
explicit media interaction patterns
```

Atomic expresses these through its own types, design-system primitives and domain contracts.

## What Atomic explicitly rejected

The following patterns are not imported merely because they are convenient in a standalone application:

```text
parallel Blog REST API
JSONB localization as the primary content model
module-specific media stores
module-specific author identity systems
untyped mutation payloads
per-module CMS engines
per-module search/workflow/revision/audit/cache engines
universal polymorphic content storage
module-specific visual frameworks that bypass Atomic tokens
```

## Architecture consequence

A module is a combination of:

```text
domain
schema
validation
permissions
actions
loaders
search
seo
i18n
presentation
admin
```

It consumes shared platform/CMS capabilities instead of rebuilding them.

The physical convention is:

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

Future modules such as `Formations`, `Courses`, `Shop` and `Events` should extend the domain layer only where their semantics require additional capabilities.

## Services as the architectural proof

Services is intentionally different from Blog. It introduces:

```text
provider identity
pricing
duration
capacity
mobile service flag
recurring availability
service-specific taxonomy
ratings
configurable attributes
```

while continuing to consume the same:

```text
content
media
localization
SEO
search
workflow
revision
locks
moderation
notifications
audit
cache
admin
```

The successful test is not that Services looks similar to Blog. The test is that its domain complexity does **not** require another CMS implementation.

## Future module rule

A future module is accepted only when:

1. its domain data and invariants are explicit and strongly typed;
2. existing CMS capabilities are reused where semantics match;
3. transactional concerns remain outside the editorial CMS;
4. tenant and authorization boundaries are enforced server-side;
5. presentation uses the shared design-system primitives;
6. administration uses the shared Admin Resource grammar;
7. localized content and URLs remain relational and typed;
8. domain-specific tests prove its invariants.

This is the intended convergence:

```text
Concordia = product grammar
Atomic    = platform/system architecture
```

The result is not a copy of either codebase. It is Atomic's own CMS platform with a consistent module language and two real reference implementations.
