import { createServerFn } from "@tanstack/react-start";
import { eq, inArray, sql } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";
import type { BetStats } from "@/server/bets";
import { careerBetsUserFilter, careerStatsSelect } from "@/utils/career-points";
import { compareMyBetsByMatchOrder } from "@/utils/my-bets-match-order";

export const getMyBets = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		const { db, bets, matches, tournaments } = await import("@bsebet/db");

		const userId = context.session?.user?.id;
		if (!userId) {
			return { stats: null, betsByTournament: [] };
		}

		// 1. Career stats aggregation (same as dashboard)
		const totalBetsResult = await db
			.select(careerStatsSelect)
			.from(bets)
			.innerJoin(matches, eq(bets.matchId, matches.id))
			.innerJoin(tournaments, eq(matches.tournamentId, tournaments.id))
			.where(careerBetsUserFilter(userId));

		const pendingBetsResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(bets)
			.innerJoin(matches, eq(bets.matchId, matches.id))
			.where(
				sql`${bets.userId} = ${userId} AND ${matches.status} IN ('scheduled', 'live')`,
			);

		const data = totalBetsResult[0];
		const stats = {
			totalBets: Number(data?.totalBets) || 0,
			totalPoints: Number(data?.totalPoints) || 0,
			correctPredictions: Number(data?.correctPredictions) || 0,
			perfectPicks: Number(data?.perfectPicks) || 0,
			underdogWins: Number(data?.underdogWins) || 0,
			accuracy:
				Number(data?.totalBets) > 0
					? Math.round(
							(Number(data?.correctPredictions) / Number(data?.totalBets)) *
								100,
						)
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
				label: true,
				name: true,
				labelTeamA: true,
				labelTeamB: true,
				startTime: true,
				status: true,
				resultType: true,
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
							label: true,
							name: true,
							labelTeamA: true,
							labelTeamB: true,
							startTime: true,
							status: true,
							resultType: true,
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

		const { teams } = await import("@bsebet/db/schema");

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

		// Create a map of match outcomes: use REAL winner for finished matches, predicted for others.
		// This is needed because downstream slots can request either "winner" or "loser".
		type MatchTeam = (typeof allTournamentMatches)[0]["winner"];
		const matchOutcomes = new Map<
			number,
			{ winner: MatchTeam; loser: MatchTeam }
		>();

		for (const match of allTournamentMatches) {
			let winner: MatchTeam = null;

			if (match.status === "finished" && match.winner) {
				winner = match.winner;
			} else {
				const userBet = userBets.find((b) => b.matchId === match.id);
				winner = userBet?.predictedWinner ?? null;
			}

			let loser: MatchTeam = null;
			if (winner && match.teamA && match.teamB) {
				loser = match.teamA.id === winner.id ? match.teamB : match.teamA;
			}

			matchOutcomes.set(match.id, { winner, loser });
		}

		// 3. PROJECT WINNERS FORWARD
		// Build a map of which matches feed into which slots
		const matchFeedsInto = new Map<
			number,
			Array<{
				targetId: number;
				slot: "A" | "B";
				requiredResult: "winner" | "loser";
			}>
		>();

		for (const match of allTournamentMatches) {
			if (match.teamAPreviousMatchId) {
				const feeds = matchFeedsInto.get(match.teamAPreviousMatchId) || [];
				feeds.push({
					targetId: match.id,
					slot: "A",
					requiredResult:
						match.teamAPreviousMatchResult === "loser" ? "loser" : "winner",
				});
				matchFeedsInto.set(match.teamAPreviousMatchId, feeds);
			}
			if (match.teamBPreviousMatchId) {
				const feeds = matchFeedsInto.get(match.teamBPreviousMatchId) || [];
				feeds.push({
					targetId: match.id,
					slot: "B",
					requiredResult:
						match.teamBPreviousMatchResult === "loser" ? "loser" : "winner",
				});
				matchFeedsInto.set(match.teamBPreviousMatchId, feeds);
			}
		}

		// Project outcomes (winner/loser) forward based on each slot rule.
		for (const [matchId, outcome] of matchOutcomes) {
			const targets = matchFeedsInto.get(matchId);
			if (!targets || targets.length === 0) continue;

			for (const target of targets) {
				const targetMatch = allMatchesMap.get(target.targetId);
				if (!targetMatch) continue;
				const projectedTeam =
					target.requiredResult === "loser" ? outcome.loser : outcome.winner;
				if (!projectedTeam) continue;

				// Project to the correct slot.
				if (target.slot === "A") {
					targetMatch.teamA = projectedTeam;
				} else {
					targetMatch.teamB = projectedTeam;
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

		// Batch-fetch community bet stats for all real bet matchIds (not synthetics)
		const realBetMatchIds = rawUserBets.map((b) => b.matchId);
		const betStatsMap = new Map<number, BetStats>();

		if (realBetMatchIds.length > 0) {
			try {
				const { bets: betsTable } = await import("@bsebet/db/schema");
				const allBetCounts = await db
					.select({
						matchId: betsTable.matchId,
						predictedWinnerId: betsTable.predictedWinnerId,
						count: sql<number>`count(*)::int`,
					})
					.from(betsTable)
					.where(inArray(betsTable.matchId, realBetMatchIds))
					.groupBy(betsTable.matchId, betsTable.predictedWinnerId);

				const countsByMatch = new Map<
					number,
					{ teamACount: number; teamBCount: number }
				>();

				for (const row of allBetCounts) {
					if (!row.matchId) continue;
					const matchRaw = betMatchesRaw.find((m) => m.id === row.matchId);
					if (!matchRaw) continue;

					if (!countsByMatch.has(row.matchId)) {
						countsByMatch.set(row.matchId, { teamACount: 0, teamBCount: 0 });
					}
					const entry = countsByMatch.get(row.matchId)!;
					if (row.predictedWinnerId === matchRaw.teamAId) {
						entry.teamACount = row.count;
					} else if (row.predictedWinnerId === matchRaw.teamBId) {
						entry.teamBCount = row.count;
					}
				}

				for (const matchRaw of betMatchesRaw) {
					const counts = countsByMatch.get(matchRaw.id) ?? {
						teamACount: 0,
						teamBCount: 0,
					};
					const totalCount = counts.teamACount + counts.teamBCount;
					const teamAPercent =
						totalCount > 0
							? Math.round((counts.teamACount / totalCount) * 100)
							: 0;
					betStatsMap.set(matchRaw.id, {
						teamAId: matchRaw.teamAId ?? null,
						teamBId: matchRaw.teamBId ?? null,
						teamACount: counts.teamACount,
						teamBCount: counts.teamBCount,
						teamAPercent,
						teamBPercent: totalCount > 0 ? 100 - teamAPercent : 0,
						totalCount,
					});
				}
			} catch (e) {
				console.error("[getMyBets] Failed to fetch bet stats", e);
			}
		}

		// Update bets with projected matches and attach betStats
		const betsWithProjection = userBets.map((bet) => ({
			...bet,
			match: allMatchesMap.get(bet.matchId) || bet.match,
			betStats: betStatsMap.get(bet.matchId),
		}));

		// 5. Synthetic cards for matches the user did not lock a pick on:
		// - future/live path projections from their bracket picks
		// - finished matches in their tournaments with no bet (skipped or wrong path)
		const userMatchIds = new Set(userBets.map((b) => b.matchId));
		const syntheticMatchIds = new Set<number>();
		const syntheticMatches: typeof allTournamentMatches = [];

		const pushSynthetic = (match: (typeof allTournamentMatches)[number]) => {
			if (userMatchIds.has(match.id) || syntheticMatchIds.has(match.id)) return;
			if (!match.teamA?.id || !match.teamB?.id) return;
			syntheticMatchIds.add(match.id);
			syntheticMatches.push(match);
		};

		for (const match of allTournamentMatches) {
			if (userMatchIds.has(match.id)) continue;

			let hasProjectedTeam = false;

			if (match.teamAPreviousMatchId) {
				const prevOutcome = matchOutcomes.get(match.teamAPreviousMatchId);
				const requiredResult =
					match.teamAPreviousMatchResult === "loser" ? "loser" : "winner";
				const projectedTeam =
					requiredResult === "loser" ? prevOutcome?.loser : prevOutcome?.winner;
				if (projectedTeam && match.teamA?.id === projectedTeam.id) {
					hasProjectedTeam = true;
				}
			}

			if (match.teamBPreviousMatchId) {
				const prevOutcome = matchOutcomes.get(match.teamBPreviousMatchId);
				const requiredResult =
					match.teamBPreviousMatchResult === "loser" ? "loser" : "winner";
				const projectedTeam =
					requiredResult === "loser" ? prevOutcome?.loser : prevOutcome?.winner;
				if (projectedTeam && match.teamB?.id === projectedTeam.id) {
					hasProjectedTeam = true;
				}
			}

			if (hasProjectedTeam) {
				pushSynthetic(match);
				continue;
			}

			// Finished match with both teams set, but user never placed a bet
			if (match.status === "finished") {
				pushSynthetic(match);
			}
		}

		const syntheticBets = syntheticMatches.map((match) => ({
			id: -match.id,
			userId,
			matchId: match.id,
			predictedWinnerId: null,
			predictedScoreA: null,
			predictedScoreB: null,
			pointsEarned: null,
			isPerfectPick: null,
			isUnderdogPick: null,
			createdAt: new Date(),
			match,
			predictedWinner: null,
		}));

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

		for (const group of betsByTournament) {
			group.bets.sort(compareMyBetsByMatchOrder);
		}

		betsByTournament.sort((a, b) =>
			a.tournament.name.localeCompare(b.tournament.name, "pt-BR"),
		);

		return { stats, betsByTournament };
	});
