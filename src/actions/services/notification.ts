import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { getDrizzle } from "@database/drizzle";
import { serviceComments, serviceNotifications, serviceReviews, services } from "@database/schemas";
import type { Locale } from "@i18n/config";
import { getServiceNotificationTranslations } from "@/modules/services/i18n/notifications";
import { assertServicePermission, resolveServiceTenant, serviceOrganizationIdSchema } from "./_helpers";

export type ServiceNotificationType = "NEW_COMMENT" | "REPLY_TO_COMMENT" | "NEW_REVIEW" | "REVIEW_APPROVED" | "REVIEW_REJECTED" | "SERVICE_PUBLISHED" | "SERVICE_MENTION";

export async function createServiceNotification(input: {
  recipientId: string;
  serviceId: string;
  actorId?: string | null;
  type: ServiceNotificationType;
  title?: string;
  message?: string;
  commentId?: string | null;
  reviewId?: string | null;
  locale?: Locale;
}) {
  const db = getDrizzle();
  const [service] = await db.select({ id: services.id }).from(services).where(eq(services.id, input.serviceId)).limit(1);
  if (!service || (input.actorId && input.actorId === input.recipientId)) return null;

  if (input.type === "NEW_COMMENT" || input.type === "REPLY_TO_COMMENT") {
    if (!input.commentId) return null;
    const [comment] = await db.select({ id: serviceComments.id, serviceId: serviceComments.serviceId }).from(serviceComments).where(eq(serviceComments.id, input.commentId)).limit(1);
    if (!comment || comment.serviceId !== input.serviceId) return null;
  }
  if (input.type === "NEW_REVIEW" || input.type === "REVIEW_APPROVED" || input.type === "REVIEW_REJECTED") {
    if (!input.reviewId) return null;
    const [review] = await db.select({ id: serviceReviews.id, serviceId: serviceReviews.serviceId }).from(serviceReviews).where(eq(serviceReviews.id, input.reviewId)).limit(1);
    if (!review || review.serviceId !== input.serviceId) return null;
  }

  const t = getServiceNotificationTranslations(input.locale ?? "fr");
  const defaults = input.type === "SERVICE_PUBLISHED"
    ? { title: t.publishedTitle, message: t.publishedMessage }
    : input.type === "NEW_REVIEW" ? { title: t.reviewTitle, message: t.reviewMessage }
    : input.type === "NEW_COMMENT" ? { title: t.commentTitle, message: t.contributionPending }
    : input.type === "REPLY_TO_COMMENT" ? { title: t.commentReplyTitle, message: t.contributionPending }
    : { title: t.contributionPending, message: t.contributionPending };

  const [notification] = await db.insert(serviceNotifications).values({ recipientId: input.recipientId, actorId: input.actorId ?? null, serviceId: input.serviceId, commentId: input.commentId ?? null, reviewId: input.reviewId ?? null, type: input.type, title: input.title ?? defaults.title, message: input.message ?? defaults.message }).returning({ id: serviceNotifications.id });
  return notification ?? null;
}

function tenantScope(organizationId: string | null) { return organizationId === null ? isNull(services.organizationId) : eq(services.organizationId, organizationId); }
const notificationInput = z.object({ organizationId: serviceOrganizationIdSchema });

export const listServiceNotifications = defineAction({
  input: notificationInput.extend({ limit: z.coerce.number().int().min(1).max(100).default(50) }),
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["read"] });
    return getDrizzle().select({ notification: serviceNotifications }).from(serviceNotifications).innerJoin(services, eq(serviceNotifications.serviceId, services.id)).where(and(eq(serviceNotifications.recipientId, user.id), isNull(serviceNotifications.readAt), tenantScope(tenant.organizationId))).orderBy(desc(serviceNotifications.createdAt)).limit(input.limit);
  },
});

export const markServiceNotificationRead = defineAction({
  input: z.object({ id: z.uuid(), organizationId: serviceOrganizationIdSchema }),
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["read"] }); const db = getDrizzle();
    const [notification] = await db.select({ id: serviceNotifications.id }).from(serviceNotifications).innerJoin(services, eq(serviceNotifications.serviceId, services.id)).where(and(eq(serviceNotifications.id, input.id), eq(serviceNotifications.recipientId, user.id), tenantScope(tenant.organizationId))).limit(1);
    if (!notification) return { success: false };
    await db.update(serviceNotifications).set({ readAt: new Date() }).where(eq(serviceNotifications.id, notification.id)); return { success: true };
  },
});

export const markAllServiceNotificationsRead = defineAction({
  input: notificationInput,
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["read"] }); const db = getDrizzle();
    const rows = await db.select({ id: serviceNotifications.id }).from(serviceNotifications).innerJoin(services, eq(serviceNotifications.serviceId, services.id)).where(and(eq(serviceNotifications.recipientId, user.id), isNull(serviceNotifications.readAt), tenantScope(tenant.organizationId)));
    if (rows.length) await db.update(serviceNotifications).set({ readAt: new Date() }).where(inArray(serviceNotifications.id, rows.map((row) => row.id)));
    return { success: true };
  },
});