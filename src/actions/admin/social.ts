import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq, asc } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { socialLinks } from "@database/schemas";
import { requireAdmin, adminRateLimit, auditAdmin } from "./_helpers";

const socialLinkBase = z.object({
  platform: z
    .string()
    .min(1, "Le nom de la plateforme est requis.")
    .max(50, "Le nom de la plateforme ne peut pas dépasser 50 caractères."),
  url: z
    .string()
    .url("L'URL du réseau social est invalide.")
    .max(500, "L'URL ne peut pas dépasser 500 caractères."),
  icon: z
    .string()
    .max(50, "L'icône ne peut pas dépasser 50 caractères.")
    .nullable()
    .optional(),
  label: z
    .string()
    .max(100, "Le libellé ne peut pas dépasser 100 caractères.")
    .nullable()
    .optional(),
  sortOrder: z
    .number()
    .int("L'ordre doit être un nombre entier.")
    .min(0, "L'ordre doit être positif.")
    .optional(),
  isActive: z.boolean().optional(),
});

export const createSocialLink = defineAction({
  input: socialLinkBase,
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "social");

    const db = getDrizzle();
    const [created] = await db.insert(socialLinks).values(input).returning();

    auditAdmin(context, user.id, "SOCIAL_LINK_CREATE", {
      resource: "social_links",
      resourceId: created.id,
      metadata: { platform: created.platform },
    });

    return created;
  },
});

export const updateSocialLink = defineAction({
  input: socialLinkBase.partial().extend({
    id: z.string().min(1, "L'identifiant est requis."),
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "social");

    const { id, ...data } = input;
    const db = getDrizzle();
    const [updated] = await db
      .update(socialLinks)
      .set(data)
      .where(eq(socialLinks.id, id))
      .returning();

    if (!updated) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Lien social introuvable.",
      });
    }

    auditAdmin(context, user.id, "SOCIAL_LINK_UPDATE", {
      resource: "social_links",
      resourceId: id,
    });

    return updated;
  },
});

export const deleteSocialLink = defineAction({
  input: z.object({
    id: z.string().min(1, "L'identifiant est requis."),
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "social");

    const db = getDrizzle();
    const [deleted] = await db
      .delete(socialLinks)
      .where(eq(socialLinks.id, input.id))
      .returning({ id: socialLinks.id });

    if (!deleted) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Lien social introuvable.",
      });
    }

    auditAdmin(context, user.id, "SOCIAL_LINK_DELETE", {
      resource: "social_links",
      resourceId: input.id,
    });

    return { success: true as const };
  },
});

export const reorderSocialLinks = defineAction({
  input: z.object({
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          sortOrder: z.number().int().min(0),
        }),
      )
      .min(1, "La liste ne peut pas être vide."),
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "social");

    const db = getDrizzle();
    for (const item of input.items) {
      await db
        .update(socialLinks)
        .set({ sortOrder: item.sortOrder })
        .where(eq(socialLinks.id, item.id));
    }

    auditAdmin(context, user.id, "SOCIAL_LINK_UPDATE", {
      resource: "social_links",
      metadata: { reorderedCount: input.items.length },
    });

    const rows = await db
      .select()
      .from(socialLinks)
      .orderBy(asc(socialLinks.sortOrder));
    return rows;
  },
});
