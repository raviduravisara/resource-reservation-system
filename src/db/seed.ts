import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { overlaps } from "../lib/booking-rules";
import { hashPassword } from "../lib/password";
import { addDaysToKey, formatClock, parseClock, toDateKey, toInstant, weekdayOfKey } from "../lib/time";
import * as schema from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema, casing: "snake_case" });

function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = seededRandom(20261015);
const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];

const WEEKDAYS_ONLY = [1, 2, 3, 4, 5];
const SIX_DAYS = [1, 2, 3, 4, 5, 6];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

const titles = {
  "Meeting Rooms": ["Sprint planning", "Client call", "Design review", "Weekly sync", "Interview", "Quarterly review", "Retrospective"],
  Workspaces: ["Team workshop", "Hackathon prep", "Focus session", "Onboarding session", "All-hands rehearsal"],
  Equipment: ["Product shoot", "Training session", "Board presentation", "Marketing video", "Webinar"],
  Vehicles: ["Client site visit", "Airport pickup", "Supplier meeting", "Bank errands", "Field survey"],
} as const;

type CategoryName = keyof typeof titles;

const resourceSeeds: {
  name: string;
  category: CategoryName;
  location: string;
  capacity: number | null;
  requiresApproval: boolean;
  description: string;
  days: number[];
  opensAt: string;
  closesAt: string;
  popularity: number;
  durations: number[];
}[] = [
  {
    name: "Board Room",
    category: "Meeting Rooms",
    location: "Level 3",
    capacity: 14,
    requiresApproval: true,
    description: "Executive meeting room with a 75\" display, video conferencing and whiteboard wall.",
    days: WEEKDAYS_ONLY,
    opensAt: "08:00",
    closesAt: "18:00",
    popularity: 0.45,
    durations: [60, 90, 120],
  },
  {
    name: "Ocean Meeting Room",
    category: "Meeting Rooms",
    location: "Level 2, East wing",
    capacity: 8,
    requiresApproval: false,
    description: "Mid-sized room with a TV screen and conference speakerphone.",
    days: WEEKDAYS_ONLY,
    opensAt: "08:00",
    closesAt: "18:00",
    popularity: 0.6,
    durations: [30, 60, 60, 90],
  },
  {
    name: "Focus Room A",
    category: "Meeting Rooms",
    location: "Level 2, West wing",
    capacity: 4,
    requiresApproval: false,
    description: "Quiet room for calls, interviews and small discussions.",
    days: WEEKDAYS_ONLY,
    opensAt: "08:00",
    closesAt: "19:00",
    popularity: 0.55,
    durations: [30, 60],
  },
  {
    name: "Training Hall",
    category: "Workspaces",
    location: "Ground floor",
    capacity: 40,
    requiresApproval: true,
    description: "Large flexible hall with a projector, PA system and movable desks.",
    days: SIX_DAYS,
    opensAt: "08:00",
    closesAt: "20:00",
    popularity: 0.25,
    durations: [120, 180, 240],
  },
  {
    name: "Collaboration Lounge",
    category: "Workspaces",
    location: "Level 1",
    capacity: 20,
    requiresApproval: false,
    description: "Open lounge with sofas and writable walls for informal team sessions.",
    days: WEEKDAYS_ONLY,
    opensAt: "09:00",
    closesAt: "17:00",
    popularity: 0.3,
    durations: [60, 120],
  },
  {
    name: "Epson Projector",
    category: "Equipment",
    location: "IT store, Level 1",
    capacity: null,
    requiresApproval: false,
    description: "Portable full-HD projector with HDMI and USB-C adapters.",
    days: WEEKDAYS_ONLY,
    opensAt: "08:30",
    closesAt: "17:00",
    popularity: 0.35,
    durations: [60, 120, 180],
  },
  {
    name: "Sony 4K Camera Kit",
    category: "Equipment",
    location: "Media room",
    capacity: null,
    requiresApproval: true,
    description: "Sony FX30 with tripod, gimbal, two lenses and wireless microphones.",
    days: WEEKDAYS_ONLY,
    opensAt: "08:30",
    closesAt: "17:00",
    popularity: 0.2,
    durations: [120, 240],
  },
  {
    name: "Toyota KDH Van",
    category: "Vehicles",
    location: "Basement parking B1",
    capacity: 14,
    requiresApproval: true,
    description: "14-seater van for team travel. Driver available on request.",
    days: EVERY_DAY,
    opensAt: "06:00",
    closesAt: "21:00",
    popularity: 0.25,
    durations: [180, 240, 360],
  },
  {
    name: "Pool Car – Toyota Axio",
    category: "Vehicles",
    location: "Basement parking B1",
    capacity: 4,
    requiresApproval: false,
    description: "Hybrid sedan for short business trips around Colombo.",
    days: SIX_DAYS,
    opensAt: "07:00",
    closesAt: "19:00",
    popularity: 0.4,
    durations: [60, 120, 180],
  },
];

async function main() {
  console.log("Resetting demo data…");
  await db.execute(
    sql`TRUNCATE sessions, reservations, maintenance_windows, resource_hours, resources, categories, users CASCADE`,
  );

  const [adminHash, memberHash] = await Promise.all([hashPassword("Admin@123"), hashPassword("Member@123")]);

  const insertedUsers = await db
    .insert(schema.users)
    .values([
      { name: "Nimal Perera", email: "admin@primewave.test", role: "admin", passwordHash: adminHash },
      { name: "Kavindi Silva", email: "kavindi@primewave.test", role: "member", passwordHash: memberHash },
      { name: "Tharindu Fernando", email: "tharindu@primewave.test", role: "member", passwordHash: memberHash },
      { name: "Ishara Jayasinghe", email: "ishara@primewave.test", role: "member", passwordHash: memberHash },
      { name: "Sachini Herath", email: "sachini@primewave.test", role: "member", passwordHash: memberHash },
    ])
    .returning();
  const admin = insertedUsers[0];
  const members = insertedUsers.slice(1);

  const insertedCategories = await db
    .insert(schema.categories)
    .values([
      { name: "Meeting Rooms", description: "Rooms for meetings, calls and interviews." },
      { name: "Workspaces", description: "Larger spaces for workshops, training and events." },
      { name: "Equipment", description: "Shared devices that can be checked out." },
      { name: "Vehicles", description: "Company vehicles for business travel." },
    ])
    .returning();
  const categoryId = (name: CategoryName) => insertedCategories.find((c) => c.name === name)!.id;

  const todayKey = toDateKey(new Date());
  const now = new Date();
  const maintenanceRows: (typeof schema.maintenanceWindows.$inferInsert)[] = [];
  const reservationRows: (typeof schema.reservations.$inferInsert)[] = [];

  for (const seed of resourceSeeds) {
    const [resource] = await db
      .insert(schema.resources)
      .values({
        name: seed.name,
        categoryId: categoryId(seed.category),
        location: seed.location,
        capacity: seed.capacity,
        requiresApproval: seed.requiresApproval,
        description: seed.description,
      })
      .returning();

    await db
      .insert(schema.resourceHours)
      .values(seed.days.map((weekday) => ({ resourceId: resource.id, weekday, opensAt: seed.opensAt, closesAt: seed.closesAt })));

    const blocked: { startsAt: Date; endsAt: Date }[] = [];
    if (seed.name === "Ocean Meeting Room" || seed.name === "Sony 4K Camera Kit") {
      let key = addDaysToKey(todayKey, seed.name === "Ocean Meeting Room" ? 1 : 4);
      while (!seed.days.includes(weekdayOfKey(key))) key = addDaysToKey(key, 1);
      const window =
        seed.name === "Ocean Meeting Room"
          ? { startsAt: toInstant(key, "13:00"), endsAt: toInstant(key, "15:00"), reason: "Air-conditioning service" }
          : { startsAt: toInstant(key, seed.opensAt), endsAt: toInstant(key, seed.closesAt), reason: "Sensor cleaning and firmware update" };
      maintenanceRows.push({ ...window, resourceId: resource.id, createdById: admin.id });
      blocked.push(window);
    }

    for (let offset = -30; offset <= 14; offset++) {
      const dayKey = addDaysToKey(todayKey, offset);
      if (!seed.days.includes(weekdayOfKey(dayKey))) continue;

      let cursor = parseClock(seed.opensAt);
      const close = parseClock(seed.closesAt);
      while (cursor < close) {
        const start = cursor + pick([0, 0, 30, 60, 90]);
        const duration = pick(seed.durations);
        if (start + duration > close) break;
        cursor = start + duration;
        if (random() > seed.popularity) continue;

        const startsAt = toInstant(dayKey, formatClock(start));
        const endsAt = toInstant(dayKey, formatClock(start + duration));
        if (blocked.some((b) => overlaps(b.startsAt, b.endsAt, startsAt, endsAt))) continue;

        const booker = random() < 0.1 ? admin : pick(members);
        const isPast = startsAt < now;
        const roll = random();
        let status: schema.ReservationStatus = "confirmed";
        let statusReason: string | null = null;
        if (roll < 0.06) {
          status = "cancelled";
          statusReason = "Plans changed";
        } else if (seed.requiresApproval && booker.role !== "admin") {
          if (!isPast && roll < 0.4) status = "pending";
          else if (roll < 0.12) {
            status = "rejected";
            statusReason = "Slot reserved for a leadership meeting";
          }
        }

        const reviewed = seed.requiresApproval && (status === "confirmed" || status === "rejected") && booker.role !== "admin";
        reservationRows.push({
          resourceId: resource.id,
          userId: booker.id,
          title: pick(titles[seed.category]),
          attendees: seed.capacity ? Math.max(1, Math.ceil(random() * seed.capacity)) : null,
          startsAt,
          endsAt,
          status,
          statusReason,
          reviewedById: reviewed ? admin.id : null,
          reviewedAt: reviewed ? new Date(startsAt.getTime() - 2 * 86_400_000) : null,
          createdAt: new Date(startsAt.getTime() - (3 + Math.floor(random() * 7)) * 86_400_000),
        });
      }
    }
  }

  await db.insert(schema.maintenanceWindows).values(maintenanceRows);
  for (let i = 0; i < reservationRows.length; i += 500) {
    await db.insert(schema.reservations).values(reservationRows.slice(i, i + 500));
  }

  console.log(
    `Seeded ${insertedUsers.length} users, ${resourceSeeds.length} resources, ${reservationRows.length} reservations and ${maintenanceRows.length} maintenance windows.`,
  );
  console.log("Admin:  admin@primewave.test / Admin@123");
  console.log("Member: kavindi@primewave.test / Member@123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
