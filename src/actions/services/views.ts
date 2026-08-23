import { defineAction } from "astro:actions";
import { eq } from "drizzle-orm";
import { z } from "astro/zod";
import { getDrizzle } from "@database/drizzle";
import { services, serviceViewStats } from "@database/schemas";
import { extractIp } from "@/lib/audit";
import { resolveServiceTenant, assertServiceInTenant, serviceOrganizationIdSchema } from "./_helpers";

export const recordServiceView = defineAction({ input: z.object({ serviceId: z.uuid(), organizationId: serviceOrganizationIdSchema, referrer: z.string().url().optional().nullable(), country: z.string().length(2).optional().nullable() }), handler: async (input, context) => {
  const tenant = resolveServiceTenant(input);
  await assertServiceInTenant(input.serviceId, tenant);
  const now = new Date();
  const db = getDrizzle();
  await db.insert(serviceViewStats).values({ serviceId: input.serviceId, viewedAt: now, date: now.toISOString().slice(0, 10), hour: now.getUTCHours(), referrer: input.referrer ?? context.request.headers.get("referer"), country: input.country ?? null });
  await db.update(services).set({ viewCount: services.viewCount }).where(eq(services.id, input.serviceId));
  return { success: true };
});
