import { db } from "@bsebet/db";

async function findQuarterFinals() {
  console.log("\n=== SEARCHING FOR QUARTER-FINALS ===\n");

  // Get all matches that might be quarter-finals
  const allMatches = await db.query.matches.findMany({
    orderBy: (m, { asc }) => [asc(m.id)],
  });

  console.log(`Total matches in database: ${allMatches.length}\n`);

  // Group by bracketSide
  const bySide: Record<string, any[]> = {};
  for (const match of allMatches) {
    const side = match.bracketSide || "null";
    if (!bySide[side]) bySide[side] = [];
    bySide[side].push(match);
  }

  console.log("Matches by bracketSide:");
  for (const [side, matches] of Object.entries(bySide)) {
    console.log(`  ${side}: ${matches.length} matches`);
  }

  // Search for matches with "Quarter" in the name
  console.log("\n=== MATCHES WITH 'QUARTER' IN NAME ===\n");
  const quarterMatches = allMatches.filter(
    (m) =>
      m.name?.toLowerCase().includes("quarter") ||
      m.label?.toLowerCase().includes("quarter"),
  );

  console.log(`Found ${quarterMatches.length} matches:\n`);
  for (const match of quarterMatches) {
    console.log(`Match ${match.id}: ${match.name || match.label}`);
    console.log(`  bracketSide: ${match.bracketSide}`);
    console.log(`  roundIndex: ${match.roundIndex}`);
    console.log(`  displayOrder: ${match.displayOrder}`);
    console.log(`  teamAId: ${match.teamAId}`);
    console.log(`  teamBId: ${match.teamBId}`);
    console.log();
  }

  // Also check matches after groups (higher IDs)
  console.log("\n=== NON-GROUP MATCHES (bracketSide != 'groups') ===\n");
  const nonGroupMatches = allMatches.filter(
    (m) => m.bracketSide !== "groups" && m.bracketSide !== null,
  );

  console.log(`Found ${nonGroupMatches.length} matches:\n`);
  for (const match of nonGroupMatches) {
    console.log(`Match ${match.id}: ${match.name || match.label}`);
    console.log(`  bracketSide: ${match.bracketSide}`);
    console.log(`  roundIndex: ${match.roundIndex}`);
  }

  process.exit(0);
}

findQuarterFinals().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
