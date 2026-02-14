import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import type { Match, Prediction, Team } from "./types";
import { TeamLogo } from "../TeamLogo";

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
export const MatchCard = ({
  match,
  prediction,
  onUpdatePrediction,
  onRemovePrediction,
  isReadOnly = false,
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
}) => {
  const isGhost = match.isGhost;
  const isBettingEnabled = match.isBettingEnabled ?? true;
  // Can interact if betting is enabled AND match is not finished/live AND not readOnly
  const isMatchStarted = match.status === "live" || match.status === "finished";
  const canInteract =
    !isGhost && isBettingEnabled && !isMatchStarted && !isReadOnly;

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

      {/* Bet Result Badge - Show points earned for finished matches */}
      {match.status === "finished" &&
        prediction &&
        prediction.pointsEarned !== undefined && (
          <div
            className={clsx(
              "absolute -bottom-2 -right-2 text-[7px] font-black uppercase px-1.5 py-0.5 border-2 border-black z-20 flex items-center gap-1 cursor-help group/badge",
              prediction.isCorrect
                ? prediction.isUnderdogPick
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white animate-pulse" // Special underdog style
                  : "bg-green-500 text-white"
                : "bg-red-500 text-white",
            )}
          >
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover/badge:block w-48 bg-black text-white text-[10px] p-2 rounded border-2 border-white shadow-lg z-[100] pointer-events-none">
              <div className="space-y-1">
                {(() => {
                  if (!prediction.isCorrect) {
                    return (
                      <>
                        <div className="font-bold text-red-300">
                          ❌ Palpite Incorreto
                        </div>
                        <div className="text-[9px] text-gray-300">
                          Você apostou em:{" "}
                          {match.teamA.id === prediction.winnerId
                            ? match.teamA.name
                            : match.teamB.name}
                        </div>
                        <div className="text-[9px] text-gray-300">
                          Vencedor real:{" "}
                          {match.teamA.id === match.winnerId
                            ? match.teamA.name
                            : match.teamB.name}
                        </div>
                        <div className="border-t border-gray-600 pt-1 mt-1 font-bold">
                          Total: 0 pontos
                        </div>
                      </>
                    );
                  }

                  return (
                    <>
                      <div className="font-bold text-green-300">
                        ✅ Breakdown:
                      </div>
                      {prediction.isPerfectPick ? (
                        <div className="text-[9px] text-gray-300">
                          ✓ Placar exato ({prediction.score})
                        </div>
                      ) : (
                        <div className="text-[9px] text-gray-300">
                          ✓ Vencedor correto
                        </div>
                      )}
                      {prediction.isUnderdogPick && (
                        <div className="text-[9px] text-purple-300">
                          🔥 Bônus azarão (+25%)
                        </div>
                      )}
                      <div className="border-t border-gray-600 pt-1 mt-1 font-bold text-yellow-300">
                        Total: +{prediction.pointsEarned} pts
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
            </div>

            {/* Badge Content */}
            {prediction.isCorrect ? (
              prediction.isUnderdogPick ? (
                <span>🔥</span>
              ) : (
                "✓"
              )
            ) : (
              "✗"
            )}
            <span>
              {prediction.pointsEarned > 0
                ? `+${prediction.pointsEarned}`
                : prediction.pointsEarned}{" "}
              PTS
            </span>
            {prediction.isUnderdogPick && prediction.isCorrect && (
              <span className="text-[6px] ml-0.5">🐕</span>
            )}
          </div>
        )}

      {/* Header */}
      <div className="bg-black flex justify-between items-center px-2 py-1">
        <div className="text-white text-[8px] font-black uppercase tracking-wider truncate flex-1">
          {match.name || match.label}
        </div>
        {match.startTime && (
          <div className="text-[#ccff00] text-[8px] font-black italic flex items-center gap-1 shrink-0 ml-2">
            <span className="material-symbols-outlined text-[10px]">
              schedule
            </span>
            {new Date(match.startTime).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            })}{" "}
            -{" "}
            {new Date(match.startTime).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
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
            "flex items-center justify-between px-2 py-1.5 border-b border-black/10 min-h-[3rem] transition-all duration-200 relative",
            canInteract ? "cursor-pointer" : "",
            isWinnerA
              ? showResult
                ? "bg-[#ccff00] text-black" // Actual winner style (Lime Green)
                : "bg-brawl-blue" // Prediction style
              : "hover:bg-gray-50",
            showResult && !isWinnerA && "bg-gray-100 opacity-70", // Dim loser
          )}
        >
          {/* Winner/Prediction Background Texture */}
          {isWinnerA && (
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
          )}

          <div className="flex items-center gap-2 flex-1 min-w-0 pr-2 relative z-10">
            <TeamLogo
              teamId={match.teamA.id}
              teamName={match.teamA.name}
              logoUrl={match.teamA.logoUrl}
              size="sm"
              className="rounded-full border-2 border-black/20"
            />
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
                  {isReadOnly ? (
                    <span className="text-xs font-black italic text-white px-2">
                      {prediction?.score || "0-0"}
                    </span>
                  ) : (
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
            onUpdatePrediction(
              match.id,
              match.teamB.id,
              isWinnerB ? prediction?.score : undefined,
            )
          }
          className={clsx(
            "flex items-center justify-between px-2 py-1.5 min-h-[3rem] transition-all duration-200 relative",
            canInteract ? "cursor-pointer" : "",
            isWinnerB
              ? showResult
                ? "bg-[#ccff00] text-black" // Actual winner style
                : "bg-brawl-red" // Prediction style
              : "hover:bg-gray-50",
            showResult && !isWinnerB && "bg-gray-100 opacity-70", // Dim loser
          )}
        >
          {/* Winner/Prediction Background Texture */}
          {isWinnerB && (
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
          )}

          <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
            <TeamLogo
              teamId={match.teamB.id}
              teamName={match.teamB.name}
              logoUrl={match.teamB.logoUrl}
              size="sm"
              className="rounded-full border-2 border-black/20"
            />
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
                  {isReadOnly ? (
                    <span className="text-xs font-black italic text-white px-2">
                      {prediction?.score || "0-0"}
                    </span>
                  ) : (
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
