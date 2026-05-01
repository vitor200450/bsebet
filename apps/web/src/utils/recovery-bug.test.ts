// @ts-nocheck
import { describe, expect, it } from "bun:test";
import {
	buildRecoveryDependencySet,
	isRecoverySubmissionAllowed,
} from "./recovery";

/**
 * Test reproducing the reported bug:
 *
 * Scenario: Monthly final with quarterfinals
 * - QF1: Team A vs Team B
 * - QF2: Team C vs Team D
 * - SF1: Winner QF1 vs Winner QF2
 *
 * User bets on quarterfinals:
 * - QF1: Bet on A (but actual result was B)
 * - QF2: Bet on C (but actual result was D)
 *
 * Actual result:
 * - QF1: B won (finished, winnerId = B)
 * - QF2: D won (finished, winnerId = D)
 *
 * Now on SF1: B vs D
 * User SHOULD be able to bet on SF1 (recovery), since they missed previous predictions.
 *
 * BUG: User CANNOT bet on SF1!
 */
describe("BUG: Recovery betting when user misses all quarterfinal bets", () => {
	const teams = {
		A: { id: 1, name: "Time A" },
		B: { id: 2, name: "Time B" },
		C: { id: 3, name: "Time C" },
		D: { id: 4, name: "Time D" },
	};

	it("should allow recovery in semifinal when user misses both quarterfinals", () => {
		const matches = [
			// Quarterfinals - Finished
			{
				id: 1, // QF1: A vs B
				status: "finished",
				resultType: "normal",
				winnerId: teams.B.id, // B won (user bet on A)
				teamAId: teams.A.id,
				teamBId: teams.B.id,
				teamAPreviousMatchId: null,
				teamBPreviousMatchId: null,
				bracketSide: "upper",
				roundIndex: 0,
				label: "Quarter-Final #1",
			},
			{
				id: 2, // QF2: C vs D
				status: "finished",
				resultType: "normal",
				winnerId: teams.D.id, // D won (user bet on C)
				teamAId: teams.C.id,
				teamBId: teams.D.id,
				teamAPreviousMatchId: null,
				teamBPreviousMatchId: null,
				bracketSide: "upper",
				roundIndex: 0,
				label: "Quarter-Final #2",
			},
			// Semifinal - Still scheduled, teams already defined (B vs D)
			{
				id: 3, // SF1: B vs D
				status: "scheduled",
				resultType: "normal",
				winnerId: null,
				teamAId: teams.B.id, // B came from QF1
				teamBId: teams.D.id, // D came from QF2
				teamAPreviousMatchId: 1, // Depends on QF1
				teamBPreviousMatchId: 2, // Depends on QF2
				bracketSide: "upper",
				roundIndex: 1,
				label: "Semi-Final #1",
			},
		];

		const userBets = [
			{ matchId: 1, predictedWinnerId: teams.A.id }, // Wrong! Bet on A, B won
			{ matchId: 2, predictedWinnerId: teams.C.id }, // Wrong! Bet on C, D won
		];

		const dependencySet = buildRecoveryDependencySet(matches, userBets);

		// Semifinal (id 3) must be in dependencySet
		// because it depends on matches where user was wrong
		console.log("dependencySet:", Array.from(dependencySet));
		console.log("Expected: [3] (semifinal should be available for recovery)");

		expect(dependencySet.has(3)).toBeTrue();

		// Verify SF is available for recovery submission
		const sfMatch = matches.find((m) => m.id === 3);
		const isAllowed = isRecoverySubmissionAllowed({
			match: sfMatch,
			hasExistingBet: false,
			dependencyEligible: dependencySet.has(3),
		});

		console.log("isRecoverySubmissionAllowed:", isAllowed);
		console.log("Expected: true");

		expect(isAllowed).toBeTrue();
	});

	it("should allow recovery in final when user misses one semifinal", () => {
		const matches = [
			// Quarterfinals
			{
				id: 1,
				status: "finished",
				resultType: "normal",
				winnerId: teams.A.id,
				teamAId: teams.A.id,
				teamBId: teams.B.id,
				teamAPreviousMatchId: null,
				teamBPreviousMatchId: null,
				bracketSide: "upper",
				roundIndex: 0,
			},
			{
				id: 2,
				status: "finished",
				resultType: "normal",
				winnerId: teams.C.id,
				teamAId: teams.C.id,
				teamBId: teams.D.id,
				teamAPreviousMatchId: null,
				teamBPreviousMatchId: null,
				bracketSide: "upper",
				roundIndex: 0,
			},
			// Semi 1: A vs C - user was correct!
			{
				id: 3,
				status: "finished",
				resultType: "normal",
				winnerId: teams.A.id,
				teamAId: teams.A.id,
				teamBId: teams.C.id,
				teamAPreviousMatchId: 1,
				teamBPreviousMatchId: 2,
				bracketSide: "upper",
				roundIndex: 1,
			},
			// Semi 2: B vs D - user was wrong!
			{
				id: 4,
				status: "finished",
				resultType: "normal",
				winnerId: teams.D.id, // D won, but user bet on B
				teamAId: teams.B.id,
				teamBId: teams.D.id,
				teamAPreviousMatchId: null,
				teamBPreviousMatchId: null,
				bracketSide: "upper",
				roundIndex: 1,
			},
			// Final: A vs D
			{
				id: 5,
				status: "scheduled",
				resultType: "normal",
				winnerId: null,
				teamAId: teams.A.id,
				teamBId: teams.D.id,
				teamAPreviousMatchId: 3,
				teamBPreviousMatchId: 4,
				bracketSide: "upper",
				roundIndex: 2,
				label: "Final",
			},
		];

		const userBets = [
			{ matchId: 1, predictedWinnerId: teams.A.id }, // Correct
			{ matchId: 2, predictedWinnerId: teams.C.id }, // Correct
			{ matchId: 3, predictedWinnerId: teams.A.id }, // Correct
			{ matchId: 4, predictedWinnerId: teams.B.id }, // Wrong! Bet on B, D won
		];

		const dependencySet = buildRecoveryDependencySet(matches, userBets);

		console.log("dependencySet (final):", Array.from(dependencySet));
		console.log("Expected: [5] (final should be available for recovery)");

		// Final must be in dependencySet because it depends on Semi 2 where user was wrong
		expect(dependencySet.has(5)).toBeTrue();

		const finalMatch = matches.find((m) => m.id === 5);
		const isAllowed = isRecoverySubmissionAllowed({
			match: finalMatch,
			hasExistingBet: false,
			dependencyEligible: dependencySet.has(5),
		});

		expect(isAllowed).toBeTrue();
	});

	/**
	 * Additional scenario: User made NO bets in quarterfinals
	 * Should they be able to bet on semifinal as recovery?
	 */
	it("should allow recovery when user did not bet on quarterfinals", () => {
		const matches = [
			{
				id: 1,
				status: "finished",
				resultType: "normal",
				winnerId: teams.B.id,
				teamAId: teams.A.id,
				teamBId: teams.B.id,
				teamAPreviousMatchId: null,
				teamBPreviousMatchId: null,
				bracketSide: "upper",
				roundIndex: 0,
			},
			{
				id: 2,
				status: "finished",
				resultType: "normal",
				winnerId: teams.D.id,
				teamAId: teams.C.id,
				teamBId: teams.D.id,
				teamAPreviousMatchId: null,
				teamBPreviousMatchId: null,
				bracketSide: "upper",
				roundIndex: 0,
			},
			{
				id: 3,
				status: "scheduled",
				resultType: "normal",
				winnerId: null,
				teamAId: teams.B.id,
				teamBId: teams.D.id,
				teamAPreviousMatchId: 1,
				teamBPreviousMatchId: 2,
				bracketSide: "upper",
				roundIndex: 1,
				label: "Semi-Final #1",
			},
		];

		// User made NO bets in quarterfinals
		const userBets: { matchId: number; predictedWinnerId: number }[] = [];

		const dependencySet = buildRecoveryDependencySet(matches, userBets);

		console.log("dependencySet (no bets):", Array.from(dependencySet));

		// When there are no bets, it's considered "wrong" (lack of bet = error)
		// So the semifinal should be in dependencySet
		expect(dependencySet.size).toBe(1);
		expect(dependencySet.has(3)).toBeTrue();
	});
});
