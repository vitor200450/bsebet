import { db, matches } from "@bsebet/db";
import { eq, or } from "drizzle-orm";

/**
 * Script to fix bracket progression for already finished matches
 * Updates next matches with correct winner/loser teams
 */

async function updateBracketProgression(finishedMatch: any) {
  if (!finishedMatch.winnerId) {
    console.log(`  ⚠️  Match ${finishedMatch.id} has no winner, skipping...`);
    return 0;
  }

  const winnerId = finishedMatch.winnerId;
  const loserId =
    finishedMatch.teamAId === winnerId
      ? finishedMatch.teamBId
      : finishedMatch.teamAId;

  if (!loserId) {
    console.log(`  ⚠️  Match ${finishedMatch.id} has no loser team, skipping...`);
    return 0;
  }

  // Find all matches that depend on this match result
  const dependentMatches = await db.query.matches.findMany({
    where: or(
      eq(matches.teamAPreviousMatchId, finishedMatch.id),
      eq(matches.teamBPreviousMatchId, finishedMatch.id),
    ),
  });

  if (dependentMatches.length === 0) {
    console.log(`  ℹ️  No dependent matches found`);
    return 0;
  }

  let updatedCount = 0;

  // Update each dependent match
  for (const depMatch of dependentMatches) {
    const updates: any = {};

    // Check if this match feeds into Team A slot
    if (depMatch.teamAPreviousMatchId === finishedMatch.id) {
      if (depMatch.teamAPreviousMatchResult === "winner") {
        updates.teamAId = winnerId;
      } else if (depMatch.teamAPreviousMatchResult === "loser") {
        updates.teamAId = loserId;
      }
    }

    // Check if this match feeds into Team B slot
    if (depMatch.teamBPreviousMatchId === finishedMatch.id) {
      if (depMatch.teamBPreviousMatchResult === "winner") {
        updates.teamBId = winnerId;
      } else if (depMatch.teamBPreviousMatchResult === "loser") {
        updates.teamBId = loserId;
      }
    }

    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      const oldTeamA = depMatch.teamAId;
      const oldTeamB = depMatch.teamBId;

      await db
        .update(matches)
        .set(updates)
        .where(eq(matches.id, depMatch.id));

      console.log(`  ✅ Updated Match ${depMatch.id} (${depMatch.name || depMatch.label}):`);
      if (updates.teamAId !== undefined) {
        console.log(`     Team A: ${oldTeamA || 'null'} → ${updates.teamAId}`);
      }
      if (updates.teamBId !== undefined) {
        console.log(`     Team B: ${oldTeamB || 'null'} → ${updates.teamBId}`);
      }

      updatedCount++;
    }
  }

  return updatedCount;
}

async function fixBracketProgression() {
  console.log("🔄 Fixing bracket progression for finished matches...\n");

  // Get all finished matches, ordered by startTime to process in chronological order
  const finishedMatches = await db.query.matches.findMany({
    where: eq(matches.status, "finished"),
    orderBy: (m, { asc }) => [asc(m.startTime), asc(m.id)],
    with: {
      tournament: true,
    },
  });

  if (finishedMatches.length === 0) {
    console.log("✅ No finished matches found. Nothing to fix.");
    return;
  }

  console.log(`📊 Found ${finishedMatches.length} finished matches.\n`);

  let totalUpdated = 0;

  for (const match of finishedMatches) {
    console.log(
      `Processing Match ${match.id}: ${match.name || match.label} (Tournament: ${match.tournament?.name})`,
    );

    const updated = await updateBracketProgression(match);
    totalUpdated += updated;

    console.log(""); // Empty line for readability
  }

  console.log("\n✨ Bracket progression fix complete!");
  console.log(`📈 Total matches updated: ${totalUpdated}`);
}

// Run the script
fixBracketProgression()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
