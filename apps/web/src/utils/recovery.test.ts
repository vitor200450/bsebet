// @ts-nocheck
import { describe, expect, it } from "bun:test";
import {
	buildRecoveryDependencySet,
	canOpenRecoveryScoreEditor,
	getRecoveryReviewScoreLabel,
	isBracketMatchLike,
	isRecoverySubmissionAllowed,
} from "./recovery";

describe("recovery helpers", () => {
	it("marks descendants of wrong finished predictions as recovery-eligible", () => {
		const matches = [
			{
				id: 1,
				status: "finished",
				resultType: "normal",
				winnerId: 10,
				teamAId: 10,
				teamBId: 11,
			},
			{
				id: 2,
				status: "scheduled",
				resultType: "normal",
				winnerId: null,
				teamAId: 12,
				teamBId: 13,
				teamAPreviousMatchId: 1,
			},
			{
				id: 3,
				status: "scheduled",
				resultType: "normal",
				winnerId: null,
				teamAId: 14,
				teamBId: 15,
				teamAPreviousMatchId: 2,
			},
		] as const;

		const userBets = [
			{
				matchId: 1,
				predictedWinnerId: 11,
			},
		];

		const dependencySet = buildRecoveryDependencySet(matches, userBets);

		expect(dependencySet.has(2)).toBeTrue();
		expect(dependencySet.has(3)).toBeTrue();
	});

	it("allows first-time locked recovery submission for bracket matches", () => {
		const allowed = isRecoverySubmissionAllowed({
			match: {
				id: 99,
				status: "scheduled",
				resultType: "normal",
				winnerId: null,
				teamAId: 1,
				teamBId: 2,
				roundIndex: 100,
			},
			hasExistingBet: false,
			dependencyEligible: false,
		});

		expect(allowed).toBeTrue();
	});

	it("allows locked recovery submission for projected final teams", () => {
		const allowed = isRecoverySubmissionAllowed({
			match: {
				id: 415,
				status: "scheduled",
				resultType: "normal",
				winnerId: null,
				teamAId: null,
				teamBId: null,
				teamAPreviousMatchId: 413,
				teamBPreviousMatchId: 414,
				label: "Final",
			},
			hasExistingBet: false,
			dependencyEligible: true,
			projectedTeamAId: 15,
			projectedTeamBId: 12,
		});

		expect(allowed).toBeTrue();
	});

	it("blocks locked submission when not bracket and not dependency-eligible", () => {
		const allowed = isRecoverySubmissionAllowed({
			match: {
				id: 100,
				status: "scheduled",
				resultType: "normal",
				winnerId: null,
				teamAId: 1,
				teamBId: 2,
				roundIndex: 1,
				bracketSide: null,
				label: "Group A",
			},
			hasExistingBet: false,
			dependencyEligible: false,
		});

		expect(allowed).toBeFalse();
	});

	it("allows score editor for editable recovery matches with a selected winner", () => {
		expect(
			canOpenRecoveryScoreEditor({
				isEditableInRecovery: true,
				hasSelectedWinner: true,
				showResult: false,
			}),
		).toBeTrue();
	});

	it("shows local edited score instead of stale server score in recovery review", () => {
		expect(
			getRecoveryReviewScoreLabel({
				displayScore: "0-3",
				serverScore: "1-3",
				canOpenScoreEditor: true,
			}),
		).toBe("0-3");
	});

	it("keeps server score for non-editable review badges", () => {
		expect(
			getRecoveryReviewScoreLabel({
				displayScore: "0-3",
				serverScore: "1-3",
				canOpenScoreEditor: false,
			}),
		).toBe("1-3");
	});

	it("blocks score editor for locked non-recovery matches", () => {
		expect(
			canOpenRecoveryScoreEditor({
				isEditableInRecovery: false,
				hasSelectedWinner: true,
				showResult: false,
			}),
		).toBeFalse();
	});

	it("detects bracket matches from explicit links or labels", () => {
		expect(
			isBracketMatchLike({
				teamAPreviousMatchId: 5,
			}),
		).toBeTrue();

		expect(
			isBracketMatchLike({
				label: "Grand Final",
			}),
		).toBeTrue();

		expect(
			isBracketMatchLike({
				label: "Group B",
			}),
		).toBeFalse();
	});
});
