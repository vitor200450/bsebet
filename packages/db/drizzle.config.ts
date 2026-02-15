import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: "../../apps/web/.env",
});

const databaseUrl = process.env.DATABASE_URL || "";

// Heroku Postgres requires SSL
const isHeroku = databaseUrl.includes("amazonaws.com") || databaseUrl.includes("herokudns") || databaseUrl.includes("heroku");

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
    ssl: isHeroku ? { rejectUnauthorized: false } : undefined,
  },
});
