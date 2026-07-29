/** Carousel / picker display format: "3 - 1" */
export function formatScoreDisplay(scoreA: number, scoreB: number): string {
	return `${scoreA} - ${scoreB}`;
}

/** Normalize "3-1", "3 - 1", "W-FF" → "3 - 1", "W - FF" */
export function normalizeScoreDisplay(raw: string): string {
	return raw.trim().replace(/\s*-\s*/g, " - ");
}

export function scoresEqual(
	a: string | null | undefined,
	b: string | null | undefined,
): boolean {
	if (!a || !b) return a === b;
	return normalizeScoreDisplay(a) === normalizeScoreDisplay(b);
}
