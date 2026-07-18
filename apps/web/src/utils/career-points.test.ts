import { describe, expect, it } from "bun:test";
import {
	filterMedalsForGlobalTiebreaker,
	summarizeMedalPlacements,
} from "./career-points";

describe("filterMedalsForGlobalTiebreaker", () => {
	const medals = [
		{ tournamentId: 1, placement: 1 as const },
		{ tournamentId: 2, placement: 2 as const },
		{ tournamentId: 3, placement: 3 as const },
	];

	it("excludes the current tournament from tiebreaker medals", () => {
		const filtered = filterMedalsForGlobalTiebreaker(medals, {
			excludeTournamentId: 2,
		});

		expect(filtered.map((medal) => medal.tournamentId)).toEqual([1, 3]);
	});

	it("excludes medals from tournaments that do not count toward global", () => {
		const filtered = filterMedalsForGlobalTiebreaker(medals, {
			nonGlobalTournamentIds: new Set([1, 3]),
		});

		expect(filtered.map((medal) => medal.tournamentId)).toEqual([2]);
	});

	it("applies both exclusion rules together", () => {
		const filtered = filterMedalsForGlobalTiebreaker(medals, {
			excludeTournamentId: 2,
			nonGlobalTournamentIds: new Set([1]),
		});

		expect(filtered.map((medal) => medal.tournamentId)).toEqual([3]);
	});
});

describe("summarizeMedalPlacements", () => {
	it("counts medal tiers from filtered medals", () => {
		const summary = summarizeMedalPlacements([
			{ tournamentId: 1, placement: 1 },
			{ tournamentId: 2, placement: 1 },
			{ tournamentId: 3, placement: 3 },
		]);

		expect(summary).toEqual({
			gold: 2,
			silver: 0,
			bronze: 1,
			total: 3,
		});
	});
});
