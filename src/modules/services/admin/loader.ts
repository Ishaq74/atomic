import { and, count, desc, eq, isNull, sum } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import {
  organization,
  serviceAvailability,
  serviceCategories,
  serviceCategoryLinks,
  serviceComments,
  serviceMedia,
  serviceReviews,
  serviceSeo,
  serviceTagLinks,
  serviceTags,
  serviceTranslations,
  services,
  user,
} from "@database/schemas";
import { getServices } from "@/modules/services/loaders";
import type { Locale } from "@i18n/config";
import type { ServiceDetail, ServiceListItem } from "@/modules/services/domain";

function tenantScope(organizationId: string | null) {
  return organizationId === null ? isNull(services.organizationId) : eq(services.organizationId, organizationId);
}

export async function getServiceAdminData(
  organizationId: string | null,
  locale: Locale,
  filters: Record<string, unknown> = {},
) {
  return getServices({ ...filters, organizationId }, locale, false);
}

export async function getServiceAdminById(
  id: string,
  locale: Locale,
  organizationId: string | null,
): Promise<ServiceDetail | null> {
  const db = getDrizzle();
  const scope = and(eq(services.id, id), tenantScope(organizationId));
  const [serviceRow] = await db
    .select({
      service: services,
      translation: serviceTranslations,
      provider: { id: user.id, name: user.name, image: user.image },
    })
    .from(services)
    .leftJoin(
      serviceTranslations,
      and(eq(serviceTranslations.serviceId, services.id), eq(serviceTranslations.locale, locale)),
    )
    .leftJoin(user, eq(user.id, services.providerId))
    .where(scope)
    .limit(1);

  if (!serviceRow) return null;

  const [categoryRows, tagRows, mediaRows, availabilityRows, seoRows] = await Promise.all([
    db
      .select({ id: serviceCategories.id, slug: serviceCategories.slug, name: serviceTranslations.title })
      .from(serviceCategoryLinks)
      .innerJoin(serviceCategories, eq(serviceCategories.id, serviceCategoryLinks.categoryId))
      .leftJoin(
        serviceTranslations,
        and(
          eq(serviceTranslations.serviceId, serviceCategories.id),
          eq(serviceTranslations.locale, locale),
        ),
      )
      .where(eq(serviceCategoryLinks.serviceId, id)),
    db
      .select({ id: serviceTags.id, slug: serviceTags.slug, name: serviceTranslations.title })
      .from(serviceTagLinks)
      .innerJoin(serviceTags, eq(serviceTags.id, serviceTagLinks.tagId))
      .leftJoin(
        serviceTranslations,
        and(
          eq(serviceTranslations.serviceId, serviceTags.id),
          eq(serviceTranslations.locale, locale),
        ),
      )
      .where(eq(serviceTagLinks.serviceId, id)),
    db
      .select({
        id: serviceMedia.serviceId,
        mediaId: serviceMedia.mediaId,
        kind: serviceMedia.kind,
        altText: serviceMedia.altText,
        caption: serviceMedia.caption,
        sortOrder: serviceMedia.sortOrder,
      })
      .from(serviceMedia)
      .where(eq(serviceMedia.serviceId, id))
      .orderBy(serviceMedia.sortOrder),
    db
      .select({
        id: serviceAvailability.id,
        dayOfWeek: serviceAvailability.dayOfWeek,
        startTime: serviceAvailability.startTime,
        endTime: serviceAvailability.endTime,
        timezone: serviceAvailability.timezone,
        maxParticipants: serviceAvailability.maxParticipants,
      })
      .from(serviceAvailability)
      .where(eq(serviceAvailability.serviceId, id))
      .orderBy(serviceAvailability.dayOfWeek, serviceAvailability.startTime),
    db
      .select({
        locale: serviceSeo.locale,
        focusKeyword: serviceSeo.focusKeyword,
        metaRobots: serviceSeo.metaRobots,
        schemaMarkup: serviceSeo.schemaMarkup,
      })
      .from(serviceSeo)
      .where(and(eq(serviceSeo.serviceId, id), eq(serviceSeo.locale, locale)))
      .limit(1),
  ]);

  const translation = serviceRow.translation
    ? {
        locale: serviceRow.translation.locale,
        title: serviceRow.translation.title,
        slug: serviceRow.translation.slug,
        excerpt: serviceRow.translation.excerpt,
        content: serviceRow.translation.content,
        locationLabel: serviceRow.translation.locationLabel,
        locationAddress: serviceRow.translation.locationAddress,
        metaTitle: serviceRow.translation.metaTitle,
        metaDescription: serviceRow.translation.metaDescription,
        metaKeywords: serviceRow.translation.metaKeywords,
        canonicalUrl: serviceRow.translation.canonicalUrl,
        ogTitle: serviceRow.translation.ogTitle,
        ogDescription: serviceRow.translation.ogDescription,
        ogImageId: serviceRow.translation.ogImageId,
      }
    : null;

  return {
    service: serviceRow.service,
    translation,
    provider: serviceRow.provider,
    categories: categoryRows,
    tags: tagRows,
    media: mediaRows.map((row) => ({ ...row, kind: row.kind as "GALLERY" | "DOCUMENT" })),
    availability: availabilityRows,
    seo: seoRows[0] ?? null,
  };
}

export async function getServiceAdminStats(organizationId: string | null) {
  const db = getDrizzle();
  const scope = tenantScope(organizationId);
  const [total, published, draft, featured, views, reviews, comments] = await Promise.all([
    db.select({ count: count() }).from(services).where(scope),
    db.select({ count: count() }).from(services).where(and(scope, eq(services.status, "PUBLISHED"))),
    db.select({ count: count() }).from(services).where(and(scope, eq(services.status, "DRAFT"))),
    db.select({ count: count() }).from(services).where(and(scope, eq(services.isFeatured, true))),
    db.select({ total: sum(services.viewCount) }).from(services).where(scope),
    db
      .select({ count: count() })
      .from(serviceReviews)
      .innerJoin(services, eq(services.id, serviceReviews.serviceId))
      .where(scope),
    db
      .select({ count: count() })
      .from(serviceComments)
      .innerJoin(services, eq(services.id, serviceComments.serviceId))
      .where(scope),
  ]);
  return {
    total: Number(total[0]?.count ?? 0),
    published: Number(published[0]?.count ?? 0),
    draft: Number(draft[0]?.count ?? 0),
    featured: Number(featured[0]?.count ?? 0),
    views: Number(views[0]?.total ?? 0),
    reviews: Number(reviews[0]?.count ?? 0),
    comments: Number(comments[0]?.count ?? 0),
  };
}
