import { defineAction } from "astro:actions";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "astro/zod";
import { getDrizzle } from "@database/drizzle";
import { serviceNotifications } from "@database/schemas";
import { assertServicePermission, resolveServiceTenant, serviceOrganizationIdSchema } from "./_helpers";

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
