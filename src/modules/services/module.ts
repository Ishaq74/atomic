import type { AtomicModuleDefinition } from "@/lib/cms/module-contract";
import { assertModuleCapabilityProviders, defineModuleCapabilities, defineModuleCapabilityProviders, defineModulePresentations } from "@/lib/cms/module-contract";
import { servicesCapabilityProviders } from "./capabilities";

export const servicesModule: AtomicModuleDefinition = {
  id: "services",
  entity: "service",
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
  capabilityProviders: defineModuleCapabilityProviders(servicesCapabilityProviders),
  presentations: defineModulePresentations({
    card: ["default", "compact", "featured", "horizontal"],
    list: ["default", "dense", "search"],
    single: ["default", "detail"],
    ui: ["price", "rating", "meta", "taxonomy", "availability", "provider"],
  }),
};

assertModuleCapabilityProviders(servicesModule);
