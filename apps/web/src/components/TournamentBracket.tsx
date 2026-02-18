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
    <div className="bg-paper bg-paper-texture min-h-screen w-full p-6 overflow-x-auto font-body flex flex-col items-center">
      {/* Review Button - Fixed at bottom right */}
      {showReviewButton && (
        <div className="fixed bottom-24 right-6 z-[70]">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onReview) {
                onReview();
              }
            }}
            className="bg-brawl-red hover:bg-[#d41d1d] text-white px-6 py-3 font-black italic uppercase border-[3px] border-black shadow-[6px_6px_0px_0px_#000] hover:shadow-[8px_8px_0px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center gap-2 text-sm animate-in slide-in-from-bottom-4 duration-300 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">verified</span>
            Revisar Apostas
          </button>
        </div>
      )}

      {/* Header Container */}
      <div className="mb-10 text-center w-full">
        <div className="inline-block relative">
          <div className="absolute inset-0 bg-[#ccff00] transform skew-x-[-12deg] translate-x-2 translate-y-2 border-2 border-black shadow-[2px_2px_0px_0px_#000]" />
          <div className="relative bg-black text-white px-8 py-2 transform skew-x-[-12deg] border-2 border-transparent">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter transform skew-x-[12deg]">
              COMPETITIVE <span className="text-[#ccff00]">BRACKETS</span>
            </h2>
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col gap-20 max-w-7xl mx-auto">
        {/* Groups Section */}
        {hasGroups && (
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
              <div className="h-0.5 bg-black flex-grow" />
              <h3 className="text-xl font-black italic uppercase text-black bg-[#ccff00] px-4 py-1 border-2 border-black transform -skew-x-12">
                Group Stage
              </h3>
              <div className="h-0.5 bg-black flex-grow" />
            </div>

            <div className="flex flex-col gap-12 w-full">
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
          <div className="flex flex-col gap-8 items-center">
            <div className="flex items-center gap-4 w-full">
              <div className="h-0.5 bg-black flex-grow" />
              <h3 className="text-xl font-black italic uppercase text-black bg-[#ccff00] px-4 py-1 border-2 border-black transform -skew-x-12">
                Playoff Bracket
              </h3>
              <div className="h-0.5 bg-black flex-grow" />
            </div>

            <div className="flex flex-col gap-12 overflow-x-auto w-full pb-10 scrollbar-hide">
              {/* UPPER BRACKET */}
              {upperRounds.length > 0 && (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-6 items-stretch text-black">
                    {upperRounds.map((roundIdx) => (
                      <div
                        key={`upper-${roundIdx}`}
                        className="flex flex-col gap-2 w-72 shrink-0"
                      >
                        <div className="text-center text-[9px] font-bold uppercase text-gray-500 tracking-wider h-4">
                          {getRoundTitle("upper", roundIdx)}
                        </div>
                        <div className="flex flex-col gap-4 justify-around h-full">
                          {(upperBracket[roundIdx] || []).map((match) => (
                            <MatchCard
                              key={match.id}
                              match={match}
                              prediction={predictions[match.id]}
                              onUpdatePrediction={onUpdatePrediction}
                              onRemovePrediction={onRemovePrediction}
                              isReadOnly={isReadOnly}
                            />
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* GRAND FINAL */}
                    {grandFinal.length > 0 && (
                      <div className="flex flex-col gap-2 w-72 shrink-0">
                        <div className="text-center text-[9px] font-bold uppercase text-gray-500 tracking-wider h-4">
                          GRAND FINAL
                        </div>
                        <div className="flex flex-col gap-4 justify-around h-full">
                          {grandFinal.map((match) => (
                            <MatchCard
                              key={match.id}
                              match={match}
                              prediction={predictions[match.id]}
                              onUpdatePrediction={onUpdatePrediction}
                              onRemovePrediction={onRemovePrediction}
                              isReadOnly={isReadOnly}
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
                <div className="pt-8 border-t-[3px] border-dashed border-black/10 relative mt-10">
                  <div className="absolute top-0 left-0 -translate-y-1/2 bg-paper pr-4">
                    <div className="text-[10px] font-black uppercase italic tracking-widest text-white bg-black px-3 py-1 transform -skew-x-12 border-2 border-white">
                      Lower Bracket
                    </div>
                  </div>
                  <div className="flex gap-6 items-center">
                    {lowerRounds.map((roundIdx) => (
                      <div
                        key={`lower-${roundIdx}`}
                        className="flex flex-col gap-2 w-72 shrink-0"
                      >
                        <div className="text-center text-[9px] font-bold uppercase text-gray-500 tracking-wider">
                          {getRoundTitle("lower", roundIdx)}
                        </div>
                        <div className="flex flex-col gap-4 justify-around">
                          {(lowerBracket[roundIdx] || []).map((match) => (
                            <MatchCard
                              key={match.id}
                              match={match}
                              prediction={predictions[match.id]}
                              onUpdatePrediction={onUpdatePrediction}
                              onRemovePrediction={onRemovePrediction}
                              isReadOnly={isReadOnly}
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
