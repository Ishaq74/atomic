import type { AtomicModuleCapabilityProviders } from "@/lib/cms/module-contract";

/**
 * Blog does not duplicate platform services. This catalog binds each capability
 * to the existing Atomic implementation that the Blog already consumes.
 */
export const blogCapabilityProviders: AtomicModuleCapabilityProviders = {
  localization: "src/i18n/config.ts + src/i18n/utils.ts + src/components/content/ContentEditor.astro",
  media: "src/database/schemas/media.schema.ts + src/database/loaders/media.loader.ts + src/actions/admin/media.ts + src/components/atoms/media-picker/MediaPicker.astro",
  seo: "src/database/schemas/blog.schema.ts (blog_post_seo) + src/database/loaders/blog-admin-editor.loader.ts + src/lib/blog/validation.ts",
  taxonomy: "src/database/schemas/blog.schema.ts (blog_categories/blog_tags) + src/database/loaders/blog.loader.ts + src/actions/blog/category.ts + src/actions/blog/tag.ts",
  search: "src/database/loaders/blog.loader.ts + PostgreSQL search_vector/GIN index on blog_post_translations",
  publication: "src/lib/cms/workflow.ts + src/actions/blog/lifecycle.ts",
  revisions: "src/database/schemas/blog.schema.ts (blog_post_revisions) + src/actions/blog/post.ts + revision restore action",
  locks: "src/database/schemas/blog.schema.ts (blog_post_locks) + src/actions/blog/post.ts + AdminPostForm lock lifecycle",
  moderation: "src/database/schemas/blog.schema.ts (comments/reviews/reports moderation) + src/actions/blog/moderation.ts",
  notifications: "src/database/schemas/blog.schema.ts (blog_notifications) + src/actions/blog/notification.ts",
  audit: "src/lib/audit.ts + src/actions/blog/_helpers.ts (auditBlog)",
};
