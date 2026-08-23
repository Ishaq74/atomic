import type { AtomicModuleDefinition } from "@/lib/cms/module-contract";
import { defineModuleCapabilities, defineModulePresentations } from "@/lib/cms/module-contract";

export const blogModule: AtomicModuleDefinition = {
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
  presentations: defineModulePresentations({
    card: ["default", "compact", "featured"],
    list: ["default", "dense", "search"],
    single: ["default", "reader"],
    ui: ["author", "meta", "rating", "taxonomy", "publication"],
  }),
};
