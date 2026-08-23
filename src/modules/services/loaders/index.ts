import { and, asc, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { serviceCategories, serviceCategoryTranslations, serviceTags, serviceTagTranslations, serviceTranslations, services, serviceCategoryLinks, serviceTagLinks, serviceMedia, serviceAvailability, serviceSeo, mediaFiles, user } from "@database/schemas";
import { serviceListFiltersSchema } from "@/modules/services/validation";
import type { Locale } from "@i18n/config";
import type { ServiceDetail, ServiceListItem } from "@/modules/services/domain";

const serviceTenantScope = (organizationId: string | null) => organizationId === null ? isNull(services.organizationId) : eq(services.organizationId, organizationId);
const categoryTenantScope = (organizationId: string | null) => organizationId === null ? isNull(serviceCategories.organizationId) : eq(serviceCategories.organizationId, organizationId);
const tagTenantScope = (organizationId: string | null) => organizationId === null ? isNull(serviceTags.organizationId) : eq(serviceTags.organizationId, organizationId);

export async function getServices(input: unknown = {}, locale: Locale = "fr", publicOnly = true): Promise<{ items: ServiceListItem[]; page: number; limit: number; total: number; totalPages: number }> {
  const filters = serviceListFiltersSchema.parse({ ...(input as Record<string, unknown>), locale });
  const db = getDrizzle();
  const conditions = [serviceTenantScope(filters.organizationId), eq(serviceTranslations.locale, filters.locale)];
  if (publicOnly) conditions.push(eq(services.status, "PUBLISHED"));
  else if (filters.status) conditions.push(eq(services.status, filters.status));
  if (filters.search) conditions.push(ilike(serviceTranslations.title, `%${filters.search}%`));
  if (filters.providerId) conditions.push(eq(services.providerId, filters.providerId));
  if (filters.featured !== undefined) conditions.push(eq(services.isFeatured, filters.featured));
  if (filters.mobile !== undefined) conditions.push(eq(services.isMobile, filters.mobile));
  if (filters.categoryId) conditions.push(inArray(services.id, db.select({ serviceId: serviceCategoryLinks.serviceId }).from(serviceCategoryLinks).where(eq(serviceCategoryLinks.categoryId, filters.categoryId))));
  if (filters.tagId) conditions.push(inArray(services.id, db.select({ serviceId: serviceTagLinks.serviceId }).from(serviceTagLinks).where(eq(serviceTagLinks.tagId, filters.tagId))));

  const orderColumn = filters.sortBy === "title" ? serviceTranslations.title : filters.sortBy === "priceMinor" ? services.priceMinor : filters.sortBy === "ratingAverage100" ? services.ratingAverage100 : filters.sortBy === "viewCount" ? services.viewCount : filters.sortBy === "publishedAt" ? services.publishedAt : filters.sortBy === "createdAt" ? services.createdAt : services.updatedAt;
  const orderExpression = filters.sortOrder === "asc" ? asc(orderColumn) : desc(orderColumn);
  const countRows = await db.select({ count: sql<number>`count(*)` }).from(services).innerJoin(serviceTranslations, eq(serviceTranslations.serviceId, services.id)).where(and(...conditions));
  const total = Number(countRows[0]?.count ?? 0);
  const rows = await db.select({ service: services, translation: serviceTranslations, provider: { id: user.id, name: user.name, image: user.image } }).from(services).innerJoin(serviceTranslations, and(eq(serviceTranslations.serviceId, services.id), eq(serviceTranslations.locale, filters.locale))).leftJoin(user, eq(user.id, services.providerId)).where(and(...conditions)).orderBy(orderExpression).limit(filters.limit).offset((filters.page - 1) * filters.limit);
  const ids = rows.map((row) => row.service.id);
  const categoryRows = ids.length ? await db.select({ serviceId: serviceCategoryLinks.serviceId, id: serviceCategories.id, slug: serviceCategories.slug, name: serviceCategoryTranslations.name }).from(serviceCategoryLinks).innerJoin(serviceCategories, eq(serviceCategories.id, serviceCategoryLinks.categoryId)).leftJoin(serviceCategoryTranslations, and(eq(serviceCategoryTranslations.categoryId, serviceCategories.id), eq(serviceCategoryTranslations.locale, filters.locale))).where(inArray(serviceCategoryLinks.serviceId, ids)) : [];
  const categories = new Map<string, { id: string; slug: string; name: string | null }[]>();
  for (const category of categoryRows) categories.set(category.serviceId, [...(categories.get(category.serviceId) ?? []), { id: category.id, slug: category.slug, name: category.name ?? null }]);
  const items: ServiceListItem[] = rows.map(({ service, translation, provider }) => ({ service, translation: translation ? { locale: translation.locale, title: translation.title, slug: translation.slug, excerpt: translation.excerpt } : null, provider, categories: categories.get(service.id) ?? [] }));
  return { items, page: filters.page, limit: filters.limit, total, totalPages: Math.max(1, Math.ceil(total / filters.limit)) };
}

export async function getServiceBySlug(slug: string, locale: Locale = "fr", organizationId: string | null = null): Promise<ServiceDetail | null> {
  const db = getDrizzle();
  const rows = await db.select({ service: services, translation: serviceTranslations, provider: { id: user.id, name: user.name, image: user.image } }).from(serviceTranslations).innerJoin(services, and(eq(services.id, serviceTranslations.serviceId), serviceTenantScope(organizationId), eq(services.status, "PUBLISHED"))).leftJoin(user, eq(user.id, services.providerId)).where(and(eq(serviceTranslations.slug, slug), eq(serviceTranslations.locale, locale))).limit(1);
  const row = rows[0];
  if (!row) return null;
  const [categories, tags, media, availability, seo] = await Promise.all([
    db.select({ id: serviceCategories.id, slug: serviceCategories.slug, name: serviceCategoryTranslations.name }).from(serviceCategoryLinks).innerJoin(serviceCategories, eq(serviceCategories.id, serviceCategoryLinks.categoryId)).leftJoin(serviceCategoryTranslations, and(eq(serviceCategoryTranslations.categoryId, serviceCategories.id), eq(serviceCategoryTranslations.locale, locale))).where(eq(serviceCategoryLinks.serviceId, row.service.id)),
    db.select({ id: serviceTags.id, slug: serviceTags.slug, name: serviceTagTranslations.name }).from(serviceTagLinks).innerJoin(serviceTags, eq(serviceTags.id, serviceTagLinks.tagId)).leftJoin(serviceTagTranslations, and(eq(serviceTagTranslations.tagId, serviceTags.id), eq(serviceTagTranslations.locale, locale))).where(eq(serviceTagLinks.serviceId, row.service.id)),
    db.select({ id: mediaFiles.id, mediaId: serviceMedia.mediaId, kind: serviceMedia.kind, altText: serviceMedia.altText, caption: serviceMedia.caption, sortOrder: serviceMedia.sortOrder }).from(serviceMedia).innerJoin(mediaFiles, eq(mediaFiles.id, serviceMedia.mediaId)).where(eq(serviceMedia.serviceId, row.service.id)).orderBy(asc(serviceMedia.sortOrder)),
    db.select({ id: serviceAvailability.id, dayOfWeek: serviceAvailability.dayOfWeek, startTime: serviceAvailability.startTime, endTime: serviceAvailability.endTime, timezone: serviceAvailability.timezone, maxParticipants: serviceAvailability.maxParticipants }).from(serviceAvailability).where(eq(serviceAvailability.serviceId, row.service.id)).orderBy(asc(serviceAvailability.dayOfWeek), asc(serviceAvailability.startTime)),
    db.select({ locale: serviceSeo.locale, focusKeyword: serviceSeo.focusKeyword, metaRobots: serviceSeo.metaRobots, schemaMarkup: serviceSeo.schemaMarkup }).from(serviceSeo).where(and(eq(serviceSeo.serviceId, row.service.id), eq(serviceSeo.locale, locale))).limit(1),
  ]);
  return { service: row.service, translation: row.translation ? { locale: row.translation.locale, title: row.translation.title, slug: row.translation.slug, excerpt: row.translation.excerpt, content: row.translation.content } : null, provider: row.provider, categories: categories.map((item) => ({ id: item.id, slug: item.slug, name: item.name ?? null })), tags: tags.map((item) => ({ id: item.id, slug: item.slug, name: item.name ?? null })), media, availability, seo: seo[0] ?? null };
}

export async function getServiceCategories(locale: Locale = "fr", organizationId: string | null = null) {
  return getDrizzle().select({ category: serviceCategories, translation: serviceCategoryTranslations }).from(serviceCategories).leftJoin(serviceCategoryTranslations, and(eq(serviceCategoryTranslations.categoryId, serviceCategories.id), eq(serviceCategoryTranslations.locale, locale))).where(categoryTenantScope(organizationId)).orderBy(asc(serviceCategories.sortOrder));
}

export async function getServiceTags(locale: Locale = "fr", organizationId: string | null = null) {
  return getDrizzle().select({ tag: serviceTags, translation: serviceTagTranslations }).from(serviceTags).leftJoin(serviceTagTranslations, and(eq(serviceTagTranslations.tagId, serviceTags.id), eq(serviceTagTranslations.locale, locale))).where(tagTenantScope(organizationId)).orderBy(asc(serviceTags.slug));
}
