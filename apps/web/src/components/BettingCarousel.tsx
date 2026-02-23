import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { Match, Prediction } from "./bracket/types";
import { TeamLogo } from "./TeamLogo";

// --- SVG COMPONENTS ---
// --- SVG COMPONENTS ---
// Using DisplacementMap to create a procedurally jagged "ink bleed" effect
const PaintSplatterBlue = ({ className }: { className?: string }) => (
	<svg
		viewBox="0 0 400 400"
		xmlns="http://www.w3.org/2000/svg"
		className={clsx(className, "pointer-events-none mix-blend-multiply")}
		style={{ overflow: "visible" }}
	>
		<defs>
			<filter id="bleed-blue" x="-50%" y="-50%" width="200%" height="200%">
				<feTurbulence
					type="fractalNoise"
					baseFrequency="0.04"
					numOctaves="4"
					seed="5"
					result="noise"
				/>
				<feDisplacementMap
					in="SourceGraphic"
					in2="noise"
					scale="40"
					xChannelSelector="R"
					yChannelSelector="G"
				/>
			</filter>
		</defs>
		<circle
			cx="200"
			cy="200"
			r="140"
			fill="#2E5CFF"
			filter="url(#bleed-blue)"
			opacity="0.9"
		/>
	</svg>
);

const PaintSplatterRed = ({ className }: { className?: string }) => (
	<svg
		viewBox="0 0 400 400"
		xmlns="http://www.w3.org/2000/svg"
		className={clsx(className, "pointer-events-none mix-blend-multiply")}
		style={{ overflow: "visible" }}
	>
		<defs>
			<filter id="bleed-red" x="-50%" y="-50%" width="200%" height="200%">
				<feTurbulence
					type="fractalNoise"
					baseFrequency="0.04"
					numOctaves="4"
					seed="10"
					result="noise"
				/>
				<feDisplacementMap
					in="SourceGraphic"
					in2="noise"
					scale="40"
					xChannelSelector="R"
					yChannelSelector="G"
				/>
			</filter>
		</defs>
		<circle
			cx="200"
			cy="200"
			r="140"
			fill="#FF2E2E"
			filter="url(#bleed-red)"
			opacity="0.9"
		/>
	</svg>
);

export function BettingCarousel({
	matches,
	predictions,
	onUpdatePrediction,
	onShowReview,
	hasUserBets,
	isReadOnly = false,
	editableMatchIds,
	matchDayStatus,
}: {
	matches: Match[];
	predictions: Record<number, Prediction>;
	onUpdatePrediction: (
		matchId: number,
		winnerId: number,
		score?: string,
	) => void;
	onShowReview?: () => void;
	hasUserBets?: boolean;
	isReadOnly?: boolean;
	editableMatchIds?: Set<number>;
	matchDayStatus?: string | null;
}) {
	const [currentIndex, setCurrentIndex] = useState(0);

	// Safety: If the match list shrinks (e.g. a game starts and leaves the carousel),
	// ensure currentIndex is still valid
	useEffect(() => {
		if (currentIndex >= matches.length && matches.length > 0) {
			setCurrentIndex(matches.length - 1);
		}
	}, [matches.length, currentIndex]);

	// 1. Calculate Projected Matches based on current predictions
	const projectedMatches = useMemo<Match[]>(() => {
		// Clone matches to avoid mutating props
		const projected = matches.map((m) => ({
			...m,
			teamA: m.teamA ? { ...m.teamA } : null,
			teamB: m.teamB ? { ...m.teamB } : null,
		}));

		// Iterate through all matches to propagate results
		projected.forEach((match) => {
			const prediction = predictions[match.id];
			if (!prediction) return;

			const winnerId = prediction.winnerId;
			const winnerTeam =
				match.teamA && winnerId === match.teamA.id ? match.teamA : match.teamB;
			const loserTeam =
				match.teamA && winnerId === match.teamA.id ? match.teamB : match.teamA;

			if (!winnerTeam || !loserTeam) return;

			// Move Winner
			if (match.nextMatchWinnerId) {
				const nextMatch = projected.find(
					(m) => m.id === match.nextMatchWinnerId,
				);
				if (nextMatch) {
					if (match.nextMatchWinnerSlot?.toUpperCase() === "A") {
						nextMatch.teamA = { ...winnerTeam, color: "blue" };
					} else if (match.nextMatchWinnerSlot?.toUpperCase() === "B") {
						nextMatch.teamB = { ...winnerTeam, color: "red" };
					}
				}
			}

			// Move Loser
			if (match.nextMatchLoserId) {
				const nextMatch = projected.find(
					(m) => m.id === match.nextMatchLoserId,
				);
				if (nextMatch) {
					if (match.nextMatchLoserSlot?.toUpperCase() === "A") {
						nextMatch.teamA = { ...loserTeam, color: "blue" };
					} else if (match.nextMatchLoserSlot?.toUpperCase() === "B") {
						nextMatch.teamB = { ...loserTeam, color: "red" };
					}
				}
			}
		});

		return projected;
	}, [matches, predictions]);

	const currentMatch = projectedMatches[currentIndex];
	const currentPrediction = currentMatch ? predictions[currentMatch.id] : null;
	const isLastMatch = currentIndex === projectedMatches.length - 1;

	// Check if all matches have predictions with BOTH winner AND score
	const allBetsComplete = useMemo(() => {
		// Only require predictions for matches that are actually in the carousel (which should be scheduled only)
		if (matches.length === 0) return true;
		return matches.every(
			(match) =>
				predictions[match.id] &&
				predictions[match.id].winnerId &&
				predictions[match.id].score &&
				predictions[match.id].score.trim() !== "",
		);
	}, [matches, predictions]);

	const handleNext = () => {
		// Check if we're at the last match and all bets are complete
		if (isLastMatch && allBetsComplete) {
			if (onShowReview) {
				onShowReview();
			}
			return;
		}

		// If last match but not all bets complete, find first match without complete prediction
		if (isLastMatch && !allBetsComplete) {
			const firstMissingIndex = matches.findIndex(
				(m) =>
					!predictions[m.id] ||
					!predictions[m.id].winnerId ||
					!predictions[m.id].score ||
					predictions[m.id].score.trim() === "",
			);
			if (firstMissingIndex !== -1) {
				setCurrentIndex(firstMissingIndex);
				return;
			}
		}

		// Only advance to next match if not at the end
		if (currentIndex < matches.length - 1) {
			setCurrentIndex((prev) => prev + 1);
		}
	};

	// Determine button text
	const getButtonText = () => {
		if (isLastMatch && allBetsComplete) {
			return "Revisar Todas as Apostas";
		}
		if (isLastMatch && !allBetsComplete) {
			const missingCount = matches.filter(
				(m) =>
					!predictions[m.id] ||
					!predictions[m.id].winnerId ||
					!predictions[m.id].score ||
					predictions[m.id].score.trim() === "",
			).length;
			return `Faltam ${missingCount} Placar${missingCount > 1 ? "es" : ""}`;
		}
		return "Próximo Jogo";
	};

	const selectedWinnerId = currentPrediction?.winnerId || null;
	const selectedScore = currentPrediction?.score || null;

	// Determine if the current match is editable
	const isEffectiveReadOnly = useMemo(() => {
		if (isReadOnly) return true;
		if (!currentMatch) return true;
		// If matchday is locked, we only allow editing if match is explicitly in editableMatchIds
		if (matchDayStatus === "locked") {
			return !editableMatchIds?.has(currentMatch.id);
		}
		return false;
	}, [isReadOnly, currentMatch, matchDayStatus, editableMatchIds]);

	const setSelectedWinnerId = (winnerId: number) => {
		if (!currentMatch || isEffectiveReadOnly) return;
		onUpdatePrediction(currentMatch.id, winnerId);
	};

	const setSelectedScore = (score: string) => {
		if (!currentMatch?.id || isEffectiveReadOnly) return;
		onUpdatePrediction(currentMatch.id, selectedWinnerId || 0, score);
	};

	// Determine available scores based on format (BO3=2wins, BO5=3wins)
	const scoreOptions = useMemo(() => {
		if (!currentMatch) return [];
		const winsNeeded =
			currentMatch.format === "bo5" ? 3 : currentMatch.format === "bo3" ? 2 : 3;
		const options = [];
		const isWinnerA =
			currentMatch.teamA && selectedWinnerId === currentMatch.teamA.id;

		for (let loserWins = 0; loserWins < winsNeeded; loserWins++) {
			const label = isWinnerA
				? `${winsNeeded} - ${loserWins}`
				: `${loserWins} - ${winsNeeded}`;
			options.push({
				label,
				description:
					loserWins === 0
						? "Dominant"
						: loserWins === winsNeeded - 1
							? "Close Match"
							: "Strong Win",
			});
		}
		return options;
	}, [currentMatch?.format, currentMatch?.teamA?.id, selectedWinnerId]);

	// Helper to check if a team is selected
	const isSelected = (teamId: number) => selectedWinnerId === teamId;
	const isOtherTeamSelected = (teamId: number) =>
		selectedWinnerId !== null && selectedWinnerId !== teamId;

	const activeAccentColor =
		currentMatch &&
		currentMatch.teamA &&
		selectedWinnerId === currentMatch.teamA.id
			? "brawl-blue"
			: "brawl-red";

	if (!currentMatch)
		return (
			<div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-paper bg-paper-texture p-6">
				{/* Decorative Background Elements */}
				<div className="pointer-events-none absolute top-1/4 left-1/4 z-0 h-96 w-96 -rotate-12 transform opacity-50">
					<PaintSplatterBlue className="h-full w-full" />
				</div>
				<div className="pointer-events-none absolute right-1/4 bottom-1/4 z-0 h-96 w-96 rotate-45 transform opacity-50">
					<PaintSplatterRed className="h-full w-full" />
				</div>

				<div className="relative z-10 w-full max-w-md">
					<div className="flex rotate-1 transform flex-col items-center border-[4px] border-black bg-white p-8 text-center shadow-comic">
						{/* Icon/Decoration */}
						<div className="group relative mb-6 flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-black bg-gray-100 shadow-sm">
							<span className="material-symbols-outlined text-4xl text-gray-400 transition-colors group-hover:text-brawl-red">
								calendar_clock
							</span>
							<div className="absolute -top-1 -right-1 h-6 w-6 animate-pulse rounded-full border-[2px] border-black bg-brawl-red" />
						</div>

						<h2 className="mb-3 -skew-x-2 transform font-black font-display text-3xl text-black text-shadow-sm uppercase italic">
							Nenhum Jogo <span className="text-brawl-red">Agora</span>
						</h2>

						<p className="mb-8 font-body font-bold text-gray-600 text-sm uppercase leading-relaxed tracking-wide">
							Os jogos de hoje já começaram ou ainda não foram agendados. Volte
							mais tarde para apostar!
						</p>

						{(Object.keys(predictions).length > 0 || hasUserBets) &&
						onShowReview ? (
							<button
								onClick={onShowReview}
								className="group flex w-full items-center justify-center gap-2 border-[3px] border-black bg-brawl-red py-4 font-black text-white uppercase italic shadow-comic transition-all hover:bg-[#d41d1d] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
							>
								<span className="material-symbols-outlined transition-transform group-hover:rotate-12">
									rate_review
								</span>
								Revisar Apostas
							</button>
						) : (
							<div className="flex w-full cursor-default items-center justify-center gap-2 border-[2px] border-gray-300 bg-gray-100 py-3 font-bold text-gray-400 text-xs uppercase tracking-widest">
								<span className="material-symbols-outlined text-sm">
									hourglass_empty
								</span>
								Aguardando Partidas
							</div>
						)}
					</div>

					{/* Tape Decoration */}
					<div className="absolute -top-3 left-1/2 z-20 h-8 w-32 -translate-x-1/2 -rotate-1 transform border border-gray-300 bg-[#e6e6e6]/90 shadow-sm backdrop-blur-sm" />
				</div>
			</div>
		);

	return (
		<>
			<div className="pencil-texture relative flex w-full flex-col items-center overflow-x-hidden bg-paper bg-paper-texture pt-24 pb-24 font-body text-ink md:pb-12">
				{/* Header / Navbar */}

				{/* Decorations */}
				<div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
					<div className="absolute top-48 left-8 -rotate-6 transform opacity-90 mix-blend-multiply">
						<img
							alt="skull sketch"
							className="h-40 w-40 opacity-90 contrast-125 grayscale"
							src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcyPuj6Sq4tDwxCCuui5iMyMZPU7euASmUS2kkIJ5s-P98YXwo-_VV0HN13d3UBaGL3x0o7QiRhF6qX7IyZ3-O84FCK8xgm9KwHL0y7P0TrgvU2XFkDFr-8LpB7LkEcz02C1CHG60aQSW4eyjYCM9nhVRkMwPrHk3thVE_-99YJ4bJSZfON4BqUFp7speoaYX0rfN93B7B5ifBVwkNFb1wPqLWft2x4hptTJRG9H5Ev2YEtWdt2LU50e8kBRjQL_qd9XMechENCl4"
							style={{ filter: "drop-shadow(2px 2px 0px rgba(0,0,0,0.1))" }}
						/>
					</div>
					<div className="absolute top-80 left-12 z-[-1] -rotate-6 transform font-marker text-5xl text-gray-300 opacity-50">
						<span className="block">SKINS</span>
						<span className="ml-4 block">FOR COLT</span>
						<span className="ml-8 block">AGAIN?</span>
					</div>
					<div className="absolute top-[600px] right-[-50px] rotate-12 transform opacity-30">
						<svg
							className="h-80 w-80 text-gray-400"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							viewBox="0 0 100 100"
						>
							<path
								d="M20,20 L80,80 M80,20 L20,80"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
							<circle cx="50" cy="50" r="15" strokeDasharray="5,5" />
						</svg>
					</div>
					<div className="absolute top-32 right-8 hidden w-40 rotate-2 transform border border-gray-300 bg-white p-2 shadow-md lg:block">
						<div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-200 grayscale">
							<img
								className="h-full w-full object-cover opacity-80 mix-blend-multiply contrast-125"
								src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHEN5FVE_cZy4m4XY2vxXiBMfh1TiHctWZCQM6Xf4Ws-KmxPh7B3MzMfM9Q-0Lb4fEYVMtTznnjtj0LScOI67ofv7QxWvZs358sHwGka-4pCNrF_02xx8IeL0_Ye_NmorEZ14mz-eMWLfqsoUYTPLkzAUz1CLXmbyyTPzmCMBxvO7Ce0BB4vdrJdOzotkHCZ-Jc48R27lQry8YFBHJWuHPeZPLfVBKCWckqb207-_ni847tH0tGcQrqPsCPKr_i7KA5lvTxZ42kGE"
								alt="Decoration"
							/>
						</div>
						<div className="absolute -top-3 left-1/2 h-4 w-8 -translate-x-1/2 rotate-1 bg-black/20 backdrop-blur-sm" />
					</div>
				</div>

				<main className="relative z-10 mx-auto flex w-full max-w-[500px] flex-col items-center px-4">
					{/* Match Title Header */}
					<header className="mb-8 flex w-full flex-col items-center space-y-2 text-center">
						<h1
							className="relative z-10 px-4 py-1 font-black font-display text-3xl text-black uppercase tracking-tight md:text-4xl"
							style={{ textShadow: "2px 2px 0px rgba(0,0,0,0.1)" }}
						>
							Predict The Winner
						</h1>
						{/* Double Post-it Header */}
						<div className="relative z-30 flex flex-col items-center gap-0">
							{/* Logo Post-it (Top) */}
							{currentMatch.tournamentLogoUrl && (
								<div className="relative z-10 flex h-32 w-32 -rotate-2 transform items-center justify-center border border-gray-200 bg-white p-3 shadow-sm md:h-46 md:w-46">
									<div className="absolute -top-3 left-1/2 h-4 w-12 -translate-x-1/2 transform bg-[#e8e8e0] opacity-80 shadow-sm md:h-5 md:w-16" />
									<img
										src={currentMatch.tournamentLogoUrl}
										alt=""
										className="h-full w-full object-contain drop-shadow-sm filter"
									/>
								</div>
							)}

							{/* Name Post-it (Bottom) - Overlapping the logo (z-20) */}
							<div
								className={clsx(
									"relative z-20 max-w-[280px] rotate-1 skew-x-[-2deg] transform border border-gray-200 bg-white px-6 py-2 text-center shadow-sm md:max-w-sm md:px-8 md:py-3",
									currentMatch.tournamentLogoUrl ? "-mt-2" : "mt-0",
								)}
							>
								<div className="absolute -top-2 left-1/2 h-3 w-12 -translate-x-1/2 transform bg-[#e8e8e0] opacity-80 shadow-sm md:h-4 md:w-16" />
								<p className="skew-x-[2deg] transform font-black font-display text-[10px] text-black uppercase tracking-widest md:text-sm">
									{currentMatch.tournamentName || "Brawl Stars Championship"}
								</p>
							</div>
						</div>

						<div
							className={clsx(
								"mt-6 inline-flex -skew-x-12 transform items-center gap-1.5 rounded-full px-3 py-1 font-black text-[10px] text-white tracking-[0.2em] shadow-sm",
								isEffectiveReadOnly ? "bg-gray-500" : "bg-black",
							)}
						>
							{isEffectiveReadOnly ? (
								<>
									<span className="material-symbols-outlined text-[10px]">
										lock
									</span>
									{matchDayStatus === "locked" && !isReadOnly
										? "BET SUBMITTED"
										: "BETS LOCKED"}
								</>
							) : (
								<>
									<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brawl-yellow" />
									LIVE BRACKET
								</>
							)}
						</div>
						<div className="mt-4 flex items-center justify-center gap-2 font-body font-bold text-[10px] text-gray-800 uppercase tracking-widest">
							<span>{currentMatch.label}</span>
							<span className="h-1 w-1 rounded-full bg-gray-300" />
							<span
								className="flex items-center gap-1 text-gray-400"
								suppressHydrationWarning
							>
								<span className="material-symbols-outlined text-xs">
									schedule
								</span>
								{new Date(currentMatch.startTime).toLocaleTimeString("pt-BR", {
									hour: "2-digit",
									minute: "2-digit",
									timeZone: "America/Sao_Paulo",
								})}
							</span>
						</div>
					</header>

					{/* Carousel Content Area with Transition */}
					<div className="relative w-full">
						<AnimatePresence mode="wait">
							<motion.div
								key={currentMatch.id}
								initial={{ x: 50, opacity: 0 }}
								animate={{ x: 0, opacity: 1 }}
								exit={{ x: -50, opacity: 0 }}
								transition={{ type: "spring", stiffness: 300, damping: 30 }}
								className="w-full"
							>
								<div className="relative w-full overflow-visible border-0 bg-paper shadow-none">
									<div className="pointer-events-none absolute top-[-100px] -left-[140px] z-0 h-[300px] w-[300px] -rotate-12 transform opacity-90 md:h-[500px] md:w-[500px]">
										<PaintSplatterBlue className="h-full w-full" />
									</div>
									<div className="pointer-events-none absolute top-[-100px] -right-[140px] z-0 h-[300px] w-[300px] rotate-12 transform opacity-90 md:h-[500px] md:w-[500px]">
										<PaintSplatterRed className="h-full w-full" />
									</div>

									<div className="relative z-10 bg-transparent shadow-comic">
										{/* Match Header Label */}
										<div className="relative z-20 border border-black bg-ink py-2 text-center text-white">
											<span className="font-body font-bold text-[10px] uppercase tracking-widest">
												Match {currentIndex + 1} of {matches.length}
											</span>
										</div>

										{/* TEAMS DISPLAY */}
										<div className="relative grid h-36 grid-cols-2 border-black border-x bg-white md:h-48">
											<div className="pointer-events-none absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 transform">
												<div className="flex h-6 w-6 items-center justify-center rounded-full border-[2px] border-black bg-white shadow-comic md:h-8 md:w-8">
													<span className="pt-0.5 font-black font-display text-xs md:text-sm">
														VS
													</span>
												</div>
											</div>

											{/* Team A (Blue) */}
											<div
												role="button"
												onClick={() =>
													currentMatch.teamA &&
													setSelectedWinnerId(currentMatch.teamA.id)
												}
												className={clsx(
													"group relative flex h-full cursor-pointer flex-col items-center overflow-hidden border-black border-r p-0 transition-all duration-200",
													currentMatch.teamA &&
														currentMatch.teamA &&
														isSelected(currentMatch.teamA.id)
														? "bg-brawl-blue"
														: currentMatch.teamA &&
																isOtherTeamSelected(currentMatch.teamA.id)
															? "bg-gray-200 grayscale"
															: isEffectiveReadOnly
																? "cursor-not-allowed bg-brawl-blue/60 grayscale-[0.5]"
																: "bg-brawl-blue hover:brightness-110",
												)}
											>
												{!isReadOnly &&
													currentMatch.teamA &&
													isSelected(currentMatch.teamA.id) && (
														<div className="pointer-events-none absolute inset-0 z-20 animate-pulse border-[#ccff00] border-[4px]" />
													)}

												<div className="relative z-10 flex h-full w-full flex-col">
													<div className="w-full px-2 pt-3 pb-1 text-left">
														<span
															className={clsx(
																"block truncate font-body font-bold text-[9px] text-shadow-sm uppercase tracking-wider md:text-[10px]",
																isSelected(currentMatch.teamA?.id || 0) ||
																	!selectedWinnerId
																	? "text-white"
																	: "text-gray-600",
															)}
														>
															{currentMatch.teamA?.name || "TBD"}
														</span>
													</div>
													<div className="flex flex-grow items-center justify-center p-2">
														<TeamLogo
															teamName={currentMatch.teamA?.name || "TBD"}
															logoUrl={currentMatch.teamA?.logoUrl}
															size="lg"
															className="!w-16 !h-16 md:!w-28 md:!h-28 drop-shadow-md"
														/>
													</div>
													<div className="w-full border-white/20 border-t bg-black/10 py-1 text-center">
														<span className="font-body font-bold text-[8px] text-white uppercase tracking-wider md:text-[9px]">
															Win Rate: {currentMatch.stats.winRateA}
														</span>
													</div>
												</div>
											</div>

											{/* Team B (Red) */}
											<div
												role="button"
												onClick={() =>
													currentMatch.teamB &&
													setSelectedWinnerId(currentMatch.teamB.id)
												}
												className={clsx(
													"group relative flex h-full cursor-pointer flex-col items-center overflow-hidden bg-brawl-red p-0 transition-all duration-200",
													currentMatch.teamB &&
														currentMatch.teamB &&
														isSelected(currentMatch.teamB.id)
														? "bg-brawl-red"
														: currentMatch.teamB &&
																isOtherTeamSelected(currentMatch.teamB.id)
															? "bg-gray-200 grayscale"
															: isEffectiveReadOnly
																? "cursor-not-allowed bg-brawl-red/60 grayscale-[0.5]"
																: "bg-brawl-red hover:brightness-110",
												)}
											>
												{!isReadOnly &&
													currentMatch.teamB &&
													isSelected(currentMatch.teamB.id) && (
														<div className="pointer-events-none absolute inset-0 z-20 animate-pulse border-[#ccff00] border-[4px]" />
													)}
												<div className="relative z-10 flex h-full w-full flex-col">
													<div className="w-full px-2 pt-3 pb-1 text-right">
														<span
															className={clsx(
																"block truncate font-body font-bold text-[9px] text-shadow-sm uppercase tracking-wider md:text-[10px]",
																isSelected(currentMatch.teamB?.id || 0) ||
																	!selectedWinnerId
																	? "text-white"
																	: "text-gray-600",
															)}
														>
															{currentMatch.teamB?.name || "TBD"}
														</span>
													</div>
													<div className="flex flex-grow items-center justify-center p-2">
														<TeamLogo
															teamName={currentMatch.teamB?.name || "TBD"}
															logoUrl={currentMatch.teamB?.logoUrl}
															size="lg"
															className="!w-16 !h-16 md:!w-28 md:!h-28 drop-shadow-md"
														/>
													</div>
													<div className="w-full border-white/20 border-t bg-black/10 py-1 text-center">
														<span className="font-body font-bold text-[8px] text-white uppercase tracking-wider md:text-[9px]">
															Win Rate: {currentMatch.stats.winRateB}
														</span>
													</div>
												</div>
											</div>
										</div>

										{/* STATS TABLE */}
										<div className="border-black border-black border-x border-b bg-gray-100 font-body">
											<div className="border-black border-y bg-gray-200 py-1 text-center">
												<span className="font-bold text-[9px] text-gray-900 uppercase tracking-[0.1em]">
													2025 Stats
												</span>
											</div>
											{/* Compact stats rows */}
											<div className="flex flex-col font-bold text-[10px] text-gray-900 md:text-xs">
												<StatsRow
													left={currentMatch.stats.regionA}
													label="Region"
													right={currentMatch.stats.regionB}
												/>
												<StatsRow
													left={currentMatch.stats.pointsA.toString()}
													label="Points"
													right={currentMatch.stats.pointsB.toString()}
												/>
												<StatsRow
													left={currentMatch.stats.winRateA}
													label="Win Rate"
													right={currentMatch.stats.winRateB}
												/>
											</div>
										</div>

										{/* Buttons - Team Pages */}
										<div className="grid grid-cols-2 gap-3 border-black border-x border-b bg-ink p-3">
											{currentMatch.teamA?.slug ? (
												<Link
													to="/teams/$teamId"
													params={{ teamId: currentMatch.teamA?.slug || "" }}
													className="group flex items-center justify-center gap-2 rounded-sm border border-gray-600 bg-ink px-3 py-2 text-white shadow-none transition-all hover:border-white hover:bg-gray-800"
												>
													<span className="material-symbols-outlined text-sm">
														visibility
													</span>
													<span className="font-bold font-display text-xs tracking-wider">
														{currentMatch.teamA?.name || "TBD"}
													</span>
												</Link>
											) : (
												<div className="flex cursor-not-allowed items-center justify-center gap-2 rounded-sm border border-gray-600 bg-gray-700 px-3 py-2 text-gray-400 shadow-none">
													<span className="material-symbols-outlined text-sm">
														visibility_off
													</span>
													<span className="font-bold font-display text-xs tracking-wider">
														TBD
													</span>
												</div>
											)}
											{currentMatch.teamB?.slug ? (
												<Link
													to="/teams/$teamId"
													params={{ teamId: currentMatch.teamB?.slug || "" }}
													className="group flex items-center justify-center gap-2 rounded-sm border border-gray-600 bg-ink px-3 py-2 text-white shadow-none transition-all hover:border-white hover:bg-gray-800"
												>
													<span className="material-symbols-outlined text-sm">
														shield
													</span>
													<span className="font-bold font-display text-xs tracking-wider">
														{currentMatch.teamB?.name || "TBD"}
													</span>
												</Link>
											) : (
												<div className="flex cursor-not-allowed items-center justify-center gap-2 rounded-sm border border-gray-600 bg-gray-700 px-3 py-2 text-gray-400 shadow-none">
													<span className="material-symbols-outlined text-sm">
														visibility_off
													</span>
													<span className="font-bold font-display text-xs tracking-wider">
														TBD
													</span>
												</div>
											)}
										</div>
									</div>
								</div>

								{/* PREDICTION OPTIONS */}
								<div className="mt-8 w-full md:mt-10">
									<div className="grid grid-cols-2 gap-3 px-0 md:grid-cols-3 md:gap-4">
										{scoreOptions.map((option) => {
											const isOptionSelected = selectedScore === option.label;
											// Only allow selecting score if a winner is selected
											const isDisabled = !selectedWinnerId || isReadOnly;

											return (
												<button
													key={option.label}
													onClick={() =>
														!isDisabled && setSelectedScore(option.label)
													}
													disabled={isDisabled}
													className={clsx(
														"group btn-press relative flex h-20 flex-col items-center justify-center rounded-sm border-[3px] p-3 shadow-comic transition-all duration-100 md:h-24 md:p-4",
														isDisabled || isEffectiveReadOnly
															? "cursor-not-allowed border-gray-300 bg-gray-100 opacity-50"
															: isOptionSelected
																? activeAccentColor === "brawl-blue"
																	? "z-10 border-brawl-blue bg-white ring-2 ring-brawl-blue/20 ring-offset-2 hover:shadow-comic-hover"
																	: "z-10 border-brawl-red bg-white ring-2 ring-brawl-red/20 ring-offset-2 hover:shadow-comic-hover"
																: "border-black bg-white hover:shadow-comic-hover",
													)}
												>
													{/* Selected Indicator Badge */}
													{isOptionSelected && (
														<div
															className={clsx(
																"absolute -top-3 left-1/2 z-20 -translate-x-1/2 transform border border-black px-2 py-0.5 font-body font-bold text-[9px] text-white uppercase shadow-sm",
																activeAccentColor === "brawl-blue"
																	? "bg-brawl-blue"
																	: "bg-brawl-red",
															)}
														>
															Selected
														</div>
													)}

													<div
														className={clsx(
															"flex items-center gap-2 font-black font-display text-2xl md:text-4xl",
															isOptionSelected
																? activeAccentColor === "brawl-blue"
																	? "text-brawl-blue"
																	: "text-brawl-red"
																: "text-gray-400 transition-colors group-hover:text-black",
														)}
													>
														{option.label}
													</div>

													<span
														className={clsx(
															"mt-1 px-1 font-body font-bold text-[8px] uppercase tracking-wider md:text-[9px]",
															isOptionSelected
																? "-rotate-1 transform rounded-sm border border-black bg-brawl-yellow text-black shadow-sm"
																: "font-bold text-gray-500",
														)}
													>
														{option.description}
													</span>
												</button>
											);
										})}
									</div>
								</div>
							</motion.div>
						</AnimatePresence>
					</div>

					{/* Lock In Button */}
					<div className="group relative mx-auto mt-8 w-full max-w-xs">
						<button
							onClick={handleNext}
							disabled={!selectedWinnerId || !selectedScore}
							className={clsx(
								"relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-sm border-[3px] border-black py-3 font-black font-display text-lg text-white uppercase shadow-comic transition-all active:translate-y-1 active:shadow-none",
								!selectedWinnerId || !selectedScore
									? "cursor-not-allowed border-gray-500 bg-gray-400 opacity-80 shadow-none"
									: activeAccentColor === "brawl-blue"
										? "cursor-pointer bg-brawl-blue hover:shadow-comic-hover"
										: "cursor-pointer bg-brawl-red hover:shadow-comic-hover",
							)}
						>
							<span className="material-symbols-outlined text-lg">
								{isLastMatch && allBetsComplete ? "verified" : "arrow_forward"}
							</span>
							{getButtonText()}
						</button>
					</div>

					{/* Pagination Dots */}
					<div className="mt-6 mb-12 flex items-center justify-center gap-3">
						{matches.map((match, i) => {
							const prediction = predictions[match.id];
							const hasPrediction =
								prediction &&
								prediction.winnerId &&
								prediction.score &&
								prediction.score.trim() !== "";
							return (
								<button
									key={i}
									onClick={() => {
										setCurrentIndex(i);
									}}
									className={clsx(
										"relative h-4 w-4 rounded-full border-[2px] border-black outline-none transition-all duration-200",
										i === currentIndex
											? "scale-125 bg-brawl-yellow shadow-sm"
											: hasPrediction
												? "bg-green-500 hover:bg-green-600"
												: "bg-white hover:bg-gray-100",
									)}
									aria-label={`Go to match ${i + 1}`}
								>
									{hasPrediction && i !== currentIndex && (
										<span className="absolute inset-0 flex items-center justify-center text-[8px] text-white">
											✓
										</span>
									)}
								</button>
							);
						})}
					</div>
				</main>
			</div>
		</>
	);
}

// Subcomponent used in Stats Table
function StatsRow({
	left,
	label,
	right,
}: {
	left: string;
	label: string;
	right: string;
}) {
	return (
		<div className="grid grid-cols-[1fr_1.5fr_1fr] divide-x divide-gray-400 border-gray-400 border-b">
			<div className="bg-transparent py-2 text-center">{left}</div>
			<div className="flex items-center justify-center bg-gray-200/50 py-2 text-center font-medium text-[9px] text-gray-600 uppercase tracking-wide">
				{label}
			</div>
			<div className="bg-transparent py-2 text-center">{right}</div>
		</div>
	);
}
