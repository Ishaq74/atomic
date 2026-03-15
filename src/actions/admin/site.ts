import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { siteSettings } from "@database/schemas";
import { requireAdmin, adminRateLimit, auditAdmin } from "./_helpers";

export const updateSiteSettings = defineAction({
  input: z.object({
    id: z.string().min(1, "L'identifiant est requis."),
    siteName: z.string().min(1, "Le nom du site est requis.").max(200, "Le nom du site ne peut pas dépasser 200 caractères.").optional(),
    siteDescription: z.string().max(500, "La description ne peut pas dépasser 500 caractères.").nullable().optional(),
    siteSlogan: z.string().max(200, "Le slogan ne peut pas dépasser 200 caractères.").nullable().optional(),
    metaTitle: z.string().max(70, "Le meta title ne peut pas dépasser 70 caractères.").nullable().optional(),
    metaDescription: z.string().max(160, "La meta description ne peut pas dépasser 160 caractères.").nullable().optional(),
    logoLight: z.string().max(500).nullable().optional(),
    logoDark: z.string().max(500).nullable().optional(),
    favicon: z.string().max(500).nullable().optional(),
    ogImage: z.string().max(500).nullable().optional(),
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "site");

    const { id, ...data } = input;
    const db = getDrizzle();
    const [updated] = await db
      .update(siteSettings)
      .set(data)
      .where(eq(siteSettings.id, id))
      .returning();

    if (!updated) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Paramètre de site introuvable.",
      });
    }

    auditAdmin(context, user.id, "SITE_SETTINGS_UPDATE", {
      resource: "site_settings",
      resourceId: id,
      metadata: { locale: updated.locale },
    });

    return updated;
  },
});
