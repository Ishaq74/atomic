import type {
  AtomicModuleDefinition,
  AtomicModuleCapabilityProviders,
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
  capabilityProviders: defineModuleCapabilityProviders(blogCapabilityProviders satisfies AtomicModuleCapabilityProviders),
  presentations: defineModulePresentations({
    card: ["default", "compact", "featured"],
    list: ["default", "dense", "search"],
    single: ["default", "reader"],
    ui: ["author", "meta", "rating", "taxonomy", "publication"],
  }),
};

assertModuleCapabilityProviders(blogModule);
