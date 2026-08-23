import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
  check,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { user, organization } from "./auth.schema";
import { mediaFiles } from "./media.schema";
import { LOCALES } from "@i18n/config";

const localeEnum = text("locale", { enum: LOCALES }).notNull();

export const services = pgTable(
  "services",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    status: text("status", { enum: ["DRAFT", "PUBLISHED", "ARCHIVED", "DELETED"] }).default("DRAFT").notNull(),
    coverImageId: text("cover_image_id").references(() => mediaFiles.id, { onDelete: "set null" }),
    priceMinor: integer("price_minor"),
    currency: varchar("currency", { length: 3 }),
    durationMinutes: integer("duration_minutes"),
    maxParticipants: integer("max_participants"),
    isMobile: boolean("is_mobile").default(false).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    ratingAverage100: integer("rating_average_100").default(0).notNull(),
    ratingCount: integer("rating_count").default(0).notNull(),
    seoScore: integer("seo_score"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    lockedBy: text("locked_by").references(() => user.id, { onDelete: "set null" }),
    lockedAt: timestamp("locked_at"),
  },
  (table) => [
    uniqueIndex("services_org_slug_uidx").on(table.organizationId, table.slug),
    index("services_org_idx").on(table.organizationId),
    index("services_provider_idx").on(table.providerId),
    index("services_status_idx").on(table.status),
    index("services_published_at_idx").on(table.publishedAt),
    index("services_featured_idx").on(table.organizationId, table.isFeatured, table.status),
    check("services_publish_consistency", sql`NOT ${table.status} = 'PUBLISHED' OR ${table.publishedAt} IS NOT NULL`),
    check("services_price_non_negative", sql`${table.priceMinor} IS NULL OR ${table.priceMinor} >= 0`),
    check("services_duration_positive", sql`${table.durationMinutes} IS NULL OR ${table.durationMinutes} > 0`),
    check("services_participants_positive", sql`${table.maxParticipants} IS NULL OR ${table.maxParticipants} > 0`),
    check("services_rating_average_range", sql`${table.ratingAverage100} >= 0 AND ${table.ratingAverage100} <= 500`),
  ],
);

export const serviceTranslations = pgTable(
  "service_translations",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: "cascade" }),
    locale: localeEnum,
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt"),
    content: text("content").notNull(),
    locationLabel: text("location_label"),
    locationAddress: text("location_address"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    metaKeywords: text("meta_keywords"),
    canonicalUrl: text("canonical_url"),
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    ogImageId: text("og_image_id").references(() => mediaFiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex("service_translations_service_locale_uidx").on(table.serviceId, table.locale),
    uniqueIndex("service_translations_org_locale_slug_uidx").on(table.organizationId, table.locale, table.slug).where(sql`${table.organizationId} IS NOT NULL`),
    uniqueIndex("service_translations_global_locale_slug_uidx").on(table.locale, table.slug).where(sql`${table.organizationId} IS NULL`),
    index("service_translations_locale_slug_idx").on(table.locale, table.slug),
  ],
);

export const serviceCategories = pgTable(
  "service_categories",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: "cascade" }),
    parentId: text("parent_id").references((): AnyPgColumn => serviceCategories.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    icon: text("icon"),
    color: text("color"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex("service_categories_org_slug_uidx").on(table.organizationId, table.slug),
    index("service_categories_org_idx").on(table.organizationId),
    index("service_categories_parent_idx").on(table.parentId),
    check("service_categories_no_self_parent", sql`${table.parentId} IS NULL OR ${table.parentId} != ${table.id}`),
  ],
);

export const serviceCategoryTranslations = pgTable(
  "service_category_translations",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    categoryId: text("category_id").notNull().references(() => serviceCategories.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: "cascade" }),
    locale: localeEnum,
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex("service_category_translations_category_locale_uidx").on(table.categoryId, table.locale),
    uniqueIndex("service_category_translations_org_locale_slug_uidx").on(table.organizationId, table.locale, table.slug).where(sql`${table.organizationId} IS NOT NULL`),
    uniqueIndex("service_category_translations_global_locale_slug_uidx").on(table.locale, table.slug).where(sql`${table.organizationId} IS NULL`),
    index("service_category_translations_locale_slug_idx").on(table.locale, table.slug),
  ],
);

export const serviceTags = pgTable(
  "service_tags",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [uniqueIndex("service_tags_org_slug_uidx").on(table.organizationId, table.slug), index("service_tags_org_idx").on(table.organizationId)],
);

export const serviceTagTranslations = pgTable(
  "service_tag_translations",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tagId: text("tag_id").notNull().references(() => serviceTags.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: "cascade" }),
    locale: localeEnum,
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex("service_tag_translations_tag_locale_uidx").on(table.tagId, table.locale),
    uniqueIndex("service_tag_translations_org_locale_slug_uidx").on(table.organizationId, table.locale, table.slug).where(sql`${table.organizationId} IS NOT NULL`),
    uniqueIndex("service_tag_translations_global_locale_slug_uidx").on(table.locale, table.slug).where(sql`${table.organizationId} IS NULL`),
    index("service_tag_translations_locale_slug_idx").on(table.locale, table.slug),
  ],
);

export const serviceCategoryLinks = pgTable(
  "service_category_links",
  {
    serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
    categoryId: text("category_id").notNull().references(() => serviceCategories.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.serviceId, table.categoryId] })],
);

export const serviceTagLinks = pgTable(
  "service_tag_links",
  {
    serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
    tagId: text("tag_id").notNull().references(() => serviceTags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.serviceId, table.tagId] })],
);

export const serviceMedia = pgTable(
  "service_media",
  {
    serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
    mediaId: text("media_id").notNull().references(() => mediaFiles.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["GALLERY", "DOCUMENT"] }).default("GALLERY").notNull(),
    altText: text("alt_text").notNull(),
    caption: text("caption"),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [primaryKey({ columns: [table.serviceId, table.mediaId] }), index("service_media_service_idx").on(table.serviceId)],
);

export const serviceAvailability = pgTable(
  "service_availability",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    timezone: text("timezone").default("UTC").notNull(),
    maxParticipants: integer("max_participants"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("service_availability_service_idx").on(table.serviceId),
    check("service_availability_day_range", sql`${table.dayOfWeek} BETWEEN 0 AND 6`),
    check("service_availability_time_order", sql`${table.startTime} < ${table.endTime}`),
    check("service_availability_participants_positive", sql`${table.maxParticipants} IS NULL OR ${table.maxParticipants} > 0`),
  ],
);

export const serviceRevisions = pgTable(
  "service_revisions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    locale: localeEnum,
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    content: text("content").notNull(),
    excerpt: text("excerpt"),
    status: text("status", { enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] }).notNull(),
    revisionNote: text("revision_note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("service_revisions_service_idx").on(table.serviceId), index("service_revisions_author_idx").on(table.authorId)],
);

export const serviceLocks = pgTable(
  "service_locks",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }).unique(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    lockedAt: timestamp("locked_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [index("service_locks_user_idx").on(table.userId), check("service_locks_expiry_after_lock", sql`${table.expiresAt} > ${table.lockedAt}`)],
);

export const serviceSeo = pgTable(
  "service_seo",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
    locale: localeEnum,
    focusKeyword: text("focus_keyword"),
    focusKeywordScore: integer("focus_keyword_score"),
    readabilityScore: integer("readability_score"),
    metaRobots: text("meta_robots", { enum: ["index,follow", "noindex,follow", "index,nofollow", "noindex,nofollow"] }).default("index,follow"),
    metaOgType: text("meta_og_type", { enum: ["service", "website"] }).default("service"),
    metaOgLocale: text("meta_og_locale", { enum: ["fr_FR", "en_US", "ar_SA", "es_ES"] }),
    schemaMarkup: text("schema_markup"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [uniqueIndex("service_seo_service_locale_uidx").on(table.serviceId, table.locale)],
);

export const serviceFavorites = pgTable(
  "service_favorites",
  {
    serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.serviceId, table.userId] })],
);

export const serviceReviews = pgTable(
  "service_reviews",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    rating: integer("rating").notNull(),
    title: text("title"),
    content: text("content").notNull(),
    status: text("status", { enum: ["PENDING", "APPROVED", "REJECTED", "SPAM"] }).default("PENDING").notNull(),
    isRecommended: boolean("is_recommended").default(true).notNull(),
    helpfulCount: integer("helpful_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex("service_reviews_service_author_uidx").on(table.serviceId, table.authorId),
    index("service_reviews_service_idx").on(table.serviceId),
    index("service_reviews_status_idx").on(table.status),
    check("service_reviews_rating_range", sql`${table.rating} BETWEEN 1 AND 5`),
  ],
);

export const serviceReviewHelpful = pgTable(
  "service_review_helpful",
  {
    reviewId: text("review_id").notNull().references(() => serviceReviews.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    isHelpful: boolean("is_helpful").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.reviewId, table.userId] })],
);

export const serviceComments = pgTable(
  "service_comments",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    parentId: text("parent_id").references((): AnyPgColumn => serviceComments.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    status: text("status", { enum: ["PENDING", "APPROVED", "REJECTED", "SPAM", "TRASH"] }).default("PENDING").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [index("service_comments_service_idx").on(table.serviceId), index("service_comments_parent_idx").on(table.parentId), index("service_comments_status_idx").on(table.status)],
);

export const serviceReports = pgTable(
  "service_reports",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    serviceId: text("service_id").references(() => services.id, { onDelete: "cascade" }),
    commentId: text("comment_id").references(() => serviceComments.id, { onDelete: "cascade" }),
    reviewId: text("review_id").references(() => serviceReviews.id, { onDelete: "cascade" }),
    reporterId: text("reporter_id").references(() => user.id, { onDelete: "set null" }),
    reason: text("reason", { enum: ["SPAM", "ABUSIVE", "OFF_TOPIC", "HATE_SPEECH", "OTHER"] }).notNull(),
    description: text("description"),
    status: text("status", { enum: ["PENDING", "REVIEWED", "RESOLVED", "REJECTED"] }).default("PENDING").notNull(),
    resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("service_reports_status_idx").on(table.status),
    index("service_reports_reporter_idx").on(table.reporterId),
    check("service_reports_single_target", sql`(((${table.serviceId} IS NOT NULL)::int + (${table.commentId} IS NOT NULL)::int + (${table.reviewId} IS NOT NULL)::int) = 1)`),
  ],
);

export const serviceViewStats = pgTable(
  "service_view_stats",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at").defaultNow().notNull(),
    date: text("date").notNull(),
    hour: integer("hour").notNull(),
    referrer: text("referrer"),
    country: varchar("country", { length: 2 }),
  },
  (table) => [index("service_view_stats_service_date_idx").on(table.serviceId, table.date), index("service_view_stats_viewed_at_idx").on(table.viewedAt), check("service_view_stats_hour_range", sql`${table.hour} BETWEEN 0 AND 23`)],
);

export const servicesRelations = relations(services, ({ one, many }) => ({
  organization: one(organization, { fields: [services.organizationId], references: [organization.id] }),
  provider: one(user, { fields: [services.providerId], references: [user.id], relationName: "serviceProvider" }),
  updatedByUser: one(user, { fields: [services.updatedBy], references: [user.id], relationName: "serviceUpdater" }),
  lockedByUser: one(user, { fields: [services.lockedBy], references: [user.id], relationName: "serviceLocker" }),
  coverImage: one(mediaFiles, { fields: [services.coverImageId], references: [mediaFiles.id] }),
  translations: many(serviceTranslations),
  categories: many(serviceCategoryLinks),
  tags: many(serviceTagLinks),
  media: many(serviceMedia),
  availability: many(serviceAvailability),
  revisions: many(serviceRevisions),
  locks: one(serviceLocks, { fields: [services.id], references: [serviceLocks.serviceId] }),
  seo: many(serviceSeo),
  favorites: many(serviceFavorites),
  reviews: many(serviceReviews),
  comments: many(serviceComments),
  reports: many(serviceReports),
  viewStats: many(serviceViewStats),
}));

export const serviceTranslationsRelations = relations(serviceTranslations, ({ one }) => ({
  service: one(services, { fields: [serviceTranslations.serviceId], references: [services.id] }),
  ogImage: one(mediaFiles, { fields: [serviceTranslations.ogImageId], references: [mediaFiles.id] }),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({ one, many }) => ({
  organization: one(organization, { fields: [serviceCategories.organizationId], references: [organization.id] }),
  parent: one(serviceCategories, { fields: [serviceCategories.parentId], references: [serviceCategories.id], relationName: "serviceCategoryParent" }),
  children: many(serviceCategories, { relationName: "serviceCategoryParent" }),
  translations: many(serviceCategoryTranslations),
  services: many(serviceCategoryLinks),
}));

export const serviceCategoryTranslationsRelations = relations(serviceCategoryTranslations, ({ one }) => ({
  category: one(serviceCategories, { fields: [serviceCategoryTranslations.categoryId], references: [serviceCategories.id] }),
}));

export const serviceTagsRelations = relations(serviceTags, ({ one, many }) => ({
  organization: one(organization, { fields: [serviceTags.organizationId], references: [organization.id] }),
  translations: many(serviceTagTranslations),
  services: many(serviceTagLinks),
}));

export const serviceTagTranslationsRelations = relations(serviceTagTranslations, ({ one }) => ({
  tag: one(serviceTags, { fields: [serviceTagTranslations.tagId], references: [serviceTags.id] }),
}));

export const serviceCategoryLinksRelations = relations(serviceCategoryLinks, ({ one }) => ({
  service: one(services, { fields: [serviceCategoryLinks.serviceId], references: [services.id] }),
  category: one(serviceCategories, { fields: [serviceCategoryLinks.categoryId], references: [serviceCategories.id] }),
}));

export const serviceTagLinksRelations = relations(serviceTagLinks, ({ one }) => ({
  service: one(services, { fields: [serviceTagLinks.serviceId], references: [services.id] }),
  tag: one(serviceTags, { fields: [serviceTagLinks.tagId], references: [serviceTags.id] }),
}));

export const serviceMediaRelations = relations(serviceMedia, ({ one }) => ({
  service: one(services, { fields: [serviceMedia.serviceId], references: [services.id] }),
  file: one(mediaFiles, { fields: [serviceMedia.mediaId], references: [mediaFiles.id] }),
}));

export const serviceAvailabilityRelations = relations(serviceAvailability, ({ one }) => ({
  service: one(services, { fields: [serviceAvailability.serviceId], references: [services.id] }),
}));

export const serviceRevisionsRelations = relations(serviceRevisions, ({ one }) => ({
  service: one(services, { fields: [serviceRevisions.serviceId], references: [services.id] }),
  author: one(user, { fields: [serviceRevisions.authorId], references: [user.id] }),
}));

export const serviceLocksRelations = relations(serviceLocks, ({ one }) => ({
  service: one(services, { fields: [serviceLocks.serviceId], references: [services.id] }),
  user: one(user, { fields: [serviceLocks.userId], references: [user.id] }),
}));

export const serviceSeoRelations = relations(serviceSeo, ({ one }) => ({
  service: one(services, { fields: [serviceSeo.serviceId], references: [services.id] }),
}));

export const serviceFavoritesRelations = relations(serviceFavorites, ({ one }) => ({
  service: one(services, { fields: [serviceFavorites.serviceId], references: [services.id] }),
  user: one(user, { fields: [serviceFavorites.userId], references: [user.id] }),
}));

export const serviceReviewsRelations = relations(serviceReviews, ({ one, many }) => ({
  service: one(services, { fields: [serviceReviews.serviceId], references: [services.id] }),
  author: one(user, { fields: [serviceReviews.authorId], references: [user.id] }),
  helpfulVotes: many(serviceReviewHelpful),
}));

export const serviceReviewHelpfulRelations = relations(serviceReviewHelpful, ({ one }) => ({
  review: one(serviceReviews, { fields: [serviceReviewHelpful.reviewId], references: [serviceReviews.id] }),
  user: one(user, { fields: [serviceReviewHelpful.userId], references: [user.id] }),
}));

export const serviceCommentsRelations = relations(serviceComments, ({ one, many }) => ({
  service: one(services, { fields: [serviceComments.serviceId], references: [services.id] }),
  author: one(user, { fields: [serviceComments.authorId], references: [user.id] }),
  parent: one(serviceComments, { fields: [serviceComments.parentId], references: [serviceComments.id], relationName: "serviceCommentParent" }),
  replies: many(serviceComments, { relationName: "serviceCommentParent" }),
}));

export const serviceReportsRelations = relations(serviceReports, ({ one }) => ({
  service: one(services, { fields: [serviceReports.serviceId], references: [services.id] }),
  comment: one(serviceComments, { fields: [serviceReports.commentId], references: [serviceComments.id] }),
  review: one(serviceReviews, { fields: [serviceReports.reviewId], references: [serviceReviews.id] }),
  reporter: one(user, { fields: [serviceReports.reporterId], references: [user.id] }),
  resolver: one(user, { fields: [serviceReports.resolvedBy], references: [user.id] }),
}));

export const serviceViewStatsRelations = relations(serviceViewStats, ({ one }) => ({
  service: one(services, { fields: [serviceViewStats.serviceId], references: [services.id] }),
}));
