import { describe, expect, it } from "bun:test";
import { canEditExistingOpenBet } from "./bet-lock";
import {
	buildRecoveryDependencySet,
	isRecoverySubmissionAllowed,
} from "./recovery";

describe("integration: bet submission guard", () => {
	it("blocks re-submission on open match day when matchup did not change", () => {
		const finalMatch = {
			id: 10,
			status: "scheduled",
			resultType: "normal",
			winnerId: null,
			teamAId: 101,
			teamBId: 202,
		};

		const existingBet = {
			matchId: 10,
			predictedWinnerId: 101,
		};

		const canEdit = canEditExistingOpenBet({
			existingPredictedWinnerId: existingBet.predictedWinnerId,
			teamAId: finalMatch.teamAId,
			teamBId: finalMatch.teamBId,
		});

		expect(canEdit).toBe(false);
	});

	it("allows re-submission on open match day when existing bet became stale", () => {
		const finalMatch = {
			id: 10,
			status: "scheduled",
			resultType: "normal",
			winnerId: null,
			teamAId: 101,
			teamBId: 202,
		};

		const existingBet = {
			matchId: 10,
			predictedWinnerId: 999,
		};

		const canEdit = canEditExistingOpenBet({
			existingPredictedWinnerId: existingBet.predictedWinnerId,
			teamAId: finalMatch.teamAId,
			teamBId: finalMatch.teamBId,
		});

		expect(canEdit).toBe(true);
	});

	it("keeps locked-day recovery flow allowed for dependent matches", () => {
		const matches = [
			{
				id: 1,
				status: "finished",
				resultType: "normal",
				winnerId: 2,
				teamAId: 1,
				teamBId: 2,
				roundIndex: 0,
				bracketSide: "upper",
			},
			{
				id: 2,
				status: "finished",
				resultType: "normal",
				winnerId: 4,
				teamAId: 3,
				teamBId: 4,
				roundIndex: 0,
				bracketSide: "upper",
			},
			{
				id: 3,
				status: "scheduled",
				resultType: "normal",
				winnerId: null,
				teamAId: 2,
				teamBId: 4,
				teamAPreviousMatchId: 1,
				teamBPreviousMatchId: 2,
				roundIndex: 1,
				bracketSide: "upper",
			},
		];

		const userBets = [
			{ matchId: 1, predictedWinnerId: 1 },
			{ matchId: 2, predictedWinnerId: 3 },
		];

		const dependencySet = buildRecoveryDependencySet(matches, userBets);
		expect(dependencySet.has(3)).toBe(true);

		const allowed = isRecoverySubmissionAllowed({
			match: matches[2],
			hasExistingBet: false,
			dependencyEligible: dependencySet.has(3),
		});

		expect(allowed).toBe(true);
	});
});
