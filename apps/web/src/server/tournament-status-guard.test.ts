import { describe, expect, it } from "bun:test";
import {
	TOURNAMENT_UPCOMING_CANNOT_START_MATCH,
	TournamentUpcomingCannotStartMatchError,
	assertTournamentAllowsMatchMutation,
	type MatchMutationSnapshot,
} from "./tournament-status-guard";

const baseState: MatchMutationSnapshot = {
	currentTournamentStatus: "upcoming",
	currentMatchStatus: "scheduled",
	nextMatchStatus: "scheduled",
	currentWinnerId: null,
	nextWinnerId: null,
	currentScoreA: 0,
	nextScoreA: 0,
	currentScoreB: 0,
	nextScoreB: 0,
};

describe("tournament status guard", () => {
	it("throws when an upcoming tournament match is moved to live", () => {
		expect(() =>
			assertTournamentAllowsMatchMutation({
				...baseState,
				nextMatchStatus: "live",
			}),
		).toThrow(TOURNAMENT_UPCOMING_CANNOT_START_MATCH);
	});

	it("throws when an upcoming tournament receives a winner", () => {
		expect(() =>
			assertTournamentAllowsMatchMutation({
				...baseState,
				nextWinnerId: 10,
			}),
		).toThrow(TournamentUpcomingCannotStartMatchError);
	});

	it("throws when an upcoming tournament receives a non-zero score", () => {
		expect(() =>
			assertTournamentAllowsMatchMutation({
				...baseState,
				nextScoreA: 1,
			}),
		).toThrow(TOURNAMENT_UPCOMING_CANNOT_START_MATCH);
	});

	it("allows neutral scheduled edits for upcoming tournaments", () => {
		expect(() =>
			assertTournamentAllowsMatchMutation({
				...baseState,
				nextScoreA: 0,
				nextScoreB: 0,
			}),
		).not.toThrow();
	});

	it("allows competitive changes when tournament is active", () => {
		expect(() =>
			assertTournamentAllowsMatchMutation({
				...baseState,
				currentTournamentStatus: "active",
				nextMatchStatus: "finished",
				nextWinnerId: 20,
				nextScoreA: 3,
				nextScoreB: 1,
			}),
		).not.toThrow();
	});
});
