import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { BetSplitBar } from "@/components/BetSplitBar";
import { SpraySplat } from "@/components/betting/BettingDecor";
import type { Prediction } from "@/components/bracket/types";
import { TeamLogo } from "@/components/TeamLogo";
import type { BetStats } from "@/server/bets";
import { isMatchPickEditable } from "@/utils/bet-submission";
import {
	canOpenRecoveryScoreEditor,
	getRecoveryReviewScoreLabel,
} from "@/utils/recovery";
import {
	formatScoreDisplay,
	normalizeScoreDisplay,
	scoresEqual,
} from "@/utils/score-format";

type ReviewMatchCardProps = {
	match: any;
	idx: number;
	prediction?: Prediction;
	betData?: any;
	isReadOnly: boolean;
	matchDayStatus?: string;
	stalePredictionMatchIds?: Set<number>;
	editableRecoveryMatchIds?: Set<number>;
	predictions: Record<number, Prediction>;
	editingScoreMatchId: number | null;
	setEditingScoreMatchId: (id: number | null) => void;
	onUpdatePrediction: (
		matchId: number,
		winnerId: number,
		score?: string,
	) => void;
	betStats?: BetStats;
	locale: string;
};

export function ReviewMatchCard({
	match,
	idx,
	prediction,
	betData,
	isReadOnly,
	matchDayStatus,
	stalePredictionMatchIds,
	editableRecoveryMatchIds,
	predictions,
	editingScoreMatchId,
	setEditingScoreMatchId,
	onUpdatePrediction,
	betStats,
	locale,
}: ReviewMatchCardProps) {
	const { t } = useTranslation("betting");
	const mId = Number(match.id);

	const showResult = match.status === "live" || match.status === "finished";
	const isEditingScore =
		editingScoreMatchId !== null && Number(editingScoreMatchId) === mId;

	const hasValidLocalPick =
		!!prediction?.winnerId &&
		(Number(prediction.winnerId) === Number(match.teamA?.id) ||
			Number(prediction.winnerId) === Number(match.teamB?.id));

	const predictedTeamNotInMatch =
		!!betData?.predictedWinnerId &&
		!!match.teamA?.id &&
		!!match.teamB?.id &&
		![Number(match.teamA.id), Number(match.teamB.id)].includes(
			Number(betData.predictedWinnerId),
		) &&
		!hasValidLocalPick;

	const isInvalidPrediction = predictedTeamNotInMatch && !showResult;

	const isStalePrediction =
		stalePredictionMatchIds &&
		Array.from(stalePredictionMatchIds).some(
			(id: number) => Number(id) === mId,
		);

	const effectivePrediction =
		betData && match.winnerId !== null
			? {
					winnerId: betData.predictedWinnerId,
					score: formatScoreDisplay(
						betData.predictedScoreA,
						betData.predictedScoreB,
					),
				}
			: prediction;

	const isWinnerA =
		effectivePrediction?.winnerId !== undefined &&
		match.teamA?.id !== undefined &&
		Number(effectivePrediction.winnerId) === Number(match.teamA.id);
	const isWinnerB =
		effectivePrediction?.winnerId !== undefined &&
		match.teamB?.id !== undefined &&
		Number(effectivePrediction.winnerId) === Number(match.teamB.id);

	const isWalkoverResult = showResult && match.resultType === "wo";
	const walkoverDisplay = (() => {
		if (!isWalkoverResult) {
			return { a: "FF", b: "FF" };
		}

		if (match.winnerId && match.teamA?.id && match.teamB?.id) {
			return {
				a: Number(match.winnerId) === Number(match.teamA.id) ? "W" : "FF",
				b: Number(match.winnerId) === Number(match.teamB.id) ? "W" : "FF",
			};
		}

		if ((match.scoreA ?? 0) !== (match.scoreB ?? 0)) {
			return {
				a: (match.scoreA ?? 0) > (match.scoreB ?? 0) ? "W" : "FF",
				b: (match.scoreB ?? 0) > (match.scoreA ?? 0) ? "W" : "FF",
			};
		}

		if (match.teamAPreviousMatchId && !match.teamBPreviousMatchId) {
			return { a: "W", b: "FF" };
		}

		if (!match.teamAPreviousMatchId && match.teamBPreviousMatchId) {
			return { a: "FF", b: "W" };
		}

		if (!match.teamA?.id && match.teamB?.id) {
			return { a: "W", b: "FF" };
		}

		if (match.teamA?.id && !match.teamB?.id) {
			return { a: "FF", b: "W" };
		}

		return { a: "FF", b: "FF" };
	})();

	const isActualWinnerA = showResult
		? isWalkoverResult
			? walkoverDisplay.a === "W"
			: Number(match.winnerId) === Number(match.teamA?.id)
		: false;
	const isActualWinnerB = showResult
		? isWalkoverResult
			? walkoverDisplay.b === "W"
			: Number(match.winnerId) === Number(match.teamB?.id)
		: false;

	const matchActiveColor =
		isActualWinnerA || (!showResult && isWinnerA) ? "brawl-blue" : "brawl-red";
	const displayScore = normalizeScoreDisplay(
		showResult
			? isWalkoverResult
				? `${walkoverDisplay.a} - ${walkoverDisplay.b}`
				: formatScoreDisplay(match.scoreA ?? 0, match.scoreB ?? 0)
			: effectivePrediction?.score
				? effectivePrediction.score
				: betData
					? formatScoreDisplay(betData.predictedScoreA, betData.predictedScoreB)
					: "? - ?",
	);

	const winsNeeded =
		match.format === "bo5" ? 3 : match.format === "bo3" ? 2 : 4;
	const scoreOptions: string[] = [];
	for (let loserWins = 0; loserWins < winsNeeded; loserWins++) {
		const label = isWinnerA
			? formatScoreDisplay(winsNeeded, loserWins)
			: formatScoreDisplay(loserWins, winsNeeded);
		scoreOptions.push(label);
	}

	const currentMatchDayStatus = match.matchDayStatus || matchDayStatus;

	const isRecoveryMatch =
		currentMatchDayStatus === "locked" &&
		editableRecoveryMatchIds &&
		(editableRecoveryMatchIds.has(mId) ||
			editableRecoveryMatchIds.has(Number(match.id)));

	const canEditPick = isMatchPickEditable({
		matchDayStatus: currentMatchDayStatus,
		isReadOnly,
		matchStatus: match.status,
		isRecoveryMatch,
		serverBet: betData,
		teamAId: match.teamA?.id ? Number(match.teamA.id) : null,
		teamBId: match.teamB?.id ? Number(match.teamB.id) : null,
	});
	const canOpenScoreEditor = canOpenRecoveryScoreEditor({
		isEditableInRecovery: canEditPick,
		hasSelectedWinner: Boolean(effectivePrediction?.winnerId),
		showResult,
	});
	const serverBetScore = betData
		? formatScoreDisplay(betData.predictedScoreA, betData.predictedScoreB)
		: "? - ?";
	const reviewBadgeScore = normalizeScoreDisplay(
		getRecoveryReviewScoreLabel({
			displayScore,
			serverScore: serverBetScore,
			canOpenScoreEditor,
		}),
	);
	const selectedScoreNormalized = effectivePrediction?.score
		? normalizeScoreDisplay(effectivePrediction.score)
		: "";

	const canEdit = canEditPick;

	const teamAName = match.teamA?.name ?? match.labelTeamA ?? t("matchCard.tbd");
	const teamBName = match.teamB?.name ?? match.labelTeamB ?? t("matchCard.tbd");
	const isPerfect = Boolean(betData?.isPerfectPick) && match.winnerId !== null;
	const isUnderdog =
		Boolean(betData?.isUnderdogPick) &&
		match.winnerId !== null &&
		!betData?.isPerfectPick;

	const spraySide: "blue" | "red" | null = isWinnerA
		? "blue"
		: isWinnerB
			? "red"
			: null;

	return (
		<div
			className={clsx(
				"pointer-events-auto relative mb-4 w-full transform overflow-visible border-[4px] bg-paper shadow-comic-lg transition-all duration-200 hover:-translate-y-1",
				isRecoveryMatch
					? "border-brawl-yellow"
					: isPerfect
						? "border-electric-lime"
						: "border-black",
				!canEditPick && !showResult && "opacity-60",
			)}
		>
			{/* Match Header Bar */}
			<div
				className={clsx(
					"relative z-10 flex items-center justify-between border-black border-b-[4px] px-4 py-1.5",
					isPerfect
						? "surface-lime"
						: isUnderdog
							? "surface-yellow"
							: "surface-charcoal",
				)}
			>
				<div className="flex min-w-0 flex-wrap items-center gap-2">
					<span
						className={clsx(
							"truncate font-body font-bold text-[10px] uppercase tracking-widest md:text-xs",
							isPerfect || isUnderdog ? "text-black" : "text-white",
						)}
					>
						{match.label ||
							match.name ||
							t("review.matchFallback", { number: idx + 1 })}
					</span>
					{isRecoveryMatch && (
						<span className="flex items-center gap-1 border-2 border-black bg-brawl-yellow px-2 py-0.5 font-body font-bold text-[8px] text-black uppercase tracking-widest">
							{t("review.recoveryBadge")}
						</span>
					)}
					{!isRecoveryMatch &&
						currentMatchDayStatus === "locked" &&
						!isWalkoverResult &&
						betData?.isRecovery && (
							<span className="flex items-center gap-1 border-2 border-black bg-electric-lime px-2 py-0.5 font-body font-bold text-[8px] text-black uppercase tracking-widest">
								{t("review.betSent")}
							</span>
						)}
					{isPerfect && (
						<span className="flex items-center gap-1 border-2 border-black bg-ink px-2 py-0.5 font-body font-bold text-[8px] text-electric-lime uppercase tracking-widest">
							{t("review.perfectPick")}
						</span>
					)}
					{isUnderdog && (
						<span className="flex items-center gap-1 border-2 border-black bg-ink px-2 py-0.5 font-body font-bold text-[8px] text-brawl-yellow uppercase tracking-widest">
							{t("review.underdogPick")}
						</span>
					)}
				</div>
				<div
					className={clsx(
						"flex shrink-0 items-center gap-1 font-body font-bold text-[10px] tabular-nums",
						isPerfect || isUnderdog ? "text-black" : "text-electric-lime",
					)}
					suppressHydrationWarning
				>
					<span className="material-symbols-outlined text-xs">schedule</span>
					{new Date(match.startTime).toLocaleTimeString(locale, {
						hour: "2-digit",
						minute: "2-digit",
						timeZone: "America/Sao_Paulo",
					})}
				</div>
			</div>

			{/* Match Body */}
			<div
				className={clsx(
					"group relative flex h-auto flex-col overflow-visible md:flex-row",
					showResult || isEditingScore
						? "min-h-[120px] md:min-h-[112px]"
						: "min-h-[140px] md:min-h-[112px]",
				)}
			>
				{/* Paper crumple texture (clipped so badges can hang off) */}
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
				>
					<img
						src="/landing/paper-crumple.jpg"
						alt=""
						draggable={false}
						className="absolute inset-0 h-full w-full object-cover opacity-55"
					/>
					<img
						src="/betting/paper-sticker.jpg"
						alt=""
						draggable={false}
						className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-multiply"
					/>
					<div className="absolute inset-0 bg-paper/35" />
				</div>

				{spraySide && (
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 z-[1] overflow-hidden opacity-40"
					>
						<SpraySplat
							variant={spraySide}
							maskIndex={(mId % 6) + 1}
							rotate={spraySide === "blue" ? -14 : 24}
							className={clsx(
								"absolute top-1/2 h-[120%] w-[55%] -translate-y-1/2",
								spraySide === "blue" ? "left-[-8%]" : "right-[-8%]",
							)}
						/>
					</div>
				)}

				{/* Team A */}
				<button
					type="button"
					disabled={!canEdit || match.teamA?.id === undefined}
					onClick={() => {
						if (canEdit && match.teamA?.id !== undefined) {
							onUpdatePrediction(
								match.id,
								match.teamA.id,
								isInvalidPrediction ? "" : undefined,
							);
						}
					}}
					className={clsx(
						"pointer-events-auto relative z-20 flex min-w-0 flex-1 items-center justify-start border-black/10 border-b-2 px-4 text-left transition-all duration-300 hover:z-40 md:border-r-2 md:border-b-0 md:py-4 md:pr-14 md:pl-6",
						showResult || isEditingScore
							? "pt-3 pb-7 md:py-4"
							: "pt-6 pb-6 md:py-4",
						canEdit ? "cursor-pointer" : "cursor-default",
						isActualWinnerA
							? "surface-lime"
							: isWinnerA
								? "surface-brawl-blue"
								: "bg-transparent text-ink hover:bg-white/40",
						showResult && !isActualWinnerA && "opacity-50 grayscale",
					)}
				>
					{isWinnerA && (
						<div className="absolute top-1.5 left-2 z-30 border border-black bg-white px-2 py-0.5 font-body font-bold text-[8px] text-black uppercase tracking-widest shadow-comic-sm md:text-[9px]">
							{t("review.pickBadge")}
						</div>
					)}
					<div className="relative z-10 flex w-full items-center justify-start gap-3 overflow-hidden md:gap-4">
						<TeamLogo
							teamName={teamAName}
							logoUrl={match.teamA?.logoUrl}
							size="lg"
							className="h-10 w-10 shrink-0 drop-shadow-md md:h-14 md:w-14"
						/>
						<span
							className={clsx(
								"-skew-x-6 transform truncate px-1 font-black font-display text-lg uppercase italic leading-[1.1] tracking-tighter md:flex-1 md:text-2xl",
								isActualWinnerA
									? "text-black"
									: isWinnerA
										? "text-white"
										: showResult
											? "text-zinc-500"
											: "text-zinc-500",
							)}
						>
							{teamAName}
						</span>
					</div>
				</button>

				{/* Team B */}
				<button
					type="button"
					disabled={!canEdit || match.teamB?.id === undefined}
					onClick={() => {
						if (canEdit && match.teamB?.id !== undefined) {
							onUpdatePrediction(
								match.id,
								match.teamB.id,
								isInvalidPrediction ? "" : undefined,
							);
						}
					}}
					className={clsx(
						"pointer-events-auto relative z-20 flex min-w-0 flex-1 items-center justify-start border-black/10 px-4 text-left transition-all duration-300 hover:z-40 md:justify-end md:border-l-2 md:py-4 md:pr-6 md:pl-14",
						showResult || isEditingScore
							? "pt-7 pb-3 md:py-4"
							: "pt-6 pb-6 md:py-4",
						canEdit ? "cursor-pointer" : "cursor-default",
						isActualWinnerB
							? "surface-lime"
							: isWinnerB
								? "surface-brawl-red"
								: "bg-transparent text-ink hover:bg-white/40",
						showResult && !isActualWinnerB && "opacity-50 grayscale",
					)}
				>
					{isWinnerB && (
						<div className="absolute top-1.5 right-2 z-30 border border-black bg-white px-2 py-0.5 font-body font-bold text-[8px] text-black uppercase tracking-widest shadow-comic-sm md:text-[9px]">
							{t("review.pickBadge")}
						</div>
					)}
					<div className="relative z-10 flex w-full flex-row items-center justify-start gap-3 overflow-hidden md:flex-row md:justify-end md:gap-4">
						<TeamLogo
							teamName={teamBName}
							logoUrl={match.teamB?.logoUrl}
							size="lg"
							className="h-10 w-10 shrink-0 drop-shadow-md md:h-14 md:w-14"
						/>
						<span
							className={clsx(
								"-skew-x-6 transform truncate px-1 text-left font-black font-display text-lg uppercase italic leading-[1.1] tracking-tighter md:flex-1 md:text-right md:text-2xl",
								isActualWinnerB
									? "text-black"
									: isWinnerB
										? "text-white"
										: showResult
											? "text-zinc-500"
											: "text-zinc-500",
							)}
						>
							{teamBName}
						</span>
					</div>
				</button>

				{predictedTeamNotInMatch && (
					<div className="pointer-events-none absolute -top-2 left-1/2 z-50 -translate-x-1/2 -rotate-1 transform whitespace-nowrap border-[2px] border-black bg-brawl-yellow px-2 py-0.5 shadow-comic-sm">
						<span className="font-body font-bold text-[8px] text-black uppercase tracking-widest">
							{t("recovery.wrongMatchup")}
						</span>
					</div>
				)}

				{(isEditingScore ||
					betData ||
					(!!effectivePrediction?.winnerId && !showResult)) && (
					<div
						className={clsx(
							"absolute left-1/2 z-50 -translate-x-1/2 transition-all duration-300",
							"top-1/2 -translate-y-1/2 md:top-auto md:-bottom-2 md:translate-y-0",
						)}
					>
						{isEditingScore && canEditPick ? (
							<div className="zoom-in-95 flex -rotate-1 animate-in gap-1 border-[3px] border-black bg-white p-1 shadow-comic-md duration-200">
								{scoreOptions.map((opt) => (
									<button
										key={opt}
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onUpdatePrediction(
												match.id,
												prediction?.winnerId ||
													effectivePrediction?.winnerId ||
													0,
												opt,
											);
											setEditingScoreMatchId(null);
										}}
										className={clsx(
											"border-2 px-2 py-1 font-black font-display text-xs italic transition-all",
											scoresEqual(selectedScoreNormalized, opt)
												? matchActiveColor === "brawl-blue"
													? "border-black bg-brawl-blue text-white"
													: "border-black bg-brawl-red text-white"
												: "border-transparent bg-white text-gray-400 hover:border-gray-200 hover:text-black",
										)}
									>
										{opt}
									</button>
								))}
							</div>
						) : showResult && betData ? (
							<div className="flex flex-row items-center gap-2">
								<div className="-rotate-1 border-[3px] border-black bg-charcoal px-4 py-1 shadow-comic-md">
									<span className="font-black font-display text-sm text-white italic">
										{displayScore}
									</span>
								</div>
								<div
									className={clsx(
										"rotate-1 border-[2px] border-black px-2 py-1 shadow-comic-sm",
										isPerfect
											? "surface-lime"
											: betData.predictedWinnerId === match.winnerId
												? "bg-electric-lime/30 text-black"
												: "bg-bsen-red/15 text-bsen-red",
									)}
								>
									<div className="flex flex-col items-center leading-none">
										<span className="mb-0.5 font-body font-bold text-[6px] uppercase tracking-widest md:text-[7px]">
											{t("review.pickBadge")}
										</span>
										<span className="font-black font-display text-[10px] italic md:text-sm">
											{formatScoreDisplay(
												betData.predictedScoreA,
												betData.predictedScoreB,
											)}
										</span>
									</div>
								</div>
							</div>
						) : (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									if (canOpenScoreEditor) {
										setEditingScoreMatchId(mId);
									}
								}}
								disabled={!canOpenScoreEditor}
								className={clsx(
									"rotate-1 border-[2px] border-black px-2 py-1 shadow-comic-sm",
									canOpenScoreEditor &&
										"cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0.5",
									matchActiveColor === "brawl-blue"
										? "surface-brawl-blue"
										: "surface-brawl-red",
								)}
							>
								<div className="flex flex-col items-center leading-none">
									<span className="mb-0.5 font-body font-bold text-[6px] text-white uppercase tracking-widest md:text-[7px]">
										{t("review.pickBadge")}
									</span>
									<span className="font-black font-display text-[10px] text-white italic md:text-sm">
										{reviewBadgeScore}
									</span>
								</div>
							</button>
						)}
					</div>
				)}

				{/* Points Badge */}
				{match.status === "finished" &&
					betData &&
					betData.pointsEarned !== undefined && (
						<div
							className={clsx(
								"group/badge absolute -right-2 -bottom-2 z-20 flex cursor-help items-center gap-1.5 border-2 px-2 py-1 font-body font-bold text-[8px] uppercase tracking-widest",
								(() => {
									const isCorrect =
										match.winnerId === betData.predictedWinnerId;
									if (!isCorrect) return "border-black bg-bsen-red text-white";
									if (betData.isPerfectPick) return "surface-lime border-black";
									if (betData.isUnderdogPick)
										return "surface-yellow border-black";
									return "border-black bg-electric-lime text-black";
								})(),
							)}
						>
							<div className="pointer-events-none absolute right-0 bottom-full z-[100] mb-2 hidden w-52 border-2 border-white bg-ink p-2 font-body text-[10px] text-white shadow-comic-lg group-hover/badge:block">
								<div className="space-y-1">
									{(() => {
										const isCorrect =
											match.winnerId === betData.predictedWinnerId;

										if (predictedTeamNotInMatch) {
											return (
												<>
													<div className="font-body font-bold text-brawl-yellow">
														{t("review.differentMatchup")}
													</div>
													<div className="font-body text-[9px] text-white/70">
														{t("recovery.matchupLabel")}
													</div>
													<div className="mt-1 border-white/20 border-t pt-1 font-body font-bold text-bsen-red">
														{t("totalPoints", { count: 0 })}
													</div>
												</>
											);
										}

										if (!isCorrect) {
											if (isWalkoverResult) {
												return (
													<>
														<div className="font-body font-bold text-bsen-red">
															{t("review.incorrectWo")}
														</div>
														<div className="font-body text-[9px] text-white/70">
															{t("review.woOnlyWinner")}
														</div>
														<div className="font-body text-[9px] text-white/70">
															{t("recovery.wrongWinner")}
														</div>
														<div className="mt-1 border-white/20 border-t pt-1 font-body font-bold">
															{t("totalPoints", { count: 0 })}
														</div>
													</>
												);
											}

											return (
												<>
													<div className="font-body font-bold text-bsen-red">
														{t("review.incorrectPick")}
													</div>
													<div className="font-body text-[9px] text-white/70">
														{t("betLabel")}{" "}
														{match.teamA?.id === betData.predictedWinnerId
															? match.teamA?.name
															: match.teamB?.name}
													</div>
													<div className="font-body text-[9px] text-white/70">
														{t("actualWinner")}{" "}
														{match.teamA?.id === match.winnerId
															? match.teamA?.name
															: match.teamB?.name}
													</div>
													<div className="mt-1 border-white/20 border-t pt-1 font-body font-bold">
														{t("totalPoints", { count: 0 })}
													</div>
												</>
											);
										}

										return (
											<>
												{isWalkoverResult && (
													<div className="font-body font-bold text-brawl-yellow">
														{t("review.woConfirmed")}
													</div>
												)}
												{betData.isPerfectPick ? (
													<div className="font-body font-bold text-electric-lime">
														{t("review.perfectScoreBanner")}
													</div>
												) : (
													<div className="font-body font-bold text-electric-lime">
														{isWalkoverResult
															? t("review.woBreakdown")
															: t("review.pointsBreakdown")}
													</div>
												)}

												{(() => {
													const rules = match.scoringRules || {
														winner: 1,
														exact: 3,
														underdog_25: 2,
														underdog_50: 1,
														underdog_tier1_max_pct: 0.25,
														underdog_tier2_max_pct: 0.5,
													};

													let winnerPoints = 0;
													let exactPoints = 0;
													let underdogPoints = 0;

													if (isWalkoverResult) {
														winnerPoints = rules.winner;
													} else if (betData.isPerfectPick) {
														exactPoints = rules.exact;
													} else {
														winnerPoints = rules.winner;
													}

													if (betData.isUnderdogPick) {
														underdogPoints =
															betData.pointsEarned -
															(exactPoints || winnerPoints);
													}

													return (
														<div className="space-y-0.5 font-body text-[9px]">
															{isWalkoverResult ? (
																<div className="flex justify-between font-body text-white/70">
																	<span>{t("review.correctWinnerWo")}</span>
																	<span>+{winnerPoints} pt</span>
																</div>
															) : betData.isPerfectPick ? (
																<div className="flex justify-between font-body font-bold text-electric-lime">
																	<span>
																		{t("review.exactScoreLine", {
																			score: formatScoreDisplay(
																				betData.predictedScoreA,
																				betData.predictedScoreB,
																			),
																		})}
																	</span>
																	<span>+{exactPoints} pts</span>
																</div>
															) : (
																<div className="flex justify-between font-body text-white/70">
																	<span>{t("correctWinner")}</span>
																	<span>+{winnerPoints} pt</span>
																</div>
															)}
															{!isWalkoverResult &&
																betData.isUnderdogPick &&
																underdogPoints > 0 && (
																	<div className="flex justify-between font-body font-bold text-brawl-yellow">
																		<span>
																			{t("bonus.underdog", { percent: 25 })}
																		</span>
																		<span>+{underdogPoints} pts</span>
																	</div>
																)}
														</div>
													);
												})()}

												<div
													className={clsx(
														"mt-1 flex justify-between border-t pt-1 font-body font-bold",
														betData.isPerfectPick
															? "border-electric-lime text-electric-lime"
															: "border-white/20 text-brawl-yellow",
													)}
												>
													<span>{t("review.totalShort")}:</span>
													<span>+{betData.pointsEarned} pts</span>
												</div>
											</>
										);
									})()}
								</div>
								<div className="absolute top-full right-4 h-0 w-0 border-transparent border-t-4 border-t-white border-r-4 border-l-4" />
							</div>

							<span className="whitespace-nowrap tabular-nums">
								{betData.pointsEarned > 0
									? `+${betData.pointsEarned}`
									: betData.pointsEarned}{" "}
								{t("review.pts")}
							</span>
						</div>
					)}
			</div>

			{isInvalidPrediction && (
				<div className="pointer-events-none absolute inset-x-0 -bottom-8 z-50 flex justify-center">
					<div className="rotate-1 animate-pulse border-2 border-black bg-bsen-red px-3 py-1 shadow-comic-md">
						<span className="flex items-center gap-1.5 font-body font-bold text-[9px] text-white uppercase leading-none tracking-widest">
							<span className="material-symbols-outlined text-xs">warning</span>
							{t("review.bracketChanged")}
						</span>
					</div>
				</div>
			)}

			{isStalePrediction && !isInvalidPrediction && !isRecoveryMatch && (
				<div className="pointer-events-none absolute inset-x-0 -bottom-8 z-50 flex justify-center">
					<div className="-rotate-1 animate-pulse border-2 border-black bg-brawl-yellow px-3 py-1 shadow-comic-md">
						<span className="flex items-center gap-1.5 font-body font-bold text-[9px] text-black uppercase leading-none tracking-widest">
							<span className="material-symbols-outlined text-xs">refresh</span>
							{t("review.stalePick")}
						</span>
					</div>
				</div>
			)}

			{!canEditPick && !showResult && betData && (
				<div className="absolute inset-x-0 -bottom-8 z-50 flex justify-center">
					<div className="border-2 border-black bg-panel-gray px-3 py-1 shadow-comic-md">
						<span className="flex items-center gap-1.5 font-body font-bold text-[9px] text-white uppercase leading-none tracking-widest">
							<span className="material-symbols-outlined text-xs">lock</span>
							{t("review.lockedAlreadyPicked")}
						</span>
					</div>
				</div>
			)}
			{!canEditPick &&
				!showResult &&
				!betData &&
				currentMatchDayStatus === "locked" && (
					<div className="absolute inset-x-0 -bottom-8 z-50 flex justify-center">
						<div className="border-2 border-black bg-panel-gray px-3 py-1 shadow-comic-md">
							<span className="flex items-center gap-1.5 font-body font-bold text-[9px] text-white uppercase leading-none tracking-widest">
								<span className="material-symbols-outlined text-xs">lock</span>
								{t("review.locked")}
							</span>
						</div>
					</div>
				)}

			{betStats && match.teamA?.id && match.teamB?.id && (
				<div className="w-full">
					<BetSplitBar
						teamAName={teamAName}
						teamBName={teamBName}
						stats={betStats}
						compact
					/>
				</div>
			)}
		</div>
	);
}
