// @ts-nocheck
import { describe, expect, it } from "bun:test";
import {
	buildRecoveryDependencySet,
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
