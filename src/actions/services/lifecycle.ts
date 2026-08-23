import { defineAction, ActionError } from "astro:actions";
import { and, eq } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { services, serviceTranslations, serviceRevisions, serviceCategories, serviceCategoryLinks, serviceTags, serviceTagLinks, serviceMedia, serviceAvailability, serviceSeo } from "@database/schemas";
import { assertServicePermission, assertServiceInTenant, resolveServiceTenant, serviceOrganizationIdSchema } from "./_helpers";
import { assertValidServiceTransition } from "@/modules/services/workflow";
import type { ServiceStatus } from "@/modules/services/domain";
import { auditService, invalidateServicesCache } from "./_helpers";
import { z } from "astro/zod";

const lifecycleInput = z.object({ id: z.uuid(), organizationId: serviceOrganizationIdSchema });

async function transitionService(id: string, organizationId: string | null | undefined, to: ServiceStatus, context: Parameters<typeof assertServicePermission>[0], permission: "publish" | "update") {
  const tenant = resolveServiceTenant({ organizationId });
  const user = await assertServicePermission(context, tenant, { service: [permission] });
  const current = await assertServiceInTenant(id, tenant);
  assertValidServiceTransition(current.status as ServiceStatus, to);
  const db = getDrizzle();
  await db.transaction(async (tx) => {
    await tx.update(services).set({ status: to, publishedAt: to === "PUBLISHED" ? new Date() : to === "DRAFT" ? null : undefined, updatedBy: user.id }).where(eq(services.id, id));
  });
  auditService(context, user.id, `BLOG_POST_${to === "PUBLISHED" ? "PUBLISH" : to === "DRAFT" ? "UNPUBLISH" : to === "ARCHIVED" ? "ARCHIVE" : "DELETE"}` as never, { resource: "services", resourceId: id, metadata: { organizationId: tenant.organizationId } });
  invalidateServicesCache();
  return { success: true };
}

export const publishService = defineAction({ input: lifecycleInput, handler: (input, context) => transitionService(input.id, input.organizationId, "PUBLISHED", context, "publish") });
export const unpublishService = defineAction({ input: lifecycleInput, handler: (input, context) => transitionService(input.id, input.organizationId, "DRAFT", context, "publish") });
export const archiveService = defineAction({ input: lifecycleInput, handler: (input, context) => transitionService(input.id, input.organizationId, "ARCHIVED", context, "update") });
export const restoreService = defineAction({ input: lifecycleInput, handler: (input, context) => transitionService(input.id, input.organizationId, "DRAFT", context, "update") });
export const deleteService = defineAction({ input: lifecycleInput, handler: (input, context) => transitionService(input.id, input.organizationId, "DELETED", context, "update") });

export const duplicateService = defineAction({
  input: lifecycleInput,
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input);
    const user = await assertServicePermission(context, tenant, { service: ["create"] });
    const source = await assertServiceInTenant(input.id, tenant);
    const db = getDrizzle();
    const translations = await db.select().from(serviceTranslations).where(eq(serviceTranslations.serviceId, source.id));
    const categories = await db.select().from(serviceCategoryLinks).where(eq(serviceCategoryLinks.serviceId, source.id));
    const tags = await db.select().from(serviceTagLinks).where(eq(serviceTagLinks.serviceId, source.id));
    const media = await db.select().from(serviceMedia).where(eq(serviceMedia.serviceId, source.id));
    const availability = await db.select().from(serviceAvailability).where(eq(serviceAvailability.serviceId, source.id));
    const seo = await db.select().from(serviceSeo).where(eq(serviceSeo.serviceId, source.id));
    const baseSlug = `${source.slug}-copy`;
    let duplicateId = "";
    await db.transaction(async (tx) => {
      const [created] = await tx.insert(services).values({ organizationId: tenant.organizationId, providerId: user.id, slug: baseSlug, status: "DRAFT", coverImageId: source.coverImageId, priceMinor: source.priceMinor, currency: source.currency, durationMinutes: source.durationMinutes, maxParticipants: source.maxParticipants, isMobile: source.isMobile, isFeatured: false, seoScore: null, publishedAt: null, updatedBy: user.id }).returning({ id: services.id });
      duplicateId = created.id;
      for (const translation of translations) await tx.insert(serviceTranslations).values({ serviceId: duplicateId, organizationId: tenant.organizationId, locale: translation.locale, title: `${translation.title} (copy)`, slug: `${translation.slug}-copy`, excerpt: translation.excerpt, content: translation.content, locationLabel: translation.locationLabel, locationAddress: translation.locationAddress, metaTitle: translation.metaTitle, metaDescription: translation.metaDescription, metaKeywords: translation.metaKeywords, canonicalUrl: null, ogTitle: translation.ogTitle, ogDescription: translation.ogDescription, ogImageId: translation.ogImageId });
      if (categories.length) await tx.insert(serviceCategoryLinks).values(categories.map((row) => ({ serviceId: duplicateId, categoryId: row.categoryId })));
      if (tags.length) await tx.insert(serviceTagLinks).values(tags.map((row) => ({ serviceId: duplicateId, tagId: row.tagId })));
      if (media.length) await tx.insert(serviceMedia).values(media.map((row) => ({ serviceId: duplicateId, mediaId: row.mediaId, kind: row.kind, altText: row.altText, caption: row.caption, sortOrder: row.sortOrder })));
      if (availability.length) await tx.insert(serviceAvailability).values(availability.map((row) => ({ serviceId: duplicateId, dayOfWeek: row.dayOfWeek, startTime: row.startTime, endTime: row.endTime, timezone: row.timezone, maxParticipants: row.maxParticipants })));
      if (seo.length) await tx.insert(serviceSeo).values(seo.map((row) => ({ serviceId: duplicateId, locale: row.locale, focusKeyword: row.focusKeyword, focusKeywordScore: null, readabilityScore: null, metaRobots: row.metaRobots, metaOgType: row.metaOgType, metaOgLocale: row.metaOgLocale, schemaMarkup: row.schemaMarkup })));
      const first = translations[0];
      if (first) await tx.insert(serviceRevisions).values({ serviceId: duplicateId, authorId: user.id, locale: first.locale, title: `${first.title} (copy)`, slug: `${first.slug}-copy`, content: first.content, excerpt: first.excerpt, status: "DRAFT", revisionNote: "Duplication" });
    });
    auditService(context, user.id, "BLOG_POST_CREATE", { resource: "services", resourceId: duplicateId, metadata: { organizationId: tenant.organizationId, duplicatedFrom: source.id } });
    invalidateServicesCache();
    return { id: duplicateId };
  },
});

export const lockService = defineAction({
  input: lifecycleInput,
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input);
    const user = await assertServicePermission(context, tenant, { service: ["update"] });
    await assertServiceInTenant(input.id, tenant);
    const db = getDrizzle();
    const existing = (await db.select().from(require("@database/schemas").serviceLocks).where(eq(require("@database/schemas").serviceLocks.serviceId, input.id)).limit(1))[0];
    const now = new Date();
    if (existing && existing.userId !== user.id && existing.expiresAt > now) throw new ActionError({ code: "CONFLICT", message: "Ce service est en cours d'édition par un autre utilisateur." });
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const { serviceLocks } = await import("@database/schemas");
    await db.insert(serviceLocks).values({ serviceId: input.id, userId: user.id, sessionId: context.locals.session?.id ?? "unknown", expiresAt }).onConflictDoUpdate({ target: serviceLocks.serviceId, set: { userId: user.id, sessionId: context.locals.session?.id ?? "unknown", lockedAt: new Date(), expiresAt } });
    return { success: true, expiresAt };
  },
});

export const unlockService = defineAction({
  input: lifecycleInput,
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input);
    const user = await assertServicePermission(context, tenant, { service: ["update"] });
    await assertServiceInTenant(input.id, tenant);
    const { serviceLocks } = await import("@database/schemas");
    await getDrizzle().delete(serviceLocks).where(and(eq(serviceLocks.serviceId, input.id), eq(serviceLocks.userId, user.id)));
    return { success: true };
  },
});

export const listServiceRevisions = defineAction({ input: lifecycleInput, handler: async (input, context) => {
  const tenant = resolveServiceTenant(input);
  await assertServicePermission(context, tenant, { service: ["read"] });
  await assertServiceInTenant(input.id, tenant);
  return getDrizzle().select().from(serviceRevisions).where(eq(serviceRevisions.serviceId, input.id)).orderBy(serviceRevisions.createdAt).limit(50);
} });

export const restoreServiceRevision = defineAction({
  input: z.object({ postId: z.uuid().optional(), serviceId: z.uuid(), revisionId: z.uuid(), organizationId: serviceOrganizationIdSchema }),
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input);
    const user = await assertServicePermission(context, tenant, { service: ["update"] });
    const current = await assertServiceInTenant(input.serviceId, tenant);
    const db = getDrizzle();
    const [revision] = await db.select().from(serviceRevisions).where(and(eq(serviceRevisions.id, input.revisionId), eq(serviceRevisions.serviceId, input.serviceId))).limit(1);
    if (!revision) throw new ActionError({ code: "NOT_FOUND", message: "Révision introuvable." });
    assertValidServiceTransition(current.status as ServiceStatus, revision.status as ServiceStatus);
    await db.transaction(async (tx) => {
      await tx.update(services).set({ status: revision.status, slug: revision.slug, publishedAt: revision.status === "PUBLISHED" ? new Date() : null, updatedBy: user.id }).where(eq(services.id, input.serviceId));
      await tx.update(serviceTranslations).set({ title: revision.title, slug: revision.slug, content: revision.content, excerpt: revision.excerpt }).where(and(eq(serviceTranslations.serviceId, input.serviceId), eq(serviceTranslations.locale, revision.locale)));
      await tx.insert(serviceRevisions).values({ serviceId: input.serviceId, authorId: user.id, locale: revision.locale, title: revision.title, slug: revision.slug, content: revision.content, excerpt: revision.excerpt, status: revision.status, revisionNote: `Restauration de ${revision.id}` });
    });
    invalidateServicesCache();
    return { success: true };
  },
});
