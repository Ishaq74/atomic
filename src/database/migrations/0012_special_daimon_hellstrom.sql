ALTER TABLE "navigation_menus" ADD COLUMN "display_label" text;--> statement-breakpoint
ALTER TABLE "navigation_menus" ADD COLUMN "show_heading" boolean DEFAULT true NOT NULL;