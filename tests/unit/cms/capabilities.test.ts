import { describe, expect, it } from "vitest";
import { CMS_CAPABILITIES } from "@/lib/cms/capabilities";

const capabilities = [
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

describe("CMS capability catalog", () => {
  it("contains every platform capability", () => {
    expect(Object.keys(CMS_CAPABILITIES).sort()).toEqual([...capabilities].sort());
  });

  it("has at least one authoritative implementation for every capability", () => {
    for (const id of capabilities) {
      const definition = CMS_CAPABILITIES[id];
      expect(definition.id).toBe(id);
      expect(definition.purpose.length).toBeGreaterThan(10);
      expect(definition.implementations.length).toBeGreaterThan(0);
      for (const implementation of definition.implementations) {
        expect(implementation.length).toBeGreaterThan(0);
      }
    }
  });
});
