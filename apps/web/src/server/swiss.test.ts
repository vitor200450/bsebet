import { describe, expect, it } from "bun:test";
import {
	buildSwissStandings,
	seedSwissPlayoff,
	selectPublicSwissMatches,
	suggestSwissRound,
	type SwissSettings,
} from "./swiss";

const settings: SwissSettings = {
	participantsCount: 8,
	winsToAdvance: 2,
	lossesToEliminate: 2,
	roundsMax: 3,
	matchType: "Bo3",
};

describe("swiss standings", () => {
	it("marks teams with two wins as qualified and two losses as eliminated", () => {
		const result = buildSwissStandings({
			settings,
			seeds: [1, 2, 3, 4],
			matches: [
				{ id: 1, teamAId: 1, teamBId: 2, winnerId: 1, status: "finished" },
				{ id: 2, teamAId: 1, teamBId: 3, winnerId: 1, status: "finished" },
				{ id: 3, teamAId: 2, teamBId: 4, winnerId: 4, status: "finished" },
				{ id: 4, teamAId: 2, teamBId: 3, winnerId: 3, status: "finished" },
			],
		});

		expect(result.byTeamId[1].status).toBe("qualified");
		expect(result.byTeamId[2].status).toBe("eliminated");
	});

	it("suggests next round within the same record buckets", () => {
		const pairings = suggestSwissRound({
			settings,
			seeds: [1, 2, 3, 4],
			matches: [
				{ id: 1, teamAId: 1, teamBId: 4, winnerId: 1, status: "finished" },
				{ id: 2, teamAId: 2, teamBId: 3, winnerId: 2, status: "finished" },
			],
		});

		expect(pairings.roundNumber).toBe(2);
		expect(pairings.matches[0].recordBucket).toBe("1-0");
		expect(pairings.matches[1].recordBucket).toBe("0-1");
	});

	it("avoids rematches when another valid bucket pairing exists", () => {
		const pairings = suggestSwissRound({
			settings,
			seeds: [1, 2, 3, 4],
			matches: [
				{ id: 1, teamAId: 1, teamBId: 2, winnerId: 1, status: "finished" },
				{ id: 2, teamAId: 3, teamBId: 4, winnerId: 3, status: "finished" },
			],
		});

		expect(pairings.matches).toEqual([
			{ teamAId: 1, teamBId: 3, recordBucket: "1-0" },
			{ teamAId: 2, teamBId: 4, recordBucket: "0-1" },
		]);
	});

	it("seeds the playoff with record first and seed as final tiebreaker", () => {
		const seeded = seedSwissPlayoff([
			{ teamId: 8, wins: 2, losses: 0, seed: 8 },
			{ teamId: 1, wins: 2, losses: 1, seed: 1 },
			{ teamId: 3, wins: 2, losses: 1, seed: 3 },
			{ teamId: 5, wins: 2, losses: 1, seed: 5 },
		]);

		expect(seeded[0].teamId).toBe(8);
		expect(seeded[1].teamId).toBe(1);
		expect(seeded[3].teamId).toBe(5);
	});

	it("builds playoff semifinals as seed 1 vs 4 and seed 2 vs 3", () => {
		const seeded = seedSwissPlayoff([
			{ teamId: 10, wins: 2, losses: 0, seed: 4 },
			{ teamId: 11, wins: 2, losses: 1, seed: 1 },
			{ teamId: 12, wins: 2, losses: 1, seed: 2 },
			{ teamId: 13, wins: 2, losses: 1, seed: 7 },
		]);

		expect([
			[seeded[0].teamId, seeded[3].teamId],
			[seeded[1].teamId, seeded[2].teamId],
		]).toEqual([
			[10, 13],
			[11, 12],
		]);
	});

	it("does not include draft swiss suggestions in public round output", () => {
		const visible = selectPublicSwissMatches([
			{
				id: 1,
				isBettingEnabled: false,
				matchDayStatus: "draft",
			},
			{
				id: 2,
				isBettingEnabled: true,
				matchDayStatus: "open",
			},
		]);

		expect(visible.map((match) => match.id)).toEqual([2]);
	});
});
