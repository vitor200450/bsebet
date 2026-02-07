import { useMemo, useState, useEffect, useRef } from "react";
import { clsx } from "clsx";

// --- TYPES ---
export type Team = {
  id: number;
  name: string;
  logoUrl?: string;
  color: "blue" | "red";
};

export type Match = {
  id: number;
  label: string;
  name?: string | null;
  displayOrder?: number | null;
  teamA: Team;
  teamB: Team;
  format: "bo3" | "bo5" | "bo7";
  stats: {
    regionA: string;
    regionB: string;
    pointsA: number;
    pointsB: number;
    winRateA: string;
    winRateB: string;
  };
  nextMatchWinnerId?: number | null;
  nextMatchWinnerSlot?: string | null;
  nextMatchLoserId?: number | null;
  nextMatchLoserSlot?: string | null;
  winnerId?: number | null;
  labelTeamA?: string | null;
  labelTeamB?: string | null;
  isGhost?: boolean;
  isBettingEnabled?: boolean;
  roundIndex?: number | null;
  bracketSide?: string | null;
  status?: "scheduled" | "live" | "finished";
  scoreA?: number | null;
  scoreB?: number | null;
  startTime: string | Date;
};

// Imported from index.tsx via props
export type Prediction = {
  winnerId: number;
  score: string;
};

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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
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
    <div className="relative" ref={containerRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={clsx(
          "h-6 px-2 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all gap-1 bg-white text-black",
          isOpen ? "z-50 relative" : "z-10",
        )}
      >
        <span className="text-[10px] font-black italic">
          {currentScore || "SCORE"}
        </span>
        <span className="material-symbols-outlined text-[10px]">
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white border-[3px] border-black p-2 shadow-[4px_4px_0px_0px_#000] z-[100] flex flex-col gap-2 min-w-[120px] animate-in zoom-in-95 duration-100 origin-top-right">
          <div className="text-[9px] font-black uppercase text-gray-400 text-center mb-1">
            Pick Score
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
                  "px-2 py-1 text-[10px] font-black border-2 transition-all w-full",
                  currentScore === opt
                    ? matchActiveColor === "brawl-blue"
                      ? "bg-brawl-blue text-white border-black"
                      : "bg-brawl-red text-white border-black"
                    : "bg-white text-black border-black/10 hover:border-black hover:bg-gray-50",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="h-px bg-gray-200 my-1" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
              setIsOpen(false);
            }}
            className="text-[9px] font-bold uppercase text-red-500 hover:bg-red-50 py-1"
          >
            Clear Prediction
          </button>
        </div>
      )}
    </div>
  );
};

// --- MATCH CARD COMPONENT ---
const MatchCard = ({
  match,
  prediction,
  onUpdatePrediction,
  onRemovePrediction,
}: {
  match: Match;
  prediction?: Prediction;
  onUpdatePrediction: (
    matchId: number,
    winnerId: number,
    score?: string,
  ) => void;
  onRemovePrediction?: (matchId: number) => void;
}) => {
  const isGhost = match.isGhost;
  const isBettingEnabled = match.isBettingEnabled ?? true;
  // Can interact if betting is enabled AND match is not finished/live (predictions are closed usually when match starts)
  const isMatchStarted = match.status === "live" || match.status === "finished";
  const canInteract = !isGhost && isBettingEnabled && !isMatchStarted;

  if (isGhost) {
    return (
      <div className="w-72 bg-gray-100 border-[3px] border-black/20 h-28 flex items-center justify-center">
        <span className="text-black/20 font-black italic uppercase text-sm">
          TBD
        </span>
      </div>
    );
  }

  // Determine Visual State: Prediction vs Actual Result
  const showResult = isMatchStarted; // Show actual result if match started
  const winnerId = showResult ? match.winnerId : prediction?.winnerId; // Use actual winner if available, else prediction

  const isWinnerA = winnerId === match.teamA.id;
  const isWinnerB = winnerId === match.teamB.id;

  const displayScoreA = showResult ? (match.scoreA ?? 0) : undefined;
  const displayScoreB = showResult ? (match.scoreB ?? 0) : undefined;

  return (
    <div
      className={clsx(
        "w-72 bg-white border-[3px] border-black shadow-[3px_3px_0px_0px_#000] overflow-visible transition-all duration-200 relative group z-10 text-black",
        canInteract && "hover:-translate-y-0.5 hover:z-50 cursor-pointer",
        !canInteract && !showResult && "opacity-60",
      )}
    >
      {/* Status Badges */}
      {!canInteract && !showResult && (
        <div className="absolute -top-2 -right-2 bg-gray-500 text-white text-[7px] font-black uppercase px-1.5 py-0.5 border-2 border-black z-20">
          CLOSED
        </div>
      )}
      {match.status === "live" && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[7px] font-black uppercase px-1.5 py-0.5 border-2 border-black z-20 animate-pulse">
          LIVE
        </div>
      )}
      {match.status === "finished" && (
        <div className="absolute -top-2 -right-2 bg-black text-white text-[7px] font-black uppercase px-1.5 py-0.5 border-2 border-black z-20">
          FINAL
        </div>
      )}

      {/* Header */}
      <div className="bg-black flex justify-between items-center px-1 py-0.5">
        <div className="text-white text-[8px] font-black uppercase tracking-wider truncate flex-1 text-center">
          {match.name || match.label}
        </div>
      </div>

      {/* Content Container */}
      <div className="relative">
        {/* Helper for "Select Winner" state if nothing selected */}
        {!prediction && canInteract && !showResult && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/5">
            <span className="text-[10px] font-bold text-black/50 uppercase tracking-widest bg-white/80 px-2 py-1 rounded">
              Select Winner
            </span>
          </div>
        )}

        {/* Team A Row */}
        <div
          onClick={() =>
            canInteract &&
            onUpdatePrediction(
              match.id,
              match.teamA.id,
              isWinnerA ? prediction?.score : undefined,
            )
          }
          className={clsx(
            "flex items-center justify-between px-2 py-1.5 border-b border-black/10 min-h-[3rem] transition-all duration-200",
            canInteract ? "cursor-pointer" : "",
            isWinnerA
              ? showResult
                ? "bg-[#ccff00] text-black" // Actual winner style (Lime Green)
                : "bg-brawl-blue" // Prediction style
              : "hover:bg-gray-50",
            showResult && !isWinnerA && "bg-gray-100 opacity-70", // Dim loser
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-full border-2 border-black/20 overflow-hidden flex-shrink-0 bg-gray-50">
              {match.teamA.logoUrl ? (
                <img
                  src={match.teamA.logoUrl}
                  className="w-full h-full object-contain p-0.5"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                  ?
                </div>
              )}
            </div>
            <span
              className={clsx(
                "text-[10px] font-black uppercase italic line-clamp-2 leading-tight w-full break-words",
                isWinnerA
                  ? showResult
                    ? "text-black"
                    : "text-white"
                  : "text-black",
              )}
            >
              {match.teamA.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Show Prediction Score Picker OR Actual Score */}
            {showResult ? (
              <span
                className={clsx(
                  "text-lg font-black italic",
                  isWinnerA
                    ? showResult
                      ? "text-black"
                      : "text-white"
                    : "text-gray-400",
                )}
              >
                {displayScoreA}
              </span>
            ) : (
              isWinnerA && (
                <>
                  <div className="w-2 h-2 rounded-full bg-[#ccff00] animate-pulse" />
                  <ScorePicker
                    winnerId={match.teamA.id}
                    teamA={match.teamA}
                    currentScore={prediction?.score}
                    format={match.format}
                    onSelectScore={(score) =>
                      onUpdatePrediction(match.id, match.teamA.id, score)
                    }
                    onClear={() => onRemovePrediction?.(match.id)}
                  />
                </>
              )
            )}
          </div>
        </div>

        {/* Team B Row */}
        <div
          onClick={() =>
            canInteract &&
            onUpdatePrediction(
              match.id,
              match.teamB.id,
              isWinnerB ? prediction?.score : undefined,
            )
          }
          className={clsx(
            "flex items-center justify-between px-2 py-1.5 min-h-[3rem] transition-all duration-200",
            canInteract ? "cursor-pointer" : "",
            isWinnerB
              ? showResult
                ? "bg-[#ccff00] text-black" // Actual winner style
                : "bg-brawl-red" // Prediction style
              : "hover:bg-gray-50",
            showResult && !isWinnerB && "bg-gray-100 opacity-70", // Dim loser
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-full border-2 border-black/20 overflow-hidden flex-shrink-0 bg-gray-50">
              {match.teamB.logoUrl ? (
                <img
                  src={match.teamB.logoUrl}
                  className="w-full h-full object-contain p-0.5"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                  ?
                </div>
              )}
            </div>
            <span
              className={clsx(
                "text-[10px] font-black uppercase italic line-clamp-2 leading-tight w-full break-words",
                isWinnerB
                  ? showResult
                    ? "text-black"
                    : "text-white"
                  : "text-black",
              )}
            >
              {match.teamB.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {showResult ? (
              <span
                className={clsx(
                  "text-lg font-black italic",
                  isWinnerB
                    ? showResult
                      ? "text-black"
                      : "text-white"
                    : "text-gray-400",
                )}
              >
                {displayScoreB}
              </span>
            ) : (
              isWinnerB && (
                <>
                  <div className="w-2 h-2 rounded-full bg-[#ccff00] animate-pulse" />
                  <ScorePicker
                    winnerId={match.teamB.id}
                    teamA={match.teamA}
                    currentScore={prediction?.score}
                    format={match.format}
                    onSelectScore={(score) =>
                      onUpdatePrediction(match.id, match.teamB.id, score)
                    }
                    onClear={() => onRemovePrediction?.(match.id)}
                  />
                </>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- BRACKET COMPONENT ---
export function TournamentBracket({
  matches,
  predictions,
  onUpdatePrediction,
  onRemovePrediction,
  onReview,
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
}) {
  // Logic to project matches based on predictions
  const projectedMatches = useMemo(() => {
    // Clone matches
    const projected = matches.map((m) => ({
      ...m,
      teamA: { ...m.teamA },
      teamB: { ...m.teamB },
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

    // Apply predictions to move teams forward
    Object.entries(predictions).forEach(([matchIdStr, prediction]) => {
      const matchId = parseInt(matchIdStr);
      const match = matchMap.get(matchId);
      if (!match) return;

      const winnerId = prediction.winnerId;
      const winnerTeam =
        winnerId === match.teamA.id ? match.teamA : match.teamB;
      const loserTeam = winnerId === match.teamA.id ? match.teamB : match.teamA;

      // Update Winner Path
      if (match.nextMatchWinnerId) {
        const nextMatch = matchMap.get(match.nextMatchWinnerId);
        if (nextMatch) {
          if (match.nextMatchWinnerSlot === "A") nextMatch.teamA = winnerTeam;
          if (match.nextMatchWinnerSlot === "B") nextMatch.teamB = winnerTeam;
        }
      }

      // Update Loser Path
      if (match.nextMatchLoserId) {
        const nextMatch = matchMap.get(match.nextMatchLoserId);
        if (nextMatch) {
          if (match.nextMatchLoserSlot === "A") nextMatch.teamA = loserTeam;
          if (match.nextMatchLoserSlot === "B") nextMatch.teamB = loserTeam;
        }
      }
    });

    return projected;
  }, [matches, predictions]);

  // Organize matches by bracket side and round
  const { upperBracket, lowerBracket, grandFinal, bracketType } =
    useMemo(() => {
      const upper: Record<number, Match[]> = {};
      const lower: Record<number, Match[]> = {};
      const gf: Match[] = [];

      projectedMatches.forEach((m) => {
        const side = m.bracketSide || "upper";
        const round = m.roundIndex ?? 0;

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

      // Detect bracket type based on structure
      const hasLowerBracket = Object.keys(lower).length > 0;
      const hasGrandFinal = gf.length > 0;

      let type: "single" | "double" | "groups" = "single";
      if (hasLowerBracket || hasGrandFinal) {
        type = "double";
      }
      // Groups detection: matches without bracketSide or with specific group indicators
      const hasGroupMatches = projectedMatches.some(
        (m) => !m.bracketSide || m.bracketSide === "groups",
      );
      if (hasGroupMatches) {
        type = "groups";
      }

      return {
        upperBracket: upper,
        lowerBracket: lower,
        grandFinal: gf,
        bracketType: type,
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
      if (bracketType === "single") {
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
    <div className="bg-paper bg-paper-texture min-h-screen w-full p-6 overflow-x-auto font-body">
      {/* Review Button - Fixed at bottom right */}
      {showReviewButton && (
        <div className="fixed bottom-24 right-6 z-[60]">
          <button
            onClick={onReview}
            className="bg-brawl-red hover:bg-[#d41d1d] text-white px-6 py-3 font-black italic uppercase border-[3px] border-black shadow-[6px_6px_0px_0px_#000] hover:shadow-[8px_8px_0px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center gap-2 text-sm animate-in slide-in-from-bottom-4 duration-300"
          >
            <span className="material-symbols-outlined text-lg">verified</span>
            Revisar Apostas
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-block relative">
          <div className="absolute inset-0 bg-[#ccff00] transform skew-x-[-12deg] translate-x-2 translate-y-2 border-2 border-black shadow-[2px_2px_0px_0px_#000]" />
          <div className="relative bg-black text-white px-8 py-2 transform skew-x-[-12deg] border-2 border-transparent">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter transform skew-x-[12deg]">
              {bracketType === "groups" && (
                <>
                  GROUP <span className="text-[#ccff00]">STAGE</span>
                </>
              )}
              {bracketType === "single" && (
                <>
                  PLAYOFFS <span className="text-[#ccff00]">BRACKET</span>
                </>
              )}
              {bracketType === "double" && (
                <>
                  PLAYOFFS <span className="text-[#ccff00]">BRACKET</span>
                </>
              )}
            </h2>
          </div>
        </div>
      </div>

      {/* MAIN BRACKET GRID */}
      <div className="flex gap-16 min-w-max px-4 items-center">
        {/* Groups View - Grid layout for group matches */}
        {bracketType === "groups" && (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectedMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predictions[match.id]}
                onUpdatePrediction={onUpdatePrediction}
                onRemovePrediction={onRemovePrediction}
              />
            ))}
          </div>
        )}

        {/* Bracket View - For Single/Double Elimination */}
        {bracketType !== "groups" && (
          <div className="flex flex-col gap-12">
            {/* UPPER BRACKET */}
            {upperRounds.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="relative h-8 mb-4">
                  <div className="text-xs font-black uppercase italic tracking-widest text-white bg-black px-4 py-1.5 transform -skew-x-12 border-2 border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] absolute top-0 left-0 z-10">
                    UPPER BRACKET
                  </div>
                </div>
                <div className="flex gap-6 items-stretch text-black">
                  {upperRounds.map((roundIdx) => (
                    <div
                      key={`upper-${roundIdx}`}
                      className="flex flex-col gap-2"
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
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* GRAND FINAL */}
                  {grandFinal.length > 0 && (
                    <div className="flex flex-col gap-2">
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
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LOWER BRACKET - Only for Double Elimination */}
            {bracketType === "double" && lowerRounds.length > 0 && (
              <div className="pt-8 border-t-[3px] border-dashed border-black/10 relative">
                <div className="absolute top-0 left-0 -translate-y-1/2 bg-paper pr-4">
                  <div className="text-xs font-black uppercase italic tracking-widest text-white bg-black px-4 py-1.5 transform -skew-x-12 border-2 border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]">
                    LOWER BRACKET
                  </div>
                </div>
                <div className="flex gap-6 items-center">
                  {lowerRounds.map((roundIdx) => (
                    <div
                      key={`lower-${roundIdx}`}
                      className="flex flex-col gap-2"
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
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
