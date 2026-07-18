import { createFileRoute, Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
	Calendar,
	Filter,
	MapPin,
	Sparkles,
	Trophy,
	Users,
	Workflow,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	BannerMetaPill,
	bannerActionLinkClass,
	bannerBackLinkClass,
	EntityDetailBanner,
} from "@/components/EntityDetailBanner";
import {
	DetailEmptyState,
	DetailFilterTabs,
	DetailPanel,
} from "@/components/entity-detail-ui";
import { GSLResultView } from "@/components/GSLResultView";
import { MatchCard } from "@/components/MatchCard";
import { PublicPageShell } from "@/components/PublicPageShell";
import { RoundRobinResultView } from "@/components/RoundRobinResultView";
import { SwissStageView } from "@/components/SwissStageView";
import { TournamentBracket } from "@/components/TournamentBracket";
import { TournamentPodium } from "@/components/TournamentPodium";
import {
	getTournamentPresentationTheme,
	presentationThemeBadgeClass,
	venueModePillClass,
} from "@/components/tournament-presentation";
import { i18next } from "@/i18n";
import { useLangLink } from "@/i18n/useLangLink";
import { getIntermediateColor } from "@/lib/color-extractor";
import { deriveMatchFormat } from "@/lib/utils";
import { extractColorsServer } from "@/server/color-extractor";
import { getTournamentBySlug } from "@/server/tournaments";
import { formatScoreDisplay } from "@/utils/score-format";
import { resolveTournamentFormatLabel } from "@/utils/tournament-format";

export const Route = createFileRoute("/$lang/tournaments/$slug")({
	loader: ({ params }) => getTournamentBySlug({ data: params.slug }),
	component: TournamentDetailsPage,
});

function TournamentDetailsPage() {
	const { t } = useTranslation("tournament");
	const { linkTo } = useLangLink();
	const { tournament, matches, userBets } = Route.useLoaderData();
	const theme = getTournamentPresentationTheme(
		(tournament as { eventKind?: { presentationTheme: string } | null })
			.eventKind,
	);
	const themeBadge = presentationThemeBadgeClass(theme);
	const themeLabel =
		theme === "qualifier"
			? t("browse.themeQualifier")
			: theme === "monthly_finals"
				? t("browse.themeMonthlyFinals")
				: theme === "major"
					? t("browse.themeMajor")
					: null;
	const venueMode =
		(tournament as { venueMode?: "online" | "lan" }).venueMode ?? "online";
	const countsTowardGlobal =
		(tournament as { countsTowardGlobal?: boolean }).countsTowardGlobal ?? true;
	const [filter, setFilter] = useState<
		"all" | "my-bets" | "upcoming" | "finished"
	>("all");

	// State for tournament colors extracted from logo
	const [tournamentColors, setTournamentColors] = useState({
		primary: "#2e5cff",
		secondary: "#ff2e2e",
		intermediate: "#7f46d6",
	});

	// Extract colors from tournament logo using server-side function
	useEffect(() => {
		if (tournament.logoUrl) {
			extractColorsServer({ data: tournament.logoUrl })
				.then((colors) => {
					const intermediate = getIntermediateColor(
						colors.primary,
						colors.secondary,
					);
					setTournamentColors({
						primary: colors.primary,
						secondary: colors.secondary,
						intermediate,
					});
				})
				.catch((error) => {
					console.error("Error extracting colors:", error);
				});
		}
	}, [tournament.logoUrl]);

	// PROPAGATION LOGIC: Separated into Real and Predicted tracks
	const { realMatches, predictedMatches } = useMemo(() => {
		const teamsPool = new Map<string, any>();
		matches.forEach((m: any) => {
			if (m.teamA?.id) teamsPool.set(String(m.teamA.id), m.teamA);
			if (m.teamB?.id) teamsPool.set(String(m.teamB.id), m.teamB);
		});

		const runPropagation = (includePredictions: boolean) => {
			// 1. Clone matches to avoid mutating the original data
			const matchMap = new Map<string, any>();
			const cloned = JSON.parse(JSON.stringify(matches));
			cloned.forEach((m: any) => {
				matchMap.set(String(m.id), m);
			});

			// 2. Sort by order to ensure we process early rounds first
			const sortedIds = Array.from(matchMap.keys()).sort((a, b) => {
				const mA = matchMap.get(a);
				const mB = matchMap.get(b);
				return (
					(mA.roundIndex || 0) - (mB.roundIndex || 0) ||
					(mA.displayOrder || 0) - (mB.displayOrder || 0) ||
					mA.id - mB.id
				);
			});

			// 3. Propagate (5 passes for depth - supports up to 32 team brackets)
			for (let i = 0; i < 5; i++) {
				sortedIds.forEach((matchId) => {
					const match = matchMap.get(matchId);
					if (!match) return;

					// Skip group-stage matches – they use GSL propagation below
					if (match.bracketSide === "groups" || match.label?.includes("Group"))
						return;

					const bet = userBets.find((b: any) => String(b.matchId) === matchId);

					// Determine winner: Real result takes precedence. Prediction only if enabled.
					let winnerValue = match.winnerId;
					if (!winnerValue && includePredictions && bet) {
						winnerValue = bet.predictedWinnerId;
					}

					const winnerId = winnerValue ? String(winnerValue) : null;
					if (!winnerId) return;

					const teamAId = match.teamA?.id ? String(match.teamA.id) : null;
					const teamBId = match.teamB?.id ? String(match.teamB.id) : null;

					const winnerTeam =
						winnerId === teamAId
							? match.teamA
							: winnerId === teamBId
								? match.teamB
								: (teamsPool.get(winnerId) ?? null);

					const loserId = winnerId === teamAId ? teamBId : teamAId;
					const loserTeam = loserId
						? ((teamAId === loserId ? match.teamA : match.teamB) ??
							teamsPool.get(loserId) ??
							null)
						: null;

					// FIX: The bracket generator uses teamAPreviousMatchId/B (backward links).
					// nextMatchWinnerId is NEVER populated, so we scan child matches instead.
					matchMap.forEach((child) => {
						if (child.status === "finished") return;
						if (
							child.teamAPreviousMatchId &&
							String(child.teamAPreviousMatchId) === matchId
						) {
							const needsWinner =
								(child.teamAPreviousMatchResult || "winner") === "winner";
							const team = needsWinner ? winnerTeam : loserTeam;
							if (team) {
								child.teamA = team;
								child.labelTeamA = null;
							}
						}
						if (
							child.teamBPreviousMatchId &&
							String(child.teamBPreviousMatchId) === matchId
						) {
							const needsWinner =
								(child.teamBPreviousMatchResult || "winner") === "winner";
							const team = needsWinner ? winnerTeam : loserTeam;
							if (team) {
								child.teamB = team;
								child.labelTeamB = null;
							}
						}
					});
				});

				// GSL Specific Propagation
				const groups: Record<string, any[]> = {};
				matchMap.forEach((m) => {
					if (
						m.bracketSide === "groups" ||
						(m.label && m.label.includes("Group"))
					) {
						const groupName =
							m.label?.match(/Group\s+(\w+)/i)?.[0] ||
							m.label ||
							t("detail.groupStage");
						if (!groups[groupName]) groups[groupName] = [];
						groups[groupName].push(m);
					}
				});

				Object.values(groups).forEach((groupMatches) => {
					const findMatch = (patterns: string[]) =>
						groupMatches.find((m) => {
							const text = (m.name || m.label || "").toLowerCase();
							return patterns.some((p) => text.includes(p.toLowerCase()));
						});

					const openingMatches = groupMatches
						.filter((m) => {
							const text = (m.name || m.label || "").toLowerCase();
							return (
								text.includes("opening") ||
								text.includes("abertura") ||
								text.includes("rodada 1") ||
								(!text.includes("winner") &&
									!text.includes("loser") &&
									!text.includes("decider"))
							);
						})
						.sort((a, b) => a.id - b.id);

					const winnersMatch = findMatch(["winners", "vencedores", "winner"]);
					const elimMatch = findMatch(["elimination", "eliminação", "loser"]);
					const deciderMatch = findMatch(["decider", "decisiva", "decisivo"]);

					if (openingMatches.length >= 2) {
						const op1 = openingMatches[0];
						const op2 = openingMatches[1];

						const getOutcome = (m: any) => {
							const bet = userBets.find((b: any) => b.matchId === m.id);
							const wId =
								m.winnerId ||
								(includePredictions && bet ? bet.predictedWinnerId : null);
							if (!wId) return { w: null, l: null };

							const winnerTeam =
								wId === m.teamA?.id
									? m.teamA
									: wId === m.teamB?.id
										? m.teamB
										: teamsPool.get(wId);

							// Find loser: if winner is A, loser is B.
							const isWinnerA = wId === m.teamA?.id;
							const loserId = isWinnerA ? m.teamB?.id : m.teamA?.id;
							const loserTeam = loserId
								? teamsPool.get(loserId)
								: isWinnerA
									? m.teamB
									: m.teamA;

							return {
								w: winnerTeam,
								l: loserTeam,
							};
						};

						const out1 = getOutcome(op1);
						const out2 = getOutcome(op2);

						if (winnersMatch && winnersMatch.status !== "finished") {
							if (out1.w) {
								winnersMatch.teamA = out1.w;
								winnersMatch.labelTeamA = null;
							}
							if (out2.w) {
								winnersMatch.teamB = out2.w;
								winnersMatch.labelTeamB = null;
							}
						}
						if (elimMatch && elimMatch.status !== "finished") {
							if (out1.l) {
								elimMatch.teamA = out1.l;
								elimMatch.labelTeamA = null;
							}
							if (out2.l) {
								elimMatch.teamB = out2.l;
								elimMatch.labelTeamB = null;
							}
						}
					}

					if (
						winnersMatch &&
						elimMatch &&
						deciderMatch &&
						deciderMatch.status !== "finished"
					) {
						const getOutcome = (m: any) => {
							const bet = userBets.find((b: any) => b.matchId === m.id);
							const wId =
								m.winnerId ||
								(includePredictions && bet ? bet.predictedWinnerId : null);
							if (!wId) return { w: null, l: null };

							const winnerTeam =
								wId === m.teamA?.id
									? m.teamA
									: wId === m.teamB?.id
										? m.teamB
										: teamsPool.get(wId);

							// Find loser: if winner is A, loser is B.
							const isWinnerA = wId === m.teamA?.id;
							const loserId = isWinnerA ? m.teamB?.id : m.teamA?.id;
							const loserTeam = loserId
								? teamsPool.get(loserId)
								: isWinnerA
									? m.teamB
									: m.teamA;

							return {
								w: winnerTeam,
								l: loserTeam,
							};
						};
						const outWin = getOutcome(winnersMatch);
						const outElim = getOutcome(elimMatch);
						if (outWin.l) {
							deciderMatch.teamA = outWin.l;
							deciderMatch.labelTeamA = null;
						}
						if (outElim.w) {
							deciderMatch.teamB = outElim.w;
							deciderMatch.labelTeamB = null;
						}
					}
				});
			}
			return Array.from(matchMap.values());
		};

		return {
			realMatches: runPropagation(false),
			predictedMatches: runPropagation(true),
		};
	}, [matches, userBets]);

	const filteredMatches = (
		filter === "my-bets" ? predictedMatches : realMatches
	).filter((match: any) => {
		if (filter === "my-bets") {
			// For personal bets view, always show the playoff matches to maintain bracket structure
			// even if no direct bet exists yet for a specific round.
			if (match.bracketSide !== "groups" && !match.label?.includes("Group")) {
				return true;
			}
			return userBets.some((bet: any) => bet.matchId === match.id);
		}
		if (filter === "upcoming") {
			return match.status === "scheduled";
		}
		if (filter === "finished") {
			return match.status === "finished";
		}
		return true;
	});

	const isActive = tournament.status === "active";

	// Determine swiss stage ID for filtering
	const swissStageId = (tournament.stages as any[])?.find(
		(s: any) => s.type === "Swiss",
	)?.id;

	// Performance Optimization: Group matches by side and round
	const groupedMatches = useMemo(() => {
		const groups: Record<string, any[]> = {};
		const swiss: any[] = [];
		const other: any[] = [];

		filteredMatches.forEach((m: any) => {
			// Swiss matches: belongs to a swiss stage
			if (swissStageId && m.stageId === swissStageId) {
				swiss.push(m);
			} else if (
				m.bracketSide === "groups" ||
				(m.label && m.label.includes("Group"))
			) {
				const groupName =
					m.label?.match(/Group\s+(\w+)/i)?.[0] ||
					m.label ||
					t("detail.groupStage");
				if (!groups[groupName]) groups[groupName] = [];
				groups[groupName].push(m);
			} else {
				other.push(m);
			}
		});

		// Group otherMatches by Rounds
		const rounds: Record<number, any[]> = {};
		other.forEach((m: any) => {
			const r = m.roundIndex || 0;
			if (!rounds[r]) rounds[r] = [];
			rounds[r].push(m);
		});

		const sortedRoundIndices = Object.keys(rounds)
			.map(Number)
			.sort((a, b) => a - b);

		const roundNamesMap: Record<number, string> = {};
		sortedRoundIndices.forEach((rIdx) => {
			const totalRounds = sortedRoundIndices.length;
			const reverseIdx = totalRounds - rIdx - 1;
			if (reverseIdx === 0)
				roundNamesMap[rIdx] = t("detail.roundNames.grandFinal");
			else if (reverseIdx === 1)
				roundNamesMap[rIdx] = t("detail.roundNames.semiFinals");
			else if (reverseIdx === 2)
				roundNamesMap[rIdx] = t("detail.roundNames.quarterFinals");
			else
				roundNamesMap[rIdx] = t("detail.roundNames.round", {
					number: rIdx + 1,
				});
		});

		// Group swiss matches by round for SwissStageView
		const swissRounds = swiss.reduce(
			(acc: Record<number, any[]>, m: any) => {
				const r = m.roundIndex || 0;
				if (!acc[r]) acc[r] = [];
				acc[r].push(m);
				return acc;
			},
			{} as Record<number, any[]>,
		);
		const swissRoundKeys = Object.keys(swissRounds)
			.map(Number)
			.sort((a, b) => a - b);
		const swissRoundData = swissRoundKeys.map((rIdx) => ({
			roundLabel: t("swiss.round", { number: rIdx + 1 }),
			matches: swissRounds[rIdx].sort(
				(mA: any, mB: any) =>
					(mA.displayOrder || 0) - (mB.displayOrder || 0) || mA.id - mB.id,
			),
		}));

		// Build swiss bucket data from match results
		const swissBuckets: Record<
			string,
			Array<{
				id: number;
				name: string;
				logoUrl?: string | null;
				status?: string;
			}>
		> = {};
		const teamCache = new Map<
			number,
			{ wins: number; losses: number; name: string; logoUrl?: string | null }
		>();
		swiss.forEach((m: any) => {
			if (m.teamA?.id) {
				const current = teamCache.get(m.teamA.id) ?? {
					wins: 0,
					losses: 0,
					name: m.teamA.name,
					logoUrl: m.teamA.logoUrl,
				};
				if (m.status === "finished" && m.winnerId) {
					if (m.winnerId === m.teamA.id) current.wins += 1;
					else current.losses += 1;
				}
				teamCache.set(m.teamA.id, current);
			}
			if (m.teamB?.id) {
				const current = teamCache.get(m.teamB.id) ?? {
					wins: 0,
					losses: 0,
					name: m.teamB.name,
					logoUrl: m.teamB.logoUrl,
				};
				if (m.status === "finished" && m.winnerId) {
					if (m.winnerId === m.teamB.id) current.wins += 1;
					else current.losses += 1;
				}
				teamCache.set(m.teamB.id, current);
			}
		});
		for (const [teamId, stats] of teamCache.entries()) {
			const bucket = `${stats.wins}-${stats.losses}`;
			if (!swissBuckets[bucket]) swissBuckets[bucket] = [];
			swissBuckets[bucket].push({
				id: teamId,
				name: stats.name,
				logoUrl: stats.logoUrl,
			});
		}

		return {
			groups: Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)),
			swissRoundData,
			swissBuckets,
			otherMatchesByRound: sortedRoundIndices.map((rIdx) => ({
				rIdx,
				matches: rounds[rIdx].sort(
					(mA, mB) =>
						(mA.displayOrder || 0) - (mB.displayOrder || 0) || mA.id - mB.id,
				),
			})),
			roundNames: roundNamesMap,
			other,
		};
	}, [filteredMatches]);

	return (
		<PublicPageShell className="pb-20">
			<EntityDetailBanner
				colors={tournamentColors}
				topBar={
					<div className="flex items-center justify-between gap-3">
						<Link
							to={linkTo("/tournaments")}
							search={{ filter: "active" }}
							className={bannerBackLinkClass}
						>
							<span className="material-symbols-outlined text-lg">
								arrow_back
							</span>
							<span className="hidden sm:inline">{t("detail.back")}</span>
						</Link>

						{matches.some(
							(m) => m.isBettingEnabled && m.status === "scheduled",
						) ? (
							<Link to={linkTo("/")} className={bannerActionLinkClass}>
								<Sparkles className="h-4 w-4" strokeWidth={2.5} />
								{t("detail.bet")}
							</Link>
						) : null}
					</div>
				}
				logo={
					tournament.logoUrl ? (
						<img
							src={tournament.logoUrl}
							alt={tournament.name}
							className="h-full w-full object-contain"
						/>
					) : (
						<Trophy className="h-12 w-12 text-gray-300" strokeWidth={2} />
					)
				}
				logoBadge={
					isActive ? (
						<div className="surface-brawl-red absolute -right-2 -bottom-2 border-[3px] border-black px-2 py-1 font-black font-display text-xs uppercase shadow-comic-sm">
							{t("detail.live")}
						</div>
					) : null
				}
				meta={
					<>
						<span
							className={clsx(
								"rounded-none border-2 border-black px-2 py-1 font-body font-bold text-xs uppercase tracking-widest",
								venueModePillClass(venueMode),
							)}
						>
							{venueMode === "lan"
								? t("browse.venueLan")
								: t("browse.venueOnline")}
						</span>
						{themeLabel && themeBadge ? (
							<span
								className={clsx(
									"rounded-none border-2 border-black px-2 py-1 font-body font-bold text-xs uppercase tracking-widest",
									themeBadge,
								)}
							>
								{themeLabel}
							</span>
						) : null}
						{tournament.region ? (
							<BannerMetaPill>
								<MapPin className="h-3 w-3" strokeWidth={2.5} />
								{tournament.region}
							</BannerMetaPill>
						) : null}
						<BannerMetaPill>
							<Calendar className="h-3 w-3" strokeWidth={2.5} />
							{formatDate(tournament.startDate, t)} -{" "}
							{formatDate(tournament.endDate, t)}
						</BannerMetaPill>
						<BannerMetaPill>
							<Users className="h-3 w-3" strokeWidth={2.5} />
							{t("detail.teamCount", {
								count: tournament.participantsCount || 0,
							})}
						</BannerMetaPill>
					</>
				}
				title={tournament.name}
				subtitle={resolveTournamentFormatLabel(
					tournament.format,
					tournament.stages,
					t,
				)}
			/>

			<div className="relative z-10 mx-auto max-w-[1400px] px-4 py-8 md:px-6 md:py-10">
				{!countsTowardGlobal ? (
					<div className="surface-tape mb-6 border-[3px] border-black px-4 py-3 shadow-comic-sm">
						<p className="font-body font-bold text-black text-sm leading-relaxed">
							{t("detail.excludedFromGlobalNotice")}
						</p>
					</div>
				) : null}
				{tournament.status === "finished" ? (
					<div className="mb-6">
						<TournamentPodium tournamentId={tournament.id} />
					</div>
				) : null}

				<DetailFilterTabs
					className="mb-8"
					ariaLabel={t("detail.overview")}
					value={filter}
					onChange={setFilter}
					tabs={[
						{ key: "all", label: t("detail.filterAll") },
						{
							key: "my-bets",
							label: t("detail.filterMyBets"),
							count: userBets.length,
						},
						{ key: "upcoming", label: t("detail.filterUpcoming") },
						{ key: "finished", label: t("detail.filterFinished") },
					]}
				/>

				<div className="space-y-4">
					{filteredMatches.length > 0 ? (
						<div className="flex flex-col gap-12">
							{filter === "all" || filter === "my-bets" ? (
								<>
									{groupedMatches.groups.map(([groupName, groupMatches]) => {
										const hasOpening = groupMatches.some((m) => {
											const text = (m.label || m.name || "").toLowerCase();
											return (
												text.includes("opening") ||
												text.includes("abertura") ||
												text.includes("rodada 1") ||
												text.includes("round 1")
											);
										});

										const isGSL = hasOpening || groupMatches.length === 5;

										if (isGSL) {
											return (
												<GSLResultView
													key={groupName}
													groupName={groupName}
													matches={groupMatches}
													userBets={userBets}
													showPredictionScore={filter === "my-bets"}
												/>
											);
										}

										return (
											<RoundRobinResultView
												key={groupName}
												groupName={groupName}
												matches={groupMatches}
												userBets={userBets}
												showPredictionScore={filter === "my-bets"}
											/>
										);
									})}

									{groupedMatches.swissRoundData.length > 0 ? (
										<DetailPanel title={t("swiss.title")}>
											<SwissStageView
												buckets={groupedMatches.swissBuckets}
												groupedRounds={groupedMatches.swissRoundData}
												userBets={userBets}
												showPredictionScore={filter === "my-bets"}
											/>
										</DetailPanel>
									) : null}

									{groupedMatches.otherMatchesByRound.length > 0 ? (
										<DetailPanel
											className="mt-4"
											title={t("detail.playoffBracket")}
											icon={
												<Workflow
													className="h-6 w-6 text-ink"
													strokeWidth={2.5}
												/>
											}
										>
											<div className="w-full overflow-x-auto pb-4">
												<TournamentBracket
													className="flex w-full min-w-max flex-col items-center"
													hideHeader={true}
													matches={groupedMatches.other}
													predictions={
														filter === "my-bets"
															? userBets.reduce(
																	(acc: any, bet: any) => {
																		const match = matches.find(
																			(m: any) => m.id === bet.matchId,
																		);
																		acc[bet.matchId] = {
																			winnerId: bet.predictedWinnerId,
																			score: formatScoreDisplay(
																				bet.predictedScoreA,
																				bet.predictedScoreB,
																			),
																			pointsEarned: bet.pointsEarned,
																			isCorrect:
																				match?.winnerId ===
																				bet.predictedWinnerId,
																			isUnderdogPick: bet.isUnderdogPick,
																			isPerfectPick:
																				match?.scoreA === bet.predictedScoreA &&
																				match?.scoreB === bet.predictedScoreB,
																		};
																		return acc;
																	},
																	{} as Record<number, any>,
																)
															: {}
													}
													onUpdatePrediction={() => {}}
													isReadOnly={true}
												/>
											</div>
										</DetailPanel>
									) : null}
								</>
							) : (
								<div className="flex flex-col gap-4">
									{filteredMatches
										.sort((a, b) => {
											const roundA = a.roundIndex ?? 0;
											const roundB = b.roundIndex ?? 0;
											if (roundA !== roundB) return roundA - roundB;
											return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
										})
										.map((match) => (
											<MatchCard
												key={match.id}
												match={{
													...match,
													category:
														match.bracketSide === "groups"
															? t("detail.stageGroups")
															: t("detail.stagePlayoffs"),
													isBettingEnabled: match.isBettingEnabled ?? false,
													status: match.status as
														| "scheduled"
														| "live"
														| "finished",
													format: deriveMatchFormat(
														match.stageId,
														(tournament.stages as any[]) ?? null,
													),
													teamA: match.teamA as any,
													teamB: match.teamB as any,
												}}
												initialBet={userBets.find(
													(b: any) => b.matchId === match.id,
												)}
												showPredictionScore={false}
											/>
										))}
								</div>
							)}
						</div>
					) : (
						<DetailEmptyState
							icon={
								<Filter className="h-7 w-7 text-gray-500" strokeWidth={2} />
							}
							title={t("detail.noMatches")}
							hint={t("detail.emptyHint")}
						/>
					)}
				</div>
			</div>
		</PublicPageShell>
	);
}

function formatDate(date: Date | string | null, t: any) {
	if (!date) return t("detail.tba");
	const locale = i18next.language === "pt" ? "pt-BR" : "en-US";
	return new Date(date)
		.toLocaleDateString(locale, {
			day: "2-digit",
			month: "short",
			timeZone: "UTC",
		})
		.toUpperCase()
		.replace(".", "");
}
