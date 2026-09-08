ALTER TABLE "login_users" ADD COLUMN "provider_type" varchar(50) DEFAULT 'email';--> statement-breakpoint
ALTER TABLE "login_users" ADD COLUMN "provider_id" varchar(255);