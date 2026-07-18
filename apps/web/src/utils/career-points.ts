import { bets, matches, tournaments } from "@bsebet/db/schema";
import { and, eq, sql } from "drizzle-orm";

export const countsTowardGlobalCondition = eq(
	tournaments.countsTowardGlobal,
	true,
);

export const careerStatsSelect = {
	totalBets: sql<number>`count(*)`,
	totalPoints: sql<number>`COALESCE(SUM(${bets.pointsEarned}), 0)`,
	correctPredictions: sql<number>`count(*) FILTER (WHERE ${bets.pointsEarned} > 0)`,
	perfectPicks: sql<number>`count(*) FILTER (WHERE ${bets.isPerfectPick} = true)`,
	underdogWins: sql<number>`count(*) FILTER (WHERE ${bets.isUnderdogPick} = true AND ${bets.pointsEarned} > 0)`,
} as const;

export function careerBetsUserFilter(userId: string) {
	return and(eq(bets.userId, userId), countsTowardGlobalCondition);
}

export type MedalLike = {
	tournamentId: number;
	placement: 1 | 2 | 3;
};

export function filterMedalsForGlobalTiebreaker(
	medals: MedalLike[],
	options: {
		excludeTournamentId?: number;
		nonGlobalTournamentIds?: ReadonlySet<number>;
	},
): MedalLike[] {
	return medals.filter((medal) => {
		if (
			options.excludeTournamentId !== undefined &&
			medal.tournamentId === options.excludeTournamentId
		) {
			return false;
		}
		if (options.nonGlobalTournamentIds?.has(medal.tournamentId)) {
			return false;
		}
		return true;
	});
}

export function summarizeMedalPlacements(medals: MedalLike[]) {
	return {
		gold: medals.filter((medal) => medal.placement === 1).length,
		silver: medals.filter((medal) => medal.placement === 2).length,
		bronze: medals.filter((medal) => medal.placement === 3).length,
		total: medals.length,
	};
}
