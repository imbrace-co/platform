CREATE TABLE "categories" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"public_id" varchar(50),
	"name" varchar(255) NOT NULL,
	"description" text DEFAULT '',
	"apply_to" jsonb DEFAULT '[]'::jsonb,
	"is_default" boolean DEFAULT false,
	"organization_id" varchar(50) NOT NULL,
	"reference_id" varchar(50),
	"is_deleted" boolean DEFAULT false,
	"extra" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
