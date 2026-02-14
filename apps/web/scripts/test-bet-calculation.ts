import { db } from "@bsebet/db";
import {
  tournaments,
  matches,
  teams,
  user,
  bets,
  tournamentTeams,
} from "@bsebet/db/schema";
import { eq, and, or } from "drizzle-orm";
import { calculatePoints } from "../src/server/scoring";

async function main() {
  console.log("🧪 Starting Bet Calculation Test...");

  const timestamp = Date.now();
  const testSlug = `test-tournament-${timestamp}`;

  try {
    // 1. Setup Test Data
    console.log("1. Creating Test Data...");

    // Create Tournament
    const [tournament] = await db
      .insert(tournaments)
      .values({
        name: `Test Tournament ${timestamp}`,
        slug: testSlug,
        scoringRules: { winner: 2, exact: 5, underdog_25: 1 }, // Custom rules for testing
        isActive: true,
        status: "active",
      })
      .returning();

    if (!tournament) throw new Error("Failed to create tournament");

    // Create Teams
    const [teamA] = await db
      .insert(teams)
      .values({
        name: `Test Team A ${timestamp}`,
        slug: `test-team-a-${timestamp}`,
        region: "TEST",
      })
      .returning();

    const [teamB] = await db
      .insert(teams)
      .values({
        name: `Test Team B ${timestamp}`,
        slug: `test-team-b-${timestamp}`,
        region: "TEST",
      })
      .returning();

    if (!teamA || !teamB) throw new Error("Failed to create teams");

    // Create Match
    const [match] = await db
      .insert(matches)
      .values({
        tournamentId: tournament.id,
        label: "TEST MATCH",
        teamAId: teamA.id,
        teamBId: teamB.id,
        startTime: new Date(),
        status: "scheduled",
        isBettingEnabled: true,
        underdogTeamId: teamB.id,
      })
      .returning();

    if (!match) throw new Error("Failed to create match");

    // Create Users
    const usersData = [
      {
        name: "User Wrong",
        email: `wrong-${timestamp}@test.com`,
        nickname: "Wrong (Bet A)",
      },
      {
        name: "User Wrong Winner",
        email: `wrong-win-${timestamp}@test.com`,
        nickname: "Wrong Winner (Bet A)",
      },
      {
        name: "User Perfect",
        email: `perfect-${timestamp}@test.com`,
        nickname: "Perfect (Bet B)",
      },
      {
        name: "User Underdog",
        email: `underdog-${timestamp}@test.com`,
        nickname: "Underdog (Bet B)",
      },
    ];

    const users = [];
    for (const u of usersData) {
      const [usr] = await db
        .insert(user)
        .values({
          id: crypto.randomUUID(),
          ...u,
        })
        .returning();
      users.push(usr);
    }

    // 2. Place Bets
    console.log("2. Placing Bets...");
    // Match Result will be: Team B wins 1-2 (Underdog Win)

    // User 1: Bet on A (Wrong)
    await db.insert(bets).values({
      userId: users[0]!.id,
      matchId: match.id,
      predictedWinnerId: teamA.id,
      predictedScoreA: 2,
      predictedScoreB: 1,
    });

    // User 2: Bet on A (Wrong)
    await db.insert(bets).values({
      userId: users[1]!.id,
      matchId: match.id,
      predictedWinnerId: teamA.id,
      predictedScoreA: 2,
      predictedScoreB: 0,
    });

    // User 3: Bet on B Exact (Perfect + Underdog)
    // Winner (2) + Exact (5) + Underdog (1) = 8
    await db.insert(bets).values({
      userId: users[2]!.id,
      matchId: match.id,
      predictedWinnerId: teamB.id,
      predictedScoreA: 1,
      predictedScoreB: 2,
    });

    // User 4: Bet on B Winner (Underdog)
    // Winner (2) + Underdog (1) = 3
    await db.insert(bets).values({
      userId: users[3]!.id,
      matchId: match.id,
      predictedWinnerId: teamB.id,
      predictedScoreA: 0,
      predictedScoreB: 2,
    });

    // 3. Simulate Match Result
    console.log("3. Simulating Match Result (Team B wins 1-2 - UNDERDOG)...");
    const updatedMatch = await db
      .update(matches)
      .set({
        status: "finished",
        winnerId: teamB.id,
        scoreA: 1,
        scoreB: 2,
      })
      .where(eq(matches.id, match.id))
      .returning();

    // 4. Run Calculation Logic
    console.log("4. Running Calculation Logic...");
    const matchData = updatedMatch[0]!;
    const rules = tournament.scoringRules as any;

    const matchBets = await db.query.bets.findMany({
      where: eq(bets.matchId, match.id),
      with: { user: true },
    });

    const results = [];

    for (const bet of matchBets) {
      const calculation = calculatePoints(
        {
          predictedWinnerId: bet.predictedWinnerId,
          predictedScoreA: bet.predictedScoreA,
          predictedScoreB: bet.predictedScoreB,
        },
        {
          winnerId: matchData.winnerId,
          scoreA: matchData.scoreA,
          scoreB: matchData.scoreB,
          underdogId: matchData.underdogTeamId,
        },
        rules,
      );

      // Perform update to simulate real flow
      await db
        .update(bets)
        .set({
          pointsEarned: calculation.points,
          isPerfectPick: calculation.isPerfectPick,
        })
        .where(eq(bets.id, bet.id));

      results.push({
        user: bet.user.nickname || bet.user.name,
        prediction: `${bet.predictedScoreA}-${bet.predictedScoreB} (Winner: ${bet.predictedWinnerId === teamA.id ? "A" : "B"})`,
        points: calculation.points,
        perfect: calculation.isPerfectPick,
      });
    }

    // 5. Verify Results
    console.log("\n-------------------------------------------");
    console.log("📊 RESULTS SUMMARY");
    console.log("-------------------------------------------");
    console.table(results);

    // Assertions
    const wrongUser = results.find((r) => r.user?.includes("Wrong ("));
    // const wrongWinnerUser = results.find((r) => r.user?.includes("Wrong Winner")); // Not strictly checking logic, just main ones
    const perfectUser = results.find((r) => r.user?.includes("Perfect"));
    const underdogUser = results.find((r) => r.user?.includes("Underdog"));

    // Wrong: 0
    if (wrongUser?.points !== 0) {
      console.error(
        `❌ Wrong User failed: Expected 0, got ${wrongUser?.points}`,
      );
    } else {
      console.log("✅ Wrong User: Correct points (0)");
    }

    // Perfect: Winner(2) + Exact(5) + Underdog(1) = 8
    if (perfectUser?.points !== 8) {
      console.error(
        `❌ Perfect User failed: Expected 8, got ${perfectUser?.points}`,
      );
    } else {
      console.log(
        "✅ Perfect User: Correct points (8) [Winner+Exact+Underdog]",
      );
    }

    // Underdog: Winner(2) + Underdog(1) = 3
    if (underdogUser?.points !== 3) {
      console.error(
        `❌ Underdog User failed: Expected 3, got ${underdogUser?.points}`,
      );
    } else {
      console.log("✅ Underdog User: Correct points (3) [Winner+Underdog]");
    }

    // Cleanup
    console.log("\n🧹 Cleaning up test data...");
    await db.delete(bets).where(eq(bets.matchId, match.id));
    await db.delete(matches).where(eq(matches.id, match.id));
    await db
      .delete(tournamentTeams)
      .where(eq(tournamentTeams.tournamentId, tournament.id));
    await db
      .delete(teams)
      .where(or(eq(teams.id, teamA.id), eq(teams.id, teamB.id)));
    await db.delete(tournaments).where(eq(tournaments.id, tournament.id));
    await db
      .delete(user)
      .where(
        and(
          eq(user.email, users[0]!.email),
          eq(user.email, users[1]!.email),
          eq(user.email, users[2]!.email),
          users[3] ? eq(user.email, users[3]!.email) : undefined,
        ),
      );
    // Using simple delete for users might need more careful filtering if not using IDs, but IDs are safer.
    // Deleting by IDs collected earlier
    for (const u of users) {
      await db.delete(user).where(eq(user.id, u!.id));
    }

    console.log("✅ Test Complete.");
  } catch (error) {
    console.error("❌ Test Failed:", error);
  }
}

main();
