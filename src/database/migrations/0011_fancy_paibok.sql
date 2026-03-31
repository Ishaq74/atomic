ALTER TABLE "site_settings" ADD COLUMN "header_cta_text" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "header_cta_url" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "header_secondary_text" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "header_secondary_url" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "header_sticky" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "footer_copyright_text" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "footer_copyright_url" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "footer_social_heading" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "footer_nav_primary_heading" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "footer_nav_secondary_heading" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "footer_legal_heading" text;--> statement-breakpoint
ALTER TABLE "navigation_menus" ADD COLUMN "is_visible" boolean DEFAULT true NOT NULL;