import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { useLangLink } from "@/i18n/useLangLink";
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
	resultType?: "normal" | "wo";
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
	const { t, i18n } = useTranslation("betting");
	const locale = i18n.language === "pt" ? "pt-BR" : "en-US";
	const { routeTo, lang } = useLangLink();
	const isLive = match.status === "live";
	const isFinished = match.status === "finished";
	const isWalkover = match.resultType === "wo";

	const teamA = match.teamA;
	const teamB = match.teamB;
	const walkoverScoreA =
		teamA?.id && match.winnerId === teamA.id
			? t("walkover.win")
			: t("walkover.forfeit");
	const walkoverScoreB =
		teamB?.id && match.winnerId === teamB.id
			? t("walkover.win")
			: t("walkover.forfeit");

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
		.toLocaleDateString(locale, {
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

	// Remove dynamic sizing to keep text consistent across different cards
	// We'll use truncate to handle long names instead

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
								{t("betSaved")}
							</div>
						)}
						{isWalkover && isFinished && (
							<div className="fade-in zoom-in rotate-2 transform animate-in border-2 border-black bg-[#ff2e2e] px-2 py-0.5 font-black text-[8px] text-white uppercase shadow-[2px_2px_0_0_#000] duration-300 md:text-[10px]">
								{t("badges.wo")}
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
				<div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-2 md:flex md:h-20 md:items-center md:gap-8 md:p-2">
					{/* --- TEAM A --- */}
					<div
						className={clsx(
							"relative flex items-center justify-end gap-2 overflow-hidden rounded-lg py-1 pr-1 transition-all md:h-full md:gap-3 md:pr-1 lg:pr-2",
							userPredictedWinnerA ? "bg-[#ccff00]/40" : "",
						)}
					>
						<div className="z-10 flex min-w-0 flex-col items-end leading-tight">
							{teamA?.slug ? (
								<Link
									{...routeTo("/teams/$teamId")}
									params={{ teamId: teamA.slug, lang }}
									className={clsx(
										"block w-full truncate text-right font-black text-[10px] uppercase tracking-tighter transition-colors hover:text-brawl-blue hover:underline md:text-sm lg:text-base",
										userPredictedWinnerA ? "text-black" : "text-zinc-800",
									)}
								>
									{teamA.name}
								</Link>
							) : (
								<span
									className={clsx(
										"block w-full truncate text-right font-black text-[10px] uppercase tracking-tighter transition-colors md:text-sm lg:text-base",
										userPredictedWinnerA ? "text-black" : "text-zinc-800",
									)}
								>
									{match.labelTeamA || t("matchCard.tbd")}
								</span>
							)}
							{initialBet && !showPredictionScore && (
								<span className="mt-0.5 hidden whitespace-nowrap font-black text-[10px] text-black/40 uppercase md:block">
									{t("betPredictionPrefix")}: {initialBet.predictedScoreA}
								</span>
							)}
						</div>

						{/* Logo */}
						<TeamLogo
							teamName={teamA?.name || match.labelTeamA || t("matchCard.tbd")}
							logoUrl={teamA?.logoUrl}
							size="sm"
							className={clsx(
								"h-8 w-8 shrink-0 transition-transform md:h-10 md:w-10",
								userPredictedWinnerA ? "rotate-[-2deg] scale-105" : "",
							)}
						/>
					</div>

					{/* --- VS / PLACAR (Center) --- */}
					<div className="flex shrink-0 flex-col items-center justify-center px-1 md:w-36 md:px-0">
						<div className="flex items-center gap-1 md:gap-3">
							{(isLive || isFinished || showPredictionScore) && (
								<div className="flex h-8 w-7 items-center justify-center rounded-lg border-2 border-black border-zinc-200 bg-zinc-50 text-center font-black text-lg text-zinc-900 shadow-sm md:h-12 md:w-11 md:text-3xl">
									{isWalkover && isFinished ? walkoverScoreA : displayScoreA}
								</div>
							)}

							<div className="relative flex flex-col items-center justify-center md:min-w-[80px]">
								{isLive ? (
									<span className="mb-0.5 animate-pulse font-black text-[7px] text-red-600 uppercase tracking-tighter md:mb-1 md:text-[9px]">
										{t("badges.live")}
									</span>
								) : (
									<span
										className="mb-0.5 font-black text-[7px] text-zinc-400 uppercase leading-none tracking-tighter md:mb-1 md:text-[9px]"
										suppressHydrationWarning
									>
										{formattedStartDate}
									</span>
								)}

								<div className="flex items-center justify-center rounded border border-zinc-200/50 bg-zinc-100/50 px-1.5 py-0.5 md:px-2">
									<span className="font-black text-[9px] text-zinc-500 italic leading-none md:text-xs">
										{isWalkover && isFinished
											? t("walkover.forfeit")
											: t("matchCard.vs")}
									</span>
								</div>

								<span
									className="mt-0.5 font-black text-[7px] text-zinc-400 uppercase tabular-nums leading-none tracking-tighter md:mt-1 md:text-[9px]"
									suppressHydrationWarning
								>
									{formattedStartTime}
								</span>
							</div>

							{(isLive || isFinished || showPredictionScore) && (
								<div className="flex h-8 w-7 items-center justify-center rounded-lg border-2 border-black border-zinc-200 bg-zinc-50 text-center font-black text-lg text-zinc-900 shadow-sm md:h-12 md:w-11 md:text-3xl">
									{isWalkover && isFinished ? walkoverScoreB : displayScoreB}
								</div>
							)}
						</div>
					</div>

					{/* --- TEAM B --- */}
					<div
						className={clsx(
							"relative flex items-center justify-start gap-2 overflow-hidden rounded-lg py-1 pr-1 pl-1 transition-all md:h-full md:gap-3 md:pr-1 md:pl-1 lg:pr-2 lg:pl-2",
							userPredictedWinnerB ? "bg-[#ccff00]/40" : "",
						)}
					>
						{/* Logo */}
						<TeamLogo
							teamName={teamB?.name || match.labelTeamB || t("matchCard.tbd")}
							logoUrl={teamB?.logoUrl}
							size="sm"
							className={clsx(
								"h-8 w-8 shrink-0 transition-transform md:h-10 md:w-10",
								userPredictedWinnerB ? "rotate-[2deg] scale-105" : "",
							)}
						/>

						<div className="z-10 flex min-w-0 flex-col items-start leading-tight">
							{teamB?.slug ? (
								<Link
									{...routeTo("/teams/$teamId")}
									params={{ teamId: teamB.slug, lang }}
									className={clsx(
										"block w-full truncate text-left font-black text-[10px] uppercase tracking-tighter transition-colors hover:text-brawl-red hover:underline md:text-sm lg:text-base",
										userPredictedWinnerB ? "text-black" : "text-zinc-800",
									)}
								>
									{teamB.name}
								</Link>
							) : (
								<span
									className={clsx(
										"block w-full truncate text-left font-black text-[10px] uppercase tracking-tighter transition-colors md:text-sm lg:text-base",
										userPredictedWinnerB ? "text-black" : "text-zinc-800",
									)}
								>
									{match.labelTeamB || t("matchCard.tbd")}
								</span>
							)}
							{initialBet && !showPredictionScore && (
								<span className="mt-0.5 hidden whitespace-nowrap font-black text-[10px] text-black/40 uppercase md:block">
									{t("betPredictionPrefix")}: {initialBet.predictedScoreB}
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
													{t("prediction.incorrect")}
												</div>
												<div className="text-[9px] text-gray-300">
													{t("betLabel")}{" "}
													{match.teamA?.id === initialBet.predictedWinnerId
														? match.teamA?.name
														: match.teamB?.name}
												</div>
												<div className="text-[9px] text-gray-300">
													{t("actualWinner")}{" "}
													{match.teamA?.id === match.winnerId
														? match.teamA?.name
														: match.teamB?.name}
												</div>
												<div className="mt-1 border-gray-600 border-t pt-1 font-bold">
													{t("totalPoints", { count: 0 })}
												</div>
											</>
										);
									}

									return (
										<>
											<div className="font-bold text-green-300">
												{t("prediction.breakdown")}
											</div>
											{initialBet.isPerfectPick ? (
												<div className="text-[9px] text-gray-300">
													{t("perfectScore")} ({initialBet.predictedScoreA}-
													{initialBet.predictedScoreB})
												</div>
											) : (
												<div className="text-[9px] text-gray-300">
													{t("correctWinner")}
												</div>
											)}
											{initialBet.isUnderdogPick && (
												<div className="text-[9px] text-purple-300">
													{t("bonus.underdog", { percent: 25 })}
												</div>
											)}
											<div className="mt-1 border-gray-600 border-t pt-1 font-bold text-yellow-300">
												{t("totalPoints", { count: initialBet.pointsEarned })}
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
							{t("matchCard.pts")}
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
