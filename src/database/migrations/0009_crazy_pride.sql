ALTER TABLE "theme_settings" ADD COLUMN "light_tokens" text;--> statement-breakpoint
ALTER TABLE "theme_settings" ADD COLUMN "dark_tokens" text;--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_uidx" ON "account" USING btree ("account_id","provider_id");