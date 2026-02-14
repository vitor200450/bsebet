import { db, matches } from "@bsebet/db";
import { eq } from "drizzle-orm";

/**
 * Configures progression from Group Decider Matches (2nd place) to Playoffs Quarter-Finals
 * Standard seeding: 1st Group A vs 2nd Group D, 1st Group B vs 2nd Group C, etc.
 */

async function configureDecidersToPlayoffs() {
  console.log("🔧 Configuring Decider Matches (2nd place) → Playoffs\n");
  console.log("=" .repeat(80));

  // Get all decider matches from groups (ordered by group)
  const deciderMatches = await db.query.matches.findMany({
    where: (m, { and, eq, like }) =>
      and(eq(m.bracketSide, "groups"), like(m.name, "%Decider%")),
    orderBy: (m, { asc }) => [asc(m.id)],
  });

  // Get quarter-finals matches (ordered)
  const quarterFinals = await db.query.matches.findMany({
    where: (m, { and, eq }) => and(eq(m.bracketSide, "main"), eq(m.roundIndex, 0)),
    orderBy: (m, { asc }) => [asc(m.displayOrder), asc(m.id)],
  });

  console.log(`\n✅ Found ${deciderMatches.length} Decider Matches`);
  console.log(`✅ Found ${quarterFinals.length} Quarter-Finals\n`);

  if (deciderMatches.length !== 4 || quarterFinals.length !== 4) {
    console.error("❌ Expected 4 Decider Matches and 4 Quarter-Finals!");
    console.error(
      `   Found: ${deciderMatches.length} Decider Matches, ${quarterFinals.length} Quarter-Finals`,
    );
    process.exit(1);
  }

  console.log("📋 Configuration Plan (Standard Seeding):");
  console.log("   1st Group A vs 2nd Group D → QF #1");
  console.log("   1st Group B vs 2nd Group C → QF #2");
  console.log("   1st Group C vs 2nd Group B → QF #3");
  console.log("   1st Group D vs 2nd Group A → QF #4");
  console.log();

  // Map: 2nd Group D → QF1, 2nd Group C → QF2, 2nd Group B → QF3, 2nd Group A → QF4
  // deciderMatches order: [Group A, Group B, Group C, Group D]
  // quarterFinals order: [QF1, QF2, QF3, QF4]
  const mapping = [
    { deciderMatch: deciderMatches[3], qfMatch: quarterFinals[0], slot: "B" }, // Group D → QF1
    { deciderMatch: deciderMatches[2], qfMatch: quarterFinals[1], slot: "B" }, // Group C → QF2
    { deciderMatch: deciderMatches[1], qfMatch: quarterFinals[2], slot: "B" }, // Group B → QF3
    { deciderMatch: deciderMatches[0], qfMatch: quarterFinals[3], slot: "B" }, // Group A → QF4
  ];

  console.log("🔄 Applying configuration...\n");

  for (const { deciderMatch, qfMatch, slot } of mapping) {
    console.log(`Match ${deciderMatch.id} (${deciderMatch.name})`);
    console.log(`  → Match ${qfMatch.id} (${qfMatch.name || qfMatch.label})`);

    // Update Quarter-Final to reference Decider Match
    await db
      .update(matches)
      .set({
        [`team${slot}PreviousMatchId` as any]: deciderMatch.id,
        [`team${slot}PreviousMatchResult` as any]: "winner",
      })
      .where(eq(matches.id, qfMatch.id));

    console.log(`  ✅ Configured team${slot}PreviousMatchId = ${deciderMatch.id}\n`);
  }

  console.log("=" .repeat(80));
  console.log("\n✅ Configuration Complete!");
  console.log(
    "\n💡 Now run: bun run fix-groups to move teams from finished matches\n",
  );

  process.exit(0);
}

configureDecidersToPlayoffs().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
