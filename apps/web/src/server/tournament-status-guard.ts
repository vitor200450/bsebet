export const TOURNAMENT_UPCOMING_CANNOT_START_MATCH =
	"TOURNAMENT_UPCOMING_CANNOT_START_MATCH";

export class TournamentUpcomingCannotStartMatchError extends Error {
	code = TOURNAMENT_UPCOMING_CANNOT_START_MATCH;

	constructor() {
		super(TOURNAMENT_UPCOMING_CANNOT_START_MATCH);
		this.name = "TournamentUpcomingCannotStartMatchError";
	}
}

export interface MatchMutationSnapshot {
	currentTournamentStatus: "upcoming" | "active" | "finished";
	currentMatchStatus: "scheduled" | "live" | "finished" | null;
	nextMatchStatus: "scheduled" | "live" | "finished" | null;
	currentWinnerId: number | null;
	nextWinnerId: number | null;
	currentScoreA: number | null;
	nextScoreA: number | null;
	currentScoreB: number | null;
	nextScoreB: number | null;
}

function isPositiveScore(value: number | null): boolean {
	return typeof value === "number" && value > 0;
}

function isCompetitiveState(snapshot: MatchMutationSnapshot): boolean {
	return (
		snapshot.nextMatchStatus === "live" ||
		snapshot.nextMatchStatus === "finished" ||
		snapshot.nextWinnerId !== null ||
		isPositiveScore(snapshot.nextScoreA) ||
		isPositiveScore(snapshot.nextScoreB)
	);
}

export function assertTournamentAllowsMatchMutation(
	snapshot: MatchMutationSnapshot,
): void {
	if (snapshot.currentTournamentStatus !== "upcoming") {
		return;
	}

	if (!isCompetitiveState(snapshot)) {
		return;
	}

	throw new TournamentUpcomingCannotStartMatchError();
}
