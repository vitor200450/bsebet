import { describe, expect, it } from "bun:test";
import type { TournamentStage } from "@bsebet/db/schema";
import {
	applyEventKindTemplate,
	canHardDeleteEventKind,
	DEFAULT_SCORING_RULES,
	resolvePresentationTheme,
} from "./event-kind-template";

const monthlyFinalsStage: TournamentStage = {
	id: "mf-playoffs",
	name: "Playoffs",
	type: "Single Elimination",
	settings: {
		participantsCount: 8,
		matchType: "Bo5",
	},
};

const customScoring = {
	winner: 2,
	exact: 5,
	underdog_25: 3,
	underdog_50: 2,
	underdog_tier1_max_pct: 0.2,
	underdog_tier2_max_pct: 0.4,
};

describe("applyEventKindTemplate", () => {
	it("returns input unchanged when template is missing", () => {
		const input = {
			stages: [] as TournamentStage[],
			scoringRules: DEFAULT_SCORING_RULES,
		};

		expect(applyEventKindTemplate(input, null)).toEqual(input);
		expect(applyEventKindTemplate(input, undefined)).toEqual(input);
	});

	it("seeds empty stages and default scoring from template", () => {
		const result = applyEventKindTemplate(
			{ stages: [], scoringRules: { ...DEFAULT_SCORING_RULES } },
			{
				stages: [monthlyFinalsStage],
				scoringRules: customScoring,
			},
		);

		expect(result.stages).toEqual([monthlyFinalsStage]);
		expect(result.scoringRules).toEqual(customScoring);
	});

	it("does not overwrite non-empty stages or customized scoring", () => {
		const existingStage: TournamentStage = {
			id: "custom",
			name: "Groups",
			type: "Groups",
			settings: { groupsCount: 4, matchType: "Bo3" },
		};

		const result = applyEventKindTemplate(
			{
				stages: [existingStage],
				scoringRules: customScoring,
			},
			{
				stages: [monthlyFinalsStage],
				scoringRules: DEFAULT_SCORING_RULES,
			},
		);

		expect(result.stages).toEqual([existingStage]);
		expect(result.scoringRules).toEqual(customScoring);
	});

	it("no-ops when template stages and scoring are empty", () => {
		const input = {
			stages: [] as TournamentStage[],
			scoringRules: DEFAULT_SCORING_RULES,
		};

		expect(
			applyEventKindTemplate(input, { stages: [], scoringRules: null }),
		).toEqual(input);
	});
});

describe("resolvePresentationTheme", () => {
	it("returns default when event kind is absent", () => {
		expect(resolvePresentationTheme(null)).toBe("default");
		expect(resolvePresentationTheme(undefined)).toBe("default");
	});

	it("returns the kind theme when valid", () => {
		expect(
			resolvePresentationTheme({ presentationTheme: "monthly_finals" }),
		).toBe("monthly_finals");
		expect(resolvePresentationTheme({ presentationTheme: "major" })).toBe(
			"major",
		);
	});

	it("falls back to default for unknown theme strings", () => {
		expect(
			resolvePresentationTheme({ presentationTheme: "lan_spotlight" }),
		).toBe("default");
	});
});

describe("canHardDeleteEventKind", () => {
	it("allows hard delete only with zero references", () => {
		expect(canHardDeleteEventKind(0)).toBe(true);
		expect(canHardDeleteEventKind(1)).toBe(false);
	});
});
