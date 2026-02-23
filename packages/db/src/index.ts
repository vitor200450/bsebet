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
		ssl:
			env.DATABASE_URL?.includes("localhost") ||
			env.DATABASE_URL?.includes("127.0.0.1")
				? false // Local Docker doesn't need SSL
				: env.DATABASE_URL?.includes("cockroachlabs")
					? "verify-full"
					: env.DATABASE_URL?.includes("amazonaws")
						? { rejectUnauthorized: false } // Heroku Postgres SSL
						: "require",
		max: 1, // Serverless (Vercel) spawns many instances; keep max=1 per instance to avoid pool exhaustion
		prepare: false, // Required for CockroachDB, Supabase pooler, Heroku & some dev environments
		idle_timeout: 20,
		connect_timeout: 10,
	});

if (process.env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
export * from "./schema";
