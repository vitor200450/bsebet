import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL || "";

// Heroku Postgres requires SSL
let connUrl = databaseUrl;
if (connUrl && !connUrl.includes("sslmode=")) {
	const separator = connUrl.includes("?") ? "&" : "?";
	connUrl = `${connUrl}${separator}sslmode=require`;
}

async function main() {
	console.log("Connecting to database...");

	const conn = postgres(connUrl, {
		ssl: { rejectUnauthorized: false },
		max: 1,
		prepare: false,
	});

	try {
		// Drop all tables in public schema
		console.log("Dropping existing tables...");
		await conn`DROP SCHEMA IF EXISTS public CASCADE`;
		await conn`CREATE SCHEMA public`;
		await conn`GRANT ALL ON SCHEMA public TO public`;

		console.log("Database reset complete!");
	} catch (error) {
		console.error("Error resetting database:", error);
		process.exit(1);
	} finally {
		await conn.end();
	}
}

main();
