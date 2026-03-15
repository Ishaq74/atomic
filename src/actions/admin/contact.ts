import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { contactInfo } from "@database/schemas";
import { requireAdmin, adminRateLimit, auditAdmin } from "./_helpers";

export const updateContactInfo = defineAction({
  input: z.object({
    id: z.string().min(1, "L'identifiant est requis."),
    email: z
      .string()
      .email("L'adresse email est invalide.")
      .max(254, "L'email ne peut pas dépasser 254 caractères.")
      .nullable()
      .optional(),
    phone: z
      .string()
      .max(30, "Le numéro de téléphone ne peut pas dépasser 30 caractères.")
      .nullable()
      .optional(),
    address: z
      .string()
      .max(300, "L'adresse ne peut pas dépasser 300 caractères.")
      .nullable()
      .optional(),
    city: z
      .string()
      .max(100, "La ville ne peut pas dépasser 100 caractères.")
      .nullable()
      .optional(),
    postalCode: z
      .string()
      .max(20, "Le code postal ne peut pas dépasser 20 caractères.")
      .nullable()
      .optional(),
    country: z
      .string()
      .max(100, "Le pays ne peut pas dépasser 100 caractères.")
      .nullable()
      .optional(),
    mapUrl: z
      .string()
      .url("L'URL de la carte est invalide.")
      .max(1000, "L'URL de la carte ne peut pas dépasser 1000 caractères.")
      .nullable()
      .optional(),
    latitude: z
      .string()
      .regex(/^-?\d{1,3}\.\d+$/, "La latitude doit être au format décimal (ex: 48.8566).")
      .nullable()
      .optional(),
    longitude: z
      .string()
      .regex(/^-?\d{1,3}\.\d+$/, "La longitude doit être au format décimal (ex: 2.3522).")
      .nullable()
      .optional(),
  }),
  handler: async (input, context) => {
    const user = requireAdmin(context);
    adminRateLimit(context, user.id, "contact");

    const { id, ...data } = input;
    const db = getDrizzle();
    const [updated] = await db
      .update(contactInfo)
      .set(data)
      .where(eq(contactInfo.id, id))
      .returning();

    if (!updated) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Informations de contact introuvables.",
      });
    }

    auditAdmin(context, user.id, "CONTACT_INFO_UPDATE", {
      resource: "contact_info",
      resourceId: id,
    });

    return updated;
  },
});
