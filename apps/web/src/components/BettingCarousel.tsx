import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLangLink } from "@/i18n/useLangLink";
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
	const { t } = useTranslation("betting");
	const { linkTo } = useLangLink();
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
			return t("reviewAll");
		}
		if (isLastMatch && !allBetsComplete) {
			const missingCount = matches.filter(
				(m) =>
					!predictions[m.id] ||
					!predictions[m.id].winnerId ||
					!predictions[m.id].score ||
					predictions[m.id].score.trim() === "",
			).length;
			return t("missingScores", { count: missingCount });
		}
		return t("nextMatch");
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
				{/* Paint Splatters */}
				<div className="pointer-events-none absolute top-1/4 left-1/4 z-0 h-96 w-96 -rotate-12 transform opacity-50">
					<PaintSplatterBlue className="h-full w-full" />
				</div>
				<div className="pointer-events-none absolute right-1/4 bottom-1/4 z-0 h-96 w-96 rotate-45 transform opacity-50">
					<PaintSplatterRed className="h-full w-full" />
				</div>

				<div className="relative z-10 w-full max-w-sm">
					<div className="flex flex-col items-center rounded-xl border-2 border-black bg-white p-8 text-center shadow-[4px_4px_0_0_#000]">
						{/* Icon */}
						<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-black bg-gray-100">
							<span className="material-symbols-outlined text-3xl text-gray-500">
								calendar_clock
							</span>
						</div>

						<h2 className="mb-2 font-black font-display text-2xl text-black uppercase">
							{t("empty.title")}{" "}
							<span className="text-[#ff2e2e]">{t("empty.now")}</span>
						</h2>

						<p className="mb-6 font-bold text-gray-600 text-sm">
							{t("empty.noMatches")}
						</p>

						{(Object.keys(predictions).length > 0 || hasUserBets) &&
						onShowReview ? (
							<button
								onClick={onShowReview}
								className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-black bg-[#ff2e2e] py-3 font-black text-white uppercase shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[4px_4px_0_0_#000] active:translate-y-0.5 active:shadow-none"
							>
								<span className="material-symbols-outlined text-lg">
									rate_review
								</span>
								{t("reviewBets")}
							</button>
						) : (
							<div className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-gray-100 py-3 font-bold text-gray-400 text-sm">
								<span className="material-symbols-outlined text-sm">
									hourglass_empty
								</span>
								{t("empty.waiting")}
							</div>
						)}
					</div>
				</div>
			</div>
		);

	return (
		<>
			<div className="pencil-texture relative flex w-full flex-col items-center overflow-x-hidden bg-paper bg-paper-texture pt-24 pb-24 font-body text-ink md:pb-12">
				<main className="relative z-10 mx-auto flex w-full max-w-[500px] flex-col items-center px-4">
					{/* Clean Tournament Header */}
					<header className="mb-6 flex w-full flex-col items-center text-center">
						{/* Tournament Badge */}
						<div className="mb-4 flex items-center gap-3 rounded-lg border-2 border-black bg-white px-4 py-2 shadow-[3px_3px_0_0_#000]">
							{currentMatch.tournamentLogoUrl && (
								<img
									src={currentMatch.tournamentLogoUrl}
									alt=""
									className="h-8 w-8 object-contain"
								/>
							)}
							<span className="font-black text-black text-xs uppercase tracking-wider">
								{currentMatch.tournamentName || "Brawl Stars Championship"}
							</span>
						</div>

						{/* Match Info */}
						<div className="mb-2 flex items-center gap-2">
							<span className="rounded-md bg-black px-3 py-1 font-black text-white text-xs uppercase">
								{currentMatch.label}
							</span>
							<span className="text-gray-600 text-xs">
								{new Date(currentMatch.startTime).toLocaleTimeString("pt-BR", {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</span>
						</div>

						{/* Status Badge */}
						<div
							className={clsx(
								"rounded-full px-3 py-1 font-black text-[10px] uppercase",
								isEffectiveReadOnly
									? "bg-gray-200 text-gray-600"
									: "bg-[#ccff00] text-black",
							)}
						>
							{isEffectiveReadOnly ? t("betsClosed") : t("betsOpen")}
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

									{/* Match Card Container */}
									<div className="relative z-10 overflow-hidden rounded-lg border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000]">
										{/* Match Counter */}
										<div className="border-black border-b-2 bg-[#f0f0f0] py-1.5 text-center">
											<span className="font-black text-[10px] text-black uppercase tracking-wider">
												{t("matchCounter", {
													current: currentIndex + 1,
													total: matches.length,
												})}
											</span>
										</div>

										{/* TEAMS DISPLAY */}
										<div className="relative grid h-36 grid-cols-2 md:h-44">
											{/* VS Badge - Centered */}
											<div className="pointer-events-none absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
												<div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white shadow-[2px_2px_0_0_#000] md:h-10 md:w-10">
													<span className="font-black font-display text-black text-xs md:text-sm">
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
													"group relative flex h-full cursor-pointer flex-col items-center overflow-hidden border-black border-r-2 p-0 transition-all duration-200",
													isSelected(currentMatch.teamA?.id || 0)
														? "bg-[#2e5cff]"
														: isOtherTeamSelected(currentMatch.teamA?.id || 0)
															? "bg-gray-200 grayscale"
															: isEffectiveReadOnly
																? "cursor-not-allowed bg-[#2e5cff]/60"
																: "bg-[#2e5cff] hover:brightness-110",
												)}
											>
												{/* Selection border indicator */}
												{isSelected(currentMatch.teamA?.id || 0) && (
													<div className="pointer-events-none absolute inset-0 z-20 border-[#ccff00] border-[4px]" />
												)}

												<div className="relative z-10 flex h-full w-full flex-col">
													{/* Team Name */}
													<div className="w-full bg-black/20 px-2 py-2 text-center">
														<span className="block truncate font-black text-[10px] text-white uppercase tracking-wider md:text-xs">
															{currentMatch.teamA?.name || "TBD"}
														</span>
													</div>
													{/* Team Logo */}
													<div className="flex flex-grow items-center justify-center p-3">
														<TeamLogo
															teamName={currentMatch.teamA?.name || "TBD"}
															logoUrl={currentMatch.teamA?.logoUrl}
															size="lg"
															className="h-14 w-14 md:h-20 md:w-20"
														/>
													</div>
													{/* Win Rate */}
													<div className="w-full bg-black/10 py-1.5 text-center">
														<span className="font-bold text-[9px] text-white uppercase tracking-wider">
															WR: {currentMatch.stats.winRateA}
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
													"group relative flex h-full cursor-pointer flex-col items-center overflow-hidden p-0 transition-all duration-200",
													isSelected(currentMatch.teamB?.id || 0)
														? "bg-[#ff2e2e]"
														: isOtherTeamSelected(currentMatch.teamB?.id || 0)
															? "bg-gray-200 grayscale"
															: isEffectiveReadOnly
																? "cursor-not-allowed bg-[#ff2e2e]/60"
																: "bg-[#ff2e2e] hover:brightness-110",
												)}
											>
												{/* Selection border indicator */}
												{isSelected(currentMatch.teamB?.id || 0) && (
													<div className="pointer-events-none absolute inset-0 z-20 border-[#ccff00] border-[4px]" />
												)}

												<div className="relative z-10 flex h-full w-full flex-col">
													{/* Team Name */}
													<div className="w-full bg-black/20 px-2 py-2 text-center">
														<span className="block truncate font-black text-[10px] text-white uppercase tracking-wider md:text-xs">
															{currentMatch.teamB?.name || "TBD"}
														</span>
													</div>
													{/* Team Logo */}
													<div className="flex flex-grow items-center justify-center p-3">
														<TeamLogo
															teamName={currentMatch.teamB?.name || "TBD"}
															logoUrl={currentMatch.teamB?.logoUrl}
															size="lg"
															className="h-14 w-14 md:h-20 md:w-20"
														/>
													</div>
													{/* Win Rate */}
													<div className="w-full bg-black/10 py-1.5 text-center">
														<span className="font-bold text-[9px] text-white uppercase tracking-wider">
															WR: {currentMatch.stats.winRateB}
														</span>
													</div>
												</div>
											</div>
										</div>

										{/* Stats Section */}
										<div className="border-black border-t-2 bg-white">
											{/* Two columns: Team A stats | Team B stats */}
											<div className="grid grid-cols-2 gap-0">
												{/* Team A Column */}
												<div className="border-gray-200 border-r px-3 py-3">
													<div className="mb-2 flex items-center gap-1.5">
														{currentMatch.teamA?.seed && (
															<span className="rounded bg-[#2e5cff]/10 px-1.5 py-0.5 font-black text-[#2e5cff] text-[10px]">
																Seed #{currentMatch.teamA.seed}
															</span>
														)}
														{currentMatch.teamA?.group && (
															<span className="rounded bg-gray-100 px-1.5 py-0.5 font-bold text-[10px] text-gray-600">
																Grp {currentMatch.teamA.group}
															</span>
														)}
													</div>

													<div className="space-y-1.5">
														<div className="flex items-center justify-between">
															<span className="font-black text-[9px] text-gray-400 uppercase">
																{t("common:region")}
															</span>
															<span className="font-bold text-[10px] text-black">
																{currentMatch.stats.regionA}
															</span>
														</div>
														<div className="flex items-center justify-between">
															<span className="font-black text-[9px] text-gray-400 uppercase">
																WR
															</span>
															<span className="font-bold text-[#2e5cff] text-[10px]">
																{currentMatch.stats.winRateA}
															</span>
														</div>
														<div className="flex items-center justify-between">
															<span className="font-black text-[9px] text-gray-400 uppercase">
																{t("common:series")}
															</span>
															{currentMatch.stats.streakA > 0 && (
																<span className="font-bold text-[10px] text-green-600">
																	+{currentMatch.stats.streakA}
																</span>
															)}
															{currentMatch.stats.streakA < 0 && (
																<span className="font-bold text-[10px] text-red-500">
																	{currentMatch.stats.streakA}
																</span>
															)}
															{currentMatch.stats.streakA === 0 && (
																<span className="font-bold text-[10px] text-gray-400">
																	-
																</span>
															)}
														</div>
														<div className="flex items-center justify-between">
															<span className="font-black text-[9px] text-gray-400 uppercase">
																Apostas
															</span>
															<span className="font-bold text-[#2e5cff] text-[10px]">
																{currentMatch.stats.betCountA}
															</span>
														</div>
													</div>
												</div>

												{/* Team B Column */}
												<div className="px-3 py-3">
													<div className="mb-2 flex items-center justify-end gap-1.5">
														{currentMatch.teamB?.group && (
															<span className="rounded bg-gray-100 px-1.5 py-0.5 font-bold text-[10px] text-gray-600">
																Grp {currentMatch.teamB.group}
															</span>
														)}
														{currentMatch.teamB?.seed && (
															<span className="rounded bg-[#ff2e2e]/10 px-1.5 py-0.5 font-black text-[#ff2e2e] text-[10px]">
																Seed #{currentMatch.teamB.seed}
															</span>
														)}
													</div>

													<div className="space-y-1.5">
														<div className="flex items-center justify-between">
															<span className="font-black text-[9px] text-gray-400 uppercase">
																{t("common:region")}
															</span>
															<span className="font-bold text-[10px] text-black">
																{currentMatch.stats.regionB}
															</span>
														</div>
														<div className="flex items-center justify-between">
															<span className="font-black text-[9px] text-gray-400 uppercase">
																WR
															</span>
															<span className="font-bold text-[#ff2e2e] text-[10px]">
																{currentMatch.stats.winRateB}
															</span>
														</div>
														<div className="flex items-center justify-between">
															<span className="font-black text-[9px] text-gray-400 uppercase">
																{t("common:series")}
															</span>
															{currentMatch.stats.streakB > 0 && (
																<span className="font-bold text-[10px] text-green-600">
																	+{currentMatch.stats.streakB}
																</span>
															)}
															{currentMatch.stats.streakB < 0 && (
																<span className="font-bold text-[10px] text-red-500">
																	{currentMatch.stats.streakB}
																</span>
															)}
															{currentMatch.stats.streakB === 0 && (
																<span className="font-bold text-[10px] text-gray-400">
																	-
																</span>
															)}
														</div>
														<div className="flex items-center justify-between">
															<span className="font-black text-[9px] text-gray-400 uppercase">
																Apostas
															</span>
															<span className="font-bold text-[#ff2e2e] text-[10px]">
																{currentMatch.stats.betCountB}
															</span>
														</div>
													</div>
												</div>
											</div>
										</div>

										{/* Team Links */}
										<div className="grid grid-cols-2 gap-0 border-black border-t-2">
											{currentMatch.teamA?.slug ? (
												<Link
													to={linkTo("/teams/$teamId")}
													params={{ teamId: currentMatch.teamA?.slug || "" }}
													className="flex items-center justify-center gap-2 border-black border-r-2 bg-[#121212] py-3 text-white transition-all hover:bg-black"
												>
													<span className="material-symbols-outlined text-sm">
														visibility
													</span>
													<span className="truncate font-bold text-xs">
														{currentMatch.teamA?.name || "TBD"}
													</span>
												</Link>
											) : (
												<div className="flex items-center justify-center gap-2 border-black border-r-2 bg-gray-600 py-3 text-gray-300">
													<span className="material-symbols-outlined text-sm">
														visibility_off
													</span>
													<span className="font-bold text-xs">TBD</span>
												</div>
											)}
											{currentMatch.teamB?.slug ? (
												<Link
													to={linkTo("/teams/$teamId")}
													params={{ teamId: currentMatch.teamB?.slug || "" }}
													className="flex items-center justify-center gap-2 bg-[#121212] py-3 text-white transition-all hover:bg-black"
												>
													<span className="material-symbols-outlined text-sm">
														visibility
													</span>
													<span className="truncate font-bold text-xs">
														{currentMatch.teamB?.name || "TBD"}
													</span>
												</Link>
											) : (
												<div className="flex items-center justify-center gap-2 bg-gray-600 py-3 text-gray-300">
													<span className="material-symbols-outlined text-sm">
														visibility_off
													</span>
													<span className="font-bold text-xs">TBD</span>
												</div>
											)}
										</div>
									</div>
								</div>

								{/* SCORE SELECTOR */}
								<div className="mt-6 w-full">
									<div className="mb-2 text-center">
										<span className="font-black text-black text-xs uppercase tracking-wider">
											{t("pickScore")}
										</span>
									</div>
									<div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
										{scoreOptions.map((option) => {
											const isOptionSelected = selectedScore === option.label;
											const isDisabled = !selectedWinnerId || isReadOnly;
											const accentColor =
												activeAccentColor === "brawl-blue"
													? "#2e5cff"
													: "#ff2e2e";

											return (
												<button
													key={option.label}
													onClick={() =>
														!isDisabled && setSelectedScore(option.label)
													}
													disabled={isDisabled}
													className={clsx(
														"relative flex h-16 flex-col items-center justify-center rounded-lg border-2 p-2 transition-all duration-150 md:h-20",
														isDisabled || isEffectiveReadOnly
															? "cursor-not-allowed border-gray-300 bg-gray-100 opacity-50"
															: isOptionSelected
																? "border-black bg-white shadow-[3px_3px_0_0_#000]"
																: "border-gray-300 bg-white hover:border-gray-400 hover:shadow-[2px_2px_0_0_#ccc]",
													)}
												>
													{/* Checkmark for selected */}
													{isOptionSelected && (
														<div className="absolute top-1 right-1">
															<span
																className="material-symbols-outlined text-sm"
																style={{ color: accentColor }}
															>
																check_circle
															</span>
														</div>
													)}

													<span
														className="font-black font-display text-2xl md:text-3xl"
														style={{
															color: isOptionSelected
																? accentColor
																: isDisabled
																	? "#9ca3af"
																	: "#374151",
														}}
													>
														{option.label}
													</span>

													<span
														className={clsx(
															"mt-0.5 rounded px-1.5 py-0.5 font-bold text-[9px] uppercase",
															isOptionSelected
																? "bg-[#ccff00] text-black"
																: "text-gray-500",
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

					{/* Action Button */}
					<div className="mx-auto mt-8 w-full max-w-xs">
						<button
							onClick={handleNext}
							disabled={!selectedWinnerId || !selectedScore}
							className={clsx(
								"flex w-full items-center justify-center gap-2 rounded-lg border-2 border-black py-3.5 font-black font-display text-base text-white uppercase shadow-[3px_3px_0_0_#000] transition-all active:translate-y-0.5 active:shadow-none md:text-lg",
								!selectedWinnerId || !selectedScore
									? "cursor-not-allowed border-gray-400 bg-gray-400"
									: activeAccentColor === "brawl-blue"
										? "bg-[#2e5cff] hover:shadow-[4px_4px_0_0_#000]"
										: "bg-[#ff2e2e] hover:shadow-[4px_4px_0_0_#000]",
							)}
						>
							<span className="material-symbols-outlined text-lg">
								{isLastMatch && allBetsComplete ? "verified" : "arrow_forward"}
							</span>
							{getButtonText()}
						</button>
					</div>

					{/* Pagination Indicators */}
					<div className="mt-6 mb-12 flex items-center justify-center gap-2">
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
									onClick={() => setCurrentIndex(i)}
									className={clsx(
										"h-2.5 rounded-full border-2 border-black transition-all duration-200",
										i === currentIndex
											? "w-8 bg-[#ccff00]"
											: hasPrediction
												? "w-2.5 bg-green-500 hover:bg-green-600"
												: "w-2.5 bg-white hover:bg-gray-200",
									)}
									aria-label={`Go to match ${i + 1}`}
								/>
							);
						})}
					</div>
				</main>
			</div>
		</>
	);
}
