import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { and, eq } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { serviceAvailability } from "@database/schemas";
import { assertServiceInTenant, assertServicePermission, resolveServiceTenant, serviceOrganizationIdSchema } from "./_helpers";
import { serviceAvailabilitySchema } from "@/modules/services/validation";
import { auditService, invalidateServicesCache } from "./_helpers";

export const createServiceAvailability = defineAction({ input: serviceAvailabilitySchema.extend({ organizationId: serviceOrganizationIdSchema }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["update"] }); await assertServiceInTenant(input.serviceId, tenant);
  const [row] = await getDrizzle().insert(serviceAvailability).values({ serviceId: input.serviceId, dayOfWeek: input.dayOfWeek, startTime: input.startTime, endTime: input.endTime, timezone: input.timezone, maxParticipants: input.maxParticipants ?? null }).returning();
  auditService(context, user.id, "SERVICE_UPDATE", { resource: "serviceAvailability", resourceId: row.id, metadata: { serviceId: input.serviceId, action: "CREATE" } }); invalidateServicesCache(); return row;
} });

export const updateServiceAvailability = defineAction({ input: serviceAvailabilitySchema.extend({ id: z.uuid(), organizationId: serviceOrganizationIdSchema }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["update"] }); await assertServiceInTenant(input.serviceId, tenant);
  const [row] = await getDrizzle().update(serviceAvailability).set({ dayOfWeek: input.dayOfWeek, startTime: input.startTime, endTime: input.endTime, timezone: input.timezone, maxParticipants: input.maxParticipants ?? null }).where(and(eq(serviceAvailability.id, input.id), eq(serviceAvailability.serviceId, input.serviceId))).returning(); if (!row) throw new ActionError({ code: "NOT_FOUND", message: "Disponibilité introuvable." });
  auditService(context, user.id, "SERVICE_UPDATE", { resource: "serviceAvailability", resourceId: row.id, metadata: { serviceId: input.serviceId, action: "UPDATE" } }); invalidateServicesCache(); return row;
} });

export const deleteServiceAvailability = defineAction({ input: z.object({ id: z.uuid(), serviceId: z.uuid(), organizationId: serviceOrganizationIdSchema }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["update"] }); await assertServiceInTenant(input.serviceId, tenant); const result = await getDrizzle().delete(serviceAvailability).where(and(eq(serviceAvailability.id, input.id), eq(serviceAvailability.serviceId, input.serviceId))).returning({ id: serviceAvailability.id }); if (!result[0]) throw new ActionError({ code: "NOT_FOUND", message: "Disponibilité introuvable." });
  auditService(context, user.id, "SERVICE_UPDATE", { resource: "serviceAvailability", resourceId: input.id, metadata: { serviceId: input.serviceId, action: "DELETE" } }); invalidateServicesCache(); return { success: true };
} });
