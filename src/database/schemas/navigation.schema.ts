import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ─── Navigation Menus ────────────────────────────────────────────────────────
// Containers: header, footer_primary, footer_secondary, footer_legal.
export const navigationMenus = pgTable(
  "navigation_menus",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("navigation_menus_name_uidx").on(table.name)],
);

// ─── Navigation Items ────────────────────────────────────────────────────────
// Hierarchical (parent/child). One row per item × locale.
export const navigationItems = pgTable(
  "navigation_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    menuId: text("menu_id")
      .notNull()
      .references(() => navigationMenus.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    locale: text("locale").notNull(),
    label: text("label").notNull(),
    url: text("url"),
    icon: text("icon"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    openInNewTab: boolean("open_in_new_tab").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("nav_items_menuId_idx").on(table.menuId),
    index("nav_items_parentId_idx").on(table.parentId),
    index("nav_items_menu_locale_idx").on(
      table.menuId,
      table.locale,
      table.sortOrder,
    ),
  ],
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const navigationMenusRelations = relations(
  navigationMenus,
  ({ many }) => ({
    items: many(navigationItems),
  }),
);

export const navigationItemsRelations = relations(
  navigationItems,
  ({ one, many }) => ({
    menu: one(navigationMenus, {
      fields: [navigationItems.menuId],
      references: [navigationMenus.id],
    }),
    parent: one(navigationItems, {
      fields: [navigationItems.parentId],
      references: [navigationItems.id],
      relationName: "parentChild",
    }),
    children: many(navigationItems, {
      relationName: "parentChild",
    }),
  }),
);
