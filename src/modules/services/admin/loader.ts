import { and, count, eq, isNull, or, sum } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { services, serviceReviews, serviceComments, serviceReports, serviceCategories, serviceCategoryTranslations, serviceTags, serviceTagTranslations } from "@database/schemas";
import { getServices, getServiceByIdAdmin } from "@/modules/services/loaders";
import type { Locale } from "@i18n/config";
import type { ServiceDetail } from "@/modules/services/domain";
import { serviceListFiltersSchema } from "@/modules/services/validation";
import type { z } from "astro/zod";

export type ServiceAdminFilters = Partial<z.infer<typeof serviceListFiltersSchema>>;
function tenantScope(organizationId: string | null) { return organizationId === null ? isNull(services.organizationId) : eq(services.organizationId, organizationId); }
export async function getServiceAdminData(organizationId: string | null, locale: Locale, filters: ServiceAdminFilters = {}) { return getServices({ ...filters, organizationId }, locale, false); }
export async function getServiceAdminById(id: string, locale: Locale, organizationId: string | null): Promise<ServiceDetail | null> { return getServiceByIdAdmin(id, locale, organizationId); }
export async function getServiceAdminStats(organizationId: string | null) {
  const db = getDrizzle(); const scope = tenantScope(organizationId);
  const [total, published, draft, archived, deleted, featured, views, reviews, comments] = await Promise.all([
    db.select({ count: count() }).from(services).where(scope),
    db.select({ count: count() }).from(services).where(and(scope, eq(services.status, "PUBLISHED"))),
    db.select({ count: count() }).from(services).where(and(scope, eq(services.status, "DRAFT"))),
    db.select({ count: count() }).from(services).where(and(scope, eq(services.status, "ARCHIVED"))),
    db.select({ count: count() }).from(services).where(and(scope, eq(services.status, "DELETED"))),
    db.select({ count: count() }).from(services).where(and(scope, eq(services.isFeatured, true))),
    db.select({ total: sum(services.viewCount) }).from(services).where(scope),
    db.select({ count: count() }).from(serviceReviews).innerJoin(services, eq(services.id, serviceReviews.serviceId)).where(scope),
    db.select({ count: count() }).from(serviceComments).innerJoin(services, eq(services.id, serviceComments.serviceId)).where(scope),
  ]);
  return { total: Number(total[0]?.count ?? 0), published: Number(published[0]?.count ?? 0), draft: Number(draft[0]?.count ?? 0), archived: Number(archived[0]?.count ?? 0), deleted: Number(deleted[0]?.count ?? 0), featured: Number(featured[0]?.count ?? 0), views: Number(views[0]?.total ?? 0), reviews: Number(reviews[0]?.count ?? 0), comments: Number(comments[0]?.count ?? 0) };
}

export async function getServiceAdminTaxonomy(organizationId: string | null, locale: Locale) {
  const db = getDrizzle();
  const [categories, tags] = await Promise.all([
    db.select({ category: serviceCategories, translation: serviceCategoryTranslations }).from(serviceCategories).leftJoin(serviceCategoryTranslations, and(eq(serviceCategoryTranslations.categoryId, serviceCategories.id), eq(serviceCategoryTranslations.locale, locale))).where(organizationId === null ? isNull(serviceCategories.organizationId) : eq(serviceCategories.organizationId, organizationId)).orderBy(serviceCategories.sortOrder),
    db.select({ tag: serviceTags, translation: serviceTagTranslations }).from(serviceTags).leftJoin(serviceTagTranslations, and(eq(serviceTagTranslations.tagId, serviceTags.id), eq(serviceTagTranslations.locale, locale))).where(organizationId === null ? isNull(serviceTags.organizationId) : eq(serviceTags.organizationId, organizationId)).orderBy(serviceTags.slug),
  ]);
  return { categories, tags };
}

export async function getServiceModerationQueue(organizationId: string | null) {
  const db = getDrizzle();
  const [reviews, comments, reports] = await Promise.all([
    db.select({ review: serviceReviews }).from(serviceReviews).innerJoin(services, eq(services.id, serviceReviews.serviceId)).where(and(tenantScope(organizationId), eq(serviceReviews.status, "PENDING"))).orderBy(serviceReviews.createdAt).limit(100),
    db.select({ comment: serviceComments }).from(serviceComments).innerJoin(services, eq(services.id, serviceComments.serviceId)).where(and(tenantScope(organizationId), eq(serviceComments.status, "PENDING"))).orderBy(serviceComments.createdAt).limit(100),
    db.select({ report: serviceReports })
      .from(serviceReports)
      .leftJoin(services, eq(services.id, serviceReports.serviceId))
      .leftJoin(serviceComments, eq(serviceComments.id, serviceReports.commentId))
      .leftJoin(serviceReviews, eq(serviceReviews.id, serviceReports.reviewId))
      .leftJoin(services.as("report_comment_service"), eq(sql`TRUE`, sql`FALSE`))
      .where(and(eq(serviceReports.status, "PENDING"), organizationId === null ? or(eq(services.organizationId, null), eq(serviceComments.serviceId, serviceComments.serviceId)) : or(eq(services.organizationId, organizationId), eq(serviceComments.serviceId, serviceReports.commentId), eq(serviceReviews.serviceId, serviceReports.reviewId))))
      .orderBy(serviceReports.createdAt)
      .limit(100),
  ]);
  return { reviews, comments, reports };
}
