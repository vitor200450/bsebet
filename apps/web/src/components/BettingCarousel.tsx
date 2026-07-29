import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BettingEmptyState } from "@/components/BettingEmptyState";
import {
	SPRAY_MASK_COUNT,
	SpraySplat,
	TapeLabel,
	TournamentLogoSticker,
} from "@/components/betting/BettingDecor";
import { useLangLink } from "@/i18n/useLangLink";
import { cn } from "@/lib/utils";
import { isMatchPickEditable } from "@/utils/bet-submission";
import { scoresEqual } from "@/utils/score-format";
import {
	getRegionPalette,
	resolveTournamentVisualIdentity,
	stageBarStyle,
} from "@/utils/tournament-visual-identity";
import type { Match, Prediction } from "./bracket/types";
import { TeamLogo } from "./TeamLogo";

/** Colored paper chip for tournament region */
function getRegionPaperStyle(region: string): {
	tintClass: string;
	textClass: string;
	lightText: boolean;
} {
	const palette = getRegionPalette(region);
	return {
		tintClass: palette.tintClass,
		textClass: palette.textOnAccentClass,
		lightText: palette.lightText,
	};
}

function presentationThemeLabelKey(theme: string): string | null {
	switch (theme) {
		case "qualifier":
			return "tournament:browse.themeQualifier";
		case "monthly_finals":
			return "tournament:browse.themeMonthlyFinals";
		case "major":
			return "tournament:browse.themeMajor";
		default:
			return null;
	}
}

function regionLabelKey(region: string): string {
	return `common:regions.${region.trim().toLowerCase()}`;
}

function RegionPaperLabel({
	region,
	label,
	rotate = "2deg",
	className,
}: {
	region: string;
	label: string;
	rotate?: string;
	className?: string;
}) {
	const { tintClass, textClass, lightText } = getRegionPaperStyle(region);

	return (
		<div
			className={cn(
				"relative inline-flex max-w-full items-center justify-center overflow-hidden border-[3px] border-black px-4 py-2 shadow-comic-sm",
				tintClass,
				className,
			)}
			style={{ transform: `rotate(${rotate})` }}
		>
			<img
				src="/betting/paper-sticker.jpg"
				alt=""
				aria-hidden="true"
				draggable={false}
				className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-multiply"
			/>
			<span
				className={clsx(
					"relative z-10 truncate font-body font-bold text-[10px] uppercase tracking-widest sm:text-xs",
					textClass,
					lightText
						? "drop-shadow-[0_1px_0_rgba(0,0,0,0.4)]"
						: "drop-shadow-[0_1px_0_rgba(255,255,255,0.25)]",
				)}
			>
				{label}
			</span>
		</div>
	);
}

const BLUE_ROTATIONS = [-28, -14, 8, 22, -35, 12] as const;
const RED_ROTATIONS = [24, 38, -10, 16, -22, 30] as const;

/** Spray bloom behind team pick — mask variants + rotation per match */
function CarouselAtmosphere({
	selectedSide,
	matchId,
}: {
	selectedSide: "blue" | "red" | null;
	matchId: number;
}) {
	const blueMask = (matchId % SPRAY_MASK_COUNT) + 1;
	const redMask = ((matchId + 2) % SPRAY_MASK_COUNT) + 1;
	const blueRotate = BLUE_ROTATIONS[matchId % BLUE_ROTATIONS.length] ?? -14;
	const redRotate = RED_ROTATIONS[matchId % RED_ROTATIONS.length] ?? 24;

	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute top-[4%] left-1/2 z-0 h-[44%] w-[140%] max-w-[680px] -translate-x-1/2 sm:top-[3%] sm:h-[48%] sm:w-[150%]"
		>
			<SpraySplat
				variant="blue"
				maskIndex={blueMask}
				rotate={blueRotate}
				className={clsx(
					"absolute top-1/2 left-[-10%] h-[95%] w-[55%] -translate-y-1/2 transition-opacity duration-300 sm:left-[-14%] sm:h-[100%] sm:w-[52%]",
					selectedSide === "red" ? "opacity-35" : "opacity-95",
				)}
			/>
			<SpraySplat
				variant="red"
				maskIndex={redMask}
				rotate={redRotate}
				className={clsx(
					"absolute top-1/2 right-[-10%] h-[95%] w-[55%] -translate-y-1/2 transition-opacity duration-300 sm:right-[-14%] sm:h-[100%] sm:w-[52%]",
					selectedSide === "blue" ? "opacity-35" : "opacity-95",
				)}
			/>
		</div>
	);
}

function StatsComparisonRow({
	label,
	valueA,
	valueB,
	accentA,
	accentB,
	emphasize,
}: {
	label: string;
	valueA: ReactNode;
	valueB: ReactNode;
	accentA?: boolean;
	accentB?: boolean;
	/** Larger score-style number treatment */
	emphasize?: boolean;
}) {
	return (
		<div className="grid grid-cols-[1fr_7.5rem_1fr] items-stretch sm:grid-cols-[1fr_8.5rem_1fr]">
			<div className="flex items-center justify-start border-black/10 border-r px-3 py-3 sm:px-4">
				<span
					className={clsx(
						"tabular-nums tracking-tight",
						emphasize
							? "font-black font-display text-base sm:text-lg"
							: "font-body font-bold text-xs sm:text-sm",
						accentA ? "text-brawl-blue" : "text-ink",
					)}
				>
					{valueA}
				</span>
			</div>
			<div className="flex items-center justify-center bg-tape px-1.5 py-3">
				<span className="max-w-full truncate whitespace-nowrap border border-black bg-white px-2 py-1 font-body font-bold text-[8px] text-ink uppercase tracking-widest shadow-comic-sm sm:text-[9px]">
					{label}
				</span>
			</div>
			<div className="flex items-center justify-end border-black/10 border-l px-3 py-3 sm:px-4">
				<span
					className={clsx(
						"tabular-nums tracking-tight",
						emphasize
							? "font-black font-display text-base sm:text-lg"
							: "font-body font-bold text-xs sm:text-sm",
						accentB ? "text-brawl-red" : "text-ink",
					)}
				>
					{valueB}
				</span>
			</div>
		</div>
	);
}

function formatStreak(value: number): string {
	if (value > 0) return `+${value}`;
	if (value < 0) return `${value}`;
	return "-";
}

export function BettingCarousel({
	matches,
	predictions,
	onUpdatePrediction,
	onShowReview,
	hasUserBets,
	isReadOnly = false,
	editableMatchIds,
	matchDayStatus,
	userBets = [],
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
	userBets?: Array<{
		matchId: number;
		predictedWinnerId?: number | null;
	}>;
}) {
	const { t, i18n } = useTranslation("betting");
	const { routeTo, lang } = useLangLink();
	const reduceMotion = useReducedMotion();
	const [currentIndex, setCurrentIndex] = useState(0);
	const scoreSectionRef = useRef<HTMLDivElement>(null);
	const locale = i18n.language === "pt" ? "pt-BR" : "en-US";

	useEffect(() => {
		if (currentIndex >= matches.length && matches.length > 0) {
			setCurrentIndex(matches.length - 1);
		}
	}, [matches.length, currentIndex]);

	const projectedMatches = useMemo<Match[]>(() => {
		const projected = matches.map((m) => ({
			...m,
			teamA: m.teamA ? { ...m.teamA } : null,
			teamB: m.teamB ? { ...m.teamB } : null,
			stats: { ...m.stats },
		}));

		const applyProjectedTeam = (
			nextMatch: Match,
			slot: "A" | "B",
			team: NonNullable<Match["teamA"]>,
		) => {
			if (slot === "A") {
				nextMatch.teamA = { ...team, color: "blue" };
				if (team.region) {
					nextMatch.stats = { ...nextMatch.stats, regionA: team.region };
				}
			} else {
				nextMatch.teamB = { ...team, color: "red" };
				if (team.region) {
					nextMatch.stats = { ...nextMatch.stats, regionB: team.region };
				}
			}
		};

		projected.forEach((match) => {
			const prediction = predictions[match.id];
			if (!prediction) return;

			const winnerId = prediction.winnerId;
			const winnerTeam =
				match.teamA && winnerId === match.teamA.id ? match.teamA : match.teamB;
			const loserTeam =
				match.teamA && winnerId === match.teamA.id ? match.teamB : match.teamA;

			if (!winnerTeam || !loserTeam) return;

			if (match.nextMatchWinnerId) {
				const nextMatch = projected.find(
					(m) => m.id === match.nextMatchWinnerId,
				);
				if (nextMatch) {
					const slot = match.nextMatchWinnerSlot?.toUpperCase();
					if (slot === "A" || slot === "B") {
						applyProjectedTeam(nextMatch, slot, winnerTeam);
					}
				}
			}

			if (match.nextMatchLoserId) {
				const nextMatch = projected.find(
					(m) => m.id === match.nextMatchLoserId,
				);
				if (nextMatch) {
					const slot = match.nextMatchLoserSlot?.toUpperCase();
					if (slot === "A" || slot === "B") {
						applyProjectedTeam(nextMatch, slot, loserTeam);
					}
				}
			}
		});

		return projected;
	}, [matches, predictions]);

	const currentMatch = projectedMatches[currentIndex];
	const currentPrediction = currentMatch ? predictions[currentMatch.id] : null;
	const isLastMatch = currentIndex === projectedMatches.length - 1;

	const allBetsComplete = useMemo(() => {
		if (matches.length === 0) return true;
		return matches.every(
			(match) =>
				predictions[match.id] &&
				predictions[match.id].winnerId &&
				predictions[match.id].score &&
				predictions[match.id].score.trim() !== "",
		);
	}, [matches, predictions]);

	const isPredictionComplete = (matchId: number): boolean => {
		const prediction = predictions[matchId];
		return Boolean(
			prediction?.winnerId &&
				prediction.score &&
				prediction.score.trim() !== "",
		);
	};

	const canNavigateToIndex = (targetIndex: number): boolean => {
		if (targetIndex === currentIndex) return true;
		if (targetIndex < 0 || targetIndex >= matches.length) return false;

		// Going back is always allowed (edit previous picks).
		if (targetIndex < currentIndex) return true;

		// Going forward requires every match up to (but not including) the
		// target to have a complete winner + score pick.
		for (let i = 0; i < targetIndex; i++) {
			const match = matches[i];
			if (!match || !isPredictionComplete(match.id)) return false;
		}
		return true;
	};

	const handleNext = () => {
		if (isLastMatch && allBetsComplete) {
			if (onShowReview) {
				onShowReview();
			}
			return;
		}

		if (isLastMatch && !allBetsComplete) {
			const firstMissingIndex = matches.findIndex(
				(m) => !isPredictionComplete(m.id),
			);
			if (firstMissingIndex !== -1) {
				setCurrentIndex(firstMissingIndex);
				return;
			}
		}

		if (
			currentIndex < matches.length - 1 &&
			canNavigateToIndex(currentIndex + 1)
		) {
			setCurrentIndex((prev) => prev + 1);
		}
	};

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

	const isEffectiveReadOnly = useMemo(() => {
		if (!currentMatch) return true;

		const serverBet = userBets.find(
			(bet) => Number(bet.matchId) === Number(currentMatch.id),
		);

		return !isMatchPickEditable({
			matchDayStatus: matchDayStatus ?? undefined,
			isReadOnly,
			matchStatus: currentMatch.status,
			isRecoveryMatch: editableMatchIds?.has(currentMatch.id) ?? false,
			serverBet,
			teamAId: currentMatch.teamA?.id ? Number(currentMatch.teamA.id) : null,
			teamBId: currentMatch.teamB?.id ? Number(currentMatch.teamB.id) : null,
		});
	}, [isReadOnly, currentMatch, matchDayStatus, editableMatchIds, userBets]);

	const setSelectedWinnerId = (winnerId: number) => {
		if (!currentMatch || isEffectiveReadOnly) return;
		onUpdatePrediction(currentMatch.id, winnerId);
		// Keep score options in view after the team pick (no manual scroll).
		requestAnimationFrame(() => {
			scoreSectionRef.current?.scrollIntoView({
				behavior: reduceMotion ? "auto" : "smooth",
				block: "nearest",
			});
		});
	};

	const setSelectedScore = (score: string) => {
		if (!currentMatch?.id || isEffectiveReadOnly) return;
		onUpdatePrediction(currentMatch.id, selectedWinnerId || 0, score);
	};

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
						? t("scoreDescription.dominant")
						: loserWins === winsNeeded - 1
							? t("scoreDescription.closeMatch")
							: t("scoreDescription.strongWin"),
			});
		}
		return options;
	}, [currentMatch?.format, currentMatch?.teamA?.id, selectedWinnerId, t]);

	const isSelected = (teamId: number) => selectedWinnerId === teamId;
	const isOtherTeamSelected = (teamId: number) =>
		selectedWinnerId !== null && selectedWinnerId !== teamId;

	const selectedSide: "blue" | "red" | null =
		currentMatch &&
		currentMatch.teamA &&
		selectedWinnerId === currentMatch.teamA.id
			? "blue"
			: currentMatch &&
					currentMatch.teamB &&
					selectedWinnerId === currentMatch.teamB.id
				? "red"
				: null;

	const activeAccentColor =
		selectedSide === "blue" ? "brawl-blue" : "brawl-red";

	if (!currentMatch)
		return (
			<BettingEmptyState
				icon="calendar_clock"
				title={t("empty.title")}
				titleAccent={t("empty.now")}
				description={t("empty.noMatches")}
				action={
					(Object.keys(predictions).length > 0 || hasUserBets) &&
					onShowReview ? (
						<button
							type="button"
							onClick={onShowReview}
							className="flex w-full items-center justify-center gap-2 border-2 border-black bg-brawl-red py-3 font-black font-display text-white uppercase shadow-comic transition-all hover:shadow-comic-md active:translate-y-0.5 active:shadow-none"
						>
							<span className="material-symbols-outlined text-lg">
								rate_review
							</span>
							{t("reviewBets")}
						</button>
					) : (
						<div className="flex w-full items-center justify-center gap-2 border-2 border-gray-300 bg-gray-100 py-3 font-body font-bold text-[10px] text-gray-400 uppercase tracking-widest">
							<span className="material-symbols-outlined text-sm">
								hourglass_empty
							</span>
							{t("empty.waiting")}
						</div>
					)
				}
			/>
		);

	const teamASelected = isSelected(currentMatch.teamA?.id || 0);
	const teamBSelected = isSelected(currentMatch.teamB?.id || 0);
	const teamAMuted = isOtherTeamSelected(currentMatch.teamA?.id || 0);
	const teamBMuted = isOtherTeamSelected(currentMatch.teamB?.id || 0);

	const tournamentRegion = currentMatch.tournamentRegion?.trim() || null;
	const tournamentRegionLabel = tournamentRegion
		? (() => {
				const key = regionLabelKey(tournamentRegion);
				const translated = t(key);
				return translated === key ? tournamentRegion : translated;
			})()
		: null;

	const visualIdentity = resolveTournamentVisualIdentity({
		presentationTheme: currentMatch.tournamentPresentationTheme,
		region: tournamentRegion,
		venueMode: currentMatch.tournamentVenueMode ?? "online",
	});
	const themeLabelKey = presentationThemeLabelKey(visualIdentity.theme);
	const themeLabel = themeLabelKey ? t(themeLabelKey) : null;

	return (
		<div className="relative flex w-full flex-col items-center overflow-x-clip bg-transparent pt-20 pb-24 font-body text-ink md:pb-12">
			<main className="relative z-10 mx-auto flex w-full max-w-[520px] flex-col items-center px-4 sm:px-6">
				{/* Hero title + taped context */}
				<header className="mb-3 flex w-full flex-col items-center text-center">
					<h1 className="mb-2.5 pb-0.5 font-black font-display text-ink text-xl uppercase italic leading-[1.1] tracking-tighter sm:text-2xl">
						{t("pickWinnerTitle")}
					</h1>

					<div className="mb-2 flex w-full flex-col items-center gap-1.5">
						{currentMatch.tournamentLogoUrl ? (
							<TournamentLogoSticker
								src={currentMatch.tournamentLogoUrl}
								alt={currentMatch.tournamentName || "Brawl Stars Championship"}
								rotate="-2deg"
								size="sm"
							/>
						) : null}
						<TapeLabel
							rotate="-2deg"
							className="min-w-0 max-w-md px-6 py-3 sm:px-10 sm:py-4"
						>
							{currentMatch.tournamentName || "Brawl Stars Championship"}
						</TapeLabel>
					</div>

					{/* Line 1: region · Line 2: type + venue */}
					{(tournamentRegionLabel || themeLabel) && (
						<div className="flex w-full max-w-sm flex-col items-stretch gap-1.5">
							{tournamentRegion && tournamentRegionLabel ? (
								<RegionPaperLabel
									region={tournamentRegion}
									label={tournamentRegionLabel}
									rotate="0deg"
									className="w-full justify-center px-2.5 py-1.5"
								/>
							) : null}
							{(themeLabel || visualIdentity.venueMode === "lan") && (
								<div
									className={clsx(
										"grid items-stretch gap-1.5",
										themeLabel && visualIdentity.venueMode === "lan"
											? "grid-cols-2"
											: "grid-cols-1",
									)}
								>
									{themeLabel ? (
										<span
											className={clsx(
												"inline-flex w-full items-center justify-center px-2.5 py-1.5 text-center font-body font-bold text-[10px] uppercase tracking-widest",
												visualIdentity.kindBadgeClass,
											)}
										>
											{themeLabel}
										</span>
									) : null}
									{visualIdentity.venueMode === "lan" ? (
										<span className="inline-flex w-full items-center justify-center border-2 border-black bg-brawl-blue px-2.5 py-1.5 font-body font-bold text-[10px] text-white uppercase tracking-widest">
											{t("tournament:browse.venueLan")}
										</span>
									) : null}
								</div>
							)}
						</div>
					)}
				</header>

				{/* Carousel Content Area */}
				<div className="relative w-full">
					<AnimatePresence mode="wait">
						<motion.div
							key={currentMatch.id}
							initial={reduceMotion ? false : { x: 40, opacity: 0 }}
							animate={{ x: 0, opacity: 1 }}
							exit={reduceMotion ? undefined : { x: -40, opacity: 0 }}
							transition={{ type: "spring", stiffness: 320, damping: 32 }}
							className="w-full"
						>
							<div className="relative w-full overflow-visible px-1 sm:px-3">
								<CarouselAtmosphere
									selectedSide={selectedSide}
									matchId={currentMatch.id}
								/>

								{/* Match Card — inset so sprays bloom past the edges */}
								<div
									className={clsx(
										"relative z-10 mx-auto w-full max-w-[480px] overflow-hidden border-[3px] border-black bg-white shadow-comic-md sm:max-w-none",
										visualIdentity.cardFrameClass,
									)}
								>
									{/* Stage / time / counter bar */}
									<div
										className={visualIdentity.stageBarClass}
										style={stageBarStyle(visualIdentity)}
									>
										<span className="truncate font-body font-bold text-[10px] uppercase tracking-widest">
											{currentMatch.label}
										</span>
										<div className="flex shrink-0 items-center gap-2">
											<span
												className={clsx(
													"font-body font-bold text-[10px] uppercase tabular-nums tracking-widest",
													visualIdentity.theme === "qualifier"
														? "text-ink/70"
														: "text-white/80",
												)}
											>
												{new Date(currentMatch.startTime).toLocaleTimeString(
													locale,
													{
														hour: "2-digit",
														minute: "2-digit",
													},
												)}
											</span>
											<span
												className={clsx(
													"font-body font-bold text-[10px] uppercase tabular-nums tracking-widest",
													visualIdentity.theme === "qualifier"
														? "text-ink/60"
														: "text-white/70",
												)}
											>
												{t("matchCounter", {
													current: currentIndex + 1,
													total: matches.length,
												})}
											</span>
										</div>
									</div>

									{/* Team pick split */}
									<div className="relative grid min-h-[9.5rem] grid-cols-2 sm:min-h-[11rem]">
										{/* VS badge */}
										<div className="pointer-events-none absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
											<div className="flex h-9 w-9 items-center justify-center border-2 border-black bg-white shadow-comic-sm sm:h-10 sm:w-10">
												<span className="font-black font-display text-ink text-xs italic sm:text-sm">
													{t("matchCard.vs")}
												</span>
											</div>
										</div>

										{/* Team A */}
										<button
											type="button"
											disabled={!currentMatch.teamA || isEffectiveReadOnly}
											onClick={() =>
												currentMatch.teamA &&
												setSelectedWinnerId(currentMatch.teamA.id)
											}
											className={clsx(
												"group relative flex h-full flex-col items-center overflow-hidden border-black border-r-[3px] transition-all duration-200",
												teamAMuted
													? "bg-tape text-ink grayscale"
													: "cursor-pointer bg-brawl-blue text-white hover:brightness-110",
												isEffectiveReadOnly && !teamASelected
													? "cursor-not-allowed opacity-70"
													: "",
											)}
										>
											{teamASelected && (
												<div className="pointer-events-none absolute inset-0 z-20 border-[4px] border-electric-lime" />
											)}

											<div className="relative z-10 flex h-full w-full flex-col">
												<div
													className={clsx(
														"w-full px-2 py-2 text-center",
														teamAMuted ? "bg-black/5" : "bg-black/25",
													)}
												>
													<span
														className={clsx(
															"block truncate font-black font-display text-[10px] uppercase italic tracking-tighter sm:text-xs",
															teamAMuted ? "text-ink" : "text-white",
														)}
													>
														{currentMatch.teamA?.name || t("matchCard.tbd")}
													</span>
												</div>

												<div className="relative flex flex-grow flex-col items-center justify-center gap-1 p-2 sm:p-3">
													<TeamLogo
														teamName={
															currentMatch.teamA?.name || t("matchCard.tbd")
														}
														logoUrl={currentMatch.teamA?.logoUrl}
														size="xl"
														className="h-14 w-14 sm:h-20 sm:w-20"
													/>
												</div>

												<div
													className={clsx(
														"flex min-h-[36px] w-full flex-col items-center justify-center px-2 py-1.5 text-center",
														teamAMuted ? "bg-black/5" : "bg-black/15",
													)}
												>
													<span
														className={clsx(
															"font-body font-bold text-[8px] uppercase tracking-widest",
															teamAMuted ? "text-gray-500" : "text-white/80",
														)}
													>
														{t("winRateLabel")}
													</span>
													<span
														className={clsx(
															"font-body font-bold text-[11px] tabular-nums",
															teamAMuted ? "text-ink" : "text-white",
														)}
													>
														{currentMatch.stats.winRateA}
													</span>
												</div>
											</div>
										</button>

										{/* Team B */}
										<button
											type="button"
											disabled={!currentMatch.teamB || isEffectiveReadOnly}
											onClick={() =>
												currentMatch.teamB &&
												setSelectedWinnerId(currentMatch.teamB.id)
											}
											className={clsx(
												"group relative flex h-full flex-col items-center overflow-hidden transition-all duration-200",
												teamBMuted
													? "bg-tape text-ink grayscale"
													: "cursor-pointer bg-brawl-red text-white hover:brightness-110",
												isEffectiveReadOnly && !teamBSelected
													? "cursor-not-allowed opacity-70"
													: "",
											)}
										>
											{teamBSelected && (
												<div className="pointer-events-none absolute inset-0 z-20 border-[4px] border-electric-lime" />
											)}

											<div className="relative z-10 flex h-full w-full flex-col">
												<div
													className={clsx(
														"w-full px-2 py-2 text-center",
														teamBMuted ? "bg-black/5" : "bg-black/25",
													)}
												>
													<span
														className={clsx(
															"block truncate font-black font-display text-[10px] uppercase italic tracking-tighter sm:text-xs",
															teamBMuted ? "text-ink" : "text-white",
														)}
													>
														{currentMatch.teamB?.name || t("matchCard.tbd")}
													</span>
												</div>

												<div className="relative flex flex-grow flex-col items-center justify-center gap-1 p-2 sm:p-3">
													<TeamLogo
														teamName={
															currentMatch.teamB?.name || t("matchCard.tbd")
														}
														logoUrl={currentMatch.teamB?.logoUrl}
														size="xl"
														className="h-14 w-14 sm:h-20 sm:w-20"
													/>
												</div>

												<div
													className={clsx(
														"flex min-h-[36px] w-full flex-col items-center justify-center px-2 py-1.5 text-center",
														teamBMuted ? "bg-black/5" : "bg-black/15",
													)}
												>
													<span
														className={clsx(
															"font-body font-bold text-[8px] uppercase tracking-widest",
															teamBMuted ? "text-gray-500" : "text-white/80",
														)}
													>
														{t("winRateLabel")}
													</span>
													<span
														className={clsx(
															"font-body font-bold text-[11px] tabular-nums",
															teamBMuted ? "text-ink" : "text-white",
														)}
													>
														{currentMatch.stats.winRateB}
													</span>
												</div>
											</div>
										</button>
									</div>

									{/* Score selector — directly under teams so the pick flow stays in view */}
									<div
										ref={scoreSectionRef}
										className="border-black border-t-[3px] bg-paper px-3 py-3 sm:px-4 sm:py-3.5"
									>
										<div className="mb-2.5 text-center">
											<span className="font-body font-bold text-[10px] text-ink uppercase tracking-widest sm:text-xs">
												{t("pickScore")}
											</span>
										</div>
										<div
											className={clsx(
												"grid gap-2",
												scoreOptions.length === 3
													? "grid-cols-3"
													: "grid-cols-2 justify-center",
											)}
										>
											{scoreOptions.map((option) => {
												const isOptionSelected = scoresEqual(
													selectedScore,
													option.label,
												);
												const isDisabled = !selectedWinnerId || isReadOnly;
												const accentHex =
													activeAccentColor === "brawl-blue"
														? "#2e5cff"
														: "#ff2e2e";

												return (
													<button
														key={option.label}
														type="button"
														onClick={() =>
															!isDisabled && setSelectedScore(option.label)
														}
														disabled={isDisabled}
														className={clsx(
															"relative flex h-14 flex-col items-center justify-center border-2 p-1.5 transition-all duration-150 sm:h-16",
															isDisabled || isEffectiveReadOnly
																? "cursor-not-allowed border-gray-300 bg-gray-100 opacity-50"
																: isOptionSelected
																	? "border-black bg-white shadow-comic"
																	: "border-gray-300 bg-white hover:border-gray-400 hover:shadow-[2px_2px_0_0_#ccc]",
														)}
													>
														{isOptionSelected && (
															<div className="absolute top-0.5 right-0.5">
																<span
																	className="material-symbols-outlined text-sm"
																	style={{ color: accentHex }}
																>
																	check_circle
																</span>
															</div>
														)}

														<span
															className="font-black font-display text-xl tabular-nums leading-none sm:text-2xl"
															style={{
																color: isOptionSelected
																	? accentHex
																	: isDisabled
																		? "#9ca3af"
																		: "#121212",
															}}
														>
															{option.label}
														</span>

														<span
															className={clsx(
																"mt-1 max-w-full truncate whitespace-nowrap px-1 py-0.5 font-body font-bold text-[8px] uppercase leading-none tracking-widest sm:text-[9px]",
																isOptionSelected
																	? "bg-electric-lime text-black"
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
								</div>
							</div>

							{/* Primary action — right after score, before secondary intel */}
							<div className="mx-auto mt-4 w-full max-w-xs">
								<button
									type="button"
									onClick={handleNext}
									disabled={!selectedWinnerId || !selectedScore}
									className={clsx(
										"flex w-full items-center justify-center gap-2 border-[3px] border-black py-3.5 font-black font-display text-base text-white uppercase shadow-comic transition-all active:translate-y-0.5 active:shadow-none sm:text-lg",
										!selectedWinnerId || !selectedScore
											? "cursor-not-allowed border-gray-400 bg-gray-400"
											: activeAccentColor === "brawl-blue"
												? "bg-brawl-blue hover:shadow-comic-md"
												: "bg-brawl-red hover:shadow-comic-md",
									)}
								>
									<span className="material-symbols-outlined text-lg">
										{isLastMatch && allBetsComplete
											? "verified"
											: "arrow_forward"}
									</span>
									{getButtonText()}
								</button>
							</div>

							{/* Stats + team links — optional intel below the pick CTA */}
							<div
								className={clsx(
									"relative z-10 mx-auto mt-5 w-full max-w-[480px] overflow-hidden border-[3px] border-black bg-white shadow-comic-sm sm:max-w-none",
									visualIdentity.cardFrameClass,
								)}
							>
								<div className="bg-white">
									<div className="flex items-center justify-center gap-2 border-black border-b-2 bg-ink px-3 py-2">
										<span
											className="h-1 w-4 bg-brawl-blue"
											aria-hidden="true"
										/>
										<span className="font-body font-bold text-[9px] text-white uppercase tracking-[0.2em]">
											{t("statsTitle")}
										</span>
										<span className="h-1 w-4 bg-brawl-red" aria-hidden="true" />
									</div>
									<div className="divide-y divide-black/15">
										<StatsComparisonRow
											label={t("common:region")}
											valueA={currentMatch.stats.regionA || "-"}
											valueB={currentMatch.stats.regionB || "-"}
										/>
										{(currentMatch.stats.groupA ||
											currentMatch.stats.groupB) && (
											<StatsComparisonRow
												label={t("groupLabel")}
												valueA={currentMatch.stats.groupA || "-"}
												valueB={currentMatch.stats.groupB || "-"}
											/>
										)}
										<StatsComparisonRow
											label={t("formLabel")}
											valueA={currentMatch.stats.formA}
											valueB={currentMatch.stats.formB}
											accentA
											accentB
											emphasize
										/>
										<StatsComparisonRow
											label={t("statsWinRate")}
											valueA={currentMatch.stats.winRateA}
											valueB={currentMatch.stats.winRateB}
											accentA
											accentB
											emphasize
										/>
										<StatsComparisonRow
											label={t("streakLabel")}
											valueA={formatStreak(currentMatch.stats.streakA)}
											valueB={formatStreak(currentMatch.stats.streakB)}
											accentA={currentMatch.stats.streakA !== 0}
											accentB={currentMatch.stats.streakB !== 0}
										/>
										{(currentMatch.teamA?.seed != null ||
											currentMatch.teamB?.seed != null) && (
											<StatsComparisonRow
												label={t("seedLabel")}
												valueA={
													currentMatch.teamA?.seed != null
														? `#${currentMatch.teamA.seed}`
														: "-"
												}
												valueB={
													currentMatch.teamB?.seed != null
														? `#${currentMatch.teamB.seed}`
														: "-"
												}
											/>
										)}
									</div>
								</div>

								<div className="grid grid-cols-2 gap-0 border-black border-t-[3px]">
									{currentMatch.teamA?.slug ? (
										<Link
											{...routeTo("/teams/$teamId")}
											params={{
												teamId: currentMatch.teamA.slug,
												lang,
											}}
											className="group flex items-center justify-center gap-2 border-black border-r-[3px] bg-ink px-3 py-3.5 text-white transition-all hover:bg-charcoal"
										>
											<TeamLogo
												teamName={currentMatch.teamA.name || t("matchCard.tbd")}
												logoUrl={currentMatch.teamA.logoUrl}
												size="sm"
											/>
											<span className="truncate font-black font-display text-[10px] uppercase tracking-tight sm:text-[11px]">
												{t("teamPage")}
											</span>
										</Link>
									) : (
										<div className="flex items-center justify-center gap-2 border-black border-r-[3px] bg-panel-gray py-3.5 text-white/50">
											<span className="font-body font-bold text-xs uppercase tracking-widest">
												{t("matchCard.tbd")}
											</span>
										</div>
									)}
									{currentMatch.teamB?.slug ? (
										<Link
											{...routeTo("/teams/$teamId")}
											params={{
												teamId: currentMatch.teamB.slug,
												lang,
											}}
											className="group flex items-center justify-center gap-2 bg-ink px-3 py-3.5 text-white transition-all hover:bg-charcoal"
										>
											<TeamLogo
												teamName={currentMatch.teamB.name || t("matchCard.tbd")}
												logoUrl={currentMatch.teamB.logoUrl}
												size="sm"
											/>
											<span className="truncate font-black font-display text-[10px] uppercase tracking-tight sm:text-[11px]">
												{t("teamPage")}
											</span>
										</Link>
									) : (
										<div className="flex items-center justify-center gap-2 bg-panel-gray py-3.5 text-white/50">
											<span className="font-body font-bold text-xs uppercase tracking-widest">
												{t("matchCard.tbd")}
											</span>
										</div>
									)}
								</div>
							</div>
						</motion.div>
					</AnimatePresence>
				</div>

				{/* Pagination — lime active, white idle, green complete */}
				<div className="mt-6 mb-12 flex items-center justify-center gap-2">
					{matches.map((match, i) => {
						const hasPrediction = isPredictionComplete(match.id);
						const canJump = canNavigateToIndex(i);
						return (
							<button
								key={match.id}
								type="button"
								onClick={() => {
									if (canJump) setCurrentIndex(i);
								}}
								disabled={!canJump}
								className={clsx(
									"h-2.5 rounded-full border-2 border-black transition-all duration-200",
									i === currentIndex
										? "w-8 bg-electric-lime"
										: hasPrediction
											? "w-2.5 bg-electric-lime/70 hover:bg-electric-lime"
											: canJump
												? "w-2.5 bg-white hover:bg-tape"
												: "w-2.5 cursor-not-allowed bg-white opacity-40",
								)}
								aria-label={t("matchCounter", {
									current: i + 1,
									total: matches.length,
								})}
							/>
						);
					})}
				</div>
			</main>
		</div>
	);
}
