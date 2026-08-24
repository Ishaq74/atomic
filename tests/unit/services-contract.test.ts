import { describe, expect, it } from "vitest";
import { servicesModule } from "@/modules/services/module";
import { serviceAdminResource } from "@/modules/services/admin";
import { assertAcyclicParent } from "@/core/taxonomy";
import { formatServiceDuration, formatServicePrice, formatServiceRating } from "@/modules/services/utils";

describe("Services module contract", () => {
  it("declares the expected CMS capabilities and presentation grammar", () => {
    expect(servicesModule.name).toBe("services");
    expect(servicesModule.capabilities).toEqual(expect.arrayContaining([
      "content", "localization", "media", "seo", "taxonomy", "search", "workflow", "revision", "locks", "engagement", "moderation", "notifications", "audit", "cache",
    ]));
    expect(servicesModule.presentation).toEqual(expect.objectContaining({ card: expect.anything(), list: expect.anything(), single: expect.anything(), ui: expect.anything() }));
  });

  it("exposes a real admin resource contract", () => {
    expect(serviceAdminResource.id).toBe("services");
    expect(serviceAdminResource.capabilities).toEqual(expect.arrayContaining(["list", "search", "filters", "sort", "pagination", "stats", "create", "update", "delete"]));
  });
});

describe("Services taxonomy", () => {
  it("rejects self-parenting and ancestor cycles", () => {
    const nodes = [
      { id: "a", parentId: null },
      { id: "b", parentId: "a" },
      { id: "c", parentId: "b" },
    ];
    expect(() => assertAcyclicParent(nodes, "a", "a")).toThrow();
    expect(() => assertAcyclicParent(nodes, "a", "c")).toThrow();
    expect(() => assertAcyclicParent(nodes, "c", "a")).not.toThrow();
  });
});

describe("Services utilities", () => {
  it("formats duration, rating and price deterministically", () => {
    expect(formatServiceDuration(45)).toBe("45 min");
    expect(formatServiceDuration(90)).toBe("1 h 30 min");
    expect(formatServiceRating(450)).toBe(4.5);
    expect(formatServicePrice(1250, "EUR", "fr-FR")).toContain("12,50");
  });
});
