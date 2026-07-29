import { describe, expect, it } from "bun:test";
import {
	canReturnToBetting,
	getSubmittableBetPayloads,
	isMatchPickEditable,
} from "./bet-submission";

describe("isMatchPickEditable", () => {
	it("blocks editing an already-submitted pick on an open match day", () => {
		const editable = isMatchPickEditable({
			matchDayStatus: "open",
			isReadOnly: false,
			matchStatus: "scheduled",
			serverBet: { predictedWinnerId: 101 },
			teamAId: 101,
			teamBId: 202,
		});

		expect(editable).toBe(false);
	});

	it("allows editing when the server bet is stale for the current matchup", () => {
		const editable = isMatchPickEditable({
			matchDayStatus: "open",
			isReadOnly: false,
			matchStatus: "scheduled",
			serverBet: { predictedWinnerId: 999 },
			teamAId: 101,
			teamBId: 202,
		});

		expect(editable).toBe(true);
	});
});

describe("getSubmittableBetPayloads", () => {
	it("does not resubmit locked picks on an open match day (review confirm spam)", () => {
		const matchIds = [595, 596, 597, 598, 599, 600, 601];
		const matches = matchIds.map((matchId) => ({
			matchId,
			matchStatus: "scheduled" as const,
			teamAId: matchId * 10,
			teamBId: matchId * 10 + 1,
		}));

		const userBets = matchIds.map((matchId) => ({
			matchId,
			predictedWinnerId: matchId * 10,
			predictedScoreA: 2,
			predictedScoreB: 0,
		}));

		const predictions = Object.fromEntries(
			matchIds.map((matchId) => [
				matchId,
				{
					winnerId: matchId * 10,
					score: "3 - 1",
				},
			]),
		);

		const payloads = getSubmittableBetPayloads({
			predictions,
			matches,
			userBets,
			matchDayStatus: "open",
		});

		expect(payloads).toHaveLength(0);
	});

	it("still submits a new pick on an open match day", () => {
		const payloads = getSubmittableBetPayloads({
			predictions: {
				10: { winnerId: 101, score: "2 - 0" },
			},
			matches: [
				{
					matchId: 10,
					matchStatus: "scheduled",
					teamAId: 101,
					teamBId: 202,
				},
			],
			userBets: [],
			matchDayStatus: "open",
		});

		expect(payloads).toEqual([
			{
				matchId: 10,
				predictedWinnerId: 101,
				predictedScoreA: 2,
				predictedScoreB: 0,
			},
		]);
	});
});

describe("canReturnToBetting", () => {
	it("returns false when every submitted pick is locked", () => {
		const canReturn = canReturnToBetting({
			hasUnbetEligibleMatches: false,
			editableRecoveryMatchIds: new Set(),
			matches: [
				{
					matchId: 595,
					matchStatus: "scheduled",
					teamAId: 5950,
					teamBId: 5951,
				},
			],
			userBets: [
				{
					matchId: 595,
					predictedWinnerId: 5950,
					predictedScoreA: 2,
					predictedScoreB: 0,
				},
			],
			matchDayStatus: "open",
			isReadOnly: false,
		});

		expect(canReturn).toBe(false);
	});

	it("returns true when there are still unbet eligible matches", () => {
		const canReturn = canReturnToBetting({
			hasUnbetEligibleMatches: true,
			editableRecoveryMatchIds: new Set(),
			matches: [],
			userBets: [],
			matchDayStatus: "open",
		});

		expect(canReturn).toBe(true);
	});
});
