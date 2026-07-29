export function syncExpandedTournamentIds(
	prev: Set<number>,
	visibleTournamentIds: number[],
): Set<number> {
	const visibleIds = new Set(visibleTournamentIds);
	const next = new Set(Array.from(prev).filter((id) => visibleIds.has(id)));

	if (next.size === 0 && visibleTournamentIds.length > 0) {
		next.add(visibleTournamentIds[0]!);
	}

	if (prev.size === next.size && Array.from(prev).every((id) => next.has(id))) {
		return prev;
	}

	return next;
}
