import { db } from "@bsebet/db";

async function checkPlayoffStructure() {
  console.log("\n=== PLAYOFF BRACKET STRUCTURE ===\n");

  // Get all upper bracket matches
  const upperMatches = await db.query.matches.findMany({
    where: (m, { eq }) => eq(m.bracketSide, "upper"),
    orderBy: (m, { asc }) => [asc(m.roundIndex), asc(m.displayOrder), asc(m.id)],
    with: {
      teamA: true,
      teamB: true,
    },
  });

  console.log(`Found ${upperMatches.length} Upper Bracket Matches:\n`);

  const byRound: Record<number, any[]> = {};
  for (const match of upperMatches) {
    const round = match.roundIndex ?? 0;
    if (!byRound[round]) byRound[round] = [];
    byRound[round].push(match);
  }

  for (const [round, matches] of Object.entries(byRound)) {
    console.log(`\n=== ROUND ${round} (${matches.length} matches) ===\n`);
    for (const match of matches) {
      console.log(`Match ${match.id}: ${match.name || match.label}`);
      console.log(`  Team A: ${match.teamA?.name || "TBD"}`);
      console.log(`  Team B: ${match.teamB?.name || "TBD"}`);
      console.log(`  displayOrder: ${match.displayOrder}`);
    }
  }

  process.exit(0);
}

checkPlayoffStructure().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
