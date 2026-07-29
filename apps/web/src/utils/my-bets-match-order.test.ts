import { describe, expect, test } from "bun:test";
import { sortMyBetsByMatchOrder } from "./my-bets-match-order";

/**
 * Bracket generators restart displayOrder per round (1,2,3… then again 1,2…).
 * Groups and elim often share roundIndex 0 with different bracketSide.
 */
describe("sortMyBetsByMatchOrder", () => {
	test("keeps group-stage matches before later-round matches when displayOrder restarts", () => {
		const bets = [
			{
				id: "semi",
				match: {
					id: 30,
					startTime: "2026-07-10T18:00:00.000Z",
					roundIndex: 2,
					displayOrder: 1,
					bracketSide: "main",
				},
			},
			{
				id: "group-b",
				match: {
					id: 12,
					startTime: "2026-07-08T16:00:00.000Z",
					roundIndex: 0,
					displayOrder: 2,
					bracketSide: "groups",
				},
			},
			{
				id: "group-a",
				match: {
					id: 11,
					startTime: "2026-07-08T14:00:00.000Z",
					roundIndex: 0,
					displayOrder: 1,
					bracketSide: "groups",
				},
			},
			{
				id: "quarters",
				match: {
					id: 20,
					startTime: "2026-07-09T18:00:00.000Z",
					roundIndex: 1,
					displayOrder: 1,
					bracketSide: "main",
				},
			},
		];

		const ordered = sortMyBetsByMatchOrder(bets).map((b) => b.id);

		expect(ordered).toEqual(["group-a", "group-b", "quarters", "semi"]);
	});

	test("does not interleave groups and quarters that share roundIndex 0", () => {
		// Real shape from BSC Brawl Cup: groups + main both roundIndex 0, displayOrder restarts.
		const bets = [
			{
				id: "qf-1",
				match: {
					id: 409,
					startTime: "2026-05-17T11:00:00.000Z",
					roundIndex: 0,
					displayOrder: 1,
					bracketSide: "main",
				},
			},
			{
				id: "group-b-1",
				match: {
					id: 400,
					startTime: "2026-05-15T14:00:00.000Z",
					roundIndex: 0,
					displayOrder: 101,
					bracketSide: "groups",
				},
			},
			{
				id: "group-a-1",
				match: {
					id: 397,
					startTime: "2026-05-15T11:00:00.000Z",
					roundIndex: 0,
					displayOrder: 1,
					bracketSide: "groups",
				},
			},
			{
				id: "qf-2",
				match: {
					id: 410,
					startTime: "2026-05-17T12:00:00.000Z",
					roundIndex: 0,
					displayOrder: 2,
					bracketSide: "main",
				},
			},
			{
				id: "group-a-2",
				match: {
					id: 398,
					startTime: "2026-05-15T12:00:00.000Z",
					roundIndex: 0,
					displayOrder: 2,
					bracketSide: "groups",
				},
			},
			{
				id: "semi-1",
				match: {
					id: 413,
					startTime: "2026-05-17T15:00:00.000Z",
					roundIndex: 1,
					displayOrder: 1,
					bracketSide: "main",
				},
			},
		];

		expect(sortMyBetsByMatchOrder(bets).map((b) => b.id)).toEqual([
			"group-a-1",
			"group-a-2",
			"group-b-1",
			"qf-1",
			"qf-2",
			"semi-1",
		]);
	});

	test("within the same round, uses displayOrder then startTime", () => {
		const bets = [
			{
				id: "later-order",
				match: {
					id: 2,
					startTime: "2026-07-08T12:00:00.000Z",
					roundIndex: 0,
					displayOrder: 2,
					bracketSide: "groups",
				},
			},
			{
				id: "earlier-order",
				match: {
					id: 1,
					startTime: "2026-07-08T18:00:00.000Z",
					roundIndex: 0,
					displayOrder: 1,
					bracketSide: "groups",
				},
			},
		];

		expect(sortMyBetsByMatchOrder(bets).map((b) => b.id)).toEqual([
			"earlier-order",
			"later-order",
		]);
	});
});
