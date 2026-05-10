import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GSLGroupView } from "./bracket/GSLGroupView";
import { StandardGroupView } from "./bracket/StandardGroupView";
import type { Match, Prediction, Team } from "./bracket/types";
export type { Match, Prediction, Team };

import { MatchCard } from "./bracket/MatchCard";

export function TournamentBracket({
	matches,
	predictions,
	onUpdatePrediction,
	onRemovePrediction,
	onReview,
	isReadOnly = false,
	className,
	hideHeader = false,
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
	onRemovePrediction?: (matchId: number) => void;
	onReview?: () => void;
	isReadOnly?: boolean;
	className?: string;
	hideHeader?: boolean;
	editableMatchIds?: Set<number>;
	matchDayStatus?: string | null;
}) {
	const { t } = useTranslation("betting");

	const projectedMatches = useMemo(() => {
		const projected = matches.map((m) => ({
			...m,
			teamA: m.teamA ? { ...m.teamA } : null,
			teamB: m.teamB ? { ...m.teamB } : null,
		}));

		const matchMap = new Map(projected.map((m) => [m.id, m]));

		for (let i = 0; i < 5; i++) {
			let changed = false;

			matches.forEach((originalMatch) => {
				const match = matchMap.get(originalMatch.id);
				if (!match) return;

				const prediction = predictions[match.id];
				const isFinished = match.status === "finished";
				const winnerId = isFinished ? match.winnerId : prediction?.winnerId;

				if (!winnerId) return;

				const winnerTeam =
					match.teamA && winnerId === match.teamA.id
						? match.teamA
						: match.teamB;
				const loserTeam =
					match.teamA && winnerId === match.teamA.id
						? match.teamB
						: match.teamA;

				if (!winnerTeam) return;

				if (match.nextMatchWinnerId) {
					const nextMatch = matchMap.get(match.nextMatchWinnerId);
					if (nextMatch) {
						if (
							match.nextMatchWinnerSlot === "A" &&
							nextMatch.teamA?.id !== winnerTeam.id
						) {
							nextMatch.teamA = winnerTeam;
							changed = true;
						}
						if (
							match.nextMatchWinnerSlot === "B" &&
							nextMatch.teamB?.id !== winnerTeam.id
						) {
							nextMatch.teamB = winnerTeam;
							changed = true;
						}
					}
				}

				if (match.nextMatchLoserId) {
					const nextMatch = matchMap.get(match.nextMatchLoserId);
					if (nextMatch) {
						if (
							match.nextMatchLoserSlot === "A" &&
							nextMatch.teamA?.id !== loserTeam?.id
						) {
							nextMatch.teamA = loserTeam;
							changed = true;
						}
						if (
							match.nextMatchLoserSlot === "B" &&
							nextMatch.teamB?.id !== loserTeam?.id
						) {
							nextMatch.teamB = loserTeam;
							changed = true;
						}
					}
				}
			});

			if (!changed) break;
		}

		projected.forEach((m) => {
			if (m.teamAPreviousMatchId) {
				const parent = matchMap.get(m.teamAPreviousMatchId);
				if (parent && parent.status !== "finished" && !predictions[parent.id]) {
					m.isLockedDependency = true;
				}
			}
			if (m.teamBPreviousMatchId) {
				const parent = matchMap.get(m.teamBPreviousMatchId);
				if (parent && parent.status !== "finished" && !predictions[parent.id]) {
					m.isLockedDependency = true;
				}
			}
		});

		return projected;
	}, [matches, predictions]);

	const {
		upperBracket,
		lowerBracket,
		grandFinal,
		thirdPlace,
		hasGroups,
		hasElimination,
	} = useMemo(() => {
		const upper: Record<number, Match[]> = {};
		const lower: Record<number, Match[]> = {};
		const gf: Match[] = [];
		const tp: Match[] = [];
		let foundGroups = false;

		projectedMatches.forEach((m) => {
			const side = m.bracketSide || "upper";
			const round = m.roundIndex ?? 0;

			if (side === "groups") {
				foundGroups = true;
				return;
			}

			if (side === "grand_final") {
				gf.push(m);
			} else if (side === "third_place") {
				tp.push(m);
			} else if (side === "lower") {
				if (!lower[round]) lower[round] = [];
				lower[round].push(m);
			} else {
				if (!upper[round]) upper[round] = [];
				upper[round].push(m);
			}
		});

		const sortMatches = (a: Match, b: Match) =>
			(a.displayOrder ?? 999) - (b.displayOrder ?? 999) || a.id - b.id;

		Object.values(upper).forEach((rm) => rm.sort(sortMatches));
		Object.values(lower).forEach((rm) => rm.sort(sortMatches));
		gf.sort(sortMatches);

		const foundElimination =
			Object.keys(upper).length > 0 ||
			Object.keys(lower).length > 0 ||
			gf.length > 0;

		return {
			upperBracket: upper,
			lowerBracket: lower,
			grandFinal: gf,
			thirdPlace: tp,
			hasGroups: foundGroups,
			hasElimination: foundElimination,
		};
	}, [projectedMatches]);

	const upperRounds = Object.keys(upperBracket)
		.map(Number)
		.sort((a, b) => a - b);
	const lowerRounds = Object.keys(lowerBracket)
		.map(Number)
		.sort((a, b) => a - b);

	const getRoundTitle = (
		side: "upper" | "lower" | "gf",
		idx: number,
	): string => {
		if (side === "gf") return t("rounds.grandFinal");

		if (side === "upper") {
			const isDouble = lowerRounds.length > 0 || grandFinal.length > 0;
			if (!isDouble) {
				const totalRounds = upperRounds.length;
				const reverseIdx = totalRounds - idx - 1;
				if (reverseIdx === 0) return t("rounds.final");
				if (reverseIdx === 1) return t("rounds.semiFinals");
				if (reverseIdx === 2) return t("rounds.quarterFinals");
				return t("rounds.round", { number: idx + 1 });
			}
			const deNames = [
				t("rounds.quarterFinals"),
				t("rounds.semiFinals"),
				t("rounds.ubFinal"),
			];
			return deNames[idx] || t("rounds.ubRound", { number: idx + 1 });
		}
		const lbNames = [
			t("rounds.lbR1"),
			t("rounds.lbR2"),
			t("rounds.lbSemi"),
			t("rounds.lbFinal"),
		];
		return lbNames[idx] || t("rounds.lbRound", { number: idx + 1 });
	};

	const bettableMatches = useMemo(() => {
		return matches.filter(
			(m) =>
				(m.isBettingEnabled !== false ||
					(matchDayStatus === "locked" && editableMatchIds?.has(m.id))) &&
				m.status === "scheduled" &&
				!m.isGhost,
		);
	}, [matches, matchDayStatus, editableMatchIds]);

	const allBetsComplete = bettableMatches.every(
		(m) =>
			predictions[m.id] &&
			predictions[m.id].winnerId &&
			predictions[m.id].score &&
			predictions[m.id].score.trim() !== "",
	);

	const hasPredictions = Object.keys(predictions).length > 0;
	const showReviewButton = onReview && hasPredictions && allBetsComplete;

	return (
		<div
			className={
				className ||
				"relative flex min-h-screen w-full flex-col items-center overflow-x-auto bg-paper p-6 font-body"
			}
		>
			{/* Paper texture overlay */}
			<div
				className="pointer-events-none fixed inset-0 opacity-[0.12] mix-blend-multiply"
				style={{
					backgroundImage:
						'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
					backgroundRepeat: "repeat",
				}}
			/>

			{/* Review Button - Fixed at bottom right */}
			{showReviewButton && (
				<div className="fixed right-6 bottom-24 z-[70]">
					<button
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							if (onReview) {
								onReview();
							}
						}}
						className="slide-in-from-bottom-4 flex animate-in cursor-pointer items-center gap-2 rounded-md border-2 border-black bg-brawl-red px-6 py-3 font-black text-sm text-white uppercase italic shadow-[4px_4px_0px_0px_#000] transition-all duration-300 hover:bg-[#d41d1d] hover:shadow-[6px_6px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
					>
						<span className="material-symbols-outlined text-lg">verified</span>
						Revisar Apostas
					</button>
				</div>
			)}

			{/* Header Container */}
			{!hideHeader && (
				<div className="relative z-10 mb-8 w-full text-center">
					<div className="mx-auto inline-block -rotate-1 transform">
						<div className="relative border-[#ccff00] border-b-4 bg-ink px-8 py-2 text-white shadow-[4px_4px_0px_0px_#000]">
							<h2 className="font-black font-display text-2xl uppercase italic tracking-tighter">
								{t("bracketTitle")}{" "}
								<span className="text-[#ccff00]">
									{t("bracketTitleHighlight")}
								</span>
							</h2>
						</div>
					</div>
				</div>
			)}

			<div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-16">
				{/* Groups Section */}
				{hasGroups && (
					<div className="flex flex-col gap-6">
						<div className="flex items-center gap-4">
							<div className="h-0.5 flex-grow bg-black/20" />
							<h3 className="-skew-x-6 transform rounded-md border-2 border-black bg-[#ccff00] px-4 py-1 font-black text-ink text-lg uppercase italic shadow-[2px_2px_0px_0px_#000]">
								{t("rounds.groupStage")}
							</h3>
							<div className="h-0.5 flex-grow bg-black/20" />
						</div>

						<div className="flex w-full flex-col gap-10">
							{Object.entries(
								projectedMatches
									.filter((m) => m.bracketSide === "groups")
									.reduce(
										(acc, match) => {
											const groupParams = match.label?.match(/Group\s+(\w+)/i);
											const groupName = groupParams
												? `Group ${groupParams[1]}`
												: match.label || t("rounds.groupStage");
											if (!acc[groupName]) acc[groupName] = [];
											acc[groupName].push(match);
											return acc;
										},
										{} as Record<string, Match[]>,
									),
							)
								.sort(([a], [b]) => a.localeCompare(b))
								.map(([groupName, groupMatches]) => {
									const groupMatchList = groupMatches as Match[];
									const isGSL =
										groupMatchList.length === 5 &&
										groupMatchList.some((m: Match) =>
											m.name?.includes("Opening"),
										);

									if (isGSL) {
										return (
											<GSLGroupView
												key={groupName}
												groupName={groupName}
												matches={groupMatchList}
												predictions={predictions}
												onUpdatePrediction={onUpdatePrediction}
												onRemovePrediction={onRemovePrediction}
												isReadOnly={isReadOnly}
											/>
										);
									}

									return (
										<StandardGroupView
											key={groupName}
											groupName={groupName}
											matches={groupMatchList}
											predictions={predictions}
											onUpdatePrediction={onUpdatePrediction}
											onRemovePrediction={onRemovePrediction}
											isReadOnly={isReadOnly}
										/>
									);
								})}
						</div>
					</div>
				)}

				{/* Elimination Section */}
				{hasElimination && (
					<div className="relative z-10 flex flex-col items-center gap-6">
						{!hideHeader && (
							<div className="flex w-full items-center gap-4">
								<div className="h-0.5 flex-grow bg-black/20" />
								<h3 className="-skew-x-6 transform rounded-md border-2 border-black bg-[#ccff00] px-4 py-1 font-black text-ink text-lg uppercase italic shadow-[2px_2px_0px_0px_#000]">
									{t("rounds.playoffBracket")}
								</h3>
								<div className="h-0.5 flex-grow bg-black/20" />
							</div>
						)}

						<div className="scrollbar-hide flex w-full flex-col gap-10 overflow-x-auto pb-8">
							{/* UPPER BRACKET */}
							{upperRounds.length > 0 && (
								<div className="flex flex-col gap-4">
									<div className="flex items-stretch gap-5 text-black">
										{upperRounds.map((roundIdx) => (
											<div
												key={`upper-${roundIdx}`}
												className="flex w-64 shrink-0 flex-col gap-2"
											>
												<div className="mb-1 flex justify-center">
													<span className="-skew-x-6 transform rounded-sm border-2 border-black bg-ink px-3 py-1 font-black text-[#ccff00] text-[10px] uppercase italic shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
														{getRoundTitle("upper", roundIdx)}
													</span>
												</div>
												<div className="flex h-full flex-col justify-around gap-3">
													{(upperBracket[roundIdx] || []).map((match) => (
														<MatchCard
															key={match.id}
															match={match}
															prediction={predictions[match.id]}
															onUpdatePrediction={onUpdatePrediction}
															onRemovePrediction={onRemovePrediction}
															isReadOnly={isReadOnly}
															editableMatchIds={editableMatchIds}
															matchDayStatus={matchDayStatus}
														/>
													))}
												</div>
											</div>
										))}

										{/* GRAND FINAL */}
										{grandFinal.length > 0 && (
											<div className="flex w-64 shrink-0 flex-col gap-2">
												<div className="mb-1 flex justify-center">
													<span className="-skew-x-6 transform rounded-sm border-2 border-black bg-ink px-3 py-1 font-black text-[#ccff00] text-[10px] uppercase italic shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
														{t("rounds.grandFinal")}
													</span>
												</div>
												<div className="flex h-full flex-col justify-around gap-3">
													{grandFinal.map((match) => (
														<MatchCard
															key={match.id}
															match={match}
															prediction={predictions[match.id]}
															onUpdatePrediction={onUpdatePrediction}
															onRemovePrediction={onRemovePrediction}
															isReadOnly={isReadOnly}
															editableMatchIds={editableMatchIds}
															matchDayStatus={matchDayStatus}
														/>
													))}
												</div>
											</div>
										)}
									</div>
								</div>
							)}

							{/* LOWER BRACKET */}
							{lowerRounds.length > 0 && (
								<div className="relative mt-8 border-black/10 border-t-2 border-dashed pt-6">
									<div className="absolute top-0 left-0 -translate-y-1/2 bg-paper pr-4">
										<div className="-skew-x-6 transform rounded-sm border-2 border-black bg-ink px-3 py-1 font-black text-[10px] text-white uppercase italic tracking-widest shadow-[2px_2px_0px_0px_#000]">
											{t("rounds.lowerBracket")}
										</div>
									</div>
									<div className="flex items-center gap-5">
										{lowerRounds.map((roundIdx) => (
											<div
												key={`lower-${roundIdx}`}
												className="flex w-64 shrink-0 flex-col gap-2"
											>
												<div className="mb-1 flex justify-center">
													<span className="-skew-x-6 transform rounded-sm border-2 border-black bg-white px-3 py-1 font-black text-[10px] text-ink uppercase italic shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
														{getRoundTitle("lower", roundIdx)}
													</span>
												</div>
												<div className="flex flex-col justify-around gap-3">
													{(lowerBracket[roundIdx] || []).map((match) => (
														<MatchCard
															key={match.id}
															match={match}
															prediction={predictions[match.id]}
															onUpdatePrediction={onUpdatePrediction}
															onRemovePrediction={onRemovePrediction}
															isReadOnly={isReadOnly}
															editableMatchIds={editableMatchIds}
															matchDayStatus={matchDayStatus}
														/>
													))}
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* THIRD PLACE — smaller, less prominent */}
							{thirdPlace.length > 0 && (
								<div className="relative mt-6 border-black/5 border-t pt-5">
									<div className="mx-auto flex max-w-sm flex-col items-center gap-3">
										<span className="rounded-sm border border-black/20 bg-white px-2 py-0.5 font-black text-[9px] text-gray-400 uppercase tracking-wider">
											{t("rounds.thirdPlace")}
										</span>
										{thirdPlace.map((match) => (
											<MatchCard
												key={match.id}
												match={match}
												prediction={predictions[match.id]}
												onUpdatePrediction={onUpdatePrediction}
												onRemovePrediction={onRemovePrediction}
												isReadOnly={isReadOnly}
												editableMatchIds={editableMatchIds}
												matchDayStatus={matchDayStatus}
											/>
										))}
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
