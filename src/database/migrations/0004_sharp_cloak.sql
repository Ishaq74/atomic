ALTER TABLE "opening_hours" ADD COLUMN "has_midday_break" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "opening_hours" ADD COLUMN "morning_open" text;--> statement-breakpoint
ALTER TABLE "opening_hours" ADD COLUMN "morning_close" text;--> statement-breakpoint
ALTER TABLE "opening_hours" ADD COLUMN "afternoon_open" text;--> statement-breakpoint
ALTER TABLE "opening_hours" ADD COLUMN "afternoon_close" text;