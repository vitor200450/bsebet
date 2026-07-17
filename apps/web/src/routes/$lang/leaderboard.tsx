import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
	Calendar,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Crown,
	Globe,
	Star,
	Target,
	Trophy,
	Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { CustomSelect } from "@/components/admin/CustomInputs";
import { PublicPageShell } from "@/components/PublicPageShell";
import { useLangLink } from "@/i18n/useLangLink";
import {
	MedalCountSummary,
	MiniMedalBadge,
} from "../../components/MiniMedalBadge";
import { getUser } from "../../functions/get-user";
import {
	getLeaderboard,
	getLeaderboardTournaments,
	type LeaderboardEntry,
} from "../../server/leaderboard";

const PAGE_SIZE = 12;
const HIGHLIGHT_MS = 600;
const PAGE_FADE_MS = 120;

const searchSchema = z.object({
	tab: z.enum(["season", "global"]).catch("global"),
	tournamentId: z.number().optional(),
});

function prefersReducedMotion(): boolean {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const Route = createFileRoute("/$lang/leaderboard")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({
		tab: search.tab,
		tournamentId: search.tournamentId,
	}),
	loader: async ({ deps }) => {
		const [session, tournaments, leaderboard] = await Promise.all([
			getUser().catch(() => null),
			getLeaderboardTournaments(),
			getLeaderboard({
				data: deps.tab === "season" ? deps.tournamentId : undefined,
			}),
		]);
		return { session, tournaments, leaderboard };
	},
	component: LeaderboardPage,
});

function LeaderboardPage() {
	const { t } = useTranslation("leaderboard");
	const { session, leaderboard, tournaments } = Route.useLoaderData();
	const { tab, tournamentId: urlTournamentId } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const currentUserId = session?.user?.id;

	const [page, setPage] = useState(0);
	const [highlightUserId, setHighlightUserId] = useState<string | null>(null);
	const [listVisible, setListVisible] = useState(true);
	const [logoVisible, setLogoVisible] = useState(true);
	const listRef = useRef<HTMLDivElement>(null);
	const pageFadeTimer = useRef<number | null>(null);

	const tournamentId =
		urlTournamentId || (tournaments.length > 0 ? tournaments[0].id : undefined);

	useEffect(() => {
		if (tab === "season" && !urlTournamentId && tournaments.length > 0) {
			navigate({
				search: (prev) => ({ ...prev, tournamentId: tournaments[0].id }),
				replace: true,
			});
		}
	}, [tab, urlTournamentId, tournaments, navigate]);

	useEffect(() => {
		setPage(0);
		setListVisible(true);
	}, [tab, tournamentId]);

	useEffect(() => {
		if (prefersReducedMotion()) {
			setLogoVisible(true);
			return;
		}
		setLogoVisible(false);
		const timer = window.setTimeout(() => setLogoVisible(true), 20);
		return () => window.clearTimeout(timer);
	}, [tournamentId]);

	useEffect(() => {
		return () => {
			if (pageFadeTimer.current !== null) {
				window.clearTimeout(pageFadeTimer.current);
			}
		};
	}, []);

	const activeTournament = tournaments.find((t) => t.id === tournamentId);
	const tournamentOptions = tournaments.map((tournament) => ({
		value: String(tournament.id),
		label: tournament.name,
	}));

	const top3 = leaderboard.slice(0, 3);
	const rest = leaderboard.slice(3);

	const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages - 1);
	const pageStart = safePage * PAGE_SIZE;
	const pageEntries = rest.slice(pageStart, pageStart + PAGE_SIZE);

	const currentUserEntry = useMemo(
		() => leaderboard.find((entry) => entry.userId === currentUserId),
		[leaderboard, currentUserId],
	);

	const goToPage = (nextPage: number, options?: { skipFade?: boolean }) => {
		const clamped = Math.min(Math.max(0, nextPage), totalPages - 1);
		if (clamped === safePage) return;

		if (options?.skipFade || prefersReducedMotion()) {
			setPage(clamped);
			setListVisible(true);
			return;
		}

		setListVisible(false);
		if (pageFadeTimer.current !== null) {
			window.clearTimeout(pageFadeTimer.current);
		}
		pageFadeTimer.current = window.setTimeout(() => {
			setPage(clamped);
			requestAnimationFrame(() => setListVisible(true));
			pageFadeTimer.current = null;
		}, PAGE_FADE_MS);
	};

	const jumpToYou = () => {
		if (!currentUserEntry) return;
		const smooth = !prefersReducedMotion();

		if (currentUserEntry.rank <= 3) {
			document.getElementById("leaderboard-podium")?.scrollIntoView({
				behavior: smooth ? "smooth" : "auto",
				block: "center",
			});
			setHighlightUserId(currentUserEntry.userId);
			return;
		}

		const restIndex = currentUserEntry.rank - 4;
		const targetPage = Math.floor(restIndex / PAGE_SIZE);
		goToPage(targetPage, { skipFade: true });
		setHighlightUserId(currentUserEntry.userId);

		requestAnimationFrame(() => {
			listRef.current?.scrollIntoView({
				behavior: smooth ? "smooth" : "auto",
				block: "start",
			});
			requestAnimationFrame(() => {
				document
					.getElementById(`rank-row-${currentUserEntry.userId}`)
					?.scrollIntoView({
						behavior: smooth ? "smooth" : "auto",
						block: "center",
					});
			});
		});
	};

	useEffect(() => {
		if (!highlightUserId) return;
		const timer = window.setTimeout(
			() => setHighlightUserId(null),
			HIGHLIGHT_MS,
		);
		return () => window.clearTimeout(timer);
	}, [highlightUserId]);

	const criteriaItems = [
		{
			num: 1,
			label: t("columns.totalPoints"),
			desc: t("columns.primaryCriteria"),
			color: "bg-brawl-yellow text-black",
		},
		{
			num: 2,
			label: t("columns.hitCount"),
			desc: t("columns.tiebreaker1"),
			color: "bg-white text-ink",
		},
		{
			num: 3,
			label: t("columns.perfect"),
			desc: t("columns.tiebreaker2"),
			color: "bg-gray-400 text-black",
		},
		{
			num: 4,
			label: t("columns.underdogs"),
			desc: t("columns.tiebreaker3"),
			color: "bg-purple-300 text-black",
		},
		{
			num: 5,
			label:
				tab === "global" ? t("columns.medals") : t("columns.decisiveMatch"),
			desc:
				tab === "global"
					? t("columns.tiebreaker4")
					: t("columns.tiebreakerFinal"),
			color: "bg-yellow-300 text-black",
		},
		...(tab === "season"
			? [
					{
						num: 6,
						label: t("columns.lastMonthResult"),
						desc: t("columns.previousTournaments"),
						color: "bg-brawl-blue text-white",
					},
					{
						num: 7,
						label: t("tabs.global"),
						desc: t("columns.globalPosition"),
						color: "bg-brawl-red text-white",
					},
				]
			: []),
	];

	return (
		<PublicPageShell className="pb-12">
			<div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 py-8 md:px-6 md:py-12">
				<header className="mb-10 md:mb-12">
					<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
						<div>
							<h1 className="font-black font-display text-4xl text-ink uppercase italic tracking-tighter md:text-5xl lg:text-6xl">
								{t("title")}
							</h1>
							<p className="mt-2 font-bold font-display text-gray-600 text-lg">
								{t("subtitle")}
							</p>
						</div>
						{currentUserEntry && (
							<button
								type="button"
								onClick={jumpToYou}
								className="group flex items-center gap-2 self-start font-black font-display text-brawl-blue text-sm uppercase tracking-wider transition-[color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink active:scale-[0.97] md:self-auto"
							>
								{t("jumpToYou")}
								<ChevronRight
									className="h-4 w-4 transition-transform duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1"
									strokeWidth={3}
								/>
							</button>
						)}
					</div>
				</header>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] lg:items-start lg:gap-8">
					{/* Sidebar: filters + legend */}
					<aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
						<div className="flex items-center gap-1 rounded-lg border-2 border-black bg-white p-1 shadow-comic">
							<button
								type="button"
								onClick={() =>
									navigate({
										search: {
											tab: "season",
											tournamentId: tournaments[0]?.id,
										},
									})
								}
								className={clsx(
									"flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 font-bold font-display text-sm uppercase tracking-wider transition-[background-color,color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]",
									tab === "season"
										? "bg-ink text-white"
										: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-ink",
								)}
							>
								<Calendar className="h-4 w-4" strokeWidth={2.5} />
								{t("tabs.season")}
							</button>
							<button
								type="button"
								onClick={() => navigate({ search: { tab: "global" } })}
								className={clsx(
									"flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 font-bold font-display text-sm uppercase tracking-wider transition-[background-color,color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]",
									tab === "global"
										? "bg-ink text-white"
										: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-ink",
								)}
							>
								<Globe className="h-4 w-4" strokeWidth={2.5} />
								{t("tabs.global")}
							</button>
						</div>

						{tab === "season" && activeTournament && (
							<div className="rounded-xl border-2 border-black bg-white p-3 shadow-comic">
								<p className="mb-3 font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
									{t("selectTournament")}
								</p>
								<div className="mb-3 flex flex-col items-center gap-2">
									<div
										className={clsx(
											"flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border-2 border-black bg-white shadow-comic transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
											logoVisible
												? "scale-100 opacity-100"
												: "scale-[0.98] opacity-0",
										)}
									>
										{activeTournament.logoUrl ? (
											<img
												key={activeTournament.id}
												src={activeTournament.logoUrl}
												alt={activeTournament.name}
												className="h-full w-full object-contain p-3"
											/>
										) : (
											<Trophy
												className="h-10 w-10 text-gray-300"
												strokeWidth={2}
											/>
										)}
									</div>
									<span className="max-w-full truncate rounded-lg border-2 border-black bg-ink px-3 py-1.5 text-center font-black font-display text-white text-xs uppercase">
										{activeTournament.name}
									</span>
								</div>
								<CustomSelect
									label=""
									value={String(activeTournament.id)}
									onChange={(value) => {
										const scrollY = window.scrollY;
										navigate({
											search: {
												tab: "season",
												tournamentId: Number(value),
											},
											replace: true,
											resetScroll: false,
										});
										requestAnimationFrame(() => {
											window.scrollTo(0, scrollY);
										});
									}}
									options={tournamentOptions}
									placeholder={t("selectTournament")}
								/>
							</div>
						)}

						{/* Mobile: criteria + legend collapsed */}
						<details className="group overflow-hidden rounded-xl border-2 border-black bg-white shadow-comic lg:hidden">
							<summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 [&::-webkit-details-marker]:hidden">
								<Target
									className="h-4 w-4 shrink-0 text-ink"
									strokeWidth={2.5}
								/>
								<span className="flex-1 font-black font-display text-ink text-sm uppercase italic tracking-tight">
									{t("criteriaToggle")}
								</span>
								<ChevronDown
									className="h-4 w-4 shrink-0 text-gray-500 transition-transform duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-open:rotate-180"
									strokeWidth={2.5}
								/>
							</summary>
							<div className="space-y-4 border-black/10 border-t px-3 pt-3 pb-3">
								<CriteriaList items={criteriaItems} />
								<LegendList />
							</div>
						</details>

						{/* Desktop: always open */}
						<div className="hidden lg:contents">
							<div className="rounded-xl border-2 border-black bg-white p-3 shadow-comic">
								<div className="mb-3 flex items-center gap-2">
									<Target
										className="h-4 w-4 shrink-0 text-ink"
										strokeWidth={2.5}
									/>
									<span className="font-black font-display text-ink text-sm uppercase italic tracking-tight">
										{t("rankingCriteria")}
									</span>
								</div>
								<CriteriaList items={criteriaItems} />
							</div>

							<div className="rounded-xl border-2 border-black bg-white p-3 shadow-comic">
								<p className="mb-3 font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
									{t("legend")}
								</p>
								<LegendList />
							</div>
						</div>
					</aside>

					{/* Main: podium + ranking */}
					<main className="min-w-0">
						{leaderboard.length === 0 ? (
							<div className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-black/30 border-dashed bg-white/50 py-16 text-center">
								<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-paper">
									<Trophy className="h-8 w-8 text-gray-400" strokeWidth={2} />
								</div>
								<h2 className="mb-2 font-black font-display text-ink text-xl uppercase italic">
									{t("empty")}
								</h2>
								<p className="font-display text-gray-600 text-sm">
									{t("emptyHint")}
								</p>
							</div>
						) : (
							<>
								{top3.length > 0 && (
									<div id="leaderboard-podium">
										<PodiumSection
											entries={top3}
											currentUserId={currentUserId}
											tab={tab}
											highlightUserId={highlightUserId}
										/>
									</div>
								)}

								{rest.length > 0 && (
									<section ref={listRef} className="mt-8 w-full">
										<div className="mb-3 flex items-end justify-between gap-3">
											<h2 className="font-black font-display text-ink text-xl uppercase italic tracking-tight md:text-2xl">
												{t("restOfBoard")}
											</h2>
											<span className="font-body font-bold text-[10px] text-gray-500 uppercase tabular-nums tracking-widest">
												{t("showingRange", {
													from: pageStart + 4,
													to: Math.min(
														pageStart + PAGE_SIZE + 3,
														leaderboard.length,
													),
													total: leaderboard.length,
												})}
											</span>
										</div>

										<div className="overflow-hidden rounded-xl border-2 border-black bg-white shadow-comic">
											<div className="hidden items-center gap-2 border-black/10 border-b bg-tape px-3 py-2 sm:grid sm:grid-cols-[2.5rem_minmax(0,1fr)_auto_5.5rem]">
												<span className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
													{t("columns.position")}
												</span>
												<span className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
													{t("columns.player")}
												</span>
												<span className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
													{t("legend")}
												</span>
												<span className="text-right font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
													{t("columns.score")}
												</span>
											</div>

											<div
												className={clsx(
													"divide-y divide-black/10 transition-opacity duration-[120ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
													listVisible ? "opacity-100" : "opacity-0",
												)}
											>
												{pageEntries.map((entry) => (
													<LeaderboardRow
														key={entry.userId}
														entry={entry}
														isCurrentUser={entry.userId === currentUserId}
														highlighted={entry.userId === highlightUserId}
													/>
												))}
											</div>
										</div>

										{totalPages > 1 && (
											<div className="mt-4 flex items-center justify-between gap-3">
												<button
													type="button"
													disabled={safePage === 0}
													onClick={() => goToPage(safePage - 1)}
													className={clsx(
														"inline-flex items-center gap-1 rounded-lg border-2 border-black px-3 py-2 font-black font-display text-xs uppercase shadow-comic transition-[transform,background-color,box-shadow] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]",
														safePage === 0
															? "cursor-not-allowed bg-tape text-gray-400 shadow-none"
															: "bg-white text-ink hover:bg-paper",
													)}
												>
													<ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
													{t("prevPage")}
												</button>
												<span className="font-black font-body text-ink text-sm tabular-nums">
													{safePage + 1}/{totalPages}
												</span>
												<button
													type="button"
													disabled={safePage >= totalPages - 1}
													onClick={() => goToPage(safePage + 1)}
													className={clsx(
														"inline-flex items-center gap-1 rounded-lg border-2 border-black px-3 py-2 font-black font-display text-xs uppercase shadow-comic transition-[transform,background-color,box-shadow] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]",
														safePage >= totalPages - 1
															? "cursor-not-allowed bg-tape text-gray-400 shadow-none"
															: "bg-white text-ink hover:bg-paper",
													)}
												>
													{t("nextPage")}
													<ChevronRight className="h-4 w-4" strokeWidth={2.5} />
												</button>
											</div>
										)}
									</section>
								)}
							</>
						)}
					</main>
				</div>
			</div>
		</PublicPageShell>
	);
}

type CriteriaItem = {
	num: number;
	label: string;
	desc: string;
	color: string;
};

function CriteriaList({ items }: { items: CriteriaItem[] }) {
	return (
		<div className="flex flex-col gap-1.5">
			{items.map((c) => (
				<div
					key={c.num}
					className="flex items-start gap-2 rounded-lg bg-tape px-2.5 py-2"
				>
					<div
						className={clsx(
							"mt-0.5 box-border flex h-5 w-5 shrink-0 items-center justify-center rounded border border-black font-black font-body text-[10px] tabular-nums",
							c.color,
						)}
					>
						{c.num}
					</div>
					<div className="min-w-0">
						<p className="font-body font-bold text-[11px] text-ink uppercase tracking-widest">
							{c.label}
						</p>
						<p className="font-body font-medium text-[10px] text-gray-500">
							{c.desc}
						</p>
					</div>
				</div>
			))}
		</div>
	);
}

function LegendList() {
	const { t } = useTranslation("leaderboard");

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1 rounded bg-brawl-yellow px-1.5 py-0.5">
					<Star className="h-3 w-3 text-black" fill="black" strokeWidth={0} />
					<span className="font-black font-body text-[10px] text-black tabular-nums">
						0
					</span>
				</div>
				<span className="font-body font-bold text-[10px] text-gray-600 uppercase tracking-widest">
					{t("columns.perfect")}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1 rounded border border-black/20 bg-white px-1.5 py-0.5">
					<span className="font-black font-body text-[10px] text-green-600">
						✓
					</span>
					<span className="font-black font-body text-[10px] text-black tabular-nums">
						0
					</span>
				</div>
				<span className="font-body font-bold text-[10px] text-gray-600 uppercase tracking-widest">
					{t("columns.hits")}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1 rounded bg-green-500 px-1.5 py-0.5">
					<span className="font-black font-body text-[10px] text-white tabular-nums">
						70%
					</span>
				</div>
				<span className="font-body font-bold text-[10px] text-gray-600 uppercase tracking-widest">
					{t("columns.hitRate")}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1 rounded bg-purple-400 px-1.5 py-0.5">
					<Zap className="h-3 w-3 text-black" strokeWidth={2} />
					<span className="font-black font-body text-[10px] text-black tabular-nums">
						0
					</span>
				</div>
				<span className="font-body font-bold text-[10px] text-gray-600 uppercase tracking-widest">
					{t("columns.underdogs")}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1">
					<MiniMedalBadge tier="1st" size="sm" />
					<MiniMedalBadge tier="2nd" size="sm" />
					<MiniMedalBadge tier="3rd" size="sm" />
				</div>
				<span className="font-body font-bold text-[10px] text-gray-600 uppercase tracking-widest">
					{t("columns.medals")}
				</span>
			</div>
		</div>
	);
}

function getTiebreakerReason(
	higher: LeaderboardEntry,
	lower: LeaderboardEntry,
	tab: "global" | "season",
	t: (key: string) => string,
): string | null {
	if (higher.totalPoints !== lower.totalPoints) return null;

	if (higher.correctPredictions !== lower.correctPredictions) {
		return t("columns.hits");
	}
	if (higher.perfectPicks !== lower.perfectPicks) {
		return t("columns.perfect");
	}
	if (higher.underdogPicks !== lower.underdogPicks) {
		return t("columns.underdogs");
	}

	if (tab === "global") {
		if (higher.medals.total !== lower.medals.total) {
			return t("columns.medals");
		}
	} else {
		if (higher.gotMostImportantMatch !== lower.gotMostImportantMatch) {
			return t("columns.decisiveMatch");
		}
		if (
			higher.bestPreviousMonthResult !== lower.bestPreviousMonthResult &&
			(higher.bestPreviousMonthResult === null) !==
				(lower.bestPreviousMonthResult === null)
		) {
			return t("columns.lastMonthResult");
		}
		if (higher.globalRank !== lower.globalRank) {
			return t("tabs.global");
		}
	}

	return null;
}

function accuracyClass(rate: number): string {
	if (rate >= 70) return "bg-green-500 text-white";
	if (rate >= 40) return "bg-yellow-400 text-black";
	return "bg-red-500 text-white";
}

function StatPills({ entry }: { entry: LeaderboardEntry }) {
	const accuracyRate =
		entry.totalBets > 0
			? Math.round((entry.correctPredictions / entry.totalBets) * 100)
			: 0;

	const pill =
		"inline-flex h-5 items-center gap-0.5 rounded px-1.5 leading-none";

	return (
		<div className="flex flex-wrap items-center gap-1">
			<div className={clsx(pill, "bg-brawl-yellow")}>
				<Star className="h-2.5 w-2.5 shrink-0 text-black" fill="black" />
				<span className="font-black font-body text-[10px] text-black tabular-nums">
					{entry.perfectPicks}
				</span>
			</div>
			<div className={clsx(pill, "box-border border border-black/20 bg-white")}>
				<span className="font-black font-body text-[10px] text-green-600 leading-none">
					✓
				</span>
				<span className="font-black font-body text-[10px] text-black tabular-nums">
					{entry.correctPredictions}
				</span>
			</div>
			{entry.underdogPicks > 0 && (
				<div className={clsx(pill, "bg-purple-400")}>
					<Zap className="h-2.5 w-2.5 shrink-0 text-black" strokeWidth={3} />
					<span className="font-black font-body text-[10px] text-black tabular-nums">
						{entry.underdogPicks}
					</span>
				</div>
			)}
			<div className={clsx(pill, accuracyClass(accuracyRate))}>
				<span className="font-black font-body text-[10px] tabular-nums">
					{accuracyRate}%
				</span>
			</div>
			{entry.medals.total > 0 && (
				<MedalCountSummary
					gold={entry.medals.gold}
					silver={entry.medals.silver}
					bronze={entry.medals.bronze}
					size="sm"
				/>
			)}
		</div>
	);
}

function PodiumSection({
	entries,
	currentUserId,
	tab,
	highlightUserId,
}: {
	entries: LeaderboardEntry[];
	currentUserId?: string;
	tab: "global" | "season";
	highlightUserId: string | null;
}) {
	const { t } = useTranslation("leaderboard");
	const first = entries[0];
	const second = entries[1];
	const third = entries[2];

	const podiumConfig = {
		1: {
			bg: "bg-brawl-yellow",
			avatar: "h-16 w-16 md:h-20 md:w-20",
			avatarBorder: "border-brawl-yellow",
			crown: true,
			z: "z-20",
			scale: "md:scale-105",
			rankColor: "text-[#d4a800]",
			rankSize: "text-5xl md:text-6xl",
			height: "h-24 md:h-28",
		},
		2: {
			bg: "bg-[#c0c0c0]",
			avatar: "h-14 w-14 md:h-16 md:w-16",
			avatarBorder: "border-[#a8a8a8]",
			crown: false,
			z: "z-10",
			scale: "",
			rankColor: "text-[#909090]",
			rankSize: "text-4xl md:text-5xl",
			height: "h-16 md:h-20",
		},
		3: {
			bg: "bg-[#cd7f32]",
			avatar: "h-14 w-14 md:h-16 md:w-16",
			avatarBorder: "border-[#a0622e]",
			crown: false,
			z: "z-10",
			scale: "",
			rankColor: "text-[#8b5e2a]",
			rankSize: "text-4xl md:text-5xl",
			height: "h-12 md:h-16",
		},
	};

	const PodiumColumn = ({
		entry,
		rank,
		tiebreakerReason,
	}: {
		entry?: LeaderboardEntry;
		rank: 1 | 2 | 3;
		tiebreakerReason?: string | null;
	}) => {
		const { linkTo } = useLangLink();
		if (!entry) return <div className="flex flex-1 flex-col items-center" />;
		const cfg = podiumConfig[rank];
		const isMe = entry.userId === currentUserId;
		const isHighlighted = entry.userId === highlightUserId;
		const rankLabel = rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd";

		return (
			<div
				id={`rank-row-${entry.userId}`}
				className={clsx(
					"flex flex-1 flex-col items-center rounded-xl transition-[box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
					cfg.z,
					cfg.scale,
					isHighlighted && "ring-2 ring-electric-lime ring-offset-2",
				)}
			>
				{cfg.crown ? (
					<div className="mb-1">
						<Crown
							className="h-6 w-6 text-brawl-yellow"
							fill="#ffc700"
							strokeWidth={2}
						/>
					</div>
				) : (
					<div className="mb-1">
						<MiniMedalBadge
							tier={rankLabel as "1st" | "2nd" | "3rd"}
							size="sm"
						/>
					</div>
				)}

				<Link
					to={linkTo("/users/$userId")}
					params={{ userId: entry.userId }}
					className="group relative"
				>
					<div
						className={clsx(
							"lb-avatar-hover mb-1 overflow-hidden rounded-lg border-2 bg-white shadow-comic",
							cfg.avatar,
							cfg.avatarBorder,
							isMe && "ring-[3px] ring-electric-lime",
						)}
					>
						{entry.image ? (
							<img
								src={entry.image}
								alt={entry.name}
								className="h-full w-full object-cover"
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center bg-paper font-black font-display text-gray-400 text-lg">
								{entry.name.charAt(0).toUpperCase()}
							</div>
						)}
					</div>
					<div
						className={clsx(
							"absolute -right-1.5 -bottom-1.5 flex h-5 w-5 items-center justify-center rounded-md border-2 border-black font-black font-body text-[10px] tabular-nums shadow-sm",
							rank === 1 ? "bg-brawl-yellow text-black" : "bg-ink text-white",
						)}
					>
						{rank}
					</div>
				</Link>

				<Link
					to={linkTo("/users/$userId")}
					params={{ userId: entry.userId }}
					className="mb-1"
				>
					<span
						className={clsx(
							"block max-w-[120px] truncate pe-[0.35em] text-center font-black font-display text-xs uppercase italic tracking-tight md:text-sm",
							isMe ? "text-brawl-blue" : "text-ink",
						)}
					>
						{entry.name}
					</span>
				</Link>

				<div className="mb-2 text-center">
					<span
						className={clsx(
							"block font-black font-body text-ink tabular-nums leading-none",
							rank === 1 ? "text-3xl" : "text-2xl",
						)}
					>
						{entry.totalPoints}
					</span>
					<span className="block font-body font-bold text-[9px] text-gray-500 uppercase tracking-widest">
						{t("pts")}
					</span>
				</div>

				<div className="mb-1.5 flex min-h-5 justify-center">
					{entry.medals.total > 0 && (
						<MedalCountSummary
							gold={entry.medals.gold}
							silver={entry.medals.silver}
							bronze={entry.medals.bronze}
							size="sm"
						/>
					)}
				</div>

				<div className="mb-2 flex min-h-5 justify-center">
					{tiebreakerReason && (
						<div className="inline-flex items-center rounded border border-black bg-electric-lime px-2 py-0.5 shadow-comic-sm">
							<span className="font-body font-bold text-[9px] text-black uppercase tracking-widest">
								{tiebreakerReason}
							</span>
						</div>
					)}
				</div>

				<div className="mb-3 scale-90">
					<StatPills entry={entry} />
				</div>

				<div
					className={clsx(
						"relative mt-auto w-full rounded-t-xl border-[3px] border-black shadow-comic",
						rank === 3 ? "skew-x-1" : "-skew-x-1",
						cfg.bg,
						cfg.height,
					)}
				>
					<span
						className={clsx(
							"absolute bottom-1 left-1/2 -translate-x-1/2 select-none font-black font-body italic tabular-nums tracking-tighter",
							rank === 3 ? "-skew-x-1" : "skew-x-1",
							cfg.rankSize,
							cfg.rankColor,
						)}
					>
						{rank}
					</span>
				</div>
			</div>
		);
	};

	const secondTiebreaker = second
		? getTiebreakerReason(first, second, tab, t)
		: null;
	const thirdTiebreaker = third
		? getTiebreakerReason(second || first, third, tab, t)
		: null;

	return (
		<div className="relative flex w-full items-end gap-2 px-1 pt-4 md:gap-4">
			<div className="absolute right-0 bottom-0 left-0 h-1.5 bg-black" />
			<PodiumColumn
				entry={second}
				rank={2}
				tiebreakerReason={secondTiebreaker}
			/>
			<PodiumColumn entry={first} rank={1} />
			<PodiumColumn entry={third} rank={3} tiebreakerReason={thirdTiebreaker} />
		</div>
	);
}

function LeaderboardRow({
	entry,
	isCurrentUser,
	highlighted,
}: {
	entry: LeaderboardEntry;
	isCurrentUser: boolean;
	highlighted: boolean;
}) {
	const { t } = useTranslation("leaderboard");
	const { linkTo } = useLangLink();

	return (
		<div
			id={`rank-row-${entry.userId}`}
			className={clsx(
				"grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 transition-[background-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none sm:grid-cols-[2.5rem_minmax(0,1fr)_auto_5.5rem]",
				isCurrentUser && "bg-electric-lime/20",
				highlighted && "bg-electric-lime/40",
				!isCurrentUser && !highlighted && "lb-row-hover",
			)}
		>
			<div
				className={clsx(
					"flex h-8 w-8 items-center justify-center rounded-md border border-black/10",
					isCurrentUser ? "bg-electric-lime text-ink" : "bg-ink text-white",
				)}
			>
				<span className="font-black font-body text-sm italic tabular-nums">
					{entry.rank}
				</span>
			</div>

			<div className="flex min-w-0 items-center gap-2.5">
				<Link
					to={linkTo("/users/$userId")}
					params={{ userId: entry.userId }}
					className="h-9 w-9 shrink-0 overflow-hidden rounded-md border-2 border-black bg-paper"
				>
					{entry.image ? (
						<img
							src={entry.image}
							alt={entry.name}
							className="h-full w-full object-cover"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center font-black font-display text-gray-400 text-sm">
							{entry.name.charAt(0).toUpperCase()}
						</div>
					)}
				</Link>
				<div className="min-w-0 flex-1">
					<div className="flex min-w-0 items-center gap-1.5">
						<Link
							to={linkTo("/users/$userId")}
							params={{ userId: entry.userId }}
							className={clsx(
								"min-w-0 flex-1 truncate pe-[0.35em] font-black font-display text-sm uppercase italic tracking-tight transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
								isCurrentUser
									? "text-brawl-blue hover:text-brawl-blue/75"
									: "text-ink hover:text-brawl-blue",
							)}
						>
							{entry.name}
						</Link>
						{isCurrentUser && (
							<span className="shrink-0 rounded border border-black bg-electric-lime px-1.5 py-0.5 font-body font-bold text-[9px] text-ink uppercase tracking-widest">
								{t("you")}
							</span>
						)}
					</div>
					<div className="mt-1 sm:hidden">
						<StatPills entry={entry} />
					</div>
				</div>
			</div>

			<div className="hidden sm:block">
				<StatPills entry={entry} />
			</div>

			<div className="shrink-0 text-right">
				<span className="block font-black font-body text-ink text-lg tabular-nums leading-none">
					{entry.totalPoints}
				</span>
				<span className="block font-body font-bold text-[9px] text-gray-500 uppercase tracking-widest">
					{t("pts")}
				</span>
			</div>
		</div>
	);
}
