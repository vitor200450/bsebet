import { db, matches } from "@bsebet/db";
import { eq } from "drizzle-orm";

/**
 * Configures progression from Group Winner Matches to Playoffs Quarter-Finals
 */

async function configureGroupsToPlayoffs() {
  console.log("🔧 Configuring Groups → Playoffs Progression\n");
  console.log("=" .repeat(80));

  // Get all winner matches from groups (ordered by group)
  const winnerMatches = await db.query.matches.findMany({
    where: (m, { and, eq, like }) =>
      and(eq(m.bracketSide, "groups"), like(m.name, "%Winner%")),
    orderBy: (m, { asc }) => [asc(m.id)],
  });

  // Get quarter-finals matches (ordered)
  const quarterFinals = await db.query.matches.findMany({
    where: (m, { and, eq }) => and(eq(m.bracketSide, "main"), eq(m.roundIndex, 0)),
    orderBy: (m, { asc }) => [asc(m.displayOrder), asc(m.id)],
  });

  console.log(`\n✅ Found ${winnerMatches.length} Winner Matches`);
  console.log(`✅ Found ${quarterFinals.length} Quarter-Finals\n`);

  if (winnerMatches.length !== 4 || quarterFinals.length !== 4) {
    console.error("❌ Expected 4 Winner Matches and 4 Quarter-Finals!");
    console.error(
      `   Found: ${winnerMatches.length} Winner Matches, ${quarterFinals.length} Quarter-Finals`,
    );
    process.exit(1);
  }

  console.log("📋 Configuration Plan:");
  console.log("   Group A Winner → Quarter-Final #1 (Team A)");
  console.log("   Group B Winner → Quarter-Final #2 (Team A)");
  console.log("   Group C Winner → Quarter-Final #3 (Team A)");
  console.log("   Group D Winner → Quarter-Final #4 (Team A)");
  console.log();

  // Map: Group A → QF1, Group B → QF2, Group C → QF3, Group D → QF4
  const mapping = [
    { winnerMatch: winnerMatches[0], qfMatch: quarterFinals[0], slot: "A" }, // Group A → QF1
    { winnerMatch: winnerMatches[1], qfMatch: quarterFinals[1], slot: "A" }, // Group B → QF2
    { winnerMatch: winnerMatches[2], qfMatch: quarterFinals[2], slot: "A" }, // Group C → QF3
    { winnerMatch: winnerMatches[3], qfMatch: quarterFinals[3], slot: "A" }, // Group D → QF4
  ];

  console.log("🔄 Applying configuration...\n");

  for (const { winnerMatch, qfMatch, slot } of mapping) {
    console.log(`Match ${winnerMatch.id} (${winnerMatch.name})`);
    console.log(`  → Match ${qfMatch.id} (${qfMatch.name || qfMatch.label})`);

    // Update Quarter-Final to reference Winner Match
    await db
      .update(matches)
      .set({
        [`team${slot}PreviousMatchId` as any]: winnerMatch.id,
        [`team${slot}PreviousMatchResult` as any]: "winner",
      })
      .where(eq(matches.id, qfMatch.id));

    console.log(`  ✅ Configured team${slot}PreviousMatchId = ${winnerMatch.id}\n`);
  }

  console.log("=" .repeat(80));
  console.log("\n✅ Configuration Complete!");
  console.log(
    "\n💡 Now run: bun run fix-groups to move teams from finished matches\n",
  );

  process.exit(0);
}

configureGroupsToPlayoffs().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
