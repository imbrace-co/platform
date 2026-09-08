CREATE TABLE "login_attempt_emails" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"count" integer DEFAULT 1,
	"is_reach_limit" boolean DEFAULT false,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "login_attempt_emails_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "login_users" ADD COLUMN "verify_code" varchar(255);--> statement-breakpoint
ALTER TABLE "login_users" ADD COLUMN "verify_expired_at" timestamp;