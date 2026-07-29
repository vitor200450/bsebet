import { describe, expect, test } from "bun:test";
import { resolveTournamentFormatLabel } from "./tournament-format";

const t = ((key: string) => {
	const map: Record<string, string> = {
		"detail.formatTbd": "Format TBD",
		"detail.stageGroups": "Group Stage",
		"detail.stageSwiss": "Swiss Stage",
		"detail.stagePlayoffs": "Playoffs",
		"detail.stagePlayoffsDouble": "Playoffs (Double)",
	};
	return map[key] ?? key;
}) as Parameters<typeof resolveTournamentFormatLabel>[2];

describe("resolveTournamentFormatLabel", () => {
	test("prefers explicit format text", () => {
		expect(resolveTournamentFormatLabel("Group Stage + Playoffs", [], t)).toBe(
			"Group Stage + Playoffs",
		);
	});

	test("derives label from stage types when format is null", () => {
		expect(
			resolveTournamentFormatLabel(
				null,
				[{ type: "Groups" }, { type: "Single Elimination" }],
				t,
			),
		).toBe("Group Stage + Playoffs");
	});

	test("falls back to TBD when nothing is configured", () => {
		expect(resolveTournamentFormatLabel(null, [], t)).toBe("Format TBD");
	});
});
