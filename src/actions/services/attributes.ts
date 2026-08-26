import { and, eq, isNull } from "drizzle-orm";
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { getDrizzle } from "@database/drizzle";
import { serviceAttributeDefinitions, serviceAttributeValues } from "@database/schemas";
import { assertServiceInTenant, assertServicePermission, resolveServiceTenant, serviceOrganizationIdSchema } from "./_helpers";
import { getServiceErrorMessage } from "@/modules/services/i18n";
import { auditService, invalidateServicesCache } from "./_helpers";

export const serviceAttributeDefinitionSchema = z.object({
  organizationId: serviceOrganizationIdSchema,
  locale: z.enum(["fr", "en", "es", "ar"]).default("fr"),
  key: z.string().trim().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().trim().min(1).max(120),
  type: z.enum(["STRING", "NUMBER", "BOOLEAN", "SELECT"]),
  options: z.array(z.string().trim().min(1)).max(100).default([]),
  required: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(100_000).default(0),
}).superRefine((value, ctx) => {
  if (value.type !== "SELECT" && value.options.length) ctx.addIssue({ code: "custom", path: ["options"], message: "Attribute options are only valid for SELECT." });
  if (value.type === "SELECT" && value.options.length === 0) ctx.addIssue({ code: "custom", path: ["options"], message: "SELECT attributes require at least one option." });
});

export const serviceAttributeValueSchema = z.object({
  serviceId: z.uuid(),
  organizationId: serviceOrganizationIdSchema,
  locale: z.enum(["fr", "en", "es", "ar"]).default("fr"),
  definitionId: z.uuid(),
  stringValue: z.string().optional().nullable(),
  numberValue: z.coerce.number().int().optional().nullable(),
  booleanValue: z.boolean().optional().nullable(),
  selectedValue: z.string().optional().nullable(),
}).superRefine((value, ctx) => {
  const supplied = [value.stringValue !== null && value.stringValue !== undefined, value.numberValue !== null && value.numberValue !== undefined, value.booleanValue !== null && value.booleanValue !== undefined, value.selectedValue !== null && value.selectedValue !== undefined].filter(Boolean).length;
  if (supplied > 1) ctx.addIssue({ code: "custom", path: ["stringValue"], message: "Only one attribute value representation may be supplied." });
});

async function assertAttributeDefinitionInTenant(definitionId: string, tenant: ReturnType<typeof resolveServiceTenant>) {
  const [definition] = await getDrizzle().select().from(serviceAttributeDefinitions).where(eq(serviceAttributeDefinitions.id, definitionId)).limit(1);
  if (!definition) throw new ActionError({ code: "NOT_FOUND", message: getServiceErrorMessage(tenant.locale, "NOT_FOUND") });
  if ((definition.organizationId ?? null) !== tenant.organizationId) throw new ActionError({ code: "FORBIDDEN", message: getServiceErrorMessage(tenant.locale, "FORBIDDEN") });
  return definition;
}

export const createServiceAttributeDefinition = defineAction({
  input: serviceAttributeDefinitionSchema,
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["update"] }); const db = getDrizzle();
    const tenantPredicate = tenant.organizationId === null ? isNull(serviceAttributeDefinitions.organizationId) : eq(serviceAttributeDefinitions.organizationId, tenant.organizationId);
    const existing = await db.select({ id: serviceAttributeDefinitions.id }).from(serviceAttributeDefinitions).where(and(eq(serviceAttributeDefinitions.key, input.key), tenantPredicate)).limit(1);
    if (existing.length) throw new ActionError({ code: "CONFLICT", message: getServiceErrorMessage(tenant.locale, "CONFLICT") });
    const [row] = await db.insert(serviceAttributeDefinitions).values({ organizationId: tenant.organizationId, key: input.key, label: input.label, type: input.type, options: input.options.length ? JSON.stringify(input.options) : null, required: input.required, sortOrder: input.sortOrder }).returning();
    auditService(context, user.id, "SERVICE_UPDATE", { resource: "serviceAttributeDefinitions", resourceId: row.id, metadata: { organizationId: tenant.organizationId, action: "CREATE" } }); invalidateServicesCache(); return row;
  },
});

export const setServiceAttributeValue = defineAction({
  input: serviceAttributeValueSchema,
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { service: ["update"] }); await assertServiceInTenant(input.serviceId, tenant); const definition = await assertAttributeDefinitionInTenant(input.definitionId, tenant);
    if (definition.type === "STRING" && input.stringValue === undefined) throw new ActionError({ code: "BAD_REQUEST", message: getServiceErrorMessage(tenant.locale, "BAD_REQUEST") });
    if (definition.type === "NUMBER" && input.numberValue === undefined) throw new ActionError({ code: "BAD_REQUEST", message: getServiceErrorMessage(tenant.locale, "BAD_REQUEST") });
    if (definition.type === "BOOLEAN" && input.booleanValue === undefined) throw new ActionError({ code: "BAD_REQUEST", message: getServiceErrorMessage(tenant.locale, "BAD_REQUEST") });
    if (definition.type === "SELECT") {
      if (input.selectedValue === undefined) throw new ActionError({ code: "BAD_REQUEST", message: getServiceErrorMessage(tenant.locale, "BAD_REQUEST") });
      const options = definition.options ? JSON.parse(definition.options) as string[] : [];
      if (input.selectedValue && !options.includes(input.selectedValue)) throw new ActionError({ code: "BAD_REQUEST", message: getServiceErrorMessage(tenant.locale, "BAD_REQUEST") });
    }
    const db = getDrizzle();
    await db.insert(serviceAttributeValues).values({ serviceId: input.serviceId, definitionId: input.definitionId, stringValue: input.stringValue ?? null, numberValue: input.numberValue ?? null, booleanValue: input.booleanValue ?? null, selectedValue: input.selectedValue ?? null }).onConflictDoUpdate({ target: [serviceAttributeValues.serviceId, serviceAttributeValues.definitionId], set: { stringValue: input.stringValue ?? null, numberValue: input.numberValue ?? null, booleanValue: input.booleanValue ?? null, selectedValue: input.selectedValue ?? null, updatedAt: new Date() } });
    auditService(context, user.id, "SERVICE_UPDATE", { resource: "serviceAttributeValues", resourceId: input.serviceId, metadata: { organizationId: tenant.organizationId, definitionId: input.definitionId } }); invalidateServicesCache(); return { success: true };
  },
});
