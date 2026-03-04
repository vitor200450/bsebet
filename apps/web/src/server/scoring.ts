import { bets, matches, pointAdjustments } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

type ScoringRules = {
	winner: number;
	exact: number;
	underdog_25: number; // Extreme underdog (≤25%)
	underdog_50: number; // Moderate underdog (26-50%)
	underdog_tier1_max_pct?: number;
	underdog_tier2_max_pct?: number;
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
		underdog_tier1_max_pct: rules.underdog_tier1_max_pct ?? 0.25,
		underdog_tier2_max_pct: rules.underdog_tier2_max_pct ?? 0.5,
	};

	let points = 0;
	let isPerfectPick = false;
	let isUnderdogPick = false;

	// 1. Check if predicted winner is correct
	const isWinnerCorrect =
		match.winnerId && bet.predictedWinnerId === match.winnerId;

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
	thresholds?: {
		tier1MaxPct?: number;
		tier2MaxPct?: number;
	},
): { teamId: number; tier: 1 | 2 } | null {
	if (bets.length === 0) return null;

	const tier1MaxPct = thresholds?.tier1MaxPct ?? 0.25;
	const tier2MaxPct = thresholds?.tier2MaxPct ?? 0.5;

	const hasValidThresholds =
		tier1MaxPct > 0 &&
		tier2MaxPct > 0 &&
		tier1MaxPct <= tier2MaxPct &&
		tier2MaxPct <= 1;

	const safeTier1 = hasValidThresholds ? tier1MaxPct : 0.25;
	const safeTier2 = hasValidThresholds ? tier2MaxPct : 0.5;

	const teamAVotes = bets.filter((b) => b.predictedWinnerId === teamAId).length;
	const teamBVotes = bets.filter((b) => b.predictedWinnerId === teamBId).length;
	const totalVotes = bets.length;

	if (totalVotes === 0) return null;

	const teamAPercent = teamAVotes / totalVotes;
	const teamBPercent = teamBVotes / totalVotes;

	// Tier 1: Extreme underdog (≤25%)
	if (teamAPercent <= safeTier1) {
		return { teamId: teamAId, tier: 1 };
	}
	if (teamBPercent <= safeTier1) {
		return { teamId: teamBId, tier: 1 };
	}

	// Tier 2: Moderate underdog (26-50%)
	if (teamAPercent > safeTier1 && teamAPercent <= safeTier2) {
		return { teamId: teamAId, tier: 2 };
	}
	if (teamBPercent > safeTier1 && teamBPercent <= safeTier2) {
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
		const { matchId, includeAdjustments } = z
			.object({
				matchId: z.number(),
				includeAdjustments: z.boolean().optional().default(true),
			})
			.parse(ctx.data);

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

		const isWalkover = matchData.resultType === "wo";

		if (isWalkover && !matchData.winnerId) {
			const hasTeamA = !!matchData.teamAId;
			const hasTeamB = !!matchData.teamBId;

			if (hasTeamA !== hasTeamB) {
				// One-sided WO with pending opponent definition.
				// Clear any previously settled points and skip settlement for now;
				// bracket progression will auto-resolve when both teams are known.
				await db
					.update(bets)
					.set({
						pointsEarned: 0,
						isPerfectPick: false,
						isUnderdogPick: false,
					})
					.where(eq(bets.matchId, matchId));

				return { success: true, betsSettled: 0 };
			}

			if (!matchData.winnerId) {
				throw new Error("Walkover match requires winnerId before settlement");
			}
		}

		// 2. Fetch all bets for this match
		let matchBets = await db.query.bets.findMany({
			where: eq(bets.matchId, matchId),
		});

		// WO fallback: if the match had no betting window (no bets at all),
		// award base winner points to active bettors of the tournament.
		// This allows retroactive settlement on recalculation without manual adjustments.
		if (
			isWalkover &&
			matchBets.length === 0 &&
			matchData.tournamentId &&
			matchData.winnerId
		) {
			const tournamentBettors = await db
				.select({ userId: bets.userId })
				.from(bets)
				.innerJoin(matches, eq(bets.matchId, matches.id))
				.where(eq(matches.tournamentId, matchData.tournamentId))
				.groupBy(bets.userId);

			if (tournamentBettors.length > 0) {
				const defaultScoreA =
					matchData.scoreA ??
					(matchData.winnerId === matchData.teamAId ? 3 : 0);
				const defaultScoreB =
					matchData.scoreB ??
					(matchData.winnerId === matchData.teamBId ? 3 : 0);

				await db.insert(bets).values(
					tournamentBettors.map((bettor) => ({
						userId: bettor.userId,
						matchId,
						predictedWinnerId: matchData.winnerId,
						predictedScoreA: defaultScoreA,
						predictedScoreB: defaultScoreB,
						isRecovery: true,
					})),
				);

				matchBets = await db.query.bets.findMany({
					where: eq(bets.matchId, matchId),
				});
			}
		}

		// 2.5 Calculate Underdog (Dynamic Calculation with Tiers)
		// Tier 1: ≤25% of votes, Tier 2: 26-50% of votes
		let calculatedUnderdogId: number | null = null;
		let calculatedUnderdogTier: 1 | 2 | null = null;

		if (!isWalkover && matchData.teamAId && matchData.teamBId) {
			const underdogResult = calculateUnderdogStatus(
				matchBets,
				matchData.teamAId,
				matchData.teamBId,
				{
					tier1MaxPct: rules.underdog_tier1_max_pct,
					tier2MaxPct: rules.underdog_tier2_max_pct,
				},
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
		const adjustmentPointsByUserId = new Map<string, number>();

		if (includeAdjustments) {
			const adjustments = await db
				.select({
					userId: pointAdjustments.userId,
					totalPoints: sql<number>`coalesce(sum(${pointAdjustments.points}), 0)`,
				})
				.from(pointAdjustments)
				.where(eq(pointAdjustments.matchId, matchId))
				.groupBy(pointAdjustments.userId);

			for (const adj of adjustments) {
				adjustmentPointsByUserId.set(adj.userId, Number(adj.totalPoints || 0));
			}
		}

		const updates = matchBets.map((bet) => {
			const adjustmentPoints = adjustmentPointsByUserId.get(bet.userId) ?? 0;

			if (isWalkover) {
				return {
					id: bet.id,
					points: rules.winner + adjustmentPoints,
					isPerfectPick: false,
					isUnderdogPick: false,
				};
			}

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
				points: calculation.points + adjustmentPoints,
				isPerfectPick: calculation.isPerfectPick,
				isUnderdogPick: calculation.isUnderdogPick,
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
	data: { matchId: number; includeAdjustments?: boolean };
}) => Promise<{ success: boolean; betsSettled: number }>;
