import type { AtomicModuleDefinition } from "@/lib/cms/module-contract";
import { defineModuleCapabilities } from "@/lib/cms/module-contract";
import type { BlogPostFilters, BlogPostListItem } from "@/lib/blog/types";

export const blogModule: AtomicModuleDefinition<BlogPostListItem, BlogPostFilters> = {
  id: "blog",
  entity: "blog_post",
  capabilities: defineModuleCapabilities({
    localization: true,
    media: true,
    seo: true,
    taxonomy: true,
    search: true,
    publication: true,
    revisions: true,
    locks: true,
    moderation: true,
    notifications: true,
    audit: true,
  }),
  entityType: {} as BlogPostListItem,
  filterType: {} as BlogPostFilters,
};
