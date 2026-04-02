CREATE TABLE "consent_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"accept_all" text NOT NULL,
	"reject_all" text NOT NULL,
	"customize" text NOT NULL,
	"save_preferences" text NOT NULL,
	"necessary_label" text NOT NULL,
	"necessary_description" text NOT NULL,
	"analytics_label" text NOT NULL,
	"analytics_description" text NOT NULL,
	"marketing_label" text NOT NULL,
	"marketing_description" text NOT NULL,
	"privacy_policy_label" text NOT NULL,
	"privacy_policy_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "consent_settings_locale_uidx" ON "consent_settings" USING btree ("locale");