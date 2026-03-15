import { eq, asc } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import {
  siteSettings,
  socialLinks,
  contactInfo,
  openingHours,
  themeSettings,
} from "@database/schemas";

export async function getSiteSettings(locale: string) {
  const db = getDrizzle();
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.locale, locale))
    .limit(1);
  return row ?? null;
}

export async function getSocialLinks() {
  const db = getDrizzle();
  return db
    .select()
    .from(socialLinks)
    .where(eq(socialLinks.isActive, true))
    .orderBy(asc(socialLinks.sortOrder));
}

export async function getContactInfo() {
  const db = getDrizzle();
  const [row] = await db.select().from(contactInfo).limit(1);
  return row ?? null;
}

export async function getOpeningHours() {
  const db = getDrizzle();
  return db
    .select()
    .from(openingHours)
    .orderBy(asc(openingHours.dayOfWeek));
}

export async function getActiveTheme() {
  const db = getDrizzle();
  const [row] = await db
    .select()
    .from(themeSettings)
    .where(eq(themeSettings.isActive, true))
    .limit(1);
  return row ?? null;
}

export async function getAllThemes() {
  const db = getDrizzle();
  return db.select().from(themeSettings).orderBy(asc(themeSettings.name));
}
