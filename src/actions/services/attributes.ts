import { defineAction } from "astro:actions";
import { and, eq } from "drizzle-orm";
import { z } from "astro/zod";
import { getDrizzle } from "@database/drizzle";
import { serviceAttributeDefinitions, serviceAttributeValues } from "@database/schemas";
import { assertServiceInTenant, assertServicePermission, resolveServiceTenant, serviceOrganizationIdSchema } from "./_helpers";

export const createServiceAttributeDefinition = defineAction({ input: z.object({ organizationId: serviceOrganizationIdSchema, key: z.string().trim().regex(/^[a-z][a-z0-9_]*$/), label: z.string().trim().min(1).max(120), type: z.enum(["STRING", "NUMBER", "BOOLEAN", "SELECT"]), options: z.array(z.string().trim().min(1)).default([]), required: z.boolean().default(false), sortOrder: z.coerce.number().int().default(0) }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); await assertServicePermission(context, tenant, { service: ["update"] });
  const [row] = await getDrizzle().insert(serviceAttributeDefinitions).values({ organizationId: tenant.organizationId, key: input.key, label: input.label, type: input.type, options: input.options.length ? JSON.stringify(input.options) : null, required: input.required, sortOrder: input.sortOrder }).returning(); return row;
} });

export const setServiceAttributeValue = defineAction({ input: z.object({ serviceId: z.uuid(), organizationId: serviceOrganizationIdSchema, definitionId: z.uuid(), stringValue: z.string().optional().nullable(), numberValue: z.coerce.number().int().optional().nullable(), booleanValue: z.boolean().optional().nullable(), selectedValue: z.string().optional().nullable() }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); await assertServicePermission(context, tenant, { service: ["update"] }); await assertServiceInTenant(input.serviceId, tenant);
  const db = getDrizzle(); await db.insert(serviceAttributeValues).values({ serviceId: input.serviceId, definitionId: input.definitionId, stringValue: input.stringValue ?? null, numberValue: input.numberValue ?? null, booleanValue: input.booleanValue ?? null, selectedValue: input.selectedValue ?? null }).onConflictDoUpdate({ target: [serviceAttributeValues.serviceId, serviceAttributeValues.definitionId], set: { stringValue: input.stringValue ?? null, numberValue: input.numberValue ?? null, booleanValue: input.booleanValue ?? null, selectedValue: input.selectedValue ?? null, updatedAt: new Date() } }); return { success: true };
} });
