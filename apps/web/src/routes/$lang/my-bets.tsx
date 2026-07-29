import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
	CheckCircle2,
	ChevronRight,
	Clock,
	History,
	Layers,
	Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActiveBetRow } from "@/components/ActiveBetRow";
import { PublicPageShell } from "@/components/PublicPageShell";
import { getMyBets } from "@/functions/get-my-bets";
import { getUser } from "@/functions/get-user";
import { useLangLink } from "@/i18n/useLangLink";
import { extractGroupIdentifier } from "@/utils/extract-group-identifier";

export const Route = createFileRoute("/$lang/my-bets")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ context, params }) => {
		if (!context.session) {
			throw redirect({ to: "/$lang/login", params: { lang: params.lang } });
		}
	},
});

type FilterType = "all" | "pending" | "finished";

function getStageLabel(
	bet: {
		match: {
			id: number;
			bracketSide?: string | null;
			roundIndex?: number | null;
			label?: string | null;
			name?: string | null;
		};
	},
	translate: (key: string, options?: Record<string, unknown>) => string,
): string {
	const side = bet.match.bracketSide;
	const round = bet.match.roundIndex;
	const matchMeta = bet.match as {
		label?: string | null;
		name?: string | null;
	};
	const label = matchMeta.label || matchMeta.name;

	if (side === "groups") {
		const group =
			extractGroupIdentifier(matchMeta.label) ??
			extractGroupIdentifier(matchMeta.name);
		if (group) return translate("stageLabel.group", { group });
		if (label) return label;
		return translate("stageLabel.groups");
	}
	if (side === "upper")
		return translate("stageLabel.upper", { number: (round ?? 0) + 1 });
	if (side === "lower")
		return translate("stageLabel.lower", { number: (round ?? 0) + 1 });
	if (side === "grand_final") return translate("stageLabel.grandFinal");
	if (side === "third_place") return translate("stageLabel.thirdPlace");
	if (side === "main" && label) return label;
	return label || translate("stageLabel.match", { id: bet.match.id });
}

function RouteComponent() {
	const { t, i18n } = useTranslation("my-bets");
	const myBetsLocale = i18n.language === "pt" ? "pt-BR" : "en-US";
	const { linkTo } = useLangLink();
	const [filter, setFilter] = useState<FilterType>("all");
	const [selectedTournamentId, setSelectedTournamentId] = useState<
		number | null
	>(null);

	const { data, isLoading, refetch } = useQuery({
		queryKey: ["myBets"],
		queryFn: () => getMyBets(),
		staleTime: 0,
		refetchOnWindowFocus: true,
		refetchOnMount: "always",
		gcTime: 0,
	});

	useEffect(() => {
		refetch();
	}, [refetch]);

	const allGroups = data?.betsByTournament ?? [];

	const tournamentTabs = useMemo(
		() =>
			allGroups.map((group) => {
				const pendingCount = group.bets.filter(
					(bet) =>
						bet.match.status === "scheduled" || bet.match.status === "live",
				).length;
				const liveCount = group.bets.filter(
					(bet) => bet.match.status === "live",
				).length;
				const pointsEarned = group.bets.reduce(
					(sum, bet) => sum + (bet.pointsEarned ?? 0),
					0,
				);

				return {
					id: group.tournament.id,
					name: group.tournament.name,
					slug: group.tournament.slug,
					logoUrl: group.tournament.logoUrl,
					totalBets: group.bets.length,
					pendingCount,
					liveCount,
					pointsEarned,
				};
			}),
		[allGroups],
	);

	useEffect(() => {
		if (tournamentTabs.length === 0) {
			setSelectedTournamentId(null);
			return;
		}

		const stillVisible = tournamentTabs.some(
			(tab) => tab.id === selectedTournamentId,
		);
		if (!stillVisible) {
			setSelectedTournamentId(tournamentTabs[0]!.id);
		}
	}, [tournamentTabs, selectedTournamentId]);

	const selectedGroup = useMemo(
		() =>
			allGroups.find((group) => group.tournament.id === selectedTournamentId) ??
			null,
		[allGroups, selectedTournamentId],
	);

	const selectedTab = useMemo(
		() => tournamentTabs.find((tab) => tab.id === selectedTournamentId) ?? null,
		[tournamentTabs, selectedTournamentId],
	);

	const visibleBets = useMemo(() => {
		if (!selectedGroup) return [];
		return selectedGroup.bets.filter((bet) => {
			if (filter === "pending")
				return bet.match.status === "scheduled" || bet.match.status === "live";
			if (filter === "finished") return bet.match.status === "finished";
			return true;
		});
	}, [selectedGroup, filter]);

	return (
		<PublicPageShell className="pb-12">
			<div className="relative z-10 mx-auto max-w-[1400px] px-4 py-8 md:px-6 md:py-12">
				<div className="mb-6 md:mb-8">
					<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
						<div>
							<h1 className="font-black font-display text-4xl text-ink uppercase italic leading-[1.1] tracking-tighter md:text-5xl">
								{t("title")}
							</h1>
							<p className="mt-1 font-bold font-display text-base text-gray-600 md:text-lg">
								{t("subtitle")}
							</p>
						</div>
						<Link
							to={linkTo("/dashboard")}
							className="group flex items-center gap-2 font-black font-display text-brawl-blue text-sm uppercase tracking-wider transition-colors hover:text-ink"
						>
							{t("actions.backToDashboard")}
							<ChevronRight
								className="h-4 w-4 transition-transform group-hover:translate-x-1"
								strokeWidth={3}
							/>
						</Link>
					</div>
				</div>

				{isLoading ? (
					<div className="space-y-4">
						<div className="h-16 animate-pulse rounded-lg border-2 border-black/10 bg-white" />
						<div className="h-10 animate-pulse rounded-lg border-2 border-black/10 bg-white" />
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="h-20 animate-pulse rounded-lg border-2 border-black/10 bg-white"
							/>
						))}
					</div>
				) : tournamentTabs.length > 0 ? (
					<>
						{/* Tournament switcher header */}
						<section className="mb-4 overflow-hidden rounded-lg border-2 border-black bg-white text-ink shadow-comic">
							<div className="border-black border-b bg-paper px-3 py-2">
								<span className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
									{t("labels.tournaments")}
								</span>
							</div>
							<div className="scrollbar-hide flex gap-2 overflow-x-auto p-2 sm:p-3">
								{tournamentTabs.map((tab) => {
									const isSelected = tab.id === selectedTournamentId;
									return (
										<button
											key={tab.id}
											type="button"
											onClick={() => setSelectedTournamentId(tab.id)}
											className={clsx(
												"flex shrink-0 items-center gap-2 rounded-md border-2 border-black px-3 py-2 transition-all",
												isSelected
													? "surface-lime shadow-comic-sm"
													: "bg-white text-ink hover:bg-tape",
											)}
										>
											<div
												className={clsx(
													"flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-black",
													isSelected ? "bg-white" : "bg-brawl-yellow",
												)}
											>
												{tab.logoUrl ? (
													<img
														src={tab.logoUrl}
														alt={tab.name}
														className="h-5 w-5 object-contain"
													/>
												) : (
													<Trophy
														className="h-4 w-4 text-ink"
														strokeWidth={2.5}
													/>
												)}
											</div>
											<span className="max-w-[140px] truncate pr-1 font-black font-display text-ink text-xs uppercase italic leading-[1.15] tracking-tighter sm:max-w-[200px] sm:text-sm">
												{tab.name}
											</span>
											<span
												className={clsx(
													"rounded-sm border border-black px-1.5 py-0.5 font-black font-body text-[10px] tabular-nums",
													isSelected
														? "bg-ink text-white"
														: "bg-electric-lime text-black",
												)}
											>
												{tab.totalBets}
											</span>
											{tab.liveCount > 0 && (
												<span className="animate-pulse rounded-sm border border-black bg-brawl-red px-1.5 py-0.5 font-black font-display text-[8px] text-white uppercase">
													{t("tabs.liveShort")}
												</span>
											)}
										</button>
									);
								})}
							</div>
						</section>

						{/* Selected tournament meta + status filters */}
						{selectedTab && (
							<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex min-w-0 flex-wrap items-center gap-2">
									<h2 className="min-w-0 truncate pr-1 font-black font-display text-ink text-lg uppercase italic leading-[1.15] tracking-tighter md:text-xl">
										{selectedTab.name}
									</h2>
									{selectedTab.pointsEarned > 0 && (
										<span className="rounded-sm border border-black bg-white px-2 py-0.5 font-body font-bold text-[10px] text-ink uppercase tabular-nums tracking-widest">
											{t("labels.pointsEarned", {
												points: selectedTab.pointsEarned,
											})}
										</span>
									)}
									<Link
										to={linkTo("/tournaments/$slug")}
										params={{ slug: selectedTab.slug }}
										className="hover-surface-brawl-blue rounded-md border-2 border-black bg-white px-2.5 py-1 font-black font-display text-[10px] text-ink uppercase tracking-wider transition-colors"
									>
										{t("actions.viewTournament")}
									</Link>
								</div>

								<div className="flex flex-wrap items-center gap-2">
									<div className="scrollbar-hide flex items-center gap-1 overflow-x-auto rounded-lg border-2 border-black bg-white p-1 shadow-comic-sm">
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
														"flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 font-black font-display text-[10px] uppercase tracking-wider transition-all sm:text-xs",
														filter === tab.key
															? "surface-ink"
															: "bg-transparent text-gray-600 hover:bg-tape hover:text-ink",
													)}
												>
													<Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
													{tab.label}
												</button>
											);
										})}
									</div>
									<div className="surface-ink flex items-center gap-1.5 rounded-md border-2 border-black px-2.5 py-1.5">
										<History
											className="h-3.5 w-3.5 text-white"
											strokeWidth={2}
										/>
										<span className="font-black font-body text-[10px] text-white tabular-nums sm:text-xs">
											{t("labels.pickCount", { count: visibleBets.length })}
										</span>
									</div>
								</div>
							</div>
						)}

						{/* Bets for selected tournament — multi-column grid */}
						{visibleBets.length > 0 ? (
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
								{visibleBets.map((bet) => {
									const isProjected = bet.id < 0;
									return (
										<ActiveBetRow
											key={bet.id}
											variant="tile"
											matchLabel={getStageLabel(bet, t)}
											teamA={{
												id: bet.match.teamA?.id,
												name: bet.match.teamA?.name || "TBD",
												logoUrl: bet.match.teamA?.logoUrl,
												slug: bet.match.teamA?.slug,
											}}
											teamB={{
												id: bet.match.teamB?.id,
												name: bet.match.teamB?.name || "TBD",
												logoUrl: bet.match.teamB?.logoUrl,
												slug: bet.match.teamB?.slug,
											}}
											status={bet.match.status || "scheduled"}
											resultType={bet.match.resultType === "wo" ? "wo" : null}
											startTime={
												typeof bet.match.startTime === "string"
													? bet.match.startTime
													: bet.match.startTime?.toISOString()
											}
											predictedWinnerId={bet.predictedWinnerId}
											predictedScoreA={bet.predictedScoreA}
											predictedScoreB={bet.predictedScoreB}
											actualScoreA={bet.match.scoreA}
											actualScoreB={bet.match.scoreB}
											actualWinnerId={bet.match.winnerId}
											pointsEarned={bet.pointsEarned}
											isPerfectPick={bet.isPerfectPick ?? undefined}
											isUnderdogPick={bet.isUnderdogPick ?? undefined}
											isProjected={isProjected}
											locale={myBetsLocale}
										/>
									);
								})}
							</div>
						) : (
							<div className="rounded-lg border-2 border-black bg-white p-8 text-center shadow-comic">
								<p className="mb-1 font-black font-display text-ink text-lg uppercase italic">
									{filter === "pending"
										? t("empty.noPending")
										: filter === "finished"
											? t("empty.noFinished")
											: t("empty.none")}
								</p>
								<p className="font-display text-gray-600 text-sm">
									{t("empty.filterHint")}
								</p>
							</div>
						)}
					</>
				) : (
					<div className="rounded-lg border-2 border-black bg-white p-10 text-center shadow-comic">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-paper">
							<span className="material-symbols-outlined text-3xl text-gray-400">
								inbox
							</span>
						</div>
						<p className="mb-1 font-black font-display text-ink text-lg uppercase italic">
							{t("empty.none")}
						</p>
						<p className="mb-5 font-display text-gray-600 text-sm">
							{t("empty.cta")}
						</p>
						<Link to={linkTo("/")}>
							<button
								type="button"
								className="rounded-lg border-2 border-black bg-brawl-yellow px-6 py-3 font-black font-display text-black text-sm uppercase tracking-wider shadow-comic transition-all hover:shadow-comic-sm active:shadow-none"
							>
								{t("actions.viewMatches")}
							</button>
						</Link>
					</div>
				)}
			</div>
		</PublicPageShell>
	);
}
