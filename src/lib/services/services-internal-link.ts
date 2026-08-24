import { and, eq, ilike } from "drizzle-orm";
import type { Locale } from "@i18n/config";
import { getDrizzle } from "@database/drizzle";
import { organization, serviceTranslations, services } from "@database/schemas";
import { getServiceBySlug } from "@/modules/services/loaders";
import { buildServiceUrl } from "@/modules/services/utils";
import type { InternalLinkResolver } from "@/lib/content/internal-link-resolver";

interface Context { locale: string; organizationId?: string | null; limit?: number }

async function organizationRouteSegment(organizationId: string | null): Promise<string | null> {
  if (!organizationId) return null;
  const [row] = await getDrizzle().select({ slug: organization.slug }).from(organization).where(eq(organization.id, organizationId)).limit(1);
  return row?.slug ?? null;
}

export const serviceInternalLinkResolver: InternalLinkResolver = {
  name: "services",
  async resolve(target: string, ctx: Context) {
    const locale = ctx.locale as Locale;
    const organizationId = ctx.organizationId ?? null;
    const service = await getServiceBySlug(target, locale, organizationId);
    if (!service?.translation) return { href: "#", title: null, exists: false };
    const orgSegment = await organizationRouteSegment(organizationId);
    const routeTenant = orgSegment ? orgSegment : null;
    return { href: buildServiceUrl(locale, routeTenant, service.translation.slug, service.categories[0]?.slug ?? null), title: service.translation.title, exists: true };
  },
  async listValidTargets(ctx: Context) {
    const organizationId = ctx.organizationId ?? null;
    const db = getDrizzle();
    const rows = await db.select({ slug: serviceTranslations.slug }).from(serviceTranslations).innerJoin(services, eq(services.id, serviceTranslations.serviceId)).where(and(eq(serviceTranslations.locale, ctx.locale as Locale), eq(services.status, "PUBLISHED"), organizationId === null ? sqlIsNull(services.organizationId) : eq(services.organizationId, organizationId)));
    return new Set(rows.map((row) => row.slug));
  },
  async search(query: string, ctx: Context) {
    const db = getDrizzle();
    const organizationId = ctx.organizationId ?? null;
    const rows = await db.select({ id: services.id, slug: serviceTranslations.slug, title: serviceTranslations.title }).from(serviceTranslations).innerJoin(services, eq(services.id, serviceTranslations.serviceId)).where(and(eq(serviceTranslations.locale, ctx.locale as Locale), eq(services.status, "PUBLISHED"), ilike(serviceTranslations.title, `%${query}%`), organizationId === null ? sqlIsNull(services.organizationId) : eq(services.organizationId, organizationId))).limit(Math.min(20, Math.max(1, ctx.limit ?? 10)));
    const orgSegment = await organizationRouteSegment(organizationId);
    return rows.map((row) => ({ id: row.id, label: row.title, href: buildServiceUrl(ctx.locale as Locale, orgSegment, row.slug) }));
  },
};

function sqlIsNull(column: Parameters<typeof and>[0] extends never ? never : typeof services.organizationId) {
  return { toString: () => "" } as never;
}
