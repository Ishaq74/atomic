import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { getDrizzle } from "@database/drizzle";
import { serviceNotifications } from "@database/schemas";
import { assertServicePermission, resolveServiceTenant, serviceOrganizationIdSchema } from "./_helpers";

export type ServiceNotificationType = "NEW_COMMENT" | "REPLY_TO_COMMENT" | "NEW_REVIEW" | "REVIEW_APPROVED" | "REVIEW_REJECTED" | "SERVICE_PUBLISHED" | "SERVICE_MENTION";

export async function createServiceNotification(input: {
  recipientId: string;
  serviceId: string;
  actorId?: string | null;
  type: ServiceNotificationType;
  title: string;
  message: string;
  commentId?: string | null;
  reviewId?: string | null;
}) {
  if (input.actorId && input.actorId === input.recipientId) return null;
  const [notification] = await getDrizzle().insert(serviceNotifications).values({
    recipientId: input.recipientId,
    actorId: input.actorId ?? null,
    serviceId: input.serviceId,
    commentId: input.commentId ?? null,
    reviewId: input.reviewId ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
  }).returning({ id: serviceNotifications.id });
  return notification ?? null;
}

export const listServiceNotifications = defineAction({ input: z.object({ organizationId: serviceOrganizationIdSchema, limit: z.coerce.number().int().min(1).max(100).default(50) }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["read"] });
  return getDrizzle().select().from(serviceNotifications).where(and(eq(serviceNotifications.recipientId, user.id), isNull(serviceNotifications.readAt))).orderBy(desc(serviceNotifications.createdAt)).limit(input.limit);
} });

export const markServiceNotificationRead = defineAction({ input: z.object({ id: z.uuid(), organizationId: serviceOrganizationIdSchema }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["read"] }); await getDrizzle().update(serviceNotifications).set({ readAt: new Date() }).where(and(eq(serviceNotifications.id, input.id), eq(serviceNotifications.recipientId, user.id))); return { success: true };
} });

export const markAllServiceNotificationsRead = defineAction({ input: z.object({ organizationId: serviceOrganizationIdSchema }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["read"] }); await getDrizzle().update(serviceNotifications).set({ readAt: new Date() }).where(and(eq(serviceNotifications.recipientId, user.id), isNull(serviceNotifications.readAt))); return { success: true };
} });
