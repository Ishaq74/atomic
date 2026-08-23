import type { AtomicModuleCapabilityProviders } from "@/lib/cms/module-contract";
import { CMS_CAPABILITIES } from "@/lib/cms/capabilities";

const capabilityIds = [
  "localization",
  "media",
  "seo",
  "taxonomy",
  "search",
  "publication",
  "revisions",
  "locks",
  "moderation",
  "notifications",
  "audit",
] as const;

/** Blog consumes the existing Atomic platform implementations without duplicating them. */
export const blogCapabilityProviders = Object.fromEntries(
  capabilityIds.map((id) => [id, CMS_CAPABILITIES[id].implementations.join(" + ")]),
) as AtomicModuleCapabilityProviders;
