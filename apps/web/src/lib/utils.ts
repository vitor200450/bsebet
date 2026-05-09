import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function deriveMatchFormat(
	stageId: string | null | undefined,
	stages:
		| Array<{ id: string; settings?: { matchType?: string } }>
		| null
		| undefined,
): "bo3" | "bo5" {
	if (!stageId || !stages) return "bo5";
	const stage = stages.find((s) => s.id === stageId);
	if (!stage?.settings?.matchType) return "bo5";
	if (stage.settings.matchType === "Bo3") return "bo3";
	return "bo5";
}
