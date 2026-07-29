import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	Award,
	ChevronRight,
	Clock,
	Target,
	TrendingUp,
	Trophy,
	Zap,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ActiveBetRow } from "@/components/ActiveBetRow";
import { MedalSummary } from "@/components/MedalSummary";
import { PublicPageShell } from "@/components/PublicPageShell";
import { getDashboardData } from "@/functions/get-dashboard-data";
import { getUser } from "@/functions/get-user";
import { useLangLink } from "@/i18n/useLangLink";
import { getUserMedalCounts, getUserMedals } from "@/server/user-profile";
import { getMyProfile } from "@/server/users";

const ACTIVE_BETS_PREVIEW = 4;

export const Route = createFileRoute("/$lang/dashboard")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ context }) => {
		if (!context.session) {
			throw redirect({
				to: "/login",
			});
		}
	},
});

function RouteComponent() {
	const { t, i18n } = useTranslation("dashboard");
	const { linkTo } = useLangLink();
	const { session } = Route.useRouteContext();
	const locale = i18n.language === "pt" ? "pt-BR" : "en-US";

	const { data, isLoading } = useQuery({
		queryKey: ["dashboard"],
		queryFn: () => getDashboardData(),
	});

	const { data: profile } = useQuery({
		queryKey: ["myProfile"],
		queryFn: () => getMyProfile(),
		staleTime: 1000 * 60 * 5,
	});

	const { data: medalCounts } = useQuery({
		queryKey: ["myMedalCounts"],
		queryFn: () => getUserMedalCounts({ data: session?.user?.id || "" }),
		enabled: !!session?.user?.id,
		staleTime: 1000 * 60 * 5,
	});

	const { data: medals } = useQuery({
		queryKey: ["myMedals"],
		queryFn: () => getUserMedals({ data: session?.user?.id || "" }),
		enabled: !!session?.user?.id,
		staleTime: 1000 * 60 * 5,
	});

	const displayName = profile?.nickname || session?.user.name;

	const stats = data?.stats ?? {
		totalBets: 0,
		correctPredictions: 0,
		totalPoints: 0,
		accuracy: 0,
		pendingBets: 0,
		perfectPicks: 0,
		underdogWins: 0,
	};
	const activeBets = data?.activeBets ?? [];
	const activeTournaments = data?.activeTournaments ?? [];

	const sortedActiveBets = useMemo(() => {
		return [...activeBets].sort((a, b) => {
			const liveRank = (status: string) => (status === "live" ? 0 : 1);
			const byLive = liveRank(a.match.status) - liveRank(b.match.status);
			if (byLive !== 0) return byLive;

			const timeA = a.match.startTime
				? new Date(a.match.startTime).getTime()
				: Number.POSITIVE_INFINITY;
			const timeB = b.match.startTime
				? new Date(b.match.startTime).getTime()
				: Number.POSITIVE_INFINITY;
			return timeA - timeB;
		});
	}, [activeBets]);

	const previewBets = sortedActiveBets.slice(0, ACTIVE_BETS_PREVIEW);
	const hasMoreActiveBets = sortedActiveBets.length > ACTIVE_BETS_PREVIEW;

	return (
		<PublicPageShell className="pb-12">
			<div className="relative z-10 mx-auto max-w-[1400px] px-4 py-8 md:px-6 md:py-12">
				{/* Header */}
				<div className="mb-10 md:mb-14">
					<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
						<div>
							<h1 className="font-black font-display text-4xl text-ink uppercase italic tracking-tighter md:text-5xl lg:text-6xl">
								{t("title")}
							</h1>
							<p className="mt-2 font-bold font-display text-gray-600 text-lg">
								{t("greeting", { name: displayName })} {t("subtitle")}
							</p>
						</div>
						<Link
							to={linkTo("/my-bets")}
							className="group flex items-center gap-2 font-black font-display text-brawl-blue text-sm uppercase tracking-wider transition-colors hover:text-ink"
						>
							{t("viewHistory")}
							<ChevronRight
								className="h-4 w-4 transition-transform group-hover:translate-x-1"
								strokeWidth={3}
							/>
						</Link>
					</div>
				</div>

				{/* Stats */}
				<section className="mb-10 md:mb-14">
					<h2 className="mb-6 font-black font-display text-ink text-xl uppercase italic tracking-tight md:text-2xl">
						{t("stats.title")}
					</h2>

					{isLoading ? (
						<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
							{[1, 2, 3, 4].map((i) => (
								<div
									key={i}
									className="h-28 animate-pulse rounded-lg border-2 border-black/10 bg-white"
								/>
							))}
						</div>
					) : (
						<div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
							{/* Total Points */}
							<div className="relative overflow-hidden rounded-lg border-2 border-black bg-white p-4 shadow-comic transition-all hover:shadow-comic-md">
								<div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-brawl-yellow">
									<TrendingUp
										className="h-5 w-5 text-black"
										strokeWidth={2.5}
									/>
								</div>
								<div className="font-black font-body text-3xl text-ink tabular-nums md:text-4xl">
									{stats.totalPoints}
								</div>
								<div className="mt-1 font-body font-bold text-[10px] text-gray-600 uppercase tracking-widest">
									{t("stats.totalPoints")}
								</div>
							</div>

							{/* Accuracy */}
							<div className="relative overflow-hidden rounded-lg border-2 border-black bg-white p-4 shadow-comic transition-all hover:shadow-comic-md">
								<div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-brawl-blue">
									<Target className="h-5 w-5 text-white" strokeWidth={2.5} />
								</div>
								<div className="font-black font-body text-3xl text-ink tabular-nums md:text-4xl">
									{stats.accuracy}
									<span className="text-xl">%</span>
								</div>
								<div className="mt-1 font-body font-bold text-[10px] text-gray-600 uppercase tracking-widest">
									{t("stats.hitRate")}
								</div>
								<div className="mt-1 font-body font-medium text-[10px] text-gray-500">
									{t("stats.correctCount", {
										correct: stats.correctPredictions,
										total: stats.totalBets,
									})}
								</div>
							</div>

							{/* Perfect Picks */}
							<div className="relative overflow-hidden rounded-lg border-2 border-black bg-white p-4 shadow-comic transition-all hover:shadow-comic-md">
								<div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-electric-lime">
									<Award className="h-5 w-5 text-black" strokeWidth={2.5} />
								</div>
								<div className="font-black font-body text-3xl text-ink tabular-nums md:text-4xl">
									{stats.perfectPicks}
								</div>
								<div className="mt-1 font-body font-bold text-[10px] text-gray-600 uppercase tracking-widest">
									{t("stats.perfectPicks")}
								</div>
							</div>

							{/* Pending Bets */}
							<div className="relative overflow-hidden rounded-lg border-2 border-black bg-white p-4 shadow-comic transition-all hover:shadow-comic-md">
								<div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-brawl-red">
									<Clock className="h-5 w-5 text-white" strokeWidth={2.5} />
								</div>
								<div className="font-black font-body text-3xl text-ink tabular-nums md:text-4xl">
									{stats.pendingBets}
								</div>
								<div className="mt-1 font-body font-bold text-[10px] text-gray-600 uppercase tracking-widest">
									{t("stats.pendingBets")}
								</div>
							</div>
						</div>
					)}

					{/* Additional Stats */}
					{!isLoading && stats.totalBets > 0 && (
						<div className="mt-4 grid grid-cols-2 gap-3 md:gap-4">
							{/* Underdog highlight — broadcast callout, not a gradient */}
							<div className="relative flex items-center gap-3 border-[3px] border-black bg-brawl-yellow p-4 shadow-comic-md">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-ink">
									<Trophy
										className="h-5 w-5 text-brawl-yellow"
										strokeWidth={2.5}
										fill="currentColor"
									/>
								</div>
								<div className="min-w-0">
									<div className="font-black font-body text-3xl text-ink tabular-nums leading-none tracking-tight">
										{stats.underdogWins}
									</div>
									<div className="mt-1 font-body font-bold text-[10px] text-ink/70 uppercase tracking-widest">
										{t("stats.underdogsWon")}
									</div>
								</div>
							</div>

							<div className="flex items-center gap-3 self-center rounded-lg border-2 border-black bg-ink p-3 shadow-comic">
								<div className="flex h-8 w-8 items-center justify-center rounded-md bg-electric-lime">
									<Zap className="h-4 w-4 text-black" strokeWidth={2.5} />
								</div>
								<div>
									<div className="font-black font-body text-white text-xl tabular-nums">
										{stats.totalBets}
									</div>
									<div className="font-body font-bold text-[10px] text-white/70 uppercase tracking-widest">
										{t("stats.totalBets")}
									</div>
								</div>
							</div>
						</div>
					)}
				</section>

				{/* Achievements */}
				<section className="mb-10 md:mb-14">
					<h2 className="mb-5 font-black font-display text-ink text-xl uppercase italic tracking-tight md:text-2xl">
						{t("stats.achievements")}
					</h2>
					<MedalSummary
						total={medalCounts?.total || 0}
						gold={medalCounts?.gold || 0}
						silver={medalCounts?.silver || 0}
						bronze={medalCounts?.bronze || 0}
						recentMedals={medals?.slice(0, 3).map((m) => ({
							tournamentName: m.tournamentName,
							placement: m.placement,
							tournamentSlug: m.tournamentSlug,
						}))}
						userId={session?.user?.id}
						hideHeader
					/>
				</section>

				{/* Active Bets + Tournaments */}
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
					<section className="lg:col-span-2">
						<div className="mb-5 flex flex-wrap items-end justify-between gap-3">
							<div className="flex items-center gap-3">
								<h2 className="font-black font-display text-ink text-xl uppercase italic tracking-tight md:text-2xl">
									{t("stats.activeBets")}
								</h2>
								{activeBets.length > 0 && (
									<span className="rounded-md bg-electric-lime px-2 py-0.5 font-black font-display text-black text-xs">
										{activeBets.length}
									</span>
								)}
							</div>
							{activeBets.length > 0 && (
								<div className="flex flex-col items-end gap-0.5">
									{hasMoreActiveBets && (
										<span className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
											{t("stats.showingOf", {
												shown: previewBets.length,
												total: sortedActiveBets.length,
											})}
										</span>
									)}
									<Link
										to={linkTo("/my-bets")}
										className="group flex items-center gap-1 font-black font-display text-brawl-blue text-xs uppercase tracking-wider transition-colors hover:text-ink"
									>
										{t("stats.viewAllPicks")}
										<ChevronRight
											className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
											strokeWidth={3}
										/>
									</Link>
								</div>
							)}
						</div>

						{isLoading ? (
							<div className="space-y-3">
								{[1, 2, 3].map((i) => (
									<div
										key={i}
										className="h-20 animate-pulse rounded-lg border-2 border-black/10 bg-white"
									/>
								))}
							</div>
						) : previewBets.length > 0 ? (
							<div className="space-y-3">
								{previewBets.map((bet) => (
									<ActiveBetRow
										key={bet.id}
										matchLabel={bet.match.tournament?.name || ""}
										headerLogoUrl={bet.match.tournament?.logoUrl}
										headerLogoAlt={bet.match.tournament?.name}
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
										status={bet.match.status}
										startTime={bet.match.startTime}
										predictedWinnerId={bet.predictedWinnerId}
										predictedScoreA={bet.predictedScoreA}
										predictedScoreB={bet.predictedScoreB}
										locale={locale}
									/>
								))}
								{hasMoreActiveBets && (
									<Link
										to={linkTo("/my-bets")}
										className="flex items-center justify-center gap-2 rounded-lg border-2 border-black border-dashed bg-paper px-4 py-3 font-black font-display text-ink text-sm uppercase tracking-wider transition-colors hover:bg-electric-lime"
									>
										{t("stats.viewAllPicks")}
										<span className="rounded-sm bg-ink px-1.5 py-0.5 font-body font-bold text-[10px] text-white tabular-nums">
											+{sortedActiveBets.length - previewBets.length}
										</span>
									</Link>
								)}
							</div>
						) : (
							<div className="rounded-lg border-2 border-black bg-white p-8 text-center shadow-comic">
								<p className="mb-1 font-black font-display text-ink text-lg uppercase italic">
									{t("empty.noActive")}
								</p>
								<p className="mb-5 font-display text-gray-600 text-sm">
									{t("empty.noBets")}
								</p>
								<Link to={linkTo("/")}>
									<button
										type="button"
										className="rounded-lg border-2 border-black bg-brawl-yellow px-6 py-3 font-black font-display text-black text-sm uppercase tracking-wider shadow-comic transition-all hover:shadow-comic-sm active:shadow-none"
									>
										{t("stats.viewMatches")}
									</button>
								</Link>
							</div>
						)}
					</section>

					<section>
						<h2 className="mb-5 font-black font-display text-ink text-xl uppercase italic tracking-tight md:text-2xl">
							{t("stats.tournaments")}
						</h2>

						{isLoading ? (
							<div className="space-y-3">
								{[1, 2, 3].map((i) => (
									<div
										key={i}
										className="h-16 animate-pulse rounded-lg border-2 border-black/10 bg-white"
									/>
								))}
							</div>
						) : activeTournaments.length > 0 ? (
							<div className="space-y-3">
								{activeTournaments.map((tournament) => (
									<Link
										key={tournament.id}
										to={linkTo("/")}
										search={{ tournament: tournament.slug }}
										className="group flex items-center gap-3 rounded-lg border-2 border-black bg-white p-3 shadow-comic transition-all hover:bg-brawl-yellow/10 hover:shadow-comic-md"
									>
										{tournament.logoUrl ? (
											<img
												src={tournament.logoUrl}
												alt={tournament.name}
												className="h-10 w-10 rounded object-contain"
											/>
										) : (
											<div className="flex h-10 w-10 items-center justify-center rounded bg-paper">
												<Trophy
													className="h-5 w-5 text-gray-400"
													strokeWidth={2}
												/>
											</div>
										)}
										<div className="min-w-0 flex-1">
											<p className="truncate font-bold font-display text-ink text-sm">
												{tournament.name}
											</p>
											<p className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
												{t("stats.viewMatches")}
											</p>
										</div>
										<ChevronRight
											className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-ink"
											strokeWidth={2}
										/>
									</Link>
								))}
							</div>
						) : (
							<div className="rounded-lg border-2 border-black bg-white p-6 text-center shadow-comic">
								<p className="font-bold font-display text-gray-600 text-sm">
									{t("stats.noActiveTournaments")}
								</p>
							</div>
						)}
					</section>
				</div>
			</div>
		</PublicPageShell>
	);
}
