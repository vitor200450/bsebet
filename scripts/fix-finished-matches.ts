import { db, matches } from "@bsebet/db";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Script to fix matches that have status="finished" but winnerId=null
 * This should only happen due to the bug that was fixed in MatchModal.tsx
 */

async function fixFinishedMatchesWithoutWinner() {
  console.log("🔍 Searching for finished matches without a winner...\n");

  // Find all matches with status="finished" and winnerId=null
  const brokenMatches = await db.query.matches.findMany({
    where: and(eq(matches.status, "finished"), isNull(matches.winnerId)),
    with: {
      teamA: true,
      teamB: true,
      tournament: true,
    },
  });

  if (brokenMatches.length === 0) {
    console.log("✅ No broken matches found! Database is clean.");
    return;
  }

  console.log(`⚠️  Found ${brokenMatches.length} broken matches:\n`);

  const fixes: { matchId: number; action: string; winnerId?: number }[] = [];

  for (const match of brokenMatches) {
    console.log(`Match ${match.id}: ${match.name || match.label}`);
    console.log(`  Teams: ${match.teamA?.name || "?"} vs ${match.teamB?.name || "?"}`);
    console.log(`  Scores: ${match.scoreA} - ${match.scoreB}`);

    // Determine match format and wins needed
    const format = match.tournament?.format?.toLowerCase() || "bo5";
    let winsNeeded = 3; // Default BO5
    if (format.includes("bo3")) winsNeeded = 2;
    else if (format.includes("bo7")) winsNeeded = 4;

    let winnerId: number | null = null;
    let action = "";

    // Try to auto-determine winner from scores
    if (match.scoreA >= winsNeeded && match.scoreA > match.scoreB && match.teamAId) {
      winnerId = match.teamAId;
      action = `Set winner to Team A (${match.teamA?.name})`;
    } else if (match.scoreB >= winsNeeded && match.scoreB > match.scoreA && match.teamBId) {
      winnerId = match.teamBId;
      action = `Set winner to Team B (${match.teamB?.name})`;
    } else {
      // Can't determine winner, revert to scheduled
      action = "Revert status to 'scheduled' (no clear winner)";
    }

    console.log(`  Action: ${action}\n`);
    fixes.push({ matchId: match.id, action, winnerId: winnerId || undefined });
  }

  // Ask for confirmation
  console.log("\n📋 Summary of fixes:");
  fixes.forEach((fix) => {
    console.log(`  Match ${fix.matchId}: ${fix.action}`);
  });

  console.log("\n⚠️  This will modify the database!");
  console.log("Run with --execute flag to apply these changes.\n");

  // Check if --execute flag is present
  const shouldExecute = process.argv.includes("--execute");

  if (!shouldExecute) {
    console.log("💡 Dry run complete. No changes were made.");
    console.log("   To apply fixes, run: bun run fix-matches --execute");
    return;
  }

  console.log("\n🔧 Applying fixes...\n");

  for (const fix of fixes) {
    try {
      if (fix.winnerId) {
        // Update with winner
        await db
          .update(matches)
          .set({ winnerId: fix.winnerId })
          .where(eq(matches.id, fix.matchId));
        console.log(`✅ Match ${fix.matchId}: Set winnerId to ${fix.winnerId}`);
      } else {
        // Revert to scheduled
        await db
          .update(matches)
          .set({ status: "scheduled", scoreA: 0, scoreB: 0 })
          .where(eq(matches.id, fix.matchId));
        console.log(`✅ Match ${fix.matchId}: Reverted to scheduled`);
      }
    } catch (error) {
      console.error(`❌ Match ${fix.matchId}: Failed to fix -`, error);
    }
  }

  console.log("\n✨ Done! Database has been cleaned.");
}

// Run the script
fixFinishedMatchesWithoutWinner()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
