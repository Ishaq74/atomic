import { ActionError, defineAction } from "astro:actions";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "astro/zod";
import { getDrizzle } from "@database/drizzle";
import { serviceLocks, serviceRevisions, serviceTranslations, services } from "@database/schemas";
import { assertServiceLockOwner, assertServicePermission, resolveServiceTenant, serviceOrganizationIdSchema } from "@/modules/services/permissions";
import { assertValidServiceTransition, type ServiceStatus } from "@/modules/services/workflow";
import { auditService, invalidateServicesCache } from "./_helpers";

const bulkInput = z.object({
  ids: z.array(z.uuid()).min(1).max(100),
  organizationId: serviceOrganizationIdSchema,
  operation: z.enum(["publish", "archive", "restore", "delete"]),
});

type BulkOperation = z.infer<typeof bulkInput>["operation"];

const targetStatus: Record<BulkOperation, ServiceStatus> = {
  publish: "PUBLISHED",
  archive: "ARCHIVED",
  restore: "DRAFT",
  delete: "DELETED",
};

const permissionFor: Record<BulkOperation, "publish" | "update" | "delete"> = {
  publish: "publish",
  archive: "update",
  restore: "update",
  delete: "delete",
};

const auditFor: Record<BulkOperation, "SERVICE_PUBLISH" | "SERVICE_ARCHIVE" | "SERVICE_RESTORE" | "SERVICE_DELETE"> = {
  publish: "SERVICE_PUBLISH",
  archive: "SERVICE_ARCHIVE",
  restore: "SERVICE_RESTORE",
  delete: "SERVICE_DELETE",
};

export const bulkServiceLifecycle = defineAction({
  input: bulkInput,
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input);
    const user = await assertServicePermission(context, tenant, { service: [permissionFor[input.operation]] });
    const db = getDrizzle();
    const rows = await db.select().from(services).where(and(eq(services.organizationId, tenant.organizationId), inArray(services.id, input.ids)));
    if (rows.length !== input.ids.length) throw new ActionError({ code: "FORBIDDEN", message: "Un ou plusieurs services ne sont pas accessibles dans ce tenant." });
    const locks = await db.select().from(serviceLocks).where(inArray(serviceLocks.serviceId, input.ids));
    for (const lock of locks) {
      if (lock.expiresAt > new Date() && (lock.userId !== user.id || lock.sessionId !== (context.locals.session?.id ?? ""))) {
        throw new ActionError({ code: "CONFLICT", message: "Un des services sélectionnés est actuellement verrouillé par un autre éditeur." });
      }
    }
    const to = targetStatus[input.operation];
    for (const row of rows) assertValidServiceTransition(row.status as ServiceStatus, to);

    await db.transaction(async (tx) => {
      for (const row of rows) {
        await tx.update(services).set({ status: to, publishedAt: to === "PUBLISHED" ? new Date() : null, updatedBy: user.id }).where(eq(services.id, row.id));
        const [translation] = await tx.select().from(serviceTranslations).where(eq(serviceTranslations.serviceId, row.id)).orderBy(serviceTranslations.locale).limit(1);
        if (translation) {
          await tx.insert(serviceRevisions).values({ serviceId: row.id, authorId: user.id, locale: translation.locale, title: translation.title, slug: translation.slug, content: translation.content, excerpt: translation.excerpt, status: to === "PUBLISHED" ? "PUBLISHED" : to === "ARCHIVED" ? "ARCHIVED" : "DRAFT", revisionNote: `Action groupée : ${input.operation}` });
        }
      }
    });

    for (const row of rows) {
      auditService(context, user.id, auditFor[input.operation], {
        resource: "services",
        resourceId: row.id,
        metadata: { organizationId: tenant.organizationId, bulk: true, from: row.status, to },
      });
    }
    invalidateServicesCache();
    return { updated: rows.length };
  },
});
