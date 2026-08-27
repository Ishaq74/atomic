# Atomic Admin Resource Foundation

Atomic administration is resource-oriented. Modules expose a typed `AdminResourceDefinition` and reuse shared UI/interaction primitives instead of creating independent CRUD frameworks.

## Resource contract

An Admin Resource describes:

- stable resource id;
- owned domain entity;
- management capabilities: list, search, filters, sort, pagination, stats;
- actions: create, read, update, duplicate, publish, unpublish, archive, restore, delete and optional bulk operations;
- typed filter and sort definitions;
- presentation variants;
- the RBAC permission namespace.

`assertResourceCompatibility()` rejects impossible definitions such as filters/search/sort/pagination without list support and publication actions without the module publication capability.

## List contract

A resource list should declare its allowed query state explicitly. Typical fields are:

```text
search
status
category
Tag
author/provider
locale
boolean flags
sortBy
sortOrder
page
limit
```

The exact fields belong to the domain module. The URL is the transport for list state so SSR, browser history, bookmarking and deterministic rendering remain coherent.

## Shared admin vocabulary

```text
AdminResourceShell
AdminResourceList
AdminResourceFilters
AdminResourceSearch
AdminResourcePagination
AdminResourceActions
AdminResourceBulkActions
AdminResourceStats
AdminFormShell
AdminFormSection
AdminFormTabs
AdminFormFooter
AdminFormDirtyGuard
Dialog / Drawer
Toast / live feedback
Responsive DataView
```

Only components with a real consumer should be added. Existing Atomic design-system primitives remain authoritative for buttons, tabs, tables, dialogs, forms, focus management and tokens.

## Global and organization admin

Tenant-aware modules expose the same resource through two scopes:

```text
/{lang}/admin/<resource>
/{lang}/organizations/{slug}/admin/<resource>
```

The global route resolves the global tenant context. The organization route resolves the organization and passes its id through every loader and action.

The UI can hide actions the current user cannot perform, but server-side authorization remains mandatory for every mutation.

## Forms and dirty state

Admin forms must keep unsaved editor state safe. Locale switches and navigation should use the shared dirty-state pattern:

```text
change
→ mark dirty
→ guard navigation
→ accessible confirmation
→ stay / discard
```

## Responsive behavior

Resource tables are allowed to collapse secondary metadata on small screens. The admin framework should prefer Atomic's existing responsive DataView and design tokens instead of a second breakpoint system.

## Localization and RTL

Admin chrome must be localized. Domain modules own their localized labels and data. Arabic uses the platform RTL behavior; modules should not implement ad-hoc direction rules.

## Resource actions

Destructive and state-changing actions should be explicit, permission-aware and duplicate-submit safe. Typical editorial actions are:

```text
Edit
Preview
Duplicate
Publish
Unpublish
Archive
Restore
Delete
```

A resource may add domain-specific actions such as inventory, enrollment or availability without changing the shared lifecycle contract.

## Blog and Services

Blog and Services are the first complete resource consumers. They share the same Admin Resource vocabulary while keeping their own domain schemas and semantics.

## Acceptance rule for future modules

A new module is architecturally successful when it can reuse the existing resource shell, form shell, search/filter/sort/pagination state, MediaPicker, ContentEditor, localization, SEO, workflow, revisions, locks, moderation, notifications, audit and cache infrastructure without cloning those systems.