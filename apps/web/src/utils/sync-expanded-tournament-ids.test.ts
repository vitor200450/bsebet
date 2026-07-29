import { describe, expect, test } from "bun:test";
import { syncExpandedTournamentIds } from "./sync-expanded-tournament-ids";

describe("syncExpandedTournamentIds", () => {
	test("returns the same Set reference when visible ids are unchanged", () => {
		const prev = new Set([1, 2]);
		const result = syncExpandedTournamentIds(prev, [1, 2, 3]);
		expect(result).toBe(prev);
	});

	test("drops ids that are no longer visible", () => {
		const prev = new Set([1, 2, 99]);
		const result = syncExpandedTournamentIds(prev, [1, 2]);
		expect(Array.from(result)).toEqual([1, 2]);
		expect(result).not.toBe(prev);
	});

	test("expands the first visible tournament when none remain expanded", () => {
		const prev = new Set<number>();
		const result = syncExpandedTournamentIds(prev, [10, 20]);
		expect(Array.from(result)).toEqual([10]);
	});
});
