import { defineAction, ActionError } from "astro:actions";
import { and, eq } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { services, serviceTranslations, serviceCategoryLinks, serviceTagLinks, serviceSeo, serviceRevisions } from "@database/schemas";
import { sanitizeHtml } from "@/lib/sanitize";
import { generateExcerpt } from "@/core/content/text";
import { serviceFormSchema, serviceUpdateSchema, calculateServiceSeoScore } from "@/modules/services/validation";
import { serviceRateLimit, assertServicePermission, resolveServiceTenant, assertServiceInTenant, assertServiceCategoryInTenant, assertServiceTagInTenant, assertServiceMediaInTenant } from "@/modules/services/permissions";
import { auditService, invalidateServicesCache } from "./_helpers";

export const createService = defineAction({
  input: serviceFormSchema,
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input);
    const user = await assertServicePermission(context, tenant, { service: ["create"] });
    serviceRateLimit(context, user.id, "create");
    if (input.status !== "DRAFT" || input.publishedAt !== null) throw new ActionError({ code: "BAD_REQUEST", message: "Un service doit être créé en brouillon. Utilisez la publication explicite ensuite." });
    const content = sanitizeHtml(input.content);
    const excerpt = input.excerpt?.trim() || generateExcerpt(content);
    const seoScore = calculateServiceSeoScore({ title: input.title, metaTitle: input.metaTitle, metaDescription: input.metaDescription, focusKeyword: input.focusKeyword });
    await Promise.all(input.categoryIds.map((id) => assertServiceCategoryInTenant(id, tenant)));
    await Promise.all(input.tagIds.map((id) => assertServiceTagInTenant(id, tenant)));
    if (input.coverImageId) await assertServiceMediaInTenant(input.coverImageId, tenant);
    if (input.ogImageId) await assertServiceMediaInTenant(input.ogImageId, tenant);
    const db = getDrizzle();
    let createdId = "";
    try {
      await db.transaction(async (tx) => {
        const [created] = await tx.insert(services).values({ organizationId: tenant.organizationId, providerId: user.id, slug: input.slug, status: "DRAFT", coverImageId: input.coverImageId ?? null, priceMinor: input.priceMinor ?? null, currency: input.currency ?? null, durationMinutes: input.durationMinutes ?? null, maxParticipants: input.maxParticipants ?? null, isMobile: input.isMobile, isFeatured: input.isFeatured, seoScore, publishedAt: null, updatedBy: user.id }).returning({ id: services.id });
        createdId = created.id;
        await tx.insert(serviceTranslations).values({ serviceId: created.id, organizationId: tenant.organizationId, locale: input.locale, title: input.title, slug: input.slug, excerpt, content, locationLabel: input.locationLabel ?? null, locationAddress: input.locationAddress ?? null, ogImageId: input.ogImageId ?? null, metaTitle: input.metaTitle ?? input.title, metaDescription: input.metaDescription ?? null, metaKeywords: input.metaKeywords ?? null, canonicalUrl: input.canonicalUrl ?? null, ogTitle: input.ogTitle ?? null, ogDescription: input.ogDescription ?? null });
        if (input.categoryIds.length) await tx.insert(serviceCategoryLinks).values(input.categoryIds.map((categoryId) => ({ serviceId: created.id, categoryId })));
        if (input.tagIds.length) await tx.insert(serviceTagLinks).values(input.tagIds.map((tagId) => ({ serviceId: created.id, tagId })));
        await tx.insert(serviceRevisions).values({ serviceId: created.id, authorId: user.id, locale: input.locale, title: input.title, slug: input.slug, content, excerpt, status: "DRAFT", revisionNote: "Création initiale" });
        await tx.insert(serviceSeo).values({ serviceId: created.id, locale: input.locale, focusKeyword: input.focusKeyword ?? null, focusKeywordScore: seoScore });
      });
    } catch (error) {
      if (error instanceof Error && /duplicate|unique/i.test(error.message)) throw new ActionError({ code: "CONFLICT", message: "Un service avec ce slug existe déjà pour ce tenant/locale." });
      throw error;
    }
    auditService(context, user.id, "SERVICE_CREATE", { resource: "services", resourceId: createdId, metadata: { organizationId: tenant.organizationId } });
    invalidateServicesCache();
    return { id: createdId };
  },
});

export const updateService = defineAction({
  input: serviceUpdateSchema,
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input);
    const user = await assertServicePermission(context, tenant, { service: ["update"] });
    serviceRateLimit(context, user.id, "update");
    const existing = await assertServiceInTenant(input.id, tenant);
    if (input.status !== undefined || input.publishedAt !== undefined) throw new ActionError({ code: "BAD_REQUEST", message: "La publication se gère via les actions de lifecycle explicites." });
    if (input.categoryIds) await Promise.all(input.categoryIds.map((id) => assertServiceCategoryInTenant(id, tenant)));
    if (input.tagIds) await Promise.all(input.tagIds.map((id) => assertServiceTagInTenant(id, tenant)));
    if (input.coverImageId) await assertServiceMediaInTenant(input.coverImageId, tenant);
    if (input.ogImageId) await assertServiceMediaInTenant(input.ogImageId, tenant);
    const db = getDrizzle();
    const locale = input.locale;
    const existingTranslation = locale ? (await db.select().from(serviceTranslations).where(and(eq(serviceTranslations.serviceId, input.id), eq(serviceTranslations.locale, locale))).limit(1))[0] : null;
    const existingSeo = locale ? (await db.select().from(serviceSeo).where(and(eq(serviceSeo.serviceId, input.id), eq(serviceSeo.locale, locale))).limit(1))[0] : null;
    const content = input.content !== undefined ? sanitizeHtml(input.content) : existingTranslation?.content;
    const excerpt = input.excerpt !== undefined ? input.excerpt?.trim() || (content ? generateExcerpt(content) : null) : existingTranslation?.excerpt;
    const seoScore = calculateServiceSeoScore({ title: input.title ?? existingTranslation?.title, metaTitle: input.metaTitle ?? existingTranslation?.metaTitle, metaDescription: input.metaDescription ?? existingTranslation?.metaDescription, focusKeyword: input.focusKeyword !== undefined ? input.focusKeyword : existingSeo?.focusKeyword ?? undefined });
    if (locale && !existingTranslation && (!input.title || !input.slug || !content)) throw new ActionError({ code: "BAD_REQUEST", message: "Le titre, le slug et le contenu sont requis pour une nouvelle traduction." });
    try {
      await db.transaction(async (tx) => {
        await tx.update(services).set({ ...(input.slug ? { slug: input.slug } : {}), ...(input.coverImageId !== undefined ? { coverImageId: input.coverImageId } : {}), ...(input.priceMinor !== undefined ? { priceMinor: input.priceMinor } : {}), ...(input.currency !== undefined ? { currency: input.currency } : {}), ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}), ...(input.maxParticipants !== undefined ? { maxParticipants: input.maxParticipants } : {}), ...(input.isMobile !== undefined ? { isMobile: input.isMobile } : {}), ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}), seoScore, updatedBy: user.id }).where(eq(services.id, input.id));
        if (locale) {
          if (existingTranslation) {
            await tx.update(serviceTranslations).set({ ...(input.title !== undefined ? { title: input.title, metaTitle: input.metaTitle ?? input.title } : {}), ...(input.slug !== undefined ? { slug: input.slug } : {}), ...(content !== undefined ? { content } : {}), ...(input.excerpt !== undefined ? { excerpt } : {}), ...(input.metaDescription !== undefined ? { metaDescription: input.metaDescription } : {}), ...(input.metaKeywords !== undefined ? { metaKeywords: input.metaKeywords } : {}), ...(input.canonicalUrl !== undefined ? { canonicalUrl: input.canonicalUrl } : {}), ...(input.ogTitle !== undefined ? { ogTitle: input.ogTitle } : {}), ...(input.ogDescription !== undefined ? { ogDescription: input.ogDescription } : {}), ...(input.ogImageId !== undefined ? { ogImageId: input.ogImageId } : {}), ...(input.locationLabel !== undefined ? { locationLabel: input.locationLabel } : {}), ...(input.locationAddress !== undefined ? { locationAddress: input.locationAddress } : {}), ...(input.metaTitle !== undefined ? { metaTitle: input.metaTitle } : {}) }).where(eq(serviceTranslations.id, existingTranslation.id));
          } else {
            await tx.insert(serviceTranslations).values({ serviceId: input.id, organizationId: tenant.organizationId, locale, title: input.title!, slug: input.slug!, content: content!, excerpt, locationLabel: input.locationLabel ?? null, locationAddress: input.locationAddress ?? null, metaTitle: input.metaTitle ?? input.title, metaDescription: input.metaDescription ?? null, metaKeywords: input.metaKeywords ?? null, canonicalUrl: input.canonicalUrl ?? null, ogTitle: input.ogTitle ?? null, ogDescription: input.ogDescription ?? null, ogImageId: input.ogImageId ?? null });
          }
          if (existingSeo) await tx.update(serviceSeo).set({ ...(input.focusKeyword !== undefined ? { focusKeyword: input.focusKeyword } : {}), focusKeywordScore: seoScore }).where(eq(serviceSeo.id, existingSeo.id));
          else await tx.insert(serviceSeo).values({ serviceId: input.id, locale, focusKeyword: input.focusKeyword ?? null, focusKeywordScore: seoScore });
        }
        if (input.categoryIds) { await tx.delete(serviceCategoryLinks).where(eq(serviceCategoryLinks.serviceId, input.id)); if (input.categoryIds.length) await tx.insert(serviceCategoryLinks).values(input.categoryIds.map((categoryId) => ({ serviceId: input.id, categoryId }))); }
        if (input.tagIds) { await tx.delete(serviceTagLinks).where(eq(serviceTagLinks.serviceId, input.id)); if (input.tagIds.length) await tx.insert(serviceTagLinks).values(input.tagIds.map((tagId) => ({ serviceId: input.id, tagId }))); }
        if (locale && (content || input.title || input.slug)) await tx.insert(serviceRevisions).values({ serviceId: input.id, authorId: user.id, locale, title: input.title ?? existingTranslation?.title ?? "", slug: input.slug ?? existingTranslation?.slug ?? "", content: content ?? existingTranslation?.content ?? "", excerpt: excerpt ?? null, status: existing.status === "PUBLISHED" ? "PUBLISHED" : existing.status === "ARCHIVED" ? "ARCHIVED" : "DRAFT", revisionNote: "Mise à jour" });
      });
    } catch (error) {
      if (error instanceof Error && /duplicate|unique/i.test(error.message)) throw new ActionError({ code: "CONFLICT", message: "Un service avec ce slug existe déjà pour ce tenant/locale." });
      throw error;
    }
    auditService(context, user.id, "SERVICE_UPDATE", { resource: "services", resourceId: input.id, metadata: { organizationId: tenant.organizationId } });
    invalidateServicesCache();
    return { id: input.id };
  },
});
