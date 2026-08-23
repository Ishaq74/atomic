import type {
  AtomicModuleCapabilityProviders,
  AtomicModuleDefinition,
} from "@/lib/cms/module-contract";
import {
  assertModuleCapabilityProviders,
  defineModuleCapabilities,
  defineModuleCapabilityProviders,
  defineModulePresentations,
} from "@/lib/cms/module-contract";
import { blogCapabilityProviders } from "@/lib/blog/capabilities";

export const blogModule: AtomicModuleDefinition = {
  id: "blog",
  entity: "blog_post",
  capabilities: defineModuleCapabilities({
    content: true,
    localization: true,
    media: true,
    seo: true,
    taxonomy: true,
    search: true,
    publication: true,
    revisions: true,
    locks: true,
    engagement: true,
    moderation: true,
    notifications: true,
    audit: true,
    cache: true,
  }),
  capabilityProviders: defineModuleCapabilityProviders(
    blogCapabilityProviders satisfies AtomicModuleCapabilityProviders,
  ),
  presentations: defineModulePresentations({
    card: ["default", "compact", "featured"],
    list: ["default", "dense", "search"],
    single: ["default", "reader"],
    ui: ["author", "meta", "rating", "taxonomy", "publication"],
  }),
};

assertModuleCapabilityProviders(blogModule);
