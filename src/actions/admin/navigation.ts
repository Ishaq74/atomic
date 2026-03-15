import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { navigationItems, navigationMenus } from "@database/schemas";
import { requireAdmin, adminRateLimit, auditAdmin } from "./_helpers";
import { LOCALES } from "@i18n/config";

const localeEnum = z.enum(LOCALES, {
  message: `La locale doit être l'une des suivantes : ${LOCALES.join(", ")}.`,
});

const navItemBase = z.object({
  menuId: z.string().min(1, "L'identifiant du menu est requis."),
  parentId: z.string().nullable().optional(),
  locale: localeEnum,
  label: z
    .string()
    .min(1, "Le libellé est requis.")
    .max(100, "Le libellé ne peut pas dépasser 100 caractères."),
  url: z
    .string()
    .max(500, "L'URL ne peut pas dépasser 500 caractères.")
    .nullable()
    .optional(),
  icon: z
    .string()
    .max(50, "L'icône ne peut pas dépasser 50 caractères.")
    .nullable()
    .optional(),
  sortOrder: z
    .number()
    .int("L'ordre doit être un nombre entier.")
    .min(0, "L'ordre doit être positif.")
    .optional(),
  isActive: z.boolean().optional(),
  openInNewTab: z.boolean().optional(),
});

export const createNavigationItem = defineAction({
  input: navItemBase,
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "nav");

    const db = getDrizzle();

    // Vérifier que le menu existe
    const [menu] = await db
      .select({ id: navigationMenus.id })
      .from(navigationMenus)
      .where(eq(navigationMenus.id, input.menuId))
      .limit(1);

    if (!menu) {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "Le menu spécifié n'existe pas.",
      });
    }

    // Vérifier que le parent existe s'il est spécifié
    if (input.parentId) {
      const [parent] = await db
        .select({ id: navigationItems.id })
        .from(navigationItems)
        .where(eq(navigationItems.id, input.parentId))
        .limit(1);

      if (!parent) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "L'élément parent spécifié n'existe pas.",
        });
      }
    }

    const [created] = await db
      .insert(navigationItems)
      .values(input)
      .returning();

    auditAdmin(context, user.id, "NAVIGATION_ITEM_CREATE", {
      resource: "navigation_items",
      resourceId: created.id,
      metadata: { menuId: created.menuId, label: created.label },
    });

    return created;
  },
});

export const updateNavigationItem = defineAction({
  input: navItemBase.partial().extend({
    id: z.string().min(1, "L'identifiant est requis."),
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "nav");

    const { id, ...data } = input;
    const db = getDrizzle();
    const [updated] = await db
      .update(navigationItems)
      .set(data)
      .where(eq(navigationItems.id, id))
      .returning();

    if (!updated) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Élément de navigation introuvable.",
      });
    }

    auditAdmin(context, user.id, "NAVIGATION_ITEM_UPDATE", {
      resource: "navigation_items",
      resourceId: id,
      metadata: { label: updated.label },
    });

    return updated;
  },
});

export const deleteNavigationItem = defineAction({
  input: z.object({
    id: z.string().min(1, "L'identifiant est requis."),
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "nav");

    const db = getDrizzle();
    const [deleted] = await db
      .delete(navigationItems)
      .where(eq(navigationItems.id, input.id))
      .returning({ id: navigationItems.id, label: navigationItems.label });

    if (!deleted) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Élément de navigation introuvable.",
      });
    }

    auditAdmin(context, user.id, "NAVIGATION_ITEM_DELETE", {
      resource: "navigation_items",
      resourceId: input.id,
      metadata: { label: deleted.label },
    });

    return { success: true as const };
  },
});

export const reorderNavigationItems = defineAction({
  input: z.object({
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          sortOrder: z.number().int().min(0),
          parentId: z.string().nullable().optional(),
        }),
      )
      .min(1, "La liste ne peut pas être vide."),
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "nav");

    const db = getDrizzle();
    for (const item of input.items) {
      const data: { sortOrder: number; parentId?: string | null } = {
        sortOrder: item.sortOrder,
      };
      if (item.parentId !== undefined) {
        data.parentId = item.parentId;
      }
      await db
        .update(navigationItems)
        .set(data)
        .where(eq(navigationItems.id, item.id));
    }

    auditAdmin(context, user.id, "NAVIGATION_ITEM_UPDATE", {
      resource: "navigation_items",
      metadata: { reorderedCount: input.items.length },
    });

    return { success: true as const };
  },
});
