import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { navigationMenus } from "@database/schemas";
import { invalidateCache } from "@database/cache";
import { assertAdmin, adminRateLimit, auditAdmin } from "./_helpers";

export const createNavigationMenu = defineAction({
  input: z.object({
    name: z
      .string()
      .trim()
      .min(1, "Le nom du menu est requis.")
      .max(100, "Le nom ne peut pas dépasser 100 caractères."),
    description: z
      .string()
      .trim()
      .max(500, "La description ne peut pas dépasser 500 caractères.")
      .nullable()
      .optional(),
  }),
  handler: async (input, context) => {
    const user = assertAdmin(context);
    adminRateLimit(context, user.id, "menus");

    const db = getDrizzle();

    let created;
    try {
      [created] = await db
        .insert(navigationMenus)
        .values(input)
        .returning();
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
        throw new ActionError({
          code: "CONFLICT",
          message: "Un menu avec ce nom existe déjà.",
        });
      }
      throw err;
    }

    auditAdmin(context, user.id, "NAVIGATION_MENU_CREATE", {
      resource: "navigation_menus",
      resourceId: created.id,
      metadata: { name: created.name },
    });

    invalidateCache("nav:");
    return created;
  },
});

export const updateNavigationMenu = defineAction({
  input: z.object({
    id: z.string().min(1, "L'identifiant est requis."),
    name: z
      .string()
      .trim()
      .min(1, "Le nom du menu est requis.")
      .max(100, "Le nom ne peut pas dépasser 100 caractères.")
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, "La description ne peut pas dépasser 500 caractères.")
      .nullable()
      .optional(),
  }),
  handler: async (input, context) => {
    const user = assertAdmin(context);
    adminRateLimit(context, user.id, "menus");

    const { id, ...data } = input;
    const db = getDrizzle();

    let updated;
    try {
      [updated] = await db
        .update(navigationMenus)
        .set(data)
        .where(eq(navigationMenus.id, id))
        .returning();
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
        throw new ActionError({
          code: "CONFLICT",
          message: "Un autre menu utilise déjà ce nom.",
        });
      }
      throw err;
    }

    if (!updated) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Menu de navigation introuvable.",
      });
    }

    auditAdmin(context, user.id, "NAVIGATION_MENU_UPDATE", {
      resource: "navigation_menus",
      resourceId: id,
      metadata: { name: updated.name },
    });

    invalidateCache("nav:");
    return updated;
  },
});

export const deleteNavigationMenu = defineAction({
  input: z.object({
    id: z.string().min(1, "L'identifiant est requis."),
  }),
  handler: async (input, context) => {
    const user = assertAdmin(context);
    adminRateLimit(context, user.id, "menus");

    const db = getDrizzle();
    const [deleted] = await db
      .delete(navigationMenus)
      .where(eq(navigationMenus.id, input.id))
      .returning({ id: navigationMenus.id, name: navigationMenus.name });

    if (!deleted) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Menu de navigation introuvable.",
      });
    }

    auditAdmin(context, user.id, "NAVIGATION_MENU_DELETE", {
      resource: "navigation_menus",
      resourceId: input.id,
      metadata: { name: deleted.name },
    });

    invalidateCache("nav:");
    return { success: true as const };
  },
});
