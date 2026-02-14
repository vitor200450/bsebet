import { db, matches } from "@bsebet/db";
import { eq } from "drizzle-orm";

/**
 * Reconfigures playoff seeding with correct matchups:
 * QF #1: 1A vs 2C
 * QF #2: 1B vs 2D
 * QF #3: 1C vs 2A
 * QF #4: 1D vs 2B
 */

async function reconfigurePlayoffSeeding() {
  console.log("🔧 Reconfiguring Playoff Seeding\n");
  console.log("=" .repeat(80));

  // Get Winner Matches (1st place) - ordered by group
  const winnerMatches = await db.query.matches.findMany({
    where: (m, { and, eq, like }) =>
      and(eq(m.bracketSide, "groups"), like(m.name, "%Winner%")),
    orderBy: (m, { asc }) => [asc(m.id)],
  });

  // Get Decider Matches (2nd place) - ordered by group
  const deciderMatches = await db.query.matches.findMany({
    where: (m, { and, eq, like }) =>
      and(eq(m.bracketSide, "groups"), like(m.name, "%Decider%")),
    orderBy: (m, { asc }) => [asc(m.id)],
  });

  // Get Quarter-Finals
  const quarterFinals = await db.query.matches.findMany({
    where: (m, { and, eq }) => and(eq(m.bracketSide, "main"), eq(m.roundIndex, 0)),
    orderBy: (m, { asc }) => [asc(m.displayOrder), asc(m.id)],
  });

  console.log(`\n✅ Found ${winnerMatches.length} Winner Matches`);
  console.log(`✅ Found ${deciderMatches.length} Decider Matches`);
  console.log(`✅ Found ${quarterFinals.length} Quarter-Finals\n`);

  if (
    winnerMatches.length !== 4 ||
    deciderMatches.length !== 4 ||
    quarterFinals.length !== 4
  ) {
    console.error("❌ Expected 4 matches of each type!");
    process.exit(1);
  }

  // Arrays are ordered as: [Group A, Group B, Group C, Group D]
  const winnerA = winnerMatches[0]; // Group A
  const winnerB = winnerMatches[1]; // Group B
  const winnerC = winnerMatches[2]; // Group C
  const winnerD = winnerMatches[3]; // Group D

  const deciderA = deciderMatches[0]; // Group A
  const deciderB = deciderMatches[1]; // Group B
  const deciderC = deciderMatches[2]; // Group C
  const deciderD = deciderMatches[3]; // Group D

  const qf1 = quarterFinals[0];
  const qf2 = quarterFinals[1];
  const qf3 = quarterFinals[2];
  const qf4 = quarterFinals[3];

  console.log("📋 New Seeding Configuration:\n");
  console.log(`QF #1: 1st Group A  vs  2nd Group C`);
  console.log(`QF #2: 1st Group B  vs  2nd Group D`);
  console.log(`QF #3: 1st Group C  vs  2nd Group A`);
  console.log(`QF #4: 1st Group D  vs  2nd Group B\n`);

  const mapping = [
    {
      qf: qf1,
      winnerMatch: winnerA,
      deciderMatch: deciderC,
      labelA: "1st Group A",
      labelB: "2nd Group C",
    },
    {
      qf: qf2,
      winnerMatch: winnerB,
      deciderMatch: deciderD,
      labelA: "1st Group B",
      labelB: "2nd Group D",
    },
    {
      qf: qf3,
      winnerMatch: winnerC,
      deciderMatch: deciderA,
      labelA: "1st Group C",
      labelB: "2nd Group A",
    },
    {
      qf: qf4,
      winnerMatch: winnerD,
      deciderMatch: deciderB,
      labelA: "1st Group D",
      labelB: "2nd Group B",
    },
  ];

  console.log("🔄 Applying configuration...\n");

  for (const config of mapping) {
    console.log(`Match ${config.qf.id}: ${config.qf.name || config.qf.label}`);
    console.log(`  Team A: ${config.labelA} ← Match ${config.winnerMatch.id}`);
    console.log(`  Team B: ${config.labelB} ← Match ${config.deciderMatch.id}`);

    await db
      .update(matches)
      .set({
        labelTeamA: config.labelA,
        labelTeamB: config.labelB,
        teamAPreviousMatchId: config.winnerMatch.id,
        teamAPreviousMatchResult: "winner",
        teamBPreviousMatchId: config.deciderMatch.id,
        teamBPreviousMatchResult: "winner",
        teamAId: null, // Will be filled by progression
        teamBId: null, // Will be filled by progression
      })
      .where(eq(matches.id, config.qf.id));

    console.log(`  ✅ Configured\n`);
  }

  console.log("=" .repeat(80));
  console.log("\n✅ Playoff seeding reconfigured!");
  console.log("\n💡 Now run: bun run fix-groups to populate teams\n");

  process.exit(0);
}

reconfigurePlayoffSeeding().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
