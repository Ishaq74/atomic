import { ActionError, defineAction } from "astro:actions";
import { and, avg, count, eq, sql } from "drizzle-orm";
import { z } from "astro/zod";
import { getDrizzle } from "@database/drizzle";
import { serviceComments, serviceReviews, serviceReports, services } from "@database/schemas";
import { assertServiceInTenant, assertServicePermission, resolveServiceTenant, serviceOrganizationIdSchema } from "./_helpers";
import { auditService, invalidateServicesCache } from "./_helpers";

export const moderateServiceComment = defineAction({ input: z.object({ id: z.uuid(), serviceId: z.uuid(), organizationId: serviceOrganizationIdSchema, status: z.enum(["APPROVED", "REJECTED", "SPAM", "TRASH"]) }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { serviceComment: ["moderate"] }); await assertServiceInTenant(input.serviceId, tenant);
  const updated = await getDrizzle().update(serviceComments).set({ status: input.status }).where(and(eq(serviceComments.id, input.id), eq(serviceComments.serviceId, input.serviceId))).returning({ id: serviceComments.id });
  if (!updated[0]) throw new ActionError({ code: "NOT_FOUND", message: "Commentaire introuvable." });
  auditService(context, user.id, "SERVICE_COMMENT_MODERATE", { resource: "serviceComments", resourceId: input.id, metadata: { status: input.status } });
  invalidateServicesCache();
  return { success: true };
} });

export const moderateServiceReview = defineAction({ input: z.object({ id: z.uuid(), serviceId: z.uuid(), organizationId: serviceOrganizationIdSchema, status: z.enum(["APPROVED", "REJECTED", "SPAM"]) }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { serviceReview: ["moderate"] }); await assertServiceInTenant(input.serviceId, tenant);
  const db = getDrizzle();
  const updated = await db.update(serviceReviews).set({ status: input.status }).where(and(eq(serviceReviews.id, input.id), eq(serviceReviews.serviceId, input.serviceId))).returning({ id: serviceReviews.id });
  if (!updated[0]) throw new ActionError({ code: "NOT_FOUND", message: "Avis introuvable." });
  const [aggregate] = await db.select({ average: avg(serviceReviews.rating), count: count() }).from(serviceReviews).where(and(eq(serviceReviews.serviceId, input.serviceId), eq(serviceReviews.status, "APPROVED")));
  const ratingCount = Number(aggregate?.count ?? 0);
  const ratingAverage100 = ratingCount ? Math.round(Number(aggregate?.average ?? 0) * 100) : 0;
  await db.update(services).set({ ratingAverage100, ratingCount }).where(eq(services.id, input.serviceId));
  auditService(context, user.id, "SERVICE_REVIEW_MODERATE", { resource: "serviceReviews", resourceId: input.id, metadata: { status: input.status, ratingCount, ratingAverage100 } });
  invalidateServicesCache();
  return { success: true, ratingCount, ratingAverage100 };
} });

export const resolveServiceReport = defineAction({ input: z.object({ id: z.uuid(), serviceId: z.uuid(), organizationId: serviceOrganizationIdSchema, status: z.enum(["REVIEWED", "RESOLVED", "REJECTED"]) }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["moderate"] }); await assertServiceInTenant(input.serviceId, tenant);
  const updated = await getDrizzle().update(serviceReports).set({ status: input.status, resolvedBy: user.id, resolvedAt: new Date() }).where(and(eq(serviceReports.id, input.id), eq(serviceReports.serviceId, input.serviceId))).returning({ id: serviceReports.id });
  if (!updated[0]) throw new ActionError({ code: "NOT_FOUND", message: "Signalement introuvable." });
  auditService(context, user.id, "SERVICE_REPORT_RESOLVE", { resource: "serviceReports", resourceId: input.id, metadata: { status: input.status } });
  return { success: true };
} });
