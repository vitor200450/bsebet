import { db } from "./packages/db/src/index";
import { matches, bets } from "./packages/db/src/schema/index";
import { eq } from "drizzle-orm";
import { getUser } from "./apps/web/src/functions/get-user";

async function main() {
  const allTournaments = await db.query.tournaments.findMany({
    with: {
      matches: {
        where: eq(matches.isBettingEnabled, true),
        orderBy: (m, { asc }) => [asc(m.startTime)],
      },
    },
  });

  console.log("--- TOURNAMENTS STATUS ---");
  allTournaments.forEach((t) => {
    console.log(
      `ID: ${t.id} | Name: ${t.name} | Status: ${t.status} | Active: ${t.isActive} | Betting Matches: ${t.matches.length}`,
    );
    if (t.matches.length > 0) {
      const firstMatch = t.matches[0];
      const liveMatch = t.matches.find((m) => m.status === "live");
      console.log(
        `  First Match Label: ${firstMatch?.label ?? "N/A"} (${firstMatch?.status ?? "N/A"})`,
      );
      if (liveMatch)
        console.log(`  Live Match Label: ${liveMatch?.label} (live)`);
    }
  });

  const userRes = await getUser();
  if (userRes) {
    const userId = userRes.user.id;
    console.log(`\n--- CURRENT USER: ${userId} ---`);
    const userBets = await db.query.bets.findMany({
      where: eq(bets.userId, userId),
      with: {
        match: {
          with: {
            tournament: true,
          },
        },
      },
    });
    console.log(`User has ${userBets.length} total bets.`);
    userBets.forEach((b) => {
      console.log(
        `Bet ID: ${b.id} | Match ID: ${b.matchId} | Tournament: ${b.match.tournament?.name} (#${b.match.tournamentId})`,
      );
    });
  } else {
    console.log("\nNo user logged in or failed to get user.");
  }
}

main().catch(console.error);
