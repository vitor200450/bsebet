import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { TeamLogo } from "@/components/TeamLogo";
import { getMyBets } from "@/functions/get-my-bets";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/my-bets")({
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
	const [filter, setFilter] = useState<FilterType>("all");

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

	const filteredGroups = allGroups
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

	return (
		<div className="relative min-h-screen bg-[#e6e6e6] pb-12">
			{/* Paper texture overlay */}
			<div
				className="pointer-events-none fixed inset-0 opacity-[0.15] mix-blend-multiply"
				style={{
					backgroundImage:
						'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
					backgroundRepeat: "repeat",
				}}
			/>

			<div className="relative z-10 mx-auto max-w-[1600px] px-4 py-6 md:px-6 md:py-10">
				{/* Page Header - Visual diferente do Dashboard */}
				<div className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end">
					<div className="flex items-center gap-4">
						{/* Ícone grande de histórico - diferencia do dashboard */}
						<div className="hidden h-16 w-16 -rotate-6 transform items-center justify-center border-[4px] border-black bg-gradient-to-br from-[#ff6b00] to-[#ff9d00] shadow-[4px_4px_0_0_#000] md:flex lg:h-20 lg:w-20">
							<span className="material-symbols-outlined text-3xl text-white lg:text-4xl">
								history
							</span>
						</div>
						<div className="inline-block w-fit -skew-x-12 transform border-[3px] border-black bg-[#ff6b00] px-6 py-3 text-white shadow-[4px_4px_0_0_#000] md:px-8 md:py-4">
							<h1 className="skew-x-12 transform font-black text-3xl uppercase italic tracking-tighter md:text-5xl lg:text-6xl">
								MINHAS APOSTAS
							</h1>
						</div>
					</div>
					<div className="flex items-center gap-2 md:mb-2">
						<span className="material-symbols-outlined text-[#ff6b00] text-xl">
							inventory_2
						</span>
						<span className="font-bold text-gray-600 text-sm md:text-base">
							Histórico completo de palpites
						</span>
					</div>
				</div>

				{/* Filter Tabs - Visual diferente com ícones */}
				<section className="mb-8">
					<div className="flex flex-wrap items-center gap-3">
						{[
							{ key: "all" as FilterType, label: "TODOS", icon: "apps" },
							{
								key: "pending" as FilterType,
								label: "PENDENTES",
								icon: "pending",
							},
							{
								key: "finished" as FilterType,
								label: "FINALIZADOS",
								icon: "check_circle",
							},
						].map((tab) => (
							<button
								key={tab.key}
								onClick={() => setFilter(tab.key)}
								className={clsx(
									"flex -skew-x-6 transform items-center gap-2 border-[3px] border-black px-5 py-2.5 font-black text-sm uppercase italic tracking-wider shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_#000]",
									filter === tab.key
										? "border-black bg-[#ff6b00] text-white"
										: "bg-white text-black",
								)}
							>
								<span className="material-symbols-outlined skew-x-6 transform text-base">
									{tab.icon}
								</span>
								<span className="inline-block skew-x-6 transform">
									{tab.label}
								</span>
							</button>
						))}

						{!isLoading && (
							<div className="ml-auto -skew-x-6 transform border-[3px] border-black bg-black px-4 py-2 font-black text-white text-xs">
								<span className="inline-flex skew-x-6 transform items-center gap-2">
									<span className="material-symbols-outlined text-sm">
										receipt
									</span>
									{totalFilteredBets} palpite
									{totalFilteredBets !== 1 ? "s" : ""}
								</span>
							</div>
						)}
					</div>
				</section>

				{/* Bets Grouped by Tournament */}
				{isLoading ? (
					<div className="space-y-10">
						{[1, 2].map((i) => (
							<div key={i}>
								<div className="mb-5 h-10 w-64 animate-pulse border-[3px] border-black bg-white shadow-[3px_3px_0_0_#000]" />
								<div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
									{[1, 2, 3].map((j) => (
										<div
											key={j}
											className="h-56 animate-pulse border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000]"
										/>
									))}
								</div>
							</div>
						))}
					</div>
				) : filteredGroups.length > 0 ? (
					<div className="space-y-12">
						{filteredGroups.map((group) => (
							<section key={group.tournament.id}>
								{/* Tournament Header */}
								<div className="mb-5 flex items-center gap-3">
									<div className="shrink-0 rotate-2 transform border-2 border-black bg-[#ffc700] p-2 shadow-[2px_2px_0_0_#000]">
										{group.tournament.logoUrl ? (
											<img
												src={group.tournament.logoUrl}
												alt={group.tournament.name}
												className="h-5 w-5 object-contain md:h-6 md:w-6"
											/>
										) : (
											<span className="material-symbols-outlined text-black text-xl md:text-2xl">
												emoji_events
											</span>
										)}
									</div>
									<h2 className="font-black text-2xl text-black uppercase italic tracking-tighter md:text-3xl">
										<Link
											to="/tournaments/$slug"
											params={{ slug: group.tournament.slug }}
											className="transition-colors hover:text-[#2e5cff]"
										>
											{group.tournament.name}
										</Link>
									</h2>
									<div className="shrink-0 border-2 border-black bg-[#ccff00] px-2 py-1 font-black text-xs">
										{group.bets.length}
									</div>
								</div>

								{/* Bet Cards Grid */}
								<div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
									{group.bets.map((bet) => {
										const isFinished = bet.match.status === "finished";
										const isLive = bet.match.status === "live";
										const isProjected = bet.id < 0; // Synthetic bet (projected future match)
										const won =
											!isProjected &&
											isFinished &&
											bet.pointsEarned !== null &&
											bet.pointsEarned > 0;
										const lost = !isProjected && isFinished && !won;

										return (
											<div
												key={bet.id}
												className={clsx(
													"relative border-[3px] p-5 transition-all",
													isProjected
														? "border-gray-400 border-dashed bg-[#f8f8f8] shadow-[4px_4px_0_0_#ccc]"
														: "border-black bg-white shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000]",
												)}
											>
												{/* Status Badge */}
												<div
													className={clsx(
														"absolute -top-3 -right-3 rotate-6 transform border-[3px] border-black px-3 py-1 font-black text-[10px] uppercase tracking-widest shadow-[2px_2px_0_0_#000]",
														isProjected
															? "bg-[#ff6b00] text-white"
															: isLive
																? "animate-pulse bg-[#ff2e2e] text-white"
																: won
																	? "bg-[#ccff00] text-black"
																	: lost
																		? "bg-[#ff2e2e] text-white"
																		: "bg-[#f0f0f0] text-black",
													)}
												>
													{isProjected
														? "🔮 PROJEÇÃO"
														: isLive
															? "🔴 AO VIVO"
															: won
																? "✅ ACERTOU"
																: lost
																	? "❌ ERROU"
																	: "⏰ AGENDADO"}
												</div>

												{/* Match label (stage) */}
												{bet.match.label && (
													<div className="-mx-5 -mt-5 mb-4 border-black border-b-[3px] bg-[#f0f0f0] px-5 py-2">
														<div className="truncate font-black text-[10px] text-gray-500 uppercase tracking-wider">
															{bet.match.label}
														</div>
													</div>
												)}

												{/* Teams Matchup */}
												<div className="mt-2 mb-5 flex items-stretch gap-3">
													{/* Team A */}
													<div
														className={clsx(
															"flex min-h-[120px] flex-1 flex-col items-center justify-between gap-2 rounded-sm border-[3px] p-3 transition-all",
															!isProjected &&
																bet.predictedWinnerId === bet.match.teamA?.id
																? "border-[#ccff00] bg-[#ccff00]/40 shadow-[3px_3px_0_0_#ccff00]"
																: isProjected
																	? "border-gray-300 bg-white"
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
																<span className="line-clamp-2 w-full text-center font-black text-[11px] text-black uppercase tracking-tight hover:text-[#2e5cff] hover:underline">
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

														<div className="flex w-full flex-col items-center gap-1">
															{!isProjected &&
																bet.predictedWinnerId ===
																	bet.match.teamA?.id && (
																	<div className="bg-black px-2 py-0.5 font-black text-[#ccff00] text-[8px] uppercase">
																		PALPITE
																	</div>
																)}
															{isFinished &&
																bet.match.winner?.id ===
																	bet.match.teamA?.id && (
																	<div className="border border-black bg-[#ffc700] px-2 py-0.5 font-black text-[8px] text-black uppercase">
																		VENCEU
																	</div>
																)}
														</div>
													</div>

													{/* VS */}
													<div className="shrink-0 self-center rounded-full border-[3px] border-black bg-black px-2 py-1.5 text-white">
														<span className="font-black text-[11px] italic">
															VS
														</span>
													</div>

													{/* Team B */}
													<div
														className={clsx(
															"flex min-h-[120px] flex-1 flex-col items-center justify-between gap-2 rounded-sm border-[3px] p-3 transition-all",
															!isProjected &&
																bet.predictedWinnerId === bet.match.teamB?.id
																? "border-[#ccff00] bg-[#ccff00]/40 shadow-[3px_3px_0_0_#ccff00]"
																: isProjected
																	? "border-gray-300 bg-white"
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
																<span className="line-clamp-2 w-full text-center font-black text-[11px] text-black uppercase tracking-tight hover:text-[#ff2e2e] hover:underline">
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

														<div className="flex w-full flex-col items-center gap-1">
															{!isProjected &&
																bet.predictedWinnerId ===
																	bet.match.teamB?.id && (
																	<div className="bg-black px-2 py-0.5 font-black text-[#ccff00] text-[8px] uppercase">
																		PALPITE
																	</div>
																)}
															{isFinished &&
																bet.match.winner?.id ===
																	bet.match.teamB?.id && (
																	<div className="border border-black bg-[#ffc700] px-2 py-0.5 font-black text-[8px] text-black uppercase">
																		VENCEU
																	</div>
																)}
														</div>
													</div>
												</div>

												{/* Footer */}
												<div className="-mx-5 -mb-5 space-y-2 border-black border-t-[3px] bg-[#f0f0f0] px-5 py-3">
													{/* Scores */}
													{isProjected ? (
														<div className="flex items-center justify-center gap-2 text-gray-500">
															<span className="material-symbols-outlined text-base">
																auto_awesome
															</span>
															<span className="font-black text-xs uppercase tracking-wide">
																Baseado nas suas previsões
															</span>
														</div>
													) : isFinished ? (
														<div className="flex items-center justify-between gap-3">
															{/* Real score */}
															<div className="flex flex-col items-center gap-1">
																<span className="font-black text-[9px] text-gray-500 uppercase tracking-wider">
																	REAL
																</span>
																<div className="flex items-center gap-1">
																	<div className="min-w-[24px] border-2 border-black bg-black px-2 py-0.5 text-center font-black text-sm text-white">
																		{bet.match.scoreA ?? "—"}
																	</div>
																	<span className="font-black text-black text-xs">
																		×
																	</span>
																	<div className="min-w-[24px] border-2 border-black bg-black px-2 py-0.5 text-center font-black text-sm text-white">
																		{bet.match.scoreB ?? "—"}
																	</div>
																</div>
															</div>

															{/* Predicted score */}
															<div className="flex flex-col items-center gap-1">
																<span className="font-black text-[9px] text-gray-500 uppercase tracking-wider">
																	PALPITE
																</span>
																<div className="flex items-center gap-1">
																	<div className="min-w-[24px] border-2 border-black bg-gray-200 px-2 py-0.5 text-center font-black text-black text-sm">
																		{bet.predictedScoreA}
																	</div>
																	<span className="font-black text-black text-xs">
																		×
																	</span>
																	<div className="min-w-[24px] border-2 border-black bg-gray-200 px-2 py-0.5 text-center font-black text-black text-sm">
																		{bet.predictedScoreB}
																	</div>
																</div>
															</div>

															{/* Points earned */}
															{bet.pointsEarned !== null &&
																bet.pointsEarned > 0 && (
																	<div className="border-[2px] border-black bg-[#ccff00] px-2 py-1 text-center">
																		<div className="font-black text-black text-xs">
																			+{bet.pointsEarned}
																		</div>
																		<div className="font-black text-[8px] text-black uppercase">
																			PTS
																		</div>
																	</div>
																)}
														</div>
													) : (
														<div className="flex items-center justify-between">
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
																<span className="font-black text-black text-xs">
																	×
																</span>
																<div className="min-w-[24px] border-2 border-black bg-black px-2 py-1 text-center font-black text-sm text-white">
																	{bet.predictedScoreB}
																</div>
															</div>
														</div>
													)}

													{/* Badges for finished matches */}
													{isFinished &&
														(bet.isPerfectPick || bet.isUnderdogPick) && (
															<div className="flex flex-wrap items-center gap-2 pt-1">
																{bet.isPerfectPick && (
																	<span className="inline-block -skew-x-6 transform border-2 border-black bg-[#ffc700] px-2 py-0.5 font-black text-[9px] text-black uppercase">
																		PLACAR EXATO
																	</span>
																)}
																{bet.isUnderdogPick && won && (
																	<span className="inline-block skew-x-6 transform border-2 border-black bg-gradient-to-r from-purple-600 to-pink-600 px-2 py-0.5 font-black text-[9px] text-white uppercase">
																		AZARÃO
																	</span>
																)}
															</div>
														)}
												</div>

												{/* Date stamp (for scheduled/live) */}
												{!isFinished && (
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
												)}
											</div>
										);
									})}
								</div>
							</section>
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
							{filter === "all"
								? "Nenhum palpite encontrado"
								: filter === "pending"
									? "Nenhum palpite pendente"
									: "Nenhum palpite finalizado"}
						</p>
						<p className="mb-6 font-bold text-gray-700 text-sm">
							{filter === "all"
								? "Faça suas apostas nos torneios ativos!"
								: "Tente outro filtro ou faça mais apostas."}
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

				{/* Bottom decorative */}
				<div className="mt-16 flex items-center justify-center gap-3 opacity-40">
					<div className="h-1 w-12 -skew-x-12 transform bg-black" />
					<div className="h-3 w-3 rotate-45 border-2 border-black bg-[#ccff00]" />
					<div className="h-1 w-12 skew-x-12 transform bg-black" />
				</div>
			</div>
		</div>
	);
}
