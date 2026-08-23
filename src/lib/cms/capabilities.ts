import type { ModuleCapability } from "./module-contract";

export interface CmsCapabilityDefinition {
  readonly id: ModuleCapability;
  readonly purpose: string;
  readonly implementations: readonly string[];
}

export const CMS_CAPABILITIES: Readonly<Record<ModuleCapability, CmsCapabilityDefinition>> = {
  content: {
    id: "content",
    purpose: "Shared editorial content editing, rendering, sanitization and internal-link resolution.",
    implementations: ["src/components/content/ContentEditor.astro", "src/components/content/RichContent.astro", "src/lib/content/editor-helpers.ts", "src/lib/content/internal-link-resolver.ts"],
  },
  localization: {
    id: "localization",
    purpose: "Locale validation, localized routing and localized editorial UI/content.",
    implementations: ["src/i18n/config.ts", "src/i18n/utils.ts", "src/components/content/ContentEditor.astro"],
  },
  media: {
    id: "media",
    purpose: "Shared media ownership, storage lifecycle, validation and selection/upload UX.",
    implementations: ["src/database/schemas/media.schema.ts", "src/database/loaders/media.loader.ts", "src/actions/admin/media.ts", "src/components/atoms/media-picker/MediaPicker.astro"],
  },
  seo: {
    id: "seo",
    purpose: "Localized SEO metadata, canonical/OG metadata and structured content validation.",
    implementations: ["src/database/schemas/blog.schema.ts", "src/database/loaders/blog-admin-editor.loader.ts", "src/lib/blog/validation.ts"],
  },
  taxonomy: {
    id: "taxonomy",
    purpose: "Explicit category/tag structures, localized terms and domain relations with shared hierarchy invariants.",
    implementations: ["src/database/schemas/blog.schema.ts", "src/database/loaders/blog.loader.ts", "src/actions/blog/category.ts", "src/actions/blog/tag.ts", "src/lib/cms/taxonomy.ts"],
  },
  search: {
    id: "search",
    purpose: "Searchable projections, filtering, ranking and URL/SSR-friendly query state.",
    implementations: ["src/database/loaders/blog.loader.ts", "blog_post_translations.search_vector + GIN index"],
  },
  publication: {
    id: "publication",
    purpose: "Domain-defined lifecycle validation with explicit actions and audit/cache side effects.",
    implementations: ["src/lib/cms/workflow.ts", "src/actions/blog/lifecycle.ts"],
  },
  revisions: {
    id: "revisions",
    purpose: "Non-destructive editorial history and restoration.",
    implementations: ["src/database/schemas/blog.schema.ts", "src/actions/blog/post.ts"],
  },
  locks: {
    id: "locks",
    purpose: "Concurrent-editor protection with expiry and refresh semantics.",
    implementations: ["src/database/schemas/blog.schema.ts", "src/actions/blog/post.ts", "src/components/blog/AdminPostForm.astro"],
  },
  engagement: {
    id: "engagement",
    purpose: "Domain-opt-in comments, reviews, reactions and favorites primitives.",
    implementations: ["src/database/schemas/blog.schema.ts", "src/actions/blog/comment.ts", "src/actions/blog/review.ts", "src/actions/blog/reaction.ts"],
  },
  moderation: {
    id: "moderation",
    purpose: "Comments/reviews/reports moderation and tenant-scoped moderation queues.",
    implementations: ["src/database/schemas/blog.schema.ts", "src/actions/blog/moderation.ts", "src/components/blog/AdminModerationQueue.astro"],
  },
  notifications: {
    id: "notifications",
    purpose: "Domain notification persistence and delivery-facing actions.",
    implementations: ["src/database/schemas/blog.schema.ts", "src/actions/blog/notification.ts", "src/components/blog/NotificationBell.astro"],
  },
  audit: {
    id: "audit",
    purpose: "Structured audit events shared by platform and domain actions.",
    implementations: ["src/lib/audit.ts", "src/actions/blog/_helpers.ts"],
  },
  cache: {
    id: "cache",
    purpose: "Shared cache reads and targeted invalidation used by CMS loaders/actions.",
    implementations: ["src/database/cache.ts", "src/actions/blog/_helpers.ts", "src/database/loaders/blog.loader.ts"],
  },
};

export function getCmsCapability(id: ModuleCapability): CmsCapabilityDefinition {
  return CMS_CAPABILITIES[id];
}
