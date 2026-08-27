# CMS Admin — Architecture & Référence

Atomic's CMS administration is a resource-management system built on shared Admin Resource contracts. It serves both the global platform admin and organization-scoped administration.

See also:

- [CMS Foundation](../architecture/cms-foundation.md)
- [Module System](../architecture/module-system.md)
- [Admin Resource Foundation](./admin-resources.md)
- [Services CMS](./services.md)
- [Blog convergence](../blog-convergence.md)

## Administration model

The admin distinguishes platform administration from tenant-aware module administration:

```text
GLOBAL ADMIN
  platform settings / users / organizations / audit
  CMS resources such as Blog and Services

ORGANIZATION ADMIN
  organization members / roles / CMS resources
  same resource contracts, different tenant context
```

A URL or organization slug never grants permission by itself. Every protected route and every mutation re-checks authorization and tenant ownership server-side.

## Shared Admin Resource contract

The canonical resource contract is implemented under `src/core/admin/` and currently supports:

```text
Management
  list
  search
  filters
  sort
  pagination
  stats

Actions
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

Resource definitions also describe typed filter/sort state, presentation variants and the domain permission namespace.

Compatibility checks reject impossible resource definitions before registration/use.

## Shared admin UI

Atomic reuses the existing design-system primitives and exposes a common interaction vocabulary:

```text
AdminResourceShell
AdminResourceList
DataView / table presentation
AdminResourceStats
AdminFormShell
Tabs / dialogs / drawers
Dirty-state guard
Accessible live feedback
```

Domain-specific components remain responsible for semantic content. The shared shell handles layout and interaction consistency rather than domain behavior.

## URL-driven list state

Administrative resource state is represented in query parameters when applicable:

```text
?page=2
&search=...
&status=...
&categoryId=...
&sortBy=updatedAt
&sortOrder=desc
```

This preserves SSR determinism, navigation history, bookmarking and reproducible views.

## Global admin surfaces

The platform exposes the existing administrative areas under `src/pages/[lang]/admin/` and first-class module resources under the same localized namespace.

Current CMS module examples:

```text
/{lang}/admin/blog
/{lang}/admin/services
```

with create/edit surfaces under each resource.

Platform-level admin continues to cover users, organizations, audit, site settings, navigation, pages, media and theme management.

## Organization admin surfaces

Tenant-aware modules expose the same conceptual resource beneath:

```text
/{lang}/organizations/{slug}/admin/blog
/{lang}/organizations/{slug}/admin/services
```

The organization route resolves the organization and passes its id as explicit tenant context to loaders and actions. The UI and resource contract are shared with global administration.

## Blog administration

Blog remains a unified module admin rather than a collection of unrelated sub-applications. Its resource includes:

```text
Posts
Categories
Tags
Moderation
Statistics
```

Post management includes search, status, category, tag, author, featured, sticky and locale filters plus sorting and pagination. Statistics are calculated over the complete tenant dataset rather than the current page.

Blog uses the shared admin contract for both global and organization-scoped administration.

## Services administration

Services is the second complete CMS resource and uses the same administrative foundation. Its current resource supports:

```text
search
status
category
tag
provider
mobile
locale
sorting
pagination
statistics
```

Its editorial lifecycle is explicit:

```text
publish
unpublish
archive
restore
delete
duplicate
lock
unlock
revision restore
```

Global and organization administration use the same resource definition and domain actions with different tenant context.

## Permissions

UI visibility is not authorization. Every mutation performs the server-side permission check again.

Global and organization resources use the existing Atomic RBAC statements. The organization roles are scoped to the organization supplied by the authenticated organization context.

Destructive actions must require explicit confirmation, expose pending/error/success feedback and avoid duplicate submissions.

## Forms, locale state and dirty protection

Complex forms participate in the shared dirty-state pattern. Locale changes, navigation and destructive exits must not silently discard unsaved content.

Domain validation remains inside typed Actions/loaders. The admin shell is responsible only for interaction state and navigation protection.

## Accessibility and responsive behavior

Admin interactions must remain usable with keyboard navigation and visible focus. Icon-only controls require accessible names; tabs expose selection state; validation errors are associated with their fields; dialogs use semantic dialog behavior; asynchronous feedback uses accessible live regions.

Desktop tables may collapse secondary information into row detail on smaller screens rather than introducing a second mobile data model.

## i18n and RTL

The current platform supports:

```text
fr
 en
es
ar
```

Module labels, actions, validation feedback, confirmations and empty/loading states belong to their domain translation contracts. Shared layout and controls respect the locale direction, including RTL for Arabic.

## Media and content

The admin reuses Atomic's shared media and content infrastructure:

```text
MediaPicker
mediaFiles
ContentEditor
RichContent
internal-link resolver registry
```

A module must not create a private media upload engine or a parallel editor just to provide the same workflow.

## Audit and lifecycle

Resource mutations use the same platform audit boundary. Editorial state transitions are explicit actions validated by the module workflow and followed by the relevant revision/event/audit/cache behavior.

## Future resource rule

Adding a new module should not mean copying Blog's admin page. The module should define its domain resource, filter/sort schema, actions and presentation components, then consume the existing Admin Resource and design-system foundations.

The architecture test is whether a second resource can reuse the shell, interactions, tenant handling and lifecycle conventions without inventing a second admin system.