import { bets, matches } from "@bsebet/db/schema";
import { eq } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type ScoringRules = {
  winner: number;
  exact: number;
  underdog_25: number; // Extreme underdog (≤25%)
  underdog_50: number; // Moderate underdog (26-50%)
};

/**
 * Calculates points for a single bet based on the match result and tournament rules.
 */
export function calculatePoints(
  bet: {
    predictedWinnerId: number | null;
    predictedScoreA: number;
    predictedScoreB: number;
  },
  match: {
    winnerId: number | null;
    scoreA: number | null;
    scoreB: number | null;
    underdogId?: number | null;
    underdogTier?: 1 | 2 | null;
  },
  rules: ScoringRules,
): {
  points: number;
  isPerfectPick: boolean;
  isUnderdogPick: boolean;
} {
  // Validate and sanitize rules
  const safeRules: ScoringRules = {
    winner: rules.winner ?? 1,
    exact: rules.exact ?? 3,
    underdog_25: rules.underdog_25 ?? 2,
    underdog_50: rules.underdog_50 ?? 1,
  };

  let points = 0;
  let isPerfectPick = false;
  let isUnderdogPick = false;

  // 1. Check if predicted winner is correct
  const isWinnerCorrect = match.winnerId && bet.predictedWinnerId === match.winnerId;

  // 2. Check if exact score is correct
  const isExactScoreCorrect =
    match.scoreA !== null &&
    match.scoreB !== null &&
    bet.predictedScoreA === match.scoreA &&
    bet.predictedScoreB === match.scoreB;

  // 3. Award points (exact score OVERWRITES winner points, not adds)
  if (isWinnerCorrect && isExactScoreCorrect) {
    // Perfect pick: OVERWRITE with exact score points (not add)
    points = safeRules.exact;
    isPerfectPick = true;
  } else if (isWinnerCorrect) {
    // Only winner correct: base points
    points = safeRules.winner;
  }

  // 4. Underdog Bonus (applies on top of base/exact points)
  if (
    match.winnerId &&
    match.underdogId &&
    match.winnerId === match.underdogId &&
    bet.predictedWinnerId === match.winnerId
  ) {
    // Apply tier-based bonus
    if (match.underdogTier === 1) {
      // Tier 1: Extreme underdog (≤25%)
      points += safeRules.underdog_25;
    } else if (match.underdogTier === 2) {
      // Tier 2: Moderate underdog (26-50%)
      points += safeRules.underdog_50;
    }
    isUnderdogPick = true;
  }

  // Ensure points is a valid number
  if (isNaN(points) || points === null || points === undefined) {
    points = 0;
  }

  return { points, isPerfectPick, isUnderdogPick };
}

/**
 * Calculates the underdog team ID and tier based on the distribution of bets.
 * Tier 1 (Extreme): ≤25% of votes → higher bonus
 * Tier 2 (Moderate): >25% and ≤50% of votes → lower bonus
 */
export function calculateUnderdogStatus(
  bets: { predictedWinnerId: number | null }[],
  teamAId: number,
  teamBId: number,
): { teamId: number; tier: 1 | 2 } | null {
  if (bets.length === 0) return null;

  const teamAVotes = bets.filter((b) => b.predictedWinnerId === teamAId).length;
  const teamBVotes = bets.filter((b) => b.predictedWinnerId === teamBId).length;
  const totalVotes = bets.length;

  if (totalVotes === 0) return null;

  const teamAPercent = teamAVotes / totalVotes;
  const teamBPercent = teamBVotes / totalVotes;

  // Tier 1: Extreme underdog (≤25%)
  if (teamAPercent <= 0.25) {
    return { teamId: teamAId, tier: 1 };
  } else if (teamBPercent <= 0.25) {
    return { teamId: teamBId, tier: 1 };
  }

  // Tier 2: Moderate underdog (26-50%)
  if (teamAPercent > 0.25 && teamAPercent <= 0.50) {
    return { teamId: teamAId, tier: 2 };
  } else if (teamBPercent > 0.25 && teamBPercent <= 0.50) {
    return { teamId: teamBId, tier: 2 };
  }

  return null;
}

/**
 * Settles all bets for a given match.
 * - Fetches match, tournament rules, and all bets.
 * - Calculates points for each bet.
 * - Updates bets in the database.
 */
export const settleBetsFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const { matchId } = z.object({ matchId: z.number() }).parse(ctx.data);

    // 1. Fetch match and tournament rules
    const matchData = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
      with: {
        tournament: true,
      },
    });

    if (!matchData) {
      throw new Error("Match not found");
    }

    if (matchData.status !== "finished") {
      throw new Error("Match is not finished");
    }

    let rules = matchData.tournament?.scoringRules as ScoringRules;

    // CHECK FOR STAGE OVERRIDE
    if (matchData.stageId && matchData.tournament?.stages) {
      const stages = matchData.tournament.stages as any[];
      const stage = stages.find((s) => s.id === matchData.stageId);
      if (stage && stage.scoringRules) {
        rules = stage.scoringRules as ScoringRules;
      }
    }

    if (!rules) {
      rules = {
        winner: 1,
        exact: 3,
        underdog_25: 2, // Tier 1: ≤25%
        underdog_50: 1, // Tier 2: 26-50%
      };
      // throw new Error("Tournament scoring rules not found");
    }

    // 2. Fetch all bets for this match
    const matchBets = await db.query.bets.findMany({
      where: eq(bets.matchId, matchId),
    });

    // 2.5 Calculate Underdog (Dynamic Calculation with Tiers)
    // Tier 1: ≤25% of votes, Tier 2: 26-50% of votes
    let calculatedUnderdogId: number | null = null;
    let calculatedUnderdogTier: 1 | 2 | null = null;

    if (matchData.teamAId && matchData.teamBId) {
      const underdogResult = calculateUnderdogStatus(
        matchBets,
        matchData.teamAId,
        matchData.teamBId,
      );

      if (underdogResult) {
        calculatedUnderdogId = underdogResult.teamId;
        calculatedUnderdogTier = underdogResult.tier;
      }

      // Update match with the calculated underdog
      if (calculatedUnderdogId !== matchData.underdogTeamId) {
        await db
          .update(matches)
          .set({ underdogTeamId: calculatedUnderdogId })
          .where(eq(matches.id, matchId));
      }
    }

    // 3. Calculate points for each bet and prepare updates
    const updates = matchBets.map((bet) => {
      const calculation = calculatePoints(
        {
          predictedWinnerId: bet.predictedWinnerId,
          predictedScoreA: bet.predictedScoreA,
          predictedScoreB: bet.predictedScoreB,
        },
        {
          winnerId: matchData.winnerId,
          scoreA: matchData.scoreA,
          scoreB: matchData.scoreB,
          underdogId: calculatedUnderdogId ?? matchData.underdogTeamId,
          underdogTier: calculatedUnderdogTier,
        },
        rules,
      );

      return {
        id: bet.id,
        ...calculation,
      };
    });

    // 4. Perform bulk updates (or individual updates if bulk not supported easily by driver)
    // For now, doing Promise.all for simplicity, though bulk update would be better for performance
    await Promise.all(
      updates.map((update) =>
        db
          .update(bets)
          .set({
            pointsEarned: update.points,
            isPerfectPick: update.isPerfectPick,
            isUnderdogPick: update.isUnderdogPick,
          })
          .where(eq(bets.id, update.id)),
      ),
    );

    return { success: true, betsSettled: updates.length };
  },
);

export const settleBets = settleBetsFn as unknown as (opts: {
  data: { matchId: number };
}) => Promise<{ success: boolean; betsSettled: number }>;
