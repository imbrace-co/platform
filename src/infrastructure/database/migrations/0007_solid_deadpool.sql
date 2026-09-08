CREATE TABLE "roles" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organization_id" varchar(255) NOT NULL,
	"key" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1024) DEFAULT '',
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"priority" integer DEFAULT 3 NOT NULL,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_by" varchar(255),
	"updated_by" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "roles_org_key_unique" ON "roles" USING btree ("organization_id","key");