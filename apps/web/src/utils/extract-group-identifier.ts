/**
 * Pulls the group identifier from labels like "Group A", "Grupo B",
 * or "Group A - Match 1". Returns null when no group token is found.
 */
export function extractGroupIdentifier(
	label: string | null | undefined,
): string | null {
	if (!label) return null;
	const match = label.trim().match(/^(?:group|grupo)\s+([A-Za-z0-9]+)/i);
	return match?.[1]?.toUpperCase() ?? null;
}
