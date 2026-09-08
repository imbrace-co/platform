CREATE TABLE "message_bars" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"type" varchar(32) NOT NULL,
	"content" text DEFAULT '',
	"with_link" boolean DEFAULT false,
	"link" text DEFAULT '',
	"duration" varchar(32),
	"custom_duration" varchar(255),
	"active" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
