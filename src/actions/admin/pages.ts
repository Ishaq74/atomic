import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq, and, asc } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { pages } from "@database/schemas";
import { requireAdmin, adminRateLimit, auditAdmin } from "./_helpers";
import { LOCALES } from "@i18n/config";

const localeEnum = z.enum(LOCALES, {
  message: `La locale doit être l'une des suivantes : ${LOCALES.join(", ")}.`,
});

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createPage = defineAction({
  input: z.object({
    locale: localeEnum,
    slug: z
      .string()
      .min(1, "Le slug est requis.")
      .max(200, "Le slug ne peut pas dépasser 200 caractères.")
      .regex(slugRegex, "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets."),
    title: z
      .string()
      .min(1, "Le titre est requis.")
      .max(200, "Le titre ne peut pas dépasser 200 caractères."),
    metaTitle: z.string().max(70, "Le meta title ne peut pas dépasser 70 caractères.").nullable().optional(),
    metaDescription: z.string().max(160, "La meta description ne peut pas dépasser 160 caractères.").nullable().optional(),
    ogImage: z.string().url("L'URL de l'image OG est invalide.").nullable().optional(),
    template: z.string().max(50, "Le template ne peut pas dépasser 50 caractères.").optional(),
    sortOrder: z.number().int("L'ordre doit être un nombre entier.").min(0, "L'ordre doit être positif.").optional(),
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "pages");

    const db = getDrizzle();

    // Vérifier l'unicité locale+slug
    const [existing] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.locale, input.locale), eq(pages.slug, input.slug)))
      .limit(1);

    if (existing) {
      throw new ActionError({
        code: "CONFLICT",
        message: `Une page avec le slug « ${input.slug} » existe déjà pour la locale « ${input.locale} ».`,
      });
    }

    const [created] = await db.insert(pages).values(input).returning();

    auditAdmin(context, user.id, "PAGE_CREATE", {
      resource: "pages",
      resourceId: created.id,
      metadata: { locale: created.locale, slug: created.slug },
    });

    return created;
  },
});

export const updatePage = defineAction({
  input: z.object({
    id: z.string().min(1, "L'identifiant est requis."),
    slug: z
      .string()
      .min(1, "Le slug est requis.")
      .max(200, "Le slug ne peut pas dépasser 200 caractères.")
      .regex(slugRegex, "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets.")
      .optional(),
    title: z.string().min(1, "Le titre est requis.").max(200, "Le titre ne peut pas dépasser 200 caractères.").optional(),
    metaTitle: z.string().max(70, "Le meta title ne peut pas dépasser 70 caractères.").nullable().optional(),
    metaDescription: z.string().max(160, "La meta description ne peut pas dépasser 160 caractères.").nullable().optional(),
    ogImage: z.string().url("L'URL de l'image OG est invalide.").nullable().optional(),
    template: z.string().max(50, "Le template ne peut pas dépasser 50 caractères.").optional(),
    sortOrder: z.number().int("L'ordre doit être un nombre entier.").min(0, "L'ordre doit être positif.").optional(),
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "pages");

    const { id, ...data } = input;
    const db = getDrizzle();

    // Vérifier unicité slug si modifié
    if (data.slug) {
      const [current] = await db
        .select({ locale: pages.locale })
        .from(pages)
        .where(eq(pages.id, id))
        .limit(1);

      if (current) {
        const [conflict] = await db
          .select({ id: pages.id })
          .from(pages)
          .where(
            and(
              eq(pages.locale, current.locale),
              eq(pages.slug, data.slug),
            ),
          )
          .limit(1);

        if (conflict && conflict.id !== id) {
          throw new ActionError({
            code: "CONFLICT",
            message: `Une autre page utilise déjà le slug « ${data.slug} » pour cette locale.`,
          });
        }
      }
    }

    const [updated] = await db
      .update(pages)
      .set(data)
      .where(eq(pages.id, id))
      .returning();

    if (!updated) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Page introuvable.",
      });
    }

    auditAdmin(context, user.id, "PAGE_UPDATE", {
      resource: "pages",
      resourceId: id,
      metadata: { title: updated.title },
    });

    return updated;
  },
});

export const deletePage = defineAction({
  input: z.object({
    id: z.string().min(1, "L'identifiant est requis."),
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "pages");

    const db = getDrizzle();
    const [deleted] = await db
      .delete(pages)
      .where(eq(pages.id, input.id))
      .returning({ id: pages.id, title: pages.title });

    if (!deleted) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Page introuvable.",
      });
    }

    auditAdmin(context, user.id, "PAGE_DELETE", {
      resource: "pages",
      resourceId: input.id,
      metadata: { title: deleted.title },
    });

    return { success: true as const };
  },
});

export const publishPage = defineAction({
  input: z.object({
    id: z.string().min(1, "L'identifiant est requis."),
    isPublished: z.boolean(),
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "pages");

    const db = getDrizzle();
    const publishedAt = input.isPublished ? new Date() : null;

    const [updated] = await db
      .update(pages)
      .set({ isPublished: input.isPublished, publishedAt })
      .where(eq(pages.id, input.id))
      .returning();

    if (!updated) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Page introuvable.",
      });
    }

    auditAdmin(context, user.id, "PAGE_PUBLISH", {
      resource: "pages",
      resourceId: input.id,
      metadata: { isPublished: input.isPublished },
    });

    return updated;
  },
});
