import { describe, expect, it } from "bun:test";
import { canEditExistingOpenBet } from "./bet-lock";

describe("canEditExistingOpenBet", () => {
	it("blocks edit when existing predicted winner is still in current matchup", () => {
		const allowed = canEditExistingOpenBet({
			existingPredictedWinnerId: 10,
			teamAId: 10,
			teamBId: 20,
		});

		expect(allowed).toBe(false);
	});

	it("allows edit when existing predicted winner is stale for current matchup", () => {
		const allowed = canEditExistingOpenBet({
			existingPredictedWinnerId: 99,
			teamAId: 10,
			teamBId: 20,
		});

		expect(allowed).toBe(true);
	});
});
