import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { themeSettings } from "@database/schemas";
import { requireAdmin, adminRateLimit, auditAdmin } from "./_helpers";

const oklchRegex = /^oklch\(\s*[\d.]+%?\s+[\d.]+\s+[\d.]+\s*\)$/;
const colorField = (label: string) =>
  z
    .string()
    .regex(oklchRegex, `La couleur « ${label} » doit être au format OKLCH (ex: oklch(0.65 0.15 250)).`)
    .nullable()
    .optional();

export const createTheme = defineAction({
  input: z.object({
    name: z.string().min(1, "Le nom du thème est requis.").max(50),
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "theme");
    const db = getDrizzle();

    const [created] = await db
      .insert(themeSettings)
      .values({ name: input.name, isActive: false })
      .returning();

    auditAdmin(context, user.id, "THEME_CREATE", {
      resource: "theme_settings",
      resourceId: created.id,
      metadata: { name: created.name },
    });

    return created;
  },
});

export const updateTheme = defineAction({
  input: z.object({
    id: z.string().min(1, "L'identifiant est requis."),
    name: z
      .string()
      .min(1, "Le nom du thème est requis.")
      .max(50, "Le nom du thème ne peut pas dépasser 50 caractères.")
      .optional(),
    isActive: z.boolean().optional(),
    primaryColor: colorField("primaire"),
    secondaryColor: colorField("secondaire"),
    accentColor: colorField("accent"),
    backgroundColor: colorField("arrière-plan"),
    foregroundColor: colorField("texte"),
    mutedColor: colorField("atténué"),
    mutedForegroundColor: colorField("texte atténué"),
    fontHeading: z
      .string()
      .max(100, "La police de titre ne peut pas dépasser 100 caractères.")
      .nullable()
      .optional(),
    fontBody: z
      .string()
      .max(100, "La police de corps ne peut pas dépasser 100 caractères.")
      .nullable()
      .optional(),
    borderRadius: z
      .string()
      .max(20, "Le border-radius ne peut pas dépasser 20 caractères.")
      .nullable()
      .optional(),
    customCss: z
      .string()
      .max(10000, "Le CSS personnalisé ne peut pas dépasser 10 000 caractères.")
      .nullable()
      .optional(),
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "theme");

    const { id, ...data } = input;
    const db = getDrizzle();

    // Si on active ce thème, désactiver les autres
    if (data.isActive === true) {
      await db
        .update(themeSettings)
        .set({ isActive: false });
    }

    const [updated] = await db
      .update(themeSettings)
      .set(data)
      .where(eq(themeSettings.id, id))
      .returning();

    if (!updated) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Thème introuvable.",
      });
    }

    auditAdmin(context, user.id, "THEME_UPDATE", {
      resource: "theme_settings",
      resourceId: id,
      metadata: { name: updated.name, isActive: updated.isActive },
    });

    return updated;
  },
});

export const deleteTheme = defineAction({
  input: z.object({
    id: z.string().min(1, "L'identifiant est requis."),
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "theme");
    const db = getDrizzle();

    const [existing] = await db
      .select()
      .from(themeSettings)
      .where(eq(themeSettings.id, input.id))
      .limit(1);

    if (!existing) {
      throw new ActionError({ code: "NOT_FOUND", message: "Thème introuvable." });
    }

    if (existing.isActive) {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "Impossible de supprimer le thème actif. Activez un autre thème d'abord.",
      });
    }

    await db.delete(themeSettings).where(eq(themeSettings.id, input.id));

    auditAdmin(context, user.id, "THEME_DELETE", {
      resource: "theme_settings",
      resourceId: input.id,
      metadata: { name: existing.name },
    });

    return { deleted: true };
  },
});
