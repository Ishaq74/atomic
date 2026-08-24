import { describe, expect, it } from "vitest";
import { servicesModule } from "@/modules/services/module";
import { serviceAdminResource } from "@/modules/services/admin";
import { assertAcyclicParent } from "@/core/taxonomy";
import { formatServiceDuration, formatServicePrice, formatServiceRating } from "@/modules/services/utils";

describe("Services module contract", () => {
  it("declares the expected CMS capabilities and presentation grammar", () => {
    expect(servicesModule.id).toBe("services");
    expect(servicesModule.entity).toBe("service");
    expect(servicesModule.capabilities.content).toBe(true);
    expect(servicesModule.capabilities.localization).toBe(true);
    expect(servicesModule.capabilities.moderation).toBe(true);
    expect(servicesModule.capabilities.notifications).toBe(true);
    expect(servicesModule.presentations.card).toEqual(expect.arrayContaining(["default", "compact", "featured"]));
    expect(servicesModule.presentations.list).toEqual(expect.arrayContaining(["default", "dense", "search"]));
    expect(servicesModule.presentations.single).toEqual(expect.arrayContaining(["default", "detail"]));
    expect(servicesModule.presentations.ui).toEqual(expect.arrayContaining(["price", "rating", "availability", "provider"]));
  });

  it("exposes a real admin resource contract", () => {
    expect(serviceAdminResource.id).toBe("service");
    expect(serviceAdminResource.management).toEqual(expect.objectContaining({ list: true, search: true, filters: true, sort: true, pagination: true, stats: true }));
    expect(serviceAdminResource.actions).toEqual(expect.objectContaining({ create: true, read: true, update: true, duplicate: true, publish: true, unpublish: true, archive: true, restore: true, delete: true }));
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
