-- Backfills the two tables that schema.ts has but no prior migration creates.
-- Dev RDS already has these (added via drizzle-kit push at some point) so this
-- migration uses CREATE TABLE IF NOT EXISTS — fresh PG creates them, dev RDS
-- silently passes. Same idempotent approach for the FK constraints.
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"public_id" varchar(50),
	"organization_id" varchar(50) NOT NULL,
	"business_unit_id" varchar(50),
	"channel_id" varchar(50) DEFAULT '',
	"channel_type" varchar(50) DEFAULT '',
	"contact_id" varchar(50) DEFAULT '',
	"status" varchar(30) DEFAULT 'active',
	"name" varchar(255) DEFAULT '',
	"mode" varchar(30) DEFAULT 'automation',
	"is_ready" boolean DEFAULT true,
	"is_agent_joined" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_conversation_users" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"public_id" varchar(50),
	"organization_id" varchar(50),
	"business_unit_id" varchar(50),
	"team_id" varchar(50),
	"conversation_id" varchar(50),
	"user_id" varchar(50),
	"role" varchar(20) DEFAULT 'member',
	"assign_from" varchar(50) DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" varchar(50) DEFAULT ''
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_organizations_id_fk"
		FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "conversations" ADD CONSTRAINT "conversations_business_unit_id_business_units_id_fk"
		FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "team_conversation_users" ADD CONSTRAINT "team_conversation_users_organization_id_organizations_id_fk"
		FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "team_conversation_users" ADD CONSTRAINT "team_conversation_users_business_unit_id_business_units_id_fk"
		FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "team_conversation_users" ADD CONSTRAINT "team_conversation_users_team_id_teams_id_fk"
		FOREIGN KEY ("team_id") REFERENCES "teams"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "team_conversation_users" ADD CONSTRAINT "team_conversation_users_conversation_id_conversations_id_fk"
		FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "team_conversation_users" ADD CONSTRAINT "team_conversation_users_user_id_users_id_fk"
		FOREIGN KEY ("user_id") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
