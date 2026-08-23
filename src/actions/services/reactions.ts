import { defineAction } from "astro:actions";
import { and, eq } from "drizzle-orm";
import { z } from "astro/zod";
import { getDrizzle } from "@database/drizzle";
import { serviceReactions } from "@database/schemas";
import { assertServiceInTenant, assertServicePermission, resolveServiceTenant, serviceOrganizationIdSchema } from "./_helpers";
import { auditService } from "./_helpers";
import type { ServiceReactionType } from "@/modules/services/domain";

export const toggleServiceReaction = defineAction({
  input: z.object({ serviceId: z.uuid(), organizationId: serviceOrganizationIdSchema, reactionType: z.enum(["LIKE", "LOVE", "FIRE", "CLAP"]) }),
  handler: async (input, context) => {
    const tenant = resolveServiceTenant(input);
    const user = await assertServicePermission(context, tenant, { service: ["read"] });
    await assertServiceInTenant(input.serviceId, tenant);
    const db = getDrizzle();
    const existing = (await db.select().from(serviceReactions).where(and(eq(serviceReactions.serviceId, input.serviceId), eq(serviceReactions.userId, user.id))).limit(1))[0];
    if (!existing) {
      await db.insert(serviceReactions).values({ serviceId: input.serviceId, userId: user.id, reactionType: input.reactionType as ServiceReactionType });
      auditService(context, user.id, "SERVICE_REACTION_ADD", { resource: "services", resourceId: input.serviceId, metadata: { reactionType: input.reactionType } });
      return { active: input.reactionType };
    }
    if (existing.reactionType === input.reactionType) {
      await db.delete(serviceReactions).where(and(eq(serviceReactions.serviceId, input.serviceId), eq(serviceReactions.userId, user.id)));
      auditService(context, user.id, "SERVICE_REACTION_REMOVE", { resource: "services", resourceId: input.serviceId, metadata: { reactionType: input.reactionType } });
      return { active: null };
    }
    await db.update(serviceReactions).set({ reactionType: input.reactionType as ServiceReactionType, updatedAt: new Date() }).where(and(eq(serviceReactions.serviceId, input.serviceId), eq(serviceReactions.userId, user.id)));
    return { active: input.reactionType };
  },
});
