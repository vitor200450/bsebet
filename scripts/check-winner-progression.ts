import { db } from "@bsebet/db";

async function checkWinnerProgression() {
  console.log("\n=== WINNER MATCHES PROGRESSION CONFIG ===\n");

  // Get all winner matches from groups
  const winnerMatches = await db.query.matches.findMany({
    where: (m, { and, eq, like }) =>
      and(eq(m.bracketSide, "groups"), like(m.name, "%Winner%")),
    orderBy: (m, { asc }) => [asc(m.id)],
  });

  console.log(`Found ${winnerMatches.length} Winner Matches:\n`);

  for (const match of winnerMatches) {
    console.log(`Match ${match.id}: ${match.name}`);
    console.log(`  Winner: Team ${match.winnerId}`);
    console.log(`  nextMatchWinnerId: ${match.nextMatchWinnerId}`);
    console.log(`  nextMatchWinnerSlot: ${match.nextMatchWinnerSlot}`);
    console.log();
  }

  console.log("\n=== QUARTER-FINALS CONFIG ===\n");

  // Get quarter-finals matches
  const quarterFinals = await db.query.matches.findMany({
    where: (m, { and, eq, or, like }) =>
      or(
        and(eq(m.bracketSide, "upper"), eq(m.roundIndex, 0)),
        like(m.name, "%Quarter%"),
      ),
    orderBy: (m, { asc }) => [asc(m.id)],
    with: {
      teamA: true,
      teamB: true,
    },
  });

  console.log(`Found ${quarterFinals.length} Quarter-Final Matches:\n`);

  for (const match of quarterFinals) {
    console.log(`Match ${match.id}: ${match.name || match.label}`);
    console.log(`  Team A: ${match.teamA?.name || "TBD"} (ID: ${match.teamAId})`);
    console.log(`  Team B: ${match.teamB?.name || "TBD"} (ID: ${match.teamBId})`);
    console.log(
      `  teamAPreviousMatchId: ${match.teamAPreviousMatchId} (${match.teamAPreviousMatchResult})`,
    );
    console.log(
      `  teamBPreviousMatchId: ${match.teamBPreviousMatchId} (${match.teamBPreviousMatchResult})`,
    );
    console.log();
  }

  process.exit(0);
}

checkWinnerProgression().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
