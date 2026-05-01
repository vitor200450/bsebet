import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
	Calendar,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Clock,
	Filter,
	History,
	Layers,
	Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLangLink } from "@/i18n/useLangLink";
import { CustomSelect } from "@/components/admin/CustomInputs";
import { TeamLogo } from "@/components/TeamLogo";
import { getMyBets } from "@/functions/get-my-bets";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/$lang/my-bets")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ context }) => {
		if (!context.session) {
			throw redirect({ to: "/login" });
		}
	},
});

type FilterType = "all" | "pending" | "finished";

function RouteComponent() {
	const { t } = useTranslation("my-bets");
	const { linkTo } = useLangLink();
	const [filter, setFilter] = useState<FilterType>("all");
	const [tournamentFilter, setTournamentFilter] = useState<string>("all");
	const [expandedTournamentIds, setExpandedTournamentIds] = useState<
		Set<number>
	>(new Set());

	const { data, isLoading, refetch } = useQuery({
		queryKey: ["myBets"],
		queryFn: () => getMyBets(),
		staleTime: 0,
		refetchOnWindowFocus: true,
		refetchOnMount: "always",
		gcTime: 0,
	});

	// Force refetch on mount
	useEffect(() => {
		refetch();
	}, [refetch]);

	const allGroups = data?.betsByTournament ?? [];
	const tournamentOptions = allGroups.map((group) => ({
		id: String(group.tournament.id),
		name: group.tournament.name,
	}));

	const filteredGroups = allGroups
		.filter((group) =>
			tournamentFilter === "all"
				? true
				: String(group.tournament.id) === tournamentFilter,
		)
		.map((group) => ({
			...group,
			bets: group.bets.filter((bet) => {
				if (filter === "pending")
					return (
						bet.match.status === "scheduled" || bet.match.status === "live"
					);
				if (filter === "finished") return bet.match.status === "finished";
				return true;
			}),
		}))
		.filter((group) => group.bets.length > 0);

	const totalFilteredBets = filteredGroups.reduce(
		(acc, g) => acc + g.bets.length,
		0,
	);

	useEffect(() => {
		if (isLoading) return;

		setExpandedTournamentIds((prev) => {
			const visibleIds = new Set(filteredGroups.map((g) => g.tournament.id));
			const next = new Set(Array.from(prev).filter((id) => visibleIds.has(id)));

			if (next.size === 0 && filteredGroups.length > 0) {
				next.add(filteredGroups[0].tournament.id);
			}

			return next;
		});
	}, [isLoading, filteredGroups]);

	const toggleTournament = (tournamentId: number) => {
		setExpandedTournamentIds((prev) => {
			const next = new Set(prev);
			if (next.has(tournamentId)) {
				next.delete(tournamentId);
			} else {
				next.add(tournamentId);
			}
			return next;
		});
	};

	const expandAllTournaments = () => {
		setExpandedTournamentIds(
			new Set(filteredGroups.map((g) => g.tournament.id)),
		);
	};

	const collapseAllTournaments = () => {
		setExpandedTournamentIds(new Set());
	};

	return (
		<div className="relative min-h-screen bg-[#f0f0f0] pb-12">
			{/* Paper texture overlay */}
			<div
				className="pointer-events-none fixed inset-0 opacity-[0.12] mix-blend-multiply"
				style={{
					backgroundImage:
						'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
					backgroundRepeat: "repeat",
				}}
			/>

			<div className="relative z-10 mx-auto max-w-[1400px] px-4 py-8 md:px-6 md:py-12">
				{/* Clean Header */}
				<div className="mb-8 md:mb-10">
					<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
						<div>
							<h1 className="font-black text-4xl text-[#121212] uppercase italic tracking-tighter md:text-5xl">
								Minhas Apostas
							</h1>
							<p className="mt-2 font-bold text-gray-600 text-lg">
								{t("header")}
							</p>
						</div>
						<Link
							to={linkTo("/dashboard")}
							className="group flex items-center gap-2 font-black text-[#2e5cff] text-sm uppercase tracking-wider transition-colors hover:text-[#121212]"
						>
							Voltar ao dashboard
							<ChevronRight
								className="h-4 w-4 transition-transform group-hover:translate-x-1"
								strokeWidth={3}
							/>
						</Link>
					</div>
				</div>

				{/* Filter Tabs - Clean horizontal design */}
				<section className="mb-8">
					<div className="flex flex-wrap items-center gap-3">
						<div className="flex items-center gap-1 rounded-lg border-2 border-black bg-white p-1 shadow-[3px_3px_0_0_#000]">
							{[
								{
									key: "all" as FilterType,
									label: t("tabs.all"),
									icon: Layers,
								},
								{
									key: "pending" as FilterType,
									label: t("tabs.pending"),
									icon: Clock,
								},
								{
									key: "finished" as FilterType,
									label: t("tabs.finished"),
									icon: CheckCircle2,
								},
							].map((tab) => {
								const Icon = tab.icon;
								return (
									<button
										key={tab.key}
										type="button"
										onClick={() => setFilter(tab.key)}
										className={clsx(
											"flex items-center gap-2 rounded-md px-4 py-2 font-bold text-sm uppercase tracking-wider transition-all",
											filter === tab.key
												? "bg-[#121212] text-white"
												: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-[#121212]",
										)}
									>
										<Icon className="h-4 w-4" strokeWidth={2.5} />
										{tab.label}
									</button>
								);
							})}
						</div>

						{!isLoading && (
							<div className="ml-auto flex items-center gap-2 rounded-lg border-2 border-black bg-[#121212] px-3 py-2 shadow-[3px_3px_0_0_#000]">
								<History className="h-4 w-4 text-white" strokeWidth={2} />
								<span className="font-black text-sm text-white">
									{totalFilteredBets} palpite
									{totalFilteredBets !== 1 ? "s" : ""}
								</span>
							</div>
						)}
					</div>

					<div className="mt-4 flex flex-wrap items-center gap-3">
						<div className="flex items-center gap-2 text-gray-600">
							<Filter className="h-4 w-4" strokeWidth={2.5} />
							<span className="font-bold text-sm uppercase tracking-wider">
								Filtrar:
							</span>
						</div>
						<div className="max-w-[280px]">
							<CustomSelect
								label=""
								value={tournamentFilter}
								onChange={setTournamentFilter}
								options={[
									{ value: "all", label: "Todos os torneios" },
									...tournamentOptions.map((t) => ({
										value: t.id,
										label: t.name,
									})),
								]}
								placeholder={t("labels.selectTournament")}
							/>
						</div>
						{!isLoading && filteredGroups.length > 1 && (
							<div className="ml-auto flex items-center gap-2">
								<button
									type="button"
									onClick={expandAllTournaments}
									className="rounded-md border-2 border-black bg-white px-3 py-1.5 font-bold text-[10px] text-black uppercase tracking-wider shadow-[2px_2px_0_0_#000] transition-all hover:bg-[#ccff00] hover:shadow-[1px_1px_0_0_#000]"
								>
									Expandir todos
								</button>
								<button
									type="button"
									onClick={collapseAllTournaments}
									className="rounded-md border-2 border-black bg-white px-3 py-1.5 font-bold text-[10px] text-black uppercase tracking-wider shadow-[2px_2px_0_0_#000] transition-all hover:bg-gray-100 hover:shadow-[1px_1px_0_0_#000]"
								>
									Recolher todos
								</button>
							</div>
						)}
					</div>
				</section>

				{/* Bets Grouped by Tournament */}
				{isLoading ? (
					<div className="space-y-8">
						{[1, 2].map((i) => (
							<div key={i}>
								<div className="mb-4 h-8 w-56 animate-pulse rounded-lg border-2 border-black/10 bg-white" />
								<div className="space-y-3">
									{[1, 2, 3].map((j) => (
										<div
											key={j}
											className="h-32 animate-pulse rounded-lg border-2 border-black/10 bg-white"
										/>
									))}
								</div>
							</div>
						))}
					</div>
				) : filteredGroups.length > 0 ? (
					<div className="space-y-10">
						{filteredGroups.map((group) => (
							<section key={group.tournament.id}>
								{(() => {
									const isExpanded = expandedTournamentIds.has(
										group.tournament.id,
									);

									return (
										<>
											{/* Tournament Header - Clean */}
											<div className="mb-4 flex items-center gap-3">
												<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#ffc700]">
													{group.tournament.logoUrl ? (
														<img
															src={group.tournament.logoUrl}
															alt={group.tournament.name}
															className="h-5 w-5 object-contain"
														/>
													) : (
														<Trophy
															className="h-5 w-5 text-black"
															strokeWidth={2}
														/>
													)}
												</div>
												<button
													type="button"
													onClick={() => toggleTournament(group.tournament.id)}
													className="group flex min-w-0 flex-1 items-center gap-2 text-left"
												>
													<h2 className="break-words pr-1 font-black text-[#121212] text-xl uppercase tracking-tight transition-colors group-hover:text-[#2e5cff] md:text-2xl">
														{group.tournament.name}
													</h2>
													<ChevronDown
														className={clsx(
															"h-5 w-5 shrink-0 text-gray-400 transition-transform",
															isExpanded && "rotate-180",
														)}
														strokeWidth={2.5}
													/>
												</button>
												<Link
													to={linkTo("/tournaments/$slug")}
													params={{ slug: group.tournament.slug }}
													className="hidden rounded-md border-2 border-black bg-white px-3 py-1.5 font-bold text-[10px] text-black uppercase tracking-wider transition-colors hover:bg-[#2e5cff] hover:text-white md:inline-flex"
												>
													{t("actions.viewTournament")}
												</Link>
												<div className="shrink-0 rounded-md bg-[#ccff00] px-2.5 py-1 font-black text-black text-sm">
													{group.bets.length}
												</div>
											</div>

											{/* Bet Cards - Clean horizontal list */}
											{isExpanded ? (
												<div className="space-y-3">
													{group.bets.map((bet) => {
														const isFinished = bet.match.status === "finished";
														const isLive = bet.match.status === "live";
														const isProjected = bet.id < 0;
														const isWalkover = bet.match.resultType === "wo";
														const walkoverScoreA =
															bet.match.teamA?.id &&
															bet.match.winnerId === bet.match.teamA.id
																? "W"
																: "FF";
														const walkoverScoreB =
															bet.match.teamB?.id &&
															bet.match.winnerId === bet.match.teamB.id
																? "W"
																: "FF";
														const won =
															!isProjected &&
															isFinished &&
															bet.pointsEarned !== null &&
															bet.pointsEarned > 0;
														const lost = !isProjected && isFinished && !won;
														const stageLabel = (() => {
															const side = bet.match.bracketSide;
															const round = bet.match.roundIndex;

															if (side === "groups") return "Group Stage";
															if (side === "upper")
																return `Upper R${(round ?? 0) + 1}`;
															if (side === "lower")
																return `Lower R${(round ?? 0) + 1}`;
															if (side === "grand_final") return "Grand Final";
															return `Partida #${bet.match.id}`;
														})();

														// Status config
														const statusConfig = isProjected
															? {
																	label: t("labels.projection"),
																	color: "bg-[#ff6b00] text-black",
																}
															: isLive
																? {
																		label: "Ao Vivo",
																		color:
																			"animate-pulse bg-[#ff2e2e] text-white",
																	}
																: isWalkover
																	? {
																			label: "W.O.",
																			color: "bg-black text-white",
																		}
																	: won
																		? {
																				label: "Acertou",
																				color: "bg-[#ccff00] text-black",
																			}
																		: lost
																			? {
																					label: "Errou",
																					color: "bg-[#ff2e2e] text-white",
																				}
																			: {
																					label: "Agendado",
																					color: "bg-[#f0f0f0] text-black",
																				};

														return (
															<div
																key={bet.id}
																className={clsx(
																	"group relative overflow-hidden border-[3px] transition-all",
																	isProjected
																		? "border-gray-300 border-dashed bg-[#f8f8f8]"
																		: won
																			? "border-[#ccff00] bg-white shadow-[4px_4px_0_0_#ccff00] hover:shadow-[6px_6px_0_0_#ccff00]"
																			: lost
																				? "border-[#ff2e2e] bg-white shadow-[4px_4px_0_0_#ff2e2e] hover:shadow-[6px_6px_0_0_#ff2e2e]"
																				: "border-black bg-white shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000]",
																)}
															>
																{/* Top accent bar */}
																{isProjected ? (
																	<div className="h-1.5 w-full bg-gray-400" />
																) : won ? (
																	<div className="h-1.5 w-full bg-[#ccff00]" />
																) : lost ? (
																	<div className="h-1.5 w-full bg-[#ff2e2e]" />
																) : isWalkover ? (
																	<div className="h-1.5 w-full bg-black" />
																) : isLive ? (
																	<div className="h-1.5 w-full animate-pulse bg-[#ff2e2e]" />
																) : (
																	<div className="h-1.5 w-full bg-[#ffc700]" />
																)}

																{/* Header: Stage + Status */}
																<div className="flex items-center justify-between border-black border-b-2 bg-[#fafafa] px-4 py-2">
																	<span className="truncate font-black text-[10px] text-gray-500 uppercase tracking-widest">
																		{stageLabel}
																	</span>
																	<div
																		className={clsx(
																			"rounded-sm border-2 border-black px-2 py-0.5 font-black text-[9px] uppercase tracking-wider shadow-[2px_2px_0_0_#000]",
																			statusConfig.color,
																		)}
																	>
																		{statusConfig.label}
																	</div>
																</div>

																{/* Teams - Broadcast panel style */}
																<div className="flex items-stretch">
																	{/* Team A Panel */}
																	<div
																		className={clsx(
																			"flex flex-1 items-center gap-3 border-black border-r-2 px-4 py-4 transition-all",
																			!isProjected &&
																				bet.predictedWinnerId ===
																					bet.match.teamA?.id
																				? "bg-[#ccff00]/15"
																				: isProjected
																					? "bg-white"
																					: "bg-[#f8f8f8]",
																			isFinished &&
																				bet.match.winner?.id ===
																					bet.match.teamA?.id &&
																				"ring-2 ring-[#ffc700] ring-inset",
																		)}
																	>
																		<TeamLogo
																			teamName={bet.match.teamA?.name || "TBD"}
																			logoUrl={bet.match.teamA?.logoUrl}
																			size="md"
																		/>
																		<div className="min-w-0 flex-1">
																			<p className="truncate font-black text-[#121212] text-sm">
																				{bet.match.teamA?.name || "TBD"}
																			</p>
																			{!isProjected &&
																				bet.predictedWinnerId ===
																					bet.match.teamA?.id && (
																					<div className="mt-1 inline-flex items-center gap-1 rounded-sm border border-black bg-[#ccff00] px-1.5 py-0.5 font-black text-[9px] text-black uppercase shadow-[1px_1px_0_0_#000]">
																						<span className="material-symbols-outlined text-[10px]">
																							check_circle
																						</span>
																						{t("betLabel")}
																					</div>
																				)}
																			{isFinished &&
																				bet.match.winner?.id ===
																					bet.match.teamA?.id && (
																					<span className="mt-1 inline-flex items-center gap-1 font-black text-[#ffc700] text-[9px] uppercase">
																						<span className="material-symbols-outlined text-[10px]">
																							crown
																						</span>
																						Vencedor
																					</span>
																				)}
																		</div>
																	</div>

																	{/* VS Badge */}
																	<div className="flex shrink-0 items-center justify-center">
																		<div className="flex h-10 w-10 -rotate-6 items-center justify-center border-2 border-black bg-black shadow-[2px_2px_0_0_#ccff00]">
																			<span className="font-black text-white text-xs italic">
																				VS
																			</span>
																		</div>
																	</div>

																	{/* Team B Panel */}
																	<div
																		className={clsx(
																			"flex flex-1 items-center gap-3 border-black border-l-2 px-4 py-4 transition-all",
																			!isProjected &&
																				bet.predictedWinnerId ===
																					bet.match.teamB?.id
																				? "bg-[#ccff00]/15"
																				: isProjected
																					? "bg-white"
																					: "bg-[#f8f8f8]",
																			isFinished &&
																				bet.match.winner?.id ===
																					bet.match.teamB?.id &&
																				"ring-2 ring-[#ffc700] ring-inset",
																		)}
																	>
																		<div className="min-w-0 flex-1 text-right">
																			<p className="truncate font-black text-[#121212] text-sm">
																				{bet.match.teamB?.name || "TBD"}
																			</p>
																			{!isProjected &&
																				bet.predictedWinnerId ===
																					bet.match.teamB?.id && (
																					<div className="mt-1 inline-flex items-center gap-1 rounded-sm border border-black bg-[#ccff00] px-1.5 py-0.5 font-black text-[9px] text-black uppercase shadow-[1px_1px_0_0_#000]">
																						<span className="material-symbols-outlined text-[10px]">
																							check_circle
																						</span>
																						{t("betLabel")}
																					</div>
																				)}
																			{isFinished &&
																				bet.match.winner?.id ===
																					bet.match.teamB?.id && (
																					<span className="mt-1 inline-flex items-center gap-1 font-black text-[#ffc700] text-[9px] uppercase">
																						<span className="material-symbols-outlined text-[10px]">
																							crown
																						</span>
																						Vencedor
																					</span>
																				)}
																		</div>
																		<TeamLogo
																			teamName={bet.match.teamB?.name || "TBD"}
																			logoUrl={bet.match.teamB?.logoUrl}
																			size="md"
																		/>
																	</div>
																</div>

																{/* Footer - Scores & Points */}
																<div className="flex items-center justify-between border-black border-t-2 bg-white px-4 py-3">
																	<div className="flex items-center gap-3">
																		{/* Date or Score info */}
																		{isProjected ? (
																			<span className="flex items-center gap-1 text-gray-500 text-xs">
																				<span className="material-symbols-outlined text-base">
																					auto_awesome
																				</span>
																				{t("labels.futureProjection")}
																			</span>
																		) : !isFinished ? (
																			<span className="flex items-center gap-1 text-gray-600 text-xs">
																				<Calendar
																					className="h-3.5 w-3.5"
																					strokeWidth={2}
																				/>
																				{new Date(
																					bet.match.startTime,
																				).toLocaleString("pt-BR", {
																					day: "2-digit",
																					month: "short",
																					hour: "2-digit",
																					minute: "2-digit",
																				})}
																			</span>
																		) : (
																			<div className="flex items-center gap-2">
																				<span className="font-bold text-[10px] text-gray-500 uppercase tracking-wider">
																					Placar:
																				</span>
																				<div className="flex items-center gap-1">
																					<span className="rounded bg-black px-2 py-0.5 font-black text-sm text-white">
																						{isWalkover
																							? walkoverScoreA
																							: (bet.match.scoreA ?? "—")}
																					</span>
																					<span className="font-bold text-gray-400">
																						-
																					</span>
																					<span className="rounded bg-black px-2 py-0.5 font-black text-sm text-white">
																						{isWalkover
																							? walkoverScoreB
																							: (bet.match.scoreB ?? "—")}
																					</span>
																				</div>
																			</div>
																		)}
																	</div>

																	<div className="flex items-center gap-2">
																		{/* Prediction */}
																		{!isProjected && (
																			<span className="font-bold text-[10px] text-gray-500 uppercase tracking-wider">
																				Palpite: {bet.predictedScoreA}-
																				{bet.predictedScoreB}
																			</span>
																		)}

																		{/* Points badge */}
																		{isFinished &&
																			bet.pointsEarned !== null &&
																			bet.pointsEarned > 0 && (
																				<div className="flex items-center gap-1.5">
																					{bet.isPerfectPick && (
																						<span className="rounded-md border border-black bg-[#ffc700] px-2 py-0.5 font-black text-[9px] text-black uppercase">
																							Placar Exato
																						</span>
																					)}
																					<span className="rounded-md bg-[#ccff00] px-2 py-0.5 font-black text-black text-sm">
																						+{bet.pointsEarned}
																					</span>
																				</div>
																			)}

																		{isFinished &&
																			bet.isUnderdogPick &&
																			won && (
																				<span className="rounded-md border border-black bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-0.5 font-black text-[9px] text-white uppercase">
																					{t("labels.underdogLabel")}
																				</span>
																			)}
																	</div>
																</div>
															</div>
														);
													})}
												</div>
											) : (
												<div className="rounded-lg border-2 border-black bg-white p-4 text-center shadow-[3px_3px_0_0_#000]">
													<p className="font-bold text-gray-600 text-sm">
														{t("labels.clickToExpand")}
													</p>
												</div>
											)}
										</>
									);
								})()}
							</section>
						))}
					</div>
				) : (
					<div className="rounded-lg border-2 border-black bg-white p-10 text-center shadow-[3px_3px_0_0_#000]">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f0f0f0]">
							<span className="material-symbols-outlined text-3xl text-gray-400">
								inbox
							</span>
						</div>
						<p className="mb-1 font-black text-[#121212] text-lg uppercase">
							{filter === "all"
								? t("empty.none")
								: filter === "pending"
									? "Nenhum palpite pendente"
									: "Nenhum palpite finalizado"}
						</p>
						<p className="mb-5 text-gray-600 text-sm">
							{filter === "all"
								? t("empty.cta")
								: "Tente outro filtro ou faça mais apostas."}
						</p>
						<Link to={linkTo("/")}>
							<button
								type="button"
								className="rounded-lg border-2 border-black bg-[#ffc700] px-6 py-3 font-black text-black text-sm uppercase tracking-wider shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[2px_2px_0_0_#000] active:shadow-none"
							>
								Ver Partidas
							</button>
						</Link>
					</div>
				)}

				{/* Bottom decoration - subtle */}
				<div className="mt-12 flex items-center justify-center gap-2 opacity-30">
					<div className="h-px w-16 bg-black" />
					<div className="h-2 w-2 rounded-sm bg-[#ccff00]" />
					<div className="h-px w-16 bg-black" />
				</div>
			</div>
		</div>
	);
}
