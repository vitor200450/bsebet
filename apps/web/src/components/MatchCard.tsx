import { clsx } from "clsx";
import { TeamLogo } from "./TeamLogo";

export type Team = {
  id: number;
  name: string;
  logoUrl?: string | null;
  region?: string | null;
};

export type Match = {
  id: number;
  label?: string | null;
  name?: string | null;
  labelTeamA?: string | null;
  labelTeamB?: string | null;
  teamA?: Team | null;
  teamB?: Team | null;
  format: string;
  category: string;
  startTime: string | Date;
  status: "scheduled" | "live" | "finished";
  isBettingEnabled: boolean;
  scoreA?: number | null;
  scoreB?: number | null;
  winnerId?: number | null;
};

export type Bet = {
  id: number;
  matchId: number;
  predictedWinnerId: number | null;
  predictedScoreA: number;
  predictedScoreB: number;
  pointsEarned?: number;
  isUnderdogPick?: boolean;
  isPerfectPick?: boolean;
};

interface MatchCardProps {
  match: Match;
  initialBet?: Bet;
  showPredictionScore?: boolean;
}

export function MatchCard({
  match,
  initialBet,
  showPredictionScore = false,
}: MatchCardProps) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  const teamA = match.teamA;
  const teamB = match.teamB;

  // Visual highlights for user predictions
  const userPredictedWinnerA =
    showPredictionScore &&
    teamA?.id &&
    initialBet?.predictedWinnerId === teamA.id;
  const userPredictedWinnerB =
    showPredictionScore &&
    teamB?.id &&
    initialBet?.predictedWinnerId === teamB.id;

  const formattedStartTime = new Date(match.startTime).toLocaleTimeString(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  const formattedStartDate = new Date(match.startTime)
    .toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    })
    .toUpperCase()
    .replace(".", "");

  // Score Logic
  const displayScoreA =
    showPredictionScore && initialBet
      ? initialBet.predictedScoreA
      : (match.scoreA ?? 0);
  const displayScoreB =
    showPredictionScore && initialBet
      ? initialBet.predictedScoreB
      : (match.scoreB ?? 0);

  // Calculate max length for dynamic sizing consistency
  const lenA = (teamA?.name || match.labelTeamA || "").length;
  const lenB = (teamB?.name || match.labelTeamB || "").length;
  const maxLen = Math.max(lenA, lenB);

  return (
    <div
      className={clsx(
        "relative w-full max-w-4xl mx-auto mb-2 font-sans transition-opacity group/card",
        isFinished && !showPredictionScore
          ? "opacity-60 grayscale"
          : "opacity-100",
      )}
    >
      {/* Match Label Badge (Opening, Winners, etc.) */}
      {(() => {
        // Prioritize 'name' if it exists and is meaningful, otherwise use cleaned 'label'
        const candidate = match.name || match.label || "";
        const cleanedLabel = candidate
          .replace(/Group\s+\w+\s*([-:|]\s*)?/i, "")
          .replace(/Match\s*\d*/i, "")
          .trim();

        if (!cleanedLabel && !initialBet) return null;

        return (
          <div className="absolute -top-2 left-4 z-20 flex items-center gap-2">
            {cleanedLabel && (
              <div className="bg-black text-white text-[10px] md:text-xs font-black italic uppercase px-3 py-0.5 border-2 border-white shadow-[2px_2px_0_0_#000] transform -rotate-1 skew-x-[-12deg]">
                <span className="block skew-x-[12deg]">{cleanedLabel}</span>
              </div>
            )}
            {initialBet && showPredictionScore && (
              <div className="bg-[#ccff00] text-black text-[8px] md:text-[10px] font-black uppercase px-2 py-0.5 border-2 border-black shadow-[2px_2px_0_0_#000] transform rotate-2 animate-in fade-in zoom-in duration-300">
                PALPITE SALVO
              </div>
            )}
          </div>
        );
      })()}

      <div
        className={clsx(
          "bg-white border-2 border-black shadow-[4px_4px_0_0_#000] relative overflow-visible transition-all",
          isLive
            ? "bg-red-50 border-red-600 ring-2 ring-red-600/20"
            : "hover:bg-zinc-50",
          // Add top padding if there's likely a label to avoid overlap
          match.name || match.label ? "pt-2" : "",
        )}
      >
        <div className="flex items-center p-2 gap-4 md:gap-8 h-20 relative">
          {/* --- TEAM A --- */}
          <div
            className={clsx(
              "flex-1 flex items-center justify-end gap-3 py-1 pr-1 lg:pr-2 rounded-lg transition-all relative overflow-hidden h-full",
              userPredictedWinnerA ? "bg-[#ccff00]/40" : "",
            )}
          >
            <div className="flex flex-col items-end leading-tight shrink min-w-0 max-w-full z-10">
              <span
                className={clsx(
                  "font-black uppercase tracking-tighter text-right transition-colors break-normal w-full block",
                  userPredictedWinnerA ? "text-black" : "text-zinc-800",
                  // Dynamic sizing based on JOINT MAX length to keep text consistent
                  maxLen > 16
                    ? "text-[9px] md:text-[10px] lg:text-[11px]" // Very Long
                    : maxLen > 8
                      ? "text-[10px] md:text-xs lg:text-[13px]" // Long
                      : "text-xs md:text-sm lg:text-base", // Normal
                )}
              >
                {teamA?.name || match.labelTeamA || "TBD"}
              </span>
              {initialBet && !showPredictionScore && (
                <span className="text-[10px] font-black text-black/40 uppercase mt-0.5 whitespace-nowrap">
                  Palpite: {initialBet.predictedScoreA}
                </span>
              )}
            </div>

            {/* Logo */}
            <TeamLogo
              teamName={teamA?.name || match.labelTeamA || "TBD"}
              logoUrl={teamA?.logoUrl}
              size="md"
              className={clsx(
                "transition-transform",
                userPredictedWinnerA ? "scale-105 rotate-[-2deg]" : "",
              )}
            />
          </div>

          {/* --- VS / PLACAR (Center) --- */}
          <div className="flex flex-col items-center justify-center shrink-0 w-24 md:w-36">
            <div className="flex items-center gap-2 md:gap-3">
              {(isLive || isFinished || showPredictionScore) && (
                <div className="w-8 h-10 md:w-11 md:h-12 text-center text-xl md:text-3xl font-black border-2 border-black rounded-lg bg-zinc-50 text-zinc-900 border-zinc-200 flex items-center justify-center shadow-sm">
                  {displayScoreA}
                </div>
              )}

              <div className="flex flex-col items-center justify-center min-w-[60px] md:min-w-[80px] relative h-full">
                {isLive ? (
                  <span className="text-[8px] font-black text-red-600 animate-pulse uppercase tracking-tighter mb-1">
                    LIVE
                  </span>
                ) : (
                  <span className="text-[8px] md:text-[9px] font-black text-zinc-400 uppercase tracking-tighter leading-none mb-1">
                    {formattedStartDate}
                  </span>
                )}

                <div className="bg-zinc-100/50 px-2 py-0.5 rounded border border-zinc-200/50 flex items-center justify-center">
                  <span className="text-[10px] md:text-xs font-black text-zinc-500 italic leading-none">
                    VS
                  </span>
                </div>

                <span className="text-[8px] md:text-[9px] font-black text-zinc-400 uppercase tracking-tighter leading-none mt-1 tabular-nums">
                  {formattedStartTime}
                </span>
              </div>

              {(isLive || isFinished || showPredictionScore) && (
                <div className="w-8 h-10 md:w-11 md:h-12 text-center text-xl md:text-3xl font-black border-2 border-black rounded-lg bg-zinc-50 text-zinc-900 border-zinc-200 flex items-center justify-center shadow-sm">
                  {displayScoreB}
                </div>
              )}
            </div>
          </div>

          {/* --- TEAM B --- */}
          <div
            className={clsx(
              "flex-1 flex items-center justify-start gap-3 py-1 pl-1 lg:pl-2 pr-1 lg:pr-2 rounded-lg transition-all relative overflow-hidden h-full",
              userPredictedWinnerB ? "bg-[#ccff00]/40" : "",
            )}
          >
            {/* Logo */}
            <TeamLogo
              teamName={teamB?.name || match.labelTeamB || "TBD"}
              logoUrl={teamB?.logoUrl}
              size="md"
              className={clsx(
                "transition-transform",
                userPredictedWinnerB ? "scale-105 rotate-[2deg]" : "",
              )}
            />

            <div className="flex flex-col items-start leading-tight shrink min-w-0 max-w-full z-10">
              <span
                className={clsx(
                  "font-black uppercase tracking-tighter text-left transition-colors break-normal w-full block",
                  userPredictedWinnerB ? "text-black" : "text-zinc-800",
                  // Dynamic sizing based on JOINT MAX length to keep text consistent
                  maxLen > 16
                    ? "text-[9px] md:text-[10px] lg:text-[11px]" // Very Long
                    : maxLen > 8
                      ? "text-[10px] md:text-xs lg:text-[13px]" // Long
                      : "text-xs md:text-sm lg:text-base", // Normal
                )}
              >
                {teamB?.name || match.labelTeamB || "TBD"}
              </span>
              {initialBet && !showPredictionScore && (
                <span className="text-[10px] font-black text-black/40 uppercase mt-0.5 whitespace-nowrap">
                  Palpite: {initialBet.predictedScoreB}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bet Result Badge - Show points earned for finished matches */}
        {isFinished && initialBet && initialBet.pointsEarned !== undefined && (
          <div
            className={clsx(
              "absolute -bottom-2 -right-2 text-[8px] font-black uppercase px-2 py-1 border-2 border-black z-20 flex items-center gap-1.5 cursor-help group/badge",
              (() => {
                const isCorrect =
                  match.winnerId === initialBet.predictedWinnerId;
                if (!isCorrect) return "bg-red-500 text-white";
                if (initialBet.isUnderdogPick) {
                  return "bg-gradient-to-r from-purple-600 to-pink-600 text-white animate-pulse";
                }
                return "bg-green-500 text-white";
              })(),
            )}
          >
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover/badge:block w-48 bg-black text-white text-[10px] p-2 rounded border-2 border-white shadow-lg z-[100] pointer-events-none">
              <div className="space-y-1">
                {(() => {
                  const isCorrect =
                    match.winnerId === initialBet.predictedWinnerId;
                  if (!isCorrect) {
                    return (
                      <>
                        <div className="font-bold text-red-300">
                          ❌ Palpite Incorreto
                        </div>
                        <div className="text-[9px] text-gray-300">
                          Você apostou em:{" "}
                          {match.teamA?.id === initialBet.predictedWinnerId
                            ? match.teamA?.name
                            : match.teamB?.name}
                        </div>
                        <div className="text-[9px] text-gray-300">
                          Vencedor real:{" "}
                          {match.teamA?.id === match.winnerId
                            ? match.teamA?.name
                            : match.teamB?.name}
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
                      {initialBet.isPerfectPick ? (
                        <div className="text-[9px] text-gray-300">
                          ✓ Placar exato ({initialBet.predictedScoreA}-
                          {initialBet.predictedScoreB})
                        </div>
                      ) : (
                        <div className="text-[9px] text-gray-300">
                          ✓ Vencedor correto
                        </div>
                      )}
                      {initialBet.isUnderdogPick && (
                        <div className="text-[9px] text-purple-300">
                          🔥 Bônus azarão (+25%)
                        </div>
                      )}
                      <div className="border-t border-gray-600 pt-1 mt-1 font-bold text-yellow-300">
                        Total: +{initialBet.pointsEarned} pts
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
            </div>

            {/* Badge Content */}
            {(() => {
              const isCorrect = match.winnerId === initialBet.predictedWinnerId;
              if (!isCorrect) return "✗";
              if (initialBet.isUnderdogPick) return <span>🔥</span>;
              return "✓";
            })()}
            <span className="whitespace-nowrap">
              {initialBet.pointsEarned > 0
                ? `+${initialBet.pointsEarned}`
                : initialBet.pointsEarned}{" "}
              PTS
            </span>
            {initialBet.isUnderdogPick &&
              match.winnerId === initialBet.predictedWinnerId && (
                <span className="text-[7px]">🐕</span>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
