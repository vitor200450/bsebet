import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { clsx } from "clsx";
import { and, asc, eq, inArray, like, not } from "drizzle-orm";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BettingEmptyState } from "@/components/BettingEmptyState";
import { InlineLoader } from "@/components/inline-loader";
import { ReviewScreen } from "@/components/ReviewScreen";
import { deriveMatchFormat } from "@/lib/utils";
import { BettingCarousel } from "../../components/BettingCarousel";
import { LandingPage } from "../../components/LandingPage";
import { MatchDaySelector } from "../../components/MatchDaySelector";
import { PublicPageShell } from "../../components/PublicPageShell";
import { SwissStageView } from "../../components/SwissStageView";
import {
	type Match,
	type Prediction,
	TournamentBracket,
} from "../../components/TournamentBracket";
import { TournamentSelector } from "../../components/TournamentSelector";
import { canReturnToBetting as canReturnToBettingFromMatches } from "../../utils/bet-submission";
import {
	predictionsFromUserBets,
	pruneInvalidStoredPredictions,
} from "../../utils/prediction-persistence";
import { isBracketMatchLike } from "../../utils/recovery";
import {
	formatScoreDisplay,
	normalizeScoreDisplay,
} from "../../utils/score-format";

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
			with: { eventKind: true },
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
						region: m.teamA.region ?? null,
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
						region: m.teamB.region ?? null,
						seed: teamBStats?.seed ?? null,
						group: teamBStats?.group ?? null,
					}
				: null,
			tournamentName: tournament?.name ?? null,
			tournamentLogoUrl: tournament?.logoUrl ?? null,
			tournamentRegion: tournament?.region ?? null,
			tournamentPresentationTheme:
				(tournament as { eventKind?: { presentationTheme?: string } | null })
					?.eventKind?.presentationTheme ?? null,
			tournamentVenueMode:
				(tournament as { venueMode?: "online" | "lan" }).venueMode ?? "online",
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
				pointsA: (teamAForm?.wins || 0) * 3, // legacy field; UI uses form instead
				pointsB: (teamBForm?.wins || 0) * 3,
				formA: `${teamAForm?.wins || 0}-${teamAForm?.losses || 0}`,
				formB: `${teamBForm?.wins || 0}-${teamBForm?.losses || 0}`,
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

			// Single match day tournaments skip the selector — one less click.
			const loadedMatchDays = data.matchDays ?? [];
			if (loadedMatchDays.length === 1) {
				setSelectedMatchDayId(loadedMatchDays[0].id);
			} else {
				setSelectedMatchDayId(null);
			}
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

	const canReturnToBetting = useMemo(() => {
		if (!selectedMatchDayId) return false;

		return canReturnToBettingFromMatches({
			hasUnbetEligibleMatches: hasUnbetEligibleMatchesInSelectedDay,
			editableRecoveryMatchIds: editableRecoveryMatchIdsForSelectedDay,
			matches: matchesInSelectedDay.map((match: any) => ({
				matchId: Number(match.id),
				matchStatus: match.status,
				teamAId: match.teamA?.id ? Number(match.teamA.id) : null,
				teamBId: match.teamB?.id ? Number(match.teamB.id) : null,
			})),
			userBets,
			matchDayStatus: selectedMatchDay?.status,
			isReadOnly,
		});
	}, [
		selectedMatchDayId,
		hasUnbetEligibleMatchesInSelectedDay,
		editableRecoveryMatchIdsForSelectedDay,
		matchesInSelectedDay,
		userBets,
		selectedMatchDay?.status,
		isReadOnly,
	]);

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
					score: formatScoreDisplay(bet.predictedScoreA, bet.predictedScoreB),
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
								parsed[bet.matchId].score = formatScoreDisplay(
									bet.predictedScoreA,
									bet.predictedScoreB,
								);
							}
						});
					}

					for (const matchId of Object.keys(parsed)) {
						const pred = parsed[matchId];
						if (pred?.score) {
							parsed[matchId] = {
								...pred,
								score: normalizeScoreDisplay(pred.score),
							};
						}
					}

					// Validate predicted winners still belong to current match rosters.
					// Admin may have swapped teams after predictions were saved.
					// TBD bracket matches keep picks — roster is projection-driven.
					const pruned = pruneInvalidStoredPredictions(
						parsed,
						allCarouselMatches,
					);

					setPredictions(pruned);
				} catch (e) {
					console.error("Failed to load predictions", e);
				}
			} else {
				const initial = predictionsFromUserBets(userBets, allCarouselMatches);
				if (Object.keys(initial).length > 0) {
					setPredictions(initial);
				}
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

			if (score) {
				newScore = normalizeScoreDisplay(score);
			}

			if (
				current &&
				Number(current.winnerId) !== wId &&
				newScore.includes("-")
			) {
				const parts = newScore.split(/\s*-\s*/).map((s: string) => s.trim());
				if (parts.length === 2 && !score) {
					newScore = `${parts[1]} - ${parts[0]}`;
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
			<PublicPageShell>
				<BettingEmptyState
					icon="emoji_events"
					title={t("empty.noTournament")}
					description={t("empty.noTournamentHint")}
				/>
			</PublicPageShell>
		);
	}

	// Loading state: tournament selection in progress OR tournament selected but data not yet loaded
	if (
		isLoadingTournament ||
		isBootstrappingTournamentSelection ||
		(selectedTournamentId && matchDays.length === 0)
	) {
		return (
			<PublicPageShell className="flex items-center justify-center">
				<div className="relative z-10 space-y-4 text-center">
					<InlineLoader size="xl" className="mx-auto" />
					<h2 className="animate-pulse font-black font-display text-2xl text-black uppercase italic">
						{t("loading.tournament")}
					</h2>
				</div>
			</PublicPageShell>
		);
	}

	// Show Match Day Selector only when there are multiple days to choose from
	if (selectedTournamentId && !selectedMatchDayId && matchDays.length > 1) {
		return (
			<div className="relative flex min-h-[100dvh] w-full flex-col pt-16 md:pt-0">
				{/* Back button */}
				{tournaments.length > 1 && (
					<button
						type="button"
						onClick={() => {
							setSelectedTournamentId(null);
							setTournamentData(null);
							setPredictions({});
							setShowReview(false);
						}}
						className="fixed bottom-6 left-4 z-[90] flex w-fit items-center gap-2 border-[3px] border-black bg-white px-4 py-2 font-black font-display text-black text-xs uppercase shadow-comic-md transition-all hover:bg-gray-50 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none md:top-28 md:bottom-auto md:left-4"
					>
						<span className="material-symbols-outlined text-base">
							arrow_back
						</span>
						{t("tournament:selector.backToTournaments")}
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
		<PublicPageShell className="flex w-full flex-col pt-16 md:pt-0">
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

			{/* BACK BUTTON — match day selector (2+ days) or tournament list (single day) */}
			{selectedMatchDayId &&
				(matchDays.length > 1 || tournaments.length > 1) && (
					<button
						type="button"
						onClick={() => {
							setShowReview(false);
							if (matchDays.length > 1) {
								setSelectedMatchDayId(null);
								return;
							}
							// Single match day: skip the empty selector and go back to tournaments
							setSelectedMatchDayId(null);
							setSelectedTournamentId(null);
							setTournamentData(null);
							setPredictions({});
						}}
						className="fixed bottom-6 left-4 z-[90] flex items-center gap-2 border-[3px] border-black bg-white px-4 py-2.5 font-black font-display text-[10px] text-black uppercase shadow-comic-md transition-all hover:bg-gray-50 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none md:top-28 md:bottom-auto md:text-xs"
					>
						<span className="material-symbols-outlined text-base">
							arrow_back
						</span>
						{matchDays.length > 1
							? t("tournament:matchDay.selectTitle")
							: t("tournament:selector.backToTournaments")}
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
								type="button"
								onClick={() => setViewMode("list")}
								className={clsx(
									"relative flex items-center gap-2 px-3 py-2 font-black font-display text-[10px] uppercase transition-all md:px-6 md:text-sm",
									viewMode === "list"
										? "bg-ink text-white"
										: "bg-white text-ink hover:bg-paper",
								)}
							>
								{viewMode === "list" && (
									<div className="pointer-events-none absolute inset-0 border-[3px] border-electric-lime" />
								)}
								<span className="material-symbols-outlined xs:inline hidden text-base">
									view_carousel
								</span>
								<span>{t("viewFeed")}</span>
							</button>
							<button
								type="button"
								onClick={() => setViewMode("bracket")}
								className={clsx(
									"relative flex items-center gap-2 border-ink border-l-[3px] px-3 py-2 font-black font-display text-[10px] uppercase transition-all md:px-6 md:text-sm",
									viewMode === "bracket"
										? "bg-ink text-white"
										: "bg-white text-ink hover:bg-paper",
								)}
							>
								{viewMode === "bracket" && (
									<div className="pointer-events-none absolute inset-0 border-[3px] border-electric-lime" />
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
						canReturnToBetting={canReturnToBetting}
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
						userBets={userBets}
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
		</PublicPageShell>
	);
}
