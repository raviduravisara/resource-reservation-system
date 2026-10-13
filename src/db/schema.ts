import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "member"]);

export const reservationStatus = pgEnum("reservation_status", [
  "pending",
  "confirmed",
  "rejected",
  "cancelled",
]);

const createdAt = timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp({ withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 120 }).notNull(),
  email: varchar({ length: 254 }).notNull().unique(),
  passwordHash: text().notNull(),
  role: userRole().notNull().default("member"),
  isActive: boolean().notNull().default(true),
  createdAt,
  updatedAt,
});

export const sessions = pgTable(
  "sessions",
  {
    id: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt,
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const categories = pgTable("categories", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 80 }).notNull().unique(),
  description: text(),
  createdAt,
});

export const resources = pgTable(
  "resources",
  {
    id: uuid().primaryKey().defaultRandom(),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: varchar({ length: 120 }).notNull().unique(),
    description: text(),
    location: varchar({ length: 160 }),
    capacity: integer(),
    requiresApproval: boolean().notNull().default(false),
    isActive: boolean().notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("resources_category_id_idx").on(t.categoryId),
    check("resources_capacity_positive", sql`${t.capacity} IS NULL OR ${t.capacity} > 0`),
  ],
);

export const resourceHours = pgTable(
  "resource_hours",
  {
    resourceId: uuid()
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    weekday: smallint().notNull(),
    opensAt: time().notNull(),
    closesAt: time().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.resourceId, t.weekday] }),
    check("resource_hours_weekday_range", sql`${t.weekday} BETWEEN 0 AND 6`),
    check("resource_hours_valid_range", sql`${t.closesAt} > ${t.opensAt}`),
  ],
);

export const maintenanceWindows = pgTable(
  "maintenance_windows",
  {
    id: uuid().primaryKey().defaultRandom(),
    resourceId: uuid()
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    reason: varchar({ length: 200 }).notNull(),
    createdById: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt,
  },
  (t) => [
    index("maintenance_windows_resource_starts_idx").on(t.resourceId, t.startsAt),
    check("maintenance_windows_valid_range", sql`${t.endsAt} > ${t.startsAt}`),
  ],
);

export const reservations = pgTable(
  "reservations",
  {
    id: uuid().primaryKey().defaultRandom(),
    resourceId: uuid()
      .notNull()
      .references(() => resources.id, { onDelete: "restrict" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: varchar({ length: 120 }).notNull(),
    notes: text(),
    attendees: integer(),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    status: reservationStatus().notNull().default("pending"),
    reviewedById: uuid().references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp({ withTimezone: true }),
    statusReason: varchar({ length: 300 }),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("reservations_resource_starts_idx").on(t.resourceId, t.startsAt),
    index("reservations_user_starts_idx").on(t.userId, t.startsAt),
    index("reservations_status_idx").on(t.status),
    check("reservations_valid_range", sql`${t.endsAt} > ${t.startsAt}`),
    check("reservations_attendees_positive", sql`${t.attendees} IS NULL OR ${t.attendees} > 0`),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  reservations: many(reservations, { relationName: "booker" }),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  resources: many(resources),
}));

export const resourcesRelations = relations(resources, ({ one, many }) => ({
  category: one(categories, { fields: [resources.categoryId], references: [categories.id] }),
  hours: many(resourceHours),
  maintenanceWindows: many(maintenanceWindows),
  reservations: many(reservations),
}));

export const resourceHoursRelations = relations(resourceHours, ({ one }) => ({
  resource: one(resources, { fields: [resourceHours.resourceId], references: [resources.id] }),
}));

export const maintenanceWindowsRelations = relations(maintenanceWindows, ({ one }) => ({
  resource: one(resources, {
    fields: [maintenanceWindows.resourceId],
    references: [resources.id],
  }),
  createdBy: one(users, { fields: [maintenanceWindows.createdById], references: [users.id] }),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  resource: one(resources, { fields: [reservations.resourceId], references: [resources.id] }),
  user: one(users, {
    fields: [reservations.userId],
    references: [users.id],
    relationName: "booker",
  }),
  reviewedBy: one(users, { fields: [reservations.reviewedById], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Role = (typeof userRole.enumValues)[number];
export type Resource = typeof resources.$inferSelect;
export type ResourceHours = typeof resourceHours.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type ReservationStatus = (typeof reservationStatus.enumValues)[number];
