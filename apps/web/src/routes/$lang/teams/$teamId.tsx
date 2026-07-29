import { createFileRoute, Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { Award, Target, TrendingUp, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	BannerMetaPill,
	bannerBackLinkClass,
	EntityDetailBanner,
} from "@/components/EntityDetailBanner";
import {
	DetailEmptyState,
	DetailSectionHeader,
	DetailStatCard,
} from "@/components/entity-detail-ui";
import { PublicPageShell } from "@/components/PublicPageShell";
import { TeamLogo } from "@/components/TeamLogo";
import {
	TeamFormStrip,
	TeamHistoryRow,
	TeamUpcomingRow,
} from "@/components/TeamMatchCard";
import { useLangLink } from "@/i18n/useLangLink";
import { getIntermediateColor } from "@/lib/color-extractor";
import { extractColorsServer } from "@/server/color-extractor";
import { getTeamBySlug } from "@/server/teams";

export const Route = createFileRoute("/$lang/teams/$teamId")({
	loader: async ({ params }) => {
		const data = await getTeamBySlug({ data: params.teamId });

		let colors = {
			primary: "#2e5cff",
			secondary: "#ff2e2e",
			tertiary: "#7f46d6",
			style: "linear" as "linear" | "radial",
		};

		if (data.team.logoUrl) {
			try {
				colors = await extractColorsServer({ data: data.team.logoUrl });
			} catch (e) {
				console.error("Failed to extract colors in loader", e);
			}
		}

		return { ...data, colors };
	},
	component: TeamDetailsPage,
});

function TeamDetailsPage() {
	const { t, i18n } = useTranslation("team");
	const { linkTo } = useLangLink();
	const { team, matches, tournaments, colors } = Route.useLoaderData();
	const locale = i18n.language === "pt" ? "pt-BR" : "en-US";

	const intermediate = getIntermediateColor(colors.primary, colors.secondary);
	const teamColors = {
		primary: colors.primary,
		secondary: colors.secondary,
		intermediate: colors.tertiary || intermediate,
	};

	const finishedMatches = matches.filter((m) => m.status === "finished");
	const wins = finishedMatches.filter((m) => m.winnerId === team.id).length;
	const losses = finishedMatches.length - wins;
	const winRate =
		finishedMatches.length > 0
			? Math.round((wins / finishedMatches.length) * 100)
			: 0;

	let currentStreak = 0;
	let streakType: "W" | "L" | null = null;

	for (let i = 0; i < finishedMatches.length; i++) {
		const match = finishedMatches[i];
		if (!match) break;
		const isWin = match.winnerId === team.id;

		if (i === 0) {
			streakType = isWin ? "W" : "L";
			currentStreak = 1;
		} else if (
			(isWin && streakType === "W") ||
			(!isWin && streakType === "L")
		) {
			currentStreak++;
		} else {
			break;
		}
	}

	const recentMatches = finishedMatches.slice(0, 10);
	const upcomingMatches = matches
		.filter((m) => m.status === "scheduled" || m.status === "live")
		.sort(
			(a, b) =>
				new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
		);

	return (
		<PublicPageShell className="pb-20">
			<EntityDetailBanner
				colors={teamColors}
				topBar={
					<Link
						to={linkTo("/tournaments")}
						search={{ filter: "active" }}
						className={bannerBackLinkClass}
					>
						<span className="material-symbols-outlined text-lg">
							arrow_back
						</span>
						<span className="hidden sm:inline">{t("back")}</span>
					</Link>
				}
				logo={
					<TeamLogo
						teamName={team.name}
						logoUrl={team.logoUrl}
						className="h-full w-full object-contain"
					/>
				}
				meta={
					<>
						{team.region ? (
							<BannerMetaPill>{team.region}</BannerMetaPill>
						) : null}
						<BannerMetaPill>
							{t("stats.matchCount", { count: finishedMatches.length })}
						</BannerMetaPill>
						<BannerMetaPill>
							{t("stats.tournamentCount", { count: tournaments.length })}
						</BannerMetaPill>
					</>
				}
				title={team.name}
			/>

			<div className="relative z-10 mx-auto max-w-[1400px] px-4 py-8 md:px-6 md:py-10">
				<div className="mb-12 grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
					<DetailStatCard
						icon={<Trophy className="h-5 w-5" />}
						label={t("stats.matches")}
						value={finishedMatches.length.toString()}
					/>
					<DetailStatCard
						icon={<Target className="h-5 w-5" />}
						label={t("stats.winRate")}
						value={`${winRate}%`}
						variant="highlight"
					/>
					<DetailStatCard
						icon={<TrendingUp className="h-5 w-5 text-brawl-blue" />}
						label={t("stats.wins")}
						value={wins.toString()}
					/>
					<DetailStatCard
						icon={<TrendingUp className="h-5 w-5 rotate-180 text-brawl-red" />}
						label={t("stats.losses")}
						value={losses.toString()}
					/>
					<DetailStatCard
						icon={<Award className="h-5 w-5" />}
						label={t("stats.currentStreak")}
						value={currentStreak > 0 ? `${currentStreak}${streakType}` : "-"}
						variant={
							streakType === "W"
								? "win"
								: streakType === "L"
									? "loss"
									: "default"
						}
					/>
				</div>

				{upcomingMatches.length > 0 ? (
					<section className="mb-12">
						<DetailSectionHeader
							title={t("sections.upcoming")}
							trailing={
								upcomingMatches.some((m) => m.status === "live") ? (
									<span className="surface-brawl-red -skew-x-6 border-[3px] border-black px-3 py-1 font-black font-display text-xs uppercase shadow-comic-sm">
										<span className="inline-block skew-x-6">
											{t("status.live")}
										</span>
									</span>
								) : null
							}
						/>
						<ul className="divide-y-[3px] divide-black overflow-hidden border-[3px] border-black bg-white shadow-comic-md">
							{upcomingMatches.map((match) => (
								<TeamUpcomingRow
									key={match.id}
									team={team}
									teamAId={match.teamAId}
									teamA={match.teamA}
									teamB={match.teamB}
									status={match.status as "scheduled" | "live" | "finished"}
									startTime={match.startTime}
									tournament={match.tournament}
									locale={locale}
								/>
							))}
						</ul>
					</section>
				) : null}

				<section className="mb-12">
					<DetailSectionHeader
						title={t("sections.recentResults")}
						trailing={
							recentMatches.length > 0 ? (
								<TeamFormStrip
									results={[...recentMatches].reverse().map((match) => ({
										id: match.id,
										won: match.winnerId === team.id,
									}))}
								/>
							) : null
						}
					/>
					{recentMatches.length > 0 ? (
						<ul className="divide-y-[3px] divide-black overflow-hidden border-[3px] border-black bg-white shadow-comic-md">
							{recentMatches.map((match) => (
								<TeamHistoryRow
									key={match.id}
									team={team}
									teamAId={match.teamAId}
									teamA={match.teamA}
									teamB={match.teamB}
									winnerId={match.winnerId}
									scoreA={match.scoreA}
									scoreB={match.scoreB}
									resultType={match.resultType as "wo" | null}
									startTime={match.startTime}
									tournament={match.tournament}
									locale={locale}
								/>
							))}
						</ul>
					) : (
						<DetailEmptyState
							icon={
								<Trophy className="h-7 w-7 text-gray-600" strokeWidth={2} />
							}
							title={t("empty.noFinishedMatches")}
						/>
					)}
				</section>

				{tournaments.length > 0 ? (
					<section>
						<DetailSectionHeader title={t("tournaments")} />
						<ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
							{tournaments.map((tournament) => {
								const isActive = tournament.status === "active";
								const isUpcoming = tournament.status === "upcoming";
								return (
									<li key={tournament.id}>
										<Link
											to={linkTo("/tournaments/$slug")}
											params={{ slug: tournament.slug }}
											className="group relative flex items-center gap-4 overflow-hidden border-[3px] border-black bg-white p-4 text-ink shadow-comic-md transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-comic-press"
										>
											<div
												aria-hidden="true"
												className={clsx(
													"absolute top-0 bottom-0 left-0 w-1.5",
													isActive
														? "bg-electric-lime"
														: isUpcoming
															? "bg-brawl-yellow"
															: "bg-tape",
												)}
											/>
											<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border-[3px] border-black bg-white p-2 shadow-comic-sm">
												{tournament.logoUrl ? (
													<img
														src={tournament.logoUrl}
														alt={tournament.name}
														className="h-full w-full object-contain"
													/>
												) : (
													<Trophy
														className="h-7 w-7 text-gray-600"
														strokeWidth={2}
													/>
												)}
											</div>
											<div className="min-w-0 flex-1">
												<h3 className="break-words pe-[0.2em] pb-0.5 font-black font-display text-ink text-sm uppercase italic leading-[1.2] tracking-tighter transition-colors group-hover:text-brawl-blue">
													{tournament.name}
												</h3>
												<p className="mt-0.5 font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
													{tournament.region || t("region.global")}
												</p>
											</div>
											<span
												className={clsx(
													"-skew-x-6 border-2 border-black px-2.5 py-1 font-body font-bold text-[9px] uppercase tracking-widest shadow-comic-sm",
													isActive
														? "surface-lime"
														: isUpcoming
															? "surface-yellow"
															: "surface-tape",
												)}
											>
												<span className="inline-block skew-x-6">
													{isActive
														? t("status.active")
														: isUpcoming
															? t("status.upcoming")
															: t("status.finished")}
												</span>
											</span>
										</Link>
									</li>
								);
							})}
						</ul>
					</section>
				) : null}
			</div>
		</PublicPageShell>
	);
}
