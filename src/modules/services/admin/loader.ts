import { count, eq, isNull, sum, and } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { services, serviceReviews, serviceComments } from "@database/schemas";
import { getServices, getServiceByIdAdmin } from "@/modules/services/loaders";
import type { Locale } from "@i18n/config";
import type { ServiceDetail } from "@/modules/services/domain";
import { serviceListFiltersSchema } from "@/modules/services/validation";
import type { z } from "astro/zod";

export type ServiceAdminFilters = Partial<z.infer<typeof serviceListFiltersSchema>>;

function tenantScope(organizationId: string | null) {
  return organizationId === null ? isNull(services.organizationId) : eq(services.organizationId, organizationId);
}

export async function getServiceAdminData(
  organizationId: string | null,
  locale: Locale,
  filters: ServiceAdminFilters = {},
) {
  return getServices({ ...filters, organizationId }, locale, false);
}

export async function getServiceAdminById(
  id: string,
  locale: Locale,
  organizationId: string | null,
): Promise<ServiceDetail | null> {
  return getServiceByIdAdmin(id, locale, organizationId);
}

export async function getServiceAdminStats(organizationId: string | null) {
  const db = getDrizzle();
  const scope = tenantScope(organizationId);
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
  return {
    total: Number(total[0]?.count ?? 0),
    published: Number(published[0]?.count ?? 0),
    draft: Number(draft[0]?.count ?? 0),
    archived: Number(archived[0]?.count ?? 0),
    deleted: Number(deleted[0]?.count ?? 0),
    featured: Number(featured[0]?.count ?? 0),
    views: Number(views[0]?.total ?? 0),
    reviews: Number(reviews[0]?.count ?? 0),
    comments: Number(comments[0]?.count ?? 0),
  };
}
