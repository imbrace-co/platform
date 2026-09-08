CREATE TABLE "api_keys" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"api_key" varchar(50) NOT NULL,
	"name" varchar(255) DEFAULT '',
	"organization_id" varchar(50) NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true,
	"is_temp" boolean DEFAULT false,
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"expired_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "marketplace_customers" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"customer_id" varchar(100) NOT NULL,
	"customer_aws_account_id" varchar(100) DEFAULT '',
	"product_code" varchar(100) DEFAULT '',
	"entitlements" jsonb DEFAULT '[]'::jsonb,
	"subscription_status" varchar(50) DEFAULT 'subscribed',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "marketplace_customers_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;