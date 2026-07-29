import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
	Bolt,
	Crosshair,
	History,
	Star,
	Target,
	Trophy,
	User,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { TrophyCase } from "@/components/RealisticMedal";
import {
	UserPickTile,
	UserPicksModal,
} from "@/components/UserPicksModal";
import { useLangLink } from "@/i18n/useLangLink";
import { getIntermediateColor } from "@/lib/color-extractor";
import { extractColorsServer } from "@/server/color-extractor";
import {
	getUserMedals,
	getUserProfile,
	getUserRecentBets,
	getUserStats,
	getUserTournamentHistory,
} from "@/server/user-profile";
import { sortMyBetsByMatchOrder } from "@/utils/my-bets-match-order";

const PREVIEW_PICK_LIMIT = 3;

export const Route = createFileRoute("/$lang/users/$userId")({
	loader: async ({ params }) => {
		const [profile, stats, medals, recentBets, tournamentHistory] =
			await Promise.all([
				getUserProfile({ data: params.userId }),
				getUserStats({ data: params.userId }),
				getUserMedals({ data: params.userId }),
				getUserRecentBets({ data: params.userId }),
				getUserTournamentHistory({ data: params.userId }),
			]);

		if (!profile) throw notFound();

		let colors = {
			primary: "#2e5cff",
			secondary: "#ff2e2e",
			tertiary: "#7f46d6",
			style: "linear" as "linear" | "radial",
		};

		if (profile.image) {
			try {
				colors = await extractColorsServer({ data: profile.image });
			} catch (e) {
				console.error("Failed to extract colors from avatar", e);
			}
		}

		return { profile, stats, medals, recentBets, tournamentHistory, colors };
	},
	component: UserProfilePage,
});

function UserProfilePage() {
	const { t, i18n } = useTranslation("user");
	const { linkTo } = useLangLink();
	const data = Route.useLoaderData();
	const user = data.profile;
	const stats = data.stats;
	const medals = data.medals;
	const recentBets = data.recentBets;
	const tourneyHistory = data.tournamentHistory;
	const colors = data.colors;
	const locale = i18n.language === "pt" ? "pt-BR" : "en-US";
	const [isPicksModalOpen, setIsPicksModalOpen] = useState(false);

	const intermediate = getIntermediateColor(colors.primary, colors.secondary);
	const bannerColors = {
		primary: colors.primary,
		secondary: colors.secondary,
		intermediate: colors.tertiary || intermediate,
	};

	const displayName = user.nickname ?? user.name;
	const initial = (displayName ?? "U").charAt(0).toUpperCase();

	const betsByTournament = useMemo(() => {
		const grouped = recentBets.reduce(
			(acc, bet) => {
				const tournamentId = String(bet.match.tournament?.id ?? "unknown");
				if (!acc[tournamentId]) {
					acc[tournamentId] = {
						id: tournamentId,
						name: bet.match.tournament?.name || t("unknownTournament"),
						logoUrl: bet.match.tournament?.logoUrl,
						bets: [] as typeof recentBets,
					};
				}
				acc[tournamentId].bets.push(bet);
				return acc;
			},
			{} as Record<
				string,
				{
					id: string;
					name: string;
					logoUrl?: string | null;
					bets: typeof recentBets;
				}
			>,
		);

		const groups = Object.values(grouped);
		groups.forEach((group) => {
			group.bets = sortMyBetsByMatchOrder(group.bets);
		});

		groups.sort((a, b) => {
			const aTime = a.bets[0]
				? new Date(a.bets[0].match.startTime).getTime()
				: 0;
			const bTime = b.bets[0]
				? new Date(b.bets[0].match.startTime).getTime()
				: 0;
			return bTime - aTime;
		});

		return groups;
	}, [recentBets, t]);

	const latestTournament = betsByTournament[0] ?? null;
	const previewBets = latestTournament?.bets.slice(0, PREVIEW_PICK_LIMIT) ?? [];
	const totalPickCount = recentBets.length;

	const memberSince = new Date(user.createdAt).toLocaleDateString(locale, {
		year: "numeric",
		month: "short",
	});

	return (
		<PublicPageShell className="pb-20">
			<EntityDetailBanner
				colors={bannerColors}
				topBar={
					<Link
						to={linkTo("/leaderboard")}
						search={{ page: 1, pageSize: 20 } as any}
						className={bannerBackLinkClass}
					>
						<span className="material-symbols-outlined text-lg">
							arrow_back
						</span>
						<span className="hidden sm:inline">{t("back")}</span>
					</Link>
				}
				logo={
					user.image ? (
						<img
							src={user.image}
							alt={displayName ?? t("profile")}
							className="h-full w-full object-cover"
						/>
					) : (
						<span className="font-black font-display text-5xl text-ink/30 uppercase md:text-6xl">
							{initial}
						</span>
					)
				}
				meta={
					<>
						<BannerMetaPill>{t("playerBadge")}</BannerMetaPill>
						<BannerMetaPill>
							{t("memberSince")} {memberSince}
						</BannerMetaPill>
					</>
				}
				title={displayName ?? t("profile")}
			/>

			<div className="relative z-10 mx-auto max-w-[1400px] px-4 py-8 md:px-6 md:py-10">
				<div className="mb-12 grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
					<DetailStatCard
						icon={<Trophy className="h-5 w-5" />}
						label={t("totalPoints")}
						value={String(stats.totalPoints)}
						variant="highlight"
					/>
					<DetailStatCard
						icon={<Target className="h-5 w-5" />}
						label={t("hitRate")}
						value={`${stats.accuracy}%`}
					/>
					<DetailStatCard
						icon={<Star className="h-5 w-5 text-brawl-yellow" />}
						label={t("exactScores")}
						value={String(stats.perfectPicks)}
					/>
					<DetailStatCard
						icon={<Bolt className="h-5 w-5" />}
						label={t("stats.underdogs")}
						value={String(stats.underdogWins)}
						variant="highlight"
					/>
					<DetailStatCard
						icon={<Crosshair className="h-5 w-5" />}
						label={t("totalBets")}
						value={String(stats.totalBets)}
					/>
				</div>

				<div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
					<div className="lg:col-span-4">
						{medals.length > 0 ? (
							<TrophyCase medals={medals} />
						) : (
							<section>
								<DetailSectionHeader title={t("medals.trophyCase")} />
								<DetailEmptyState
									icon={
										<Trophy className="h-6 w-6 text-ink" strokeWidth={2.5} />
									}
									title={t("medals.empty")}
									hint={t("medals.emptySubtitle")}
								/>
							</section>
						)}
					</div>

					<div className="flex flex-col gap-12 lg:col-span-8">
						<section>
							<DetailSectionHeader
								title={t("recentBets")}
								trailing={
									totalPickCount > 0 ? (
										<span className="border-2 border-black bg-tape px-2 py-0.5 font-body font-bold text-[10px] text-ink uppercase tabular-nums tracking-widest">
											{t("pickCount", { count: totalPickCount })}
										</span>
									) : null
								}
							/>

							{recentBets.length === 0 || !latestTournament ? (
								<DetailEmptyState
									icon={
										<History className="h-6 w-6 text-ink" strokeWidth={2.5} />
									}
									title={t("empty.recentBets")}
									hint={t("empty.recentBetsHint")}
								/>
							) : (
								<div className="flex flex-col gap-4">
									<div className="flex flex-wrap items-center gap-2">
										{latestTournament.logoUrl ? (
											<div className="h-8 w-8 shrink-0 overflow-hidden border-2 border-black bg-white p-0.5 shadow-comic-sm">
												<img
													src={latestTournament.logoUrl}
													alt=""
													className="h-full w-full object-contain"
												/>
											</div>
										) : (
											<div className="h-5 w-5 -skew-x-12 border-2 border-black bg-brawl-yellow" />
										)}
										<h3 className="min-w-0 truncate pe-[0.3em] pb-0.5 font-black font-display text-ink text-lg uppercase italic leading-[1.15] tracking-tight md:text-xl">
											{latestTournament.name}
										</h3>
									</div>

									<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
										{previewBets.map((bet) => (
											<UserPickTile
												key={bet.id}
												bet={bet}
												locale={locale}
												fallbackLabel={t("profile")}
												tbdLabel={t("tbd")}
											/>
										))}
									</div>

									<button
										type="button"
										onClick={() => setIsPicksModalOpen(true)}
										className="flex w-full items-center justify-center gap-2 border-[3px] border-black surface-lime px-4 py-3 font-black font-display text-sm uppercase tracking-wider shadow-comic-md transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-comic-press active:translate-x-[2px] active:translate-y-[2px] active:shadow-none sm:w-auto sm:self-start"
									>
										{t("picksModal.open")}
										<span className="border-2 border-black bg-ink px-1.5 py-0.5 font-body font-bold text-[10px] text-white tabular-nums tracking-widest">
											{totalPickCount}
										</span>
									</button>
								</div>
							)}
						</section>

						<section>
							<DetailSectionHeader title={t("stats.tournamentHistory")} />

							{tourneyHistory.length === 0 ? (
								<DetailEmptyState
									icon={<User className="h-6 w-6 text-ink" strokeWidth={2.5} />}
									title={t("empty.history")}
									hint={t("empty.historyHint")}
								/>
							) : (
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
									{tourneyHistory.map((history) => {
										const isChampion = history.rank === 1;
										const isTop3 = history.rank <= 3 && history.rank > 0;
										return (
											<div
												key={history.tournamentId}
												className="group relative flex flex-col border-[3px] border-black bg-white p-5 text-ink shadow-comic-md transition-all hover:-translate-y-1 hover:shadow-comic-lg"
											>
												<div className="mb-4 flex items-center justify-between gap-3 border-black/10 border-b-2 border-dashed pb-4">
													<div className="flex min-w-0 items-center gap-2 overflow-hidden">
														{history.tournamentLogoUrl ? (
															<div className="h-6 w-6 shrink-0 md:h-8 md:w-8">
																<img
																	src={history.tournamentLogoUrl}
																	alt=""
																	className="h-full w-full object-contain"
																/>
															</div>
														) : null}
														<span
															className="truncate font-black font-display text-ink text-sm uppercase leading-tight sm:text-base"
															title={history.tournamentName}
														>
															{history.tournamentName}
														</span>
													</div>

													{history.rank > 0 ? (
														<span
															className={clsx(
																"border-[2px] border-black px-2 py-1 font-black font-body text-xs shadow-comic-sm",
																isChampion
																	? "surface-yellow -rotate-2"
																	: isTop3
																		? "surface-ink rotate-2"
																		: "bg-tape text-ink",
															)}
														>
															#{history.rank}
														</span>
													) : null}
												</div>

												<div className="grid grid-cols-2 gap-4">
													<div className="flex flex-col border-black/10 border-r-2 border-dashed">
														<span className="mb-1 font-body font-bold text-[9px] text-gray-500 uppercase tracking-widest">
															{t("perfectScore")}
														</span>
														{history.perfectPicks > 0 ? (
															<span className="flex items-center gap-1 font-black font-display text-ink text-xl tabular-nums">
																{history.perfectPicks}
																<Star
																	className="h-4 w-4 text-brawl-yellow"
																	fill="currentColor"
																/>
															</span>
														) : (
															<span className="font-bold font-display text-ink/30 text-lg">
																-
															</span>
														)}
													</div>
													<div className="flex flex-col pl-2">
														<span className="mb-1 font-body font-bold text-[9px] text-gray-500 uppercase tracking-widest">
															{t("finalPoints")}
														</span>
														<span className="flex items-center gap-1 font-black font-display text-2xl text-ink italic tabular-nums tracking-tight">
															{history.totalPoints}
															<span className="material-symbols-outlined text-brawl-blue text-xl not-italic">
																stars
															</span>
														</span>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</section>
					</div>
				</div>
			</div>

			<UserPicksModal
				isOpen={isPicksModalOpen}
				onClose={() => setIsPicksModalOpen(false)}
				playerName={displayName ?? t("profile")}
				groups={betsByTournament}
				locale={locale}
				initialTournamentId={latestTournament?.id ?? null}
			/>
		</PublicPageShell>
	);
}
