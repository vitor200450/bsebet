import { createServerFn } from "@tanstack/react-start";
import { eq, inArray, sql } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";

export const getMyBets = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		const { db, bets, matches } = await import("@bsebet/db");

		const userId = context.session?.user?.id;
		if (!userId) {
			return { stats: null, betsByTournament: [] };
		}

		// 1. Stats aggregation (same as dashboard)
		const totalBetsResult = await db
			.select({
				count: sql<number>`count(*)`,
				totalPoints: sql<number>`COALESCE(SUM(${bets.pointsEarned}), 0)`,
				correctCount: sql<number>`count(*) FILTER (WHERE ${bets.pointsEarned} > 0)`,
				perfectCount: sql<number>`count(*) FILTER (WHERE ${bets.isPerfectPick} = true)`,
				underdogCount: sql<number>`count(*) FILTER (WHERE ${bets.isUnderdogPick} = true AND ${bets.pointsEarned} > 0)`,
			})
			.from(bets)
			.where(eq(bets.userId, userId));

		const pendingBetsResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(bets)
			.innerJoin(matches, eq(bets.matchId, matches.id))
			.where(
				sql`${bets.userId} = ${userId} AND ${matches.status} IN ('scheduled', 'live')`,
			);

		const data = totalBetsResult[0];
		const stats = {
			totalBets: Number(data?.count) || 0,
			totalPoints: Number(data?.totalPoints) || 0,
			correctPredictions: Number(data?.correctCount) || 0,
			perfectPicks: Number(data?.perfectCount) || 0,
			underdogWins: Number(data?.underdogCount) || 0,
			accuracy:
				Number(data?.count) > 0
					? Math.round((Number(data?.correctCount) / Number(data?.count)) * 100)
					: 0,
			pendingBets: Number(pendingBetsResult[0]?.count) || 0,
		};

		// 2. Get user bets (lean — only IDs and scores)
		const rawUserBets = await db.query.bets.findMany({
			where: eq(bets.userId, userId),
			columns: {
				id: true,
				matchId: true,
				predictedWinnerId: true,
				predictedScoreA: true,
				predictedScoreB: true,
				pointsEarned: true,
				isPerfectPick: true,
				isUnderdogPick: true,
				isRecovery: true,
				createdAt: true,
			},
			orderBy: (bets, { desc }) => [desc(bets.createdAt)],
		});

		if (rawUserBets.length === 0) {
			return { stats, betsByTournament: [] };
		}

		// Get all matches for those bets (lean columns)
		const betMatchIds = rawUserBets.map((b) => b.matchId);
		const betMatchesRaw = await db.query.matches.findMany({
			where: inArray(matches.id, betMatchIds),
			columns: {
				id: true,
				tournamentId: true,
				teamAId: true,
				teamBId: true,
				labelTeamA: true,
				labelTeamB: true,
				startTime: true,
				status: true,
				winnerId: true,
				scoreA: true,
				scoreB: true,
				roundIndex: true,
				bracketSide: true,
				displayOrder: true,
				nextMatchWinnerId: true,
				nextMatchWinnerSlot: true,
				nextMatchLoserId: true,
				nextMatchLoserSlot: true,
				teamAPreviousMatchId: true,
				teamAPreviousMatchResult: true,
				teamBPreviousMatchId: true,
				teamBPreviousMatchResult: true,
				isBettingEnabled: true,
			},
		});

		// Get tournament IDs where user has bets
		const tournamentIds = [
			...new Set(betMatchesRaw.map((m) => m.tournamentId).filter(Boolean)),
		] as number[];

		// Get ALL matches from those tournaments for winner projection (lean)
		const allTournamentMatchesRaw =
			tournamentIds.length > 0
				? await db.query.matches.findMany({
						where: inArray(matches.tournamentId, tournamentIds),
						columns: {
							id: true,
							tournamentId: true,
							teamAId: true,
							teamBId: true,
							labelTeamA: true,
							labelTeamB: true,
							startTime: true,
							status: true,
							winnerId: true,
							scoreA: true,
							scoreB: true,
							roundIndex: true,
							bracketSide: true,
							displayOrder: true,
							nextMatchWinnerId: true,
							nextMatchWinnerSlot: true,
							nextMatchLoserId: true,
							nextMatchLoserSlot: true,
							teamAPreviousMatchId: true,
							teamAPreviousMatchResult: true,
							teamBPreviousMatchId: true,
							teamBPreviousMatchResult: true,
							isBettingEnabled: true,
						},
					})
				: [];

		// Collect all team IDs needed
		const allTeamIds = new Set<number>();
		[...betMatchesRaw, ...allTournamentMatchesRaw].forEach((m) => {
			if (m.teamAId) allTeamIds.add(m.teamAId);
			if (m.teamBId) allTeamIds.add(m.teamBId);
			if (m.winnerId) allTeamIds.add(m.winnerId);
		});
		rawUserBets.forEach((b) => {
			if (b.predictedWinnerId) allTeamIds.add(b.predictedWinnerId);
		});

		const { teams, tournaments } = await import("@bsebet/db/schema");

		const [teamsData, tournamentsData] = await Promise.all([
			allTeamIds.size > 0
				? db.query.teams.findMany({
						where: inArray(teams.id, Array.from(allTeamIds)),
						columns: {
							id: true,
							name: true,
							slug: true,
							logoUrl: true,
							region: true,
							createdAt: true,
						},
					})
				: [],
			tournamentIds.length > 0
				? db.query.tournaments.findMany({
						where: inArray(tournaments.id, tournamentIds),
						columns: { id: true, name: true, slug: true, logoUrl: true },
					})
				: [],
		]);

		const teamsMap = new Map(teamsData.map((t) => [t.id, t]));
		const tournamentsMap = new Map(tournamentsData.map((t) => [t.id, t]));

		// Assemble full match objects in memory
		const assembleMatch = (m: (typeof allTournamentMatchesRaw)[number]) => ({
			...m,
			teamA: m.teamAId ? (teamsMap.get(m.teamAId) ?? null) : null,
			teamB: m.teamBId ? (teamsMap.get(m.teamBId) ?? null) : null,
			winner: m.winnerId ? (teamsMap.get(m.winnerId) ?? null) : null,
			tournament: m.tournamentId
				? (tournamentsMap.get(m.tournamentId) ?? null)
				: null,
		});

		const allTournamentMatches = allTournamentMatchesRaw.map(assembleMatch);
		const userBets = rawUserBets.map((bet) => ({
			...bet,
			userId,
			match: assembleMatch(
				betMatchesRaw.find((m) => m.id === bet.matchId) ??
					allTournamentMatchesRaw.find((m) => m.id === bet.matchId)!,
			),
			predictedWinner: bet.predictedWinnerId
				? (teamsMap.get(bet.predictedWinnerId) ?? null)
				: null,
		}));

		// Create a map of all matches for lookup
		const allMatchesMap = new Map(allTournamentMatches.map((m) => [m.id, m]));

		// Create a map of match results: use REAL winner for finished matches, predicted for others
		const matchResults = new Map<
			number,
			(typeof allTournamentMatches)[0]["winner"]
		>();

		for (const match of allTournamentMatches) {
			if (match.status === "finished" && match.winner) {
				// Use real result for finished matches
				matchResults.set(match.id, match.winner);
			} else {
				// Use user's prediction for non-finished matches
				const userBet = userBets.find((b) => b.matchId === match.id);
				if (userBet?.predictedWinner) {
					matchResults.set(match.id, userBet.predictedWinner);
				}
			}
		}

		// 3. PROJECT WINNERS FORWARD
		// Build a map of which matches feed into which slots
		const matchFeedsInto = new Map<
			number,
			Array<{ targetId: number; slot: "A" | "B" }>
		>();

		for (const match of allTournamentMatches) {
			if (match.teamAPreviousMatchId) {
				const feeds = matchFeedsInto.get(match.teamAPreviousMatchId) || [];
				feeds.push({ targetId: match.id, slot: "A" });
				matchFeedsInto.set(match.teamAPreviousMatchId, feeds);
			}
			if (match.teamBPreviousMatchId) {
				const feeds = matchFeedsInto.get(match.teamBPreviousMatchId) || [];
				feeds.push({ targetId: match.id, slot: "B" });
				matchFeedsInto.set(match.teamBPreviousMatchId, feeds);
			}
		}

		// Project winners (real results first, then predictions)
		for (const [matchId, winner] of matchResults) {
			if (!winner) continue;

			const targets = matchFeedsInto.get(matchId);
			if (!targets || targets.length === 0) continue;

			for (const target of targets) {
				const targetMatch = allMatchesMap.get(target.targetId);
				if (!targetMatch) continue;

				// Project the winner
				if (target.slot === "A") {
					targetMatch.teamA = winner;
				} else {
					targetMatch.teamB = winner;
				}
			}
		}

		// 4. Group by tournament
		type BetWithRelations = (typeof userBets)[number];
		type TournamentGroup = {
			tournament: {
				id: number;
				name: string;
				slug: string;
				logoUrl: string | null;
			};
			bets: BetWithRelations[];
		};

		// Update bets with projected matches
		const betsWithProjection = userBets.map((bet) => ({
			...bet,
			match: allMatchesMap.get(bet.matchId) || bet.match,
		}));

		// 5. Find all projected future matches that user hasn't bet on yet
		// These are matches where at least one team was projected from user's predictions
		const userMatchIds = new Set(userBets.map((b) => b.matchId));
		const projectedFutureMatches: typeof allTournamentMatches = [];

		for (const match of allTournamentMatches) {
			// Skip matches user already bet on
			if (userMatchIds.has(match.id)) continue;

			// Check if this match has any team projected from user's predictions
			// A team is "projected" if it came from a previous match where user made a prediction
			let hasProjectedTeam = false;

			// Check slot A
			if (match.teamAPreviousMatchId) {
				const prevMatchResult = matchResults.get(match.teamAPreviousMatchId);
				if (prevMatchResult && match.teamA?.id === prevMatchResult.id) {
					hasProjectedTeam = true;
				}
			}

			// Check slot B
			if (match.teamBPreviousMatchId) {
				const prevMatchResult = matchResults.get(match.teamBPreviousMatchId);
				if (prevMatchResult && match.teamB?.id === prevMatchResult.id) {
					hasProjectedTeam = true;
				}
			}

			if (hasProjectedTeam) {
				projectedFutureMatches.push(match);
			}
		}

		// Create synthetic bets for projected future matches
		const syntheticBets = projectedFutureMatches.map((match) => ({
			id: -match.id, // Negative ID to indicate synthetic bet
			userId,
			matchId: match.id,
			predictedWinnerId: null,
			predictedScoreA: 0,
			predictedScoreB: 0,
			pointsEarned: null,
			isPerfectPick: null,
			isUnderdogPick: null,
			createdAt: new Date(),
			match,
			predictedWinner: null,
		}));

		// Combine real bets with synthetic projected bets
		const allBets = [...betsWithProjection, ...syntheticBets];

		// Regroup by tournament
		const tournamentMapProjected = new Map<number, TournamentGroup>();
		for (const bet of allBets) {
			const t = bet.match.tournament;
			if (!t) continue;
			if (!tournamentMapProjected.has(t.id)) {
				tournamentMapProjected.set(t.id, {
					tournament: {
						id: t.id,
						name: t.name,
						slug: t.slug,
						logoUrl: t.logoUrl,
					},
					bets: [],
				});
			}
			tournamentMapProjected.get(t.id)!.bets.push(bet as any);
		}

		const betsByTournament = Array.from(tournamentMapProjected.values());

		return { stats, betsByTournament };
	});
