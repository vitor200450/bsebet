import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { clsx } from "clsx";
import { ChevronRight, Trophy } from "lucide-react";
import { MedalSummary } from "@/components/MedalSummary";
import { TeamLogo } from "@/components/TeamLogo";
import { getDashboardData } from "@/functions/get-dashboard-data";
import { getUser } from "@/functions/get-user";
import { getUserMedalCounts, getUserMedals } from "@/server/user-profile";
import { getMyProfile } from "@/server/users";

export const Route = createFileRoute("/dashboard")({
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
		<div className="relative min-h-screen bg-[#e6e6e6] pb-12">
			{/* Subtle paper texture overlay */}
			<div
				className="pointer-events-none fixed inset-0 opacity-[0.15] mix-blend-multiply"
				style={{
					backgroundImage:
						'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
					backgroundRepeat: "repeat",
				}}
			/>

			{/* Page Header */}
			<div className="relative z-10 mx-auto max-w-[1600px] px-4 py-6 md:px-6 md:py-10">
				<div className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-center">
					{/* Command Center Title Badge */}
					<div className="inline-block w-fit -skew-x-12 transform border-[3px] border-black bg-black px-6 py-3 text-white shadow-[4px_4px_0_0_#000] md:px-8 md:py-4">
						<h1 className="skew-x-12 transform font-black text-3xl uppercase italic tracking-tighter md:text-5xl lg:text-6xl">
							COMMAND CENTER
						</h1>
					</div>

					{/* Welcome Message */}
					<div className="flex items-center gap-2">
						<span className="material-symbols-outlined text-gray-700 text-xl">
							waving_hand
						</span>
						<span className="font-bold text-gray-600 text-sm md:text-base">
							Bem-vindo, <span className="text-black">{displayName}</span>
						</span>
					</div>
				</div>

				{/* Statistics Section */}
				<section className="mb-10 md:mb-14">
					{/* Section Header */}
					<div className="mb-5 flex items-center gap-3">
						<div className="rotate-3 transform border-2 border-black bg-[#2e5cff] p-2 shadow-[2px_2px_0_0_#000]">
							<span className="material-symbols-outlined text-white text-xl md:text-2xl">
								query_stats
							</span>
						</div>
						<h2 className="font-black text-2xl text-black uppercase italic tracking-tighter md:text-3xl">
							SUAS ESTATÍSTICAS
						</h2>
					</div>

					{isLoading ? (
						<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
							{[1, 2, 3, 4].map((i) => (
								<div
									key={i}
									className="h-28 animate-pulse border-[3px] border-black bg-white shadow-[3px_3px_0_0_#000]"
								/>
							))}
						</div>
					) : (
						<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
							{/* Total Points */}
							<div className="group border-[3px] border-black bg-white p-5 shadow-[4px_4px_0_0_#000] transition-all hover:shadow-[6px_6px_0_0_#000]">
								<div className="mb-3 flex items-center justify-between">
									<span className="material-symbols-outlined text-3xl text-[#ffc700]">
										star
									</span>
									<div className="h-2 w-2 rounded-full bg-[#ffc700]" />
								</div>
								<div className="mb-1 font-black text-4xl text-black">
									{stats.totalPoints}
								</div>
								<div className="font-black text-[10px] text-black uppercase tracking-wider">
									Total de Pontos
								</div>
							</div>

							{/* Accuracy */}
							<div className="group border-[3px] border-black bg-white p-5 shadow-[4px_4px_0_0_#000] transition-all hover:shadow-[6px_6px_0_0_#000]">
								<div className="mb-3 flex items-center justify-between">
									<span className="material-symbols-outlined text-3xl text-[#2e5cff]">
										target
									</span>
									<div className="h-2 w-2 rounded-full bg-[#2e5cff]" />
								</div>
								<div className="mb-1 font-black text-4xl text-black">
									{stats.accuracy}%
								</div>
								<div className="font-black text-[10px] text-black uppercase tracking-wider">
									Taxa de Acerto
								</div>
								<div className="mt-1 font-bold text-[8px] text-gray-700">
									{stats.correctPredictions}/{stats.totalBets} corretos
								</div>
							</div>

							{/* Perfect Picks */}
							<div className="group border-[3px] border-black bg-white p-5 shadow-[4px_4px_0_0_#000] transition-all hover:shadow-[6px_6px_0_0_#000]">
								<div className="mb-3 flex items-center justify-between">
									<span className="material-symbols-outlined text-3xl text-[#ccff00]">
										grade
									</span>
									<div className="h-2 w-2 rounded-full bg-[#ccff00]" />
								</div>
								<div className="mb-1 font-black text-4xl text-black">
									{stats.perfectPicks}
								</div>
								<div className="font-black text-[10px] text-black uppercase tracking-wider">
									Placares Exatos
								</div>
							</div>

							{/* Pending Bets */}
							<div className="group border-[3px] border-black bg-white p-5 shadow-[4px_4px_0_0_#000] transition-all hover:shadow-[6px_6px_0_0_#000]">
								<div className="mb-3 flex items-center justify-between">
									<span className="material-symbols-outlined text-3xl text-[#ff2e2e]">
										pending
									</span>
									<div className="h-2 w-2 rounded-full bg-[#ff2e2e]" />
								</div>
								<div className="mb-1 font-black text-4xl text-black">
									{stats.pendingBets}
								</div>
								<div className="font-black text-[10px] text-black uppercase tracking-wider">
									Palpites Pendentes
								</div>
							</div>
						</div>
					)}

					{/* Additional Stats Row */}
					{!isLoading && stats.totalBets > 0 && (
						<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
							{/* Underdog Wins */}
							<div className="flex items-center justify-between border-[3px] border-black bg-gradient-to-r from-purple-600 to-pink-600 p-4 shadow-[4px_4px_0_0_#000]">
								<div>
									<div className="mb-1 font-black text-2xl text-white">
										{stats.underdogWins} 🐕
									</div>
									<div className="font-black text-[10px] text-white uppercase tracking-wider">
										Azarões Vencedores
									</div>
								</div>
								<span className="material-symbols-outlined text-4xl text-white opacity-50">
									rocket_launch
								</span>
							</div>

							{/* Win Streak or Total Bets */}
							<div className="flex items-center justify-between border-[3px] border-black bg-black p-4 shadow-[4px_4px_0_0_#000]">
								<div>
									<div className="mb-1 font-black text-2xl text-[#ccff00]">
										{stats.totalBets}
									</div>
									<div className="font-black text-[10px] text-white uppercase tracking-wider">
										Total de Apostas
									</div>
								</div>
								<span className="material-symbols-outlined text-4xl text-[#ccff00] opacity-50">
									casino
								</span>
							</div>
						</div>
					)}
				</section>

				{/* Achievements Section */}
				<section className="mb-10 md:mb-14">
					<div className="mb-5 flex items-center gap-3">
						<div className="-rotate-2 transform border-2 border-black bg-[#FFD700] p-2 shadow-[2px_2px_0_0_#000]">
							<Trophy
								className="h-5 w-5 text-black md:h-6 md:w-6"
								strokeWidth={3}
								fill="black"
							/>
						</div>
						<h2 className="font-black text-2xl text-black uppercase italic tracking-tighter md:text-3xl">
							CONQUISTAS
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

				{/* My Active Bets Section */}
				<section className="mb-10 md:mb-14">
					{/* Section Header */}
					<div className="mb-5 flex flex-wrap items-center gap-3">
						<div className="-rotate-3 transform border-2 border-black bg-[#2e5cff] p-2 shadow-[2px_2px_0_0_#000]">
							<span className="material-symbols-outlined text-white text-xl md:text-2xl">
								sports_esports
							</span>
						</div>
						<h2 className="font-black text-2xl text-black uppercase italic tracking-tighter md:text-3xl">
							MEUS PALPITES ATIVOS
						</h2>
						{activeBets.length > 0 && (
							<div className="border-2 border-black bg-[#ccff00] px-2 py-1 font-black text-black text-xs">
								{activeBets.length}
							</div>
						)}
						<Link
							to="/my-bets"
							className="ml-auto flex items-center gap-1 font-black text-[#2e5cff] text-sm uppercase tracking-wider transition-colors hover:text-black"
						>
							Ver todas
							<ChevronRight className="h-4 w-4" strokeWidth={3} />
						</Link>
					</div>

					{isLoading ? (
						<div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
							{[1, 2, 3].map((i) => (
								<div
									key={i}
									className="h-48 animate-pulse border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000]"
								/>
							))}
						</div>
					) : activeBets.length > 0 ? (
						<div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
							{activeBets.map((bet) => (
								<div
									key={bet.id}
									className="group relative cursor-pointer border-[3px] border-black bg-white p-5 shadow-[4px_4px_0_0_#000] transition-all hover:shadow-[6px_6px_0_0_#000]"
								>
									{/* Match Status Badge */}
									<div
										className={clsx(
											"absolute -top-3 -right-3 rotate-6 transform border-[3px] border-black px-3 py-1 font-black text-[10px] uppercase tracking-widest shadow-[2px_2px_0_0_#000]",
											bet.match.status === "live"
												? "animate-pulse bg-[#ff2e2e] text-white"
												: "bg-[#f0f0f0] text-black",
										)}
									>
										{bet.match.status === "live" ? "🔴 AO VIVO" : "⏰ AGENDADO"}
									</div>

									{/* Tournament Name Header */}
									<div className="-mx-5 -mt-5 mb-4 border-black border-b-[3px] bg-[#f0f0f0] px-5 py-2">
										{bet.match.tournament?.slug ? (
											<Link
												to="/tournaments/$slug"
												params={{ slug: bet.match.tournament.slug }}
												className="block truncate font-black text-[10px] text-black uppercase tracking-wider hover:text-brawl-blue hover:underline"
											>
												{bet.match.tournament.name}
											</Link>
										) : (
											<div className="truncate font-black text-[10px] text-black uppercase tracking-wider">
												{bet.match.tournament?.name}
											</div>
										)}
									</div>

									{/* Teams Matchup */}
									<div className="mb-5 flex items-stretch gap-3">
										{/* Team A */}
										<div
											className={clsx(
												"flex min-h-[120px] flex-1 flex-col items-center justify-between gap-2 rounded-sm border-[3px] p-3 transition-all",
												bet.predictedWinnerId === bet.match.teamA?.id
													? "border-[#ccff00] bg-[#ccff00]/40 shadow-[3px_3px_0_0_#ccff00]"
													: "border-black bg-white",
											)}
										>
											{bet.match.teamA?.slug ? (
												<Link
													to="/teams/$teamId"
													params={{ teamId: bet.match.teamA.slug }}
													className="flex flex-col items-center gap-2 transition-transform hover:scale-105"
												>
													<TeamLogo
														teamName={bet.match.teamA.name}
														logoUrl={bet.match.teamA.logoUrl}
														size="md"
													/>
													<span className="line-clamp-2 w-full text-center font-black text-[11px] text-black uppercase tracking-tight hover:text-brawl-blue hover:underline">
														{bet.match.teamA.name}
													</span>
												</Link>
											) : (
												<>
													<TeamLogo
														teamName={bet.match.teamA?.name || "TBD"}
														logoUrl={bet.match.teamA?.logoUrl}
														size="md"
													/>
													<span className="line-clamp-2 w-full text-center font-black text-[11px] text-black uppercase tracking-tight">
														{bet.match.teamA?.name || "TBD"}
													</span>
												</>
											)}
											{bet.predictedWinnerId === bet.match.teamA?.id ? (
												<div className="bg-black px-2 py-0.5 font-black text-[#ccff00] text-[8px] uppercase">
													PALPITE
												</div>
											) : (
												<div className="h-5" />
											)}
										</div>

										{/* VS Separator */}
										<div className="shrink-0 self-center rounded-full border-[3px] border-black bg-black px-2 py-1.5 text-white">
											<span className="font-black text-[11px] italic">VS</span>
										</div>

										{/* Team B */}
										<div
											className={clsx(
												"flex min-h-[120px] flex-1 flex-col items-center justify-between gap-2 rounded-sm border-[3px] p-3 transition-all",
												bet.predictedWinnerId === bet.match.teamB?.id
													? "border-[#ccff00] bg-[#ccff00]/40 shadow-[3px_3px_0_0_#ccff00]"
													: "border-black bg-white",
											)}
										>
											{bet.match.teamB?.slug ? (
												<Link
													to="/teams/$teamId"
													params={{ teamId: bet.match.teamB.slug }}
													className="flex flex-col items-center gap-2 transition-transform hover:scale-105"
												>
													<TeamLogo
														teamName={bet.match.teamB.name}
														logoUrl={bet.match.teamB.logoUrl}
														size="md"
													/>
													<span className="line-clamp-2 w-full text-center font-black text-[11px] text-black uppercase tracking-tight hover:text-brawl-red hover:underline">
														{bet.match.teamB.name}
													</span>
												</Link>
											) : (
												<>
													<TeamLogo
														teamName={bet.match.teamB?.name || "TBD"}
														logoUrl={bet.match.teamB?.logoUrl}
														size="md"
													/>
													<span className="line-clamp-2 w-full text-center font-black text-[11px] text-black uppercase tracking-tight">
														{bet.match.teamB?.name || "TBD"}
													</span>
												</>
											)}
											{bet.predictedWinnerId === bet.match.teamB?.id ? (
												<div className="bg-black px-2 py-0.5 font-black text-[#ccff00] text-[8px] uppercase">
													PALPITE
												</div>
											) : (
												<div className="h-5" />
											)}
										</div>
									</div>

									{/* Prediction Score Footer */}
									<div className="-mx-5 -mb-5 flex items-center justify-between border-black border-t-[3px] bg-[#f0f0f0] px-5 py-3">
										<div className="flex items-center gap-2">
											<span className="material-symbols-outlined text-base text-black">
												casino
											</span>
											<span className="font-black text-black text-xs uppercase tracking-wide">
												Placar:
											</span>
										</div>
										<div className="flex items-center gap-2">
											<div className="min-w-[24px] border-2 border-black bg-black px-2 py-1 text-center font-black text-sm text-white">
												{bet.predictedScoreA}
											</div>
											<span className="font-black text-black text-xs">×</span>
											<div className="min-w-[24px] border-2 border-black bg-black px-2 py-1 text-center font-black text-sm text-white">
												{bet.predictedScoreB}
											</div>
										</div>
									</div>

									{/* Match Time Stamp */}
									<div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap border-[2px] border-black bg-white px-3 py-1 font-black text-[9px] text-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]">
										{new Date(bet.match.startTime).toLocaleString("pt-BR", {
											day: "2-digit",
											month: "short",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="border-[3px] border-black bg-white p-12 text-center shadow-[4px_4px_0_0_#000]">
							<div className="mx-auto mb-5 flex h-20 w-20 -rotate-6 transform items-center justify-center border-[3px] border-black bg-[#f0f0f0]">
								<span className="material-symbols-outlined rotate-6 transform text-4xl text-gray-600">
									inbox
								</span>
							</div>
							<p className="mb-2 font-black text-black text-xl uppercase italic">
								Nenhum palpite ativo
							</p>
							<p className="mb-6 font-bold text-gray-700 text-sm">
								Faça suas apostas e acompanhe aqui!
							</p>
							<Link to="/">
								<button className="group -skew-x-12 transform border-[3px] border-black bg-[#ffc700] px-8 py-4 font-black text-base text-black uppercase italic tracking-wider shadow-[4px_4px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none">
									<span className="flex skew-x-12 transform items-center gap-2">
										<span className="material-symbols-outlined text-xl">
											sports
										</span>
										VER PARTIDAS
									</span>
								</button>
							</Link>
						</div>
					)}
				</section>

				{/* Quick Actions Section - Tournament Buttons */}
				<section>
					{/* Section Header */}
					<div className="mb-5 flex items-center gap-3">
						<div className="rotate-2 transform border-2 border-black bg-[#ffc700] p-2 shadow-[2px_2px_0_0_#000]">
							<Trophy
								className="h-5 w-5 text-black md:h-6 md:w-6"
								strokeWidth={3}
							/>
						</div>
						<h2 className="font-black text-2xl text-black uppercase italic tracking-tighter md:text-3xl">
							TORNEIOS ATIVOS
						</h2>
					</div>

					{isLoading ? (
						<div className="flex flex-wrap gap-4">
							{[1, 2, 3].map((i) => (
								<div
									key={i}
									className="h-16 w-48 -skew-x-12 transform animate-pulse border-[3px] border-black bg-[#ffc700] shadow-[3px_3px_0_0_#000]"
								/>
							))}
						</div>
					) : activeTournaments.length > 0 ? (
						<div className="flex flex-wrap gap-4">
							{activeTournaments.map((tournament) => (
								<Link
									key={tournament.id}
									to="/"
									search={{ tournament: tournament.slug }}
								>
									<button className="group -skew-x-12 transform border-[3px] border-black bg-[#ffc700] px-6 py-4 font-black text-black text-sm uppercase italic tracking-wider shadow-[4px_4px_0_0_#000] transition-all duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none md:px-8 md:py-5 md:text-base">
										<span className="flex skew-x-12 transform items-center gap-3">
											{tournament.logoUrl ? (
												<img
													src={tournament.logoUrl}
													alt={tournament.name}
													className="h-10 w-10 object-contain"
												/>
											) : (
												<span className="material-symbols-outlined text-2xl">
													emoji_events
												</span>
											)}
											<span className="whitespace-nowrap">
												{tournament.name}
											</span>
											<ChevronRight
												className="h-5 w-5 transition-transform group-hover:translate-x-1"
												strokeWidth={3}
											/>
										</span>
									</button>
								</Link>
							))}
						</div>
					) : (
						<div className="border-[3px] border-black bg-white p-10 text-center shadow-[4px_4px_0_0_#000]">
							<div className="mx-auto mb-5 flex h-20 w-20 rotate-6 transform items-center justify-center border-[3px] border-black bg-[#ffc700]">
								<Trophy className="h-10 w-10 text-black" strokeWidth={3} />
							</div>
							<p className="mb-2 font-black text-black text-xl uppercase italic">
								Sem torneios ativos
							</p>
							<p className="font-bold text-gray-700 text-sm">
								Novos torneios serão exibidos aqui
							</p>
						</div>
					)}
				</section>

				{/* Bottom Decorative Elements */}
				<div className="mt-16 flex items-center justify-center gap-3 opacity-40">
					<div className="h-1 w-12 -skew-x-12 transform bg-black" />
					<div className="h-3 w-3 rotate-45 border-2 border-black bg-[#ccff00]" />
					<div className="h-1 w-12 skew-x-12 transform bg-black" />
				</div>
			</div>
		</div>
	);
}
