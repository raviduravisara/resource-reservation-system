CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'confirmed', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "maintenance_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" varchar(200) NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "maintenance_windows_valid_range" CHECK ("maintenance_windows"."ends_at" > "maintenance_windows"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(120) NOT NULL,
	"notes" text,
	"attendees" integer,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "reservation_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp with time zone,
	"status_reason" varchar(300),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_valid_range" CHECK ("reservations"."ends_at" > "reservations"."starts_at"),
	CONSTRAINT "reservations_attendees_positive" CHECK ("reservations"."attendees" IS NULL OR "reservations"."attendees" > 0)
);
--> statement-breakpoint
CREATE TABLE "resource_hours" (
	"resource_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"opens_at" time NOT NULL,
	"closes_at" time NOT NULL,
	CONSTRAINT "resource_hours_resource_id_weekday_pk" PRIMARY KEY("resource_id","weekday"),
	CONSTRAINT "resource_hours_weekday_range" CHECK ("resource_hours"."weekday" BETWEEN 0 AND 6),
	CONSTRAINT "resource_hours_valid_range" CHECK ("resource_hours"."closes_at" > "resource_hours"."opens_at")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"location" varchar(160),
	"capacity" integer,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resources_name_unique" UNIQUE("name"),
	CONSTRAINT "resources_capacity_positive" CHECK ("resources"."capacity" IS NULL OR "resources"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "maintenance_windows" ADD CONSTRAINT "maintenance_windows_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_windows" ADD CONSTRAINT "maintenance_windows_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_hours" ADD CONSTRAINT "resource_hours_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maintenance_windows_resource_starts_idx" ON "maintenance_windows" USING btree ("resource_id","starts_at");--> statement-breakpoint
CREATE INDEX "reservations_resource_starts_idx" ON "reservations" USING btree ("resource_id","starts_at");--> statement-breakpoint
CREATE INDEX "reservations_user_starts_idx" ON "reservations" USING btree ("user_id","starts_at");--> statement-breakpoint
CREATE INDEX "reservations_status_idx" ON "reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "resources_category_id_idx" ON "resources" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");