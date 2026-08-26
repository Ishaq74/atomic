# Concordia → Atomic synthesis

This document records the product patterns intentionally retained from Concordia and the architectural decisions used to implement them in Atomic.

| Concordia pattern | Atomic decision | Destination |
| --- | --- | --- |
| `cards / lists / single / ui` module grammar | Keep as a module presentation convention, not a copied directory tree | Module UI conventions |
| Service-style rich cards | Reuse Atomic primitives for image, badges, price, rating and metadata | Design system + module UI |
| Responsive admin resource management | Use shared resource shell, DataView and pagination primitives | Admin Core |
| Admin filters/search/sort | Typed resource filters carried through URL/SSR | Admin Core + module loaders |
| MediaPickerModal | Reuse Atomic shared Media/MediaPicker | Media Core |
| Upload validation and replacement lifecycle | Harden the shared Media lifecycle, never Blog-specific storage | Media Core |
| Multilingual editor tabs | Shared localization/editor workflow | Localization + Content |
| Automatic slug then manual override | Preserve as a generic editorial form behavior | Content/Admin |
| Admin toast/feedback | Shared accessible feedback primitive | Admin Core |
| Unsaved form protection | Shared dirty-form guard | Admin Core |
| Ratings/reviews/comments/reports | Shared engagement/moderation capabilities with module opt-in | Engagement/Moderation Core |
| Notifications | Shared notification capability; modules emit domain events | Notification Core |
| Audit trail | Shared audit service | Platform Core |
| Taxonomy/category/tag patterns | Shared taxonomy contracts, explicit domain relations | Taxonomy Core |
| Search facets | Shared search adapter/filter contract | Search Core |
| Content cards with domain metadata | Module-specific projection on shared UI primitives | Module UI |
| Service/module variants | Variant contract/token-driven styles, not copied visual themes | Design System |
| Blog-specific REST endpoint | Rejected; Atomic Actions remain canonical | Atomic Actions |
| `jsonb` as primary localization storage | Rejected; keep relational locale rows | Drizzle schemas |
| Dedicated `blog_media` | Rejected; use shared Media | Media Core |
| Separate author identity | Rejected for now; Atomic User remains canonical | Auth/Profile |
| Generic polymorphic content table | Rejected; keep explicit module entities | Domain schemas |

## Future module rule

A new module should be able to reuse the platform for media, localization, SEO, workflow, revision, locks, moderation, notifications, search and admin without creating a second implementation of those capabilities.

A module may still introduce domain-specific concepts when the domain truly requires them. For example, Shop may own inventory and orders; Courses may own enrollment and progress. Those are transactional/domain cores, not CMS primitives.
