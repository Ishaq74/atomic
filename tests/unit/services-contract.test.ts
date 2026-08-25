import { describe, expect, it } from "vitest";
import { servicesModule } from "@/modules/services/module";
import { serviceAdminResource } from "@/modules/services/admin";
import { assertAcyclicParent } from "@/core/taxonomy";
import { canTransitionService, assertValidServiceTransition } from "@/modules/services/workflow";
import { calculateServiceSeoScore, serviceFormSchema, serviceAvailabilitySchema } from "@/modules/services/validation";
import { servicesSearchDefinition } from "@/modules/services/search";
import { formatServiceDuration, formatServicePrice, formatServiceRating } from "@/modules/services/utils";

describe("Services module contract", () => {
  it("declares the expected CMS capabilities and presentation grammar", () => {
    expect(servicesModule.id).toBe("services");
    expect(servicesModule.entity).toBe("service");
    expect(servicesModule.capabilities.content).toBe(true);
    expect(servicesModule.capabilities.localization).toBe(true);
    expect(servicesModule.capabilities.media).toBe(true);
    expect(servicesModule.capabilities.seo).toBe(true);
    expect(servicesModule.capabilities.taxonomy).toBe(true);
    expect(servicesModule.capabilities.search).toBe(true);
    expect(servicesModule.capabilities.revisions).toBe(true);
    expect(servicesModule.capabilities.locks).toBe(true);
    expect(servicesModule.capabilities.engagement).toBe(true);
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
    expect(serviceAdminResource.list?.filters).toEqual(expect.arrayContaining(["search", "status", "categoryId", "tagId", "providerId", "featured", "mobile", "locale"]));
  });
});

describe("Services workflow", () => {
  it("accepts every legal transition and rejects illegal ones", () => {
    const legal: ["DRAFT" | "PUBLISHED" | "ARCHIVED" | "DELETED", "DRAFT" | "PUBLISHED" | "ARCHIVED" | "DELETED"][] = [
      ["DRAFT", "PUBLISHED"], ["DRAFT", "ARCHIVED"], ["DRAFT", "DELETED"],
      ["PUBLISHED", "DRAFT"], ["PUBLISHED", "ARCHIVED"], ["PUBLISHED", "DELETED"],
      ["ARCHIVED", "DRAFT"], ["ARCHIVED", "DELETED"], ["DELETED", "DRAFT"],
    ];
    for (const [from, to] of legal) expect(canTransitionService(from, to)).toBe(true);
    expect(canTransitionService("DELETED", "PUBLISHED")).toBe(false);
    expect(canTransitionService("ARCHIVED", "PUBLISHED")).toBe(false);
    expect(() => assertValidServiceTransition("DELETED", "PUBLISHED")).toThrow();
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

describe("Services validation", () => {
  const valid = {
    organizationId: null,
    locale: "fr",
    title: "Développement de site web",
    slug: "developpement-site-web",
    excerpt: "Création de sites web sur mesure.",
    content: "<p>Création de sites web sur mesure.</p>",
    status: "DRAFT" as const,
    publishedAt: null,
    coverImageId: null,
    ogImageId: null,
    priceMinor: 12500,
    currency: "EUR",
    durationMinutes: 90,
    maxParticipants: 4,
    isMobile: false,
    isFeatured: false,
    categoryIds: [],
    tagIds: [],
    metaTitle: "Développement de site web",
    metaDescription: "Création de sites web sur mesure.",
    locationLabel: null,
    locationAddress: null,
    focusKeyword: "site web",
  };

  it("accepts valid localized service input", () => {
    expect(serviceFormSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an unsupported locale, negative price and malformed slug", () => {
    expect(serviceFormSchema.safeParse({ ...valid, locale: "de" }).success).toBe(false);
    expect(serviceFormSchema.safeParse({ ...valid, priceMinor: -1 }).success).toBe(false);
    expect(serviceFormSchema.safeParse({ ...valid, slug: "Invalid Slug" }).success).toBe(false);
  });

  it("validates availability intervals", () => {
    expect(serviceAvailabilitySchema.safeParse({ serviceId: crypto.randomUUID(), dayOfWeek: 1, startTime: "09:00", endTime: "18:00", timezone: "Europe/Paris" }).success).toBe(true);
    expect(serviceAvailabilitySchema.safeParse({ serviceId: crypto.randomUUID(), dayOfWeek: 1, startTime: "18:00", endTime: "09:00", timezone: "Europe/Paris" }).success).toBe(false);
  });

  it("calculates a bounded SEO score", () => {
    expect(calculateServiceSeoScore({ title: "Titre", metaTitle: "Meta", metaDescription: "Description", focusKeyword: "clé" })).toBeGreaterThan(0);
    expect(calculateServiceSeoScore({ title: "x".repeat(100), metaTitle: "y".repeat(100), metaDescription: "z".repeat(120), focusKeyword: "clé" })).toBe(100);
  });
});

describe("Services search contract", () => {
  it("declares searchable, filterable and sortable service fields", () => {
    expect(servicesSearchDefinition.fields.find((field) => field.name === "title")?.searchable).toBe(true);
    expect(servicesSearchDefinition.fields.find((field) => field.name === "status")?.filterable).toBe(true);
    expect(servicesSearchDefinition.fields.find((field) => field.name === "priceMinor")?.sortable).toBe(true);
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
