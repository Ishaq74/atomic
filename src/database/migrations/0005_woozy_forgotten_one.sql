DROP INDEX "page_sections_pageId_sort_idx";--> statement-breakpoint
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_parent_id_navigation_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."navigation_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitation_inviterId_idx" ON "invitation" USING btree ("inviter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_links_platform_uidx" ON "social_links" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "theme_settings_isActive_idx" ON "theme_settings" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "page_sections_pageId_visible_sort_idx" ON "page_sections" USING btree ("page_id","is_visible","sort_order");--> statement-breakpoint
CREATE INDEX "pages_locale_published_idx" ON "pages" USING btree ("locale","is_published","sort_order");--> statement-breakpoint
ALTER TABLE "theme_settings" DROP COLUMN "custom_css";