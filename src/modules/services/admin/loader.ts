import { and, desc, eq, count, sum } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { serviceTranslations, services, serviceReviews, serviceComments } from "@database/schemas";
import { getServices, getServiceBySlug } from "@/modules/services/loaders";
import type { Locale } from "@i18n/config";
import { resolveServiceTenant } from "@/modules/services/permissions";

export async function getServiceAdminData(organizationId: string | null, locale: Locale, filters: Record<string, unknown> = {}) {
  return getServices({ ...filters, organizationId }, locale, false);
}

export async function getServiceAdminById(id: string, locale: Locale, organizationId: string | null) {
  const db = getDrizzle();
  const [row] = await db.select({ service: services, translation: serviceTranslations }).from(services).leftJoin(serviceTranslations, and(eq(serviceTranslations.serviceId, services.id), eq(serviceTranslations.locale, locale))).where(and(eq(services.id, id), organizationId === null ? eq(services.organizationId, null) : eq(services.organizationId, organizationId))).limit(1);
  if (!row) return null;
  const publicDetail = row.service.status === "PUBLISHED" ? await getServiceBySlug(row.translation?.slug ?? row.service.slug, locale, organizationId) : null;
  return publicDetail ?? { service: row.service, translation: row.translation ? { locale: row.translation.locale, title: row.translation.title, slug: row.translation.slug, excerpt: row.translation.excerpt, content: row.translation.content } : null, provider: null, categories: [], tags: [], media: [], availability: [], seo: null };
}

export async function getServiceAdminStats(organizationId: string | null) {
  const db = getDrizzle();
  const scope = organizationId === null ? eq(services.organizationId, null) : eq(services.organizationId, organizationId);
  const [total, published, draft, featured, views, reviews, comments] = await Promise.all([
    db.select({ count: count() }).from(services).where(scope),
    db.select({ count: count() }).from(services).where(and(scope, eq(services.status, "PUBLISHED"))),
    db.select({ count: count() }).from(services).where(and(scope, eq(services.status, "DRAFT"))),
    db.select({ count: count() }).from(services).where(and(scope, eq(services.isFeatured, true))),
    db.select({ total: sum(services.viewCount) }).from(services).where(scope),
    db.select({ count: count() }).from(serviceReviews).innerJoin(services, eq(services.id, serviceReviews.serviceId)).where(scope),
    db.select({ count: count() }).from(serviceComments).innerJoin(services, eq(services.id, serviceComments.serviceId)).where(scope),
  ]);
  return { total: Number(total[0]?.count ?? 0), published: Number(published[0]?.count ?? 0), draft: Number(draft[0]?.count ?? 0), featured: Number(featured[0]?.count ?? 0), views: Number(views[0]?.total ?? 0), reviews: Number(reviews[0]?.count ?? 0), comments: Number(comments[0]?.count ?? 0) };
}
