import { defineAction, ActionError } from "astro:actions";
import { and, eq, isNull, ne } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { services, serviceTranslations, serviceCategoryLinks, serviceTagLinks, serviceSeo, serviceRevisions } from "@database/schemas";
import { sanitizeHtml } from "@/lib/sanitize";
import { generateExcerpt } from "@/lib/blog/utils";
import { serviceFormSchema, serviceOrganizationIdSchema, serviceUpdateSchema, calculateServiceSeoScore } from "@/modules/services/validation";
import { serviceRateLimit, assertServicePermission, resolveServiceTenant, assertServiceInTenant, assertServiceCategoryInTenant, assertServiceTagInTenant, assertServiceMediaInTenant } from "@/modules/services/permissions";
import { auditService, invalidateServicesCache } from "./_helpers";

export const createService = defineAction({
  input: serviceFormSchema,
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input);
    const user = await assertServicePermission(context, tenant, { service: ["create"] });
    serviceRateLimit(context, user.id, "create");
    const content = sanitizeHtml(input.content);
    const excerpt = input.excerpt?.trim() || generateExcerpt(content);
    const seoScore = calculateServiceSeoScore({ title: input.title, metaTitle: input.title });

    await Promise.all(input.categoryIds.map((id) => assertServiceCategoryInTenant(id, tenant)));
    await Promise.all(input.tagIds.map((id) => assertServiceTagInTenant(id, tenant)));
    if (input.coverImageId) await assertServiceMediaInTenant(input.coverImageId, tenant);
    if (input.ogImageId) await assertServiceMediaInTenant(input.ogImageId, tenant);

    const db = getDrizzle();
    let createdId = "";
    try {
      await db.transaction(async (tx) => {
        const [created] = await tx.insert(services).values({
          organizationId: tenant.organizationId,
          providerId: user.id,
          slug: input.slug,
          status: input.status,
          coverImageId: input.coverImageId ?? null,
          priceMinor: input.priceMinor ?? null,
          currency: input.currency ?? null,
          durationMinutes: input.durationMinutes ?? null,
          maxParticipants: input.maxParticipants ?? null,
          isMobile: input.isMobile,
          isFeatured: input.isFeatured,
          seoScore,
          publishedAt: input.status === "PUBLISHED" ? input.publishedAt ?? new Date() : null,
          updatedBy: user.id,
        }).returning({ id: services.id });
        createdId = created.id;
        await tx.insert(serviceTranslations).values({ serviceId: created.id, organizationId: tenant.organizationId, locale: input.locale, title: input.title, slug: input.slug, excerpt, content, ogImageId: input.ogImageId ?? null, metaTitle: input.title });
        if (input.categoryIds.length) await tx.insert(serviceCategoryLinks).values(input.categoryIds.map((categoryId) => ({ serviceId: created.id, categoryId })));
        if (input.tagIds.length) await tx.insert(serviceTagLinks).values(input.tagIds.map((tagId) => ({ serviceId: created.id, tagId })));
        await tx.insert(serviceRevisions).values({ serviceId: created.id, authorId: user.id, locale: input.locale, title: input.title, slug: input.slug, content, excerpt, status: input.status === "PUBLISHED" ? "PUBLISHED" : input.status === "ARCHIVED" ? "ARCHIVED" : "DRAFT", revisionNote: "Création initiale" });
        await tx.insert(serviceSeo).values({ serviceId: created.id, locale: input.locale, focusKeywordScore: seoScore });
      });
    } catch (error) {
      if (error instanceof Error && /duplicate|unique/i.test(error.message)) throw new ActionError({ code: "CONFLICT", message: "Un service avec ce slug existe déjà pour ce tenant/locale." });
      throw error;
    }
    auditService(context, user.id, "BLOG_POST_CREATE", { resource: "services", resourceId: createdId, metadata: { organizationId: tenant.organizationId } });
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
    const content = input.content !== undefined ? sanitizeHtml(input.content) : existingTranslation?.content;
    const excerpt = input.excerpt !== undefined ? input.excerpt?.trim() || (content ? generateExcerpt(content) : null) : existingTranslation?.excerpt;
    const seoScore = calculateServiceSeoScore({ title: input.title ?? existingTranslation?.title, metaTitle: input.title ?? existingTranslation?.metaTitle, metaDescription: input.metaDescription ?? existingTranslation?.metaDescription });

    if (locale && !existingTranslation && (!input.title || !input.slug || !content)) throw new ActionError({ code: "BAD_REQUEST", message: "Le titre, le slug et le contenu sont requis pour une nouvelle traduction." });
    try {
      await db.transaction(async (tx) => {
        await tx.update(services).set({
          ...(input.slug ? { slug: input.slug } : {}),
          coverImageId: input.coverImageId,
          priceMinor: input.priceMinor,
          currency: input.currency,
          durationMinutes: input.durationMinutes,
          maxParticipants: input.maxParticipants,
          isMobile: input.isMobile,
          isFeatured: input.isFeatured,
          seoScore,
          updatedBy: user.id,
        }).where(eq(services.id, input.id));
        if (locale) {
          if (existingTranslation) {
            await tx.update(serviceTranslations).set({ title: input.title, slug: input.slug, content, excerpt, metaTitle: input.title ?? existingTranslation.metaTitle, metaDescription: input.metaDescription, metaKeywords: input.metaKeywords, canonicalUrl: input.canonicalUrl, ogTitle: input.ogTitle, ogDescription: input.ogDescription, ogImageId: input.ogImageId }).where(eq(serviceTranslations.id, existingTranslation.id));
          } else {
            await tx.insert(serviceTranslations).values({ serviceId: input.id, organizationId: tenant.organizationId, locale, title: input.title!, slug: input.slug!, content: content!, excerpt, metaTitle: input.title, metaDescription: input.metaDescription, metaKeywords: input.metaKeywords, canonicalUrl: input.canonicalUrl, ogTitle: input.ogTitle, ogDescription: input.ogDescription, ogImageId: input.ogImageId });
          }
          await tx.update(serviceSeo).set({ focusKeywordScore: seoScore }).where(and(eq(serviceSeo.serviceId, input.id), eq(serviceSeo.locale, locale)));
        }
        if (input.categoryIds) {
          await tx.delete(serviceCategoryLinks).where(eq(serviceCategoryLinks.serviceId, input.id));
          if (input.categoryIds.length) await tx.insert(serviceCategoryLinks).values(input.categoryIds.map((categoryId) => ({ serviceId: input.id, categoryId })));
        }
        if (input.tagIds) {
          await tx.delete(serviceTagLinks).where(eq(serviceTagLinks.serviceId, input.id));
          if (input.tagIds.length) await tx.insert(serviceTagLinks).values(input.tagIds.map((tagId) => ({ serviceId: input.id, tagId })));
        }
        if (locale && (content || input.title || input.slug)) {
          await tx.insert(serviceRevisions).values({ serviceId: input.id, authorId: user.id, locale, title: input.title ?? existingTranslation?.title ?? "", slug: input.slug ?? existingTranslation?.slug ?? "", content: content ?? existingTranslation?.content ?? "", excerpt: excerpt ?? null, status: existing.status === "PUBLISHED" ? "PUBLISHED" : existing.status === "ARCHIVED" ? "ARCHIVED" : "DRAFT", revisionNote: "Mise à jour" });
        }
      });
    } catch (error) {
      if (error instanceof Error && /duplicate|unique/i.test(error.message)) throw new ActionError({ code: "CONFLICT", message: "Un service avec ce slug existe déjà pour ce tenant/locale." });
      throw error;
    }
    auditService(context, user.id, "BLOG_POST_UPDATE", { resource: "services", resourceId: input.id, metadata: { organizationId: tenant.organizationId } });
    invalidateServicesCache();
    return { id: input.id };
  },
});

export const deleteService = defineAction({
  input: serviceOrganizationIdSchema.transform(() => ({})),
  handler: async () => {
    throw new ActionError({ code: "BAD_REQUEST", message: "Utilisez l'action de suppression explicite du lifecycle." });
  },
});
