import { createFileRoute, Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
	ArrowLeft,
	Award,
	Calendar,
	Target,
	TrendingUp,
	Trophy,
} from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";
import { getIntermediateColor } from "@/lib/color-extractor";
import { extractColorsServer } from "@/server/color-extractor";
import { getTeamBySlug } from "@/server/teams";

export const Route = createFileRoute("/teams/$teamId")({
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
	const { team, matches, tournaments, colors } = Route.useLoaderData();

	// Calculate intermediate color for gradient (fallback)
	const intermediate = getIntermediateColor(colors.primary, colors.secondary);

	const teamColors = {
		primary: colors.primary,
		secondary: colors.secondary,
		tertiary: colors.tertiary || intermediate,
		style: colors.style || "linear",
	};

	// Calculate stats
	const finishedMatches = matches.filter((m) => m.status === "finished");
	const wins = finishedMatches.filter((m) => m.winnerId === team.id).length;
	const losses = finishedMatches.length - wins;
	const winRate =
		finishedMatches.length > 0
			? Math.round((wins / finishedMatches.length) * 100)
			: 0;

	// Calculate current streak
	let currentStreak = 0;
	let streakType: "W" | "L" | null = null;

	for (let i = 0; i < finishedMatches.length; i++) {
		const match = finishedMatches[i];
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

	// Recent matches (last 10)
	const recentMatches = finishedMatches.slice(0, 10);

	// Upcoming matches (scheduled and live)
	const upcomingMatches = matches
		.filter((m) => m.status === "scheduled" || m.status === "live")
		.sort(
			(a, b) =>
				new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
		);

	const backgroundGradient =
		teamColors.style === "radial"
			? `radial-gradient(ellipse at center, ${teamColors.primary} 0%, ${teamColors.primary} 40%, ${teamColors.tertiary} 80%, ${teamColors.secondary} 100%)`
			: `linear-gradient(90deg, ${teamColors.primary} 0%, ${teamColors.primary} 15%, ${teamColors.tertiary} 50%, ${teamColors.secondary} 85%, ${teamColors.secondary} 100%)`;

	return (
		<div className="min-h-screen bg-paper bg-paper-texture pb-20 font-sans text-ink">
			{/* Hero Header - Team Colors Background (Dynamic) */}
			<div
				className="relative overflow-hidden border-black border-b-4 text-white transition-all duration-500"
				style={{
					background: backgroundGradient,
				}}
			>
				{/* Pattern Overlay */}
				<div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />

				{/* Shine Effect */}
				<div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

				{/* Soft Darkening Overlays for depth */}
				<div className="absolute top-0 left-0 h-full w-full bg-gradient-to-b from-black/20 via-transparent to-black/20" />

				<div className="relative z-10 mx-auto max-w-7xl px-4 py-8">
					<Link
						to="/tournaments"
						search={{ filter: "active" }}
						className="mb-6 inline-flex items-center gap-2 font-bold text-sm text-white/80 uppercase tracking-wider transition-colors hover:text-white"
					>
						<ArrowLeft className="h-4 w-4" />
						Voltar
					</Link>

					<div className="flex flex-col items-center gap-8 md:flex-row md:items-end">
						{/* Team Logo - Platinum/Metallic 3D */}
						<div className="relative">
							{/* Glow effect */}
							<div className="absolute inset-0 scale-110 rounded-full bg-white/40 blur-3xl" />

							<div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl border-[6px] border-black bg-gradient-to-br from-gray-300 via-gray-100 to-gray-300 p-6 shadow-[8px_8px_0_0_#000,12px_12px_0_0_rgba(0,0,0,0.3)] md:h-48 md:w-48">
								{/* Metallic shine bars */}
								<div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent" />
								<div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent" />
								<div className="absolute top-0 right-0 left-0 h-1/3 bg-gradient-to-b from-white/50 to-transparent" />
								<div className="absolute right-0 bottom-0 left-0 h-1/4 bg-gradient-to-t from-black/20 to-transparent" />

								{/* Reflective highlights */}
								<div className="absolute top-4 left-4 h-12 w-12 rounded-full bg-white/70 blur-xl" />
								<div className="absolute right-6 bottom-6 h-8 w-8 rounded-full bg-black/10 blur-lg" />

								<TeamLogo
									teamName={team.name}
									logoUrl={team.logoUrl}
									className="relative z-10 h-full w-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]"
								/>

								{/* Inner border highlight - platinum edge */}
								<div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-white/60" />
								<div className="pointer-events-none absolute inset-2 rounded-xl border border-black/10" />
							</div>
						</div>

						{/* Team Info */}
						<div className="flex-1 text-center md:text-left">
							{team.region && (
								<div className="mb-3 flex items-center justify-center gap-3 md:justify-start">
									<span className="border-2 border-black bg-black px-3 py-1 font-black text-[#ccff00] text-[10px] uppercase tracking-widest shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]">
										{team.region}
									</span>
								</div>
							)}

							<h1 className="mb-3 font-black text-5xl text-white uppercase italic leading-none tracking-tighter drop-shadow-[4px_4px_8px_rgba(0,0,0,0.4)] md:text-7xl">
								{team.name}
							</h1>

							<div className="flex flex-wrap items-center justify-center gap-4 font-bold font-mono text-sm text-white/90 uppercase md:justify-start">
								<span>{finishedMatches.length} Partidas</span>
								<span>•</span>
								<span>{tournaments.length} Torneios</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Stats Bar */}
			<div className="mx-auto max-w-7xl px-4 py-8">
				<div className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-5">
					<StatCard
						icon={<Trophy className="h-5 w-5" />}
						label="Partidas"
						value={finishedMatches.length.toString()}
						color="bg-white"
					/>
					<StatCard
						icon={<Target className="h-5 w-5" />}
						label="Taxa de Vitória"
						value={`${winRate}%`}
						color="bg-brawl-yellow"
					/>
					<StatCard
						icon={<TrendingUp className="h-5 w-5 text-green-600" />}
						label="Vitórias"
						value={wins.toString()}
						color="bg-white"
					/>
					<StatCard
						icon={<TrendingUp className="h-5 w-5 rotate-180 text-red-600" />}
						label="Derrotas"
						value={losses.toString()}
						color="bg-white"
					/>
					<StatCard
						icon={<Award className="h-5 w-5" />}
						label="Sequência Atual"
						value={currentStreak > 0 ? `${currentStreak}${streakType}` : "—"}
						color={
							streakType === "W"
								? "bg-green-100 border-green-500"
								: streakType === "L"
									? "bg-red-100 border-red-500"
									: "bg-white"
						}
					/>
				</div>

				{/* Upcoming Matches */}
				{upcomingMatches.length > 0 && (
					<div className="mb-12">
						<h2 className="mb-6 flex items-center gap-3 font-black text-3xl uppercase italic">
							<div className="h-1 w-12 bg-[#2e5cff]" />
							Próximas Partidas
							{upcomingMatches.some((m) => m.status === "live") && (
								<span className="animate-pulse border-2 border-black bg-[#ff2e2e] px-3 py-1 font-black text-white text-xs uppercase shadow-[2px_2px_0_0_#000]">
									🔴 AO VIVO
								</span>
							)}
						</h2>

						<div className="space-y-4">
							{upcomingMatches.map((match) => {
								const isTeamA = match.teamAId === team.id;
								const opponent = isTeamA ? match.teamB : match.teamA;
								const isLive = match.status === "live";

								return (
									<div
										key={match.id}
										className={clsx(
											"relative overflow-hidden border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000]",
											isLive && "ring-2 ring-[#ff2e2e] ring-offset-2",
										)}
									>
										{/* Live indicator stripe */}
										{isLive && (
											<div className="absolute top-0 bottom-0 left-0 w-2 animate-pulse bg-[#ff2e2e]" />
										)}

										{/* Mobile Layout */}
										<div className={clsx("p-4 md:hidden", isLive && "pl-6")}>
											{/* Header: Status + Tournament + Date */}
											<div className="mb-4 flex items-center justify-between">
												<div className="flex items-center gap-2">
													{/* Status Badge - Smaller on mobile */}
													<div
														className={clsx(
															"border-2 border-black px-2 py-1 font-black text-[10px] uppercase shadow-[2px_2px_0_0_#000]",
															isLive
																? "bg-[#ff2e2e] text-white"
																: "bg-[#ccff00] text-black",
														)}
													>
														{isLive ? "🔴 LIVE" : "VS"}
													</div>
													{/* Tournament Name */}
													{match.tournament?.name && (
														<span className="max-w-[120px] truncate font-bold text-[10px] text-gray-500 uppercase">
															{match.tournament.name}
														</span>
													)}
												</div>
												{/* Date */}
												<div className="font-black text-[10px] text-gray-500 uppercase">
													{isLive
														? "AGORA"
														: new Date(match.startTime).toLocaleDateString(
																"pt-BR",
																{
																	day: "2-digit",
																	month: "short",
																	hour: "2-digit",
																	minute: "2-digit",
																	timeZone: "UTC",
																},
															)}
												</div>
											</div>

											{/* Teams: Stacked vertically on mobile */}
											<div className="mb-4 flex items-center justify-center gap-3">
												{/* Our Team */}
												<div className="flex flex-1 flex-col items-center gap-2">
													<div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-sm border-[3px] border-black bg-white p-2 shadow-[3px_3px_0_0_#000]">
														<TeamLogo
															teamName={team.name}
															logoUrl={team.logoUrl}
															className="h-full w-full object-contain"
														/>
													</div>
													<span className="text-center font-black text-xs uppercase leading-tight">
														{team.name}
													</span>
												</div>

												{/* VS */}
												<div className="-skew-x-12 border-2 border-black bg-black px-2 py-1 font-black text-[#ccff00] text-xs uppercase italic shadow-[2px_2px_0_0_#000]">
													<span className="inline-block skew-x-12">VS</span>
												</div>

												{/* Opponent */}
												<div className="flex flex-1 flex-col items-center gap-2">
													{opponent?.id ? (
														<Link
															to="/teams/$teamId"
															params={{ teamId: opponent.slug }}
															className="flex flex-col items-center gap-2"
														>
															<div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-sm border-[3px] border-black bg-white p-2 shadow-[3px_3px_0_0_#000]">
																<TeamLogo
																	teamName={opponent.name}
																	logoUrl={opponent.logoUrl}
																	className="h-full w-full object-contain"
																/>
															</div>
															<span className="text-center font-black text-xs uppercase leading-tight hover:text-[#2e5cff]">
																{opponent.name}
															</span>
														</Link>
													) : (
														<div className="flex flex-col items-center gap-2">
															<div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-sm border-[3px] border-black bg-white p-2 shadow-[3px_3px_0_0_#000]">
																<TeamLogo
																	teamName={opponent?.name || "TBD"}
																	logoUrl={opponent?.logoUrl}
																	className="h-full w-full object-contain"
																/>
															</div>
															<span className="text-center font-black text-xs uppercase leading-tight">
																{opponent?.name || "TBD"}
															</span>
														</div>
													)}
												</div>
											</div>

											{/* CTA Button - Full width on mobile */}
											<Link
												to="/"
												className="block w-full border-[3px] border-black bg-[#ffc700] py-3 text-center font-black text-black text-sm uppercase shadow-[2px_2px_0_0_#000] hover:bg-[#e6b200]"
											>
												{isLive ? "🔴 Acompanhar" : "Fazer Aposta"}
											</Link>
										</div>

										{/* Desktop Layout */}
										<div
											className={clsx(
												"hidden items-center gap-4 p-5 md:flex",
												isLive && "pl-6",
											)}
										>
											{/* Status Badge */}
											<div className="relative flex-shrink-0">
												<div
													className={clsx(
														"flex h-16 w-16 items-center justify-center border-[3px] border-black font-black text-xs uppercase shadow-[3px_3px_0_0_#000]",
														isLive
															? "bg-[#ff2e2e] text-white"
															: "bg-[#ccff00] text-black",
													)}
												>
													{isLive ? "LIVE" : "VS"}
												</div>
											</div>

											{/* Tournament Badge */}
											<div className="flex-shrink-0">
												<div className="group relative">
													<div className="absolute -inset-1 rounded bg-[#2e5cff]/30 opacity-0 blur transition-opacity group-hover:opacity-40" />

													{match.tournament?.slug ? (
														<Link
															to="/tournaments/$slug"
															params={{ slug: match.tournament.slug }}
															className="relative block flex h-14 w-14 items-center justify-center overflow-hidden rounded-sm border-[3px] border-black bg-white p-2 shadow-[2px_2px_0_0_#000] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000]"
														>
															{match.tournament.logoUrl ? (
																<img
																	src={match.tournament.logoUrl}
																	alt={match.tournament.name}
																	className="h-full w-full object-contain"
																/>
															) : (
																<Trophy className="h-7 w-7 text-gray-400" />
															)}
														</Link>
													) : (
														<div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-sm border-[3px] border-black bg-white p-2 shadow-[2px_2px_0_0_#000]">
															{match.tournament?.logoUrl ? (
																<img
																	src={match.tournament.logoUrl}
																	alt={match.tournament.name}
																	className="h-full w-full object-contain"
																/>
															) : (
																<Trophy className="h-7 w-7 text-gray-400" />
															)}
														</div>
													)}

													{/* Tooltip */}
													<div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap border-2 border-black bg-black px-3 py-1.5 font-bold text-[10px] text-white uppercase opacity-0 shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] transition-opacity group-hover:opacity-100">
														{match.tournament?.name}
														<div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-transparent border-t-[6px] border-t-black border-r-[6px] border-l-[6px]" />
													</div>
												</div>
											</div>

											{/* VS Section */}
											<div className="flex min-w-0 flex-1 items-center gap-4">
												{/* Our Team */}
												<div className="flex flex-shrink-0 items-center gap-3">
													<div className="group relative">
														<div
															className="absolute -inset-1 rounded opacity-0 blur transition-opacity group-hover:opacity-30"
															style={{ backgroundColor: teamColors.primary }}
														/>
														<div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-sm border-[3px] border-black bg-white p-2 shadow-[3px_3px_0_0_#000]">
															<TeamLogo
																teamName={team.name}
																logoUrl={team.logoUrl}
																className="h-full w-full object-contain"
															/>
														</div>
													</div>
													<span className="hidden font-black text-sm uppercase lg:inline-block">
														{team.name}
													</span>
												</div>

												{/* VS Badge */}
												<div className="flex-shrink-0 -skew-x-12 border-[3px] border-black bg-black px-3 py-1.5 font-black text-[#ccff00] text-xs uppercase italic shadow-[2px_2px_0_0_#000]">
													<span className="inline-block skew-x-12">VS</span>
												</div>

												{/* Opponent */}
												<div className="flex min-w-0 flex-1 items-center gap-3">
													<div className="group relative flex-shrink-0">
														<div className="absolute -inset-1 rounded bg-gray-400 opacity-0 blur transition-opacity group-hover:opacity-30" />
														{opponent?.id ? (
															<Link
																to="/teams/$teamId"
																params={{ teamId: opponent.slug }}
																className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-sm border-[3px] border-black bg-white p-2 shadow-[3px_3px_0_0_#000] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#000]"
															>
																<TeamLogo
																	teamName={opponent.name}
																	logoUrl={opponent.logoUrl}
																	className="h-full w-full object-contain"
																/>
															</Link>
														) : (
															<div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-sm border-[3px] border-black bg-white p-2 shadow-[3px_3px_0_0_#000]">
																<TeamLogo
																	teamName={opponent?.name || "TBD"}
																	logoUrl={opponent?.logoUrl}
																	className="h-full w-full object-contain"
																/>
															</div>
														)}
													</div>
													{opponent?.id ? (
														<Link
															to="/teams/$teamId"
															params={{ teamId: opponent.slug }}
															className="truncate font-black text-sm uppercase transition-colors hover:text-[#2e5cff] hover:underline"
														>
															{opponent.name}
														</Link>
													) : (
														<span className="truncate font-black text-sm uppercase">
															{opponent?.name || "TBD"}
														</span>
													)}
												</div>
											</div>

											{/* Date/Time Badge */}
											<div className="flex-shrink-0">
												<div className="border-[3px] border-black bg-[#f0f0f0] px-4 py-3 text-center shadow-[2px_2px_0_0_#000]">
													<Calendar className="mx-auto mb-1 h-4 w-4 text-gray-500" />
													<div className="font-black text-[10px] text-gray-500 uppercase tracking-widest">
														{isLive
															? "AGORA"
															: new Date(match.startTime)
																	.toLocaleDateString("pt-BR", {
																		month: "short",
																		timeZone: "UTC",
																	})
																	.toUpperCase()
																	.replace(".", "")}
													</div>
													<div className="font-black text-black text-xl">
														{isLive
															? "🔴"
															: new Date(match.startTime).getUTCDate()}
													</div>
													{!isLive && (
														<div className="mt-0.5 font-bold text-[9px] text-gray-500">
															{new Date(match.startTime).toLocaleTimeString(
																"pt-BR",
																{
																	hour: "2-digit",
																	minute: "2-digit",
																	timeZone: "UTC",
																},
															)}
														</div>
													)}
												</div>
											</div>

											{/* Betting Button */}
											<div className="flex-shrink-0">
												<Link
													to="/"
													className="block border-[3px] border-black bg-[#ffc700] px-4 py-2 text-center font-black text-black text-xs uppercase shadow-[2px_2px_0_0_#000] transition-all hover:-translate-y-0.5 hover:bg-[#e6b200] hover:shadow-[4px_4px_0_0_#000]"
												>
													{isLive ? "Acompanhar" : "Apostar"}
												</Link>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Recent Match History */}
				<div className="mb-12">
					<h2 className="mb-6 flex items-center gap-3 font-black text-3xl uppercase italic">
						<div className="h-1 w-12 bg-black" />
						Histórico Recente
					</h2>

					{recentMatches.length > 0 ? (
						<div className="space-y-4">
							{recentMatches.map((match, index) => {
								const isTeamA = match.teamAId === team.id;
								const opponent = isTeamA ? match.teamB : match.teamA;
								const isWin = match.winnerId === team.id;
								const teamScore = isTeamA ? match.scoreA : match.scoreB;
								const opponentScore = isTeamA ? match.scoreB : match.scoreA;

								return (
									<div
										key={match.id}
										className="relative overflow-hidden border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000]"
									>
										{/* Colored Stripe */}
										<div
											className={clsx(
												"absolute top-0 bottom-0 left-0 w-2",
												isWin ? "bg-brawl-yellow" : "bg-gray-300",
											)}
										/>

										{/* Mobile Layout */}
										<div className="p-4 pl-6 md:hidden">
											{/* Header: Result + Date + Tournament */}
											<div className="mb-4 flex items-center justify-between">
												<div className="flex items-center gap-2">
													{/* Win/Loss Badge - Smaller */}
													<div
														className={clsx(
															"flex h-10 w-10 items-center justify-center border-[3px] border-black font-black text-lg uppercase italic shadow-[2px_2px_0_0_#000]",
															isWin
																? "bg-[#ccff00] text-black"
																: "bg-black text-white",
														)}
													>
														{isWin ? "W" : "L"}
													</div>
													{/* Score - Prominent */}
													<div className="flex items-center gap-1 border-[3px] border-black bg-tape px-3 py-1.5 shadow-[2px_2px_0_0_#000]">
														<span
															className={clsx(
																"font-black font-body text-xl",
																isWin ? "text-brawl-blue" : "text-black",
															)}
														>
															{teamScore}
														</span>
														<span className="font-black text-black">:</span>
														<span
															className={clsx(
																"font-black font-body text-xl",
																!isWin ? "text-brawl-red" : "text-black",
															)}
														>
															{opponentScore}
														</span>
													</div>
												</div>

												{/* Date */}
												<div className="text-right">
													<div className="font-black text-[10px] text-gray-500 uppercase tracking-wider">
														{new Date(match.startTime)
															.toLocaleDateString("pt-BR", {
																month: "short",
																timeZone: "UTC",
															})
															.toUpperCase()
															.replace(".", "")}
													</div>
													<div className="font-black text-black text-lg">
														{new Date(match.startTime).getUTCDate()}
													</div>
												</div>
											</div>

											{/* Teams: Stacked vertically on mobile */}
											<div className="mb-4 space-y-3">
												{/* Our Team */}
												<div className="flex items-center gap-3 border-[2px] border-black bg-gray-50 p-2">
													<div className="flex h-12 w-12 items-center justify-center overflow-hidden border-[2px] border-black bg-white p-1 shadow-[2px_2px_0_0_#000]">
														<TeamLogo
															teamName={team.name}
															logoUrl={team.logoUrl}
															className="h-full w-full object-contain"
														/>
													</div>
													<span className="flex-1 font-black text-sm uppercase">
														{team.name}
													</span>
													<span className="font-black font-body text-xl">
														{teamScore}
													</span>
												</div>

												{/* Opponent */}
												{opponent?.id ? (
													<Link
														to="/teams/$teamId"
														params={{ teamId: opponent.slug }}
														className="flex items-center gap-3 border-[2px] border-black p-2 transition-colors hover:bg-gray-50"
													>
														<div className="flex h-12 w-12 items-center justify-center overflow-hidden border-[2px] border-black bg-white p-1 shadow-[2px_2px_0_0_#000]">
															<TeamLogo
																teamName={opponent.name}
																logoUrl={opponent.logoUrl}
																className="h-full w-full object-contain"
															/>
														</div>
														<span className="flex-1 font-black text-sm uppercase">
															{opponent.name}
														</span>
														<span className="font-black font-body text-xl">
															{opponentScore}
														</span>
													</Link>
												) : (
													<div className="flex items-center gap-3 border-[2px] border-black bg-gray-100 p-2">
														<div className="flex h-12 w-12 items-center justify-center overflow-hidden border-[2px] border-black bg-white p-1 shadow-[2px_2px_0_0_#000]">
															<TeamLogo
																teamName={opponent?.name || "TBD"}
																logoUrl={opponent?.logoUrl}
																className="h-full w-full object-contain"
															/>
														</div>
														<span className="flex-1 font-black text-sm uppercase">
															{opponent?.name || "TBD"}
														</span>
														<span className="font-black font-body text-xl">
															{opponentScore}
														</span>
													</div>
												)}
											</div>

											{/* Tournament Badge */}
											<div className="flex items-center gap-2 text-xs">
												{match.tournament?.slug ? (
													<Link
														to="/tournaments/$slug"
														params={{ slug: match.tournament.slug }}
														className="flex items-center gap-2 transition-opacity hover:opacity-80"
													>
														<div className="flex h-6 w-6 items-center justify-center border-[2px] border-black bg-white p-0.5">
															{match.tournament.logoUrl ? (
																<img
																	src={match.tournament.logoUrl}
																	alt={match.tournament.name}
																	className="h-full w-full object-contain"
																/>
															) : (
																<Trophy className="h-4 w-4 text-gray-400" />
															)}
														</div>
														<span className="font-bold text-gray-600 uppercase">
															{match.tournament.name}
														</span>
													</Link>
												) : (
													<div className="flex items-center gap-2">
														<div className="flex h-6 w-6 items-center justify-center border-[2px] border-black bg-white p-0.5">
															<Trophy className="h-4 w-4 text-gray-400" />
														</div>
														<span className="font-bold text-gray-600 uppercase">
															{match.tournament?.name || "Torneio"}
														</span>
													</div>
												)}
											</div>
										</div>

										{/* Desktop Layout */}
										<div className="hidden items-center gap-4 p-5 pl-6 md:flex">
											{/* Win/Loss Badge - Straight */}
											<div className="relative flex-shrink-0">
												<div
													className={clsx(
														"flex h-16 w-16 items-center justify-center border-[3px] border-black font-black text-2xl uppercase italic shadow-[3px_3px_0_0_#000]",
														isWin
															? "bg-[#ccff00] text-black"
															: "bg-black text-white",
													)}
												>
													{isWin ? "W" : "L"}
												</div>
												{/* Small match number badge */}
												<div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-brawl-red font-black text-[10px] text-white">
													{index + 1}
												</div>
											</div>

											{/* Tournament Badge */}
											<div className="hidden flex-shrink-0 md:block">
												<div className="group relative">
													{/* Glow on hover */}
													<div className="absolute -inset-1 rounded bg-brawl-yellow/50 opacity-0 blur transition-opacity group-hover:opacity-40" />

													{match.tournament?.slug ? (
														<Link
															to="/tournaments/$slug"
															params={{ slug: match.tournament.slug }}
															className="relative block flex h-14 w-14 items-center justify-center overflow-hidden rounded-sm border-[3px] border-black bg-white p-2 shadow-[2px_2px_0_0_#000] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000]"
														>
															{match.tournament.logoUrl ? (
																<img
																	src={match.tournament.logoUrl}
																	alt={match.tournament.name}
																	className="h-full w-full object-contain"
																/>
															) : (
																<Trophy className="h-7 w-7 text-gray-400" />
															)}
														</Link>
													) : (
														<div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-sm border-[3px] border-black bg-white p-2 shadow-[2px_2px_0_0_#000]">
															{match.tournament?.logoUrl ? (
																<img
																	src={match.tournament.logoUrl}
																	alt={match.tournament.name}
																	className="h-full w-full object-contain"
																/>
															) : (
																<Trophy className="h-7 w-7 text-gray-400" />
															)}
														</div>
													)}

													{/* Tooltip */}
													<div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap border-2 border-black bg-black px-3 py-1.5 font-bold text-[10px] text-white uppercase opacity-0 shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] transition-opacity group-hover:opacity-100">
														{match.tournament?.name}
														<div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-transparent border-t-[6px] border-t-black border-r-[6px] border-l-[6px]" />
													</div>
												</div>
											</div>

											{/* VS Section - Enhanced Logos */}
											<div className="flex min-w-0 flex-1 items-center gap-4">
												{/* Our Team - ENHANCED */}
												<div className="flex flex-shrink-0 items-center gap-3">
													<div className="group relative">
														{/* Glow effect on hover */}
														<div
															className="absolute -inset-1 rounded opacity-0 blur transition-opacity group-hover:opacity-30"
															style={{ backgroundColor: teamColors.primary }}
														/>

														<div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-sm border-[3px] border-black bg-white p-2 shadow-[3px_3px_0_0_#000]">
															<TeamLogo
																teamName={team.name}
																logoUrl={team.logoUrl}
																className="h-full w-full object-contain"
															/>
														</div>
													</div>
													<span className="hidden font-black text-sm uppercase lg:inline-block">
														{team.name}
													</span>
												</div>

												{/* VS Badge */}
												<div className="flex-shrink-0 -skew-x-12 border-[3px] border-black bg-black px-3 py-1.5 font-black text-[#ccff00] text-xs uppercase italic shadow-[2px_2px_0_0_#000]">
													<span className="inline-block skew-x-12">VS</span>
												</div>

												{/* Opponent - ENHANCED */}
												<div className="flex min-w-0 flex-1 items-center gap-3">
													<div className="group relative flex-shrink-0">
														{/* Glow effect on hover */}
														<div className="absolute -inset-1 rounded bg-gray-400 opacity-0 blur transition-opacity group-hover:opacity-30" />

														{opponent?.id ? (
															<Link
																to="/teams/$teamId"
																params={{ teamId: opponent.slug }}
																className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-sm border-[3px] border-black bg-white p-2 shadow-[3px_3px_0_0_#000] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#000]"
															>
																<TeamLogo
																	teamName={opponent.name}
																	logoUrl={opponent.logoUrl}
																	className="h-full w-full object-contain"
																/>
															</Link>
														) : (
															<div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-sm border-[3px] border-black bg-white p-2 shadow-[3px_3px_0_0_#000]">
																<TeamLogo
																	teamName={opponent?.name || "TBD"}
																	logoUrl={opponent?.logoUrl}
																	className="h-full w-full object-contain"
																/>
															</div>
														)}
													</div>
													{opponent?.id ? (
														<Link
															to="/teams/$teamId"
															params={{ teamId: opponent.slug }}
															className="truncate font-black text-sm uppercase transition-colors hover:text-brawl-red hover:underline"
														>
															{opponent.name}
														</Link>
													) : (
														<span className="truncate font-black text-sm uppercase">
															{opponent?.name || "TBD"}
														</span>
													)}
												</div>
											</div>

											{/* Score - Big and Bold */}
											<div className="flex-shrink-0">
												<div className="flex items-center gap-2 border-[3px] border-black bg-tape px-4 py-2 shadow-[2px_2px_0_0_#000]">
													<span
														className={clsx(
															"font-black font-body text-3xl",
															isWin ? "text-brawl-blue" : "text-black",
														)}
													>
														{teamScore}
													</span>
													<span className="font-black text-black text-xl">
														:
													</span>
													<span
														className={clsx(
															"font-black font-body text-3xl",
															!isWin ? "text-brawl-red" : "text-black",
														)}
													>
														{opponentScore}
													</span>
												</div>
											</div>

											{/* Date Badge - Straight */}
											<div className="hidden flex-shrink-0 xl:block">
												<div className="border-[3px] border-black bg-white px-3 py-2 text-center shadow-[2px_2px_0_0_#000]">
													<div className="font-black text-[10px] text-gray-500 uppercase tracking-widest">
														{new Date(match.startTime)
															.toLocaleDateString("pt-BR", {
																month: "short",
																timeZone: "UTC",
															})
															.toUpperCase()
															.replace(".", "")}
													</div>
													<div className="font-black text-black text-xl">
														{new Date(match.startTime).getUTCDate()}
													</div>
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="rounded-xl border-4 border-black/10 border-dashed bg-white py-12 text-center">
							<Trophy className="mx-auto mb-3 h-12 w-12 text-gray-300" />
							<p className="font-bold text-gray-400 uppercase">
								Nenhuma partida finalizada
							</p>
						</div>
					)}
				</div>

				{/* Tournaments Participated */}
				{tournaments.length > 0 && (
					<div>
						<h2 className="mb-6 flex items-center gap-3 font-black text-3xl uppercase italic">
							<div className="h-1 w-12 bg-black" />
							Torneios
						</h2>

						<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
							{tournaments.map((tournament) => (
								<Link
									key={tournament.id}
									to="/tournaments/$slug"
									params={{ slug: tournament.slug }}
									className="group flex items-center gap-4 border-2 border-black bg-white p-4 shadow-comic transition-all hover:-translate-y-1 hover:shadow-comic-hover"
								>
									{tournament.logoUrl ? (
										<img
											src={tournament.logoUrl}
											alt={tournament.name}
											className="h-12 w-12 object-contain"
										/>
									) : (
										<Trophy className="h-12 w-12 text-gray-300" />
									)}

									<div className="flex-1">
										<h3 className="font-black text-sm uppercase transition-colors group-hover:text-brawl-blue">
											{tournament.name}
										</h3>
										<p className="mt-0.5 font-bold text-gray-500 text-xs uppercase">
											{tournament.region || "Global"}
										</p>
									</div>

									<div
										className={clsx(
											"rounded px-2 py-1 font-black text-[10px] uppercase",
											tournament.status === "active"
												? "bg-green-100 text-green-800"
												: tournament.status === "upcoming"
													? "bg-blue-100 text-blue-800"
													: "bg-gray-100 text-gray-800",
										)}
									>
										{tournament.status === "active"
											? "Ativo"
											: tournament.status === "upcoming"
												? "Em Breve"
												: "Finalizado"}
									</div>
								</Link>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function StatCard({
	icon,
	label,
	value,
	color,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	color: string;
}) {
	return (
		<div
			className={clsx(
				"flex flex-col items-center justify-center border-2 border-black p-4 text-center shadow-comic",
				color,
			)}
		>
			<div className="mb-2">{icon}</div>
			<div className="mb-1 font-black font-body text-3xl">{value}</div>
			<div className="font-bold text-[10px] text-gray-600 uppercase tracking-widest">
				{label}
			</div>
		</div>
	);
}
