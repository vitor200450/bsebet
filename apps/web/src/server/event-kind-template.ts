import type {
	TournamentScoringRules,
	TournamentStage,
} from "@bsebet/db/schema";

export const PRESENTATION_THEMES = [
	"default",
	"qualifier",
	"monthly_finals",
	"major",
] as const;

export type PresentationTheme = (typeof PRESENTATION_THEMES)[number];

export const VENUE_MODES = ["online", "lan"] as const;
export type VenueMode = (typeof VENUE_MODES)[number];

export const DEFAULT_SCORING_RULES: TournamentScoringRules = {
	winner: 1,
	exact: 3,
	underdog_25: 2,
	underdog_50: 1,
	underdog_tier1_max_pct: 0.25,
	underdog_tier2_max_pct: 0.5,
};

export type EventKindTemplateSeed = {
	stages?: TournamentStage[] | null;
	scoringRules?: TournamentScoringRules | null;
};

function scoringRulesEqual(
	a: TournamentScoringRules,
	b: TournamentScoringRules,
): boolean {
	return (
		a.winner === b.winner &&
		a.exact === b.exact &&
		a.underdog_25 === b.underdog_25 &&
		a.underdog_50 === b.underdog_50 &&
		(a.underdog_tier1_max_pct ?? 0.25) === (b.underdog_tier1_max_pct ?? 0.25) &&
		(a.underdog_tier2_max_pct ?? 0.5) === (b.underdog_tier2_max_pct ?? 0.5)
	);
}

/**
 * One-shot seed on tournament create: fill empty stages / default scoring
 * from an Event Kind Template without overwriting admin edits already in the form.
 */
export function applyEventKindTemplate(
	input: {
		stages: TournamentStage[];
		scoringRules: TournamentScoringRules;
	},
	template: EventKindTemplateSeed | null | undefined,
): {
	stages: TournamentStage[];
	scoringRules: TournamentScoringRules;
} {
	if (!template) {
		return input;
	}

	const templateStages = template.stages ?? [];
	const hasTemplateStages = templateStages.length > 0;
	const hasTemplateScoring = template.scoringRules != null;

	const stages =
		input.stages.length > 0
			? input.stages
			: hasTemplateStages
				? structuredClone(templateStages)
				: input.stages;

	const scoringRules =
		hasTemplateScoring &&
		scoringRulesEqual(input.scoringRules, DEFAULT_SCORING_RULES)
			? structuredClone(template.scoringRules as TournamentScoringRules)
			: input.scoringRules;

	return { stages, scoringRules };
}

export function resolvePresentationTheme(
	eventKind:
		| { presentationTheme: PresentationTheme | string }
		| null
		| undefined,
): PresentationTheme {
	const theme = eventKind?.presentationTheme;
	if (
		theme === "qualifier" ||
		theme === "monthly_finals" ||
		theme === "major" ||
		theme === "default"
	) {
		return theme;
	}
	return "default";
}

export function canHardDeleteEventKind(referenceCount: number): boolean {
	return referenceCount === 0;
}
