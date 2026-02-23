import { createFileRoute, Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
	ArrowLeft,
	Calendar,
	Filter,
	MapPin,
	Sparkles,
	Trophy,
	Users,
	Workflow,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GSLResultView } from "@/components/GSLResultView";
import { MatchCard } from "@/components/MatchCard";
import { TournamentBracket } from "@/components/TournamentBracket";
import { TournamentPodium } from "@/components/TournamentPodium";
import { getIntermediateColor } from "@/lib/color-extractor";
import { extractColorsServer } from "@/server/color-extractor";
import { getTournamentBySlug } from "@/server/tournaments";

export const Route = createFileRoute("/tournaments/$slug")({
	loader: ({ params }) => getTournamentBySlug({ data: params.slug }),
	component: TournamentDetailsPage,
});

function TournamentDetailsPage() {
	const { tournament, matches, userBets } = Route.useLoaderData();
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
			cloned.forEach((m: any) => matchMap.set(String(m.id), m));

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
							m.label?.match(/Group\s+(\w+)/i)?.[0] || m.label || "Group Stage";
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

	// Performance Optimization: Group matches by side and round
	const groupedMatches = useMemo(() => {
		const groups: Record<string, any[]> = {};
		const other: any[] = [];

		filteredMatches.forEach((m: any) => {
			if (
				m.bracketSide === "groups" ||
				(m.label && m.label.includes("Group"))
			) {
				const groupName =
					m.label?.match(/Group\s+(\w+)/i)?.[0] || m.label || "Group Stage";
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
			if (reverseIdx === 0) roundNamesMap[rIdx] = "GRAND FINAL";
			else if (reverseIdx === 1) roundNamesMap[rIdx] = "SEMI-FINALS";
			else if (reverseIdx === 2) roundNamesMap[rIdx] = "QUARTER-FINALS";
			else roundNamesMap[rIdx] = `ROUND ${rIdx + 1}`;
		});

		return {
			groups: Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)),
			otherMatchesByRound: sortedRoundIndices.map((rIdx) => ({
				rIdx,
				matches: rounds[rIdx].sort(
					(mA, mB) =>
						(mA.displayOrder || 0) - (mB.displayOrder || 0) || mA.id - mB.id,
				),
			})),
			roundNames: roundNamesMap,
		};
	}, [filteredMatches]);

	return (
		<div className="min-h-screen bg-paper bg-paper-texture pb-20 font-sans text-ink">
			{/* Header Banner - Tournament Colors (Dynamic) */}
			<div
				className="relative overflow-hidden border-black border-b-4 text-white transition-all duration-500"
				style={{
					background: `linear-gradient(90deg,
            ${tournamentColors.primary} 0%,
            ${tournamentColors.primary} 15%,
            ${tournamentColors.intermediate} 50%,
            ${tournamentColors.secondary} 85%,
            ${tournamentColors.secondary} 100%)`,
				}}
			>
				{/* Pattern Overlay */}
				<div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />

				{/* Shine Effect */}
				<div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

				{/* Soft Darkening Overlays for depth */}
				<div className="absolute top-0 left-0 h-full w-full bg-gradient-to-b from-black/20 via-transparent to-black/20" />

				<div className="relative z-10 mx-auto max-w-7xl px-4 py-8">
					<div className="mb-6 flex items-start justify-between">
						<Link
							to="/tournaments"
							search={{ filter: "active" }}
							className="inline-flex items-center gap-2 font-bold text-sm text-white/80 uppercase tracking-wider transition-colors hover:text-white"
						>
							<ArrowLeft className="h-4 w-4" />
							Voltar para Torneios
						</Link>

						{matches.some(
							(m) => m.isBettingEnabled && m.status === "scheduled",
						) && (
							<Link
								to="/"
								className="fade-in slide-in-from-right inline-flex -rotate-1 transform animate-in items-center gap-2 border-2 border-black bg-[#ccff00] px-4 py-2 font-black text-[10px] text-black uppercase tracking-wider shadow-[4px_4px_0_0_#000] transition-all duration-500 hover:rotate-1 hover:scale-105 hover:bg-[#b8e600] active:translate-y-0.5 active:shadow-none md:text-sm"
							>
								<Sparkles className="h-4 w-4" />🔥 Mais Apostas
							</Link>
						)}
					</div>

					<div className="flex flex-col items-center gap-8 md:flex-row md:items-end">
						{/* Logo - Platinum 3D Style */}
						<div className="relative">
							{/* Glow effect */}
							<div className="absolute inset-0 scale-110 rounded-full bg-white/40 blur-3xl" />

							<div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl border-[6px] border-black bg-gradient-to-br from-gray-300 via-gray-100 to-gray-300 p-6 shadow-[8px_8px_0_0_#000,12px_12px_0_0_rgba(0,0,0,0.3)] md:h-48 md:w-48">
								{/* Metallic shine bars */}
								<div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent" />
								<div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent" />
								<div className="absolute top-0 right-0 left-0 h-1/3 bg-gradient-to-b from-white/50 to-transparent" />
								<div className="absolute right-0 bottom-0 left-0 h-1/4 bg-gradient-to-t from-black/20 to-transparent" />

								{/* Reflective highlights */}
								<div className="absolute top-4 left-4 h-12 w-12 rounded-full bg-white/70 blur-xl" />
								<div className="absolute right-6 bottom-6 h-8 w-8 rounded-full bg-black/10 blur-lg" />

								{tournament.logoUrl ? (
									<img
										src={tournament.logoUrl}
										alt={tournament.name}
										className="relative z-10 h-full w-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]"
									/>
								) : (
									<Trophy className="relative z-10 h-16 w-16 text-gray-400" />
								)}

								{/* Inner border highlight - platinum edge */}
								<div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-white/60" />
								<div className="pointer-events-none absolute inset-2 rounded-xl border border-black/10" />
							</div>

							{isActive && (
								<div className="absolute -right-4 -bottom-4 rotate-3 transform animate-pulse rounded border-2 border-black bg-[#ccff00] px-3 py-1 font-black text-black text-xs shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]">
									AO VIVO
								</div>
							)}
						</div>

						{/* Title & Info */}
						<div className="flex-1 text-center md:text-left">
							<div className="mb-3 flex flex-wrap items-center justify-center gap-3 md:justify-start">
								{tournament.region && (
									<span className="flex items-center gap-1.5 border-2 border-black bg-black px-3 py-1 font-black text-[#ccff00] text-[10px] uppercase tracking-widest shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]">
										<MapPin className="h-3 w-3" />
										{tournament.region}
									</span>
								)}
								<span className="flex items-center gap-1.5 border-2 border-black bg-black px-3 py-1 font-black text-[#ccff00] text-[10px] uppercase tracking-widest shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]">
									<Calendar className="h-3 w-3" />
									{formatDate(tournament.startDate)} -{" "}
									{formatDate(tournament.endDate)}
								</span>
							</div>

							<h1 className="mb-3 font-black text-5xl text-white uppercase italic leading-none tracking-tighter drop-shadow-[4px_4px_8px_rgba(0,0,0,0.4)] md:text-7xl">
								{tournament.name}
							</h1>

							<div className="flex flex-wrap items-center justify-center gap-4 font-bold font-mono text-sm text-white/90 uppercase md:justify-start">
								<span className="flex items-center gap-1.5">
									<Users className="h-4 w-4" />
									{tournament.participantsCount || 0} Times
								</span>
								<span>•</span>
								<span>
									{tournament.format ||
										(() => {
											const stages = (tournament.stages as any[]) || [];
											if (stages.length === 0) return "Formato Desconhecido";

											const types = Array.from(
												new Set(stages.map((s) => s.type)),
											);
											const typeMap: Record<string, string> = {
												Groups: "Fase de Grupos",
												"Single Elimination": "Playoffs",
												"Double Elimination": "Playoffs (Double)",
											};

											return types.map((t) => typeMap[t] || t).join(" + ");
										})()}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="mx-auto max-w-7xl px-4 py-8">
				{/* Tournament Podium - Only for finished tournaments */}
				{tournament.status === "finished" && (
					<div className="mb-10">
						<TournamentPodium
							tournamentId={tournament.id}
							tournamentName={tournament.name}
							tournamentLogoUrl={tournament.logoUrl}
						/>
					</div>
				)}

				{/* Filters */}
				<div className="mb-8 flex flex-wrap items-center gap-4">
					<FilterButton
						active={filter === "all"}
						onClick={() => setFilter("all")}
						label="Todos os Jogos"
					/>
					<FilterButton
						active={filter === "my-bets"}
						onClick={() => setFilter("my-bets")}
						label="Meus Palpites"
						badge={userBets.length}
					/>
					<div className="mx-2 hidden h-8 w-px bg-black/10 md:block" />
					<FilterButton
						active={filter === "upcoming"}
						onClick={() => setFilter("upcoming")}
						label="Em Breve"
					/>
					<FilterButton
						active={filter === "finished"}
						onClick={() => setFilter("finished")}
						label="Finalizados"
					/>
				</div>

				{/* Matches Grid */}
				<div className="space-y-4">
					{filteredMatches.length > 0 ? (
						<div className="flex flex-col gap-12">
							{filter === "all" || filter === "my-bets" ? (
								<>
									{/* Render GSL Groups */}
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
											<div key={groupName} className="space-y-4">
												<h3 className="inline-block -skew-x-12 transform bg-black px-4 py-2 font-black text-2xl text-white uppercase italic">
													{groupName}
												</h3>
												{groupMatches.map((match) => (
													<MatchCard
														key={match.id}
														match={{
															...match,
															category:
																match.bracketSide === "groups"
																	? "Fase de Grupos"
																	: "Playoffs",
															isBettingEnabled: match.isBettingEnabled ?? false,
															status: match.status as
																| "scheduled"
																| "live"
																| "finished",
															format: "bo3",
															teamA: match.teamA as any,
															teamB: match.teamB as any,
														}}
														initialBet={
															filter === "my-bets"
																? (userBets.find(
																		(b: any) => b.matchId === match.id,
																	) as any)
																: undefined
														}
														showPredictionScore={filter === "my-bets"}
													/>
												))}
											</div>
										);
									})}

									{/* Render Others (Playoffs, etc.) as a Bracket */}
									{groupedMatches.otherMatchesByRound.length > 0 && (
										<div className="mt-12 flex flex-col items-center gap-8 rounded-3xl border-4 border-black/5 bg-white/40 p-8 shadow-inner backdrop-blur-sm">
											<div className="mb-8 flex w-full items-center gap-4">
												<Workflow className="h-8 w-8 text-black" />
												<h3 className="font-black text-4xl text-black uppercase italic">
													Playoff Bracket
												</h3>
												<div className="h-1 flex-grow rounded-full bg-black/10" />
											</div>

											<div className="w-full overflow-x-auto pb-6">
												<TournamentBracket
													className="flex w-full min-w-max flex-col items-center"
													hideHeader={true}
													matches={filteredMatches.filter(
														(m: any) =>
															m.bracketSide !== "groups" &&
															!m.label?.includes("Group"),
													)}
													predictions={
														filter === "my-bets"
															? userBets.reduce(
																	(acc: any, bet: any) => {
																		// Find the match from the matches array to get the real winner
																		const match = matches.find(
																			(m: any) => m.id === bet.matchId,
																		);
																		acc[bet.matchId] = {
																			winnerId: bet.predictedWinnerId,
																			score: `${bet.predictedScoreA}-${bet.predictedScoreB}`,
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
										</div>
									)}
								</>
							) : (
								/* Simple List View for Status Filtering */
								<div className="flex flex-col gap-4">
									{filteredMatches
										.sort(
											(a, b) =>
												new Date(a.startTime).getTime() -
												new Date(b.startTime).getTime(),
										)
										.map((match) => (
											<MatchCard
												key={match.id}
												match={{
													...match,
													category:
														match.bracketSide === "groups"
															? "Fase de Grupos"
															: "Playoffs",
													isBettingEnabled: match.isBettingEnabled ?? false,
													status: match.status as
														| "scheduled"
														| "live"
														| "finished",
													format: "bo3",
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
						<div className="rounded-xl border-4 border-black/10 border-dashed bg-white py-20 text-center">
							<Filter className="mx-auto mb-4 h-12 w-12 text-gray-300" />
							<h3 className="font-black text-gray-400 text-xl uppercase italic">
								Nenhuma partida encontrada
							</h3>
							<p className="mt-1 font-bold text-gray-400 text-sm uppercase">
								Tente mudar os filtros
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function FilterButton({
	active,
	onClick,
	label,
	badge,
}: {
	active: boolean;
	onClick: () => void;
	label: string;
	badge?: number;
}) {
	return (
		<button
			onClick={onClick}
			className={clsx(
				"relative skew-x-[-6deg] transform border-2 px-4 py-2 font-black text-sm uppercase italic tracking-wider transition-all",
				active
					? "-translate-y-1 border-black bg-brawl-yellow text-black shadow-comic"
					: "border-black/10 bg-white text-gray-400 hover:border-black hover:text-black",
			)}
		>
			<span className="block flex skew-x-[6deg] items-center gap-2">
				{label}
				{badge !== undefined && badge > 0 && (
					<span className="rounded-full bg-brawl-red px-1.5 py-0.5 text-[10px] text-white not-italic">
						{badge}
					</span>
				)}
			</span>
		</button>
	);
}

function formatDate(date: Date | string | null) {
	if (!date) return "TBA";
	return new Date(date)
		.toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "short",
			timeZone: "UTC",
		})
		.toUpperCase()
		.replace(".", "");
}
