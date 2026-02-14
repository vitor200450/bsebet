import { env } from "@bsebet/env/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres"; // 3.4.8

import * as schema from "./schema";

// Prevent multiple instances of the DB client in development
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn =
  globalForDb.conn ??
  postgres(env.DATABASE_URL, {
    ssl: "require",
    max: 1, // Limit connections in dev to avoid hitting limits
    prepare: false, // Required for Supabase transaction pooler & some dev environments
  });

if (process.env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
export * from "./schema";
