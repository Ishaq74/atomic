import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq, and } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { pages } from "@database/schemas";
import { invalidateCache } from "@database/cache";
import { assertAdmin, adminRateLimit, auditAdmin } from "./_helpers";
import { LOCALES } from "@i18n/config";

const localeEnum = z.enum(LOCALES, {
  message: `La locale doit être l'une des suivantes : ${LOCALES.join(", ")}.`,
});

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Slugs that would shadow real Astro routes / API endpoints. */
const RESERVED_SLUGS = new Set([
  'api', 'auth', 'admin', 'sitemap-cms.xml', 'sitemap',
  'robots.txt', '_image', '_actions', 'health', 'uploads',
  '404', '500', 'index', 'preview', 'media', 'contact',
  'export-data', 'audit-export', 'upload',
]);

function assertSlugNotReserved(slug: string) {
  if (RESERVED_SLUGS.has(slug)) {
    throw new ActionError({
      code: 'CONFLICT',
      message: `Le slug « ${slug} » est réservé et ne peut pas être utilisé pour une page CMS.`,
    });
  }
}

export const createPage = defineAction({
  input: z.object({
    locale: localeEnum,
    slug: z
      .string()
      .trim()
      .min(1, "Le slug est requis.")
      .max(200, "Le slug ne peut pas dépasser 200 caractères.")
      .regex(slugRegex, "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets."),
    title: z
      .string()
      .trim()
      .min(1, "Le titre est requis.")
      .max(200, "Le titre ne peut pas dépasser 200 caractères."),
    metaTitle: z.string().trim().max(70, "Le meta title ne peut pas dépasser 70 caractères.").nullable().optional(),
    metaDescription: z.string().trim().max(160, "La meta description ne peut pas dépasser 160 caractères.").nullable().optional(),
    ogImage: z.url("L'URL de l'image OG est invalide.").nullable().optional(),
    template: z.string().max(50, "Le template ne peut pas dépasser 50 caractères.").optional(),
    sortOrder: z.number().int("L'ordre doit être un nombre entier.").min(0, "L'ordre doit être positif.").max(10000, "L'ordre ne peut pas dépasser 10 000.").optional(),
  }),
  handler: async (input, context) => {
    const user = assertAdmin(context);
    adminRateLimit(context, user.id, "pages");

    assertSlugNotReserved(input.slug);

    const db = getDrizzle();

    let created;
    try {
      [created] = await db.insert(pages).values(input).returning();
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
        throw new ActionError({
          code: "CONFLICT",
          message: `Une page avec le slug \u00ab ${input.slug} \u00bb existe d\u00e9j\u00e0 pour la locale \u00ab ${input.locale} \u00bb.`,
        });
      }
      throw err;
    }

    auditAdmin(context, user.id, "PAGE_CREATE", {
      resource: "pages",
      resourceId: created.id,
      metadata: { locale: created.locale, slug: created.slug },
    });

    invalidateCache("page:");
    return created;
  },
});

export const updatePage = defineAction({
  input: z.object({
    id: z.string().min(1, "L'identifiant est requis."),
    slug: z
      .string()
      .trim()
      .min(1, "Le slug est requis.")
      .max(200, "Le slug ne peut pas dépasser 200 caractères.")
      .regex(slugRegex, "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets.")
      .optional(),
    title: z.string().trim().min(1, "Le titre est requis.").max(200, "Le titre ne peut pas dépasser 200 caractères.").optional(),
    metaTitle: z.string().trim().max(70, "Le meta title ne peut pas dépasser 70 caractères.").nullable().optional(),
    metaDescription: z.string().trim().max(160, "La meta description ne peut pas dépasser 160 caractères.").nullable().optional(),
    ogImage: z.url("L'URL de l'image OG est invalide.").nullable().optional(),
    template: z.string().max(50, "Le template ne peut pas dépasser 50 caractères.").optional(),
    sortOrder: z.number().int("L'ordre doit être un nombre entier.").min(0, "L'ordre doit être positif.").max(10000, "L'ordre ne peut pas dépasser 10 000.").optional(),
    expectedUpdatedAt: z.string().datetime().optional(),
  }),
  handler: async (input, context) => {
    const user = assertAdmin(context);
    adminRateLimit(context, user.id, "pages");

    const { id, expectedUpdatedAt, ...data } = input;
    if (data.slug) assertSlugNotReserved(data.slug);

    const db = getDrizzle();

    const whereClause = expectedUpdatedAt
      ? and(eq(pages.id, id), eq(pages.updatedAt, new Date(expectedUpdatedAt)))
      : eq(pages.id, id);

    let updated;
    try {
      [updated] = await db
        .update(pages)
        .set(data)
        .where(whereClause)
        .returning();
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
        throw new ActionError({
          code: "CONFLICT",
          message: `Une autre page utilise déjà le slug « ${data.slug} » pour cette locale.`,
        });
      }
      throw err;
    }

    if (!updated) {
      if (expectedUpdatedAt) {
        const [exists] = await db.select({ id: pages.id }).from(pages).where(eq(pages.id, id)).limit(1);
        if (exists) {
          throw new ActionError({
            code: "CONFLICT",
            message: "La page a été modifiée par un autre utilisateur. Rechargez et réessayez.",
          });
        }
      }
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

    invalidateCache("page:");
    return updated;
  },
});

export const deletePage = defineAction({
  input: z.object({
    id: z.string().min(1, "L'identifiant est requis."),
  }),
  handler: async (input, context) => {
    const user = assertAdmin(context);
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

    invalidateCache("page:");
    return { success: true as const };
  },
});

export const publishPage = defineAction({
  input: z.object({
    id: z.string().min(1, "L'identifiant est requis."),
    isPublished: z.boolean(),
  }),
  handler: async (input, context) => {
    const user = assertAdmin(context);
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

    invalidateCache("page:");
    return updated;
  },
});
