import { relations, sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user, organization } from "./auth.schema";
import { services } from "./services.schema";

export const serviceReactions = pgTable(
  "service_reactions",
  {
    serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    reactionType: text("reaction_type", { enum: ["LIKE", "LOVE", "FIRE", "CLAP"] }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.serviceId, table.userId] }),
    index("service_reactions_service_idx").on(table.serviceId),
  ],
);

export const serviceNotifications = pgTable(
  "service_notifications",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    serviceId: text("service_id").references(() => services.id, { onDelete: "cascade" }),
    recipientId: text("recipient_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["SERVICE_CREATED", "SERVICE_UPDATED", "SERVICE_PUBLISHED", "SERVICE_COMMENT", "SERVICE_REVIEW", "SERVICE_REPORT"] }).notNull(),
    title: text("title").notNull(),
    message: text("message"),
    metadata: text("metadata"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("service_notifications_recipient_read_idx").on(table.recipientId, table.readAt),
    index("service_notifications_service_idx").on(table.serviceId),
  ],
);

export const serviceAttributeDefinitions = pgTable(
  "service_attribute_definitions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    type: text("type", { enum: ["STRING", "NUMBER", "BOOLEAN", "SELECT"] }).notNull(),
    options: text("options"),
    required: boolean("required").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex("service_attribute_definitions_org_key_uidx").on(table.organizationId, table.key),
    index("service_attribute_definitions_org_idx").on(table.organizationId),
  ],
);

export const serviceAttributeValues = pgTable(
  "service_attribute_values",
  {
    serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
    definitionId: text("definition_id").notNull().references(() => serviceAttributeDefinitions.id, { onDelete: "cascade" }),
    stringValue: text("string_value"),
    numberValue: integer("number_value"),
    booleanValue: boolean("boolean_value"),
    selectedValue: text("selected_value"),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.serviceId, table.definitionId] }),
    index("service_attribute_values_definition_idx").on(table.definitionId),
    sql``,
  ],
);

export const serviceReactionsRelations = relations(serviceReactions, ({ one }) => ({
  service: one(services, { fields: [serviceReactions.serviceId], references: [services.id] }),
  user: one(user, { fields: [serviceReactions.userId], references: [user.id] }),
}));

export const serviceNotificationsRelations = relations(serviceNotifications, ({ one }) => ({
  service: one(services, { fields: [serviceNotifications.serviceId], references: [services.id] }),
  recipient: one(user, { fields: [serviceNotifications.recipientId], references: [user.id] }),
}));

export const serviceAttributeDefinitionsRelations = relations(serviceAttributeDefinitions, ({ one, many }) => ({
  organization: one(organization, { fields: [serviceAttributeDefinitions.organizationId], references: [organization.id] }),
  values: many(serviceAttributeValues),
}));

export const serviceAttributeValuesRelations = relations(serviceAttributeValues, ({ one }) => ({
  service: one(services, { fields: [serviceAttributeValues.serviceId], references: [services.id] }),
  definition: one(serviceAttributeDefinitions, { fields: [serviceAttributeValues.definitionId], references: [serviceAttributeDefinitions.id] }),
}));
