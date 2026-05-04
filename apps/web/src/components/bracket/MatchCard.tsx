import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { TeamLogo } from "../TeamLogo";
import type { Match, Prediction, Team } from "./types";

// --- SCORE PICKER (POPOVER) ---
const ScorePicker = ({
	winnerId,
	teamA,
	currentScore,
	onSelectScore,
	onClear,
	format,
}: {
	winnerId: number;
	teamA: Team;
	currentScore?: string;
	onSelectScore: (score: string) => void;
	onClear: () => void;
	format: "bo3" | "bo5" | "bo7";
}) => {
	const { t } = useTranslation("betting");
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const winsNeeded = format === "bo5" ? 3 : format === "bo3" ? 2 : 3;
	const isWinnerA = winnerId === teamA.id;
	const matchActiveColor = isWinnerA ? "brawl-blue" : "brawl-red";

	const options = [];
	for (let loserWins = 0; loserWins < winsNeeded; loserWins++) {
		const label = isWinnerA
			? `${winsNeeded} - ${loserWins}`
			: `${loserWins} - ${winsNeeded}`;
		options.push(label);
	}

	return (
		<div className={clsx("relative", isOpen && "z-[70]")} ref={containerRef}>
			<button
				onClick={(e) => {
					e.stopPropagation();
					setIsOpen(!isOpen);
				}}
				className={clsx(
					"flex h-7 items-center justify-center gap-1 border-2 border-black bg-white px-2 text-black shadow-[2px_2px_0px_0px_#000] transition-all active:translate-y-0.5 active:shadow-none",
					isOpen ? "relative z-50" : "z-10",
				)}
			>
				<span className="font-black text-[10px] italic">
					{currentScore || t("matchCard.score")}
				</span>
				<span className="material-symbols-outlined text-[10px]">
					expand_more
				</span>
			</button>

			{isOpen && (
				<div className="zoom-in-95 absolute top-full right-0 z-[100] mt-2 flex min-w-[130px] origin-top-right animate-in flex-col gap-2 border-[3px] border-black bg-white p-2 shadow-[4px_4px_0px_0px_#000] duration-100">
					<div className="mb-1 text-center font-black text-[9px] text-gray-500 uppercase">
						{t("matchCard.pickScore")}
					</div>
					<div className="flex flex-wrap justify-center gap-1.5">
						{options.map((opt) => (
							<button
								key={opt}
								onClick={(e) => {
									e.stopPropagation();
									onSelectScore(opt);
									setIsOpen(false);
								}}
								className={clsx(
									"w-full border-2 px-2 py-1 font-black text-[10px] transition-all",
									currentScore === opt
										? matchActiveColor === "brawl-blue"
											? "border-black bg-brawl-blue text-white"
											: "border-black bg-brawl-red text-white"
										: "border-black/10 bg-white text-black hover:border-black hover:bg-gray-50",
								)}
							>
								{opt}
							</button>
						))}
					</div>
					<div className="my-1 h-px bg-gray-200" />
					<button
						onClick={(e) => {
							e.stopPropagation();
							onClear();
							setIsOpen(false);
						}}
						className="py-1 font-bold text-[9px] text-brawl-red uppercase hover:bg-red-50"
					>
						{t("matchCard.clearPrediction")}
					</button>
				</div>
			)}
		</div>
	);
};

// --- MATCH CARD COMPONENT ---
export const MatchCard = ({
	match,
	prediction,
	onUpdatePrediction,
	onRemovePrediction,
	isReadOnly = false,
	editableMatchIds,
	matchDayStatus,
}: {
	match: Match;
	prediction?: Prediction;
	onUpdatePrediction: (
		matchId: number,
		winnerId: number,
		score?: string,
	) => void;
	onRemovePrediction?: (matchId: number) => void;
	isReadOnly?: boolean;
	editableMatchIds?: Set<number>;
	matchDayStatus?: string | null;
}) => {
	const { t } = useTranslation("betting");
	const isGhost =
		match.isGhost ||
		!match.teamA ||
		!match.teamB ||
		match.teamA?.name?.includes("TBD") ||
		match.teamB?.name?.includes("TBD") ||
		match.teamA?.name?.includes("Winner of") ||
		match.teamB?.name?.includes("Winner of") ||
		match.teamA?.name?.includes("Loser of") ||
		match.teamB?.name?.includes("Loser of");

	const isLocked = isGhost || match.isLockedDependency;
	const isBettingEnabled = match.isBettingEnabled ?? true;

	const isMatchStarted = match.status === "live" || match.status === "finished";
	const isWalkover = match.resultType === "wo";
	const walkoverDisplayScore = (() => {
		if (!isWalkover)
			return { a: t("walkover.forfeit"), b: t("walkover.forfeit") };

		if (match.winnerId && match.teamA && match.teamB) {
			return {
				a:
					match.winnerId === match.teamA.id
						? t("walkover.win")
						: t("walkover.forfeit"),
				b:
					match.winnerId === match.teamB.id
						? t("walkover.win")
						: t("walkover.forfeit"),
			};
		}

		if ((match.scoreA ?? 0) !== (match.scoreB ?? 0)) {
			return {
				a:
					(match.scoreA ?? 0) > (match.scoreB ?? 0)
						? t("walkover.win")
						: t("walkover.forfeit"),
				b:
					(match.scoreB ?? 0) > (match.scoreA ?? 0)
						? t("walkover.win")
						: t("walkover.forfeit"),
			};
		}

		if (match.teamAPreviousMatchId && !match.teamBPreviousMatchId) {
			return { a: t("walkover.win"), b: t("walkover.forfeit") };
		}

		if (!match.teamAPreviousMatchId && match.teamBPreviousMatchId) {
			return { a: t("walkover.forfeit"), b: t("walkover.win") };
		}

		if (!match.teamA && match.teamB) {
			return { a: t("walkover.forfeit"), b: t("walkover.win") };
		}

		if (match.teamA && !match.teamB) {
			return { a: t("walkover.win"), b: t("walkover.forfeit") };
		}

		return { a: t("walkover.forfeit"), b: t("walkover.forfeit") };
	})();
	const isMatchEditable =
		matchDayStatus !== "locked" || (editableMatchIds?.has(match.id) ?? false);
	const effectiveBettingEnabled =
		isBettingEnabled ||
		(matchDayStatus === "locked" && (editableMatchIds?.has(match.id) ?? false));
	const canInteract =
		!isLocked &&
		effectiveBettingEnabled &&
		!isMatchStarted &&
		!isReadOnly &&
		isMatchEditable;
	const blockedReason = (() => {
		if (isGhost) return t("blocked.waitingDefinition");
		if (match.isLockedDependency) return t("blocked.betPreviousFirst");
		if (!effectiveBettingEnabled) return t("blocked.outsideMatchDay");
		if (!isMatchEditable && matchDayStatus === "locked") {
			return t("blocked.recoveryUnavailable");
		}
		return t("blocked.betsUnavailable");
	})();

	if (isLocked && !isReadOnly) {
		return (
			<div className="group relative flex h-28 w-full flex-col items-center justify-center overflow-hidden rounded-md border-2 border-gray-300 bg-gray-100/60 shadow-[2px_2px_0px_0px_#d1d5db]">
				<div className="absolute top-0 left-0 h-1 w-full bg-black/5" />
				<div className="flex flex-col items-center gap-1 opacity-40 grayscale">
					<div className="flex items-center gap-6">
						<span className="w-20 truncate px-0.5 text-center font-black text-[10px] uppercase italic tracking-tighter">
							{match.labelTeamA || t("matchCard.tbd")}
						</span>
						<div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-black/20 border-dashed">
							<span className="font-black text-[8px] italic">
								{t("matchCard.vs")}
							</span>
						</div>
						<span className="w-20 truncate px-0.5 text-center font-black text-[10px] uppercase italic tracking-tighter">
							{match.labelTeamB || t("matchCard.tbd")}
						</span>
					</div>
				</div>
				<div className="mt-2 rounded border border-black/10 bg-black/5 px-3 py-1">
					<span className="font-black text-[8px] text-black/40 uppercase italic tracking-widest">
						{isReadOnly
							? t("blocked.waitingResults")
							: t("blocked.waitingPreviousBets")}
					</span>
				</div>
			</div>
		);
	}

	const showResult = isMatchStarted;
	const winnerId = showResult ? match.winnerId : prediction?.winnerId;

	const isWinnerA = match.teamA && winnerId === match.teamA.id;
	const isWinnerB = match.teamB && winnerId === match.teamB.id;

	const displayScoreA = showResult ? (match.scoreA ?? 0) : undefined;
	const displayScoreB = showResult ? (match.scoreB ?? 0) : undefined;

	return (
		<div
			className={clsx(
				"group relative z-10 w-full overflow-visible rounded-md border-2 border-black bg-white text-black shadow-[3px_3px_0px_0px_#000] transition-all duration-200",
				canInteract &&
					"cursor-pointer focus-within:z-[60] hover:z-50 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000] active:z-[60]",
				!canInteract &&
					!showResult &&
					!isReadOnly &&
					"cursor-not-allowed opacity-60",
			)}
		>
			{/* Status Badges */}
			{!canInteract && !showResult && !isReadOnly && (
				<div className="absolute -top-2 -right-2 z-20 rounded-sm border-2 border-black bg-gray-500 px-1.5 py-0.5 font-black text-[7px] text-white uppercase shadow-[1px_1px_0px_0px_#000]">
					{t("badges.closed")}
				</div>
			)}
			{match.status === "live" && (
				<div className="absolute -top-2 -right-2 z-20 animate-pulse rounded-sm border-2 border-black bg-brawl-red px-1.5 py-0.5 font-black text-[7px] text-white uppercase shadow-[1px_1px_0px_0px_#000]">
					{t("badges.live")}
				</div>
			)}
			{match.status === "finished" && (
				<div className="absolute -top-2 -right-2 z-20 rounded-sm border-2 border-black bg-ink px-1.5 py-0.5 font-black text-[7px] text-white uppercase shadow-[1px_1px_0px_0px_#000]">
					{t("badges.final")}
				</div>
			)}
			{match.status === "finished" && isWalkover && (
				<div className="absolute -top-2 right-12 z-20 rounded-sm border-2 border-black bg-brawl-red px-1.5 py-0.5 font-black text-[7px] text-white uppercase shadow-[1px_1px_0px_0px_#000]">
					{t("badges.wo")}
				</div>
			)}

			{/* Bet Result Badge */}
			{match.status === "finished" &&
				prediction &&
				prediction.pointsEarned !== undefined && (
					<div
						className={clsx(
							"group/badge absolute -right-2 -bottom-2 z-20 flex cursor-help items-center gap-1 rounded-sm border-2 border-black px-1.5 py-0.5 font-black text-[7px] uppercase shadow-[1px_1px_0px_0px_#000]",
							isWalkover || prediction.isCorrect
								? prediction.isUnderdogPick
									? "animate-pulse bg-gradient-to-r from-purple-600 to-pink-600 text-white"
									: "bg-green-500 text-white"
								: "bg-brawl-red text-white",
						)}
					>
						{/* Tooltip */}
						<div className="pointer-events-none absolute right-0 bottom-full z-[100] mb-2 hidden w-48 rounded border-2 border-white bg-black p-2 text-[10px] text-white shadow-lg group-hover/badge:block">
							<div className="space-y-1">
								{(() => {
									if (isWalkover) {
										return (
											<>
												<div className="font-bold text-yellow-300">
													{t("walkoverTitle")}
												</div>
												<div className="text-[9px] text-gray-300">
													{t("walkoverDescription")}
												</div>
												<div className="text-[9px] text-gray-300">
													{t("walkoverNote")}
												</div>
												<div className="mt-1 border-gray-600 border-t pt-1 font-bold text-yellow-300">
													{t("totalPoints", { count: prediction.pointsEarned })}
												</div>
											</>
										);
									}

									if (!prediction.isCorrect) {
										return (
											<>
												<div className="font-bold text-red-300">
													{t("prediction.incorrect")}
												</div>
												<div className="text-[9px] text-gray-300">
													{t("betLabel")}{" "}
													{match.teamA && match.teamA.id === prediction.winnerId
														? match.teamA.name
														: match.teamB?.name || t("teamB")}
												</div>
												<div className="text-[9px] text-gray-300">
													{t("actualWinner")}{" "}
													{match.teamA && match.teamA.id === match.winnerId
														? match.teamA.name
														: match.teamB?.name || t("teamB")}
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
											{prediction.isPerfectPick ? (
												<div className="text-[9px] text-gray-300">
													{t("perfectScore")} ({prediction.score})
												</div>
											) : (
												<div className="text-[9px] text-gray-300">
													{t("correctWinner")}
												</div>
											)}
											{prediction.isUnderdogPick && (
												<div className="text-[9px] text-purple-300">
													{t("bonus.underdog", { percent: 25 })}
												</div>
											)}
											<div className="mt-1 border-gray-600 border-t pt-1 font-bold text-yellow-300">
												{t("totalPoints", { count: prediction.pointsEarned })}
											</div>
										</>
									);
								})()}
							</div>
							<div className="absolute top-full right-4 h-0 w-0 border-transparent border-t-4 border-t-white border-r-4 border-l-4" />
						</div>

						{isWalkover || prediction.isCorrect
							? prediction.isUnderdogPick
								? "🔥"
								: isWalkover
									? "⚠"
									: "✓"
							: "✗"}
						<span>
							{prediction.pointsEarned > 0
								? `+${prediction.pointsEarned}`
								: prediction.pointsEarned}{" "}
							{t("matchCard.pts")}
						</span>
						{prediction.isUnderdogPick &&
							(isWalkover || prediction.isCorrect) && (
								<span className="ml-0.5 text-[6px]">🐕</span>
							)}
					</div>
				)}

			{/* Header */}
			<div className="flex h-7 items-center justify-between bg-ink px-2.5">
				<div className="flex-1 truncate font-black text-[8px] text-white uppercase tracking-wider">
					{match.name || match.label}
				</div>
				{match.startTime && (
					<div className="ml-2 flex shrink-0 items-center gap-1 font-black text-[#ccff00] text-[8px] italic">
						<span className="material-symbols-outlined text-[10px]">
							schedule
						</span>
						{new Date(match.startTime).toLocaleDateString("pt-BR", {
							day: "2-digit",
							month: "2-digit",
						})}{" "}
						-
						{new Date(match.startTime).toLocaleTimeString("pt-BR", {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</div>
				)}
			</div>

			{/* Content Container */}
			<div className="relative">
				{/* Helper for "Select Winner" state */}
				{!prediction && canInteract && !showResult && (
					<div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/5 opacity-0 transition-opacity group-hover:opacity-100">
						<span className="rounded bg-white/80 px-2 py-1 font-bold text-[10px] text-black/50 uppercase tracking-widest">
							{t("matchCard.selectWinner")}
						</span>
					</div>
				)}

				{/* Helper for LOCKED matches */}
				{!canInteract && !showResult && !isReadOnly && (
					<div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
						<div className="flex -rotate-1 transform flex-col items-center gap-1 border-2 border-[#ccff00] bg-black px-3 py-2 text-white shadow-[2px_2px_0px_0px_#000]">
							<span className="material-symbols-outlined text-sm">lock</span>
							<span className="text-center font-black text-[8px] uppercase leading-tight tracking-widest">
								{blockedReason}
							</span>
						</div>
					</div>
				)}

				{/* Team A Row */}
				<div
					onClick={() =>
						canInteract &&
						match.teamA &&
						onUpdatePrediction(
							match.id,
							match.teamA.id,
							isWinnerA ? prediction?.score : undefined,
						)
					}
					className={clsx(
						"relative flex h-12 items-center justify-between border-black/10 border-b px-2.5 py-1.5 transition-all duration-200",
						canInteract ? "cursor-pointer" : "",
						isWinnerA
							? showResult
								? "bg-[#ccff00] text-black"
								: "bg-brawl-blue"
							: "hover:bg-gray-50",
						showResult && !isWinnerA && "bg-gray-100 opacity-70",
					)}
				>
					{isWinnerA && (
						<div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
					)}

					<div className="relative z-10 flex min-w-0 flex-1 items-center gap-2 pr-2">
						<TeamLogo
							teamName={match.teamA?.name || t("matchCard.tbd")}
							logoUrl={match.teamA?.logoUrl}
							size="md"
							className=""
						/>
						<span
							className={clsx(
								"truncate pr-1 font-black text-[10px] uppercase italic",
								isWinnerA
									? showResult
										? "text-black"
										: "text-white"
									: "text-ink",
							)}
						>
							{match.teamA?.name || match.labelTeamA || t("matchCard.tbd")}
						</span>
					</div>

					<div className="flex items-center gap-2">
						{showResult ? (
							<span
								className={clsx(
									"font-black text-lg italic",
									isWinnerA
										? showResult
											? "text-black"
											: "text-white"
										: "text-gray-400",
								)}
							>
								{isWalkover ? walkoverDisplayScore.a : displayScoreA}
							</span>
						) : (
							isWinnerA && (
								<>
									<div className="h-2 w-2 animate-pulse rounded-full bg-[#ccff00]" />
									{isReadOnly ? (
										<span className="px-2 font-black text-white text-xs italic">
											{prediction?.score || t("matchCard.defaultScore")}
										</span>
									) : (
										match.teamA && (
											<ScorePicker
												winnerId={match.teamA.id}
												teamA={match.teamA}
												currentScore={prediction?.score}
												format={match.format}
												onSelectScore={(score) =>
													onUpdatePrediction(match.id, match.teamA!.id, score)
												}
												onClear={() => onRemovePrediction?.(match.id)}
											/>
										)
									)}
								</>
							)
						)}
					</div>
				</div>

				{/* Team B Row */}
				<div
					onClick={() =>
						canInteract &&
						match.teamB &&
						onUpdatePrediction(
							match.id,
							match.teamB.id,
							isWinnerB ? prediction?.score : undefined,
						)
					}
					className={clsx(
						"relative flex h-12 items-center justify-between px-2.5 py-1.5 transition-all duration-200",
						canInteract ? "cursor-pointer" : "",
						isWinnerB
							? showResult
								? "bg-[#ccff00] text-black"
								: "bg-brawl-red"
							: "hover:bg-gray-50",
						showResult && !isWinnerB && "bg-gray-100 opacity-70",
					)}
				>
					{isWinnerB && (
						<div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
					)}

					<div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
						<TeamLogo
							teamName={match.teamB?.name || t("matchCard.tbd")}
							logoUrl={match.teamB?.logoUrl}
							size="md"
							className=""
						/>
						<span
							className={clsx(
								"truncate pr-1 font-black text-[10px] uppercase italic",
								isWinnerB
									? showResult
										? "text-black"
										: "text-white"
									: "text-ink",
							)}
						>
							{match.teamB?.name || match.labelTeamB || t("matchCard.tbd")}
						</span>
					</div>

					<div className="flex items-center gap-2">
						{showResult ? (
							<span
								className={clsx(
									"font-black text-lg italic",
									isWinnerB
										? showResult
											? "text-black"
											: "text-white"
										: "text-gray-400",
								)}
							>
								{isWalkover ? walkoverDisplayScore.b : displayScoreB}
							</span>
						) : (
							isWinnerB && (
								<>
									<div className="h-2 w-2 animate-pulse rounded-full bg-[#ccff00]" />
									{isReadOnly ? (
										<span className="px-2 font-black text-white text-xs italic">
											{prediction?.score || t("matchCard.defaultScore")}
										</span>
									) : (
										match.teamB && (
											<ScorePicker
												winnerId={match.teamB.id}
												teamA={match.teamA!}
												currentScore={prediction?.score}
												format={match.format}
												onSelectScore={(score) =>
													onUpdatePrediction(match.id, match.teamB!.id, score)
												}
												onClear={() => onRemovePrediction?.(match.id)}
											/>
										)
									)}
								</>
							)
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
