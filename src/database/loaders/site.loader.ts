import { eq, asc } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { cached } from "@database/cache";
import {
  siteSettings,
  socialLinks,
  contactInfo,
  openingHours,
  themeSettings,
} from "@database/schemas";
import { isValidLocale } from "@i18n/utils";

export const getSiteSettings = cached(
  (locale: string) => `site:settings:${locale}`,
  async (locale: string) => {
    if (!isValidLocale(locale)) return null;
    const db = getDrizzle();
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.locale, locale))
      .limit(1);
    return row ?? null;
  },
);

export const getSocialLinks = cached(
  () => "site:social",
  async () => {
    const db = getDrizzle();
    return db
      .select()
      .from(socialLinks)
      .where(eq(socialLinks.isActive, true))
      .orderBy(asc(socialLinks.sortOrder))
      .limit(100);
  },
);

export const getContactInfo = cached(
  () => "site:contact",
  async () => {
    const db = getDrizzle();
    const [row] = await db.select().from(contactInfo).limit(1);
    return row ?? null;
  },
);

export const getOpeningHours = cached(
  () => "site:hours",
  async () => {
    const db = getDrizzle();
    return db
      .select()
      .from(openingHours)
      .orderBy(asc(openingHours.dayOfWeek))
      .limit(50);
  },
);

export const getActiveTheme = cached(
  () => "site:theme",
  async () => {
    const db = getDrizzle();
    const [row] = await db
      .select()
      .from(themeSettings)
      .where(eq(themeSettings.isActive, true))
      .limit(1);
    return row ?? null;
  },
);

export const getAllThemes = cached(
  () => "site:themes",
  async () => {
    const db = getDrizzle();
    return db.select().from(themeSettings).orderBy(asc(themeSettings.name)).limit(100);
  },
);
