import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { clsx } from "clsx";
import { and, asc, eq, inArray, like, not } from "drizzle-orm";
import { Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLangLink } from "@/i18n/useLangLink";
import { deriveMatchFormat } from "@/lib/utils";
import { BettingCarousel } from "../../components/BettingCarousel";
import { LandingPage } from "../../components/LandingPage";
import { MatchDaySelector } from "../../components/MatchDaySelector";
import { SwissStageView } from "../../components/SwissStageView";
import {
	type Match,
	type Prediction,
	TournamentBracket,
} from "../../components/TournamentBracket";
import { TournamentSelector } from "../../components/TournamentSelector";
import { queryClient } from "../../router";
import { isBracketMatchLike } from "../../utils/recovery";
import type { BetStats } from "@/server/bets";
import { BetSplitBar } from "@/components/BetSplitBar";

// 1. SERVER FUNCTION: Lista torneios ativos com apostas OU onde usuário tem apostas
const getActiveTournaments = createServerFn({ method: "GET" }).handler(
	async (ctx: any) => {
		const { db, matches, tournaments, bets } = await import("@bsebet/db");
		// const user = await getUser(); // Original line, replaced by session check

		// Step 1: Get all active/visible tournaments (broaden status check)
		const activeTournaments = await db.query.tournaments.findMany({
			where: and(
				eq(tournaments.isActive, true),
				inArray(tournaments.status, ["active", "upcoming"]), // Include upcoming too
				not(like(tournaments.name, "Test Tournament%")),
			),
		});

		// Step 2: Get matches with betting enabled for these tournaments
		const tournamentIds = activeTournaments.map((t: any) => t.id);
		const bettingMatches =
			tournamentIds.length > 0
				? await db.query.matches.findMany({
						where: and(
							inArray(matches.tournamentId, tournamentIds),
							eq(matches.isBettingEnabled, true),
						),
						columns: { id: true, tournamentId: true },
					})
				: [];

		const bettingEnabledTournamentIds = new Set(
			bettingMatches.map((m: any) => m.tournamentId),
		);

		// Step 3: Get tournament IDs where user has bets
		const userBetTournamentIds = new Set<number>();
		const userBetsByMatchId = new Map<
			number,
			{ predictedWinnerId: number | null; isRecovery: boolean | null }
		>();

		const { auth } = await import("@bsebet/auth");
		const session = await auth.api.getSession({ headers: ctx.request.headers });
		const serverUser = session?.user;

		if (serverUser) {
			const userBetsData = await db.query.bets.findMany({
				where: eq(bets.userId, serverUser.id),
				columns: { matchId: true, predictedWinnerId: true, isRecovery: true },
			});

			for (const b of userBetsData) {
				userBetsByMatchId.set(Number(b.matchId), {
					predictedWinnerId: b.predictedWinnerId,
					isRecovery: b.isRecovery,
				});
			}

			if (userBetsData.length > 0) {
				const userMatchIds = userBetsData.map((b: any) => b.matchId);
				const userMatches = await db.query.matches.findMany({
					where: inArray(matches.id, userMatchIds),
					columns: { tournamentId: true },
				});
				userMatches.forEach((m: any) => {
					if (m.tournamentId) userBetTournamentIds.add(m.tournamentId);
				});
			}
		}

		// Step 4: Combine all tournament IDs we need to fetch
		const activeTournamentIds = activeTournaments.map((t) => t.id);

		const allTournamentIdsToFetch = new Set([
			...activeTournamentIds,
			...bettingEnabledTournamentIds,
			...userBetTournamentIds,
		]);

		// Step 5: Fetch tournaments and their matches separately
		let allTournaments: any[] = [];
		if (allTournamentIdsToFetch.size > 0) {
			allTournaments = await db.query.tournaments.findMany({
				where: inArray(tournaments.id, Array.from(allTournamentIdsToFetch)),
			});

			// Fetch matches separately for each tournament
			const allMatches = await db.query.matches.findMany({
				where: inArray(
					matches.tournamentId,
					Array.from(allTournamentIdsToFetch),
				),
				orderBy: [asc(matches.startTime)],
				with: {
					matchDay: true,
				},
			});

			// Attach matches to tournaments
			const matchesByTournament: { [key: number]: any[] } = {};
			allMatches.forEach((m: any) => {
				if (!matchesByTournament[m.tournamentId]) {
					matchesByTournament[m.tournamentId] = [];
				}
				matchesByTournament[m.tournamentId].push(m);
			});

			allTournaments = allTournaments.map((t: any) => ({
				...t,
				matches: matchesByTournament[t.id] || [],
			}));
		}

		// Step 6: Filter
		// We keep a tournament if:
		// 1. It has matches
		// 2. OR the user has bets in it
		// 3. OR it's one of the explicitly active tournaments we found in Step 1
		const tournamentsWithBetting = allTournaments
			.filter((t: any) => {
				if (t.status === "finished") {
					return false;
				}

				const hasMatches = t.matches && t.matches.length > 0;
				const hasBets = userBetTournamentIds.has(t.id);
				const isActive = activeTournamentIds.includes(t.id);
				const keep = hasMatches || hasBets || isActive;

				return keep;
			})
			.map((t: any) => {
				// Find the "active stage" (the label of the first scheduled/live match)
				const activeMatch =
					t.matches.find((m: any) => m.status === "live") || t.matches[0];
				let activeStage = activeMatch?.label || "Fase de Grupos";

				// Normalize "Group A", "Grupo B" etc to "Fase de Grupos"
				if (
					activeStage.toLowerCase().startsWith("group") ||
					activeStage.toLowerCase().startsWith("grupo")
				) {
					activeStage = "Fase de Grupos";
				}

				const matchesForT = t.matches || [];
				const recoveryMatches = matchesForT.filter((m: any) => {
					// A match is a recovery match candidate if its matchday is locked and it hasn't started
					if (m.matchDay?.status !== "locked" || m.status !== "scheduled")
						return false;

					// Walkovers are resolved administratively and should never open recovery flow.
					if (m.resultType === "wo") return false;

					// Exclude matches that already have a result defined (winner set)
					if (m.winnerId) return false;

					// Exclude matches without both teams (not yet determined by bracket)
					if (!m.teamAId || !m.teamBId) return false;

					// If user has no bet for this match, it's a recovery candidate.
					const serverBet = userBetsByMatchId.get(Number(m.id));
					if (!serverBet) return true;

					// If predicted winner no longer belongs to current matchup, user needs recovery.
					const predictedWinnerId =
						serverBet.predictedWinnerId !== null
							? Number(serverBet.predictedWinnerId)
							: null;
					if (
						predictedWinnerId &&
						predictedWinnerId !== Number(m.teamAId) &&
						predictedWinnerId !== Number(m.teamBId)
					) {
						return true;
					}

					// Otherwise, this match should not count as pending recovery.
					return false;
				});

				return {
					id: t.id,
					name: t.name,
					slug: t.slug,
					logoUrl: t.logoUrl,
					status: t.status,
					startDate: t.startDate,
					// Only count matches that are actually open for betting
					matchCount: t.matches.filter((m: any) => m.isBettingEnabled).length,
					activeStage,
					hasUserBets: userBetTournamentIds.has(t.id),
					hasRecoveryBets: recoveryMatches.length > 0,
					recoveryMatchCount: recoveryMatches.length,
				};
			})
			// Sort: tournaments with user bets first, then by start date (most recent first)
			.sort((a: any, b: any) => {
				if (a.hasUserBets && !b.hasUserBets) return -1;
				if (!a.hasUserBets && b.hasUserBets) return 1;
				return (
					new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
				);
			});

		// Step 7: Fetch colors for tournaments with logos
		const tournamentsWithColors = await Promise.all(
			tournamentsWithBetting.map(async (t: any) => {
				let colors = null;
				if (t.logoUrl) {
					try {
						const { extractColorsFromImage } = await import(
							"../../server/color-extractor"
						);
						colors = await extractColorsFromImage(t.logoUrl);
					} catch (e) {
						console.error(
							`Failed to extract colors for tournament ${t.name}:`,
							e,
						);
					}
				}
				return { ...t, colors };
			}),
		);

		return { tournaments: tournamentsWithColors, user: serverUser };
	},
);

// 2. SERVER FUNCTION: Busca todos os dados do torneio (partidas + apostas) em uma única chamada
const getHomeTournamentDataFn = createServerFn({ method: "GET" }).handler(
	async (ctx: any) => {
		const { tournamentId } = ctx.data;

		const { db, matches, matchDays, tournaments, tournamentTeams, bets } =
			await import("@bsebet/db");
		const { eq, asc, inArray, sql, and, or, not } = await import("drizzle-orm");

		// Import auth locally or verify it's imported
		const { auth } = await import("@bsebet/auth");
		const session = await auth.api.getSession({ headers: ctx.request.headers });
		const user = session?.user;

		// Get tournament info once (instead of joining on every match)
		const tournament = await db.query.tournaments.findFirst({
			where: eq(tournaments.id, tournamentId),
		});

		// Get all match days for this tournament
		const allMatchDays = await db.query.matchDays.findMany({
			where: eq(matchDays.tournamentId, tournamentId),
			orderBy: [asc(matchDays.date)],
		});

		// Find the active match day (only "open" status is considered active)
		const activeMatchDay = allMatchDays.find((md: any) => md.status === "open");

		const allMatches = await db.query.matches.findMany({
			where: eq(matches.tournamentId, tournamentId),
			orderBy: [asc(matches.roundIndex), asc(matches.displayOrder)],
			with: {
				teamA: true,
				teamB: true,
				matchDay: true,
			},
		});

		// Get tournament teams data (seeds and groups)
		const tournamentTeamsData = await db.query.tournamentTeams.findMany({
			where: eq(tournamentTeams.tournamentId, tournamentId),
			columns: {
				teamId: true,
				seed: true,
				group: true,
			},
		});

		// Create a map of teamId -> { seed, group }
		const teamStatsMap = new Map();
		for (const tt of tournamentTeamsData) {
			teamStatsMap.set(tt.teamId, { seed: tt.seed, group: tt.group });
		}

		// Get bet counts for each match (popularity stats)
		const matchIds = allMatches.map((m: any) => m.id);
		const betCountsByMatch: Map<number, { teamA: number; teamB: number }> =
			new Map();

		if (matchIds.length > 0) {
			const betCounts = await db
				.select({
					matchId: bets.matchId,
					predictedWinnerId: bets.predictedWinnerId,
					count: sql<number>`count(*)::int`,
				})
				.from(bets)
				.where(inArray(bets.matchId, matchIds))
				.groupBy(bets.matchId, bets.predictedWinnerId);

			// Organize counts by match
			for (const bc of betCounts) {
				if (!bc.predictedWinnerId) continue;

				const match = allMatches.find((m: any) => m.id === bc.matchId);
				if (!match) continue;

				if (!betCountsByMatch.has(bc.matchId)) {
					betCountsByMatch.set(bc.matchId, { teamA: 0, teamB: 0 });
				}

				const counts = betCountsByMatch.get(bc.matchId)!;
				if (match.teamAId === bc.predictedWinnerId) {
					counts.teamA = bc.count;
				} else if (match.teamBId === bc.predictedWinnerId) {
					counts.teamB = bc.count;
				}
			}
		}

		// Get recent match history for teams (last 5 matches for each team in this tournament)
		const teamIds = new Set<number>();
		allMatches.forEach((m: any) => {
			if (m.teamAId) teamIds.add(m.teamAId);
			if (m.teamBId) teamIds.add(m.teamBId);
		});

		const teamIdArray = Array.from(teamIds);
		const recentMatches =
			teamIds.size > 0
				? await db.query.matches.findMany({
						where: and(
							eq(matches.tournamentId, tournamentId),
							or(
								inArray(matches.teamAId, teamIdArray),
								inArray(matches.teamBId, teamIdArray),
							),
							eq(matches.status, "finished"),
							not(eq(matches.resultType, "wo")),
						),
						orderBy: [asc(matches.startTime)],
						columns: {
							id: true,
							teamAId: true,
							teamBId: true,
							winnerId: true,
							scoreA: true,
							scoreB: true,
						},
					})
				: [];

		// Calculate win streaks and recent form
		const teamFormMap = new Map<
			number,
			{ wins: number; losses: number; streak: number }
		>();
		for (const teamId of teamIds) {
			const teamMatches = recentMatches
				.filter((m: any) => m.teamAId === teamId || m.teamBId === teamId)
				.slice(-5); // Last 5 matches

			let wins = 0;
			let losses = 0;
			let currentStreak = 0;

			for (const match of teamMatches) {
				const isWinner = match.winnerId === teamId;
				if (isWinner) {
					wins++;
					if (currentStreak >= 0) currentStreak++;
					else currentStreak = 1;
				} else {
					losses++;
					if (currentStreak <= 0) currentStreak--;
					else currentStreak = -1;
				}
			}

			teamFormMap.set(teamId, { wins, losses, streak: currentStreak });
		}

		const formattedMatches = formatMatches(
			allMatches,
			tournament,
			teamStatsMap,
			betCountsByMatch,
			teamFormMap,
		);

		let userBetsData: any[] = [];
		if (user && allMatches.length > 0) {
			userBetsData = await db.query.bets.findMany({
				where: (betsTable, { eq, and, inArray }) =>
					and(
						eq(betsTable.userId, user.id),
						inArray(betsTable.matchId, matchIds),
					),
			});
		}

		return {
			matches: formattedMatches,
			userBets: userBetsData,
			matchDays: allMatchDays,
			activeMatchDayId: activeMatchDay?.id || null,
			tournamentStages: (tournament?.stages ?? []) as Array<{
				id: string;
				type: string;
			}>,
		};
	},
);

const getHomeTournamentData = getHomeTournamentDataFn as unknown as (opts: {
	data: { tournamentId: number };
}) => Promise<{
	matches: Match[];
	userBets: any[];
	matchDays: any[];
	activeMatchDayId: number | null;
	tournamentStages: Array<{ id: string; type: string }>;
}>;

// Helper function to format matches for the frontend
function formatMatches(
	data: any[],
	tournament?: any,
	teamStatsMap?: Map<number, { seed: number | null; group: string | null }>,
	betCountsByMatch?: Map<number, { teamA: number; teamB: number }>,
	teamFormMap?: Map<number, { wins: number; losses: number; streak: number }>,
): Match[] {
	const formattedMatches = data.map((m) => {
		const teamAStats = m.teamA?.id ? teamStatsMap?.get(m.teamA.id) : null;
		const teamBStats = m.teamB?.id ? teamStatsMap?.get(m.teamB.id) : null;
		const betCounts = betCountsByMatch?.get(m.id) || { teamA: 0, teamB: 0 };
		const teamAForm = m.teamA?.id ? teamFormMap?.get(m.teamA.id) : null;
		const teamBForm = m.teamB?.id ? teamFormMap?.get(m.teamB.id) : null;

		// Calculate win rate from recent form
		const totalMatchesA = (teamAForm?.wins || 0) + (teamAForm?.losses || 0);
		const winRateA =
			totalMatchesA > 0
				? Math.round(((teamAForm?.wins || 0) / totalMatchesA) * 100)
				: 50;
		const totalMatchesB = (teamBForm?.wins || 0) + (teamBForm?.losses || 0);
		const winRateB =
			totalMatchesB > 0
				? Math.round(((teamBForm?.wins || 0) / totalMatchesB) * 100)
				: 50;

		return {
			id: m.id,
			label:
				m.name ||
				m.label ||
				(m.labelTeamA && m.labelTeamB
					? `${m.labelTeamA} vs ${m.labelTeamB}`
					: "Group Stage"),
			name: m.name,
			displayOrder: m.displayOrder,
			// Base values from DB
			nextMatchWinnerId: m.nextMatchWinnerId,
			nextMatchWinnerSlot: m.nextMatchWinnerSlot,
			nextMatchLoserId: m.nextMatchLoserId,
			nextMatchLoserSlot: m.nextMatchLoserSlot,
			teamAPreviousMatchId: m.teamAPreviousMatchId,
			teamBPreviousMatchId: m.teamBPreviousMatchId,
			winnerId: m.winnerId,
			labelTeamA: m.labelTeamA,
			labelTeamB: m.labelTeamB,
			// Bracket-specific fields
			roundIndex: m.roundIndex,
			bracketSide: m.bracketSide,
			isBettingEnabled: m.isBettingEnabled ?? false,
			// REAL DATA
			status: m.status,
			resultType: m.resultType,
			scoreA: m.scoreA,
			scoreB: m.scoreB,
			startTime: m.startTime,
			teamA: m.teamA
				? {
						id: m.teamA.id,
						name: m.teamA.name,
						logoUrl: m.teamA.logoUrl ?? undefined,
						slug: m.teamA.slug ?? undefined,
						color: "blue" as const,
						seed: teamAStats?.seed ?? null,
						group: teamAStats?.group ?? null,
					}
				: null,
			teamB: m.teamB
				? {
						id: m.teamB.id,
						name: m.teamB.name,
						logoUrl: m.teamB.logoUrl ?? undefined,
						slug: m.teamB.slug ?? undefined,
						color: "red" as const,
						seed: teamBStats?.seed ?? null,
						group: teamBStats?.group ?? null,
					}
				: null,
			tournamentName: tournament?.name ?? null,
			tournamentLogoUrl: tournament?.logoUrl ?? null,
			scoringRules: tournament?.scoringRules ?? {
				winner: 1,
				exact: 3,
				underdog_25: 2,
				underdog_50: 1,
				underdog_tier1_max_pct: 0.25,
				underdog_tier2_max_pct: 0.5,
			},
			matchDayId: m.matchDay?.id ?? m.matchDayId ?? null,
			matchDayLabel: m.matchDay?.label ?? null,
			matchDayStatus: m.matchDay?.status ?? null,
			format: deriveMatchFormat(m.stageId, tournament?.stages),
			stats: {
				regionA: m.teamA?.region || "SA",
				regionB: m.teamB?.region || "SA",
				pointsA: (teamAForm?.wins || 0) * 3, // 3 points per win
				pointsB: (teamBForm?.wins || 0) * 3,
				winRateA: `${winRateA}%`,
				winRateB: `${winRateB}%`,
				seedA: teamAStats?.seed ?? null,
				seedB: teamBStats?.seed ?? null,
				groupA: teamAStats?.group ?? null,
				groupB: teamBStats?.group ?? null,
				betCountA: betCounts.teamA,
				betCountB: betCounts.teamB,
				streakA: teamAForm?.streak || 0,
				streakB: teamBForm?.streak || 0,
			},
		};
	});

	// Lógica de Sincronização Dinâmica:
	// Se uma partida B diz que depende da partida A (backward),
	// garantimos que a partida A saiba que deve enviar o resultado para B (forward).
	// Otimização: Usamos um Map para evitar complexidade O(N^2) no nested loop.

	// 1. Criar um mapa de dependentes: MatchId -> List<Matches que dependem dele>
	const dependentsMap = new Map<number, typeof data>();

	data.forEach((follower) => {
		// Se o follower depende de alguém no Slot A
		if (follower.teamAPreviousMatchId) {
			const parentId = follower.teamAPreviousMatchId;
			if (!dependentsMap.has(parentId)) {
				dependentsMap.set(parentId, []);
			}
			dependentsMap.get(parentId)?.push(follower);
		}

		// Se o follower depende de alguém no Slot B
		if (follower.teamBPreviousMatchId) {
			const parentId = follower.teamBPreviousMatchId;
			// Um mesmo follower pode depender de dois parents diferentes, ou do mesmo (teoricamente)
			// Se parentId for igual ao anterior, já adicionamos? Não, pois a lista é por parentId.
			// Se parentId diferente, adicionamos na lista desse outro parent.
			if (!dependentsMap.has(parentId)) {
				dependentsMap.set(parentId, []);
			}
			// Evitar duplicar se o mesmo match depender do mesmo pai nos dois slots (caso raro/bizarro)
			const list = dependentsMap.get(parentId);
			if (list && !list.includes(follower)) {
				list.push(follower);
			}
		}
	});

	// 2. Iterar sobre as partidas e preencher os campos "nextMatch..."
	formattedMatches.forEach((match) => {
		const followers = dependentsMap.get(match.id);

		if (followers) {
			followers.forEach((follower) => {
				// Se o follower depende no Slot A
				if (follower.teamAPreviousMatchId === match.id) {
					// Robust check: Default to winner slot if result tag is missing/null
					const isLoser = follower.teamAPreviousMatchResult === "loser";
					if (!isLoser) {
						match.nextMatchWinnerId = follower.id;
						match.nextMatchWinnerSlot = "A";
					} else {
						match.nextMatchLoserId = follower.id;
						match.nextMatchLoserSlot = "A";
					}
				}
				// Se o follower depende no Slot B
				if (follower.teamBPreviousMatchId === match.id) {
					// Robust check: Default to winner slot if result tag is missing/null
					const isLoser = follower.teamBPreviousMatchResult === "loser";
					if (!isLoser) {
						match.nextMatchWinnerId = follower.id;
						match.nextMatchWinnerSlot = "B";
					} else {
						match.nextMatchLoserId = follower.id;
						match.nextMatchLoserSlot = "B";
					}
				}
			});
		}
	});

	return formattedMatches;
}

// 4. A ROTA: Define o loader e renderiza a página
export const Route = createFileRoute("/$lang/")({
	validateSearch: (
		search: Record<string, unknown>,
	): { tournament?: string } => {
		return {
			tournament: search.tournament as string | undefined,
		};
	},
	loader: async () => {
		const { tournaments, user } = await getActiveTournaments();
		return {
			tournaments,
			isAuthenticated: !!user,
			userId: user?.id,
		};
	},
	component: Home,
});

// Review Screen Component
function ReviewScreen({
	matches,
	predictions,
	onUpdatePrediction,
	onBack,
	isReadOnly = false,
	tournamentId,
	userId,
	userBets = [],
	setSelectedMatchDayId,
	setShowReview,
	setPredictions,
	setSelectedTournamentId,
	matchDayStatus,
	onLockRecoveryMatch,
	stalePredictionMatchIds = new Set<number>(),
	projectedMatches = [],
	editableRecoveryMatchIds = new Set<number>(),
}: {
	matches: any[];
	predictions: Record<number, Prediction>;
	onUpdatePrediction: (
		matchId: number,
		winnerId: number,
		score?: string,
	) => void;
	onBack: () => void;
	isReadOnly?: boolean;
	tournamentId: number;
	userId: string;
	userBets?: any[];
	setSelectedMatchDayId?: (id: number | null) => void;
	setShowReview?: (show: boolean) => void;
	setPredictions?: React.Dispatch<
		React.SetStateAction<Record<number, Prediction>>
	>;
	setSelectedTournamentId?: (id: number | null) => void;
	matchDayStatus?: string;
	onLockRecoveryMatch?: (matchId: number) => void;
	stalePredictionMatchIds?: Set<number>;
	projectedMatches?: any[];
	editableRecoveryMatchIds?: Set<number>;
}) {
	const { t } = useTranslation("betting");
	const [editingScoreMatchId, setEditingScoreMatchId] = useState<number | null>(
		null,
	);
	const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

	// Note: These were previously calculated here, but now they are passed as props from Home
	// to avoid redundant calculations and allow Home to use them for auto-review logic.
	// We provide fallbacks if they are not passed.
	const effectiveStaleIds = useMemo(
		() => stalePredictionMatchIds || new Set<number>(),
		[stalePredictionMatchIds],
	);
	const effectiveProjectedMatches = useMemo(() => {
		const source = projectedMatches?.length ? projectedMatches : matches;
		const allowedMatchIds = new Set(matches.map((m: any) => Number(m.id)));
		return source.filter((m: any) => allowedMatchIds.has(Number(m.id)));
	}, [projectedMatches, matches]);
	const effectiveEditableIds = useMemo(
		() => editableRecoveryMatchIds || new Set<number>(),
		[editableRecoveryMatchIds],
	);

	// Calculate if there are any valid bets to submit
	const hasValidBetsToSubmit = useMemo(() => {
		const betsToSubmit = Object.entries(predictions)
			.map(([matchIdStr]) => {
				const matchId = Number.parseInt(matchIdStr);
				const match = matches.find((m: any) => m.id === matchId);

				// Skip if match not found or explicitly started/finished
				if (!match || match.status === "live" || match.status === "finished") {
					return null;
				}

				// Skip stale predictions, UNLESS this is a recovery bet (editable in locked mode).
				// Recovery bets are intentionally overriding stale data, so we allow them.
				if (
					effectiveStaleIds.has(matchId) &&
					!effectiveEditableIds.has(matchId)
				) {
					return null;
				}

				// When matchday is locked, ONLY allow recovery bets (editable matches)
				if (matchDayStatus === "locked") {
					// Not in editable list = can't bet
					if (!effectiveEditableIds.has(matchId)) {
						return null;
					}

					// In recovery mode, editable matches are always re-submittable (server does upsert).
					// We only block if there's truly no usable score at all.
					const currentPred = predictions[matchId];
					const serverBet = userBets.find((b: any) => b.matchId === matchId);
					const resolvedScore =
						currentPred?.score?.trim() ||
						(serverBet
							? `${serverBet.predictedScoreA}-${serverBet.predictedScoreB}`
							: "");
					if (!currentPred?.winnerId || !resolvedScore) {
						return null; // Nothing to submit (no winner or no score at all)
					}
				}

				return { matchId };
			})
			.filter((bet): bet is NonNullable<typeof bet> => bet !== null);

		return betsToSubmit.length > 0;
	}, [
		predictions,
		matches,
		effectiveStaleIds,
		effectiveEditableIds,
		userBets,
		matchDayStatus,
	]);

	// Filter matches to show in review:
	// - If read-only: show ALL matches (including draft/scheduled)
	// - Otherwise: show predicted matches, finished/live matches, OR matches available for recovery betting
	const matchesToDisplay = useMemo(() => {
		return effectiveProjectedMatches
			.filter(
				(match: any) =>
					isReadOnly || // Show all matches in read-only mode
					predictions[match.id] ||
					match.status === "finished" ||
					match.status === "live" ||
					effectiveStaleIds.has(match.id) || // Show matches that need re-betting due to wrong predictions
					// Show scheduled matches with both teams defined (projected from real results) when locked
					(matchDayStatus === "locked" &&
						match.status === "scheduled" &&
						match.teamA?.id &&
						match.teamB?.id), // Both teams are now known via projection
			)
			.sort((a: any, b: any) => {
				const roundA = a.roundIndex ?? 0;
				const roundB = b.roundIndex ?? 0;
				if (roundA !== roundB) return roundA - roundB;

				return (a.displayOrder || 0) - (b.displayOrder || 0);
			});
	}, [
		effectiveProjectedMatches,
		predictions,
		isReadOnly,
		effectiveStaleIds,
		matchDayStatus,
	]);

	// Filter userBets to only include bets for matches being displayed (current matchday)
	const matchIdsInDisplay = useMemo(() => {
		return new Set(matchesToDisplay.map((m: any) => m.id));
	}, [matchesToDisplay]);

	const filteredUserBets = useMemo(() => {
		return userBets.filter((bet: any) => matchIdsInDisplay.has(bet.matchId));
	}, [userBets, matchIdsInDisplay]);

	// Calculate total points earned (only for current matchday)
	const totalPoints = useMemo(() => {
		return filteredUserBets.reduce(
			(sum, bet) => sum + (bet.pointsEarned || 0),
			0,
		);
	}, [filteredUserBets]);

	// Calculate stats (only for current matchday)
	const stats = useMemo(() => {
		const finished = matchesToDisplay.filter(
			(m: any) => m.status === "finished",
		);
		const withBets = finished.filter((m: any) =>
			filteredUserBets.find((b: any) => b.matchId === m.id),
		);
		const correct = withBets.filter((m: any) => {
			const bet = filteredUserBets.find((b: any) => b.matchId === m.id);
			return bet && m.winnerId === bet.predictedWinnerId;
		});
		const perfectPicks = filteredUserBets.filter((b) => b.isPerfectPick).length;
		const underdogPicks = filteredUserBets.filter(
			(b) => b.isUnderdogPick && b.pointsEarned > 0,
		).length;

		return {
			total: withBets.length,
			correct: correct.length,
			perfectPicks,
			underdogPicks,
		};
	}, [matchesToDisplay, filteredUserBets]);

	return (
		<>
			<div className="fade-in slide-in-from-bottom-5 relative flex min-h-screen w-full animate-in flex-col bg-paper p-4 pb-32 duration-300 md:p-6">
				<div className="mx-auto flex w-full max-w-4xl flex-col items-center">
					{/* Header */}
					<header className="mb-8 text-center">
						<div className="mb-2 inline-flex -skew-x-12 transform items-center gap-1.5 rounded-full bg-black px-3 py-1 font-black text-[10px] text-white tracking-[0.2em]">
							<span className="h-1.5 w-1.5 rounded-full bg-brawl-yellow" />
							{t("review.title", {
								tournament:
									matches[0]?.tournamentName?.toUpperCase() ||
									t("review.titleFallback"),
							})}
						</div>
						<h2 className="-skew-x-12 transform font-black font-display text-4xl text-black uppercase italic tracking-tighter">
							{t("review.reviewTitle")}{" "}
							<span className="text-brawl-red">
								{t("review.reviewTitleHighlight")}
							</span>
						</h2>
						<p className="mt-2 font-bold text-gray-500 text-xs uppercase tracking-widest">
							{t("review.reviewSubtitle")}
						</p>
					</header>

					{/* Recovery Bets Alert Banner */}
					{matchDayStatus === "locked" && editableRecoveryMatchIds.size > 0 && (
						<div className="slide-in-from-top-5 mb-6 w-full max-w-2xl animate-in border-[4px] border-black bg-brawl-yellow p-4 shadow-[8px_8px_0px_0px_#000] duration-500">
							<div className="flex items-start gap-3">
								<span className="material-symbols-outlined text-3xl text-black">
									notification_important
								</span>
								<div className="flex-1">
									<h4 className="font-black font-display text-black text-lg uppercase italic">
										{t("recovery.available")}
									</h4>
									<p className="mt-1 font-bold text-black/80 text-sm">
										{t("recovery.errorPrompt")}
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Navigation Controls */}
					{!isReadOnly ? (
						<button
							onClick={onBack}
							className="mb-6 flex w-fit items-center gap-2 font-black text-black text-sm uppercase transition-colors hover:text-brawl-red"
						>
							<span className="material-symbols-outlined text-lg">
								arrow_back
							</span>
							Voltar para apostas
						</button>
					) : (
						<button
							onClick={() => {
								// Reset all state to show tournament selector
								setSelectedTournamentId?.(null);
								setSelectedMatchDayId?.(null);
								setShowReview?.(false);
								setPredictions?.({});
							}}
							className="mb-6 flex w-fit cursor-pointer items-center gap-2 font-black text-black text-sm uppercase transition-colors hover:text-brawl-blue"
						>
							<span className="material-symbols-outlined text-lg">
								emoji_events
							</span>
							Ver Torneios
						</button>
					)}

					{/* Stats Summary - Only show if there are finished matches with bets */}
					{isReadOnly && stats.total > 0 && (
						<div className="mb-8 w-full overflow-hidden border-[4px] border-black bg-white shadow-[6px_6px_0px_0px_#000]">
							{/* Header */}
							<div className="flex items-center justify-between border-black border-b-[4px] bg-black px-4 py-2 text-white">
								<span className="font-black text-[10px] uppercase tracking-widest">
									Resumo de Pontos
								</span>
								<span className="material-symbols-outlined text-[#ccff00] text-base">
									leaderboard
								</span>
							</div>

							{/* Stats Grid */}
							<div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
								{/* Total Points */}
								<div className="-rotate-1 transform border-[3px] border-black bg-[#ccff00] p-3 text-center shadow-[3px_3px_0px_0px_#000]">
									<div className="font-black text-3xl text-black italic">
										{totalPoints}
									</div>
									<div className="mt-1 font-black text-[9px] text-black/60 uppercase">
										Pontos Totais
									</div>
								</div>

								{/* Correct Predictions */}
								<div className="rotate-1 transform border-[3px] border-black bg-green-500 p-3 text-center shadow-[3px_3px_0px_0px_#000]">
									<div className="font-black text-3xl text-white italic">
										{stats.correct}/{stats.total}
									</div>
									<div className="mt-1 font-black text-[9px] text-white/80 uppercase">
										Acertos
									</div>
								</div>

								{/* Perfect Picks */}
								<div className="-rotate-1 transform border-[3px] border-black bg-blue-500 p-3 text-center shadow-[3px_3px_0px_0px_#000]">
									<div className="font-black text-3xl text-white italic">
										{stats.perfectPicks}
									</div>
									<div className="mt-1 font-black text-[9px] text-white/80 uppercase">
										Placares Exatos
									</div>
								</div>

								{/* Underdog Wins */}
								<div className="rotate-1 transform border-[3px] border-black bg-gradient-to-r from-purple-600 to-pink-600 p-3 text-center shadow-[3px_3px_0px_0px_#000]">
									<div className="flex items-center justify-center gap-1 font-black text-3xl text-white italic">
										<span>🔥</span>
										{stats.underdogPicks}
									</div>
									<div className="mt-1 font-black text-[9px] text-white/80 uppercase">
										{t("bonus.underdogLabel")}
									</div>
								</div>
							</div>

							{/* Accuracy Bar */}
							{stats.total > 0 && (
								<div className="px-4 pb-4">
									<div className="mb-1 flex items-center justify-between">
										<span className="font-black text-[9px] text-gray-500 uppercase">
											Taxa de Acerto
										</span>
										<span className="font-black text-[9px] text-black">
											{Math.round((stats.correct / stats.total) * 100)}%
										</span>
									</div>
									<div className="h-2 overflow-hidden border-2 border-black bg-gray-200">
										<div
											className="h-full bg-green-500 transition-all duration-500"
											style={{
												width: `${(stats.correct / stats.total) * 100}%`,
											}}
										/>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Matches List */}
					<div className="mx-auto mb-12 w-full max-w-4xl space-y-8 px-1">
						<div className="flex flex-col gap-8">
							{matchesToDisplay.map((match: any, idx: number) => {
								const mId = Number(match.id);
								const prediction = predictions[mId];
								const betData = filteredUserBets.find(
									(b) => Number(b.matchId) === mId,
								);

								const showResult =
									match.status === "live" || match.status === "finished";
								const isEditingScore =
									editingScoreMatchId !== null &&
									Number(editingScoreMatchId) === mId;

								// A "valid local pick" means the user has already chosen a team that IS in
								// this match — in recovery mode this clears the stale warning badges.
								const hasValidLocalPick =
									!!prediction?.winnerId &&
									(Number(prediction.winnerId) === Number(match.teamA?.id) ||
										Number(prediction.winnerId) === Number(match.teamB?.id));

								// Check if predicted team is not in the current match (bracket projection changed).
								// Only applies when there IS a prior server-side bet (betData) and the user hasn't
								// already made a fresh valid local pick.
								const predictedTeamNotInMatch =
									!!betData?.predictedWinnerId &&
									!!match.teamA?.id &&
									!!match.teamB?.id &&
									![Number(match.teamA.id), Number(match.teamB.id)].includes(
										Number(betData.predictedWinnerId),
									) &&
									!hasValidLocalPick; // Suppress once user picks a valid current team

								// If predicted team is not in the match, reset effective prediction
								// unless the match is already live/finished
								const isInvalidPrediction =
									predictedTeamNotInMatch && !showResult;

								// Check if this prediction is stale (depends on a wrong prediction in a previous match)
								// Use Array.from().some() or handle type mismatch in .has()
								const isStalePrediction =
									stalePredictionMatchIds &&
									Array.from(stalePredictionMatchIds).some(
										(id: any) => Number(id) === mId,
									);

								// Use betData as source of truth when available (readonly mode or match finished)
								// BUT only if the match has a valid winnerId (data integrity check).
								// When the predicted team is no longer in the match (isInvalidPrediction), we STILL
								// use the local prediction state so the user can select a new team. The warning
								// badges are shown independently via `predictedTeamNotInMatch`.
								const effectivePrediction =
									betData && match.winnerId !== null
										? {
												winnerId: betData.predictedWinnerId,
												score: `${betData.predictedScoreA}-${betData.predictedScoreB}`,
											}
										: prediction;

								const isWinnerA =
									effectivePrediction?.winnerId !== undefined &&
									match.teamA?.id !== undefined &&
									Number(effectivePrediction.winnerId) ===
										Number(match.teamA.id);
								const isWinnerB =
									effectivePrediction?.winnerId !== undefined &&
									match.teamB?.id !== undefined &&
									Number(effectivePrediction.winnerId) ===
										Number(match.teamB.id);

								const isWalkoverResult =
									showResult && match.resultType === "wo";
								const walkoverDisplay = (() => {
									if (!isWalkoverResult) {
										return { a: "FF", b: "FF" };
									}

									if (match.winnerId && match.teamA?.id && match.teamB?.id) {
										return {
											a:
												Number(match.winnerId) === Number(match.teamA.id)
													? "W"
													: "FF",
											b:
												Number(match.winnerId) === Number(match.teamB.id)
													? "W"
													: "FF",
										};
									}

									if ((match.scoreA ?? 0) !== (match.scoreB ?? 0)) {
										return {
											a: (match.scoreA ?? 0) > (match.scoreB ?? 0) ? "W" : "FF",
											b: (match.scoreB ?? 0) > (match.scoreA ?? 0) ? "W" : "FF",
										};
									}

									if (
										match.teamAPreviousMatchId &&
										!match.teamBPreviousMatchId
									) {
										return { a: "W", b: "FF" };
									}

									if (
										!match.teamAPreviousMatchId &&
										match.teamBPreviousMatchId
									) {
										return { a: "FF", b: "W" };
									}

									if (!match.teamA?.id && match.teamB?.id) {
										return { a: "W", b: "FF" };
									}

									if (match.teamA?.id && !match.teamB?.id) {
										return { a: "FF", b: "W" };
									}

									return { a: "FF", b: "FF" };
								})();
								const isActualWinnerA = showResult
									? isWalkoverResult
										? walkoverDisplay.a === "W"
										: Number(match.winnerId) === Number(match.teamA?.id)
									: false;
								const isActualWinnerB = showResult
									? isWalkoverResult
										? walkoverDisplay.b === "W"
										: Number(match.winnerId) === Number(match.teamB?.id)
									: false;

								const matchActiveColor =
									isActualWinnerA || (!showResult && isWinnerA)
										? "brawl-blue"
										: "brawl-red";
								const displayScore = showResult
									? isWalkoverResult
										? `${walkoverDisplay.a} - ${walkoverDisplay.b}`
										: `${match.scoreA} - ${match.scoreB}`
									: effectivePrediction?.score
										? effectivePrediction.score
										: betData
											? `${betData.predictedScoreA}-${betData.predictedScoreB}`
											: "?-?";

								const winsNeeded =
									match.format === "bo5" ? 3 : match.format === "bo3" ? 2 : 4;
								const scoreOptions = [];
								for (let loserWins = 0; loserWins < winsNeeded; loserWins++) {
									const label = isWinnerA
										? `${winsNeeded}-${loserWins}`
										: `${loserWins}-${winsNeeded}`;
									scoreOptions.push(label);
								}

								// Master Editability Rule: In locked mode, only matches explicitly in the recovery set are editable.
								// This set (calculated in Home) already filters for stale/invalid status AND enforces locks.
								const currentMatchDayStatus =
									match.matchDayStatus || matchDayStatus;

								const isRecoveryMatch =
									currentMatchDayStatus === "locked" &&
									editableRecoveryMatchIds &&
									(editableRecoveryMatchIds.has(mId) ||
										editableRecoveryMatchIds.has(Number(match.id)));

								const isEditableInRecovery =
									currentMatchDayStatus !== "locked" || !!isRecoveryMatch;

								return (
									<div
										key={match.id}
										className={clsx(
											"pointer-events-auto relative mb-4 w-full transform overflow-visible border-[4px] bg-white transition-all duration-200 hover:-translate-y-1",
											isRecoveryMatch
												? "border-brawl-yellow shadow-[6px_6px_0px_0px_#ccff00]"
												: betData?.isPerfectPick && match.winnerId !== null
													? "border-[#ccff00] shadow-[6px_6px_0px_0px_#ccff00,12px_12px_0px_0px_#000]"
													: "border-black shadow-[6px_6px_0px_0px_#000]",
											currentMatchDayStatus === "locked" &&
												!isEditableInRecovery &&
												!showResult &&
												"opacity-60",
										)}
									>
										{/* Match Header Bar */}
										<div
											className={clsx(
												"flex items-center justify-between border-black border-b-[4px] px-4 py-1.5",
												betData?.isPerfectPick && match.winnerId !== null
													? "bg-gradient-to-r from-[#ccff00] via-yellow-300 to-[#ccff00]"
													: betData?.isUnderdogPick && match.winnerId !== null
														? "bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600"
														: "bg-zinc-900",
											)}
										>
											<div className="flex items-center gap-2">
												<span
													className={clsx(
														"font-black text-[10px] uppercase italic tracking-[0.2em] md:text-xs",
														betData?.isPerfectPick || betData?.isUnderdogPick
															? "text-white"
															: "text-white",
													)}
												>
													{match.label || match.name || `MATCH ${idx + 1}`}
												</span>
												{isRecoveryMatch && (
													<span className="flex animate-pulse items-center gap-1 border-2 border-black bg-brawl-yellow px-2 py-0.5 font-black text-[8px] text-black">
														🔄 RECUPERAÇÃO
													</span>
												)}
												{/* Show "APOSTA ENVIADA" for recovery bets that are locked */}
												{!isRecoveryMatch &&
													currentMatchDayStatus === "locked" &&
													!isWalkoverResult &&
													betData?.isRecovery && (
														<span className="flex items-center gap-1 border-2 border-black bg-green-500 px-2 py-0.5 font-black text-[8px] text-white">
															✅ APOSTA ENVIADA
														</span>
													)}
												{betData?.isPerfectPick && match.winnerId !== null && (
													<span className="flex items-center gap-1 border-2 border-black bg-black px-2 py-0.5 font-black text-[#ccff00] text-[8px]">
														⭐ PERFECT PICK!
													</span>
												)}
												{betData?.isUnderdogPick &&
													match.winnerId !== null &&
													!betData?.isPerfectPick && (
														<span className="flex items-center gap-1 border-2 border-black bg-black px-2 py-0.5 font-black text-[8px] text-purple-300">
															🔥 UNDERDOG!
														</span>
													)}
											</div>
											<div
												className={clsx(
													"flex shrink-0 items-center gap-1 font-black text-[10px] italic",
													betData?.isPerfectPick
														? "text-black"
														: "text-[#ccff00]",
												)}
												suppressHydrationWarning
											>
												<span className="material-symbols-outlined text-xs">
													schedule
												</span>
												{new Date(match.startTime).toLocaleTimeString("pt-BR", {
													hour: "2-digit",
													minute: "2-digit",
													timeZone: "America/Sao_Paulo",
												})}
											</div>
										</div>

										{/* Match Body - Responsive Design */}
										<div
											className={clsx(
												"group relative flex h-auto flex-col overflow-visible md:flex-row",
												showResult || isEditingScore
													? "min-h-[120px] md:min-h-[112px]"
													: "min-h-[140px] md:min-h-[112px]",
											)}
										>
											{/* Perfect Pick Overlay Effect */}
											{betData?.isPerfectPick && match.winnerId !== null && (
												<>
													<div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-br from-[#ccff00]/20 via-yellow-200/10 to-[#ccff00]/20" />
													{/* Decorative Stars */}
													<div
														className="absolute top-2 left-2 z-10 animate-bounce text-2xl"
														style={{ animationDelay: "0ms" }}
													>
														⭐
													</div>
													<div
														className="absolute top-4 right-4 z-10 animate-bounce text-xl"
														style={{ animationDelay: "200ms" }}
													>
														✨
													</div>
													<div
														className="absolute bottom-2 left-6 z-10 animate-bounce text-lg"
														style={{ animationDelay: "400ms" }}
													>
														💫
													</div>
													<div
														className="absolute right-8 bottom-4 z-10 animate-bounce text-xl"
														style={{ animationDelay: "600ms" }}
													>
														⭐
													</div>
												</>
											)}
											{/* Underdog Pick Overlay Effect */}
											{betData?.isUnderdogPick &&
												match.winnerId !== null &&
												!betData?.isPerfectPick && (
													<>
														<div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-br from-purple-600/10 via-pink-600/10 to-purple-600/10" />
														{/* Decorative Fire/Dogs */}
														<div
															className="absolute top-2 left-2 z-10 animate-bounce text-2xl"
															style={{ animationDelay: "0ms" }}
														>
															🔥
														</div>
														<div
															className="absolute top-4 right-4 z-10 animate-bounce text-xl"
															style={{ animationDelay: "200ms" }}
														>
															🐕
														</div>
														<div
															className="absolute bottom-2 left-6 z-10 animate-bounce text-lg"
															style={{ animationDelay: "400ms" }}
														>
															💪
														</div>
														<div
															className="absolute right-8 bottom-4 z-10 animate-bounce text-xl"
															style={{ animationDelay: "600ms" }}
														>
															🔥
														</div>
													</>
												)}
											{/* Team A Side */}
											<div
												onClick={() => {
													if (
														!showResult &&
														(currentMatchDayStatus === "locked"
															? isEditableInRecovery
															: !isReadOnly) &&
														match.teamA?.id !== undefined
													)
														onUpdatePrediction(
															match.id,
															match.teamA.id,
															isInvalidPrediction ? "" : undefined,
														);
												}}
												className={clsx(
													"pointer-events-auto relative z-20 flex min-w-0 flex-1 items-center justify-start border-black/10 border-b-2 px-4 transition-all duration-300 hover:z-40 md:border-r-2 md:border-b-0 md:py-4 md:pr-14 md:pl-6",
													showResult || isEditingScore
														? "pt-3 pb-7 md:py-4"
														: "pt-6 pb-6 md:py-4",
													!showResult &&
														(currentMatchDayStatus === "locked"
															? isEditableInRecovery
															: !isReadOnly)
														? "cursor-pointer"
														: "cursor-default",
													isActualWinnerA
														? "bg-[#ccff00] text-black"
														: isWinnerA
															? "bg-brawl-blue"
															: "bg-white hover:bg-gray-50",
													showResult &&
														!isActualWinnerA &&
														"opacity-50 grayscale",
												)}
											>
												{(isWinnerA || isActualWinnerA) && (
													<>
														<div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
														{isWinnerA && (
															<div className="absolute top-1.5 left-2 z-30 border border-black bg-white px-2 py-0.5 font-black text-[8px] text-black italic shadow-sm md:text-[9px]">
																PICK
															</div>
														)}
													</>
												)}
												<div className="relative z-10 flex w-full items-center justify-start gap-3 overflow-hidden md:gap-4">
													<div
														className={clsx(
															"h-10 w-10 shrink-0 rounded-full border-2 p-2 backdrop-blur-sm transition-all md:h-14 md:w-14",
															isWinnerA
																? "border-white bg-white/20 shadow-sm"
																: "border-black/10 bg-black/5",
														)}
													>
														<img
															src={match.teamA?.logoUrl ?? undefined}
															className="h-full w-full object-contain drop-shadow-md filter"
															alt=""
														/>
													</div>
													<span
														className={clsx(
															"-skew-x-6 transform truncate px-1 font-black font-display text-lg uppercase italic leading-none tracking-tighter md:flex-1 md:text-2xl md:leading-tight",
															isActualWinnerA
																? "text-black"
																: isWinnerA
																	? "text-white"
																	: showResult
																		? "text-zinc-500"
																		: "text-zinc-400",
														)}
													>
														{match.teamA?.name ?? match.labelTeamA ?? "TBD"}
													</span>
												</div>
											</div>

											{/* Team B Side */}
											<div
												onClick={() => {
													if (
														!showResult &&
														(currentMatchDayStatus === "locked"
															? isEditableInRecovery
															: !isReadOnly) &&
														match.teamB?.id !== undefined
													)
														onUpdatePrediction(
															match.id,
															match.teamB.id,
															isInvalidPrediction ? "" : undefined,
														);
												}}
												className={clsx(
													"pointer-events-auto relative z-20 flex min-w-0 flex-1 items-center justify-start border-black/10 px-4 transition-all duration-300 hover:z-40 md:justify-end md:border-l-2 md:py-4 md:pr-6 md:pl-14",
													showResult || isEditingScore
														? "pt-7 pb-3 md:py-4"
														: "pt-6 pb-6 md:py-4",
													!showResult &&
														(currentMatchDayStatus === "locked"
															? isEditableInRecovery
															: !isReadOnly)
														? "cursor-pointer"
														: "cursor-default",
													isActualWinnerB
														? "bg-[#ccff00] text-black"
														: isWinnerB
															? "bg-brawl-red"
															: "bg-white hover:bg-gray-50",
													showResult &&
														!isActualWinnerB &&
														"opacity-50 grayscale",
												)}
											>
												{(isWinnerB || isActualWinnerB) && (
													<>
														<div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
														{isWinnerB && (
															<div className="absolute top-1.5 right-2 z-30 border border-black bg-white px-2 py-0.5 font-black text-[8px] text-black italic shadow-sm md:right-2 md:left-auto md:text-[9px]">
																PICK
															</div>
														)}
													</>
												)}
												<div className="relative z-10 flex w-full flex-row items-center justify-start gap-3 overflow-hidden md:flex-row md:justify-end md:gap-4">
													<div
														className={clsx(
															"h-10 w-10 shrink-0 rounded-full border-2 p-2 backdrop-blur-sm transition-all md:h-14 md:w-14",
															isWinnerB
																? "border-white bg-white/20 shadow-sm"
																: "border-black/10 bg-black/5",
														)}
													>
														<img
															src={match.teamB?.logoUrl ?? undefined}
															className="h-full w-full object-contain drop-shadow-md filter"
															alt=""
														/>
													</div>
													<span
														className={clsx(
															"-skew-x-6 transform truncate px-1 text-left font-black font-display text-lg uppercase italic leading-none tracking-tighter md:flex-1 md:text-right md:text-2xl md:leading-tight",
															isActualWinnerB
																? "text-black"
																: isWinnerB
																	? "text-white"
																	: showResult
																		? "text-zinc-500"
																		: "text-zinc-400",
														)}
													>
														{match.teamB?.name ?? match.labelTeamB ?? "TBD"}
													</span>
												</div>
											</div>

											{/* Warning if predicted team didn't make it to this match */}
											{predictedTeamNotInMatch && (
												<div className="pointer-events-none absolute -top-2 left-1/2 z-50 -translate-x-1/2 -rotate-1 transform whitespace-nowrap border-[2px] border-black bg-yellow-500 px-2 py-0.5 shadow-[2px_2px_0px_0px_#000]">
													<span className="font-black text-[8px] text-black uppercase">
														{t("recovery.wrongMatchup")}
													</span>
												</div>
											)}

											<div
												className={clsx(
													"absolute left-1/2 z-50 -translate-x-1/2 transition-all duration-300",
													showResult || isEditingScore
														? "top-1/2 -translate-y-1/2 md:top-auto md:-bottom-2 md:translate-y-0"
														: "-bottom-2",
												)}
											>
												{isEditingScore && isEditableInRecovery ? (
													<div className="zoom-in-95 flex -rotate-1 animate-in gap-1 border-[3px] border-black bg-white p-1 shadow-[4px_4px_0px_0px_#000] duration-200">
														{scoreOptions.map((opt) => (
															<button
																key={opt}
																onClick={(e) => {
																	e.stopPropagation();
																	onUpdatePrediction(
																		match.id,
																		prediction?.winnerId || 0,
																		opt,
																	);
																	setEditingScoreMatchId(null);
																}}
																className={clsx(
																	"border-2 px-2 py-1 font-black font-display text-xs italic transition-all",
																	prediction?.score === opt
																		? matchActiveColor === "brawl-blue"
																			? "border-black bg-brawl-blue text-white"
																			: "border-black bg-brawl-red text-white"
																		: "border-transparent bg-white text-gray-400 hover:border-gray-200 hover:text-black",
																)}
															>
																{opt}
															</button>
														))}
													</div>
												) : showResult && betData ? (
													// Show comparison: predicted vs actual
													<div className="flex flex-row items-center gap-2">
														{/* Actual Score (Left) */}
														<div className="-rotate-1 border-[3px] border-black bg-zinc-800 px-4 py-1 shadow-[4px_4px_0px_0px_#000]">
															<span className="font-black font-display text-sm text-white italic">
																{displayScore}
															</span>
														</div>
														{/* Predicted Score (Right) */}
														<div
															className={clsx(
																"rotate-1 border-[2px] border-black px-2 py-1 shadow-[2px_2px_0px_0px_#000]",
																betData.isPerfectPick && match.winnerId !== null
																	? "border-black bg-[#ccff00] text-black"
																	: betData.predictedWinnerId === match.winnerId
																		? "bg-green-100 text-green-700"
																		: "bg-red-100 text-red-600",
															)}
														>
															<div className="flex flex-col items-center leading-none">
																<span className="mb-0.5 font-bold text-[6px] uppercase md:text-[7px]">
																	PALPITE
																</span>
																<span className="font-black font-display text-[10px] italic md:text-sm">
																	{betData.predictedScoreA}-
																	{betData.predictedScoreB}
																</span>
															</div>
														</div>
													</div>
												) : (
													<button
														onClick={(e) => {
															e.stopPropagation();
															if (
																!showResult &&
																(currentMatchDayStatus === "locked"
																	? isEditableInRecovery
																	: !isReadOnly)
															)
																setEditingScoreMatchId(mId);
														}}
														className={clsx(
															"pointer-events-auto relative z-40 -rotate-1 border-[3px] border-black px-4 py-1 shadow-[4px_4px_0px_0px_#000] outline-none transition-all",
															!showResult &&
																(currentMatchDayStatus === "locked"
																	? isEditableInRecovery
																	: !isReadOnly) &&
																"cursor-pointer hover:scale-105 active:scale-95",
															showResult
																? "bg-zinc-800"
																: matchActiveColor === "brawl-blue"
																	? "bg-brawl-blue"
																	: "bg-brawl-red",
														)}
													>
														<span className="font-black font-display text-sm text-white italic">
															{displayScore}
														</span>
														{isWalkoverResult && (
															<span className="ml-2 border-2 border-white bg-black px-1.5 py-0.5 font-black text-[8px] text-white uppercase">
																WO
															</span>
														)}
													</button>
												)}
											</div>

											{/* Points Badge - Show for finished matches */}
											{match.status === "finished" &&
												betData &&
												betData.pointsEarned !== undefined && (
													<div
														className={clsx(
															"group/badge absolute -right-2 -bottom-2 z-20 flex cursor-help items-center gap-1.5 border-2 px-2 py-1 font-black text-[8px] uppercase",
															(() => {
																const isCorrect =
																	match.winnerId === betData.predictedWinnerId;
																if (!isCorrect)
																	return "border-black bg-red-500 text-white";
																if (betData.isPerfectPick) {
																	return "border-[#ccff00] bg-gradient-to-r from-yellow-400 via-[#ccff00] to-yellow-400 text-black shadow-[0_0_20px_rgba(204,255,0,0.6)]";
																}
																if (betData.isUnderdogPick) {
																	return "border-black bg-gradient-to-r from-purple-600 to-pink-600 text-white";
																}
																return "border-black bg-green-500 text-white";
															})(),
														)}
													>
														{/* Tooltip */}
														<div className="pointer-events-none absolute right-0 bottom-full z-[100] mb-2 hidden w-52 rounded border-2 border-white bg-black p-2 text-[10px] text-white shadow-lg group-hover/badge:block">
															<div className="space-y-1">
																{(() => {
																	const isCorrect =
																		match.winnerId ===
																		betData.predictedWinnerId;

																	// Special case: predicted team never reached this match
																	if (predictedTeamNotInMatch) {
																		return (
																			<>
																				<div className="font-bold text-yellow-400">
																					⚠️ Confronto Diferente
																				</div>
																				<div className="text-[9px] text-gray-300">
																					{t("recovery.matchupLabel")}
																				</div>
																				<div className="mt-1 border-gray-600 border-t pt-1 font-bold text-red-400">
																					Total: 0 pontos
																				</div>
																			</>
																		);
																	}

																	if (!isCorrect) {
																		if (isWalkoverResult) {
																			return (
																				<>
																					<div className="font-bold text-red-300">
																						❌ W.O. Incorreto
																					</div>
																					<div className="text-[9px] text-gray-300">
																						No W.O., apenas o vencedor conta.
																					</div>
																					<div className="text-[9px] text-gray-300">
																						{t("recovery.wrongWinner")}
																					</div>
																					<div className="mt-1 border-gray-600 border-t pt-1 font-bold">
																						{t("totalPoints", { count: 0 })}
																					</div>
																				</>
																			);
																		}

																		return (
																			<>
																				<div className="font-bold text-red-300">
																					❌ Palpite Incorreto
																				</div>
																				<div className="text-[9px] text-gray-300">
																					{t("betLabel")}{" "}
																					{match.teamA?.id ===
																					betData.predictedWinnerId
																						? match.teamA?.name
																						: match.teamB?.name}
																				</div>
																				<div className="text-[9px] text-gray-300">
																					Vencedor real:{" "}
																					{match.teamA?.id === match.winnerId
																						? match.teamA?.name
																						: match.teamB?.name}
																				</div>
																				<div className="mt-1 border-gray-600 border-t pt-1 font-bold">
																					Total: 0 pontos
																				</div>
																			</>
																		);
																	}

																	return (
																		<>
																			{isWalkoverResult && (
																				<div className="font-bold text-yellow-300">
																					🚫 W.O. Confirmado
																				</div>
																			)}
																			{betData.isPerfectPick ? (
																				<div className="flex items-center gap-1 font-bold text-[#ccff00]">
																					⭐ PLACAR PERFEITO!
																				</div>
																			) : (
																				<div className="font-bold text-green-300">
																					{isWalkoverResult
																						? "✅ Breakdown W.O.:"
																						: "✅ Breakdown de Pontos:"}
																				</div>
																			)}

																			{/* Calculate point breakdown */}
																			{(() => {
																				// Get scoring rules from match (with fallback to defaults)
																				const rules = match.scoringRules || {
																					winner: 1,
																					exact: 3,
																					underdog_25: 2,
																					underdog_50: 1,
																					underdog_tier1_max_pct: 0.25,
																					underdog_tier2_max_pct: 0.5,
																				};

																				let winnerPoints = 0;
																				let exactPoints = 0;
																				let underdogPoints = 0;

																				if (isWalkoverResult) {
																					winnerPoints = rules.winner;
																				} else if (betData.isPerfectPick) {
																					// Perfect pick: exact score overwrites
																					exactPoints = rules.exact;
																				} else {
																					// Only winner correct
																					winnerPoints = rules.winner;
																				}

																				if (betData.isUnderdogPick) {
																					// Calculate underdog bonus from total points
																					underdogPoints =
																						betData.pointsEarned -
																						(exactPoints || winnerPoints);
																				}

																				return (
																					<div className="space-y-0.5 text-[9px]">
																						{isWalkoverResult ? (
																							<div className="flex justify-between text-gray-300">
																								<span>
																									✓ Vencedor correto (W.O.)
																								</span>
																								<span>+{winnerPoints} pt</span>
																							</div>
																						) : betData.isPerfectPick ? (
																							<div className="flex justify-between font-bold text-[#ccff00]">
																								<span>
																									⭐ Placar exato (
																									{betData.predictedScoreA}-
																									{betData.predictedScoreB})
																								</span>
																								<span>+{exactPoints} pts</span>
																							</div>
																						) : (
																							<div className="flex justify-between text-gray-300">
																								<span>✓ Vencedor correto</span>
																								<span>+{winnerPoints} pt</span>
																							</div>
																						)}
																						{!isWalkoverResult &&
																							betData.isUnderdogPick &&
																							underdogPoints > 0 && (
																								<div className="flex justify-between font-bold text-purple-300">
																									<span>
																										{t("bonus.underdog", {
																											percent: 25,
																										})}
																									</span>
																									<span>
																										+{underdogPoints} pts
																									</span>
																								</div>
																							)}
																					</div>
																				);
																			})()}

																			<div
																				className={clsx(
																					"mt-1 flex justify-between border-t pt-1 font-bold",
																					betData.isPerfectPick
																						? "border-[#ccff00] text-[#ccff00]"
																						: "border-gray-600 text-yellow-300",
																				)}
																			>
																				<span>Total:</span>
																				<span>+{betData.pointsEarned} pts</span>
																			</div>
																		</>
																	);
																})()}
															</div>
															<div className="absolute top-full right-4 h-0 w-0 border-transparent border-t-4 border-t-white border-r-4 border-l-4" />
														</div>

														{/* Badge Content */}
														{(() => {
															const isCorrect =
																match.winnerId === betData.predictedWinnerId;
															if (!isCorrect) return "✗";
															if (betData.isPerfectPick)
																return <span className="text-[10px]">⭐</span>;
															if (betData.isUnderdogPick)
																return <span>🔥</span>;
															return "✓";
														})()}
														<span className="whitespace-nowrap">
															{betData.pointsEarned > 0
																? `+${betData.pointsEarned}`
																: betData.pointsEarned}{" "}
															PTS
														</span>
														{betData.isUnderdogPick &&
															match.winnerId === betData.predictedWinnerId && (
																<span className="text-[7px]">🐕</span>
															)}
													</div>
												)}
										</div>

										{/* Orphaned Bet Warning */}
										{isInvalidPrediction && (
											<div className="pointer-events-none absolute inset-x-0 -bottom-8 z-50 flex justify-center">
												<div className="rotate-1 animate-pulse border-2 border-black bg-brawl-red px-3 py-1 shadow-[4px_4px_0px_0px_#000]">
													<span className="flex items-center gap-1.5 font-black text-[9px] text-white uppercase italic leading-none">
														<span className="material-symbols-outlined text-xs">
															warning
														</span>
														Pick required: Bracket changed!
													</span>
												</div>
											</div>
										)}

										{/* Stale Prediction Warning - depends on wrong prediction.
                        Hidden for recovery matches since user is intentionally re-picking. */}
										{isStalePrediction &&
											!isInvalidPrediction &&
											!isRecoveryMatch && (
												<div className="pointer-events-none absolute inset-x-0 -bottom-8 z-50 flex justify-center">
													<div className="-rotate-1 animate-pulse border-2 border-black bg-orange-500 px-3 py-1 shadow-[4px_4px_0px_0px_#000]">
														<span className="flex items-center gap-1.5 font-black text-[9px] text-white uppercase italic leading-none">
															<span className="material-symbols-outlined text-xs">
																refresh
															</span>
															Pick again: Wrong prediction above!
														</span>
													</div>
												</div>
											)}

										{/* Recovery Mode Lock - match is not editable */}
										{matchDayStatus === "locked" &&
											!isEditableInRecovery &&
											!showResult && (
												<div className="absolute inset-x-0 -bottom-8 z-50 flex justify-center">
													<div className="border-2 border-black bg-gray-500 px-3 py-1 shadow-[4px_4px_0px_0px_#000]">
														<span className="flex items-center gap-1.5 font-black text-[9px] text-white uppercase italic leading-none">
															<span className="material-symbols-outlined text-xs">
																lock
															</span>
															{predictions[match.id]
																? "Locked: Already picked"
																: "Locked"}
														</span>
													</div>
												</div>
											)}
									</div>
								);
							})}
						</div>
					</div>

					{/* Lock In Button */}
					{!isReadOnly && hasValidBetsToSubmit ? (
						<button
							onClick={() => setIsSuccessModalOpen(true)}
							className="relative mb-12 flex w-full max-w-xs items-center justify-center gap-3 border-[4px] border-black bg-brawl-red py-4 font-black text-white text-xl uppercase italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#d41d1d] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
						>
							{editableRecoveryMatchIds.size > 0 && (
								<span className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-black bg-brawl-yellow font-black text-black text-sm shadow-[2px_2px_0px_0px_#000]">
									{editableRecoveryMatchIds.size}
								</span>
							)}
							<span className="material-symbols-outlined text-2xl">
								verified
							</span>
							{editableRecoveryMatchIds.size > 0
								? t("review.updateBets")
								: t("review.lockAll")}
						</button>
					) : (
						<div className="mb-12 flex w-full max-w-xs items-center justify-center gap-3 border-[4px] border-zinc-200 bg-zinc-100 py-4 font-black text-xl text-zinc-400 uppercase italic">
							<span className="material-symbols-outlined text-2xl">lock</span>
							{isReadOnly ? t("review.picksLocked") : t("review.noValidPicks")}
						</div>
					)}
				</div>
			</div>

			{/* COMPLETION MODAL */}
			{isSuccessModalOpen && (
				<SubmitBetsModal
					predictions={predictions}
					matchList={matches}
					onClose={() => setIsSuccessModalOpen(false)}
					tournamentId={tournamentId}
					userId={userId}
					stalePredictionMatchIds={stalePredictionMatchIds}
					editableRecoveryMatchIds={editableRecoveryMatchIds}
					onLockRecoveryMatch={onLockRecoveryMatch}
					onUpdatePrediction={onUpdatePrediction}
					userBets={userBets}
					onSuccess={() => {
						// Invalidar query de minhas apostas para recarregar
						queryClient.invalidateQueries({
							queryKey: ["myBets"],
							exact: false,
						});
					}}
					matchDayStatus={matchDayStatus}
				/>
			)}
		</>
	);
}

function SubmitBetsModal({
	predictions,
	matchList,
	onClose,
	tournamentId,
	userId,
	stalePredictionMatchIds = new Set(),
	editableRecoveryMatchIds = new Set(),
	onLockRecoveryMatch,
	onUpdatePrediction,
	userBets = [],
	onSuccess,
	matchDayStatus,
}: {
	predictions: Record<number, Prediction>;
	matchList: Match[];
	onClose: () => void;
	tournamentId: number;
	userId: string;
	onUpdatePrediction?: (
		matchId: number,
		winnerId: number,
		score?: string,
	) => void;
	stalePredictionMatchIds?: Set<number>;
	editableRecoveryMatchIds?: Set<number>;
	onLockRecoveryMatch?: (matchId: number) => void;
	userBets?: any[];
	matchDayStatus?: string;
	onSuccess?: () => void;
}) {
	const { t, i18n } = useTranslation("betting");
	const navigate = useNavigate();
	const { routeTo } = useLangLink();
	const [status, setStatus] = useState<
		"idle" | "submitting" | "success" | "error"
	>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [matchBetStats, setMatchBetStats] = useState<Record<number, BetStats>>({});

	// Calculate if there are any valid bets to submit
	const hasValidBetsToSubmit = useMemo(() => {
		const betsToSubmit = Object.entries(predictions)
			.map(([matchIdStr]) => {
				const matchId = Number.parseInt(matchIdStr);
				const match = matchList.find((m: any) => m.id === matchId);

				// Skip if match not found or explicitly started/finished
				if (!match || match.status === "live" || match.status === "finished") {
					return null;
				}

				// When matchday is locked, ONLY allow recovery bets (editable matches)
				// In recovery mode, we ALLOW stale predictions to be re-submitted
				if (matchDayStatus === "locked") {
					// Not in editable list = can't bet
					if (!editableRecoveryMatchIds.has(matchId)) {
						return null;
					}

					// In recovery mode, editable matches are always re-submittable (server does upsert).
					// Only block if there's truly no usable winner or score.
					const currentPred = predictions[matchId];
					if (!currentPred?.winnerId) {
						return null;
					}

					// Check for score - must have explicit score or server bet score
					const hasExplicitScore = currentPred?.score?.trim();
					const serverBet = userBets.find((b: any) => b.matchId === matchId);
					const hasServerScore =
						serverBet &&
						(serverBet.predictedScoreA !== undefined ||
							serverBet.predictedScoreB !== undefined);

					if (!hasExplicitScore && !hasServerScore) {
						return null;
					}
				}

				return { matchId };
			})
			.filter((bet): bet is NonNullable<typeof bet> => bet !== null);

		return betsToSubmit.length > 0;
	}, [
		predictions,
		matchList,
		stalePredictionMatchIds,
		editableRecoveryMatchIds,
		userBets,
		matchDayStatus,
	]);

	// Call onSuccess when status changes to success
	useEffect(() => {
		if (status === "success") {
			onSuccess?.();
		}
	}, [status, onSuccess]);

	// Fetch community bet stats for all pending matches when modal mounts
	useEffect(() => {
		const matchIds = Object.keys(predictions)
			.map(Number)
			.filter((id) => {
				const match = matchList.find((m: any) => m.id === id);
				return match && match.status !== "finished" && match.status !== "live";
			});

		if (matchIds.length === 0) return;

		let cancelled = false;

		(async () => {
			try {
				const { getMatchBetStats } = await import("@/server/bets");
				const results = await Promise.all(
					matchIds.map((id) => getMatchBetStats({ data: { matchId: id } })),
				);
				if (cancelled) return;
				const statsMap: Record<number, BetStats> = {};
				matchIds.forEach((id, i) => {
					if (results[i]) statsMap[id] = results[i];
				});
				setMatchBetStats(statsMap);
			} catch {
				// non-fatal — bars simply won't appear
			}
		})();

		return () => {
			cancelled = true;
		};
	}, []);

	const handleSubmit = async () => {
		setStatus("submitting");
		setErrorMessage(null);

		try {
			// Transform predictions to array and filter out started matches and stale predictions
			const betsToSubmit = Object.entries(predictions)
				.map(([matchIdStr, pred]) => {
					const matchId = Number.parseInt(matchIdStr);
					const match = matchList.find((m: any) => m.id === matchId);

					// Skip if match not found or explicitly started/finished
					// We allow betting on "scheduled" matches even if start time has passed,
					// as admin might be late to start it.
					if (
						!match ||
						match.status === "live" ||
						match.status === "finished"
					) {
						return null;
					}

					// In recovery mode (locked), be more restrictive:
					// Only submit bets for matches that are editable AND either:
					// 1. Have no server bet (new bet), OR
					// 2. The current prediction differs from server bet (changed bet)
					// In recovery mode, we ALLOW stale predictions to be re-submitted
					if (
						editableRecoveryMatchIds.size > 0 ||
						matchDayStatus === "locked"
					) {
						// Not in editable list = can't bet (including stale matches)
						if (!editableRecoveryMatchIds.has(matchId)) {
							return null;
						}

						// Check if this is a new or changed bet.
						// Use resolved score (with server fallback) to avoid false "changed" detection
						// when user hasn't modified a pre-filled bet.
						// NOTE: In recovery mode, we allow re-submission even if values are the same
						// because the server will block if the bet is already locked (isRecovery=true)
						// and the bracket hasn't changed.
						const serverBet = userBets.find((b: any) => b.matchId === matchId);

						// If no server bet exists, this is a new bet - allow it
						if (!serverBet) {
							// Continue to add this bet
						} else {
							// Server bet exists - check if it changed
							const currentPred = predictions[matchId];
							const serverBetScore = `${serverBet.predictedScoreA}-${serverBet.predictedScoreB}`;
							const resolvedCurrentScore =
								currentPred?.score?.trim() || serverBetScore;

							// Only skip if bet is EXACTLY the same AND not in recovery mode
							// In recovery mode, let the server decide
							const isUnchanged =
								currentPred?.winnerId === serverBet.predictedWinnerId &&
								resolvedCurrentScore === serverBetScore;

							if (isUnchanged && !serverBet.isRecovery) {
								// Bet unchanged and not a recovery bet - skip
								return null;
							}
							// If isRecovery=true, let server validate (it will block if bracket hasn't changed)
						}
					} else {
						// Not in recovery mode - skip stale predictions normally
						if (stalePredictionMatchIds.has(matchId)) {
							return null;
						}
					}

					// Use local score if available; fall back to server bet score if exists.
					const serverBetForScore = userBets.find(
						(b: any) => b.matchId === matchId,
					);
					const resolvedScore =
						pred.score?.trim() ||
						(serverBetForScore
							? `${serverBetForScore.predictedScoreA}-${serverBetForScore.predictedScoreB}`
							: "");

					const [scoreA, scoreB] = resolvedScore
						.split("-")
						.map((s) => Number.parseInt(s.trim()));

					return {
						matchId,
						predictedWinnerId: pred.winnerId,
						predictedScoreA: isNaN(scoreA) ? 0 : scoreA,
						predictedScoreB: isNaN(scoreB) ? 0 : scoreB,
					};
				})
				.filter((bet): bet is NonNullable<typeof bet> => bet !== null);

			if (betsToSubmit.length === 0) {
				throw new Error("No valid bets to submit (matches may have started).");
			}

			const { submitMultipleBets } = await import("@/server/bets");
			await submitMultipleBets({
				data: {
					bets: betsToSubmit,
					lang: i18n.language === "en" ? "en" : "pt",
				},
			});

			// After successful submission:
			// 1. Update local predictions with the resolved scores so the review screen
			//    shows the correct score (e.g. "3-2") instead of "?-?" on next open.
			// 2. Lock recovery matches so they can't be re-edited in this session.
			betsToSubmit.forEach((bet) => {
				onUpdatePrediction?.(
					bet.matchId,
					bet.predictedWinnerId,
					`${bet.predictedScoreA}-${bet.predictedScoreB}`,
				);
				onLockRecoveryMatch?.(bet.matchId);
			});

			setStatus("success");
			// Clear localStorage after updating predictions — localStorage will be written
			// again immediately by the persistence effect with the correct scores above.
			const key = `bse-predictions-${tournamentId}-${userId}`;
			localStorage.removeItem(key);
		} catch (error: any) {
			console.error("[SUBMIT BETS] Error submitting bets:", error);
			setStatus("error");
			setErrorMessage(
				error.message || "Failed to submit bets. Please try again.",
			);
		}
	};

	if (status === "success") {
		return (
			<div className="fade-in fixed inset-0 z-[200] flex animate-in items-center justify-center bg-black/60 p-6 backdrop-blur-md duration-300">
				<div className="zoom-in-95 relative flex w-full max-w-md transform animate-in flex-col items-center overflow-hidden border-[6px] border-black bg-brawl-yellow p-8 text-center shadow-[16px_16px_0px_0px_#000] duration-500">
					{/* Background decoration */}
					<div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
					<div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-brawl-red/20 blur-2xl" />

					<div className="mb-6 flex h-24 w-24 rotate-3 items-center justify-center rounded-full border-[4px] border-black bg-white shadow-[4px_4px_0px_0px_#000]">
						<span className="material-symbols-outlined font-black text-6xl text-green-500">
							celebration
						</span>
					</div>

					<h3 className="mb-4 -skew-x-12 transform font-black font-display text-5xl text-black uppercase italic leading-none tracking-tighter">
						{t("review.successTitle")}{" "}
						<span className="text-brawl-red">
							{t("review.successTitleHighlight")}
						</span>
					</h3>

					<p className="mb-8 font-body font-bold text-black text-lg leading-snug">
						{t("toast.confirmed")}
					</p>

					<button
						onClick={() => {
							onClose();
							// Navigate to my-bets page
							navigate(routeTo("/my-bets"));
						}}
						className="w-full border-[4px] border-black bg-black py-4 font-black text-lg text-white uppercase tracking-widest shadow-[6px_6px_0px_0px_#ccff00] transition-all hover:bg-zinc-800 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
					>
						{t("review.viewMyBets")}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="fade-in fixed inset-0 z-[200] flex animate-in items-center justify-center bg-black/60 p-6 backdrop-blur-md duration-300">
			<div className="relative flex w-full max-w-md flex-col items-center overflow-hidden border-[6px] border-black bg-white p-8 text-center shadow-[16px_16px_0px_0px_#000]">
				<h3 className="mb-4 font-black font-display text-3xl text-black uppercase italic">
					{t("review.confirmTitle")}
				</h3>

				<p className="mb-4 font-body font-bold text-gray-600">
					{t("review.description")}
				</p>

				{/* Bet summary list with community stats */}
				{Object.keys(predictions).length > 0 && (
					<div className="mb-6 w-full max-h-[35vh] overflow-y-auto space-y-3">
						{Object.entries(predictions).map(([matchIdStr, pred]) => {
							const matchId = Number(matchIdStr);
							const match = matchList.find((m: any) => m.id === matchId);
							if (!match || match.status === "live" || match.status === "finished")
								return null;
							if (matchDayStatus === "locked" && !editableRecoveryMatchIds.has(matchId))
								return null;

							const teamAName = match.teamA?.name ?? "Time A";
							const teamBName = match.teamB?.name ?? "Time B";
							const pickedTeamName =
								pred.winnerId === match.teamA?.id
									? teamAName
									: pred.winnerId === match.teamB?.id
										? teamBName
										: "?";
							const stats = matchBetStats[matchId];

							return (
								<div
									key={matchId}
									className="w-full rounded-sm border-2 border-black bg-[#fafafa] p-3 text-left shadow-[2px_2px_0_0_#000]"
								>
									<div className="mb-2 flex items-center justify-between">
										<span className="font-black text-[10px] text-gray-500 uppercase tracking-wider">
											{teamAName} vs {teamBName}
										</span>
										<span className="rounded-sm border border-black bg-[#ccff00] px-1.5 py-0.5 font-black text-[9px] text-black uppercase">
											{pickedTeamName}
										</span>
									</div>
									{stats && (
										<BetSplitBar
											teamAName={teamAName}
											teamBName={teamBName}
											stats={stats}
											compact
										/>
									)}
								</div>
							);
							})}
						</div>
					)}

				{status === "error" && (
					<div className="mb-6 w-full border-2 border-red-500 bg-red-100 p-3 text-left font-bold text-red-700 text-xs">
						⚠️ {errorMessage}
					</div>
				)}

				<div className="flex w-full gap-3">
					<button
						onClick={onClose}
						disabled={status === "submitting"}
						className="flex-1 border-[3px] border-black bg-gray-200 py-3 font-black text-black uppercase shadow-[4px_4px_0px_0px_#000] transition-all hover:bg-gray-300 active:shadow-none"
					>
						{t("common:actions.cancel")}
					</button>
					<button
						onClick={handleSubmit}
						disabled={status === "submitting" || !hasValidBetsToSubmit}
						className={clsx(
							"flex flex-1 items-center justify-center gap-2 border-[3px] border-black py-3 font-black uppercase shadow-[4px_4px_0px_0px_#000] transition-all active:shadow-none",
							hasValidBetsToSubmit
								? "bg-brawl-red text-white hover:bg-red-600"
								: "cursor-not-allowed bg-gray-300 text-gray-500",
						)}
					>
						{status === "submitting" ? (
							<span className="material-symbols-outlined animate-spin">
								refresh
							</span>
						) : (
							<span>{t("review.lockIn")}</span>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}

// Recovery Bets Toast Component
function RecoveryBetsToast({
	matchCount,
	onDismiss,
	onAction,
}: {
	matchCount: number;
	onDismiss: () => void;
	onAction: () => void;
}) {
	const { t } = useTranslation("betting");
	const [isVisible, setIsVisible] = useState(true);
	useEffect(() => {
		if (!isVisible) {
			const timer = setTimeout(onDismiss, 300);
			return () => clearTimeout(timer);
		}
	}, [isVisible, onDismiss]);

	if (matchCount === 0) return null;

	return (
		<div
			className={clsx(
				"fixed top-24 left-1/2 z-[100] w-full max-w-md -translate-x-1/2 px-4 transition-all duration-300",
				isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0",
			)}
		>
			<div className="border-[4px] border-black bg-brawl-yellow p-4 shadow-[8px_8px_0px_0px_#000]">
				<div className="flex items-start gap-3">
					<span className="material-symbols-outlined text-3xl text-black">
						notification_important
					</span>
					<div className="flex-1">
						<h4 className="font-black font-display text-black text-lg uppercase italic">
							{t("recovery.available")}
						</h4>
						<p className="mt-1 font-bold text-black/80 text-sm">
							{t("recovery.errorPrompt")}
						</p>
						<div className="mt-3 flex gap-2">
							<button
								onClick={() => {
									setIsVisible(false);
									onAction();
								}}
								className="flex-1 border-[3px] border-black bg-black py-2 font-black text-sm text-white uppercase shadow-[3px_3px_0px_0px_#ccff00] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
							>
								Ver Agora
							</button>
							<button
								onClick={() => setIsVisible(false)}
								className="px-4 py-2 font-bold text-black/60 transition-colors hover:text-black"
							>
								Ignorar
							</button>
						</div>
					</div>
				</div>
				{/* Close button */}
				<button
					onClick={() => setIsVisible(false)}
					className="absolute top-2 right-2 text-black/50 transition-colors hover:text-black"
				>
					<span className="material-symbols-outlined">close</span>
				</button>
			</div>
		</div>
	);
}

function Home() {
	const { t } = useTranslation("betting");
	const { tournaments, isAuthenticated, userId } = Route.useLoaderData() as any;
	const searchParams = Route.useSearch();

	// Recovery bets toast state
	const [recoveryToast, setRecoveryToast] = useState<{
		show: boolean;
		matchCount: number;
	} | null>(null);

	// Tournament selection state
	const [selectedTournamentId, setSelectedTournamentId] = useState<
		number | null
	>(null);
	const [tournamentData, setTournamentData] = useState<{
		carouselMatches: Match[];
		bracketMatches: Match[];
		userBets: any[];
		matchDays: any[];
		activeMatchDayId: number | null;
		tournamentStages: Array<{ id: string; type: string }>;
	} | null>(null);
	const [selectedMatchDayId, setSelectedMatchDayId] = useState<number | null>(
		null,
	);
	const [isLoadingTournament, setIsLoadingTournament] = useState(false);

	const [viewMode, setViewMode] = useState<"list" | "bracket">("list");
	const [showReview, setShowReview] = useState(false);
	const userRequestedReview = useRef(false);

	const handleOpenReview = useCallback(() => {
		userRequestedReview.current = true;
		setShowReview(true);
	}, []);

	const handleCloseReview = useCallback(() => {
		userRequestedReview.current = false;
		setShowReview(false);
	}, []);

	// Reset userRequestedReview ref when review closes for any reason
	useEffect(() => {
		if (!showReview) {
			userRequestedReview.current = false;
		}
	}, [showReview]);

	// Clear state when user changes
	useEffect(() => {
		setPredictions({});
		setTournamentData(null);
		setSelectedTournamentId(null);
		setShowReview(false);
		setRecoveryToast(null);
	}, [userId]);

	// Effect to show recovery bets toast when user lands on home (only once per load)
	useEffect(() => {
		if (tournaments && tournaments.length > 0) {
			const totalRecoveryMatches = tournaments.reduce(
				(acc: number, t: any) => acc + (t.recoveryMatchCount || 0),
				0,
			);
			if (totalRecoveryMatches > 0) {
				setRecoveryToast((prev) =>
					prev ? prev : { show: true, matchCount: totalRecoveryMatches },
				);
			}
		}
	}, [tournaments]);

	// Auto-select if slug provided in URL via dashboard or if only 1 tournament
	useEffect(() => {
		// 1. URL Parameter has highest priority
		if (searchParams.tournament) {
			const target = tournaments.find(
				(t: any) => t.slug === searchParams.tournament,
			);

			// Only select if found
			if (target) {
				if (selectedTournamentId !== target.id) {
					handleSelectTournament(target.id);
				}
				// Found the specific target, so we stop here
				return;
			}
		}

		// 2. If no URL param OR param not found, auto-select if only 1 tournament exists
		if (tournaments.length === 1 && !selectedTournamentId) {
			handleSelectTournament(tournaments[0].id);
		}
	}, [tournaments, selectedTournamentId, searchParams.tournament]);

	// Reset view mode to carousel when match day changes
	useEffect(() => {
		setViewMode("list");
	}, [selectedMatchDayId]);

	// Load tournament data on selection
	const handleSelectTournament = async (tournamentId: number) => {
		setSelectedTournamentId(tournamentId);
		setSelectedMatchDayId(null);
		setIsLoadingTournament(true);
		setTournamentData(null);
		setPredictions({});
		setShowReview(false);

		try {
			const data = await getHomeTournamentData({ data: { tournamentId } });

			setTournamentData({
				// Show all matches in carousel, not just betting-enabled ones
				// The match day status controls whether betting is allowed
				carouselMatches: data.matches.sort((a, b) => {
					const roundA = a.roundIndex ?? 0;
					const roundB = b.roundIndex ?? 0;
					if (roundA !== roundB) return roundA - roundB;
					return (a.displayOrder || 0) - (b.displayOrder || 0);
				}),
				bracketMatches: data.matches,
				userBets: data.userBets,
				matchDays: data.matchDays,
				activeMatchDayId: data.activeMatchDayId,
				tournamentStages: data.tournamentStages,
			});

			// Keep match day unselected so user always goes through Match Day selector.
			// This avoids jumping directly to carousel on refresh when only one tournament is available.
			setSelectedMatchDayId(null);
		} catch (err) {
			console.error("Failed to load tournament data", err);
		} finally {
			setIsLoadingTournament(false);
		}
	};

	// Derived state
	const allCarouselMatches = tournamentData?.carouselMatches ?? [];
	const allBracketMatches = tournamentData?.bracketMatches ?? [];
	const userBets = tournamentData?.userBets ?? [];
	const matchDays = tournamentData?.matchDays ?? [];
	const activeMatchDayId = tournamentData?.activeMatchDayId;
	const selectedTournamentName =
		tournaments.find((t: any) => t.id === selectedTournamentId)?.name ||
		undefined;

	const targetTournamentFromSearch = searchParams.tournament
		? tournaments.find((t: any) => t.slug === searchParams.tournament)
		: null;
	const isBootstrappingTournamentSelection =
		!selectedTournamentId &&
		((searchParams.tournament && !!targetTournamentFromSearch) ||
			tournaments.length === 1);

	// Filter matches by selected match day
	const carouselMatches = useMemo(() => {
		if (!selectedMatchDayId) return allCarouselMatches;

		const isFromSelectedMatchDay = (m: any) =>
			Number(m.matchDayId) === Number(selectedMatchDayId);

		// Filter by matchDayId, but also include matches without matchDayId if no matches found
		const filtered = allCarouselMatches.filter(isFromSelectedMatchDay);

		// If no matches found for this matchDayId, show matches without matchDayId as fallback
		if (filtered.length === 0) {
			return allCarouselMatches.filter((m: any) => !m.matchDayId);
		}

		return filtered;
	}, [allCarouselMatches, selectedMatchDayId]);

	// Bracket view shows matches for the selected match day only
	const bracketMatches = useMemo(() => {
		if (!selectedMatchDayId || !matchDays.length) {
			return allBracketMatches;
		}

		// Get matches for the selected match day only
		const matchDayMatches = allBracketMatches.filter(
			(m: any) => Number(m.matchDayId) === Number(selectedMatchDayId),
		);

		// If no matches for this match day, show all (fallback for tournaments without match days)
		if (matchDayMatches.length === 0) {
			return allBracketMatches;
		}

		// Return only matches from the selected match day
		return matchDayMatches;
	}, [allBracketMatches, selectedMatchDayId, matchDays]);

	// Swiss stage: detect and filter matches belonging to the Swiss stage
	const swissMatches = useMemo(() => {
		const swissStage = tournamentData?.tournamentStages?.find(
			(s: any) => s.type === "Swiss",
		);
		if (!swissStage) return [];
		return bracketMatches.filter(
			(m: any) => String(m.stageId) === String(swissStage.id),
		);
	}, [bracketMatches, tournamentData?.tournamentStages]);

	const hasSwissStage = swissMatches.length > 0;

	// Get selected match day info
	const selectedMatchDay = useMemo(() => {
		return matchDays.find(
			(md: any) => Number(md.id) === Number(selectedMatchDayId),
		);
	}, [matchDays, selectedMatchDayId]);

	// Determine if we are in read-only mode (already submitted for THIS match day OR match day is closed)
	const isReadOnly = useMemo(() => {
		if (!selectedMatchDayId) return userBets.length > 0;

		// Get selected match day
		const selectedMatchDay = matchDays.find(
			(md: any) => Number(md.id) === Number(selectedMatchDayId),
		);

		// Draft or finished = always read only
		if (
			selectedMatchDay?.status === "draft" ||
			selectedMatchDay?.status === "finished"
		) {
			return true;
		}

		// Open status: Read only only if ALL eligible matches already have bets
		// and no existing bet has a stale prediction (predicted team no longer in match)
		if (selectedMatchDay?.status === "open") {
			const matchIdsInSelectedDay = allCarouselMatches
				.filter((m: any) => Number(m.matchDayId) === Number(selectedMatchDayId))
				.map((m: any) => m.id);

			const hasAnyBet = userBets.some((bet: any) =>
				matchIdsInSelectedDay.includes(bet.matchId),
			);

			if (!hasAnyBet) return false;

			// If there are eligible matches without bets → allow betting
			const eligibleMatches = allCarouselMatches
				.filter((m: any) => Number(m.matchDayId) === Number(selectedMatchDayId))
				.filter((m: any) => {
					const hasTeamA = Boolean(m.teamA?.id ?? m.teamAId);
					const hasTeamB = Boolean(m.teamB?.id ?? m.teamBId);
					return m.status === "scheduled" && hasTeamA && hasTeamB;
				});

			const betIds = new Set(
				userBets
					.filter((bet: any) => matchIdsInSelectedDay.includes(bet.matchId))
					.map((bet: any) => Number(bet.matchId)),
			);

			const hasUnbetEligible = eligibleMatches.some(
				(m: any) => !betIds.has(Number(m.id)),
			);

			if (hasUnbetEligible) return false;

			// Check if any existing bet has a stale prediction
			// (predicted team no longer part of the current match lineup)
			const hasStalePrediction = userBets.some((bet: any) => {
				if (!matchIdsInSelectedDay.includes(bet.matchId)) return false;
				const match = allCarouselMatches.find(
					(m: any) => Number(m.id) === Number(bet.matchId),
				);
				if (!match) return false;
				if (match.status !== "scheduled") return false;
				const predictedId = Number(bet.predictedWinnerId);
				const teamAId = match.teamA?.id ? Number(match.teamA.id) : null;
				const teamBId = match.teamB?.id ? Number(match.teamB.id) : null;
				return (
					predictedId !== teamAId &&
					predictedId !== teamBId &&
					predictedId !== 0
				);
			});

			if (hasStalePrediction) return false;

			return true;
		}

		// Locked status: Read only is FALSE (Recovery Mode)
		// Individual matches will still be locked if they are live/finished
		if (selectedMatchDay?.status === "locked") {
			return false;
		}

		return false;
	}, [userBets, selectedMatchDayId, allCarouselMatches, matchDays]);

	// Shared state for predictions
	const [predictions, setPredictions] = useState<Record<number, Prediction>>(
		{},
	);

	// Track which recovery bets have been saved (locked)
	const [lockedRecoveryMatchIds, setLockedRecoveryMatchIds] = useState<
		Set<number>
	>(new Set());

	// Detect predictions that need to be reset due to wrong predictions in dependent matches
	// ONLY applies when matchday is LOCKED (matches in progress/finished)
	const stalePredictionMatchIds = useMemo(() => {
		const staleIds = new Set<number>();

		// Only apply stale logic when matchday is locked
		const matchDayStatus = selectedMatchDay?.status;
		if (matchDayStatus !== "locked" || !selectedMatchDayId) return staleIds;

		const uniqueMatchesMap = new Map();
		allBracketMatches.forEach((match) => {
			if (!uniqueMatchesMap.has(match.id)) {
				uniqueMatchesMap.set(match.id, match);
			}
		});
		const uniqueMatches = Array.from(uniqueMatchesMap.values());

		// Find matches where real result differs from user's prediction
		const wrongPredictions = uniqueMatches.filter((match) => {
			if (match.status !== "finished" || !match.winnerId) return false;
			// Walkovers should not invalidate downstream user predictions.
			if (match.resultType === "wo") return false;
			const userPrediction = predictions[match.id];
			if (!userPrediction) return false;
			return userPrediction.winnerId !== match.winnerId;
		});

		// For each wrong prediction, find dependent matches and mark them as stale
		wrongPredictions.forEach((match) => {
			const visited = new Set<number>();

			const markDependentAsStale = (parentMatchId: number) => {
				if (visited.has(parentMatchId)) return;
				visited.add(parentMatchId);

				// Find matches that depend on this match's outcome
				// A match depends on this match if its teamAPreviousMatchId or teamBPreviousMatchId
				// equals the parentMatchId (backward navigation)
				uniqueMatches.forEach((m) => {
					if (m.status !== "scheduled") return;

					const dependsOnParent =
						(m.teamAPreviousMatchId &&
							Number(m.teamAPreviousMatchId) === parentMatchId) ||
						(m.teamBPreviousMatchId &&
							Number(m.teamBPreviousMatchId) === parentMatchId);

					if (dependsOnParent && predictions[m.id]) {
						const userPred = predictions[m.id];
						const teamIds = [m.teamA?.id, m.teamB?.id].filter(Boolean);
						if (!teamIds.includes(userPred.winnerId)) {
							staleIds.add(m.id);
							markDependentAsStale(m.id);
						}
					}
				});
			};

			markDependentAsStale(match.id);
		});

		return staleIds;
	}, [allBracketMatches, predictions, selectedMatchDay, selectedMatchDayId]);

	// Apply predictions to project matches
	const projectedMatches = useMemo(() => {
		const uniqueMatchesMap = new Map();
		allBracketMatches.forEach((match) => {
			if (!uniqueMatchesMap.has(match.id)) {
				uniqueMatchesMap.set(match.id, match);
			}
		});
		const uniqueMatches = Array.from(uniqueMatchesMap.values());

		const projected = uniqueMatches.map((m) => ({
			...m,
			teamA: m.teamA ? { ...m.teamA } : null,
			teamB: m.teamB ? { ...m.teamB } : null,
		}));

		const matchMap = new Map(projected.map((m) => [m.id, m]));

		uniqueMatches.forEach((match) => {
			const showResult = match.status === "live" || match.status === "finished";
			if (!showResult || !match.winnerId) return;

			const winnerId = Number(match.winnerId);
			const teamAId =
				match.teamA?.id !== undefined ? Number(match.teamA.id) : null;

			const winnerTeam = winnerId === teamAId ? match.teamA : match.teamB;
			const loserTeam = winnerId === teamAId ? match.teamB : match.teamA;

			if (match.nextMatchWinnerId) {
				const nextMatch = matchMap.get(match.nextMatchWinnerId);
				if (nextMatch) {
					if (match.nextMatchWinnerSlot === "A") nextMatch.teamA = winnerTeam;
					if (match.nextMatchWinnerSlot === "B") nextMatch.teamB = winnerTeam;
				}
			}
			if (match.nextMatchLoserId) {
				const nextMatch = matchMap.get(match.nextMatchLoserId);
				if (nextMatch) {
					if (match.nextMatchLoserSlot === "A") nextMatch.teamA = loserTeam;
					if (match.nextMatchLoserSlot === "B") nextMatch.teamB = loserTeam;
				}
			}
		});

		Object.entries(predictions).forEach(([matchIdStr, prediction]) => {
			const matchId = Number.parseInt(matchIdStr);
			const match = matchMap.get(matchId);
			if (!match) return;
			if (match.status === "live" || match.status === "finished") return;

			const winnerId = Number(prediction.winnerId);
			const teamAId =
				match.teamA?.id !== undefined ? Number(match.teamA.id) : null;

			const winnerTeam = winnerId === teamAId ? match.teamA : match.teamB;
			const loserTeam = winnerId === teamAId ? match.teamB : match.teamA;

			if (match.nextMatchWinnerId) {
				const nextMatch = matchMap.get(match.nextMatchWinnerId);
				if (nextMatch) {
					if (match.nextMatchWinnerSlot === "A") nextMatch.teamA = winnerTeam;
					if (match.nextMatchWinnerSlot === "B") nextMatch.teamB = winnerTeam;
				}
			}
			if (match.nextMatchLoserId) {
				const nextMatch = matchMap.get(match.nextMatchLoserId);
				if (nextMatch) {
					if (match.nextMatchLoserSlot === "A") nextMatch.teamA = loserTeam;
					if (match.nextMatchLoserSlot === "B") nextMatch.teamB = loserTeam;
				}
			}
		});

		return projected;
	}, [allBracketMatches, predictions]);

	// Calculate which matches can be edited in recovery mode
	const editableRecoveryMatchIds = useMemo(() => {
		const editableIds = new Set<number>();

		// Check if ANY match day is locked in this tournament.
		// If we have a specific selectedMatchDay, we use its status as primary,
		// otherwise we check if the tournament has any locked days.
		const isTournamentInRecovery = matchDays.some(
			(md: any) => md.status === "locked",
		);
		if (!isTournamentInRecovery && selectedMatchDay?.status !== "locked") {
			return editableIds;
		}

		const wrongMatchIds = new Set<number>();
		projectedMatches.forEach((match) => {
			// Logic: A match is "wrong" if it's finished and (user has no bet OR user has wrong prediction)
			if (match.status !== "finished" || !match.winnerId) return;
			// Do not treat walkovers as wrong predictions for recovery purposes.
			if (match.resultType === "wo") return;

			const mId = Number(match.id);
			const serverBet = userBets.find((b: any) => Number(b.matchId) === mId);

			if (
				!serverBet || // Missing bet counts as "wrong" for dependency purposes
				Number(serverBet.predictedWinnerId) !== Number(match.winnerId)
			) {
				wrongMatchIds.add(mId);
			}
		});

		const findAllDependents = (sourceIds: Set<number>): Set<number> => {
			const result = new Set<number>();
			const toProcess = Array.from(sourceIds);

			while (toProcess.length > 0) {
				const matchId = Number(toProcess.shift());

				allBracketMatches.forEach((m: any) => {
					if (m.status !== "scheduled") return;

					const dependsOnCurrent =
						(m.teamAPreviousMatchId &&
							Number(m.teamAPreviousMatchId) === matchId) ||
						(m.teamBPreviousMatchId &&
							Number(m.teamBPreviousMatchId) === matchId);

					if (dependsOnCurrent) {
						const descendantId = Number(m.id);
						if (!result.has(descendantId)) {
							result.add(descendantId);
							toProcess.push(descendantId);
						}
					}
				});
			}

			return result;
		};

		const dependentMatchIds = findAllDependents(wrongMatchIds);
		const userBetsByMatchId = new Map<number, any>();
		userBets.forEach((bet: any) => {
			userBetsByMatchId.set(Number(bet.matchId), bet);
		});
		const bracketMatchById = new Map<number, any>();
		allBracketMatches.forEach((m: any) => {
			bracketMatchById.set(Number(m.id), m);
		});

		// Core Logic: Decide which scheduled matches are actually editable for recovery.
		projectedMatches.forEach((match: any) => {
			const matchId = Number(match.id);
			if (match.status !== "scheduled") return;
			if (match.resultType === "wo") return;

			const serverBet = userBetsByMatchId.get(matchId);

			// Check if this is a bracket match
			const isBracketMatch = isBracketMatchLike({
				teamAPreviousMatchId: match.teamAPreviousMatchId,
				teamBPreviousMatchId: match.teamBPreviousMatchId,
				roundIndex: match.roundIndex,
				bracketSide: match.bracketSide,
				label: match.label,
			});

			// CASE 1: Match depends on a wrong prediction (parent match was wrong)
			// Check if user already has a recovery bet for this match with the SAME matchup
			if (dependentMatchIds.has(matchId)) {
				const recoveryBet = userBets.find(
					(b: any) => Number(b.matchId) === matchId && b.isRecovery,
				);

				if (recoveryBet) {
					// User has recovery bet - check if matchup changed
					// Get the teams that were in the match when user placed the bet
					// We can infer this from the predictedWinnerId and the match structure
					const currentTeamAId = match.teamA?.id
						? Number(match.teamA.id)
						: null;
					const currentTeamBId = match.teamB?.id
						? Number(match.teamB.id)
						: null;

					// The matchup is the same if both teams are still the same
					// We need to check if the user's prediction is still valid for current matchup
					const matchupChanged =
						!currentTeamAId ||
						!currentTeamBId ||
						(recoveryBet.predictedWinnerId !== currentTeamAId &&
							recoveryBet.predictedWinnerId !== currentTeamBId);

					if (!matchupChanged) {
						// Matchup is the as when user placed bet - already submitted, don't allow re-edit
						return;
					}
					// Matchup changed - allow re-edit
				}
				editableIds.add(matchId);
				return;
			}

			// We only care about matches where lineups are known for remaining cases
			if (!match.teamA?.id || !match.teamB?.id) return;

			// CASE 2: Bracket match without a server bet (missed bet entirely)
			if (isBracketMatch && !serverBet) {
				editableIds.add(matchId);
				return;
			}

			// CASE 2.5: User already has a pre-lock bracket bet, and at least one
			// immediate parent match was finalized against the user's prediction.
			// This unlocks scenarios like X vs Y becoming X vs Z, but avoids opening
			// unrelated matches/finals.
			const parentIds = [
				match.teamAPreviousMatchId ? Number(match.teamAPreviousMatchId) : null,
				match.teamBPreviousMatchId ? Number(match.teamBPreviousMatchId) : null,
			].filter((id): id is number => Boolean(id));

			const hasImmediateParentMismatch = parentIds.some((parentId) => {
				const parentMatch = bracketMatchById.get(parentId);
				if (!parentMatch) return false;
				if (parentMatch.status !== "finished") return false;
				if (parentMatch.resultType === "wo") return false;
				if (!parentMatch.winnerId) return false;

				const parentBet = userBetsByMatchId.get(parentId);
				if (!parentBet) return true;

				return (
					Number(parentBet.predictedWinnerId) !== Number(parentMatch.winnerId)
				);
			});

			if (
				isBracketMatch &&
				serverBet &&
				!serverBet.isRecovery &&
				hasImmediateParentMismatch
			) {
				editableIds.add(matchId);
				return;
			}

			// CASE 3: User has a bet, but contestants changed due to bracket progression
			if (serverBet) {
				const predicted = Number(serverBet.predictedWinnerId);
				const teamAId = Number(match.teamA?.id);
				const teamBId = Number(match.teamB?.id);
				if (predicted !== teamAId && predicted !== teamBId) {
					editableIds.add(matchId);
				}
			}
		});

		lockedRecoveryMatchIds.forEach((id) => editableIds.delete(Number(id)));

		// Handle recovery bets: Lock them UNLESS:
		// 1. The match is in dependentMatchIds (bracket changed), OR
		// 2. The predicted team is no longer in the match
		userBets.forEach((bet: any) => {
			if (bet.isRecovery) {
				const matchId = Number(bet.matchId);
				// If match is in dependentMatchIds, it's already editable (bracket changed)
				if (dependentMatchIds.has(matchId)) {
					return; // Keep editable - bracket changed
				}

				// Match is NOT dependent - check if team is still in match
				const match = projectedMatches.find(
					(m: any) => Number(m.id) === matchId,
				);
				if (match) {
					const teamAId = match.teamA?.id ? Number(match.teamA.id) : null;
					const teamBId = match.teamB?.id ? Number(match.teamB.id) : null;
					const predictedId = Number(bet.predictedWinnerId);

					const predictedTeamInMatch =
						(teamAId && teamAId === predictedId) ||
						(teamBId && teamBId === predictedId);

					if (predictedTeamInMatch) {
						// Team still in match - lock it (prevent abuse)
						editableIds.delete(matchId);
					}
					// If team NOT in match, keep editable (bracket changed but not caught by dependentMatchIds)
				}
			}
		});

		return editableIds;
	}, [
		projectedMatches,
		allBracketMatches,
		selectedMatchDay?.status,
		userBets,
		lockedRecoveryMatchIds,
	]);

	const editableRecoveryMatchIdsForSelectedDay = useMemo(() => {
		if (!selectedMatchDayId) return editableRecoveryMatchIds;

		const allowedIds = new Set(
			allBracketMatches
				.filter((m: any) => Number(m.matchDayId) === Number(selectedMatchDayId))
				.map((m: any) => Number(m.id)),
		);

		return new Set(
			Array.from(editableRecoveryMatchIds).filter((id) =>
				allowedIds.has(Number(id)),
			),
		);
	}, [allBracketMatches, selectedMatchDayId, editableRecoveryMatchIds]);

	// Safety: hide recovery toast if, after loading the tournament, there are no
	// actually editable recovery matches (server count can be stale/inaccurate).
	// Uses { show: false } (not null) to avoid re-triggering the show effect.
	useEffect(() => {
		if (
			recoveryToast?.show &&
			selectedMatchDayId &&
			selectedMatchDay?.status === "locked" &&
			editableRecoveryMatchIdsForSelectedDay.size === 0 &&
			!isLoadingTournament
		) {
			setRecoveryToast((prev) => (prev ? { ...prev, show: false } : prev));
		}
	}, [
		recoveryToast?.show,
		selectedMatchDayId,
		selectedMatchDay?.status,
		editableRecoveryMatchIdsForSelectedDay.size,
		isLoadingTournament,
	]);

	// Quick debug for recovery flow.
	// Enable with: /?debugRecovery=1
	useEffect(() => {
		if (typeof window === "undefined") return;
		const isDebugEnabled =
			new URLSearchParams(window.location.search).get("debugRecovery") === "1";
		if (!isDebugEnabled) return;

		const selectedDayMatches = allBracketMatches.filter((m: any) =>
			selectedMatchDayId
				? Number(m.matchDayId) === Number(selectedMatchDayId)
				: true,
		);

		const rows = selectedDayMatches.map((m: any) => {
			const id = Number(m.id);
			const serverBet = userBets.find((b: any) => Number(b.matchId) === id);
			return {
				id,
				status: m.status,
				resultType: m.resultType ?? null,
				winnerId: m.winnerId ?? null,
				matchDayStatus: m.matchDay?.status ?? selectedMatchDay?.status ?? null,
				teamAId: m.teamA?.id ?? m.teamAId ?? null,
				teamBId: m.teamB?.id ?? m.teamBId ?? null,
				inEditableRecovery: editableRecoveryMatchIdsForSelectedDay.has(id),
				inStalePredictions: stalePredictionMatchIds.has(id),
				hasLocalPrediction: Boolean(predictions[id]),
				hasServerBet: Boolean(serverBet),
				serverBetIsRecovery: Boolean(serverBet?.isRecovery),
			};
		});

		const suspiciousWalkovers = rows.filter(
			(r) =>
				r.resultType === "wo" && (r.inEditableRecovery || r.inStalePredictions),
		);

		const tournamentRecoveryCount = tournaments.reduce(
			(acc: number, t: any) => acc + (t.recoveryMatchCount || 0),
			0,
		);

		console.groupCollapsed(
			`[RecoveryDebug] tournament=${selectedTournamentId ?? "none"} matchDay=${selectedMatchDayId ?? "none"}`,
		);
		console.log("tournamentRecoveryCount", tournamentRecoveryCount);
		console.log(
			"editableRecoveryCount(selectedDay)",
			editableRecoveryMatchIdsForSelectedDay.size,
		);
		console.log("editableRecoveryCount(all)", editableRecoveryMatchIds.size);
		console.log("stalePredictionsCount", stalePredictionMatchIds.size);
		console.table(rows);
		if (suspiciousWalkovers.length > 0) {
			console.warn(
				"[RecoveryDebug] WO matches still flagged as recovery/stale:",
				suspiciousWalkovers,
			);
		}
		console.groupEnd();
	}, [
		selectedTournamentId,
		selectedMatchDayId,
		selectedMatchDay?.status,
		allBracketMatches,
		userBets,
		predictions,
		tournaments,
		editableRecoveryMatchIdsForSelectedDay,
		editableRecoveryMatchIds,
		stalePredictionMatchIds,
	]);

	// Derive eligible matches and pending bets for auto-review decision
	const matchesInSelectedDay = allCarouselMatches.filter(
		(m: any) => Number(m.matchDayId) === Number(selectedMatchDayId),
	);

	const eligibleMatchesInSelectedDay = matchesInSelectedDay.filter((m: any) => {
		const hasTeamA = Boolean(m.teamA?.id ?? m.teamAId);
		const hasTeamB = Boolean(m.teamB?.id ?? m.teamBId);
		return m.status === "scheduled" && hasTeamA && hasTeamB;
	});

	const betMatchIdsInSelectedDay = new Set(
		userBets
			.filter((bet: any) =>
				matchesInSelectedDay.some(
					(m: any) => Number(m.id) === Number(bet.matchId),
				),
			)
			.map((bet: any) => Number(bet.matchId)),
	);

	const hasUnbetEligibleMatchesInSelectedDay =
		eligibleMatchesInSelectedDay.some(
			(m: any) => !betMatchIdsInSelectedDay.has(Number(m.id)),
		);

	// Auto-redirect to review if user has bets but no matches available to bet on FOR THE SELECTED MATCH DAY
	useEffect(() => {
		if (!tournamentData || !selectedMatchDayId) return;

		const selectedMatchDay = matchDays.find(
			(md: any) => Number(md.id) === Number(selectedMatchDayId),
		);

		// Priority gate: if there are eligible matches without bets, stay in betting mode
		// Skip if user manually clicked "Review"
		if (hasUnbetEligibleMatchesInSelectedDay && !userRequestedReview.current) {
			if (showReview) {
				setShowReview(false);
			}
			return;
		}

		// Fallback: auto-enter review when no bets are pending
		const matchIdsInSelectedDay = allCarouselMatches
			.filter((m: any) => Number(m.matchDayId) === Number(selectedMatchDayId))
			.map((m: any) => m.id);

		const hasBetsInSelectedDay = userBets.some((bet: any) =>
			matchIdsInSelectedDay.includes(bet.matchId),
		);

		if (
			selectedMatchDay?.status === "finished" ||
			(selectedMatchDay?.status === "locked" &&
				editableRecoveryMatchIdsForSelectedDay.size > 0) ||
			hasBetsInSelectedDay
		) {
			if (!showReview) {
				setShowReview(true);
			}
		} else {
			// Only auto-exit review if user has NO server bets AND NO local predictions
			const hasLocalPredictions = Object.keys(predictions).length > 0;
			if (showReview && !hasLocalPredictions) {
				setShowReview(false);
			}
		}
	}, [
		selectedMatchDayId,
		selectedTournamentId,
		tournamentData,
		userBets,
		isReadOnly,
		matchDays,
		allCarouselMatches,
		predictions,
		showReview,
		hasUnbetEligibleMatchesInSelectedDay,
		editableRecoveryMatchIdsForSelectedDay.size,
	]);

	// Persistence: Load from localStorage on mount (ONLY if not read-only)
	useEffect(() => {
		if (!tournamentData) return;

		// Safety check: Avoid overwriting state if the user has already started making changes
		// in this session (e.g. they clicked a team and then something triggered this effect).
		if (Object.keys(predictions).length > 0) return;

		if (isReadOnly) {
			const initial: Record<number, Prediction> = {};
			userBets.forEach((bet: any) => {
				initial[bet.matchId] = {
					winnerId: bet.predictedWinnerId ?? 0,
					score: `${bet.predictedScoreA}-${bet.predictedScoreB}`,
				};
			});
			setPredictions(initial);
		} else {
			const key = `bse-predictions-${selectedTournamentId}-${userId}`;
			const saved = localStorage.getItem(key);
			if (saved) {
				try {
					const parsed = JSON.parse(saved);

					// Recovery Mode Repair: If we have a saved draft but scores are missing for
					// matches that have server bets, pre-fill them now.
					if (selectedMatchDay?.status === "locked") {
						userBets.forEach((bet: any) => {
							if (parsed[bet.matchId] && !parsed[bet.matchId].score) {
								parsed[bet.matchId].score =
									`${bet.predictedScoreA}-${bet.predictedScoreB}`;
							}
						});
					}

					// Validate predicted winners still belong to current match rosters.
					// Admin may have swapped teams after predictions were saved.
					for (const match of allCarouselMatches) {
						const mid = Number(match.id);
						const pred = parsed[mid];
						if (!pred?.winnerId) continue;
						const tA = match.teamA?.id ? Number(match.teamA.id) : null;
						const tB = match.teamB?.id ? Number(match.teamB.id) : null;
						const predictedId = Number(pred.winnerId);
						if (predictedId !== tA && predictedId !== tB) {
							delete parsed[mid];
						}
					}

					setPredictions(parsed);
				} catch (e) {
					console.error("Failed to load predictions", e);
				}
			} else if (selectedMatchDay?.status === "locked") {
				// Recovery Mode: Pre-fill with existing server bets if no local draft exists.
				// We now pre-fill the actual score as well to avoid the "?-?" display issue.
				const initial: Record<number, Prediction> = {};
				userBets.forEach((bet: any) => {
					// Skip bets where the predicted team is no longer in the match
					// (admin may have swapped teams after the bet was placed)
					const match = allCarouselMatches.find(
						(m: any) => Number(m.id) === Number(bet.matchId),
					);
					const predictedId = Number(bet.predictedWinnerId);
					const teamAId = match?.teamA?.id ? Number(match.teamA.id) : null;
					const teamBId = match?.teamB?.id ? Number(match.teamB.id) : null;
					if (predictedId !== teamAId && predictedId !== teamBId) return;

					initial[bet.matchId] = {
						winnerId: predictedId,
						score: `${bet.predictedScoreA}-${bet.predictedScoreB}`,
					};
				});
				setPredictions(initial);
			}
		}
	}, [
		isReadOnly,
		userBets,
		tournamentData,
		selectedTournamentId,
		userId,
		selectedMatchDayId,
		selectedMatchDay,
		allCarouselMatches,
	]);

	// Persistence: Save to localStorage when change (ONLY if not read-only)
	useEffect(() => {
		if (
			!isReadOnly &&
			Object.keys(predictions).length > 0 &&
			selectedTournamentId &&
			userId
		) {
			const key = `bse-predictions-${selectedTournamentId}-${userId}`;
			localStorage.setItem(key, JSON.stringify(predictions));
		}
	}, [predictions, isReadOnly, selectedTournamentId, userId]);

	// Reset session-only lockedRecoveryMatchIds when the user navigates to a different
	// tournament or match day. Does NOT run on userBets refresh (after submit), preserving
	// the in-session lock so submitted recovery bets stay locked until navigation.
	useEffect(() => {
		if (!selectedTournamentId || !selectedMatchDayId) return;
		// Also clean up any stale localStorage key from an old persistence mechanism.
		const recoveryKey = `bse-recovery-locked-${selectedTournamentId}-${userId}-${selectedMatchDayId}`;
		localStorage.removeItem(recoveryKey);
		setLockedRecoveryMatchIds(new Set());
	}, [selectedTournamentId, selectedMatchDayId, userId]);

	// Note: lockedRecoveryMatchIds is intentionally NOT persisted to localStorage.
	// It's session-only to prevent double-clicking submit within the same session.
	// On page refresh, matches become editable again. This is safe because the server
	// stores bets via upsert — submitting again just updates the existing bet.

	const updatePrediction = (
		matchId: number,
		winnerId: number,
		score?: string,
	) => {
		const mId = Number(matchId);
		const wId = Number(winnerId);

		setPredictions((prev) => {
			const current = prev[mId];
			let newScore = score ?? current?.score ?? "";

			if (
				current &&
				Number(current.winnerId) !== wId &&
				newScore.includes("-")
			) {
				const parts = newScore.split("-").map((s: string) => s.trim());
				if (parts.length === 2 && !score) {
					newScore = `${parts[1]}-${parts[0]}`;
				}
			}

			return {
				...prev,
				[mId]: {
					winnerId: wId,
					score: newScore,
				},
			};
		});
	};

	const removePrediction = (matchId: number) => {
		setPredictions((prev) => {
			const newPredictions = { ...prev };
			delete newPredictions[matchId];
			return newPredictions;
		});
	};

	// Show Landing Page for unauthenticated users
	if (!isAuthenticated) {
		return <LandingPage isAuthenticated={false} />;
	}

	// Show Tournament Selector if no tournament selected yet (and multiple exist)
	if (!selectedTournamentId && tournaments.length > 1) {
		return (
			<TournamentSelector
				tournaments={tournaments}
				onSelect={handleSelectTournament}
			/>
		);
	}

	// Show empty state if no tournaments
	if (tournaments.length === 0) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-paper bg-paper-texture p-6">
				<div className="w-full max-w-md text-center">
					<div className="relative inline-block w-full overflow-hidden border-[4px] border-black bg-white p-8 shadow-[8px_8px_0px_0px_#000]">
						{/* Corner decorations */}
						<div className="absolute -top-2 -right-2 h-4 w-4 border-2 border-black bg-[#ccff00]" />
						<div className="absolute -bottom-2 -left-2 h-4 w-4 border-2 border-black bg-brawl-red" />

						<div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-black bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
							<Trophy className="h-10 w-10 text-gray-300" strokeWidth={3} />
						</div>
						<h3 className="mb-3 -skew-x-12 transform font-black font-display text-black text-xl uppercase italic tracking-tighter md:text-3xl">
							Carregando torneio...
						</h3>
						<p className="font-bold text-gray-500 text-sm uppercase leading-relaxed tracking-widest">
							Volte em breve para acompanhar <br /> novos torneios competitivos!
						</p>
					</div>
				</div>
			</div>
		);
	}

	// Loading state: tournament selection in progress OR tournament selected but data not yet loaded
	if (
		isLoadingTournament ||
		isBootstrappingTournamentSelection ||
		(selectedTournamentId && matchDays.length === 0)
	) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-paper bg-paper-texture">
				<div className="space-y-4 text-center">
					<div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-black border-t-[#ccff00]" />
					<h2 className="animate-pulse font-black font-display text-2xl text-black uppercase italic">
						{t("empty.noTournament")}
					</h2>
				</div>
			</div>
		);
	}

	// Show Match Day Selector if tournament is selected but no match day chosen
	// Only show when matchDays has data to avoid empty state flicker
	if (selectedTournamentId && !selectedMatchDayId && matchDays.length > 0) {
		return (
			<div className="relative flex min-h-screen w-full flex-col bg-paper pt-16 md:pt-0">
				{/* Back button */}
				{tournaments.length > 1 && (
					<button
						onClick={() => {
							setSelectedTournamentId(null);
							setTournamentData(null);
							setPredictions({});
							setShowReview(false);
						}}
						className="fixed bottom-6 left-4 z-[90] flex w-fit items-center gap-2 border-[3px] border-black bg-white px-4 py-2 font-black text-black text-xs uppercase shadow-[4px_4px_0px_0px_#000] transition-all hover:bg-gray-50 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none md:top-28 md:bottom-auto md:left-4"
					>
						<span className="material-symbols-outlined text-base">
							arrow_back
						</span>
						Tournaments
					</button>
				)}

				<MatchDaySelector
					matchDays={matchDays.map((md: any) => ({
						...md,
						matchCount: allBracketMatches.filter(
							(m: any) => Number(m.matchDayId) === Number(md.id),
						).length,
					}))}
					activeMatchDayId={activeMatchDayId ?? null}
					onSelect={(matchDayId) => setSelectedMatchDayId(matchDayId)}
					tournamentName={selectedTournamentName}
				/>
			</div>
		);
	}

	const hasMatches = carouselMatches.length > 0;

	return (
		<div className="flex min-h-screen w-full flex-col bg-paper pt-16 md:pt-0">
			{/* Recovery Bets Toast — only when no tournament is selected yet */}
			{recoveryToast?.show && !selectedTournamentId && (
				<RecoveryBetsToast
					matchCount={recoveryToast.matchCount}
					onDismiss={() => setRecoveryToast({ ...recoveryToast, show: false })}
					onAction={() => {
						// Find first tournament with recovery bets and select it
						const tWithRecovery = tournaments.find(
							(t: any) => t.hasRecoveryBets,
						);
						if (tWithRecovery) {
							handleSelectTournament(tWithRecovery.id);
						}
					}}
				/>
			)}

			{/* BACK BUTTON - returns to match day selector or tournament selector */}
			{selectedMatchDayId && (
				<button
					onClick={() => {
						setSelectedMatchDayId(null);
						setShowReview(false);
					}}
					className="fixed bottom-6 left-4 z-[90] flex items-center gap-2 border-[3px] border-black bg-white px-4 py-2.5 font-black text-[10px] text-black uppercase shadow-[4px_4px_0px_0px_#000] transition-all hover:bg-gray-50 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none md:top-28 md:bottom-auto md:text-xs"
				>
					<span className="material-symbols-outlined text-base">
						arrow_back
					</span>
					{matchDays.length > 1 ? "Match Days" : "Voltar"}
				</button>
			)}

			{/* VIEW SWITCHER & ACTIONS */}
			{hasMatches && !showReview && (
				<div className="fixed right-4 bottom-6 z-[90] flex flex-col items-end gap-3 md:right-6 md:bottom-8">
					{/* View Results Button - Only show if user has bets */}
					{isReadOnly && (
						<button
							onClick={handleOpenReview}
							className="flex animate-pulse items-center gap-2 whitespace-nowrap border-[3px] border-black bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 font-black text-[10px] text-white uppercase shadow-[4px_4px_0px_0px_#000] transition-all hover:from-purple-700 hover:to-pink-700 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none md:px-6 md:py-3 md:text-sm md:shadow-[6px_6px_0px_0px_#000]"
						>
							<span className="material-symbols-outlined text-base">
								emoji_events
							</span>
							Ver Resultados
						</button>
					)}

					{!isReadOnly && (
						<div className="inline-flex overflow-hidden border-[3px] border-black bg-paper shadow-[4px_4px_0px_0px_#000] md:shadow-[6px_6px_0px_0px_#000]">
							<button
								onClick={() => setViewMode("list")}
								className={clsx(
									"relative flex items-center gap-2 px-3 py-2 font-black text-[10px] uppercase transition-all md:px-6 md:text-sm",
									viewMode === "list"
										? "bg-black text-white"
										: "bg-white text-black hover:bg-gray-100",
								)}
							>
								{viewMode === "list" && (
									<div className="pointer-events-none absolute inset-0 border-[#ccff00] border-[3px]" />
								)}
								<span className="material-symbols-outlined xs:inline hidden text-base">
									view_carousel
								</span>
								<span>{t("viewFeed")}</span>
							</button>
							<button
								onClick={() => setViewMode("bracket")}
								className={clsx(
									"relative flex items-center gap-2 border-black border-l-[3px] px-3 py-2 font-black text-[10px] uppercase transition-all md:px-6 md:text-sm",
									viewMode === "bracket"
										? "bg-black text-white"
										: "bg-white text-black hover:bg-gray-100",
								)}
							>
								{viewMode === "bracket" && (
									<div className="pointer-events-none absolute inset-0 border-[#ccff00] border-[3px]" />
								)}
								<span className="material-symbols-outlined xs:inline hidden text-base">
									account_tree
								</span>
								<span>{t("viewBracket")}</span>
							</button>
						</div>
					)}
				</div>
			)}

			{/* Match Day Status Banner */}
			{selectedMatchDay &&
				selectedTournamentId &&
				!showReview &&
				hasMatches &&
				(selectedMatchDay.status === "finished" ||
					selectedMatchDay.status === "locked") && (
					<div className="mx-auto w-full max-w-4xl px-4 pt-4 pb-4 md:pt-24">
						{selectedMatchDay.status === "finished" && (
							<div className="slide-in-from-top-4 mb-4 animate-in border-[3px] border-black bg-blue-500 p-4 shadow-[6px_6px_0px_0px_#000] duration-300">
								<div className="flex items-start gap-3">
									<span className="material-symbols-outlined flex-shrink-0 text-2xl text-white">
										check_circle
									</span>
									<div className="flex-1">
										<h3 className="font-black text-sm text-white uppercase">
											{selectedMatchDay.label} {t("matchDayComplete")}
										</h3>
										<p className="mt-1 text-blue-100 text-xs">
											Este match day foi finalizado.{" "}
											{matchDays.find((md: any) => md.status === "open")
												? t("matchDayNewAvailable")
												: t("empty.waitNextMatchDay")}
										</p>
									</div>
								</div>
							</div>
						)}
						{selectedMatchDay.status === "locked" && (
							<div className="slide-in-from-top-4 mb-4 animate-in border-[3px] border-black bg-purple-500 p-4 shadow-[6px_6px_0px_0px_#000] duration-300">
								<div className="flex items-start gap-3">
									<span className="material-symbols-outlined flex-shrink-0 text-2xl text-white">
										medical_services
									</span>
									<div className="flex-1">
										<h3 className="font-black text-sm text-white uppercase">
											{t("recovery.active")}
										</h3>
										<p className="mt-1 text-purple-100 text-xs">
											{t("recovery.errorPrompt")} {t("recovery.points")}
										</p>
									</div>
								</div>
							</div>
						)}
					</div>
				)}

			<div className="flex-grow">
				{showReview ? (
					<ReviewScreen
						matches={
							selectedMatchDayId
								? bracketMatches.filter(
										(m: any) =>
											Number(m.matchDayId) === Number(selectedMatchDayId),
									)
								: bracketMatches
						}
						predictions={predictions}
						onUpdatePrediction={updatePrediction}
						onBack={handleCloseReview}
						isReadOnly={isReadOnly}
						tournamentId={selectedTournamentId!}
						userId={userId}
						userBets={userBets.filter((bet: any) =>
							selectedMatchDayId
								? bracketMatches
										.filter(
											(m: any) =>
												Number(m.matchDayId) === Number(selectedMatchDayId),
										)
										.map((m: any) => m.id)
										.includes(bet.matchId)
								: true,
						)}
						setSelectedTournamentId={setSelectedTournamentId}
						setSelectedMatchDayId={setSelectedMatchDayId}
						setShowReview={setShowReview}
						setPredictions={setPredictions}
						matchDayStatus={selectedMatchDay?.status}
						onLockRecoveryMatch={(matchId) =>
							setLockedRecoveryMatchIds((prev) => new Set([...prev, matchId]))
						}
						stalePredictionMatchIds={stalePredictionMatchIds}
						projectedMatches={projectedMatches}
						editableRecoveryMatchIds={editableRecoveryMatchIdsForSelectedDay}
					/>
				) : viewMode === "list" ? (
					<BettingCarousel
						matches={carouselMatches.filter(
							(m: any) => m.status === "scheduled",
						)}
						predictions={predictions}
						onUpdatePrediction={updatePrediction}
						onShowReview={handleOpenReview}
						hasUserBets={
							!!selectedMatchDayId &&
							userBets.some((bet: any) =>
								allCarouselMatches
									.filter(
										(m: any) =>
											Number(m.matchDayId) === Number(selectedMatchDayId),
									)
									.map((m: any) => m.id)
									.includes(bet.matchId),
							)
						}
						isReadOnly={isReadOnly}
						editableMatchIds={editableRecoveryMatchIdsForSelectedDay}
						matchDayStatus={selectedMatchDay?.status}
					/>
				) : (
					<div
						className={
							hasSwissStage
								? "mx-auto w-full max-w-6xl pt-48 md:pt-4"
								: "pt-48 md:pt-4"
						}
					>
						{hasSwissStage ? (
							<SwissStageView
								matches={swissMatches}
								predictions={predictions}
								onUpdatePrediction={updatePrediction}
								onRemovePrediction={removePrediction}
								onShowReview={handleOpenReview}
								isReadOnly={isReadOnly}
								editableMatchIds={editableRecoveryMatchIdsForSelectedDay}
								matchDayStatus={selectedMatchDay?.status}
							/>
						) : (
							<TournamentBracket
								matches={bracketMatches}
								predictions={predictions}
								onUpdatePrediction={updatePrediction}
								onRemovePrediction={removePrediction}
								onReview={handleOpenReview}
								isReadOnly={isReadOnly}
								editableMatchIds={editableRecoveryMatchIdsForSelectedDay}
								matchDayStatus={selectedMatchDay?.status}
							/>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
