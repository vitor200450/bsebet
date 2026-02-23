import { useMemo } from "react";
import { GSLGroupView } from "./bracket/GSLGroupView";
import { StandardGroupView } from "./bracket/StandardGroupView";
import type { Match, Prediction, Team } from "./bracket/types";
export type { Match, Prediction, Team };

// --- TYPES ---
// Team might be shared too, let's check types.ts
// If types.ts has Team, import it.
// Check previous view of types.ts or GSLGroupView imports.
// GSLGroupView imports { Match, Prediction, Team } from "./types"? No, just Match, Prediction.
// Let's check types.ts content if possible, or just keep Team if it's not in types.ts
// Actually, types.ts usually has Team.
// Let's assume Team is in types.ts and import it.

import { MatchCard } from "./bracket/MatchCard";

// --- BRACKET COMPONENT ---
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
	// Logic to project matches based on predictions
	const projectedMatches = useMemo(() => {
		// Clone matches
		const projected = matches.map((m) => ({
			...m,
			teamA: m.teamA ? { ...m.teamA } : null,
			teamB: m.teamB ? { ...m.teamB } : null,
		}));

		// Reset teams that are dependent on previous matches to "TBD" if not decided yet
		// Actually we can just let them be overridden from the source
		// But we need to identify which matches are dependent
		// Note: The `matches` prop already comes with initial DB state.
		// We just need to apply the PREDICTIONS on top of it.

		// Sort projected matches by ID or order to ensure parents are processed before children?
		// Actually, iterating multiple times or topological sort handles this.
		// Simple forEach with a lookup is okay if we do it enough times or if order is correct.
		// For now, let's assume one pass is enough if we are just checking all predictions.
		// Actually, we must process outcomes.

		// Create a map for quick access
		const matchMap = new Map(projected.map((m) => [m.id, m]));

		// Apply both actual results and predictions multiple times to handle deep propagation
		for (let i = 0; i < 5; i++) {
			let changed = false;

			matches.forEach((originalMatch) => {
				const match = matchMap.get(originalMatch.id);
				if (!match) return;

				// Use actual winner if finished, otherwise use prediction
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

				// Update Winner Path
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

				// Update Loser Path
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

		// Mark dependencies - lock matches if parents are not predicted OR finished
		projected.forEach((m) => {
			if (m.teamAPreviousMatchId) {
				const parent = matchMap.get(m.teamAPreviousMatchId);
				// If parent exists, isn't finished, and has no prediction -> lock child
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

	// Organize matches by bracket side and round
	const { upperBracket, lowerBracket, grandFinal, hasGroups, hasElimination } =
		useMemo(() => {
			const upper: Record<number, Match[]> = {};
			const lower: Record<number, Match[]> = {};
			const gf: Match[] = [];
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
		if (side === "gf") return "GRAND FINAL";

		if (side === "upper") {
			// For Single Elimination, use different naming
			const isDouble = lowerRounds.length > 0 || grandFinal.length > 0;
			if (!isDouble) {
				const totalRounds = upperRounds.length;
				const reverseIdx = totalRounds - idx - 1;
				if (reverseIdx === 0) return "FINAL";
				if (reverseIdx === 1) return "SEMI-FINALS";
				if (reverseIdx === 2) return "QUARTER-FINALS";
				return `ROUND ${idx + 1}`;
			}
			// For Double Elimination
			return (
				["Quarter-Finals", "Semi-Finals", "UB Final"][idx] || `UB R${idx + 1}`
			);
		}
		return ["LB R1", "LB R2", "LB Semi", "LB Final"][idx] || `LB R${idx + 1}`;
	};

	// Count matches that need betting (only those with isBettingEnabled and still scheduled)
	const bettableMatches = useMemo(() => {
		return matches.filter(
			(m) =>
				m.isBettingEnabled !== false && m.status === "scheduled" && !m.isGhost,
		);
	}, [matches]);

	// Check if all bettable matches have BOTH winner AND score
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
				"flex min-h-screen w-full flex-col items-center overflow-x-auto bg-paper bg-paper-texture p-6 font-body"
			}
		>
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
						className="slide-in-from-bottom-4 flex animate-in cursor-pointer items-center gap-2 border-[3px] border-black bg-brawl-red px-6 py-3 font-black text-sm text-white uppercase italic shadow-[6px_6px_0px_0px_#000] transition-all duration-300 hover:bg-[#d41d1d] hover:shadow-[8px_8px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
					>
						<span className="material-symbols-outlined text-lg">verified</span>
						Revisar Apostas
					</button>
				</div>
			)}

			{/* Header Container */}
			{!hideHeader && (
				<div className="mb-10 w-full text-center">
					<div className="relative inline-block">
						<div className="absolute inset-0 translate-x-2 translate-y-2 skew-x-[-12deg] transform border-2 border-black bg-[#ccff00] shadow-[2px_2px_0px_0px_#000]" />
						<div className="relative skew-x-[-12deg] transform border-2 border-transparent bg-black px-8 py-2 text-white">
							<h2 className="skew-x-[12deg] transform font-black text-2xl uppercase italic tracking-tighter">
								COMPETITIVE <span className="text-[#ccff00]">BRACKETS</span>
							</h2>
						</div>
					</div>
				</div>
			)}

			<div className="mx-auto flex w-full max-w-7xl flex-col gap-20">
				{/* Groups Section */}
				{hasGroups && (
					<div className="flex flex-col gap-8">
						<div className="flex items-center gap-4">
							<div className="h-0.5 flex-grow bg-black" />
							<h3 className="-skew-x-12 transform border-2 border-black bg-[#ccff00] px-4 py-1 font-black text-black text-xl uppercase italic">
								Group Stage
							</h3>
							<div className="h-0.5 flex-grow bg-black" />
						</div>

						<div className="flex w-full flex-col gap-12">
							{Object.entries(
								projectedMatches
									.filter((m) => m.bracketSide === "groups")
									.reduce(
										(acc, match) => {
											const groupParams = match.label?.match(/Group\s+(\w+)/i);
											const groupName = groupParams
												? `Group ${groupParams[1]}`
												: match.label || "Group Stage";
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
									// DETECT FORMAT: GSL vs Round Robin
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
					<div className="flex flex-col items-center gap-8">
						{!hideHeader && (
							<div className="flex w-full items-center gap-4">
								<div className="h-0.5 flex-grow bg-black" />
								<h3 className="-skew-x-12 transform border-2 border-black bg-[#ccff00] px-4 py-1 font-black text-black text-xl uppercase italic">
									Playoff Bracket
								</h3>
								<div className="h-0.5 flex-grow bg-black" />
							</div>
						)}

						<div className="scrollbar-hide flex w-full flex-col gap-12 overflow-x-auto pb-10">
							{/* UPPER BRACKET */}
							{upperRounds.length > 0 && (
								<div className="flex flex-col gap-4">
									<div className="flex items-stretch gap-6 text-black">
										{upperRounds.map((roundIdx) => (
											<div
												key={`upper-${roundIdx}`}
												className="flex w-72 shrink-0 flex-col gap-2"
											>
												<div className="mb-1 flex justify-center">
													<span className="-skew-x-12 transform border-2 border-black bg-black px-3 py-1 font-black text-[#ccff00] text-[10px] uppercase italic shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
														{getRoundTitle("upper", roundIdx)}
													</span>
												</div>
												<div className="flex h-full flex-col justify-around gap-4">
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
											<div className="flex w-72 shrink-0 flex-col gap-2">
												<div className="mb-1 flex justify-center">
													<span className="-skew-x-12 transform border-2 border-black bg-black px-3 py-1 font-black text-[#ccff00] text-[10px] uppercase italic shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
														GRAND FINAL
													</span>
												</div>
												<div className="flex h-full flex-col justify-around gap-4">
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
								<div className="relative mt-10 border-black/10 border-t-[3px] border-dashed pt-8">
									<div className="absolute top-0 left-0 -translate-y-1/2 bg-paper pr-4">
										<div className="-skew-x-12 transform border-2 border-white bg-black px-3 py-1 font-black text-[10px] text-white uppercase italic tracking-widest">
											Lower Bracket
										</div>
									</div>
									<div className="flex items-center gap-6">
										{lowerRounds.map((roundIdx) => (
											<div
												key={`lower-${roundIdx}`}
												className="flex w-72 shrink-0 flex-col gap-2"
											>
												<div className="mb-1 flex justify-center">
													<span className="-skew-x-12 transform border-2 border-black bg-white px-3 py-1 font-black text-[10px] text-black uppercase italic shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
														{getRoundTitle("lower", roundIdx)}
													</span>
												</div>
												<div className="flex flex-col justify-around gap-4">
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
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
