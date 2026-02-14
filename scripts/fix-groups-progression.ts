import { db, matches } from "@bsebet/db";
import { eq } from "drizzle-orm";

/**
 * Script to fix bracket progression for already finished matches
 * This will re-run the progression logic for all finished matches
 */

async function updateBracketProgression(finishedMatch: any) {
  if (!finishedMatch.winnerId) {
    console.log(
      `[Skip] Match ${finishedMatch.id} (${finishedMatch.name || finishedMatch.label}) has no winner`,
    );
    return;
  }

  const winnerId = finishedMatch.winnerId;
  const loserId =
    finishedMatch.teamAId === winnerId
      ? finishedMatch.teamBId
      : finishedMatch.teamAId;

  console.log(`\n[Processing] Match ${finishedMatch.id}: ${finishedMatch.name || finishedMatch.label}`);
  console.log(`  Winner: Team ${winnerId}, Loser: Team ${loserId}`);

  // Find all matches that depend on this match result
  const dependentMatches = await db.query.matches.findMany({
    where: (m: any, { or, eq }: any) =>
      or(
        eq(m.teamAPreviousMatchId, finishedMatch.id),
        eq(m.teamBPreviousMatchId, finishedMatch.id),
      ),
  });

  console.log(`  Found ${dependentMatches.length} dependent matches`);

  if (dependentMatches.length === 0) {
    console.log(`  ⚠️ WARNING: No dependent matches found!`);
    console.log(
      `     This might mean progression fields (teamAPreviousMatchId, etc.) are not configured.`,
    );
  }

  // Update each dependent match
  for (const depMatch of dependentMatches) {
    const updates: any = {};

    console.log(
      `\n  [Dependent] Match ${depMatch.id}: ${depMatch.name || depMatch.label}`,
    );
    console.log(
      `    Current: TeamA=${depMatch.teamAId}, TeamB=${depMatch.teamBId}`,
    );
    console.log(
      `    Config: teamAPrevMatch=${depMatch.teamAPreviousMatchId} (${depMatch.teamAPreviousMatchResult})`,
    );
    console.log(
      `            teamBPrevMatch=${depMatch.teamBPreviousMatchId} (${depMatch.teamBPreviousMatchResult})`,
    );

    // Check if this match feeds into Team A slot
    if (depMatch.teamAPreviousMatchId === finishedMatch.id) {
      if (depMatch.teamAPreviousMatchResult === "winner") {
        updates.teamAId = winnerId;
        console.log(`    → Will set teamAId to WINNER: ${winnerId}`);
      } else if (depMatch.teamAPreviousMatchResult === "loser") {
        updates.teamAId = loserId;
        console.log(`    → Will set teamAId to LOSER: ${loserId}`);
      }
    }

    // Check if this match feeds into Team B slot
    if (depMatch.teamBPreviousMatchId === finishedMatch.id) {
      if (depMatch.teamBPreviousMatchResult === "winner") {
        updates.teamBId = winnerId;
        console.log(`    → Will set teamBId to WINNER: ${winnerId}`);
      } else if (depMatch.teamBPreviousMatchResult === "loser") {
        updates.teamBId = loserId;
        console.log(`    → Will set teamBId to LOSER: ${loserId}`);
      }
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await db.update(matches).set(updates).where(eq(matches.id, depMatch.id));
      console.log(`    ✅ Updated successfully:`, updates);
    } else {
      console.log(`    ⚠️ No updates needed (might be a config issue)`);
    }
  }
}

async function fixGroupsProgression() {
  console.log("🔧 Starting bracket progression fix...\n");
  console.log("=" .repeat(80));

  // Get all finished matches, ordered by roundIndex to process groups first, then playoffs
  const finishedMatches = await db.query.matches.findMany({
    where: eq(matches.status, "finished"),
    orderBy: (m, { asc }) => [asc(m.roundIndex), asc(m.displayOrder)],
  });

  console.log(`\n📊 Found ${finishedMatches.length} finished matches\n`);

  let processedCount = 0;
  let errorCount = 0;

  for (const match of finishedMatches) {
    try {
      await updateBracketProgression(match);
      processedCount++;
    } catch (error) {
      console.error(`❌ Error processing match ${match.id}:`, error);
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n✅ Bracket progression fix complete!");
  console.log(`   Processed: ${processedCount} matches`);
  console.log(`   Errors: ${errorCount} matches`);

  if (errorCount === 0 && processedCount > 0) {
    console.log("\n🎉 All matches processed successfully!");
  } else if (errorCount > 0) {
    console.log("\n⚠️ Some matches had errors, please review the logs above.");
  }
}

// Run the script
fixGroupsProgression()
  .then(() => {
    console.log("\n👋 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
