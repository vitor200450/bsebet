import { describe, expect, test } from "bun:test";
import type { Match, Prediction } from "@/components/bracket/types";
import {
	isTbdMatch,
	predictionsFromUserBets,
	pruneInvalidStoredPredictions,
} from "./prediction-persistence";

function emptyStats(regionA = "SA", regionB = "SA") {
	return {
		regionA,
		regionB,
		pointsA: 0,
		pointsB: 0,
		formA: "0-0",
		formB: "0-0",
		winRateA: "50%",
		winRateB: "50%",
		seedA: null,
		seedB: null,
		groupA: null,
		groupB: null,
		betCountA: 0,
		betCountB: 0,
		streakA: 0,
		streakB: 0,
	};
}

function makeMatch(
	id: number,
	teamA: Match["teamA"],
	teamB: Match["teamB"],
): Match {
	return {
		id,
		label: `Match ${id}`,
		format: "bo3",
		teamA,
		teamB,
		stats: emptyStats(),
		startTime: "2026-07-16T12:00:00.000Z",
	};
}

describe("prediction persistence for knockout bracket", () => {
	const qf = makeMatch(
		1,
		{ id: 101, name: "EA Team", color: "blue" },
		{ id: 102, name: "SA Team", color: "red" },
	);
	const sf = makeMatch(2, null, null);

	test("isTbdMatch detects semifinals without assigned teams", () => {
		expect(isTbdMatch(sf)).toBe(true);
		expect(isTbdMatch(qf)).toBe(false);
	});

	test("pruneInvalidStoredPredictions keeps TBD match picks after reload", () => {
		const stored: Record<number, Prediction> = {
			1: { winnerId: 101, score: "2-0" },
			2: { winnerId: 101, score: "2-1" },
		};

		const pruned = pruneInvalidStoredPredictions(stored, [qf, sf]);

		expect(pruned[1]).toEqual({ winnerId: 101, score: "2-0" });
		expect(pruned[2]).toEqual({ winnerId: 101, score: "2-1" });
	});

	test("pruneInvalidStoredPredictions still drops picks for swapped rosters", () => {
		const stored: Record<number, Prediction> = {
			1: { winnerId: 999, score: "2-0" },
		};

		const pruned = pruneInvalidStoredPredictions(stored, [qf]);

		expect(pruned[1]).toBeUndefined();
	});

	test("predictionsFromUserBets loads semifinal server bets on TBD matches", () => {
		const loaded = predictionsFromUserBets(
			[
				{
					matchId: 2,
					predictedWinnerId: 101,
					predictedScoreA: 2,
					predictedScoreB: 1,
				},
			],
			[qf, sf],
		);

		expect(loaded[2]).toEqual({ winnerId: 101, score: "2 - 1" });
	});
});
