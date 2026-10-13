import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and update it.");
}

const globalForDb = globalThis as unknown as { pool?: Pool };

const pool = globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema, casing: "snake_case" });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
