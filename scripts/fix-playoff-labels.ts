import { db, matches } from "@bsebet/db";
import { eq } from "drizzle-orm";

/**
 * Updates Quarter-Final labels to use "1st Group A" format instead of "Winner of Match X"
 */

async function fixPlayoffLabels() {
  console.log("🔧 Fixing Playoff Labels to Group Format\n");
  console.log("=" .repeat(80));

  // Get quarter-finals
  const quarterFinals = await db.query.matches.findMany({
    where: (m, { and, eq }) => and(eq(m.bracketSide, "main"), eq(m.roundIndex, 0)),
    orderBy: (m, { asc }) => [asc(m.displayOrder), asc(m.id)],
  });

  console.log(`\n✅ Found ${quarterFinals.length} Quarter-Finals\n`);

  if (quarterFinals.length !== 4) {
    console.error("❌ Expected 4 Quarter-Finals!");
    process.exit(1);
  }

  // Standard seeding mapping
  const labelMapping = [
    { teamA: "1st Group A", teamB: "2nd Group D" }, // QF #1
    { teamA: "1st Group B", teamB: "2nd Group C" }, // QF #2
    { teamA: "1st Group C", teamB: "2nd Group B" }, // QF #3
    { teamA: "1st Group D", teamB: "2nd Group A" }, // QF #4
  ];

  console.log("📋 Updating labels to group format:\n");

  for (let i = 0; i < quarterFinals.length; i++) {
    const qf = quarterFinals[i];
    const labels = labelMapping[i];

    console.log(`Match ${qf.id}: ${qf.name || qf.label}`);
    console.log(`  Current: "${qf.labelTeamA}" vs "${qf.labelTeamB}"`);
    console.log(`  New:     "${labels.teamA}" vs "${labels.teamB}"`);

    await db
      .update(matches)
      .set({
        labelTeamA: labels.teamA,
        labelTeamB: labels.teamB,
      })
      .where(eq(matches.id, qf.id));

    console.log(`  ✅ Updated\n`);
  }

  console.log("=" .repeat(80));
  console.log("\n✅ All Quarter-Final labels updated!");
  console.log("\n💡 Now when you edit these matches in the admin panel:");
  console.log("   - The modal will show: Team A Source: GROUP");
  console.log("   - With fields: Group A, 1st Place");
  console.log("   - But progression still works automatically!\n");

  process.exit(0);
}

fixPlayoffLabels().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
