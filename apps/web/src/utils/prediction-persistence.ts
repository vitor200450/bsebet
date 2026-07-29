import type { Match, Prediction } from "@/components/bracket/types";
import { formatScoreDisplay } from "./score-format";

type UserBetRow = {
	matchId: number;
	predictedWinnerId: number | null;
	predictedScoreA: number;
	predictedScoreB: number;
};

/** Match has no teams assigned in the bracket yet (e.g. semifinal before QF results). */
export function isTbdMatch(match: Pick<Match, "teamA" | "teamB">): boolean {
	return !match.teamA?.id && !match.teamB?.id;
}

/**
 * Drop stored predictions whose winner no longer belongs to the match roster.
 * TBD matches keep predictions — roster is filled by user bracket projection.
 */
export function pruneInvalidStoredPredictions(
	parsed: Record<number, Prediction>,
	matches: Match[],
): Record<number, Prediction> {
	const result = { ...parsed };

	for (const match of matches) {
		const mid = Number(match.id);
		const pred = result[mid];
		if (!pred?.winnerId) continue;

		if (isTbdMatch(match)) continue;

		const teamAId = match.teamA?.id ? Number(match.teamA.id) : null;
		const teamBId = match.teamB?.id ? Number(match.teamB.id) : null;
		const predictedId = Number(pred.winnerId);

		if (teamAId !== null && teamBId !== null) {
			if (predictedId !== teamAId && predictedId !== teamBId) {
				delete result[mid];
			}
		} else if (teamAId !== null) {
			if (predictedId !== teamAId) delete result[mid];
		} else if (teamBId !== null) {
			if (predictedId !== teamBId) delete result[mid];
		}
	}

	return result;
}

/** Hydrate prediction state from server bets, respecting TBD bracket matches. */
export function predictionsFromUserBets(
	userBets: UserBetRow[],
	matches: Match[],
): Record<number, Prediction> {
	const initial: Record<number, Prediction> = {};

	for (const bet of userBets) {
		if (bet.predictedWinnerId === null) continue;

		const match = matches.find((m) => Number(m.id) === Number(bet.matchId));
		const predictedId = Number(bet.predictedWinnerId);
		const teamAId = match?.teamA?.id ? Number(match.teamA.id) : null;
		const teamBId = match?.teamB?.id ? Number(match.teamB.id) : null;

		if (match && !isTbdMatch(match)) {
			if (teamAId !== null && teamBId !== null) {
				if (predictedId !== teamAId && predictedId !== teamBId) continue;
			} else if (teamAId !== null) {
				if (predictedId !== teamAId) continue;
			} else if (teamBId !== null) {
				if (predictedId !== teamBId) continue;
			}
		}

		initial[bet.matchId] = {
			winnerId: predictedId,
			score: formatScoreDisplay(bet.predictedScoreA, bet.predictedScoreB),
		};
	}

	return initial;
}
