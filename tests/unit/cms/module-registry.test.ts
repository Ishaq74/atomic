import { describe, expect, it, beforeEach } from "vitest";
import { clearModuleRegistryForTests, getModule, listModules, registerModule } from "@/lib/cms/module-registry";

const moduleA = {
  id: "module-a",
  entity: "entity_a",
  capabilities: {
    localization: false,
    media: false,
    seo: false,
    taxonomy: false,
    search: false,
    publication: false,
    revisions: false,
    locks: false,
    moderation: false,
    notifications: false,
    audit: true,
  },
  presentations: { card: ["default"], list: ["default"], single: ["default"], ui: [] },
} as const;

describe("Atomic module registry", () => {
  beforeEach(() => clearModuleRegistryForTests());

  it("registers, retrieves and lists modules deterministically", () => {
    registerModule(moduleA);
    expect(getModule("module-a")).toEqual(moduleA);
    expect(listModules()).toEqual([moduleA]);
  });

  it("rejects duplicate module ids", () => {
    registerModule(moduleA);
    expect(() => registerModule(moduleA)).toThrow("Atomic module already registered: module-a");
  });
});
