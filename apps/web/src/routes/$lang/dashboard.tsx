import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
	Award,
	BarChart3,
	Calendar,
	ChevronRight,
	Clock,
	Target,
	TrendingUp,
	Trophy,
	Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { MedalSummary } from "@/components/MedalSummary";
import { TeamLogo } from "@/components/TeamLogo";
import { getDashboardData } from "@/functions/get-dashboard-data";
import { getUser } from "@/functions/get-user";
import { getUserMedalCounts, getUserMedals } from "@/server/user-profile";
import { getMyProfile } from "@/server/users";

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
	const { t } = useTranslation("dashboard");
	const { session } = Route.useRouteContext();

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
				{/* Header - Clean & Modern */}
				<div className="mb-10 md:mb-14">
					<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
						<div>
							<h1 className="font-black text-4xl text-[#121212] uppercase italic tracking-tighter md:text-5xl lg:text-6xl">
								Dashboard
							</h1>
							<p className="mt-2 font-bold text-gray-600 text-lg">
								{t("greeting", { name: displayName })}
								Acompanhe seu desempenho e palpites.
							</p>
						</div>
						<Link
							to="/my-bets"
							className="group flex items-center gap-2 font-black text-[#2e5cff] text-sm uppercase tracking-wider transition-colors hover:text-[#121212]"
						>
							{t("viewHistory")}
							<ChevronRight
								className="h-4 w-4 transition-transform group-hover:translate-x-1"
								strokeWidth={3}
							/>
						</Link>
					</div>
				</div>

				{/* Stats Grid - Clean cards with better hierarchy */}
				<section className="mb-10 md:mb-14">
					<div className="mb-6 flex items-center gap-3">
						<BarChart3 className="h-6 w-6 text-[#2e5cff]" strokeWidth={2.5} />
						<h2 className="font-black text-[#121212] text-xl uppercase tracking-tight md:text-2xl">
							{t("stats.title")}
						</h2>
					</div>

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
							<div className="group relative overflow-hidden rounded-lg border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[4px_4px_0_0_#000]">
								<div className="mb-3 flex items-center justify-between">
									<div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#ffc700]">
										<TrendingUp
											className="h-5 w-5 text-black"
											strokeWidth={2.5}
										/>
									</div>
								</div>
								<div className="font-black text-3xl text-[#121212] md:text-4xl">
									{stats.totalPoints}
								</div>
								<div className="mt-1 font-bold text-[10px] text-gray-600 uppercase tracking-wider">
									Total de Pontos
								</div>
							</div>

							{/* Accuracy */}
							<div className="group relative overflow-hidden rounded-lg border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[4px_4px_0_0_#000]">
								<div className="mb-3 flex items-center justify-between">
									<div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#2e5cff]">
										<Target className="h-5 w-5 text-white" strokeWidth={2.5} />
									</div>
								</div>
								<div className="font-black text-3xl text-[#121212] md:text-4xl">
									{stats.accuracy}
									<span className="text-xl">%</span>
								</div>
								<div className="mt-1 font-bold text-[10px] text-gray-600 uppercase tracking-wider">
									Taxa de Acerto
								</div>
								<div className="mt-1 font-medium text-[10px] text-gray-500">
									{stats.correctPredictions} de {stats.totalBets} corretos
								</div>
							</div>

							{/* Perfect Picks */}
							<div className="group relative overflow-hidden rounded-lg border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[4px_4px_0_0_#000]">
								<div className="mb-3 flex items-center justify-between">
									<div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#ccff00]">
										<Award className="h-5 w-5 text-black" strokeWidth={2.5} />
									</div>
								</div>
								<div className="font-black text-3xl text-[#121212] md:text-4xl">
									{stats.perfectPicks}
								</div>
								<div className="mt-1 font-bold text-[10px] text-gray-600 uppercase tracking-wider">
									Placares Exatos
								</div>
							</div>

							{/* Pending Bets */}
							<div className="group relative overflow-hidden rounded-lg border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[4px_4px_0_0_#000]">
								<div className="mb-3 flex items-center justify-between">
									<div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#ff2e2e]">
										<Clock className="h-5 w-5 text-white" strokeWidth={2.5} />
									</div>
								</div>
								<div className="font-black text-3xl text-[#121212] md:text-4xl">
									{stats.pendingBets}
								</div>
								<div className="mt-1 font-bold text-[10px] text-gray-600 uppercase tracking-wider">
									Palpites Pendentes
								</div>
							</div>
						</div>
					)}

					{/* Additional Stats - Integrated into grid */}
					{!isLoading && stats.totalBets > 0 && (
						<div className="mt-4 grid grid-cols-2 gap-3 md:gap-4">
							<div className="flex items-center gap-3 rounded-lg border-2 border-black bg-gradient-to-r from-purple-500 to-pink-500 p-3 shadow-[3px_3px_0_0_#000]">
								<div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/20">
									<span className="text-lg">🐕</span>
								</div>
								<div>
									<div className="font-black text-white text-xl">
										{stats.underdogWins}
									</div>
									<div className="font-bold text-[10px] text-white/80 uppercase tracking-wider">
										{t("stats.underdogsWon")}
									</div>
								</div>
							</div>

							<div className="flex items-center gap-3 rounded-lg border-2 border-black bg-[#121212] p-3 shadow-[3px_3px_0_0_#000]">
								<div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#ccff00]">
									<Zap className="h-4 w-4 text-black" strokeWidth={2.5} />
								</div>
								<div>
									<div className="font-black text-white text-xl">
										{stats.totalBets}
									</div>
									<div className="font-bold text-[10px] text-white/70 uppercase tracking-wider">
										Total de Apostas
									</div>
								</div>
							</div>
						</div>
					)}
				</section>

				{/* Achievements Section */}
				<section className="mb-10 md:mb-14">
					<div className="mb-5 flex items-center gap-3">
						<div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#ffc700]">
							<Trophy
								className="h-5 w-5 text-black"
								strokeWidth={2.5}
								fill="currentColor"
							/>
						</div>
						<h2 className="font-black text-[#121212] text-xl uppercase tracking-tight md:text-2xl">
							Conquistas
						</h2>
					</div>
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
					/>
				</section>

				{/* Two Column Layout: Active Bets + Tournaments */}
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
					{/* Active Bets - Takes 2/3 on desktop */}
					<section className="lg:col-span-2">
						<div className="mb-5 flex items-center gap-3">
							<div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2e5cff]">
								<span className="material-symbols-outlined text-lg text-white">
									sports_esports
								</span>
							</div>
							<h2 className="font-black text-[#121212] text-xl uppercase tracking-tight md:text-2xl">
								Meus Palpites Ativos
							</h2>
							{activeBets.length > 0 && (
								<span className="rounded-md bg-[#ccff00] px-2 py-0.5 font-black text-black text-xs">
									{activeBets.length}
								</span>
							)}
						</div>

						{isLoading ? (
							<div className="space-y-4">
								{[1, 2].map((i) => (
									<div
										key={i}
										className="h-36 animate-pulse rounded-lg border-2 border-black/10 bg-white"
									/>
								))}
							</div>
						) : activeBets.length > 0 ? (
							<div className="space-y-4">
								{activeBets.map((bet) => (
									<div
										key={bet.id}
										className="group relative overflow-hidden border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000] transition-all hover:shadow-[6px_6px_0_0_#000]"
									>
										{/* Top accent bar */}
										<div className="h-1.5 w-full bg-gradient-to-r from-[#2e5cff] via-[#ffc700] to-[#ff2e2e]" />

										{/* Header: Tournament + Status */}
										<div className="flex items-center justify-between border-black border-b-2 bg-[#fafafa] px-4 py-2">
											{bet.match.tournament?.slug ? (
												<Link
													to="/tournaments/$slug"
													params={{ slug: bet.match.tournament.slug }}
													className="truncate font-bold text-[10px] text-gray-500 uppercase tracking-widest hover:text-[#2e5cff]"
												>
													{bet.match.tournament.name}
												</Link>
											) : (
												<span className="truncate font-bold text-[10px] text-gray-500 uppercase tracking-widest">
													{bet.match.tournament?.name}
												</span>
											)}
											<div
												className={clsx(
													"rounded-sm border-2 border-black px-2 py-0.5 font-black text-[9px] uppercase tracking-wider shadow-[2px_2px_0_0_#000]",
													bet.match.status === "live"
														? "animate-pulse bg-[#ff2e2e] text-white"
														: "bg-[#ccff00] text-black",
												)}
											>
												{bet.match.status === "live"
													? t("status.live")
													: t("status.scheduled")}
											</div>
										</div>

										{/* Teams - Broadcast panel style */}
										<div className="flex items-stretch">
											{/* Team A Panel */}
											<div
												className={clsx(
													"flex flex-1 items-center gap-3 border-black border-r-2 px-4 py-4 transition-all",
													bet.predictedWinnerId === bet.match.teamA?.id
														? "bg-[#ccff00]/15"
														: "bg-[#f8f8f8]",
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
													{bet.predictedWinnerId === bet.match.teamA?.id && (
														<div className="mt-1 inline-flex items-center gap-1 rounded-sm border border-black bg-[#ccff00] px-1.5 py-0.5 font-black text-[9px] text-black uppercase shadow-[1px_1px_0_0_#000]">
															<span className="material-symbols-outlined text-[10px]">
																check_circle
															</span>
															{t("betLabel")}
														</div>
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
													bet.predictedWinnerId === bet.match.teamB?.id
														? "bg-[#ccff00]/15"
														: "bg-[#f8f8f8]",
												)}
											>
												<div className="min-w-0 flex-1 text-right">
													<p className="truncate font-black text-[#121212] text-sm">
														{bet.match.teamB?.name || "TBD"}
													</p>
													{bet.predictedWinnerId === bet.match.teamB?.id && (
														<div className="mt-1 inline-flex items-center gap-1 rounded-sm border border-black bg-[#ccff00] px-1.5 py-0.5 font-black text-[9px] text-black uppercase shadow-[1px_1px_0_0_#000]">
															<span className="material-symbols-outlined text-[10px]">
																check_circle
															</span>
															{t("betLabel")}
														</div>
													)}
												</div>
												<TeamLogo
													teamName={bet.match.teamB?.name || "TBD"}
													logoUrl={bet.match.teamB?.logoUrl}
													size="md"
												/>
											</div>
										</div>

										{/* Footer - Date & Predicted Score */}
										<div className="flex items-center justify-between border-black border-t-2 bg-white px-4 py-3">
											<div className="flex items-center gap-2">
												<Calendar
													className="h-4 w-4 text-gray-500"
													strokeWidth={2}
												/>
												<span className="font-bold text-gray-600 text-xs">
													{new Date(bet.match.startTime).toLocaleString(
														"pt-BR",
														{
															day: "2-digit",
															month: "short",
															hour: "2-digit",
															minute: "2-digit",
														},
													)}
												</span>
											</div>
											<div className="flex items-center gap-2">
												<span className="font-black text-[9px] text-gray-400 uppercase tracking-wider">
													Palpite
												</span>
												<div className="flex items-center gap-1">
													<span className="flex h-7 w-7 items-center justify-center border-2 border-black bg-[#121212] font-black text-sm text-white shadow-[1px_1px_0_0_#ccff00]">
														{bet.predictedScoreA}
													</span>
													<span className="font-black text-gray-400 text-xs">
														-
													</span>
													<span className="flex h-7 w-7 items-center justify-center border-2 border-black bg-[#121212] font-black text-sm text-white shadow-[1px_1px_0_0_#ccff00]">
														{bet.predictedScoreB}
													</span>
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="rounded-lg border-2 border-black bg-white p-8 text-center shadow-[3px_3px_0_0_#000]">
								<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f0f0f0]">
									<span className="material-symbols-outlined text-3xl text-gray-400">
										inbox
									</span>
								</div>
								<p className="mb-1 font-black text-[#121212] text-lg uppercase">
									{t("empty.noActive")}
								</p>
								<p className="mb-5 text-gray-600 text-sm">
									{t("empty.noBets")}
								</p>
								<Link to="/">
									<button
										type="button"
										className="rounded-lg border-2 border-black bg-[#ffc700] px-6 py-3 font-black text-black text-sm uppercase tracking-wider shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[2px_2px_0_0_#000] active:shadow-none"
									>
										Ver Partidas
									</button>
								</Link>
							</div>
						)}
					</section>

					{/* Active Tournaments - Takes 1/3 on desktop */}
					<section>
						<div className="mb-5 flex items-center gap-3">
							<div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#ffc700]">
								<Trophy className="h-5 w-5 text-black" strokeWidth={2.5} />
							</div>
							<h2 className="font-black text-[#121212] text-xl uppercase tracking-tight md:text-2xl">
								Torneios
							</h2>
						</div>

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
										to="/"
										search={{ tournament: tournament.slug }}
										className="group flex items-center gap-3 rounded-lg border-2 border-black bg-white p-3 shadow-[3px_3px_0_0_#000] transition-all hover:bg-[#ffc700]/10 hover:shadow-[4px_4px_0_0_#000]"
									>
										{tournament.logoUrl ? (
											<img
												src={tournament.logoUrl}
												alt={tournament.name}
												className="h-10 w-10 rounded object-contain"
											/>
										) : (
											<div className="flex h-10 w-10 items-center justify-center rounded bg-[#f0f0f0]">
												<Trophy
													className="h-5 w-5 text-gray-400"
													strokeWidth={2}
												/>
											</div>
										)}
										<div className="min-w-0 flex-1">
											<p className="truncate font-bold text-[#121212] text-sm">
												{tournament.name}
											</p>
											<p className="text-gray-500 text-xs">Ver partidas</p>
										</div>
										<ChevronRight
											className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-[#121212]"
											strokeWidth={2}
										/>
									</Link>
								))}
							</div>
						) : (
							<div className="rounded-lg border-2 border-black bg-white p-6 text-center shadow-[3px_3px_0_0_#000]">
								<p className="font-bold text-gray-600 text-sm">
									Sem torneios ativos
								</p>
							</div>
						)}
					</section>
				</div>

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
