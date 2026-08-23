import { describe, expect, it } from "vitest";
import { assertResourceCompatibility, type AdminResourceDefinition } from "@/lib/cms/resource-contract";

const moduleDefinition = {
  id: "blog",
  entity: "blog_post",
  capabilities: {
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
  },
  capabilityProviders: {
    content: "content",
    localization: "localization",
    media: "media",
    seo: "seo",
    taxonomy: "taxonomy",
    search: "search",
    publication: "publication",
    revisions: "revisions",
    locks: "locks",
    engagement: "engagement",
    moderation: "moderation",
    notifications: "notifications",
    audit: "audit",
    cache: "cache",
  },
  presentations: {
    card: ["default"],
    list: ["default"],
    single: ["default"],
    ui: [],
  },
} as const;

describe("Atomic admin resource contract", () => {
  it("accepts matching entity and capability contracts", () => {
    const resource: AdminResourceDefinition = {
      id: "blog-post",
      entity: "blog_post",
      actions: { read: true, publish: true, archive: true },
    };
    expect(() => assertResourceCompatibility(moduleDefinition, resource)).not.toThrow();
  });

  it("rejects publication actions without publication capability", () => {
    const resource: AdminResourceDefinition = {
      id: "resource",
      entity: "blog_post",
      actions: { publish: true },
    };
    const withoutPublication = {
      ...moduleDefinition,
      capabilities: { ...moduleDefinition.capabilities, publication: false },
    } as const;
    expect(() => assertResourceCompatibility(withoutPublication, resource)).toThrow("does not enable publication");
  });

  it("rejects a resource owned by another module", () => {
    const resource: AdminResourceDefinition = {
      id: "service",
      entity: "service",
      actions: { read: true },
    };
    expect(() => assertResourceCompatibility(moduleDefinition, resource)).toThrow("owns blog_post");
  });

  it("rejects list-dependent management without list support", () => {
    const resource: AdminResourceDefinition = {
      id: "resource",
      entity: "blog_post",
      management: { search: true },
    };
    expect(() => assertResourceCompatibility(moduleDefinition, resource)).toThrow("without list capability");
  });
});
