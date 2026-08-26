import { ActionError } from "astro:actions";
import type { ActionAPIContext } from "astro:actions";
import { eq } from "drizzle-orm";
import { z } from "astro/zod";
import { getDrizzle } from "@database/drizzle";
import { mediaFiles, serviceCategories, serviceTags, services } from "@database/schemas";
import { checkRateLimit } from "@/lib/rate-limit";
import type { statement } from "@/lib/permissions";
import { isValidLocale } from "@/i18n/utils";
import { getServiceErrorMessage } from "@/modules/services/i18n";

export type ServicePermissions = { [K in keyof typeof statement]?: (typeof statement)[K][number][] };
export interface ServiceTenantContext { organizationId: string | null; isOrgContext: boolean; locale: string; }
export const serviceOrganizationIdSchema = z.string().trim().min(1).optional().nullable();

function requestLocale(context: Pick<ActionAPIContext, "request">): string {
  const candidate = context.request.headers.get("accept-language")?.split(",", 1)[0]?.split("-", 1)[0] ?? "fr";
  return isValidLocale(candidate) ? candidate : "fr";
}

export function resolveServiceTenant(input: { organizationId?: string | null; locale?: string }): ServiceTenantContext {
  const candidate = input.locale ?? "fr";
  return { organizationId: input.organizationId ?? null, isOrgContext: Boolean(input.organizationId), locale: isValidLocale(candidate) ? candidate : "fr" };
}

export async function hasServicePermission(context: Pick<ActionAPIContext, "locals" | "request">, tenant: ServiceTenantContext, permissions: ServicePermissions): Promise<boolean> {
  const user = context.locals.user;
  if (!user || user.banned) return false;
  try {
    const { auth } = await import("@/lib/auth");
    if (tenant.isOrgContext) {
      const result = await auth.api.hasPermission({ headers: context.request.headers, body: { organizationId: tenant.organizationId!, permissions: permissions as Record<string, string[]> } });
      return result.success;
    }
    const result = await auth.api.userHasPermission({ body: { userId: user.id, permissions: permissions as Record<string, string[]> } });
    return result.success;
  } catch {
    return false;
  }
}

export async function assertServicePermission(context: ActionAPIContext, tenant: ServiceTenantContext, permissions: ServicePermissions) {
  const user = context.locals.user;
  if (!user) throw new ActionError({ code: "UNAUTHORIZED", message: getServiceErrorMessage(requestLocale(context), "UNAUTHORIZED") });
  if (user.banned) throw new ActionError({ code: "FORBIDDEN", message: getServiceErrorMessage(requestLocale(context), "FORBIDDEN") });
  if (!(await hasServicePermission(context, tenant, permissions))) throw new ActionError({ code: "FORBIDDEN", message: getServiceErrorMessage(requestLocale(context), "FORBIDDEN") });
  return user;
}

export function serviceTenantError(tenant: ServiceTenantContext, code: "NOT_FOUND" | "FORBIDDEN") {
  return getServiceErrorMessage(tenant.locale, code);
}

export async function assertServiceInTenant(serviceId: string, tenant: ServiceTenantContext) {
  const db = getDrizzle();
  const [service] = await db.select({ id: services.id, organizationId: services.organizationId, status: services.status }).from(services).where(eq(services.id, serviceId)).limit(1);
  if (!service) throw new ActionError({ code: "NOT_FOUND", message: serviceTenantError(tenant, "NOT_FOUND") });
  if ((service.organizationId ?? null) !== tenant.organizationId) throw new ActionError({ code: "FORBIDDEN", message: serviceTenantError(tenant, "FORBIDDEN") });
  return service;
}

export async function assertServiceCategoryInTenant(categoryId: string, tenant: ServiceTenantContext) {
  const db = getDrizzle();
  const [category] = await db.select({ id: serviceCategories.id, organizationId: serviceCategories.organizationId }).from(serviceCategories).where(eq(serviceCategories.id, categoryId)).limit(1);
  if (!category) throw new ActionError({ code: "NOT_FOUND", message: serviceTenantError(tenant, "NOT_FOUND") });
  if ((category.organizationId ?? null) !== tenant.organizationId) throw new ActionError({ code: "FORBIDDEN", message: serviceTenantError(tenant, "FORBIDDEN") });
  return category;
}

export async function assertServiceTagInTenant(tagId: string, tenant: ServiceTenantContext) {
  const db = getDrizzle();
  const [tag] = await db.select({ id: serviceTags.id, organizationId: serviceTags.organizationId }).from(serviceTags).where(eq(serviceTags.id, tagId)).limit(1);
  if (!tag) throw new ActionError({ code: "NOT_FOUND", message: serviceTenantError(tenant, "NOT_FOUND") });
  if ((tag.organizationId ?? null) !== tenant.organizationId) throw new ActionError({ code: "FORBIDDEN", message: serviceTenantError(tenant, "FORBIDDEN") });
  return tag;
}

export async function assertServiceMediaInTenant(mediaId: string, tenant: ServiceTenantContext) {
  const db = getDrizzle();
  const [media] = await db.select({ id: mediaFiles.id, organizationId: mediaFiles.organizationId }).from(mediaFiles).where(eq(mediaFiles.id, mediaId)).limit(1);
  if (!media) throw new ActionError({ code: "NOT_FOUND", message: serviceTenantError(tenant, "NOT_FOUND") });
  if ((media.organizationId ?? null) !== tenant.organizationId) throw new ActionError({ code: "FORBIDDEN", message: serviceTenantError(tenant, "FORBIDDEN") });
  return media;
}

export function serviceRateLimit(context: Pick<ActionAPIContext, "request"> | null, userId: string, scope: string) {
  const key = `service-${scope.replace(/:/g, "_")}:${userId}`;
  const result = checkRateLimit(key, { window: 60, max: 30 });
  if (!result.allowed) {
    const locale = context ? requestLocale(context) : "fr";
    throw new ActionError({ code: "TOO_MANY_REQUESTS", message: getServiceErrorMessage(locale, "TOO_MANY_REQUESTS") });
  }
}
