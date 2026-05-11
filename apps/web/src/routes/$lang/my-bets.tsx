import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
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
import { CustomSelect } from "@/components/admin/CustomInputs";
import { MatchBetCard } from "@/components/MatchBetCard";
import { getMyBets } from "@/functions/get-my-bets";
import { getUser } from "@/functions/get-user";
import { useLangLink } from "@/i18n/useLangLink";

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
	const { t, i18n } = useTranslation("my-bets");
	const myBetsLocale = i18n.language === "pt" ? "pt-BR" : "en-US";
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
		<div className="relative min-h-screen bg-paper pb-12">
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
								{t("header")}
							</h1>
							<p className="mt-2 font-bold text-gray-600 text-lg">
								{t("header")}
							</p>
						</div>
						<Link
							to={linkTo("/dashboard")}
							className="group flex items-center gap-2 font-black text-[#2e5cff] text-sm uppercase tracking-wider transition-colors hover:text-[#121212]"
						>
							{t("actions.backToDashboard")}
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
									{ value: "all", label: t("labels.allTournaments") },
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
														const isProjected = bet.id < 0;
														const stageLabel = (() => {
															const side = bet.match.bracketSide;
															const round = bet.match.roundIndex;
															const label =
																(bet.match as any).label ||
																(bet.match as any).name;

															if (side === "groups")
																return t("stageLabel.groups");
															if (side === "upper")
																return t("stageLabel.upper", {
																	number: (round ?? 0) + 1,
																});
															if (side === "lower")
																return t("stageLabel.lower", {
																	number: (round ?? 0) + 1,
																});
															if (side === "grand_final")
																return t("stageLabel.grandFinal");
															if (side === "third_place")
																return t("stageLabel.thirdPlace");
															if (side === "main" && label) return label;
															return (
																label ||
																t("stageLabel.match", {
																	id: bet.match.id,
																})
															);
														})();
														return (
															<MatchBetCard
																key={bet.id}
																matchLabel={stageLabel}
																headerLogoUrl={group.tournament.logoUrl}
																headerLogoAlt={group.tournament.name}
																teamA={{
																	id: bet.match.teamA?.id,
																	name: bet.match.teamA?.name || "TBD",
																	logoUrl: bet.match.teamA?.logoUrl,
																}}
																teamB={{
																	id: bet.match.teamB?.id,
																	name: bet.match.teamB?.name || "TBD",
																	logoUrl: bet.match.teamB?.logoUrl,
																}}
																status={bet.match.status}
																resultType={bet.match.resultType}
																startTime={bet.match.startTime}
																predictedWinnerId={bet.predictedWinnerId}
																predictedScoreA={bet.predictedScoreA}
																predictedScoreB={bet.predictedScoreB}
																actualScoreA={bet.match.scoreA}
																actualScoreB={bet.match.scoreB}
																actualWinnerId={bet.match.winnerId}
																pointsEarned={bet.pointsEarned}
																isPerfectPick={bet.isPerfectPick}
																isUnderdogPick={bet.isUnderdogPick}
																isProjected={isProjected}
																locale={myBetsLocale}
															/>
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
									? t("empty.noPending")
									: t("empty.noFinished")}
						</p>
						<p className="mb-5 text-gray-600 text-sm">
							{filter === "all" ? t("empty.cta") : t("empty.filterHint")}
						</p>
						<Link to={linkTo("/")}>
							<button
								type="button"
								className="rounded-lg border-2 border-black bg-[#ffc700] px-6 py-3 font-black text-black text-sm uppercase tracking-wider shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[2px_2px_0_0_#000] active:shadow-none"
							>
								{t("actions.viewMatches")}
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
