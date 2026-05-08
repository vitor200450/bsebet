import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { clsx } from "clsx";
import { ArrowLeft, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CustomSelect } from "@/components/admin/CustomInputs";
import { TrophyCase } from "@/components/RealisticMedal";
import { TeamLogo } from "@/components/TeamLogo";
import { useLangLink } from "@/i18n/useLangLink";
import {
	getUserMedals,
	getUserProfile,
	getUserRecentBets,
	getUserStats,
	getUserTournamentHistory,
} from "@/server/user-profile";

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

		return { profile, stats, medals, recentBets, tournamentHistory };
	},
	component: UserProfilePage,
});

function UserProfilePage() {
	const { t } = useTranslation("user");
	const { linkTo } = useLangLink();
	const data = Route.useLoaderData();
	const user = data.profile;
	const stats = data.stats;
	const medals = data.medals;
	const recentBets = data.recentBets;
	const tourneyHistory = data.tournamentHistory;
	const [recentBetsTournamentFilter, setRecentBetsTournamentFilter] =
		useState<string>("all");

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
			group.bets.sort(
				(a, b) =>
					new Date(b.match.startTime).getTime() -
					new Date(a.match.startTime).getTime(),
			);
		});

		return groups;
	}, [recentBets, t]);

	const filteredRecentBetGroups = useMemo(() => {
		if (recentBetsTournamentFilter === "all") {
			return betsByTournament;
		}

		return betsByTournament.filter(
			(group) => group.id === recentBetsTournamentFilter,
		);
	}, [betsByTournament, recentBetsTournamentFilter]);

	const memberSince = new Date(user.createdAt)
		.toLocaleDateString("pt-BR", {
			year: "numeric",
			month: "short",
		})
		.toUpperCase();

	return (
		<div className="relative min-h-screen bg-[#f0f0f0] pb-12 font-display">
			{/* Paper texture overlay */}
			<div
				className="pointer-events-none fixed inset-0 opacity-[0.12] mix-blend-multiply"
				style={{
					backgroundImage:
						'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
					backgroundRepeat: "repeat",
				}}
			/>

			{/* Page Header */}
			<div className="relative z-10 mx-auto max-w-[1400px] px-4 py-8 md:px-6 md:py-12">
				<div className="mb-8 flex flex-col justify-between gap-4 md:mb-10 md:flex-row md:items-end">
					<div>
						<h1 className="font-black text-4xl text-[#121212] uppercase italic tracking-tighter md:text-5xl">
							{t("profile")}
						</h1>
					</div>

					<Link
						to={linkTo("/leaderboard")}
						search={{ page: 1, pageSize: 20 } as any}
						className="group flex items-center gap-2 font-black text-[#2e5cff] text-sm uppercase tracking-wider transition-colors hover:text-[#121212]"
					>
						<ArrowLeft
							className="h-4 w-4 transition-transform group-hover:-translate-x-1"
							strokeWidth={3}
						/>
						{t("back")}
					</Link>
				</div>

				<div className="grid h-full grid-cols-1 gap-8 lg:grid-cols-12">
					{/* Left Column (Profile & Trophies - 30%) */}
					<div className="flex flex-col gap-8 md:gap-10 lg:col-span-4">
						{/* User Details Box */}
						<div className="relative overflow-hidden border-[3px] border-black bg-white p-6 shadow-[4px_4px_0_0_#000] transition-all hover:shadow-[6px_6px_0_0_#000]">
							<div className="absolute top-0 left-0 h-32 w-full border-black border-b-[3px] bg-[#f0f0f0]" />

							<div className="relative z-10 flex flex-col items-center pt-8">
								<div className="relative flex h-40 w-40 -rotate-2 items-center justify-center overflow-hidden border-[4px] border-black bg-white p-1 shadow-[4px_4px_0_0_#000] transition-transform duration-300 hover:rotate-0">
									{user.image ? (
										<img
											src={user.image}
											alt={user.nickname ?? user.name ?? "User"}
											className="h-full w-full border-[2px] border-black object-cover"
										/>
									) : (
										<div className="flex h-full w-full flex-col items-center justify-center border-2 border-black bg-tape font-black text-6xl text-black/30">
											{(user.nickname ?? user.name ?? "U")
												.charAt(0)
												.toUpperCase()}
										</div>
									)}
									{/* Decorative corner */}
									<div className="absolute -top-4 -right-4 h-12 w-12 rotate-45 transform border-black border-b-[3px] border-l-[3px] bg-[#ccff00]" />
								</div>

								<div className="mt-8 mb-2 -rotate-2 border-[2px] border-black bg-[#ffc700] px-4 py-1 shadow-[2px_2px_0_0_#000]">
									<p className="font-black text-black text-xs uppercase tracking-[0.2em]">
										PLAYER
									</p>
								</div>

								<h2 className="mt-2 mb-1 w-full skew-x-[-6deg] truncate text-center font-black text-3xl text-black uppercase italic tracking-tighter">
									{user.nickname ?? user.name}
								</h2>
								<p className="mt-2 font-bold text-gray-500 text-sm uppercase">
									{t("memberSince")} {memberSince}
								</p>
							</div>
						</div>

						{/* Top Placements (Trophy Case) */}
						<TrophyCase medals={medals} />
					</div>

					{/* Right Column (Stats & History - 70%) */}
					<div className="flex flex-col gap-10 md:gap-14 lg:col-span-8">
						{/* Statistics Section */}
						<section>
							<div className="mb-6 flex items-center gap-3">
								<div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2e5cff]">
									<span className="material-symbols-outlined text-lg text-white">
										query_stats
									</span>
								</div>
								<h2 className="font-black text-[#121212] text-xl uppercase tracking-tight md:text-2xl">
									{t("stats.general")}
								</h2>
							</div>

							<div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
								{/* Total Points */}
								<div className="group rounded-lg border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[4px_4px_0_0_#000]">
									<div className="mb-3 flex items-center justify-between">
										<div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#ffc700]">
											<span className="material-symbols-outlined text-black text-xl">
												star
											</span>
										</div>
									</div>
									<div className="font-black text-3xl text-[#121212] md:text-4xl">
										{stats.totalPoints}
									</div>
									<div className="mt-1 font-bold text-[10px] text-gray-600 uppercase tracking-wider">
										{t("totalPoints")}
									</div>
								</div>

								{/* Accuracy */}
								<div className="group rounded-lg border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[4px_4px_0_0_#000]">
									<div className="mb-3 flex items-center justify-between">
										<div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#2e5cff]">
											<span className="material-symbols-outlined text-white text-xl">
												target
											</span>
										</div>
									</div>
									<div className="font-black text-3xl text-[#121212] md:text-4xl">
										{stats.accuracy}
										<span className="text-xl">%</span>
									</div>
									<div className="mt-1 font-bold text-[10px] text-gray-600 uppercase tracking-wider">
										{t("hitRate")}
									</div>
								</div>

								{/* Perfect Picks */}
								<div className="group rounded-lg border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[4px_4px_0_0_#000]">
									<div className="mb-3 flex items-center justify-between">
										<div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#ccff00]">
											<span className="material-symbols-outlined text-black text-xl">
												grade
											</span>
										</div>
									</div>
									<div className="font-black text-3xl text-[#121212] md:text-4xl">
										{stats.perfectPicks}
									</div>
									<div className="mt-1 font-bold text-[10px] text-gray-600 uppercase tracking-wider">
										{t("exactScores")}
									</div>
								</div>

								{/* Underdog Wins */}
								<div className="group rounded-lg border-2 border-black bg-gradient-to-r from-purple-500 to-pink-500 p-4 shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[4px_4px_0_0_#000]">
									<div className="mb-3 flex items-center justify-between">
										<div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/20">
											<span className="material-symbols-outlined text-white text-xl">
												bolt
											</span>
										</div>
									</div>
									<div className="mb-1 font-black text-3xl text-white md:text-4xl">
										{stats.underdogWins}
									</div>
									<div className="mt-1 font-bold text-[10px] text-white/80 uppercase tracking-wider">
										{t("stats.underdogs")}
									</div>
								</div>

								{/* Total Bets */}
								<div className="group rounded-lg border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[4px_4px_0_0_#000]">
									<div className="mb-3 flex items-center justify-between">
										<div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#ff2e2e]">
											<span className="material-symbols-outlined text-white text-xl">
												casino
											</span>
										</div>
									</div>
									<div className="font-black text-3xl text-[#121212] md:text-4xl">
										{stats.totalBets}
									</div>
									<div className="mt-1 font-bold text-[10px] text-gray-600 uppercase tracking-wider">
										{t("totalBets")}
									</div>
								</div>
							</div>
						</section>

						{/* Recent Bets Section */}
						{recentBets.length > 0 && (
							<section>
								<div className="mb-5 flex flex-wrap items-center gap-3">
									<div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#ff2e2e]">
										<span className="material-symbols-outlined text-lg text-white">
											sports_esports
										</span>
									</div>
									<h2 className="font-black text-[#121212] text-xl uppercase tracking-tight md:text-2xl">
										{t("recentBets")}
									</h2>
									{betsByTournament.length > 1 && (
										<div className="ml-auto w-full max-w-[320px]">
											<CustomSelect
												label={t("filterLabel")}
												value={recentBetsTournamentFilter}
												onChange={setRecentBetsTournamentFilter}
												options={[
													{ value: "all", label: t("all") },
													...betsByTournament.map((group) => ({
														value: group.id,
														label: group.name,
													})),
												]}
												placeholder={t("stats.filterTournament")}
											/>
										</div>
									)}
								</div>

								<div className="flex flex-col gap-10">
									{filteredRecentBetGroups.map((tournamentGroup) => (
										<div
											key={tournamentGroup.id}
											className="flex flex-col gap-4"
										>
											{/* Tournament Header */}
											<div className="mb-2 flex items-center gap-3 border-black border-b-[3px] pb-2">
												{tournamentGroup.logoUrl ? (
													<div className="h-8 w-8 flex-shrink-0 -rotate-3 overflow-hidden border-2 border-black bg-white p-0.5 shadow-[2px_2px_0_0_#000] md:h-10 md:w-10">
														<img
															src={tournamentGroup.logoUrl}
															alt="Logo"
															className="h-full w-full object-contain"
														/>
													</div>
												) : (
													<div className="h-5 w-5 -skew-x-12 transform border-2 border-black bg-[#ffc700]" />
												)}
												<h3 className="font-black text-black text-lg uppercase tracking-tight md:text-xl">
													{tournamentGroup.name}
												</h3>
											</div>

											<div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
												{tournamentGroup.bets.map((bet) => {
													const isWin = (bet.pointsEarned ?? 0) > 0;
													const isLoss =
														bet.pointsEarned === 0 &&
														bet.match.status === "finished";

													let statusBadgeClass = "bg-[#f0f0f0] text-black";
													let label = t("scheduled");

													if (isWin) {
														statusBadgeClass = "bg-[#ccff00] text-black";
														label = `WIN (+${bet.pointsEarned})`;
													} else if (isLoss) {
														statusBadgeClass = "bg-[#ff2e2e] text-white";
														label = "LOSS (0)";
													} else if (bet.match.status === "live") {
														statusBadgeClass =
															"bg-[#ff2e2e] text-white animate-pulse";
														label = t("live");
													}

													return (
														<div
															key={bet.id}
															className="group relative cursor-pointer rounded-lg border-2 border-black bg-white p-5 shadow-[3px_3px_0_0_#000] transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000]"
														>
															{/* Status Badge */}
															<div
																className={clsx(
																	"absolute -top-3 -right-3 rotate-6 transform border-2 border-black px-3 py-1 font-black text-[10px] uppercase tracking-widest shadow-[2px_2px_0_0_#000]",
																	statusBadgeClass,
																)}
															>
																{label}
															</div>

															{/* Teams Matchup */}
															<div className="relative mb-5 flex items-stretch gap-3">
																{/* Team A */}
																{bet.match.teamA?.slug ? (
																	<Link
																		to={linkTo("/teams/$teamId")}
																		params={{
																			teamId: bet.match.teamA.slug,
																		}}
																		className={clsx(
																			"flex min-h-[120px] flex-1 flex-col items-center justify-between gap-2 rounded-sm border-[3px] p-3 transition-all",
																			bet.predictedWinnerId ===
																				bet.match.teamA?.id
																				? "border-[#ccff00] bg-[#ccff00]/40 shadow-[3px_3px_0_0_#ccff00]"
																				: "border-black bg-[#f0f0f0]",
																		)}
																	>
																		<TeamLogo
																			teamName={bet.match.teamA?.name || "TBD"}
																			logoUrl={bet.match.teamA?.logoUrl}
																			size="md"
																		/>
																		<span className="line-clamp-2 w-full text-center font-black text-[11px] text-black uppercase tracking-tight hover:text-brawl-blue hover:underline">
																			{bet.match.teamA?.name || "TBD"}
																		</span>
																		{bet.predictedWinnerId ===
																		bet.match.teamA?.id ? (
																			<div className="bg-black px-2 py-0.5 font-black text-[#ccff00] text-[8px] uppercase">
																				{t("bet")}
																			</div>
																		) : (
																			<div className="h-5" />
																		)}
																	</Link>
																) : (
																	<div
																		className={clsx(
																			"flex min-h-[120px] flex-1 flex-col items-center justify-between gap-2 rounded-sm border-[3px] p-3",
																			"border-black bg-[#f0f0f0]",
																		)}
																	>
																		<TeamLogo teamName="TBD" size="md" />
																		<span className="line-clamp-2 w-full text-center font-black text-[11px] text-black uppercase tracking-tight">
																			TBD
																		</span>
																		<div className="h-5" />
																	</div>
																)}

																{/* VS Separator */}
																<div className="z-10 shrink-0 self-center rounded-full border-[3px] border-black bg-black px-2 py-1.5 text-white">
																	<span className="font-black text-[11px] italic">
																		VS
																	</span>
																</div>

																{/* Team B */}
																{bet.match.teamB?.slug ? (
																	<Link
																		to={linkTo("/teams/$teamId")}
																		params={{
																			teamId: bet.match.teamB.slug,
																		}}
																		className={clsx(
																			"relative flex min-h-[120px] flex-1 flex-col items-center justify-between gap-2 rounded-sm border-[3px] p-3 transition-all",
																			bet.predictedWinnerId ===
																				bet.match.teamB?.id
																				? "border-[#ccff00] bg-[#ccff00]/40 shadow-[3px_3px_0_0_#ccff00]"
																				: "border-black bg-[#f0f0f0]",
																		)}
																	>
																		<TeamLogo
																			teamName={bet.match.teamB?.name || "TBD"}
																			logoUrl={bet.match.teamB?.logoUrl}
																			size="md"
																		/>
																		<span className="line-clamp-2 w-full text-center font-black text-[11px] text-black uppercase tracking-tight hover:text-brawl-red hover:underline">
																			{bet.match.teamB?.name || "TBD"}
																		</span>
																		{bet.predictedWinnerId ===
																		bet.match.teamB?.id ? (
																			<div className="bg-black px-2 py-0.5 font-black text-[#ccff00] text-[8px] uppercase">
																				{t("bet")}
																			</div>
																		) : (
																			<div className="h-5" />
																		)}
																	</Link>
																) : (
																	<div
																		className={clsx(
																			"flex min-h-[120px] flex-1 flex-col items-center justify-between gap-2 rounded-sm border-[3px] p-3",
																			"border-black bg-[#f0f0f0]",
																		)}
																	>
																		<TeamLogo teamName="TBD" size="md" />
																		<span className="line-clamp-2 w-full text-center font-black text-[11px] text-black uppercase tracking-tight">
																			TBD
																		</span>
																		<div className="h-5" />
																	</div>
																)}
															</div>

															{/* Prediction Score Footer */}
															<div className="relative -mx-5 mt-2 -mb-5 flex flex-col overflow-hidden border-black border-t-[3px] bg-white text-black">
																<div className="flex items-center justify-between border-black/20 border-b-[2px] border-dashed px-5 py-2">
																	<div className="flex items-center gap-2">
																		<span className="material-symbols-outlined text-black text-sm">
																			casino
																		</span>
																		<span className="font-black text-[10px] text-black uppercase tracking-wide">
																			{t("betLabel")}
																		</span>
																	</div>
																	<div className="flex items-center gap-1.5 opacity-80">
																		<div className="min-w-[20px] bg-black px-1.5 py-0.5 text-center font-black text-white text-xs">
																			{bet.predictedScoreA}
																		</div>
																		<span className="font-black text-black text-xs">
																			×
																		</span>
																		<div className="min-w-[20px] bg-black px-1.5 py-0.5 text-center font-black text-white text-xs">
																			{bet.predictedScoreB}
																		</div>
																	</div>
																</div>

																<div className="flex items-center justify-between bg-[#f4f4f4] px-5 py-2">
																	<div className="flex items-center gap-2">
																		<span className="material-symbols-outlined text-black text-sm">
																			sports_score
																		</span>
																		<span className="font-black text-[10px] text-black uppercase tracking-wide">
																			{t("actualLabel")}
																		</span>
																	</div>
																	<div className="flex items-center gap-1.5">
																		{bet.match.status === "finished" ||
																		bet.match.status === "live" ? (
																			<>
																				<div className="min-w-[20px] bg-black px-1.5 py-0.5 text-center font-black text-white text-xs">
																					{bet.match.scoreA}
																				</div>
																				<span className="font-black text-black text-xs">
																					×
																				</span>
																				<div className="min-w-[20px] bg-black px-1.5 py-0.5 text-center font-black text-white text-xs">
																					{bet.match.scoreB}
																				</div>
																			</>
																		) : (
																			<span className="font-black text-[10px] text-black/40 uppercase tracking-widest">
																				TBD
																			</span>
																		)}
																	</div>
																</div>
															</div>

															{/* Match Time Stamp */}
															<div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap border-[2px] border-black bg-white px-3 py-1 font-black text-[9px] text-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]">
																{new Date(bet.match.startTime).toLocaleString(
																	"pt-BR",
																	{
																		day: "2-digit",
																		month: "short",
																		hour: "2-digit",
																		minute: "2-digit",
																	},
																)}
															</div>
														</div>
													);
												})}
											</div>
										</div>
									))}
								</div>
							</section>
						)}

						{/* Tournament History Tabular Section via Cards */}
						{tourneyHistory.length > 0 && (
							<section className="mt-4 mb-8">
								<div className="mb-5 flex items-center gap-3">
									<div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2e5cff]">
										<span className="material-symbols-outlined text-lg text-white">
											emoji_events
										</span>
									</div>
									<h2 className="font-black text-[#121212] text-xl uppercase tracking-tight md:text-2xl">
										{t("stats.tournamentHistory")}
									</h2>
								</div>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
									{tourneyHistory.map((history) => {
										const isChampion = history.rank === 1;
										const isTop3 = history.rank <= 3 && history.rank > 0;
										return (
											<div
												key={history.tournamentId}
												className="group relative flex flex-col rounded-lg border-2 border-black bg-white p-5 shadow-[3px_3px_0_0_#000] transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000]"
											>
												<div className="mb-4 flex items-center justify-between gap-3 border-black/10 border-b-2 border-dashed pb-4">
													<div className="flex items-center gap-2 overflow-hidden">
														{history.tournamentLogoUrl && (
															<div className="h-6 w-6 flex-shrink-0 md:h-8 md:w-8">
																<img
																	src={history.tournamentLogoUrl}
																	alt="Logo"
																	className="h-full w-full object-contain"
																/>
															</div>
														)}
														<span
															className="truncate font-black text-black text-sm uppercase leading-tight sm:text-base"
															title={history.tournamentName}
														>
															{history.tournamentName}
														</span>
													</div>

													{history.rank > 0 && (
														<span
															className={clsx(
																"border-[2px] px-2 py-1 font-black text-xs shadow-[2px_2px_0_0_#000]",
																isChampion
																	? "-rotate-2 border-black bg-[#ffc700] text-black"
																	: isTop3
																		? "rotate-2 border-black bg-black text-white"
																		: "border-black bg-[#f0f0f0] text-black",
															)}
														>
															#{history.rank}
														</span>
													)}
												</div>

												<div className="grid grid-cols-2 gap-4">
													<div className="flex flex-col border-black/10 border-r-2 border-dashed">
														<span className="mb-1 font-black text-[9px] text-black/50 uppercase tracking-widest">
															{t("perfectScore")}
														</span>
														{history.perfectPicks > 0 ? (
															<span className="flex items-center gap-1 font-black text-black text-xl">
																{history.perfectPicks}
																<Star
																	className="h-4 w-4 text-[#ffc700] drop-shadow-[1px_1px_0_0_#000]"
																	fill="currentColor"
																/>
															</span>
														) : (
															<span className="font-bold text-black/30 text-lg">
																-
															</span>
														)}
													</div>
													<div className="flex flex-col pl-2">
														<span className="mb-1 font-black text-[9px] text-black/50 uppercase tracking-widest">
															{t("finalPoints")}
														</span>
														<span className="flex items-center gap-1 font-black text-2xl text-black italic tracking-tight">
															{history.totalPoints}
															<span className="material-symbols-outlined text-[#2e5cff] text-xl">
																stars
															</span>
														</span>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</section>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
