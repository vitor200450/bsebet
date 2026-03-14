export type RecoveryMatchNode = {
	id: number;
	status: "scheduled" | "live" | "finished" | string | null;
	resultType?: "normal" | "wo" | string | null;
	winnerId?: number | null;
	teamAId?: number | null;
	teamBId?: number | null;
	teamAPreviousMatchId?: number | null;
	teamBPreviousMatchId?: number | null;
	roundIndex?: number | null;
	bracketSide?: string | null;
	label?: string | null;
};

export type RecoveryBetNode = {
	matchId: number;
	predictedWinnerId?: number | null;
};

export function isBracketMatchLike(match: {
	teamAPreviousMatchId?: number | null;
	teamBPreviousMatchId?: number | null;
	roundIndex?: number | null;
	bracketSide?: string | null;
	label?: string | null;
}): boolean {
	if (match.teamAPreviousMatchId || match.teamBPreviousMatchId) return true;
	if ((match.roundIndex ?? 0) >= 100) return true;
	if (match.bracketSide !== null && match.bracketSide !== undefined)
		return true;

	const label = (match.label ?? "").toLowerCase();
	if (!label) return false;

	return (
		label.includes("sf") ||
		label.includes("semi") ||
		label.includes("final") ||
		label.includes("quart") ||
		label.includes("playoff")
	);
}

function buildUserBetMap(
	userBets: RecoveryBetNode[],
): Map<number, RecoveryBetNode> {
	const map = new Map<number, RecoveryBetNode>();
	for (const bet of userBets) {
		map.set(Number(bet.matchId), bet);
	}
	return map;
}

function buildDependentsMap(
	matches: RecoveryMatchNode[],
): Map<number, number[]> {
	const dependentsMap = new Map<number, number[]>();

	for (const match of matches) {
		const currentId = Number(match.id);
		const parentA = match.teamAPreviousMatchId
			? Number(match.teamAPreviousMatchId)
			: null;
		const parentB = match.teamBPreviousMatchId
			? Number(match.teamBPreviousMatchId)
			: null;

		if (parentA) {
			if (!dependentsMap.has(parentA)) dependentsMap.set(parentA, []);
			dependentsMap.get(parentA)?.push(currentId);
		}

		if (parentB) {
			if (!dependentsMap.has(parentB)) dependentsMap.set(parentB, []);
			dependentsMap.get(parentB)?.push(currentId);
		}
	}

	return dependentsMap;
}

export function buildRecoveryDependencySet(
	matches: RecoveryMatchNode[],
	userBets: RecoveryBetNode[],
): Set<number> {
	const userBetMap = buildUserBetMap(userBets);
	const wrongSourceIds = new Set<number>();

	for (const match of matches) {
		if (match.status !== "finished") continue;
		if (match.resultType === "wo") continue;
		if (!match.winnerId) continue;

		const matchId = Number(match.id);
		const bet = userBetMap.get(matchId);

		if (!bet || Number(bet.predictedWinnerId) !== Number(match.winnerId)) {
			wrongSourceIds.add(matchId);
		}
	}

	if (wrongSourceIds.size === 0) {
		return new Set<number>();
	}

	const dependentsMap = buildDependentsMap(matches);
	const dependentIds = new Set<number>();
	const queue = Array.from(wrongSourceIds);

	while (queue.length > 0) {
		const parentId = Number(queue.shift());
		const children = dependentsMap.get(parentId) ?? [];

		for (const childId of children) {
			if (dependentIds.has(childId)) continue;
			dependentIds.add(childId);
			queue.push(childId);
		}
	}

	return dependentIds;
}

export function isRecoverySubmissionAllowed(params: {
	match: RecoveryMatchNode;
	hasExistingBet: boolean;
	dependencyEligible: boolean;
}): boolean {
	const { match, hasExistingBet, dependencyEligible } = params;

	if (match.status !== "scheduled") return false;
	if (match.resultType === "wo") return false;
	if (match.winnerId) return false;

	const hasBothTeams = Boolean(match.teamAId && match.teamBId);
	if (!hasBothTeams) return false;

	if (hasExistingBet) return true;

	return dependencyEligible || isBracketMatchLike(match);
}
