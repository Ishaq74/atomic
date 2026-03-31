import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { pageSections, pages } from "@database/schemas";
import { invalidateCache } from "@database/cache";
import { assertAdmin, adminRateLimit, auditAdmin } from "./_helpers";
import { sanitizeHtml } from "@/lib/sanitize";

/** Recursively sanitize string values in parsed section JSON (defense-in-depth). */
export function sanitizeSectionContent(raw: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ActionError({ code: "BAD_REQUEST", message: "Le contenu de section n'est pas du JSON valide." });
  }
  function walk(obj: unknown): unknown {
    if (typeof obj === 'string') return sanitizeHtml(obj);
    if (Array.isArray(obj)) return obj.map(walk);
    if (obj && typeof obj === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        out[k] = walk(v);
      }
      return out;
    }
    return obj;
  }
  return JSON.stringify(walk(parsed));
}

export const sectionTypes = [
  "hero",
  "text",
  "image",
  "gallery",
  "cta",
  "features",
  "testimonials",
  "faq",
  "contact",
  "map",
  "video",
  "custom",
] as const;

export const createSection = defineAction({
  input: z.object({
    pageId: z.string().min(1, "L'identifiant de la page est requis."),
    type: z.enum(sectionTypes, {
      message: `Le type de section doit être l'un des suivants : ${sectionTypes.join(", ")}.`,
    }),
    content: z.string().min(1, "Le contenu JSON est requis.").max(100_000, "Le contenu JSON ne peut pas dépasser 100 000 caractères.").refine(
      (val) => {
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Le contenu doit être du JSON valide." },
    ),
    sortOrder: z
      .number()
      .int("L'ordre doit être un nombre entier.")
      .min(0, "L'ordre doit être positif.")
      .optional(),
    isVisible: z.boolean().optional(),
  }),
  handler: async (input, context) => {
    const user = assertAdmin(context);
    adminRateLimit(context, user.id, "sections");

    const sanitizedInput = { ...input, content: sanitizeSectionContent(input.content) };
    const db = getDrizzle();

    // Vérifier que la page existe
    const [page] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.id, input.pageId))
      .limit(1);

    if (!page) {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "La page spécifiée n'existe pas.",
      });
    }

    const [created] = await db
      .insert(pageSections)
      .values(sanitizedInput)
      .returning();

    auditAdmin(context, user.id, "PAGE_SECTION_CREATE", {
      resource: "page_sections",
      resourceId: created.id,
      metadata: { pageId: input.pageId, type: created.type },
    });

    invalidateCache("page:");
    return created;
  },
});

export const updateSection = defineAction({
  input: z.object({
    id: z.string().min(1, "L'identifiant est requis."),
    type: z
      .enum(sectionTypes, {
        message: `Le type de section doit être l'un des suivants : ${sectionTypes.join(", ")}.`,
      })
      .optional(),
    content: z
      .string()
      .min(1, "Le contenu JSON est requis.")
      .max(100_000, "Le contenu JSON ne peut pas dépasser 100 000 caractères.")
      .refine(
        (val) => {
          try {
            JSON.parse(val);
            return true;
          } catch {
            return false;
          }
        },
        { message: "Le contenu doit être du JSON valide." },
      )
      .optional(),
    sortOrder: z
      .number()
      .int("L'ordre doit être un nombre entier.")
      .min(0, "L'ordre doit être positif.")
      .optional(),
    isVisible: z.boolean().optional(),
    expectedUpdatedAt: z.string().datetime().optional(),
  }),
  handler: async (input, context) => {
    const user = assertAdmin(context);
    adminRateLimit(context, user.id, "sections");

    const { id, expectedUpdatedAt, ...data } = input;
    if (data.content) {
      data.content = sanitizeSectionContent(data.content);
    }
    const db = getDrizzle();

    const whereClause = expectedUpdatedAt
      ? and(eq(pageSections.id, id), eq(pageSections.updatedAt, new Date(expectedUpdatedAt)))
      : eq(pageSections.id, id);

    const [updated] = await db
      .update(pageSections)
      .set(data)
      .where(whereClause)
      .returning();

    if (!updated) {
      if (expectedUpdatedAt) {
        const [exists] = await db.select({ id: pageSections.id }).from(pageSections).where(eq(pageSections.id, id)).limit(1);
        if (exists) {
          throw new ActionError({
            code: "CONFLICT",
            message: "La section a été modifiée par un autre utilisateur. Rechargez et réessayez.",
          });
        }
      }
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Section introuvable.",
      });
    }

    auditAdmin(context, user.id, "PAGE_SECTION_UPDATE", {
      resource: "page_sections",
      resourceId: id,
      metadata: { type: updated.type },
    });

    invalidateCache("page:");
    return updated;
  },
});

export const deleteSection = defineAction({
  input: z.object({
    id: z.string().min(1, "L'identifiant est requis."),
  }),
  handler: async (input, context) => {
    const user = assertAdmin(context);
    adminRateLimit(context, user.id, "sections");

    const db = getDrizzle();
    const [deleted] = await db
      .delete(pageSections)
      .where(eq(pageSections.id, input.id))
      .returning({ id: pageSections.id, type: pageSections.type });

    if (!deleted) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Section introuvable.",
      });
    }

    auditAdmin(context, user.id, "PAGE_SECTION_DELETE", {
      resource: "page_sections",
      resourceId: input.id,
      metadata: { type: deleted.type },
    });

    invalidateCache("page:");
    return { success: true as const };
  },
});

export const reorderSections = defineAction({
  input: z.object({
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          sortOrder: z.number().int().min(0).max(10000),
        }),
      )
      .min(1, "La liste ne peut pas être vide.")
      .max(200, "Maximum 200 éléments par réordonnancement."),
  }),
  handler: async (input, context) => {
    const user = assertAdmin(context);
    adminRateLimit(context, user.id, "sections");

    const db = getDrizzle();
    await db.transaction(async (tx) => {
      const ids = input.items.map((i) => i.id);

      // Verify all sections exist and belong to the same page
      const existingSections = await tx
        .select({ id: pageSections.id, pageId: pageSections.pageId })
        .from(pageSections)
        .where(inArray(pageSections.id, ids));
      if (existingSections.length !== ids.length) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Une ou plusieurs sections introuvables.",
        });
      }
      const pageIds = new Set(existingSections.map((s) => s.pageId));
      if (pageIds.size !== 1) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Toutes les sections doivent appartenir à la même page.",
        });
      }

      const cases = input.items
        .map((item) => sql`WHEN ${pageSections.id} = ${item.id} THEN ${item.sortOrder}`)
        .reduce((a, b) => sql`${a} ${b}`);
      await tx
        .update(pageSections)
        .set({ sortOrder: sql`CASE ${cases} END` })
        .where(inArray(pageSections.id, ids));
    });

    auditAdmin(context, user.id, "PAGE_SECTION_REORDER", {
      resource: "page_sections",
      metadata: { reorderedCount: input.items.length },
    });

    invalidateCache("page:");
    return { success: true as const };
  },
});
