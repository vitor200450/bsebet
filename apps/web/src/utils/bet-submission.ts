import type { Prediction } from "@/components/bracket/types";
import { canEditExistingOpenBet } from "./bet-lock";
import { formatScoreDisplay, scoresEqual } from "./score-format";

export type ServerBetRow = {
	matchId: number;
	predictedWinnerId?: number | null;
	predictedScoreA?: number;
	predictedScoreB?: number;
	isRecovery?: boolean;
};

export type SubmittableMatchInput = {
	matchId: number;
	matchStatus?: string | null;
	teamAId?: number | null;
	teamBId?: number | null;
};

export function toSubmittableMatchRows(
	matches: Array<{
		id: number;
		status?: string | null;
		teamA?: { id?: number | null } | null;
		teamB?: { id?: number | null } | null;
	}>,
): SubmittableMatchInput[] {
	return matches.map((match) => ({
		matchId: Number(match.id),
		matchStatus: match.status,
		teamAId: match.teamA?.id ? Number(match.teamA.id) : null,
		teamBId: match.teamB?.id ? Number(match.teamB.id) : null,
	}));
}

export function isMatchPickEditable({
	matchDayStatus,
	isReadOnly = false,
	matchStatus,
	isRecoveryMatch = false,
	serverBet,
	teamAId = null,
	teamBId = null,
}: {
	matchDayStatus?: string;
	isReadOnly?: boolean;
	matchStatus?: string | null;
	isRecoveryMatch?: boolean;
	serverBet?: Pick<ServerBetRow, "predictedWinnerId"> | null;
	teamAId?: number | null;
	teamBId?: number | null;
}): boolean {
	if (matchStatus === "live" || matchStatus === "finished") {
		return false;
	}

	if (isReadOnly) {
		return false;
	}

	if (matchDayStatus === "locked") {
		return isRecoveryMatch;
	}

	if (!serverBet) {
		return true;
	}

	return canEditExistingOpenBet({
		existingPredictedWinnerId:
			serverBet.predictedWinnerId != null
				? Number(serverBet.predictedWinnerId)
				: null,
		teamAId: teamAId ?? null,
		teamBId: teamBId ?? null,
	});
}

export function canReturnToBetting({
	hasUnbetEligibleMatches,
	editableRecoveryMatchIds = new Set<number>(),
	matches,
	userBets,
	matchDayStatus,
	isReadOnly = false,
}: {
	hasUnbetEligibleMatches: boolean;
	editableRecoveryMatchIds?: Set<number>;
	matches: SubmittableMatchInput[];
	userBets: ServerBetRow[];
	matchDayStatus?: string;
	isReadOnly?: boolean;
}): boolean {
	if (hasUnbetEligibleMatches) {
		return true;
	}

	if (editableRecoveryMatchIds.size > 0) {
		return true;
	}

	const userBetsByMatchId = new Map(
		userBets.map((bet) => [Number(bet.matchId), bet]),
	);

	return matches.some((match) =>
		isMatchPickEditable({
			matchDayStatus,
			isReadOnly,
			matchStatus: match.matchStatus,
			isRecoveryMatch: editableRecoveryMatchIds.has(match.matchId),
			serverBet: userBetsByMatchId.get(match.matchId),
			teamAId: match.teamAId ?? null,
			teamBId: match.teamBId ?? null,
		}),
	);
}

export function getSubmittableBetPayloads({
	predictions,
	matches,
	userBets,
	matchDayStatus,
	stalePredictionMatchIds = new Set<number>(),
	editableRecoveryMatchIds = new Set<number>(),
}: {
	predictions: Record<number, Prediction>;
	matches: SubmittableMatchInput[];
	userBets: ServerBetRow[];
	matchDayStatus?: string;
	stalePredictionMatchIds?: Set<number>;
	editableRecoveryMatchIds?: Set<number>;
}): Array<{
	matchId: number;
	predictedWinnerId: number;
	predictedScoreA: number;
	predictedScoreB: number;
}> {
	const userBetsByMatchId = new Map(
		userBets.map((bet) => [Number(bet.matchId), bet]),
	);

	return Object.entries(predictions)
		.map(([matchIdStr, pred]) => {
			const matchId = Number.parseInt(matchIdStr, 10);
			const match = matches.find((m) => Number(m.matchId) === matchId);

			if (
				!match ||
				match.matchStatus === "live" ||
				match.matchStatus === "finished"
			) {
				return null;
			}

			if (
				stalePredictionMatchIds.has(matchId) &&
				!editableRecoveryMatchIds.has(matchId)
			) {
				return null;
			}

			if (editableRecoveryMatchIds.size > 0 || matchDayStatus === "locked") {
				if (!editableRecoveryMatchIds.has(matchId)) {
					return null;
				}

				const serverBet = userBetsByMatchId.get(matchId);

				if (serverBet) {
					const serverBetScore = formatScoreDisplay(
						serverBet.predictedScoreA,
						serverBet.predictedScoreB,
					);
					const resolvedCurrentScore = pred.score?.trim() || serverBetScore;

					const isUnchanged =
						pred.winnerId === serverBet.predictedWinnerId &&
						scoresEqual(resolvedCurrentScore, serverBetScore);

					if (isUnchanged && !serverBet.isRecovery) {
						return null;
					}
				}
			} else {
				const serverBet = userBetsByMatchId.get(matchId);
				if (serverBet) {
					const teamAId = match.teamAId ?? null;
					const teamBId = match.teamBId ?? null;
					const canEdit = canEditExistingOpenBet({
						existingPredictedWinnerId:
							serverBet.predictedWinnerId != null
								? Number(serverBet.predictedWinnerId)
								: null,
						teamAId,
						teamBId,
					});

					if (!canEdit) {
						return null;
					}
				}
			}

			const serverBetForScore = userBetsByMatchId.get(matchId);
			const resolvedScore =
				pred.score?.trim() ||
				(serverBetForScore
					? formatScoreDisplay(
							serverBetForScore.predictedScoreA,
							serverBetForScore.predictedScoreB,
						)
					: "");

			if (!pred.winnerId || !resolvedScore) {
				return null;
			}

			const [scoreA, scoreB] = resolvedScore
				.split(/\s*-\s*/)
				.map((s) => Number.parseInt(s.trim(), 10));

			return {
				matchId,
				predictedWinnerId: pred.winnerId,
				predictedScoreA: Number.isNaN(scoreA) ? 0 : scoreA,
				predictedScoreB: Number.isNaN(scoreB) ? 0 : scoreB,
			};
		})
		.filter((bet): bet is NonNullable<typeof bet> => bet !== null);
}
