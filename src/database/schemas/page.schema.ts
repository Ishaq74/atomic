import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";

// ─── Pages ───────────────────────────────────────────────────────────────────
// CMS pages. One row per page × locale. Unique on (locale, slug).
export const pages = pgTable(
  "pages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    locale: text("locale").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    ogImage: text("og_image"),
    template: text("template").default("default").notNull(),
    isPublished: boolean("is_published").default(false).notNull(),
    publishedAt: timestamp("published_at"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("pages_locale_slug_uidx").on(table.locale, table.slug),
    index("pages_locale_idx").on(table.locale),
    index("pages_locale_published_idx").on(table.locale, table.isPublished, table.sortOrder),
    check("pages_publish_consistency", sql`NOT ${table.isPublished} OR ${table.publishedAt} IS NOT NULL`),
  ],
);

// ─── Page Sections ───────────────────────────────────────────────────────────
// Flexible content blocks with typed JSON. Ordered per page.
export const pageSections = pgTable(
  "page_sections",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pageId: text("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    content: text("content").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isVisible: boolean("is_visible").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("page_sections_pageId_idx").on(table.pageId),
    index("page_sections_pageId_visible_sort_idx").on(table.pageId, table.isVisible, table.sortOrder),
  ],
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const pagesRelations = relations(pages, ({ many }) => ({
  sections: many(pageSections),
}));

export const pageSectionsRelations = relations(pageSections, ({ one }) => ({
  page: one(pages, {
    fields: [pageSections.pageId],
    references: [pages.id],
  }),
}));
