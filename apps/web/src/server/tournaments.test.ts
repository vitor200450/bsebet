import { describe, expect, it } from "bun:test";
import { saveTournamentStageSchema } from "./tournaments";

describe("tournament swiss stage validation", () => {
	it("accepts Swiss stage settings", () => {
		const parsed = saveTournamentStageSchema.parse({
			id: "swiss-1",
			name: "Swiss Stage",
			type: "Swiss",
			settings: {
				participantsCount: 8,
				winsToAdvance: 2,
				lossesToEliminate: 2,
				roundsMax: 3,
				matchType: "Bo3",
			},
		});

		expect(parsed.type).toBe("Swiss");
		expect(parsed.settings.winsToAdvance).toBe(2);
	});
});
