import dotenv from "dotenv";
dotenv.config({ path: "apps/web/.env" });

import { auth } from "../packages/auth/src";
import { db } from "../packages/db/src";
import { user } from "../packages/db/src/schema";
import { eq } from "drizzle-orm";

const usersToSeed = [
  {
    name: "Admin User",
    email: "admin@test.com",
    password: "password123",
    role: "admin",
  },
  {
    name: "User 1",
    email: "user1@test.com",
    password: "password123",
    role: "user",
  },
  {
    name: "User 2",
    email: "user2@test.com",
    password: "password123",
    role: "user",
  },
  {
    name: "User 3",
    email: "user3@test.com",
    password: "password123",
    role: "user",
  },
  {
    name: "User 4",
    email: "user4@test.com",
    password: "password123",
    role: "user",
  },
];

async function main() {
  console.log("Seeding users...");

  for (const u of usersToSeed) {
    const existing = await db.query.user.findFirst({
      where: eq(user.email, u.email),
    });

    if (existing) {
      console.log(`User ${u.email} already exists.`);
      continue;
    }

    console.log(`Creating ${u.email}...`);
    try {
      await auth.api.signUpEmail({
        body: {
          email: u.email,
          password: u.password,
          name: u.name,
        },
      });

      if (u.role === "admin") {
        await db
          .update(user)
          .set({ role: "admin" })
          .where(eq(user.email, u.email));
        console.log(`Promoted ${u.email} to ADMIN.`);
      }
    } catch (e) {
      console.error(`Failed to create ${u.email}:`, e);
    }
  }

  console.log("Done!");
  process.exit(0);
}

main();
