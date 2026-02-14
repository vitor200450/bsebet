import { db, bets, matches } from "@bsebet/db";
import { eq, and } from "drizzle-orm";

/**
 * Diagnostic script to find bets where user predicted exact score but got 0 points
 */

async function diagnoseZeroPointsWithExactScore() {
  console.log("🔍 Searching for bets with exact score but 0 points...\n");

  // Get all finished matches with bets
  const finishedMatches = await db.query.matches.findMany({
    where: eq(matches.status, "finished"),
    with: {
      tournament: true,
    },
  });

  console.log(`📊 Found ${finishedMatches.length} finished matches.\n`);

  let problemsFound = 0;

  for (const match of finishedMatches) {
    // Get all bets for this match
    const matchBets = await db.query.bets.findMany({
      where: eq(bets.matchId, match.id),
      with: {
        user: true,
      },
    });

    for (const bet of matchBets) {
      // Check if predicted score matches actual score
      const isPredictedScoreExact =
        match.scoreA !== null &&
        match.scoreB !== null &&
        bet.predictedScoreA === match.scoreA &&
        bet.predictedScoreB === match.scoreB;

      // Check if predicted winner matches actual winner
      const isPredictedWinnerCorrect =
        match.winnerId && bet.predictedWinnerId === match.winnerId;

      // PROBLEM: Exact score but 0 points
      if (isPredictedScoreExact && bet.pointsEarned === 0) {
        problemsFound++;
        console.log(`❌ PROBLEM FOUND:`);
        console.log(`   Match ID: ${match.id} - ${match.name || match.label}`);
        console.log(`   Tournament: ${match.tournament?.name}`);
        console.log(`   User: ${bet.user?.name || bet.user?.email}`);
        console.log(`   Bet ID: ${bet.id}`);
        console.log(`   ---`);
        console.log(`   Actual Score: ${match.scoreA}-${match.scoreB}`);
        console.log(`   Predicted Score: ${bet.predictedScoreA}-${bet.predictedScoreB}`);
        console.log(`   Match Winner ID: ${match.winnerId}`);
        console.log(`   Match Team A ID: ${match.teamAId}`);
        console.log(`   Match Team B ID: ${match.teamBId}`);
        console.log(`   Predicted Winner ID: ${bet.predictedWinnerId}`);
        console.log(`   ---`);
        console.log(`   Score Match: ${isPredictedScoreExact ? "✅ YES" : "❌ NO"}`);
        console.log(`   Winner Match: ${isPredictedWinnerCorrect ? "✅ YES" : "❌ NO"}`);
        console.log(`   Points Earned: ${bet.pointsEarned}`);
        console.log(`   Is Perfect Pick Flag: ${bet.isPerfectPick}`);
        console.log("");

        // Diagnose the issue
        if (!isPredictedWinnerCorrect) {
          console.log(`   🔍 DIAGNOSIS: User predicted exact score BUT wrong winner!`);
          console.log(
            `      This could happen if user selected wrong team but entered correct score.`,
          );
        } else if (!match.winnerId) {
          console.log(`   🔍 DIAGNOSIS: Match has no winnerId set! (Data corruption)`);
        } else {
          console.log(`   🔍 DIAGNOSIS: Unknown issue - scoring logic may be broken`);
        }
        console.log("\n" + "=".repeat(80) + "\n");
      }

      // BONUS CHECK: Exact score with some points but not marked as perfect pick
      if (
        isPredictedScoreExact &&
        isPredictedWinnerCorrect &&
        bet.pointsEarned > 0 &&
        !bet.isPerfectPick
      ) {
        console.log(`⚠️  MINOR ISSUE:`);
        console.log(`   Match ID: ${match.id} - ${match.name || match.label}`);
        console.log(`   Bet ID: ${bet.id}`);
        console.log(`   User predicted exact score and got points, but isPerfectPick = false`);
        console.log(`   Points: ${bet.pointsEarned}`);
        console.log("");
      }
    }
  }

  if (problemsFound === 0) {
    console.log("✅ No problems found! All exact score predictions are scored correctly.");
  } else {
    console.log(`\n🚨 Total problems found: ${problemsFound}`);
    console.log("\nRecommendation: Run 'bun run recalc-bets' to fix scoring.");
  }
}

// Run the script
diagnoseZeroPointsWithExactScore()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
