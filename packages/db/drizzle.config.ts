import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
	path: "../../apps/web/.env",
});

let databaseUrl = process.env.DATABASE_URL || "";

// Heroku Postgres requires SSL - add sslmode=require to URL (unless localhost)
if (
	databaseUrl &&
	!databaseUrl.includes("sslmode=") &&
	!databaseUrl.includes("localhost") &&
	!databaseUrl.includes("127.0.0.1")
) {
	const separator = databaseUrl.includes("?") ? "&" : "?";
	databaseUrl = `${databaseUrl}${separator}sslmode=require`;
}

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: databaseUrl,
	},
	// Ignore system schemas and extensions on Heroku
	schemaFilter: ["public"],
	tablesFilter: ["!pg_stat_statements*", "!pg_buffercache*"],
});
