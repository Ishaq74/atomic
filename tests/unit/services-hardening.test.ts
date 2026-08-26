import { describe, expect, it } from "vitest";
import { getServiceErrorMessage, getServiceTranslations } from "@/modules/services/i18n";
import { serviceAttributeDefinitionSchema, serviceAttributeValueSchema } from "@/actions/services/attributes";
import { serviceAvailabilitySchema, serviceCreateSchema } from "@/modules/services/validation";
import { servicesSearchDefinition } from "@/modules/services/search";
import { serviceAdminResource } from "@/modules/services/admin";
import { servicesModule } from "@/modules/services/module";
import { buildServiceCategoryUrl, buildServiceUrl } from "@/modules/services/utils/urls";

const locales = ["fr", "en", "es", "ar"] as const;

describe("Services hardening", () => {
  it("keeps all user-facing core messages available in every supported locale", () => {
    for (const locale of locales) {
      const t = getServiceTranslations(locale);
      expect(t.meta.title).toBeTruthy();
      expect(t.admin.title).toBeTruthy();
      for (const code of ["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "CONFLICT", "BAD_REQUEST", "TOO_MANY_REQUESTS"]) {
        expect(getServiceErrorMessage(locale, code)).toBeTruthy();
      }
    }
  });

  it("validates dynamic attribute definitions and value representations", () => {
    const base = { organizationId: null, locale: "fr", key: "material", label: "Material", type: "STRING" as const, options: [], required: false, sortOrder: 0 };
    expect(serviceAttributeDefinitionSchema.safeParse(base).success).toBe(true);
    expect(serviceAttributeDefinitionSchema.safeParse({ ...base, type: "STRING", options: ["cotton"] }).success).toBe(false);
    expect(serviceAttributeDefinitionSchema.safeParse({ ...base, type: "SELECT", options: [] }).success).toBe(false);
    expect(serviceAttributeDefinitionSchema.safeParse({ ...base, type: "SELECT", options: ["cotton"] }).success).toBe(true);

    const serviceId = crypto.randomUUID();
    const definitionId = crypto.randomUUID();
    expect(serviceAttributeValueSchema.safeParse({ serviceId, definitionId, organizationId: null, locale: "fr", stringValue: "cotton" }).success).toBe(true);
    expect(serviceAttributeValueSchema.safeParse({ serviceId, definitionId, organizationId: null, locale: "fr", stringValue: "cotton", numberValue: 3 }).success).toBe(false);
  });

  it("keeps availability validation deterministic", () => {
    const serviceId = crypto.randomUUID();
    expect(serviceAvailabilitySchema.safeParse({ serviceId, organizationId: null, locale: "ar", dayOfWeek: 2, startTime: "09:00", endTime: "12:00", timezone: "Europe/Paris" }).success).toBe(true);
    expect(serviceAvailabilitySchema.safeParse({ serviceId, organizationId: null, locale: "ar", dayOfWeek: 7, startTime: "09:00", endTime: "12:00", timezone: "Europe/Paris" }).success).toBe(false);
  });

  it("keeps the admin resource, search adapter and presentation module aligned", () => {
    expect(servicesModule.entity).toBe("service");
    expect(serviceAdminResource.entity).toBe(servicesModule.entity);
    expect(serviceAdminResource.management.list).toBe(true);
    expect(serviceAdminResource.actions.duplicate).toBe(true);
    expect(servicesSearchDefinition.resourceId).toBe(serviceAdminResource.entity);
    expect(servicesModule.presentations.card).toContain("featured");
    expect(servicesModule.presentations.single).toContain("detail");
  });

  it("builds canonical global and organization URLs deterministically", () => {
    expect(buildServiceUrl("fr", null, "service-a")).toBe("/fr/services/service-a");
    expect(buildServiceUrl("fr", "org-1", "service-a", "category-a")).toBe("/fr/organizations/org-1/services/category-a/service-a");
    expect(buildServiceCategoryUrl("ar", "org-1", "category-a")).toBe("/ar/organizations/org-1/services/category-a");
  });

  it("never puts publication state in the create schema", () => {
    const parsed = serviceCreateSchema.parse({ organizationId: null, locale: "fr", title: "Service", slug: "service", content: "<p>Content</p>", categoryIds: [], tagIds: [] });
    expect("status" in parsed).toBe(false);
    expect("publishedAt" in parsed).toBe(false);
  });
});
