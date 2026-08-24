import { and, eq } from "drizzle-orm";
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { getDrizzle } from "@database/drizzle";
import { serviceAttributeDefinitions, serviceAttributeValues } from "@database/schemas";
import { assertServiceInTenant, assertServicePermission, resolveServiceTenant, serviceOrganizationIdSchema } from "./_helpers";

const attributeDefinitionInput = z.object({
  organizationId: serviceOrganizationIdSchema,
  key: z.string().trim().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().trim().min(1).max(120),
  type: z.enum(["STRING", "NUMBER", "BOOLEAN", "SELECT"]),
  options: z.array(z.string().trim().min(1)).max(100).default([]),
  required: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(100_000).default(0),
});

async function assertAttributeDefinitionInTenant(definitionId: string, tenant: ReturnType<typeof resolveServiceTenant>) {
  const [definition] = await getDrizzle()
    .select({ id: serviceAttributeDefinitions.id, organizationId: serviceAttributeDefinitions.organizationId })
    .from(serviceAttributeDefinitions)
    .where(eq(serviceAttributeDefinitions.id, definitionId))
    .limit(1);
  if (!definition) throw new ActionError({ code: "NOT_FOUND", message: "Définition d’attribut introuvable." });
  if ((definition.organizationId ?? null) !== tenant.organizationId) throw new ActionError({ code: "FORBIDDEN", message: "Cet attribut n'appartient pas à ce tenant." });
  return definition;
}

export const createServiceAttributeDefinition = defineAction({
  input: attributeDefinitionInput,
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input);
    await assertServicePermission(context, tenant, { service: ["update"] });
    const [row] = await getDrizzle().insert(serviceAttributeDefinitions).values({
      organizationId: tenant.organizationId,
      key: input.key,
      label: input.label,
      type: input.type,
      options: input.options.length ? JSON.stringify(input.options) : null,
      required: input.required,
      sortOrder: input.sortOrder,
    }).returning();
    return row;
  },
});

export const setServiceAttributeValue = defineAction({
  input: z.object({
    serviceId: z.uuid(),
    organizationId: serviceOrganizationIdSchema,
    definitionId: z.uuid(),
    stringValue: z.string().optional().nullable(),
    numberValue: z.coerce.number().int().optional().nullable(),
    booleanValue: z.boolean().optional().nullable(),
    selectedValue: z.string().optional().nullable(),
  }),
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input);
    await assertServicePermission(context, tenant, { service: ["update"] });
    await assertServiceInTenant(input.serviceId, tenant);
    await assertAttributeDefinitionInTenant(input.definitionId, tenant);
    const db = getDrizzle();
    await db.insert(serviceAttributeValues).values({
      serviceId: input.serviceId,
      definitionId: input.definitionId,
      stringValue: input.stringValue ?? null,
      numberValue: input.numberValue ?? null,
      booleanValue: input.booleanValue ?? null,
      selectedValue: input.selectedValue ?? null,
    }).onConflictDoUpdate({
      target: [serviceAttributeValues.serviceId, serviceAttributeValues.definitionId],
      set: {
        stringValue: input.stringValue ?? null,
        numberValue: input.numberValue ?? null,
        booleanValue: input.booleanValue ?? null,
        selectedValue: input.selectedValue ?? null,
        updatedAt: new Date(),
      },
    });
    return { success: true };
  },
});
