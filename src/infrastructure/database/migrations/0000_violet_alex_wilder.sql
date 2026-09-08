CREATE TABLE "access" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"token" varchar(50) NOT NULL,
	"refresh_token" varchar(50),
	"user_id" varchar(50) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"organization_id" varchar(50) NOT NULL,
	"user_id" varchar(50),
	"action" varchar(20) NOT NULL,
	"resource" varchar(50) NOT NULL,
	"resource_id" varchar(50),
	"changes" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_unit_users" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"public_id" varchar(50) DEFAULT '',
	"organization_id" varchar(50) NOT NULL,
	"business_unit_id" varchar(50) NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"role" varchar(20) DEFAULT 'member',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_units" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"organization_id" varchar(50) NOT NULL,
	"public_id" varchar(50),
	"name" varchar(150) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"public_id" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"icon_url" text,
	"is_paid" boolean DEFAULT false,
	"ai_settings" jsonb DEFAULT '{}'::jsonb,
	"modules" jsonb DEFAULT '{}'::jsonb,
	"apps" jsonb DEFAULT '[]'::jsonb,
	"sidebar" jsonb,
	"partition" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"is_license_required" boolean DEFAULT false,
	"n8n_user" varchar(255),
	"n8n_password" varchar(255),
	"organization_lock_features" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"public_id" varchar(50) NOT NULL,
	"organization_id" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"display_name" varchar(100) DEFAULT '',
	"avatar_url" text DEFAULT '',
	"gender" varchar(5) DEFAULT '',
	"first_name" varchar(100) DEFAULT '',
	"last_name" varchar(100) DEFAULT '',
	"address_line1" text DEFAULT '',
	"address_line2" text DEFAULT '',
	"area_code" varchar(10) DEFAULT '',
	"phone_number" varchar(20) DEFAULT '',
	"language" varchar(5) DEFAULT 'en',
	"status" varchar(20) DEFAULT 'active',
	"is_bot" boolean DEFAULT false,
	"is_admin" boolean DEFAULT false,
	"is_deleted" boolean DEFAULT false,
	"is_archived" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"on_boarded" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"organization_id" varchar(50) NOT NULL,
	"public_id" varchar(50),
	"business_unit_id" varchar(50),
	"name" varchar(150) NOT NULL,
	"mode" varchar(50) DEFAULT 'public',
	"icon_url" text DEFAULT '',
	"description" text DEFAULT '',
	"is_default" boolean DEFAULT false,
	"is_disabled" boolean DEFAULT false,
	"is_delete" boolean DEFAULT false,
	"deleted_by" varchar(50) DEFAULT '',
	"deleted_at" varchar(50) DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_users" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"team_id" varchar(50) NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"role" varchar(20) DEFAULT 'member',
	"state" varchar(20) DEFAULT '',
	"organization_id" varchar(50),
	"business_unit_id" varchar(50),
	"public_id" varchar(50),
	"applicant" varchar(50) DEFAULT '',
	"approver" varchar(50) DEFAULT '',
	"updater" varchar(50) DEFAULT '',
	"approver_at" varchar(50) DEFAULT '',
	"wait_leave" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "login_access" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "login_users" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255),
	"customer_id" varchar(255),
	"is_verify" boolean DEFAULT false,
	"auth_id" varchar(255),
	"name" varchar(255),
	"avatar_url" varchar(1024),
	"token_login" varchar(2048),
	"profile" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "login_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "team_labels" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"public_id" varchar(50),
	"organization_id" varchar(50) NOT NULL,
	"business_unit_id" varchar(50),
	"team_id" varchar(50) NOT NULL,
	"name" varchar(150) DEFAULT '' NOT NULL,
	"color" varchar(50) DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "login" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"otp" varchar(50) NOT NULL,
	"count" integer DEFAULT 1,
	"is_reach_limit" boolean DEFAULT false,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "oidc_role_mapping" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(512) NOT NULL,
	"organization_id" varchar(255) NOT NULL,
	"external_group" varchar(512) NOT NULL,
	"internal_role" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true,
	"is_default_role" boolean DEFAULT false,
	"description" varchar(1024) DEFAULT '',
	"created_by" varchar(255),
	"updated_by" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "access" ADD CONSTRAINT "access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_unit_users" ADD CONSTRAINT "business_unit_users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_unit_users" ADD CONSTRAINT "business_unit_users_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_unit_users" ADD CONSTRAINT "business_unit_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_users" ADD CONSTRAINT "team_users_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_users" ADD CONSTRAINT "team_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_users" ADD CONSTRAINT "team_users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_users" ADD CONSTRAINT "team_users_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_labels" ADD CONSTRAINT "team_labels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_labels" ADD CONSTRAINT "team_labels_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_labels" ADD CONSTRAINT "team_labels_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_org_created" ON "audit_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_resource" ON "audit_logs" USING btree ("resource","resource_id");