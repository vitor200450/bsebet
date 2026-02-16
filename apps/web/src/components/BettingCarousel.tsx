import { useState, useMemo, useEffect } from "react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { TeamLogo } from "./TeamLogo";

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
  tournamentName?: string | null;
  tournamentLogoUrl?: string | null;
  startTime: string | Date;
};

// --- SVG COMPONENTS ---
// --- SVG COMPONENTS ---
// Using DisplacementMap to create a procedurally jagged "ink bleed" effect
const PaintSplatterBlue = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 400 400"
    xmlns="http://www.w3.org/2000/svg"
    className={clsx(className, "mix-blend-multiply pointer-events-none")}
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
    className={clsx(className, "mix-blend-multiply pointer-events-none")}
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

export type Prediction = {
  winnerId: number;
  score: string;
};

export function BettingCarousel({
  matches,
  predictions,
  onUpdatePrediction,
  onShowReview,
}: {
  matches: Match[];
  predictions: Record<number, Prediction>;
  onUpdatePrediction: (
    matchId: number,
    winnerId: number,
    score?: string,
  ) => void;
  onShowReview?: () => void;
}) {
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
      teamA: { ...m.teamA },
      teamB: { ...m.teamB },
    }));

    // Iterate through all matches to propagate results
    projected.forEach((match) => {
      const prediction = predictions[match.id];
      if (!prediction) return;

      const winnerId = prediction.winnerId;
      const winnerTeam =
        winnerId === match.teamA.id ? match.teamA : match.teamB;
      const loserTeam = winnerId === match.teamA.id ? match.teamB : match.teamA;

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
      return "Revisar Todas as Apostas";
    }
    if (isLastMatch && !allBetsComplete) {
      const missingCount = matches.filter(
        (m) =>
          !predictions[m.id] ||
          !predictions[m.id].winnerId ||
          !predictions[m.id].score ||
          predictions[m.id].score.trim() === "",
      ).length;
      return `Faltam ${missingCount} Placar${missingCount > 1 ? "es" : ""}`;
    }
    return "Próximo Jogo";
  };

  const selectedWinnerId = currentPrediction?.winnerId || null;
  const selectedScore = currentPrediction?.score || null;

  // Use the prop function directly
  const updatePrediction = onUpdatePrediction;

  const setSelectedWinnerId = (winnerId: number) => {
    if (!currentMatch) return;
    updatePrediction(currentMatch.id, winnerId);
  };

  const setSelectedScore = (score: string) => {
    if (!currentMatch.id) return;
    updatePrediction(currentMatch.id, selectedWinnerId || 0, score);
  };

  // Determine available scores based on format (BO3=2wins, BO5=3wins)
  const scoreOptions = useMemo(() => {
    if (!currentMatch) return [];
    const winsNeeded =
      currentMatch.format === "bo5" ? 3 : currentMatch.format === "bo3" ? 2 : 3;
    const options = [];
    const isWinnerA = selectedWinnerId === currentMatch.teamA.id;

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
  }, [currentMatch?.format, currentMatch?.teamA.id, selectedWinnerId]);

  // Helper to check if a team is selected
  const isSelected = (teamId: number) => selectedWinnerId === teamId;
  const isOtherTeamSelected = (teamId: number) =>
    selectedWinnerId !== null && selectedWinnerId !== teamId;

  const activeAccentColor =
    currentMatch && selectedWinnerId === currentMatch.teamA.id
      ? "brawl-blue"
      : "brawl-red";

  if (!currentMatch)
    return (
      <div className="min-h-screen bg-paper bg-paper-texture flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 pointer-events-none opacity-50 z-0 transform -rotate-12">
          <PaintSplatterBlue className="w-full h-full" />
        </div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 pointer-events-none opacity-50 z-0 transform rotate-45">
          <PaintSplatterRed className="w-full h-full" />
        </div>

        <div className="relative z-10 max-w-md w-full">
          <div className="bg-white border-[4px] border-black shadow-comic p-8 flex flex-col items-center text-center transform rotate-1">
            {/* Icon/Decoration */}
            <div className="w-20 h-20 bg-gray-100 border-[3px] border-black rounded-full flex items-center justify-center mb-6 shadow-sm relative group">
              <span className="material-symbols-outlined text-4xl text-gray-400 group-hover:text-brawl-red transition-colors">
                calendar_clock
              </span>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-brawl-red rounded-full border-[2px] border-black animate-pulse"></div>
            </div>

            <h2 className="text-3xl font-black font-display italic uppercase text-black mb-3 text-shadow-sm transform -skew-x-2">
              Nenhum Jogo <span className="text-brawl-red">Agora</span>
            </h2>

            <p className="text-gray-600 font-bold font-body mb-8 text-sm leading-relaxed uppercase tracking-wide">
              Os jogos de hoje já começaram ou ainda não foram agendados. Volte
              mais tarde para apostar!
            </p>

            {Object.keys(predictions).length > 0 && onShowReview ? (
              <button
                onClick={onShowReview}
                className="w-full bg-brawl-red hover:bg-[#d41d1d] text-white py-4 font-black italic uppercase border-[3px] border-black shadow-comic active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 group"
              >
                <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">
                  rate_review
                </span>
                Revisar Apostas
              </button>
            ) : (
              <div className="w-full bg-gray-100 text-gray-400 py-3 font-bold uppercase border-[2px] border-gray-300 flex items-center justify-center gap-2 text-xs tracking-widest cursor-default">
                <span className="material-symbols-outlined text-sm">
                  hourglass_empty
                </span>
                Aguardando Partidas
              </div>
            )}
          </div>

          {/* Tape Decoration */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-[#e6e6e6]/90 border border-gray-300 shadow-sm transform -rotate-1 z-20 backdrop-blur-sm"></div>
        </div>
      </div>
    );

  return (
    <>
      <div className="bg-paper bg-paper-texture font-body min-h-screen flex flex-col items-center pt-24 pb-8 relative overflow-x-hidden text-ink pencil-texture">
        {/* Header / Navbar */}

        {/* Decorations */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-48 left-8 opacity-90 transform -rotate-6 mix-blend-multiply">
            <img
              alt="skull sketch"
              className="w-40 h-40 opacity-90 grayscale contrast-125"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcyPuj6Sq4tDwxCCuui5iMyMZPU7euASmUS2kkIJ5s-P98YXwo-_VV0HN13d3UBaGL3x0o7QiRhF6qX7IyZ3-O84FCK8xgm9KwHL0y7P0TrgvU2XFkDFr-8LpB7LkEcz02C1CHG60aQSW4eyjYCM9nhVRkMwPrHk3thVE_-99YJ4bJSZfON4BqUFp7speoaYX0rfN93B7B5ifBVwkNFb1wPqLWft2x4hptTJRG9H5Ev2YEtWdt2LU50e8kBRjQL_qd9XMechENCl4"
              style={{ filter: "drop-shadow(2px 2px 0px rgba(0,0,0,0.1))" }}
            />
          </div>
          <div className="absolute top-80 left-12 transform -rotate-6 text-5xl font-marker text-gray-300 opacity-50 z-[-1]">
            <span className="block">SKINS</span>
            <span className="block ml-4">FOR COLT</span>
            <span className="block ml-8">AGAIN?</span>
          </div>
          <div className="absolute top-[600px] right-[-50px] transform rotate-12 opacity-30">
            <svg
              className="w-80 h-80 text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 100 100"
            >
              <path
                d="M20,20 L80,80 M80,20 L20,80"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
              <circle cx="50" cy="50" r="15" strokeDasharray="5,5"></circle>
            </svg>
          </div>
          <div className="absolute top-32 right-8 transform rotate-2 bg-white p-2 shadow-md w-40 hidden lg:block border border-gray-300">
            <div className="w-full aspect-[3/4] bg-gray-200 grayscale overflow-hidden relative">
              <img
                className="object-cover w-full h-full opacity-80 mix-blend-multiply contrast-125"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHEN5FVE_cZy4m4XY2vxXiBMfh1TiHctWZCQM6Xf4Ws-KmxPh7B3MzMfM9Q-0Lb4fEYVMtTznnjtj0LScOI67ofv7QxWvZs358sHwGka-4pCNrF_02xx8IeL0_Ye_NmorEZ14mz-eMWLfqsoUYTPLkzAUz1CLXmbyyTPzmCMBxvO7Ce0BB4vdrJdOzotkHCZ-Jc48R27lQry8YFBHJWuHPeZPLfVBKCWckqb207-_ni847tH0tGcQrqPsCPKr_i7KA5lvTxZ42kGE"
                alt="Decoration"
              />
            </div>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-4 bg-black/20 rotate-1 backdrop-blur-sm"></div>
          </div>
        </div>

        <main className="relative z-10 w-full max-w-[500px] mx-auto flex flex-col items-center px-4">
          {/* Match Title Header */}
          <header className="text-center space-y-2 mb-8 w-full flex flex-col items-center">
            <h1
              className="relative z-10 text-3xl md:text-4xl font-black uppercase tracking-tight text-black px-4 py-1 font-display"
              style={{ textShadow: "2px 2px 0px rgba(0,0,0,0.1)" }}
            >
              Predict The Winner
            </h1>
            {/* Double Post-it Header */}
            <div className="flex flex-col items-center gap-0 relative z-30">
              {/* Logo Post-it (Top) */}
              {currentMatch.tournamentLogoUrl && (
                <div className="relative bg-white border border-gray-200 p-3 shadow-sm transform -rotate-2 z-10 w-32 h-32 md:w-46 md:h-46 flex items-center justify-center">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-12 md:w-16 h-4 md:h-5 bg-[#e8e8e0] opacity-80 shadow-sm"></div>
                  <img
                    src={currentMatch.tournamentLogoUrl}
                    alt=""
                    className="w-full h-full object-contain filter drop-shadow-sm"
                  />
                </div>
              )}

              {/* Name Post-it (Bottom) - Overlapping the logo (z-20) */}
              <div
                className={clsx(
                  "relative bg-white border border-gray-200 px-6 py-2 md:px-8 md:py-3 shadow-sm transform rotate-1 skew-x-[-2deg] z-20 max-w-[280px] md:max-w-sm text-center",
                  currentMatch.tournamentLogoUrl ? "-mt-2" : "mt-0",
                )}
              >
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-12 md:w-16 h-3 md:h-4 bg-[#e8e8e0] opacity-80 shadow-sm"></div>
                <p className="text-[10px] md:text-sm font-black tracking-widest text-black uppercase font-display transform skew-x-[2deg]">
                  {currentMatch.tournamentName || "Brawl Stars Championship"}
                </p>
              </div>
            </div>

            <div className="bg-black text-[10px] font-black text-white px-3 py-1 rounded-full tracking-[0.2em] transform -skew-x-12 inline-flex items-center gap-1.5 shadow-sm mt-6">
              <span className="w-1.5 h-1.5 bg-brawl-yellow rounded-full animate-pulse"></span>
              LIVE BRACKET
            </div>
            <div className="mt-4 font-body font-bold text-gray-800 text-[10px] tracking-widest uppercase flex items-center justify-center gap-2">
              <span>{currentMatch.label}</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
              <span className="text-gray-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">
                  schedule
                </span>
                {new Date(currentMatch.startTime).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </header>

          {/* Carousel Content Area with Transition */}
          <div className="w-full relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentMatch.id}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full"
              >
                <div className="w-full bg-paper border-0 shadow-none relative overflow-visible">
                  <div className="absolute top-[-100px] -left-[140px] w-[300px] h-[300px] md:w-[500px] md:h-[500px] pointer-events-none opacity-90 z-0 transform -rotate-12">
                    <PaintSplatterBlue className="w-full h-full" />
                  </div>
                  <div className="absolute top-[-100px] -right-[140px] w-[300px] h-[300px] md:w-[500px] md:h-[500px] pointer-events-none opacity-90 z-0 transform rotate-12">
                    <PaintSplatterRed className="w-full h-full" />
                  </div>

                  <div className="relative z-10 shadow-comic bg-transparent">
                    {/* Match Header Label */}
                    <div className="bg-ink text-white text-center py-2 border border-black relative z-20">
                      <span className="font-body font-bold tracking-widest text-[10px] uppercase">
                        Match {currentIndex + 1} of {matches.length}
                      </span>
                    </div>

                    {/* TEAMS DISPLAY */}
                    <div className="grid grid-cols-2 relative h-36 md:h-48 border-x border-black bg-white">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                        <div className="bg-white border-[2px] border-black rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center shadow-comic">
                          <span className="font-display font-black text-xs md:text-sm pt-0.5">
                            VS
                          </span>
                        </div>
                      </div>

                      {/* Team A (Blue) */}
                      <div
                        role="button"
                        onClick={() =>
                          setSelectedWinnerId(currentMatch.teamA.id)
                        }
                        className={clsx(
                          "relative flex flex-col items-center p-0 overflow-hidden h-full border-r border-black cursor-pointer transition-all duration-200 group",
                          isSelected(currentMatch.teamA.id)
                            ? "bg-brawl-blue"
                            : isOtherTeamSelected(currentMatch.teamA.id)
                              ? "bg-gray-200 grayscale"
                              : "bg-brawl-blue hover:brightness-110",
                        )}
                      >
                        {isSelected(currentMatch.teamA.id) && (
                          <div className="absolute inset-0 border-[4px] border-[#ccff00] z-20 pointer-events-none animate-pulse"></div>
                        )}

                        <div className="w-full h-full flex flex-col relative z-10">
                          <div className="w-full pt-3 pb-1 px-2 text-left">
                            <span
                              className={clsx(
                                "text-[9px] md:text-[10px] font-bold font-body uppercase tracking-wider block text-shadow-sm truncate",
                                isSelected(currentMatch.teamA.id) ||
                                  !selectedWinnerId
                                  ? "text-white"
                                  : "text-gray-600",
                              )}
                            >
                              {currentMatch.teamA.name}
                            </span>
                          </div>
                          <div className="flex-grow flex items-center justify-center p-2">
                            <TeamLogo
                              teamName={currentMatch.teamA.name}
                              logoUrl={currentMatch.teamA.logoUrl}
                              size="lg"
                              className="md:scale-125"
                            />
                          </div>
                          <div className="w-full py-1 text-center border-t border-white/20 bg-black/10">
                            <span className="text-white text-[8px] md:text-[9px] font-bold uppercase font-body tracking-wider">
                              Win Rate: {currentMatch.stats.winRateA}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Team B (Red) */}
                      <div
                        role="button"
                        onClick={() =>
                          setSelectedWinnerId(currentMatch.teamB.id)
                        }
                        className={clsx(
                          "relative flex flex-col items-center p-0 overflow-hidden h-full bg-brawl-red cursor-pointer transition-all duration-200 group",
                          isSelected(currentMatch.teamB.id)
                            ? "bg-brawl-red"
                            : isOtherTeamSelected(currentMatch.teamB.id)
                              ? "bg-gray-200 grayscale"
                              : "bg-brawl-red hover:brightness-110",
                        )}
                      >
                        {isSelected(currentMatch.teamB.id) && (
                          <div className="absolute inset-0 border-[4px] border-[#ccff00] z-20 pointer-events-none animate-pulse"></div>
                        )}
                        <div className="w-full h-full flex flex-col relative z-10">
                          <div className="w-full pt-3 pb-1 px-2 text-right">
                            <span
                              className={clsx(
                                "text-[9px] md:text-[10px] font-bold font-body uppercase tracking-wider block text-shadow-sm truncate",
                                isSelected(currentMatch.teamB.id) ||
                                  !selectedWinnerId
                                  ? "text-white"
                                  : "text-gray-600",
                              )}
                            >
                              {currentMatch.teamB.name}
                            </span>
                          </div>
                          <div className="flex-grow flex items-center justify-center p-2">
                            <TeamLogo
                              teamName={currentMatch.teamB.name}
                              logoUrl={currentMatch.teamB.logoUrl}
                              size="lg"
                              className="md:scale-125"
                            />
                          </div>
                          <div className="w-full py-1 text-center border-t border-white/20 bg-black/10">
                            <span className="text-white text-[8px] md:text-[9px] font-bold uppercase font-body tracking-wider">
                              Win Rate: {currentMatch.stats.winRateB}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* STATS TABLE */}
                    <div className="bg-gray-100 font-body border-x border-black border-b border-black">
                      <div className="bg-gray-200 border-y border-black py-1 text-center">
                        <span className="text-[9px] font-bold tracking-[0.1em] text-gray-900 uppercase">
                          2025 Stats
                        </span>
                      </div>
                      {/* Compact stats rows */}
                      <div className="flex flex-col text-[10px] md:text-xs font-bold text-gray-900">
                        <StatsRow
                          left={currentMatch.stats.regionA}
                          label="Region"
                          right={currentMatch.stats.regionB}
                        />
                        <StatsRow
                          left={currentMatch.stats.pointsA.toString()}
                          label="Points"
                          right={currentMatch.stats.pointsB.toString()}
                        />
                        <StatsRow
                          left={currentMatch.stats.winRateA}
                          label="Win Rate"
                          right={currentMatch.stats.winRateB}
                        />
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="grid grid-cols-2 p-3 gap-3 bg-ink border-x border-b border-black">
                      <button className="bg-ink text-white hover:bg-gray-800 py-2 px-3 flex items-center justify-center gap-2 border border-gray-600 shadow-none hover:border-white transition-all rounded-sm group">
                        <span className="material-symbols-outlined text-sm">
                          visibility
                        </span>
                        <span className="font-display font-bold text-xs tracking-wider">
                          TEAM PAGE
                        </span>
                      </button>
                      <button className="bg-ink text-white hover:bg-gray-800 py-2 px-3 flex items-center justify-center gap-2 border border-gray-600 shadow-none hover:border-white transition-all rounded-sm group">
                        <span className="material-symbols-outlined text-sm">
                          shield
                        </span>
                        <span className="font-display font-bold text-xs tracking-wider">
                          TEAM PAGE
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* PREDICTION OPTIONS */}
                <div className="w-full mt-8 md:mt-10">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 px-0">
                    {scoreOptions.map((option) => {
                      const isOptionSelected = selectedScore === option.label;
                      // Only allow selecting score if a winner is selected
                      const isDisabled = !selectedWinnerId;

                      return (
                        <button
                          key={option.label}
                          onClick={() =>
                            !isDisabled && setSelectedScore(option.label)
                          }
                          disabled={isDisabled}
                          className={clsx(
                            "group relative rounded-sm p-3 md:p-4 shadow-comic btn-press transition-all duration-100 h-20 md:h-24 flex flex-col justify-center items-center border-[3px]",
                            isDisabled
                              ? "bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed"
                              : isOptionSelected
                                ? activeAccentColor === "brawl-blue"
                                  ? "bg-white border-brawl-blue ring-2 ring-offset-2 ring-brawl-blue/20 z-10 hover:shadow-comic-hover"
                                  : "bg-white border-brawl-red ring-2 ring-offset-2 ring-brawl-red/20 z-10 hover:shadow-comic-hover"
                                : "bg-white border-black hover:shadow-comic-hover",
                          )}
                        >
                          {/* Selected Indicator Badge */}
                          {isOptionSelected && (
                            <div
                              className={clsx(
                                "absolute -top-3 left-1/2 transform -translate-x-1/2 text-white border border-black text-[9px] font-bold font-body px-2 py-0.5 uppercase shadow-sm z-20",
                                activeAccentColor === "brawl-blue"
                                  ? "bg-brawl-blue"
                                  : "bg-brawl-red",
                              )}
                            >
                              Selected
                            </div>
                          )}

                          <div
                            className={clsx(
                              "flex items-center gap-2 font-display font-black text-2xl md:text-4xl",
                              isOptionSelected
                                ? activeAccentColor === "brawl-blue"
                                  ? "text-brawl-blue"
                                  : "text-brawl-red"
                                : "text-gray-400 group-hover:text-black transition-colors",
                            )}
                          >
                            {option.label}
                          </div>

                          <span
                            className={clsx(
                              "text-[8px] md:text-[9px] font-bold font-body uppercase tracking-wider mt-1 px-1",
                              isOptionSelected
                                ? "text-black border border-black bg-brawl-yellow rounded-sm transform -rotate-1 shadow-sm"
                                : "text-gray-500 font-bold",
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

          {/* Lock In Button */}
          <div className="mt-8 w-full max-w-xs relative group mx-auto">
            <button
              onClick={handleNext}
              disabled={!selectedWinnerId || !selectedScore}
              className={clsx(
                "relative w-full border-[3px] border-black text-white font-black font-display text-lg uppercase py-3 rounded-sm shadow-comic active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2 overflow-hidden",
                !selectedWinnerId || !selectedScore
                  ? "bg-gray-400 cursor-not-allowed border-gray-500 shadow-none opacity-80"
                  : activeAccentColor === "brawl-blue"
                    ? "bg-brawl-blue hover:shadow-comic-hover cursor-pointer"
                    : "bg-brawl-red hover:shadow-comic-hover cursor-pointer",
              )}
            >
              <span className="material-symbols-outlined text-lg">
                {isLastMatch && allBetsComplete ? "verified" : "arrow_forward"}
              </span>
              {getButtonText()}
            </button>
          </div>

          {/* Pagination Dots */}
          <div className="flex justify-center items-center gap-3 mt-6 mb-12">
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
                  onClick={() => {
                    setCurrentIndex(i);
                  }}
                  className={clsx(
                    "w-4 h-4 rounded-full border-[2px] border-black transition-all duration-200 outline-none relative",
                    i === currentIndex
                      ? "bg-brawl-yellow scale-125 shadow-sm"
                      : hasPrediction
                        ? "bg-green-500 hover:bg-green-600"
                        : "bg-white hover:bg-gray-100",
                  )}
                  aria-label={`Go to match ${i + 1}`}
                >
                  {hasPrediction && i !== currentIndex && (
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </main>
      </div>
    </>
  );
}

// Subcomponent used in Stats Table
function StatsRow({
  left,
  label,
  right,
}: {
  left: string;
  label: string;
  right: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_1.5fr_1fr] border-b border-gray-400 divide-x divide-gray-400">
      <div className="py-2 text-center bg-transparent">{left}</div>
      <div className="py-2 text-center bg-gray-200/50 uppercase tracking-wide text-[9px] flex items-center justify-center text-gray-600 font-medium">
        {label}
      </div>
      <div className="py-2 text-center bg-transparent">{right}</div>
    </div>
  );
}
