import { ActionError, defineAction } from "astro:actions";
import { and, desc, eq } from "drizzle-orm";
import { z } from "astro/zod";
import { getDrizzle } from "@database/drizzle";
import { serviceComments, serviceFavorites, serviceReports, serviceReviews, serviceReviewHelpful } from "@database/schemas";
import { assertServiceInTenant, assertServicePermission, resolveServiceTenant, serviceOrganizationIdSchema, serviceRateLimit } from "./_helpers";
import { auditService, invalidateServicesCache } from "./_helpers";

const serviceIdInput = z.object({ serviceId: z.uuid(), organizationId: serviceOrganizationIdSchema });

export const toggleServiceFavorite = defineAction({ input: serviceIdInput, handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["read"] }); await assertServiceInTenant(input.serviceId, tenant); serviceRateLimit(context, user.id, "favorite");
  const db = getDrizzle(); const existing = (await db.select().from(serviceFavorites).where(and(eq(serviceFavorites.serviceId, input.serviceId), eq(serviceFavorites.userId, user.id))).limit(1))[0];
  if (existing) { await db.delete(serviceFavorites).where(and(eq(serviceFavorites.serviceId, input.serviceId), eq(serviceFavorites.userId, user.id))); auditService(context, user.id, "SERVICE_FAVORITE_REMOVE", { resource: "services", resourceId: input.serviceId }); invalidateServicesCache(); return { active: false }; }
  await db.insert(serviceFavorites).values({ serviceId: input.serviceId, userId: user.id }); auditService(context, user.id, "SERVICE_FAVORITE_ADD", { resource: "services", resourceId: input.serviceId }); invalidateServicesCache(); return { active: true };
} });

export const createServiceReview = defineAction({
  input: serviceIdInput.extend({ rating: z.coerce.number().int().min(1).max(5), title: z.string().trim().max(180).optional(), content: z.string().trim().min(1).max(5000), isRecommended: z.boolean().default(true) }),
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["read"] }); await assertServiceInTenant(input.serviceId, tenant); serviceRateLimit(context, user.id, "review");
    const db = getDrizzle(); const existing = (await db.select().from(serviceReviews).where(and(eq(serviceReviews.serviceId, input.serviceId), eq(serviceReviews.authorId, user.id))).limit(1))[0];
    if (existing) throw new ActionError({ code: "CONFLICT", message: "Vous avez déjà publié un avis pour ce service." });
    const [review] = await db.insert(serviceReviews).values({ serviceId: input.serviceId, authorId: user.id, rating: input.rating, title: input.title, content: input.content, isRecommended: input.isRecommended, status: "PENDING" }).returning({ id: serviceReviews.id });
    auditService(context, user.id, "SERVICE_REVIEW_MODERATE", { resource: "serviceReviews", resourceId: review.id, metadata: { action: "CREATE" } }); return review;
  },
});

export const createServiceComment = defineAction({
  input: serviceIdInput.extend({ parentId: z.uuid().optional().nullable(), content: z.string().trim().min(1).max(5000) }),
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["read"] }); await assertServiceInTenant(input.serviceId, tenant); serviceRateLimit(context, user.id, "comment");
    const db = getDrizzle();
    if (input.parentId) {
      const [parent] = await db.select({ id: serviceComments.id }).from(serviceComments).where(and(eq(serviceComments.id, input.parentId), eq(serviceComments.serviceId, input.serviceId))).limit(1);
      if (!parent) throw new ActionError({ code: "NOT_FOUND", message: "Commentaire parent introuvable pour ce service." });
    }
    const [comment] = await db.insert(serviceComments).values({ serviceId: input.serviceId, authorId: user.id, parentId: input.parentId ?? null, content: input.content, status: "PENDING" }).returning({ id: serviceComments.id });
    return comment;
  },
});

export const createServiceReport = defineAction({
  input: serviceIdInput.extend({ commentId: z.uuid().optional(), reviewId: z.uuid().optional(), reason: z.enum(["SPAM", "ABUSIVE", "OFF_TOPIC", "HATE_SPEECH", "OTHER"]), description: z.string().trim().max(2000).optional() }).refine((v) => Number(Boolean(v.commentId)) + Number(Boolean(v.reviewId)) <= 1, { message: "Un signalement ne peut cibler qu'un seul commentaire ou avis." }),
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["read"] }); await assertServiceInTenant(input.serviceId, tenant); serviceRateLimit(context, user.id, "report");
    const db = getDrizzle();
    if (input.commentId) {
      const [comment] = await db.select({ id: serviceComments.id }).from(serviceComments).where(and(eq(serviceComments.id, input.commentId), eq(serviceComments.serviceId, input.serviceId))).limit(1);
      if (!comment) throw new ActionError({ code: "NOT_FOUND", message: "Commentaire introuvable pour ce service." });
    }
    if (input.reviewId) {
      const [review] = await db.select({ id: serviceReviews.id }).from(serviceReviews).where(and(eq(serviceReviews.id, input.reviewId), eq(serviceReviews.serviceId, input.serviceId))).limit(1);
      if (!review) throw new ActionError({ code: "NOT_FOUND", message: "Avis introuvable pour ce service." });
    }
    const [report] = await db.insert(serviceReports).values({ serviceId: input.commentId || input.reviewId ? null : input.serviceId, commentId: input.commentId ?? null, reviewId: input.reviewId ?? null, reporterId: user.id, reason: input.reason, description: input.description }).returning({ id: serviceReports.id });
    return report;
  },
});

export const voteServiceReviewHelpful = defineAction({ input: serviceIdInput.extend({ reviewId: z.uuid(), isHelpful: z.boolean() }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { serviceReview: ["read"] }); await assertServiceInTenant(input.serviceId, tenant); serviceRateLimit(context, user.id, "review-helpful");
  const db = getDrizzle();
  const [review] = await db.select({ id: serviceReviews.id }).from(serviceReviews).where(and(eq(serviceReviews.id, input.reviewId), eq(serviceReviews.serviceId, input.serviceId))).limit(1);
  if (!review) throw new ActionError({ code: "NOT_FOUND", message: "Avis introuvable pour ce service." });
  await db.insert(serviceReviewHelpful).values({ reviewId: input.reviewId, userId: user.id, isHelpful: input.isHelpful }).onConflictDoUpdate({ target: [serviceReviewHelpful.reviewId, serviceReviewHelpful.userId], set: { isHelpful: input.isHelpful } });
  return { success: true };
} });

export async function listApprovedServiceReviews(serviceId: string) {
  return getDrizzle().select().from(serviceReviews).where(and(eq(serviceReviews.serviceId, serviceId), eq(serviceReviews.status, "APPROVED"))).orderBy(desc(serviceReviews.createdAt));
}
