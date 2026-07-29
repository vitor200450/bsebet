import type { TFunction } from "i18next";

type StageLike = {
	type?: string | null;
};

/**
 * Prefer the free-text `format` column; otherwise derive a label from
 * configured stage types (Groups / Swiss / Single / Double Elimination).
 */
export function resolveTournamentFormatLabel(
	format: string | null | undefined,
	stages: unknown,
	t: TFunction<"tournament">,
): string {
	const explicit = format?.trim();
	if (explicit) return explicit;

	const list = Array.isArray(stages) ? (stages as StageLike[]) : [];
	if (list.length === 0) return t("detail.formatTbd");

	const types = Array.from(
		new Set(
			list
				.map((stage) => stage.type)
				.filter((type): type is string => Boolean(type)),
		),
	);

	if (types.length === 0) return t("detail.formatTbd");

	const typeMap: Record<string, string> = {
		Groups: t("detail.stageGroups"),
		Swiss: t("detail.stageSwiss"),
		"Single Elimination": t("detail.stagePlayoffs"),
		"Double Elimination": t("detail.stagePlayoffsDouble"),
	};

	return types.map((type) => typeMap[type] || type).join(" + ");
}
