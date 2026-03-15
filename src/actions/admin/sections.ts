import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq, asc } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { pageSections, pages } from "@database/schemas";
import { requireAdmin, adminRateLimit, auditAdmin } from "./_helpers";

const sectionTypes = [
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
    content: z.string().min(1, "Le contenu JSON est requis.").refine(
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
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "sections");

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
      .values(input)
      .returning();

    auditAdmin(context, user.id, "PAGE_SECTION_CREATE", {
      resource: "page_sections",
      resourceId: created.id,
      metadata: { pageId: input.pageId, type: created.type },
    });

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
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "sections");

    const { id, ...data } = input;
    const db = getDrizzle();
    const [updated] = await db
      .update(pageSections)
      .set(data)
      .where(eq(pageSections.id, id))
      .returning();

    if (!updated) {
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

    return updated;
  },
});

export const deleteSection = defineAction({
  input: z.object({
    id: z.string().min(1, "L'identifiant est requis."),
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
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

    return { success: true as const };
  },
});

export const reorderSections = defineAction({
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
    adminRateLimit(context, user.id, "sections");

    const db = getDrizzle();
    for (const item of input.items) {
      await db
        .update(pageSections)
        .set({ sortOrder: item.sortOrder })
        .where(eq(pageSections.id, item.id));
    }

    auditAdmin(context, user.id, "PAGE_SECTION_UPDATE", {
      resource: "page_sections",
      metadata: { reorderedCount: input.items.length },
    });

    return { success: true as const };
  },
});
