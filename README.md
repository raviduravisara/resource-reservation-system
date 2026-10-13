# ResourceHub — Resource Reservation Management System

A centralized web app for booking shared rooms, equipment and vehicles. It replaces informal, manual coordination with one source of truth for **what exists, when it is free, and who is using it**, and it is built so double-bookings are impossible even when many people book at the same moment.

Built for the PrimeWave Lab Software Engineering Internship technical assessment.

## Features

**For everyone**

- **Resource directory** with categories, search and a live status on every card (*Free until 3:30 PM*, *In use until 1:00 PM*, *Closed for today*, *Maintenance*).
- **Weekly schedule** per resource showing bookings, pending requests, maintenance and closed hours. Click any free hour to start a booking.
- **Find a slot**: pick a date, time, category and group size to see which resources are free, and why the others are not (booked, closed or under maintenance).
- **Booking** with clear validation: opening hours, capacity, 15-minute steps, no past bookings, up to 90 days ahead.
- **My reservations** with upcoming/past views, status filters and cancellation.
- **Dashboard** showing your upcoming bookings and everything happening across the organization today.

**For admins**

- **Approval workflow**: resources can require approval. Member bookings start as *pending* and **hold the slot** until an admin approves or rejects them (with a reason).
- **Maintenance windows** block a resource. Overlapping bookings are cancelled automatically and the bookers see the reason.
- **Resource management**: details, capacity, per-day opening hours, activate/deactivate, delete (only if never booked).
- **Categories** and **user management** (create accounts, change roles, deactivate users, which also signs them out).
- **Utilization report**: the share of opening hours used by confirmed bookings over the last 30 days, per resource.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions, Cache Components / Partial Prerendering) |
| Language | TypeScript |
| Database | PostgreSQL 16+ |
| ORM & migrations | Drizzle ORM + drizzle-kit |
| Validation | Zod |
| Styling | Tailwind CSS v4, lucide-react icons |
| Dates | date-fns + @date-fns/tz |
| Tests | Node's built-in test runner via tsx |

## Key engineering decisions

### 1. Double-booking is prevented by the database, not just the UI

Checking "is it free?" and then inserting is a race condition: two people can pass the check at the same moment. Instead, PostgreSQL enforces it with an **exclusion constraint** (see [`drizzle/0001_prevent_overlaps.sql`](drizzle/0001_prevent_overlaps.sql)):

```sql
ALTER TABLE reservations ADD CONSTRAINT reservations_no_overlap
  EXCLUDE USING gist (resource_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
  WHERE (status IN ('pending', 'confirmed'));
```

- `[)` (half-open) ranges mean back-to-back bookings (10:00–11:00 and 11:00–12:00) are allowed.
- Only **active** reservations (pending or confirmed) block a slot. Cancelled or rejected ones free it again.
- The app catches the constraint violation and turns it into a friendly message showing the conflicting times.

`npm run test:race` fires 20 simultaneous bookings for the same slot and checks that exactly one succeeds.

### 2. Pending requests hold the slot

If pending requests didn't block a slot, two people could request the same time and an admin could approve both. Holding the slot keeps approval a simple yes/no decision.

### 3. Maintenance and bookings can't race each other

Booking takes a `FOR SHARE` lock on the resource row, and scheduling maintenance takes `FOR UPDATE`. So a booking that is being created while maintenance is scheduled is either rejected or cancelled by it. It is never left silently overlapping.

### 4. Time zones

All instants are stored as `timestamptz` (UTC). Opening hours are wall-clock times (`time`) in the organization's time zone (`APP_TIMEZONE`, default `Asia/Colombo`). All conversion happens in one module, [`src/lib/time.ts`](src/lib/time.ts), so the server's own time zone never matters.

### 5. Derived status instead of stored status

*In progress*, *Completed* and *Expired* are derived from the stored status plus the current time. They are not written by a background job, so they can never be out of date.

### 6. Layered structure

```
src/
  app/                  Routes (Server Components) — thin, compose queries + components
  components/           UI (ui/ primitives, feature components)
  db/                   Drizzle schema, client, seed
  lib/                  Framework-free logic: booking rules, time zone helpers, password hashing, sessions
  server/
    queries/            Read models used by pages
    services/           Business operations (transactions, locking, domain errors)
    actions/            Server Actions: auth check → Zod validation → service → refresh
drizzle/                SQL migrations (generated + custom overlap constraints)
scripts/booking-race.ts Concurrency check against a real database
```

The booking rules live in [`src/lib/booking-rules.ts`](src/lib/booking-rules.ts) as pure functions. The UI, the server and the unit tests all use them.

### 7. Authentication

Email and password with **scrypt** hashing (Node `crypto`, no extra dependencies). Sessions live in the database: the cookie holds a random token and the database stores only its SHA-256 hash. A session can be revoked instantly, for example when an admin deactivates a user. The `proxy.ts` does a quick redirect when there is no cookie, and every page and Server Action checks the session and role again on the server.

## Data model

Entity Relationship Diagram: **[View in FigJam](https://www.figma.com/board/hmzZHKLo1dPXprPFZLa2zL)**

| Table | Purpose |
| --- | --- |
| `users` | People who can sign in. Role `admin` or `member`. Can be deactivated. |
| `sessions` | Hashed session tokens with expiry. |
| `categories` | Groups of resources (Meeting Rooms, Vehicles…). |
| `resources` | Bookable things: capacity, location, `requires_approval`, `is_active`. |
| `resource_hours` | Opening hours per resource per weekday (composite PK). |
| `maintenance_windows` | Periods when a resource is unavailable (no overlaps per resource). |
| `reservations` | Bookings with status `pending / confirmed / rejected / cancelled`, booker, reviewer and reason. |

Integrity is enforced in the database: foreign keys, `CHECK (ends_at > starts_at)`, positive capacity and attendee counts, valid weekday ranges, unique names and emails, and the two exclusion constraints.

## Getting started

### Prerequisites

- **Node.js 20.12+** (22 LTS recommended)
- **PostgreSQL 16+** running locally

### 1. Install PostgreSQL (Windows)

1. Download the installer from <https://www.postgresql.org/download/windows/> (EDB installer, latest version).
2. Keep the default components (*PostgreSQL Server*, *pgAdmin 4*, *Command Line Tools*). Stack Builder is not needed.
3. Set a password for the `postgres` superuser and keep port **5432**.
4. Create the database. Either open **SQL Shell (psql)** from the Start menu, press Enter through the prompts, type your password and run:
   ```sql
   CREATE DATABASE reservations;
   ```
   or, in pgAdmin, right-click **Databases → Create → Database…** and name it `reservations`.

On macOS/Linux, install PostgreSQL with your package manager and run `createdb reservations`.

### 2. Configure and run

```bash
git clone https://github.com/raviduravisara/resource-reservation-system.git
cd resource-reservation-system
npm install

cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
# edit .env and set your postgres password in DATABASE_URL

npm run db:migrate          # create tables + overlap constraints
npm run db:seed             # demo data (resets existing data!)
npm run dev                 # http://localhost:3000
```

### Demo accounts (created by the seed)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@primewave.test` | `Admin@123` |
| Member | `kavindi@primewave.test` | `Member@123` |

Other members: `tharindu@`, `ishara@`, `sachini@` (same password, `@primewave.test`).

The seed creates 9 resources across 4 categories, about 500 reservations (30 days back and 14 days ahead), pending requests, cancellations and two maintenance windows. This gives the dashboard and schedules realistic data.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:migrate` | Apply migrations |
| `npm run db:generate` | Generate a migration after changing `src/db/schema.ts` |
| `npm run db:seed` | Reset the database with demo data |
| `npm run db:studio` | Browse the database in Drizzle Studio |
| `npm test` | Unit tests for booking rules and time zone handling |
| `npm run test:race` | Concurrency check: 20 parallel bookings, exactly 1 must win |
| `npm run typecheck` / `npm run lint` | Static checks |

## Scope and possible next steps

Intentionally left out to keep the solution focused:

- Recurring reservations (weekly meetings)
- Email or in-app notifications for approvals and cancellations
- Self-service password reset and SSO
- Rescheduling a booking in place (today: cancel and rebook)
- Per-resource booking limits (e.g. max hours per user per week)
