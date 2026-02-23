import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { TeamLogo } from "./TeamLogo";

export type Team = {
	id: number;
	name: string;
	slug?: string | null;
	logoUrl?: string | null;
	region?: string | null;
};

export type Match = {
	id: number;
	label?: string | null;
	name?: string | null;
	labelTeamA?: string | null;
	labelTeamB?: string | null;
	teamA?: Team | null;
	teamB?: Team | null;
	format: string;
	category: string;
	startTime: string | Date;
	status: "scheduled" | "live" | "finished";
	isBettingEnabled: boolean;
	scoreA?: number | null;
	scoreB?: number | null;
	winnerId?: number | null;
};

export type Bet = {
	id: number;
	matchId: number;
	predictedWinnerId: number | null;
	predictedScoreA: number;
	predictedScoreB: number;
	pointsEarned?: number | null;
	isUnderdogPick?: boolean | null;
	isPerfectPick?: boolean | null;
};

interface MatchCardProps {
	match: Match;
	initialBet?: Bet;
	showPredictionScore?: boolean;
}

export function MatchCard({
	match,
	initialBet,
	showPredictionScore = false,
}: MatchCardProps) {
	const isLive = match.status === "live";
	const isFinished = match.status === "finished";

	const teamA = match.teamA;
	const teamB = match.teamB;

	// Visual highlights for user predictions
	const userPredictedWinnerA =
		showPredictionScore &&
		teamA?.id &&
		initialBet?.predictedWinnerId === teamA.id;
	const userPredictedWinnerB =
		showPredictionScore &&
		teamB?.id &&
		initialBet?.predictedWinnerId === teamB.id;

	const formattedStartTime = new Date(match.startTime).toLocaleTimeString(
		"pt-BR",
		{
			hour: "2-digit",
			minute: "2-digit",
			timeZone: "America/Sao_Paulo",
		},
	);

	const formattedStartDate = new Date(match.startTime)
		.toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "short",
			timeZone: "America/Sao_Paulo",
		})
		.toUpperCase()
		.replace(".", "");

	// Score Logic
	const displayScoreA =
		showPredictionScore && initialBet
			? initialBet.predictedScoreA
			: (match.scoreA ?? 0);
	const displayScoreB =
		showPredictionScore && initialBet
			? initialBet.predictedScoreB
			: (match.scoreB ?? 0);

	// Calculate max length for dynamic sizing consistency
	const lenA = (teamA?.name || match.labelTeamA || "").length;
	const lenB = (teamB?.name || match.labelTeamB || "").length;
	const maxLen = Math.max(lenA, lenB);

	return (
		<div
			className={clsx(
				"group/card relative mx-auto mb-2 w-full max-w-4xl font-sans transition-opacity",
				"opacity-100",
			)}
		>
			{/* Match Label Badge (Opening, Winners, etc.) */}
			{(() => {
				// Prioritize 'name' if it exists and is meaningful, otherwise use cleaned 'label'
				const candidate = match.name || match.label || "";
				const cleanedLabel = candidate
					.replace(/Group\s+\w+\s*([-:|]\s*)?/i, "")
					.replace(/Match\s*\d*/i, "")
					.trim();

				if (!cleanedLabel && !initialBet) return null;

				return (
					<div className="absolute -top-2 left-4 z-20 flex items-center gap-2">
						{cleanedLabel && (
							<div className="-rotate-1 skew-x-[-12deg] transform border-2 border-white bg-black px-3 py-0.5 font-black text-[10px] text-white uppercase italic shadow-[2px_2px_0_0_#000] md:text-xs">
								<span className="block skew-x-[12deg]">{cleanedLabel}</span>
							</div>
						)}
						{initialBet && showPredictionScore && (
							<div className="fade-in zoom-in rotate-2 transform animate-in border-2 border-black bg-[#ccff00] px-2 py-0.5 font-black text-[8px] text-black uppercase shadow-[2px_2px_0_0_#000] duration-300 md:text-[10px]">
								PALPITE SALVO
							</div>
						)}
					</div>
				);
			})()}

			<div
				className={clsx(
					"relative overflow-visible border-2 border-black bg-white shadow-[4px_4px_0_0_#000] transition-all",
					isLive
						? "border-red-600 bg-red-50 ring-2 ring-red-600/20"
						: "hover:bg-zinc-50",
					// Add top padding if there's likely a label to avoid overlap
					match.name || match.label ? "pt-2" : "",
				)}
			>
				<div className="relative flex h-20 items-center gap-4 p-2 md:gap-8">
					{/* --- TEAM A --- */}
					<div
						className={clsx(
							"relative flex h-full flex-1 items-center justify-end gap-3 overflow-hidden rounded-lg py-1 pr-1 transition-all lg:pr-2",
							userPredictedWinnerA ? "bg-[#ccff00]/40" : "",
						)}
					>
						<div className="z-10 flex min-w-0 max-w-full shrink flex-col items-end leading-tight">
							{teamA?.slug ? (
								<Link
									to="/teams/$teamId"
									params={{ teamId: teamA.slug }}
									className={clsx(
										"block w-full break-normal text-right font-black uppercase tracking-tighter transition-colors hover:text-brawl-blue hover:underline",
										userPredictedWinnerA ? "text-black" : "text-zinc-800",
										// Dynamic sizing based on JOINT MAX length to keep text consistent
										maxLen > 16
											? "text-[9px] md:text-[10px] lg:text-[11px]" // Very Long
											: maxLen > 8
												? "text-[10px] md:text-xs lg:text-[13px]" // Long
												: "text-xs md:text-sm lg:text-base", // Normal
									)}
								>
									{teamA.name}
								</Link>
							) : (
								<span
									className={clsx(
										"block w-full break-normal text-right font-black uppercase tracking-tighter transition-colors",
										userPredictedWinnerA ? "text-black" : "text-zinc-800",
										// Dynamic sizing based on JOINT MAX length to keep text consistent
										maxLen > 16
											? "text-[9px] md:text-[10px] lg:text-[11px]" // Very Long
											: maxLen > 8
												? "text-[10px] md:text-xs lg:text-[13px]" // Long
												: "text-xs md:text-sm lg:text-base", // Normal
									)}
								>
									{match.labelTeamA || "TBD"}
								</span>
							)}
							{initialBet && !showPredictionScore && (
								<span className="mt-0.5 whitespace-nowrap font-black text-[10px] text-black/40 uppercase">
									Palpite: {initialBet.predictedScoreA}
								</span>
							)}
						</div>

						{/* Logo */}
						<TeamLogo
							teamName={teamA?.name || match.labelTeamA || "TBD"}
							logoUrl={teamA?.logoUrl}
							size="md"
							className={clsx(
								"transition-transform",
								userPredictedWinnerA ? "rotate-[-2deg] scale-105" : "",
							)}
						/>
					</div>

					{/* --- VS / PLACAR (Center) --- */}
					<div className="flex w-24 shrink-0 flex-col items-center justify-center md:w-36">
						<div className="flex items-center gap-2 md:gap-3">
							{(isLive || isFinished || showPredictionScore) && (
								<div className="flex h-10 w-8 items-center justify-center rounded-lg border-2 border-black border-zinc-200 bg-zinc-50 text-center font-black text-xl text-zinc-900 shadow-sm md:h-12 md:w-11 md:text-3xl">
									{displayScoreA}
								</div>
							)}

							<div className="relative flex h-full min-w-[60px] flex-col items-center justify-center md:min-w-[80px]">
								{isLive ? (
									<span className="mb-1 animate-pulse font-black text-[8px] text-red-600 uppercase tracking-tighter">
										LIVE
									</span>
								) : (
									<span
										className="mb-1 font-black text-[8px] text-zinc-400 uppercase leading-none tracking-tighter md:text-[9px]"
										suppressHydrationWarning
									>
										{formattedStartDate}
									</span>
								)}

								<div className="flex items-center justify-center rounded border border-zinc-200/50 bg-zinc-100/50 px-2 py-0.5">
									<span className="font-black text-[10px] text-zinc-500 italic leading-none md:text-xs">
										VS
									</span>
								</div>

								<span
									className="mt-1 font-black text-[8px] text-zinc-400 uppercase tabular-nums leading-none tracking-tighter md:text-[9px]"
									suppressHydrationWarning
								>
									{formattedStartTime}
								</span>
							</div>

							{(isLive || isFinished || showPredictionScore) && (
								<div className="flex h-10 w-8 items-center justify-center rounded-lg border-2 border-black border-zinc-200 bg-zinc-50 text-center font-black text-xl text-zinc-900 shadow-sm md:h-12 md:w-11 md:text-3xl">
									{displayScoreB}
								</div>
							)}
						</div>
					</div>

					{/* --- TEAM B --- */}
					<div
						className={clsx(
							"relative flex h-full flex-1 items-center justify-start gap-3 overflow-hidden rounded-lg py-1 pr-1 pl-1 transition-all lg:pr-2 lg:pl-2",
							userPredictedWinnerB ? "bg-[#ccff00]/40" : "",
						)}
					>
						{/* Logo */}
						<TeamLogo
							teamName={teamB?.name || match.labelTeamB || "TBD"}
							logoUrl={teamB?.logoUrl}
							size="md"
							className={clsx(
								"transition-transform",
								userPredictedWinnerB ? "rotate-[2deg] scale-105" : "",
							)}
						/>

						<div className="z-10 flex min-w-0 max-w-full shrink flex-col items-start leading-tight">
							{teamB?.slug ? (
								<Link
									to="/teams/$teamId"
									params={{ teamId: teamB.slug }}
									className={clsx(
										"block w-full break-normal text-left font-black uppercase tracking-tighter transition-colors hover:text-brawl-red hover:underline",
										userPredictedWinnerB ? "text-black" : "text-zinc-800",
										// Dynamic sizing based on JOINT MAX length to keep text consistent
										maxLen > 16
											? "text-[9px] md:text-[10px] lg:text-[11px]" // Very Long
											: maxLen > 8
												? "text-[10px] md:text-xs lg:text-[13px]" // Long
												: "text-xs md:text-sm lg:text-base", // Normal
									)}
								>
									{teamB.name}
								</Link>
							) : (
								<span
									className={clsx(
										"block w-full break-normal text-left font-black uppercase tracking-tighter transition-colors",
										userPredictedWinnerB ? "text-black" : "text-zinc-800",
										// Dynamic sizing based on JOINT MAX length to keep text consistent
										maxLen > 16
											? "text-[9px] md:text-[10px] lg:text-[11px]" // Very Long
											: maxLen > 8
												? "text-[10px] md:text-xs lg:text-[13px]" // Long
												: "text-xs md:text-sm lg:text-base", // Normal
									)}
								>
									{match.labelTeamB || "TBD"}
								</span>
							)}
							{initialBet && !showPredictionScore && (
								<span className="mt-0.5 whitespace-nowrap font-black text-[10px] text-black/40 uppercase">
									Palpite: {initialBet.predictedScoreB}
								</span>
							)}
						</div>
					</div>
				</div>

				{/* Bet Result Badge - Show points earned for finished matches */}
				{isFinished && initialBet && initialBet.pointsEarned != null && (
					<div
						className={clsx(
							"group/badge absolute -right-2 -bottom-2 z-20 flex cursor-help items-center gap-1.5 border-2 border-black px-2 py-1 font-black text-[8px] uppercase",
							(() => {
								const isCorrect =
									match.winnerId === initialBet.predictedWinnerId;
								if (!isCorrect) return "bg-red-500 text-white";
								if (initialBet.isUnderdogPick) {
									return "animate-pulse bg-gradient-to-r from-purple-600 to-pink-600 text-white";
								}
								return "bg-green-500 text-white";
							})(),
						)}
					>
						{/* Tooltip */}
						<div className="pointer-events-none absolute right-0 bottom-full z-[100] mb-2 hidden w-48 rounded border-2 border-white bg-black p-2 text-[10px] text-white shadow-lg group-hover/badge:block">
							<div className="space-y-1">
								{(() => {
									const isCorrect =
										match.winnerId === initialBet.predictedWinnerId;
									if (!isCorrect) {
										return (
											<>
												<div className="font-bold text-red-300">
													❌ Palpite Incorreto
												</div>
												<div className="text-[9px] text-gray-300">
													Você apostou em:{" "}
													{match.teamA?.id === initialBet.predictedWinnerId
														? match.teamA?.name
														: match.teamB?.name}
												</div>
												<div className="text-[9px] text-gray-300">
													Vencedor real:{" "}
													{match.teamA?.id === match.winnerId
														? match.teamA?.name
														: match.teamB?.name}
												</div>
												<div className="mt-1 border-gray-600 border-t pt-1 font-bold">
													Total: 0 pontos
												</div>
											</>
										);
									}

									return (
										<>
											<div className="font-bold text-green-300">
												✅ Breakdown:
											</div>
											{initialBet.isPerfectPick ? (
												<div className="text-[9px] text-gray-300">
													✓ Placar exato ({initialBet.predictedScoreA}-
													{initialBet.predictedScoreB})
												</div>
											) : (
												<div className="text-[9px] text-gray-300">
													✓ Vencedor correto
												</div>
											)}
											{initialBet.isUnderdogPick && (
												<div className="text-[9px] text-purple-300">
													🔥 Bônus azarão (+25%)
												</div>
											)}
											<div className="mt-1 border-gray-600 border-t pt-1 font-bold text-yellow-300">
												Total: +{initialBet.pointsEarned} pts
											</div>
										</>
									);
								})()}
							</div>
							<div className="absolute top-full right-4 h-0 w-0 border-transparent border-t-4 border-t-white border-r-4 border-l-4" />
						</div>

						{/* Badge Content */}
						{(() => {
							const isCorrect = match.winnerId === initialBet.predictedWinnerId;
							if (!isCorrect) return "✗";
							if (initialBet.isUnderdogPick) return <span>🔥</span>;
							return "✓";
						})()}
						<span className="whitespace-nowrap">
							{initialBet.pointsEarned > 0
								? `+${initialBet.pointsEarned}`
								: initialBet.pointsEarned}{" "}
							PTS
						</span>
						{initialBet.isUnderdogPick &&
							match.winnerId === initialBet.predictedWinnerId && (
								<span className="text-[7px]">🐕</span>
							)}
					</div>
				)}
			</div>
		</div>
	);
}
