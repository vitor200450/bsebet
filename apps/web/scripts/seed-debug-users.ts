// @ts-nocheck
import { db } from "@bsebet/db";
import { user } from "@bsebet/db/schema/auth";
import { matches, bets } from "@bsebet/db/schema/index";
import { auth } from "@bsebet/auth"; // Ensure this import works
import { eq } from "drizzle-orm";

const TEST_USERS = [
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
  console.log("🌱 Seeding Debug Users for Switcher...");

  for (const u of TEST_USERS) {
    // Check if user exists
    const existing = await db.query.user.findFirst({
      where: eq(user.email, u.email),
    });

    if (!existing) {
      console.log(`Creating user: ${u.email}...`);
      try {
        // Attempt to create user via Better Auth API
        // Note: usage might vary based on Better Auth version and server context
        // If this fails, we might need a direct DB insert with hashed password
        const res = await auth.api.signUpEmail({
          body: {
            email: u.email,
            password: u.password,
            name: u.name,
          },
          asResponse: false,
          headers: new Headers({
            origin: process.env.CORS_ORIGIN || "http://localhost:3001",
          }),
        });

        // Use db to update role since signUp might not allow setting role directly
        if (res && u.role === "admin") {
          await db
            .update(user)
            .set({ role: "admin" })
            .where(eq(user.email, u.email));
          console.log(`Updated role for ${u.email} to admin`);
        }
      } catch (err) {
        console.error(`Failed to create user ${u.email} via auth API:`);
        // @ts-ignore
        if (err.body) console.error(JSON.stringify(err.body, null, 2));
        // @ts-ignore
        if (err.message) console.error(err.message);
        console.error(err);
      }
    } else {
      console.log(`User ${u.email} already exists.`);
      // Update role if needed
      if (existing.role !== u.role) {
        await db
          .update(user)
          .set({ role: u.role })
          .where(eq(user.email, u.email));
      }
    }
  }

  // Seed Bets for these users
  const allMatches = await db.select().from(matches);
  if (allMatches.length === 0) {
    console.log("No matches found to bet on.");
    return;
  }

  const users = await db.query.user.findMany();
  const testUserEmails = new Set(TEST_USERS.map((u) => u.email));
  const targetUsers = users.filter((u) => testUserEmails.has(u.email));

  const betsToInsert = [];
  for (const tUser of targetUsers) {
    // Clear existing bets
    await db.delete(bets).where(eq(bets.userId, tUser.id));

    for (const match of allMatches) {
      if (!match.teamAId || !match.teamBId) continue;

      const randomWinner = Math.random() > 0.5 ? match.teamAId : match.teamBId;
      betsToInsert.push({
        userId: tUser.id,
        matchId: match.id,
        predictedWinnerId: randomWinner,
        predictedScoreA:
          randomWinner === match.teamAId ? 2 : Math.random() > 0.5 ? 1 : 0,
        predictedScoreB:
          randomWinner === match.teamBId ? 2 : Math.random() > 0.5 ? 1 : 0,
        predictedWinnerId: randomWinner, // Fix duplicate key in object if any
      });
    }
  }

  if (betsToInsert.length > 0) {
    // Chunk inserts if too many
    await db.insert(bets).values(betsToInsert);
    console.log(`Placed ${betsToInsert.length} bets for test users.`);
  }

  console.log("✅ Debug Users Seed Complete");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
