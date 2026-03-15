CREATE TABLE "contact_info" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"postal_code" text,
	"country" text,
	"map_url" text,
	"latitude" text,
	"longitude" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opening_hours" (
	"id" text PRIMARY KEY NOT NULL,
	"day_of_week" integer NOT NULL,
	"open_time" text,
	"close_time" text,
	"is_closed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"locale" text NOT NULL,
	"site_name" text NOT NULL,
	"site_description" text,
	"site_slogan" text,
	"meta_title" text,
	"meta_description" text,
	"logo_light" text,
	"logo_dark" text,
	"favicon" text,
	"og_image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_links" (
	"id" text PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"url" text NOT NULL,
	"icon" text,
	"label" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "theme_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"primary_color" text,
	"secondary_color" text,
	"accent_color" text,
	"background_color" text,
	"foreground_color" text,
	"muted_color" text,
	"muted_foreground_color" text,
	"font_heading" text,
	"font_body" text,
	"border_radius" text,
	"custom_css" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "navigation_items" (
	"id" text PRIMARY KEY NOT NULL,
	"menu_id" text NOT NULL,
	"parent_id" text,
	"locale" text NOT NULL,
	"label" text NOT NULL,
	"url" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"open_in_new_tab" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "navigation_menus" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" text PRIMARY KEY NOT NULL,
	"locale" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"og_image" text,
	"template" text DEFAULT 'default' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_menu_id_navigation_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."navigation_menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "opening_hours_day_uidx" ON "opening_hours" USING btree ("day_of_week");--> statement-breakpoint
CREATE UNIQUE INDEX "site_settings_locale_uidx" ON "site_settings" USING btree ("locale");--> statement-breakpoint
CREATE INDEX "social_links_sortOrder_idx" ON "social_links" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "theme_settings_name_uidx" ON "theme_settings" USING btree ("name");--> statement-breakpoint
CREATE INDEX "nav_items_menuId_idx" ON "navigation_items" USING btree ("menu_id");--> statement-breakpoint
CREATE INDEX "nav_items_parentId_idx" ON "navigation_items" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "nav_items_menu_locale_idx" ON "navigation_items" USING btree ("menu_id","locale","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "navigation_menus_name_uidx" ON "navigation_menus" USING btree ("name");--> statement-breakpoint
CREATE INDEX "page_sections_pageId_idx" ON "page_sections" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "page_sections_pageId_sort_idx" ON "page_sections" USING btree ("page_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_locale_slug_uidx" ON "pages" USING btree ("locale","slug");--> statement-breakpoint
CREATE INDEX "pages_locale_idx" ON "pages" USING btree ("locale");