import { ActionError, defineAction } from "astro:actions";
import { and, eq } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { services, serviceTranslations, serviceRevisions, serviceCategoryLinks, serviceTagLinks, serviceMedia, serviceAvailability, serviceSeo, serviceLocks, serviceAttributeValues } from "@database/schemas";
import { assertServicePermission, assertServiceInTenant, resolveServiceTenant, serviceOrganizationIdSchema } from "./_helpers";
import { assertValidServiceTransition } from "@/modules/services/workflow";
import type { ServiceStatus } from "@/modules/services/domain";
import { auditService, invalidateServicesCache } from "./_helpers";
import { createServiceNotification } from "./notification";
import { getServiceNotificationTranslations } from "@/modules/services/i18n/notifications";
import { isValidLocale } from "@/i18n/utils";
import { z } from "astro/zod";

const lifecycleInput = z.object({ id: z.uuid(), organizationId: serviceOrganizationIdSchema });
type LifecycleAuditAction = "SERVICE_PUBLISH" | "SERVICE_UNPUBLISH" | "SERVICE_ARCHIVE" | "SERVICE_RESTORE" | "SERVICE_DELETE";
type LifecyclePermission = "publish" | "update" | "delete";

function requestLocale(headers: Headers) {
  const candidate = headers.get("accept-language")?.split(",", 1)[0]?.split("-", 1)[0] ?? "fr";
  return isValidLocale(candidate) ? candidate : "fr";
}

async function transitionService(id: string, organizationId: string | null | undefined, to: ServiceStatus, context: Parameters<typeof assertServicePermission>[0], permission: LifecyclePermission, auditAction: LifecycleAuditAction) {
  const tenant = resolveServiceTenant({ organizationId }); const user = await assertServicePermission(context, tenant, { service: [permission] }); const current = await assertServiceInTenant(id, tenant); assertValidServiceTransition(current.status as ServiceStatus, to); const db = getDrizzle();
  await db.transaction(async (tx) => { await tx.update(services).set({ status: to, publishedAt: to === "PUBLISHED" ? new Date() : to === "DRAFT" ? null : undefined, updatedBy: user.id }).where(eq(services.id, id)); });
  if (to === "PUBLISHED") { const t = getServiceNotificationTranslations(requestLocale(context.request.headers)); await createServiceNotification({ recipientId: current.providerId, serviceId: id, actorId: user.id, type: "SERVICE_PUBLISHED", title: t.publishedTitle, message: t.publishedMessage }); }
  auditService(context, user.id, auditAction, { resource: "services", resourceId: id, metadata: { organizationId: tenant.organizationId, from: current.status, to } }); invalidateServicesCache(); return { success: true };
}

export const publishService = defineAction({ input: lifecycleInput, handler: (input, context) => transitionService(input.id, input.organizationId, "PUBLISHED", context, "publish", "SERVICE_PUBLISH") });
export const unpublishService = defineAction({ input: lifecycleInput, handler: (input, context) => transitionService(input.id, input.organizationId, "DRAFT", context, "publish", "SERVICE_UNPUBLISH") });
export const archiveService = defineAction({ input: lifecycleInput, handler: (input, context) => transitionService(input.id, input.organizationId, "ARCHIVED", context, "update", "SERVICE_ARCHIVE") });
export const restoreService = defineAction({ input: lifecycleInput, handler: (input, context) => transitionService(input.id, input.organizationId, "DRAFT", context, "update", "SERVICE_RESTORE") });
export const deleteService = defineAction({ input: lifecycleInput, handler: (input, context) => transitionService(input.id, input.organizationId, "DELETED", context, "delete", "SERVICE_DELETE") });

export const duplicateService = defineAction({ input: lifecycleInput, handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["create"] }); const source = await assertServiceInTenant(input.id, tenant); const db = getDrizzle();
  const [translations, categories, tags, media, availability, seo, attributes] = await Promise.all([
    db.select().from(serviceTranslations).where(eq(serviceTranslations.serviceId, source.id)),
    db.select().from(serviceCategoryLinks).where(eq(serviceCategoryLinks.serviceId, source.id)),
    db.select().from(serviceTagLinks).where(eq(serviceTagLinks.serviceId, source.id)),
    db.select().from(serviceMedia).where(eq(serviceMedia.serviceId, source.id)),
    db.select().from(serviceAvailability).where(eq(serviceAvailability.serviceId, source.id)),
    db.select().from(serviceSeo).where(eq(serviceSeo.serviceId, source.id)),
    db.select().from(serviceAttributeValues).where(eq(serviceAttributeValues.serviceId, source.id)),
  ]);
  const baseSlug = `${source.slug}-copy`;
  const existingSlugs = new Set((await db.select({ slug: serviceTranslations.slug }).from(serviceTranslations).innerJoin(services, eq(services.id, serviceTranslations.serviceId)).where(tenant.organizationId === null ? undefined : eq(services.organizationId, tenant.organizationId))).map((row) => row.slug));
  const makeUnique = (slug: string) => { let candidate = slug; let suffix = 2; while (existingSlugs.has(candidate)) candidate = `${slug}-${suffix++}`; existingSlugs.add(candidate); return candidate; };
  const localeSlugs = new Map<string, string>(); for (const translation of translations) localeSlugs.set(translation.locale, makeUnique(`${translation.slug}-copy`));
  let duplicateId = "";
  await db.transaction(async (tx) => {
    const [created] = await tx.insert(services).values({ organizationId: tenant.organizationId, providerId: source.providerId, slug: makeUnique(baseSlug), status: "DRAFT", coverImageId: source.coverImageId, priceMinor: source.priceMinor, currency: source.currency, durationMinutes: source.durationMinutes, maxParticipants: source.maxParticipants, isMobile: source.isMobile, isFeatured: false, seoScore: null, publishedAt: null, updatedBy: user.id }).returning({ id: services.id });
    duplicateId = created.id;
    for (const translation of translations) await tx.insert(serviceTranslations).values({ serviceId: duplicateId, organizationId: tenant.organizationId, locale: translation.locale, title: `${translation.title} (copy)`, slug: localeSlugs.get(translation.locale) ?? `${translation.slug}-copy`, excerpt: translation.excerpt, content: translation.content, locationLabel: translation.locationLabel, locationAddress: translation.locationAddress, metaTitle: translation.metaTitle, metaDescription: translation.metaDescription, metaKeywords: translation.metaKeywords, canonicalUrl: null, ogTitle: translation.ogTitle, ogDescription: translation.ogDescription, ogImageId: translation.ogImageId });
    if (categories.length) await tx.insert(serviceCategoryLinks).values(categories.map((row) => ({ serviceId: duplicateId, categoryId: row.categoryId })));
    if (tags.length) await tx.insert(serviceTagLinks).values(tags.map((row) => ({ serviceId: duplicateId, tagId: row.tagId })));
    if (media.length) await tx.insert(serviceMedia).values(media.map((row) => ({ serviceId: duplicateId, mediaId: row.mediaId, kind: row.kind, altText: row.altText, caption: row.caption, sortOrder: row.sortOrder })));
    if (availability.length) await tx.insert(serviceAvailability).values(availability.map((row) => ({ serviceId: duplicateId, dayOfWeek: row.dayOfWeek, startTime: row.startTime, endTime: row.endTime, timezone: row.timezone, maxParticipants: row.maxParticipants })));
    if (seo.length) await tx.insert(serviceSeo).values(seo.map((row) => ({ serviceId: duplicateId, locale: row.locale, focusKeyword: row.focusKeyword, focusKeywordScore: null, readabilityScore: null, metaRobots: row.metaRobots, metaOgType: row.metaOgType, metaOgLocale: row.metaOgLocale, schemaMarkup: row.schemaMarkup })));
    if (attributes.length) await tx.insert(serviceAttributeValues).values(attributes.map((row) => ({ serviceId: duplicateId, definitionId: row.definitionId, stringValue: row.stringValue, numberValue: row.numberValue, booleanValue: row.booleanValue, selectedValue: row.selectedValue })));
    const first = translations[0]; if (first) await tx.insert(serviceRevisions).values({ serviceId: duplicateId, authorId: user.id, locale: first.locale, title: `${first.title} (copy)`, slug: localeSlugs.get(first.locale) ?? `${first.slug}-copy`, content: first.content, excerpt: first.excerpt, status: "DRAFT", revisionNote: "Duplication" });
  });
  auditService(context, user.id, "SERVICE_DUPLICATE", { resource: "services", resourceId: duplicateId, metadata: { organizationId: tenant.organizationId, duplicatedFrom: source.id } }); invalidateServicesCache(); return { id: duplicateId };
} });

export const lockService = defineAction({ input: lifecycleInput, handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["update"] }); await assertServiceInTenant(input.id, tenant); const db = getDrizzle(); const existing = (await db.select().from(serviceLocks).where(eq(serviceLocks.serviceId, input.id)).limit(1))[0]; const now = new Date();
  if (existing && existing.expiresAt > now && existing.userId !== user.id) throw new ActionError({ code: "CONFLICT", message: "Ce service est en cours d'édition par un autre utilisateur." });
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await db.insert(serviceLocks).values({ serviceId: input.id, userId: user.id, sessionId: context.locals.session?.id ?? "unknown", expiresAt }).onConflictDoUpdate({ target: serviceLocks.serviceId, set: { userId: user.id, sessionId: context.locals.session?.id ?? "unknown", lockedAt: now, expiresAt } });
  auditService(context, user.id, "SERVICE_LOCK", { resource: "services", resourceId: input.id }); return { success: true, expiresAt };
} });

export const unlockService = defineAction({ input: lifecycleInput, handler: async (input, context) => { const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["update"] }); await assertServiceInTenant(input.id, tenant); await getDrizzle().delete(serviceLocks).where(and(eq(serviceLocks.serviceId, input.id), eq(serviceLocks.userId, user.id))); auditService(context, user.id, "SERVICE_UNLOCK", { resource: "services", resourceId: input.id }); return { success: true }; } });

export const listServiceRevisions = defineAction({ input: lifecycleInput, handler: async (input, context) => { const tenant = resolveServiceTenant(input); await assertServicePermission(context, tenant, { service: ["read"] }); await assertServiceInTenant(input.id, tenant); return getDrizzle().select().from(serviceRevisions).where(eq(serviceRevisions.serviceId, input.id)).orderBy(serviceRevisions.createdAt).limit(50); } });

export const restoreServiceRevision = defineAction({ input: z.object({ revisionId: z.uuid(), serviceId: z.uuid(), organizationId: serviceOrganizationIdSchema }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const current = await assertServiceInTenant(input.serviceId, tenant); const db = getDrizzle(); const [revision] = await db.select().from(serviceRevisions).where(and(eq(serviceRevisions.id, input.revisionId), eq(serviceRevisions.serviceId, input.serviceId))).limit(1); if (!revision) throw new ActionError({ code: "NOT_FOUND", message: "Révision introuvable." });
  const user = await assertServicePermission(context, tenant, { service: [revision.status === "PUBLISHED" ? "publish" : "update"] }); assertValidServiceTransition(current.status as ServiceStatus, revision.status as ServiceStatus);
  await db.transaction(async (tx) => { await tx.update(services).set({ status: revision.status, slug: revision.slug, publishedAt: revision.status === "PUBLISHED" ? new Date() : null, updatedBy: user.id }).where(eq(services.id, input.serviceId)); await tx.insert(serviceTranslations).values({ serviceId: input.serviceId, organizationId: tenant.organizationId, locale: revision.locale, title: revision.title, slug: revision.slug, content: revision.content, excerpt: revision.excerpt, metaTitle: revision.title }).onConflictDoUpdate({ target: [serviceTranslations.serviceId, serviceTranslations.locale], set: { title: revision.title, slug: revision.slug, content: revision.content, excerpt: revision.excerpt, metaTitle: revision.title, organizationId: tenant.organizationId } }); await tx.insert(serviceRevisions).values({ serviceId: input.serviceId, authorId: user.id, locale: revision.locale, title: revision.title, slug: revision.slug, content: revision.content, excerpt: revision.excerpt, status: revision.status, revisionNote: `Restauration de ${revision.id}` }); });
  auditService(context, user.id, "SERVICE_UPDATE", { resource: "services", resourceId: input.serviceId, metadata: { organizationId: tenant.organizationId, restoredRevisionId: input.revisionId } }); invalidateServicesCache(); return { success: true };
} });
