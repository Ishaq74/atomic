ALTER TABLE "organization" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_org_email_uidx" ON "invitation" USING btree ("organization_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "member_org_user_uidx" ON "member" USING btree ("organization_id","user_id");