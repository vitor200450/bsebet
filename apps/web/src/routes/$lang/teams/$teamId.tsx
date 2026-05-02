import { createFileRoute, Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { ArrowLeft, Award, Target, TrendingUp, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TeamLogo } from "@/components/TeamLogo";
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
	const { t } = useTranslation("team");
	const { linkTo } = useLangLink();
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

	return (
		<div className="min-h-screen bg-[#f0f0f0] pb-20 font-sans">
			{/* Paper texture overlay */}
			<div
				className="pointer-events-none fixed inset-0 opacity-[0.12] mix-blend-multiply"
				style={{
					backgroundImage:
						'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
					backgroundRepeat: "repeat",
				}}
			/>

			{/* Clean Header Banner */}
			<div
				className="relative border-black border-b-2 transition-all duration-500"
				style={{
					background: `linear-gradient(135deg, ${teamColors.primary} 0%, ${teamColors.tertiary} 50%, ${teamColors.secondary} 100%)`,
				}}
			>
				<div className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:py-8">
					{/* Top Bar */}
					<div className="mb-6">
						<Link
							to={linkTo("/tournaments")}
							search={{ filter: "active" }}
							className="flex w-fit items-center gap-2 rounded-lg border-2 border-white/30 bg-white/10 px-3 py-1.5 font-bold text-sm text-white backdrop-blur-sm transition-all hover:bg-white/20"
						>
							<ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
							<span className="hidden sm:inline">Voltar</span>
						</Link>
					</div>

					{/* Team Info */}
					<div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
						{/* Team Logo */}
						<div className="relative shrink-0">
							<div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border-3 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] md:h-40 md:w-40">
								<TeamLogo
									teamName={team.name}
									logoUrl={team.logoUrl}
									className="h-full w-full object-contain"
								/>
							</div>
						</div>

						{/* Title & Meta */}
						<div className="flex-1 text-center md:text-left">
							{team.region && (
								<div className="mb-3">
									<span className="inline-flex items-center gap-1.5 rounded-md bg-white/20 px-2 py-1 font-bold text-white text-xs backdrop-blur-sm">
										{team.region}
									</span>
								</div>
							)}

							<h1 className="mb-2 font-black text-3xl text-white uppercase italic tracking-tighter md:text-5xl">
								{team.name}
							</h1>

							<div className="flex flex-wrap items-center justify-center gap-3 font-bold text-sm text-white/80 uppercase md:justify-start">
								<span className="rounded-md bg-white/10 px-2 py-1">
									{finishedMatches.length} Partidas
								</span>
								<span className="rounded-md bg-white/10 px-2 py-1">
									{tournaments.length} Torneios
								</span>
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
						label={t("stats.winRate")}
						value={`${winRate}%`}
						color="bg-brawl-yellow"
					/>
					<StatCard
						icon={<TrendingUp className="h-5 w-5 text-green-600" />}
						label={t("stats.wins")}
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
						label={t("stats.currentStreak")}
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
						<div className="mb-6 flex items-center gap-3">
							<div className="h-8 w-1 rounded-full bg-[#2e5cff]" />
							<h2 className="font-black text-2xl text-[#121212] uppercase italic">
								{t("sections.upcoming")}
							</h2>
							{upcomingMatches.some((m) => m.status === "live") && (
								<span className="rounded-lg border-2 border-black bg-[#ff2e2e] px-2 py-1 font-black text-white text-xs shadow-[2px_2px_0_0_#000]">
									{t("status.live")}
								</span>
							)}
						</div>

						<div className="space-y-4">
							{upcomingMatches.map((match) => {
								const isTeamA = match.teamAId === team.id;
								const opponent = isTeamA ? match.teamB : match.teamA;
								const isLive = match.status === "live";

								return (
									<div
										key={match.id}
										className={clsx(
											"overflow-hidden rounded-lg border-2 border-black bg-white shadow-[3px_3px_0_0_#000]",
											isLive && "ring-2 ring-[#ff2e2e]",
										)}
									>
										{/* Mobile Layout */}
										<div className="p-4 md:hidden">
											{/* Header */}
											<div className="mb-4 flex items-center justify-between">
												<div className="flex items-center gap-2">
													<span
														className={clsx(
															"rounded-md border-2 border-black px-2 py-1 font-black text-[10px] uppercase",
															isLive
																? "bg-[#ff2e2e] text-white"
																: "bg-[#ccff00] text-black",
														)}
													>
														{isLive ? t("status.live") : "VS"}
													</span>
													{match.tournament?.name && (
														<span className="max-w-[100px] truncate font-bold text-[10px] text-gray-700 uppercase">
															{match.tournament.name}
														</span>
													)}
												</div>
												<span className="font-bold text-[10px] text-gray-700 uppercase">
													{isLive
														? t("status.now")
														: new Date(match.startTime).toLocaleDateString(
																"pt-BR",
																{
																	day: "2-digit",
																	month: "short",
																	timeZone: "UTC",
																},
															)}
												</span>
											</div>

											{/* Teams */}
											<div className="mb-4 flex items-center justify-center gap-4">
												<div className="flex flex-1 flex-col items-center gap-2">
													<div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border-2 border-black bg-white p-2 shadow-[2px_2px_0_0_#000]">
														<TeamLogo
															teamName={team.name}
															logoUrl={team.logoUrl}
															className="h-full w-full object-contain"
														/>
													</div>
													<span className="text-center font-bold text-black text-xs uppercase">
														{team.name}
													</span>
												</div>

												<span className="rounded-md bg-black px-2 py-1 font-black text-white text-xs">
													VS
												</span>

												<div className="flex flex-1 flex-col items-center gap-2">
													{opponent?.id ? (
														<Link
															to={linkTo("/teams/$teamId")}
															params={{ teamId: opponent.slug }}
															className="flex flex-col items-center gap-2"
														>
															<div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border-2 border-black bg-white p-2 shadow-[2px_2px_0_0_#000]">
																<TeamLogo
																	teamName={opponent.name}
																	logoUrl={opponent.logoUrl}
																	className="h-full w-full object-contain"
																/>
															</div>
															<span className="text-center font-bold text-black text-xs uppercase hover:text-[#2e5cff]">
																{opponent.name}
															</span>
														</Link>
													) : (
														<>
															<div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border-2 border-black bg-white p-2 shadow-[2px_2px_0_0_#000]">
																<TeamLogo
																	teamName={opponent?.name || "TBD"}
																	logoUrl={opponent?.logoUrl}
																	className="h-full w-full object-contain"
																/>
															</div>
															<span className="text-center font-bold text-xs uppercase">
																{opponent?.name || "TBD"}
															</span>
														</>
													)}
												</div>
											</div>

											<Link
												to={linkTo("/")}
												className="block w-full rounded-lg border-2 border-black bg-[#ffc700] py-2.5 text-center font-bold text-black text-sm uppercase shadow-[2px_2px_0_0_#000]"
											>
												{isLive ? t("actions.follow") : t("actions.bet")}
											</Link>
										</div>

										{/* Desktop Layout */}
										<div className="hidden items-center gap-3 p-4 md:flex">
											{/* Status */}
											<div
												className={clsx(
													"flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-black font-black text-xs uppercase shadow-[2px_2px_0_0_#000]",
													isLive
														? "bg-[#ff2e2e] text-white"
														: "bg-[#ccff00] text-black",
												)}
											>
												{isLive ? "LIVE" : "VS"}
											</div>

											{/* Tournament */}
											<div className="shrink-0">
												{match.tournament?.slug ? (
													<Link
														to={linkTo("/tournaments/$slug")}
														params={{ slug: match.tournament.slug }}
														className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border-2 border-black bg-white p-1.5 shadow-[2px_2px_0_0_#000] transition-all hover:shadow-[3px_3px_0_0_#000]"
													>
														{match.tournament.logoUrl ? (
															<img
																src={match.tournament.logoUrl}
																alt={match.tournament.name}
																className="h-full w-full object-contain"
															/>
														) : (
															<Trophy className="h-6 w-6 text-gray-900" />
														)}
													</Link>
												) : (
													<div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border-2 border-black bg-white p-1.5 shadow-[2px_2px_0_0_#000]">
														<Trophy className="h-6 w-6 text-gray-900" />
													</div>
												)}
											</div>

											{/* VS Section */}
											<div className="flex min-w-0 flex-1 items-center gap-3">
												<div className="flex shrink-0 items-center gap-2">
													<div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border-2 border-black bg-white p-2 shadow-[2px_2px_0_0_#000]">
														<TeamLogo
															teamName={team.name}
															logoUrl={team.logoUrl}
															className="h-full w-full object-contain"
														/>
													</div>
													<span className="hidden font-bold text-black text-sm uppercase lg:block">
														{team.name}
													</span>
												</div>

												<span className="rounded-md bg-black px-2 py-1 font-black text-white text-xs">
													VS
												</span>

												<div className="flex min-w-0 flex-1 items-center gap-2">
													{opponent?.id ? (
														<Link
															to={linkTo("/teams/$teamId")}
															params={{ teamId: opponent.slug }}
															className="flex items-center gap-2"
														>
															<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-black bg-white p-2 shadow-[2px_2px_0_0_#000] transition-all hover:shadow-[3px_3px_0_0_#000]">
																<TeamLogo
																	teamName={opponent.name}
																	logoUrl={opponent.logoUrl}
																	className="h-full w-full object-contain"
																/>
															</div>
															<span className="truncate font-bold text-black text-sm uppercase hover:text-[#2e5cff] hover:underline">
																{opponent.name}
															</span>
														</Link>
													) : (
														<>
															<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-black bg-white p-2 shadow-[2px_2px_0_0_#000]">
																<TeamLogo
																	teamName={opponent?.name || "TBD"}
																	logoUrl={opponent?.logoUrl}
																	className="h-full w-full object-contain"
																/>
															</div>
															<span className="truncate font-bold text-black text-sm uppercase">
																{opponent?.name || "TBD"}
															</span>
														</>
													)}
												</div>
											</div>

											{/* Date */}
											<div className="hidden shrink-0 rounded-lg border-2 border-black bg-[#f0f0f0] px-3 py-2 text-center shadow-[2px_2px_0_0_#000] xl:block">
												<div className="font-bold text-[10px] text-gray-900 uppercase">
													{isLive
														? t("status.now")
														: new Date(match.startTime)
																.toLocaleDateString("pt-BR", {
																	month: "short",
																	timeZone: "UTC",
																})
																.toUpperCase()
																.replace(".", "")}
												</div>
												<div className="font-black text-[#121212] text-lg">
													{isLive
														? "●"
														: new Date(match.startTime).getUTCDate()}
												</div>
											</div>

											{/* Button */}
											<Link
												to={linkTo("/")}
												className="shrink-0 rounded-lg border-2 border-black bg-[#ffc700] px-4 py-2 font-bold text-black text-xs uppercase shadow-[2px_2px_0_0_#000] transition-all hover:shadow-[3px_3px_0_0_#000]"
											>
												{isLive ? t("actions.follow") : t("actions.bet")}
											</Link>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Recent Match History */}
				<div className="mb-12">
					<div className="mb-6 flex items-center gap-3">
						<div className="h-8 w-1 rounded-full bg-[#121212]" />
						<h2 className="font-black text-2xl text-[#121212] uppercase italic">
							{t("sections.recentHistory")}
						</h2>
					</div>

					{recentMatches.length > 0 ? (
						<div className="space-y-4">
							{recentMatches.map((match, index) => {
								const isTeamA = match.teamAId === team.id;
								const opponent = isTeamA ? match.teamB : match.teamA;
								const isWin = match.winnerId === team.id;
								const isWalkover = match.resultType === "wo";
								const teamScore = isTeamA ? match.scoreA : match.scoreB;
								const opponentScore = isTeamA ? match.scoreB : match.scoreA;
								const teamScoreDisplay = isWalkover
									? isWin
										? "W"
										: "FF"
									: teamScore;
								const opponentScoreDisplay = isWalkover
									? isWin
										? "FF"
										: "W"
									: opponentScore;

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
															{teamScoreDisplay}
														</span>
														<span className="font-black text-black">:</span>
														<span
															className={clsx(
																"font-black font-body text-xl",
																!isWin ? "text-brawl-red" : "text-black",
															)}
														>
															{opponentScoreDisplay}
														</span>
														{isWalkover && (
															<span className="ml-1 border-[2px] border-black bg-black px-1 py-0.5 font-black text-[9px] text-white uppercase">
																WO
															</span>
														)}
													</div>
												</div>

												{/* Date */}
												<div className="text-right">
													<div className="font-black text-[10px] text-gray-900 uppercase tracking-wider">
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
													<span className="flex-1 font-black text-black text-sm uppercase">
														{team.name}
													</span>
													<span className="font-black font-body text-black text-xl">
														{teamScoreDisplay}
													</span>
												</div>

												{/* Opponent */}
												{opponent?.id ? (
													<Link
														to={linkTo("/teams/$teamId")}
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
														<span className="flex-1 font-black text-black text-sm uppercase">
															{opponent.name}
														</span>
														<span className="font-black font-body text-black text-xl">
															{opponentScoreDisplay}
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
														<span className="flex-1 font-black text-black text-sm uppercase">
															{opponent?.name || "TBD"}
														</span>
														<span className="font-black font-body text-black text-xl">
															{opponentScoreDisplay}
														</span>
														{isWalkover && (
															<span className="ml-1 border-[2px] border-black bg-black px-1 py-0.5 font-black text-[9px] text-white uppercase">
																WO
															</span>
														)}
													</div>
												)}
											</div>

											{/* Tournament Badge */}
											<div className="flex items-center gap-2 text-xs">
												{match.tournament?.slug ? (
													<Link
														to={linkTo("/tournaments/$slug")}
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
																<Trophy className="h-4 w-4 text-gray-900" />
															)}
														</div>
														<span className="font-bold text-[#121212] uppercase">
															{match.tournament.name}
														</span>
													</Link>
												) : (
													<div className="flex items-center gap-2">
														<div className="flex h-6 w-6 items-center justify-center border-[2px] border-black bg-white p-0.5">
															<Trophy className="h-4 w-4 text-gray-900" />
														</div>
														<span className="font-bold text-[#121212] uppercase">
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
															to={linkTo("/tournaments/$slug")}
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
																<Trophy className="h-7 w-7 text-gray-900" />
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
																<Trophy className="h-7 w-7 text-gray-900" />
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
													<span className="hidden font-black text-black text-sm uppercase lg:inline-block">
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
																to={linkTo("/teams/$teamId")}
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
															to={linkTo("/teams/$teamId")}
															params={{ teamId: opponent.slug }}
															className="truncate font-black text-black text-sm uppercase transition-colors hover:text-brawl-red hover:underline"
														>
															{opponent.name}
														</Link>
													) : (
														<span className="truncate font-black text-black text-sm uppercase">
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
														{teamScoreDisplay}
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
														{opponentScoreDisplay}
													</span>
												</div>
											</div>

											{/* Date Badge - Straight */}
											<div className="hidden flex-shrink-0 xl:block">
												<div className="border-[3px] border-black bg-white px-3 py-2 text-center shadow-[2px_2px_0_0_#000]">
													<div className="font-black text-[10px] text-gray-900 uppercase tracking-widest">
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
						<div className="rounded-xl border-2 border-black/20 border-dashed bg-white py-16 text-center">
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f0f0f0]">
								<Trophy className="h-8 w-8 text-gray-700" strokeWidth={2} />
							</div>
							<h3 className="font-black text-[#121212] text-xl uppercase">
								{t("empty.noFinishedMatches")}
							</h3>
						</div>
					)}
				</div>

				{/* Tournaments Participated */}
				{tournaments.length > 0 && (
					<div>
						<div className="mb-6 flex items-center gap-3">
							<div className="h-8 w-1 rounded-full bg-[#121212]" />
							<h2 className="font-black text-2xl text-[#121212] uppercase italic">
								Torneios
							</h2>
						</div>

						<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
							{tournaments.map((tournament) => (
								<Link
									key={tournament.id}
									to={linkTo("/tournaments/$slug")}
									params={{ slug: tournament.slug }}
									className="group flex items-center gap-3 rounded-lg border-2 border-black bg-white p-3 shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[4px_4px_0_0_#000]"
								>
									<div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-black bg-white p-1">
										{tournament.logoUrl ? (
											<img
												src={tournament.logoUrl}
												alt={tournament.name}
												className="h-full w-full object-contain"
											/>
										) : (
											<Trophy
												className="h-8 w-8 text-gray-600"
												strokeWidth={2}
											/>
										)}
									</div>

									<div className="min-w-0 flex-1">
										<h3 className="truncate font-bold text-black text-sm uppercase transition-colors group-hover:text-[#2e5cff]">
											{tournament.name}
										</h3>
										<p className="font-bold text-[10px] text-gray-600 uppercase">
											{tournament.region || "Global"}
										</p>
									</div>

									<div
										className={clsx(
											"rounded-md px-2 py-1 font-black text-[10px] uppercase",
											tournament.status === "active"
												? "bg-green-100 text-green-700"
												: tournament.status === "upcoming"
													? "bg-blue-100 text-blue-700"
													: "bg-gray-100 text-gray-700",
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
				"flex flex-col items-center justify-center rounded-lg border-2 border-black p-3 text-center shadow-[3px_3px_0_0_#000]",
				color,
			)}
		>
			<div className="mb-1 text-black">{icon}</div>
			<div className="font-black text-2xl text-black">{value}</div>
			<div className="font-bold text-[10px] text-gray-600 uppercase tracking-wider">
				{label}
			</div>
		</div>
	);
}
