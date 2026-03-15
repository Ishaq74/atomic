import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { openingHours } from "@database/schemas";
import { requireAdmin, adminRateLimit, auditAdmin } from "./_helpers";

const hourItemSchema = z.object({
  id: z.string().min(1, "L'identifiant est requis."),
  openTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "L'heure d'ouverture doit être au format HH:MM.")
    .nullable()
    .optional(),
  closeTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "L'heure de fermeture doit être au format HH:MM.")
    .nullable()
    .optional(),
  hasMiddayBreak: z.boolean().optional(),
  morningOpen: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "L'heure doit être au format HH:MM.")
    .nullable()
    .optional(),
  morningClose: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "L'heure doit être au format HH:MM.")
    .nullable()
    .optional(),
  afternoonOpen: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "L'heure doit être au format HH:MM.")
    .nullable()
    .optional(),
  afternoonClose: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "L'heure doit être au format HH:MM.")
    .nullable()
    .optional(),
  isClosed: z.boolean().optional(),
});

export const updateOpeningHours = defineAction({
  input: z.object({
    items: z
      .array(hourItemSchema)
      .min(1, "Au moins un horaire est requis.")
      .max(7, "Maximum 7 jours de la semaine."),
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "hours");

    const db = getDrizzle();
    const updated: Array<typeof openingHours.$inferSelect> = [];

    for (const item of input.items) {
      const { id, ...data } = item;
      const [row] = await db
        .update(openingHours)
        .set(data)
        .where(eq(openingHours.id, id))
        .returning();

      if (!row) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: `Horaire introuvable (id: ${id}).`,
        });
      }
      updated.push(row);
    }

    auditAdmin(context, user.id, "OPENING_HOURS_UPDATE", {
      resource: "opening_hours",
      metadata: { count: updated.length },
    });

    return updated;
  },
});
