import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ─── Site Settings ───────────────────────────────────────────────────────────
// One row per locale. Stores site identity, SEO defaults, and branding assets.
export const siteSettings = pgTable(
  "site_settings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    locale: text("locale").notNull(),
    siteName: text("site_name").notNull(),
    siteDescription: text("site_description"),
    siteSlogan: text("site_slogan"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    logoLight: text("logo_light"),
    logoDark: text("logo_dark"),
    favicon: text("favicon"),
    ogImage: text("og_image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("site_settings_locale_uidx").on(table.locale)],
);

// ─── Social Links ────────────────────────────────────────────────────────────
// Global (not i18n). One row per social platform.
export const socialLinks = pgTable(
  "social_links",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    platform: text("platform").notNull(),
    url: text("url").notNull(),
    icon: text("icon"),
    label: text("label"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("social_links_sortOrder_idx").on(table.sortOrder)],
);

// ─── Contact Info ────────────────────────────────────────────────────────────
// Single row. Global contact details for the business.
export const contactInfo = pgTable("contact_info", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country"),
  mapUrl: text("map_url"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// ─── Opening Hours ───────────────────────────────────────────────────────────
// One row per day of the week (0=Monday … 6=Sunday).
// Supports optional midday break: morningOpen→morningClose, afternoonOpen→afternoonClose.
export const openingHours = pgTable(
  "opening_hours",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    dayOfWeek: integer("day_of_week").notNull(),
    openTime: text("open_time"),
    closeTime: text("close_time"),
    hasMiddayBreak: boolean("has_midday_break").default(false).notNull(),
    morningOpen: text("morning_open"),
    morningClose: text("morning_close"),
    afternoonOpen: text("afternoon_open"),
    afternoonClose: text("afternoon_close"),
    isClosed: boolean("is_closed").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("opening_hours_day_uidx").on(table.dayOfWeek),
  ],
);

// ─── Theme Settings ──────────────────────────────────────────────────────────
// Design tokens: colors, typography, border-radius. One active theme at a time.
export const themeSettings = pgTable(
  "theme_settings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    primaryColor: text("primary_color"),
    secondaryColor: text("secondary_color"),
    accentColor: text("accent_color"),
    backgroundColor: text("background_color"),
    foregroundColor: text("foreground_color"),
    mutedColor: text("muted_color"),
    mutedForegroundColor: text("muted_foreground_color"),
    fontHeading: text("font_heading"),
    fontBody: text("font_body"),
    borderRadius: text("border_radius"),
    customCss: text("custom_css"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("theme_settings_name_uidx").on(table.name)],
);
