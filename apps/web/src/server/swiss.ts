export interface SwissSettings {
	participantsCount: number;
	winsToAdvance: number;
	lossesToEliminate: number;
	roundsMax: number;
	matchType: "Bo1" | "Bo3" | "Bo5";
}

export function buildSwissStandings(input: {
	settings: SwissSettings;
	seeds: number[];
	matches: Array<{
		id: number;
		teamAId: number | null;
		teamBId: number | null;
		winnerId: number | null;
		status: string | null;
		roundIndex?: number;
	}>;
}) {
	const byTeamId: Record<
		number,
		{
			teamId: number;
			seed: number;
			wins: number;
			losses: number;
			record: string;
			status: "alive" | "qualified" | "eliminated";
		}
	> = {};

	for (const [index, teamId] of input.seeds.entries()) {
		byTeamId[teamId] = {
			teamId,
			seed: index + 1,
			wins: 0,
			losses: 0,
			record: "0-0",
			status: "alive",
		};
	}

	for (const match of input.matches) {
		if (
			match.status !== "finished" ||
			!match.winnerId ||
			!match.teamAId ||
			!match.teamBId
		) {
			continue;
		}

		const loserId =
			match.winnerId === match.teamAId ? match.teamBId : match.teamAId;
		byTeamId[match.winnerId].wins += 1;
		byTeamId[loserId].losses += 1;
	}

	for (const team of Object.values(byTeamId)) {
		team.record = `${team.wins}-${team.losses}`;
		team.status =
			team.wins >= input.settings.winsToAdvance
				? "qualified"
				: team.losses >= input.settings.lossesToEliminate
					? "eliminated"
					: "alive";
	}

	const ordered = Object.values(byTeamId).sort((a, b) => {
		if (b.wins !== a.wins) return b.wins - a.wins;
		if (a.losses !== b.losses) return a.losses - b.losses;
		return a.seed - b.seed;
	});

	return {
		byTeamId,
		ordered,
		qualified: ordered.filter((team) => team.status === "qualified"),
	};
}

export function suggestSwissRound(input: {
	settings: SwissSettings;
	seeds: number[];
	matches: Array<{
		id: number;
		teamAId: number | null;
		teamBId: number | null;
		winnerId: number | null;
		status: string | null;
		roundIndex?: number;
	}>;
}) {
	const standings = buildSwissStandings(input);
	const previousOpponents = new Set(
		input.matches
			.filter((match) => match.teamAId && match.teamBId)
			.map(
				(match) =>
					`${Math.min(match.teamAId!, match.teamBId!)}:${Math.max(match.teamAId!, match.teamBId!)}`,
			),
	);
	const aliveTeams = standings.ordered.filter(
		(team) => team.status === "alive",
	);
	const bucketMap = new Map<string, typeof aliveTeams>();

	for (const team of aliveTeams) {
		const bucket = `${team.wins}-${team.losses}`;
		const teams = bucketMap.get(bucket) ?? [];
		teams.push(team);
		bucketMap.set(bucket, teams);
	}

	const matches: Array<{
		teamAId: number;
		teamBId: number;
		recordBucket: string;
	}> = [];
	for (const [recordBucket, teams] of bucketMap.entries()) {
		const queue = [...teams];
		while (queue.length >= 2) {
			const teamA = queue.shift()!;
			const nextIndex = queue.findIndex((teamB) => {
				const key = `${Math.min(teamA.teamId, teamB.teamId)}:${Math.max(teamA.teamId, teamB.teamId)}`;
				return !previousOpponents.has(key);
			});
			const teamB =
				nextIndex >= 0 ? queue.splice(nextIndex, 1)[0] : queue.shift()!;
			matches.push({
				teamAId: teamA.teamId,
				teamBId: teamB.teamId,
				recordBucket,
			});
		}
	}

	const playedRounds = input.matches.reduce(
		(maxRound, match: any) =>
			Math.max(maxRound, (match.roundIndex ?? 0) + 1),
		0,
	);
	return { roundNumber: playedRounds + 1, matches };
}

export function seedSwissPlayoff(
	qualifiedTeams: Array<{
		teamId: number;
		wins: number;
		losses: number;
		seed: number;
	}>,
) {
	return [...qualifiedTeams].sort((a, b) => {
		if (b.wins !== a.wins) return b.wins - a.wins;
		if (a.losses !== b.losses) return a.losses - b.losses;
		return a.seed - b.seed;
	});
}

export function selectPublicSwissMatches<
	T extends {
		id: number;
		isBettingEnabled?: boolean | null;
		matchDayStatus?: string | null;
	},
>(matches: T[]): T[] {
	return matches.filter(
		(match) =>
			match.isBettingEnabled !== false && match.matchDayStatus !== "draft",
	);
}
