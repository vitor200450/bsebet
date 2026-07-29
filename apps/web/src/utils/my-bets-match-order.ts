/** Match fields used to order cards on My Bets. */
export type MyBetsMatchOrderFields = {
	id: number;
	startTime: string | Date;
	roundIndex: number | null;
	displayOrder: number | null;
	bracketSide?: string | null;
};

type BetWithMatchOrder = {
	match: MyBetsMatchOrderFields;
};

/**
 * Groups and elim brackets both often use roundIndex 0 with restarted displayOrder.
 * Side must win first so groups never interleave with quarters/semis.
 */
function bracketSideRank(side: string | null | undefined): number {
	switch (side) {
		case "groups":
			return 0;
		case "upper":
		case "main":
			return 1;
		case "lower":
			return 2;
		case "grand_final":
			return 3;
		case "third_place":
			return 4;
		default:
			return 1;
	}
}

/**
 * Sort key for my-bets cards within a tournament.
 * Order: bracket side → round → displayOrder → startTime → id.
 */
export function compareMyBetsByMatchOrder(
	a: BetWithMatchOrder,
	b: BetWithMatchOrder,
): number {
	const aSide = bracketSideRank(a.match.bracketSide);
	const bSide = bracketSideRank(b.match.bracketSide);
	if (aSide !== bSide) return aSide - bSide;

	const aRound = a.match.roundIndex ?? 999;
	const bRound = b.match.roundIndex ?? 999;
	if (aRound !== bRound) return aRound - bRound;

	const aOrder = a.match.displayOrder;
	const bOrder = b.match.displayOrder;
	const aHasOrder = aOrder !== null && aOrder !== undefined;
	const bHasOrder = bOrder !== null && bOrder !== undefined;

	if (aHasOrder && bHasOrder && aOrder !== bOrder) {
		return aOrder - bOrder;
	}
	if (aHasOrder !== bHasOrder) {
		return aHasOrder ? -1 : 1;
	}

	const aTime = new Date(a.match.startTime).getTime();
	const bTime = new Date(b.match.startTime).getTime();
	if (aTime !== bTime) return aTime - bTime;

	return a.match.id - b.match.id;
}

export function sortMyBetsByMatchOrder<T extends BetWithMatchOrder>(
	bets: T[],
): T[] {
	return [...bets].sort(compareMyBetsByMatchOrder);
}
