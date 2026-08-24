import { defineAction, ActionError } from "astro:actions";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "astro/zod";
import { getDrizzle } from "@database/drizzle";
import { serviceCategories, serviceCategoryTranslations, serviceTags, serviceTagTranslations } from "@database/schemas";
import { assertAcyclicParent } from "@/core/taxonomy";
import { serviceOrganizationIdSchema, assertServicePermission, assertServiceCategoryInTenant, assertServiceTagInTenant, resolveServiceTenant } from "./_helpers";
import { invalidateServicesCache, auditService } from "./_helpers";

const categoryInput = z.object({ organizationId: serviceOrganizationIdSchema, locale: z.enum(["fr", "en", "es", "ar"]), name: z.string().trim().min(1).max(120), slug: z.string().trim().min(1).max(160), description: z.string().trim().max(500).optional().nullable(), parentId: z.uuid().optional().nullable(), clearParent: z.boolean().default(false), icon: z.string().optional().nullable(), color: z.string().optional().nullable(), sortOrder: z.coerce.number().int().default(0) });
const tagInput = z.object({ organizationId: serviceOrganizationIdSchema, locale: z.enum(["fr", "en", "es", "ar"]), name: z.string().trim().min(1).max(120), slug: z.string().trim().min(1).max(160), color: z.string().optional().nullable() });

export const createServiceCategory = defineAction({ input: categoryInput, handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { serviceCategory: ["create"] });
  if (input.parentId) await assertServiceCategoryInTenant(input.parentId, tenant);
  const db = getDrizzle(); const siblings = await db.select().from(serviceCategories).where(tenant.organizationId === null ? isNull(serviceCategories.organizationId) : eq(serviceCategories.organizationId, tenant.organizationId));
  assertAcyclicParent(siblings, null, input.parentId ?? null);
  const [row] = await db.insert(serviceCategories).values({ organizationId: tenant.organizationId, parentId: input.parentId ?? null, slug: input.slug, icon: input.icon ?? null, color: input.color ?? null, sortOrder: input.sortOrder }).returning({ id: serviceCategories.id });
  await db.insert(serviceCategoryTranslations).values({ categoryId: row.id, organizationId: tenant.organizationId, locale: input.locale, name: input.name, slug: input.slug, description: input.description ?? null });
  auditService(context, user.id, "SERVICE_CATEGORY_CREATE", { resource: "serviceCategories", resourceId: row.id }); invalidateServicesCache(); return row;
} });

export const updateServiceCategory = defineAction({ input: categoryInput.extend({ id: z.uuid() }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { serviceCategory: ["update"] }); await assertServiceCategoryInTenant(input.id, tenant);
  const db = getDrizzle();
  const [current] = await db.select({ id: serviceCategories.id, parentId: serviceCategories.parentId }).from(serviceCategories).where(eq(serviceCategories.id, input.id)).limit(1);
  if (!current) throw new ActionError({ code: "NOT_FOUND", message: "Catégorie introuvable." });
  const nextParentId = input.parentId !== undefined ? input.parentId : (input.clearParent ? null : current.parentId);
  if (nextParentId) await assertServiceCategoryInTenant(nextParentId, tenant);
  const nodes = await db.select({ id: serviceCategories.id, parentId: serviceCategories.parentId }).from(serviceCategories).where(tenant.organizationId === null ? isNull(serviceCategories.organizationId) : eq(serviceCategories.organizationId, tenant.organizationId));
  assertAcyclicParent(nodes, input.id, nextParentId ?? null);
  await db.update(serviceCategories).set({ parentId: nextParentId ?? null, slug: input.slug, icon: input.icon ?? null, color: input.color ?? null, sortOrder: input.sortOrder }).where(eq(serviceCategories.id, input.id));
  const [translation] = await db.select({ id: serviceCategoryTranslations.id }).from(serviceCategoryTranslations).where(and(eq(serviceCategoryTranslations.categoryId, input.id), eq(serviceCategoryTranslations.locale, input.locale))).limit(1);
  if (translation) await db.update(serviceCategoryTranslations).set({ name: input.name, slug: input.slug, description: input.description ?? null }).where(eq(serviceCategoryTranslations.id, translation.id)); else await db.insert(serviceCategoryTranslations).values({ categoryId: input.id, organizationId: tenant.organizationId, locale: input.locale, name: input.name, slug: input.slug, description: input.description ?? null });
  auditService(context, user.id, "SERVICE_CATEGORY_UPDATE", { resource: "serviceCategories", resourceId: input.id }); invalidateServicesCache(); return { id: input.id };
} });

export const deleteServiceCategory = defineAction({ input: z.object({ id: z.uuid(), organizationId: serviceOrganizationIdSchema }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { serviceCategory: ["delete"] }); await assertServiceCategoryInTenant(input.id, tenant); const db = getDrizzle(); const child = await db.select({ id: serviceCategories.id }).from(serviceCategories).where(and(eq(serviceCategories.parentId, input.id), tenant.organizationId === null ? isNull(serviceCategories.organizationId) : eq(serviceCategories.organizationId, tenant.organizationId))).limit(1); if (child.length) throw new ActionError({ code: "CONFLICT", message: "Cette catégorie possède des sous-catégories." }); await db.delete(serviceCategories).where(eq(serviceCategories.id, input.id)); auditService(context, user.id, "SERVICE_CATEGORY_DELETE", { resource: "serviceCategories", resourceId: input.id }); invalidateServicesCache(); return { success: true };
} });

export const createServiceTag = defineAction({ input: tagInput, handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { serviceTag: ["create"] }); const db = getDrizzle(); const [row] = await db.insert(serviceTags).values({ organizationId: tenant.organizationId, slug: input.slug, color: input.color ?? null }).returning({ id: serviceTags.id }); await db.insert(serviceTagTranslations).values({ tagId: row.id, organizationId: tenant.organizationId, locale: input.locale, name: input.name, slug: input.slug }); auditService(context, user.id, "SERVICE_TAG_CREATE", { resource: "serviceTags", resourceId: row.id }); invalidateServicesCache(); return row;
} });

export const updateServiceTag = defineAction({ input: tagInput.extend({ id: z.uuid() }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { serviceTag: ["update"] }); await assertServiceTagInTenant(input.id, tenant); const db = getDrizzle(); await db.update(serviceTags).set({ slug: input.slug, color: input.color ?? null }).where(eq(serviceTags.id, input.id)); const [translation] = await db.select({ id: serviceTagTranslations.id }).from(serviceTagTranslations).where(and(eq(serviceTagTranslations.tagId, input.id), eq(serviceTagTranslations.locale, input.locale))).limit(1); if (translation) await db.update(serviceTagTranslations).set({ name: input.name, slug: input.slug }).where(eq(serviceTagTranslations.id, translation.id)); else await db.insert(serviceTagTranslations).values({ tagId: input.id, organizationId: tenant.organizationId, locale: input.locale, name: input.name, slug: input.slug }); auditService(context, user.id, "SERVICE_TAG_UPDATE", { resource: "serviceTags", resourceId: input.id }); invalidateServicesCache(); return { id: input.id };
} });

export const deleteServiceTag = defineAction({ input: z.object({ id: z.uuid(), organizationId: serviceOrganizationIdSchema }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input); const user = await assertServicePermission(context, tenant, { serviceTag: ["delete"] }); await assertServiceTagInTenant(input.id, tenant); await getDrizzle().delete(serviceTags).where(eq(serviceTags.id, input.id)); auditService(context, user.id, "SERVICE_TAG_DELETE", { resource: "serviceTags", resourceId: input.id }); invalidateServicesCache(); return { success: true };
} });
