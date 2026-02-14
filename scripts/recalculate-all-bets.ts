import { db, bets, matches } from "@bsebet/db";
import { eq } from "drizzle-orm";
import { calculatePoints, calculateUnderdogStatus } from "../apps/web/src/server/scoring";

/**
 * Script to recalculate all bet points using the new scoring logic
 * (where exact score OVERWRITES winner points instead of adding)
 */

type ScoringRules = {
  winner: number;
  exact: number;
  underdog_25: number; // Tier 1: ≤25%
  underdog_50: number; // Tier 2: 26-50%
};

async function recalculateAllBets() {
  console.log("🔄 Recalculating all bet points with new scoring logic...\n");

  // 1. Get all finished matches
  const finishedMatches = await db.query.matches.findMany({
    where: eq(matches.status, "finished"),
    with: {
      tournament: true,
    },
  });

  if (finishedMatches.length === 0) {
    console.log("✅ No finished matches found. Nothing to recalculate.");
    return;
  }

  console.log(`📊 Found ${finishedMatches.length} finished matches.\n`);

  let totalBetsUpdated = 0;
  let totalPointsChanged = 0;

  for (const match of finishedMatches) {
    console.log(`Processing Match ${match.id}: ${match.name || match.label}`);

    // Get scoring rules
    let rules = match.tournament?.scoringRules as ScoringRules;

    // Check for stage override
    if (match.stageId && match.tournament?.stages) {
      const stages = match.tournament.stages as any[];
      const stage = stages.find((s: any) => s.id === match.stageId);
      if (stage && stage.scoringRules) {
        rules = stage.scoringRules as ScoringRules;
      }
    }

    // Default rules if not found
    if (!rules) {
      rules = {
        winner: 1,
        exact: 3,
        underdog_25: 2, // Tier 1: ≤25%
        underdog_50: 1, // Tier 2: 26-50%
      };
    }

    // Get all bets for this match
    const matchBets = await db.query.bets.findMany({
      where: eq(bets.matchId, match.id),
    });

    if (matchBets.length === 0) {
      console.log(`  No bets found.\n`);
      continue;
    }

    // Calculate underdog with tier information
    let calculatedUnderdogId: number | null = null;
    let calculatedUnderdogTier: 1 | 2 | null = null;
    if (match.teamAId && match.teamBId) {
      const underdogResult = calculateUnderdogStatus(
        matchBets,
        match.teamAId,
        match.teamBId,
      );

      if (underdogResult) {
        calculatedUnderdogId = underdogResult.teamId;
        calculatedUnderdogTier = underdogResult.tier;
      }
    }

    // Recalculate points for each bet
    let betsChanged = 0;
    for (const bet of matchBets) {
      const oldPoints = bet.pointsEarned;

      const calculation = calculatePoints(
        {
          predictedWinnerId: bet.predictedWinnerId,
          predictedScoreA: bet.predictedScoreA,
          predictedScoreB: bet.predictedScoreB,
        },
        {
          winnerId: match.winnerId,
          scoreA: match.scoreA,
          scoreB: match.scoreB,
          underdogId: calculatedUnderdogId ?? match.underdogTeamId,
          underdogTier: calculatedUnderdogTier,
        },
        rules,
      );

      // Only update if points changed
      if (oldPoints !== calculation.points) {
        await db
          .update(bets)
          .set({
            pointsEarned: calculation.points,
            isPerfectPick: calculation.isPerfectPick,
            isUnderdogPick: calculation.isUnderdogPick,
          })
          .where(eq(bets.id, bet.id));

        console.log(`  Bet ${bet.id}: ${oldPoints} → ${calculation.points} points`);
        betsChanged++;
        totalPointsChanged += Math.abs(calculation.points - oldPoints);
      }
    }

    console.log(`  Updated ${betsChanged}/${matchBets.length} bets\n`);
    totalBetsUpdated += betsChanged;
  }

  console.log("\n✨ Recalculation complete!");
  console.log(`📈 Total bets updated: ${totalBetsUpdated}`);
  console.log(`📊 Total points delta: ${totalPointsChanged.toFixed(2)}`);
}

// Run the script
recalculateAllBets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
