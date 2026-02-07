import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { db, matches } from "@bsebet/db";
import { eq, asc, and, isNotNull } from "drizzle-orm";
import { BettingCarousel } from "../components/BettingCarousel";
import {
  TournamentBracket,
  type Match,
  type Prediction,
} from "../components/TournamentBracket";
import { useState, useMemo } from "react";
import { clsx } from "clsx";
const getMatches = createServerFn({ method: "GET" }).handler(async () => {
  const data = await db.query.matches.findMany({
    where: eq(matches.isBettingEnabled, true), // Todos os jogos com apostas ativas (independente do status)
    orderBy: [asc(matches.displayOrder), asc(matches.startTime)], // Ordem personalizada + cronológica
    with: {
      teamA: true,
      teamB: true,
    },
  });

  return formatMatches(data);
});

// 2. SERVER FUNCTION: Busca jogos do bracket do torneio que tem apostas ativas
const getBracketMatches = createServerFn({ method: "GET" }).handler(
  async () => {
    // Primeiro, encontra o torneio que tem partidas com apostas ativas
    const activeBettingMatch = await db.query.matches.findFirst({
      where: eq(matches.isBettingEnabled, true),
      columns: { tournamentId: true },
    });

    // Se não há partidas com apostas ativas, não mostra bracket
    if (!activeBettingMatch?.tournamentId) {
      return [];
    }

    // Busca TODAS as partidas do bracket desse torneio específico
    const data = await db.query.matches.findMany({
      where: and(
        isNotNull(matches.bracketSide),
        eq(matches.tournamentId, activeBettingMatch.tournamentId),
      ),
      orderBy: [asc(matches.roundIndex), asc(matches.displayOrder)],
      with: {
        teamA: true,
        teamB: true,
      },
    });

    return formatMatches(data);
  },
);

// Helper function to format matches for the frontend
function formatMatches(data: any[]): Match[] {
  const formattedMatches = data.map((m) => ({
    id: m.id,
    label:
      m.name ||
      m.label ||
      (m.labelTeamA && m.labelTeamB
        ? `${m.labelTeamA} vs ${m.labelTeamB}`
        : `Group Stage`),
    name: m.name,
    displayOrder: m.displayOrder,
    // Base values from DB
    nextMatchWinnerId: m.nextMatchWinnerId,
    nextMatchWinnerSlot: m.nextMatchWinnerSlot,
    nextMatchLoserId: m.nextMatchLoserId,
    nextMatchLoserSlot: m.nextMatchLoserSlot,
    winnerId: m.winnerId,
    labelTeamA: m.labelTeamA,
    labelTeamB: m.labelTeamB,
    // Bracket-specific fields
    roundIndex: m.roundIndex,
    bracketSide: m.bracketSide,
    isBettingEnabled: m.isBettingEnabled ?? false,
    // REAL DATA
    status: m.status,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    startTime: m.startTime,
    teamA: {
      id: m.teamA?.id ?? 0,
      name: m.teamA?.name ?? m.labelTeamA ?? "?",
      logoUrl: m.teamA?.logoUrl ?? undefined,
      color: "blue" as const,
    },
    teamB: {
      id: m.teamB?.id ?? 0,
      name: m.teamB?.name ?? m.labelTeamB ?? "?",
      logoUrl: m.teamB?.logoUrl ?? undefined,
      color: "red" as const,
    },
    format: "bo5" as const,
    stats: {
      regionA: m.teamA?.region || "SA",
      regionB: m.teamB?.region || "SA",
      pointsA: 0,
      pointsB: 0,
      winRateA: "50%",
      winRateB: "50%",
    },
  }));

  // Lógica de Sincronização Dinâmica:
  // Se uma partida B diz que depende da partida A (backward),
  // garantimos que a partida A saiba que deve enviar o resultado para B (forward).
  // Isso faz o Carousel funcionar sem o admin precisar preencher os dois lados.
  formattedMatches.forEach((match) => {
    // Busca todos os jogos que dependem desta partida (ex: um para o winner, outro para o loser)
    const followers = data.filter(
      (other) =>
        other.teamAPreviousMatchId === match.id ||
        other.teamBPreviousMatchId === match.id,
    );

    followers.forEach((follower) => {
      // Se o follower depende no Slot A
      if (follower.teamAPreviousMatchId === match.id) {
        if (follower.teamAPreviousMatchResult === "winner") {
          match.nextMatchWinnerId = follower.id;
          match.nextMatchWinnerSlot = "A";
        } else {
          match.nextMatchLoserId = follower.id;
          match.nextMatchLoserSlot = "A";
        }
      }
      // Se o follower depende no Slot B
      if (follower.teamBPreviousMatchId === match.id) {
        if (follower.teamBPreviousMatchResult === "winner") {
          match.nextMatchWinnerId = follower.id;
          match.nextMatchWinnerSlot = "B";
        } else {
          match.nextMatchLoserId = follower.id;
          match.nextMatchLoserSlot = "B";
        }
      }
    });
  });

  return formattedMatches;
}

// 3. A ROTA: Define o loader e renderiza a página
export const Route = createFileRoute("/")({
  loader: async () => {
    const [carouselMatches, bracketMatches] = await Promise.all([
      getMatches(),
      getBracketMatches(),
    ]);
    return { carouselMatches, bracketMatches };
  },
  component: Home,
});

// Review Screen Component
function ReviewScreen({
  matches,
  predictions,
  onUpdatePrediction,
  onBack,
}: {
  matches: any[];
  predictions: Record<number, Prediction>;
  onUpdatePrediction: (
    matchId: number,
    winnerId: number,
    score?: string,
  ) => void;
  onBack: () => void;
}) {
  const [editingScoreMatchId, setEditingScoreMatchId] = useState<number | null>(
    null,
  );
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Apply predictions to project matches (move winners/losers to next matches)
  const projectedMatches = useMemo(() => {
    // Deduplicate matches by ID first
    const uniqueMatchesMap = new Map();
    matches.forEach((match) => {
      if (!uniqueMatchesMap.has(match.id)) {
        uniqueMatchesMap.set(match.id, match);
      }
    });
    const uniqueMatches = Array.from(uniqueMatchesMap.values());

    // Clone matches to avoid mutating props
    const projected = uniqueMatches.map((m) => ({
      ...m,
      teamA: { ...m.teamA },
      teamB: { ...m.teamB },
    }));

    // Create a map for quick access
    const matchMap = new Map(projected.map((m) => [m.id, m]));

    // Apply actual results first (for finished games)
    uniqueMatches.forEach((match) => {
      const showResult = match.status === "live" || match.status === "finished";
      if (!showResult || !match.winnerId) return;

      const winnerId = match.winnerId;
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

    // Apply predictions to move teams forward
    Object.entries(predictions).forEach(([matchIdStr, prediction]) => {
      const matchId = parseInt(matchIdStr);
      const match = matchMap.get(matchId);
      if (!match) return;

      // Skip predictions if the match already has a real result
      if (match.status === "live" || match.status === "finished") return;

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

  // Filter matches to show in review: predicted matches OR finished/live matches
  const matchesToDisplay = useMemo(() => {
    return projectedMatches.filter(
      (match) =>
        predictions[match.id] ||
        match.status === "finished" ||
        match.status === "live",
    );
  }, [projectedMatches, predictions]);

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-paper bg-paper-texture flex flex-col p-6 overflow-y-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="w-full max-w-2xl lg:max-w-3xl mx-auto flex flex-col items-center">
          {/* Header */}
          <header className="text-center mb-8">
            <div className="bg-black text-[10px] font-black text-white px-3 py-1 rounded-full tracking-[0.2em] transform -skew-x-12 inline-flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 bg-brawl-yellow rounded-full"></span>
              DAY 1 - PLAYOFFS
            </div>
            <h2 className="font-display font-black text-4xl italic uppercase text-black tracking-tighter transform -skew-x-12">
              Review Your <span className="text-brawl-red">Picks</span>
            </h2>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">
              Check everything before locking in!
            </p>
          </header>

          {/* Back Button */}
          <button
            onClick={onBack}
            className="mb-6 text-sm font-black text-black hover:text-brawl-red transition-colors uppercase flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">
              arrow_back
            </span>
            Voltar para apostas
          </button>

          {/* Matches List */}
          <div className="w-full space-y-6 mb-12">
            {matchesToDisplay.map((match, idx) => {
              const prediction = predictions[match.id];
              const isWinnerA = prediction?.winnerId === match.teamA.id;
              const isWinnerB = prediction?.winnerId === match.teamB.id;
              const isEditingScore = editingScoreMatchId === match.id;
              const showResult =
                match.status === "live" || match.status === "finished";
              const isActualWinnerA =
                showResult && match.winnerId === match.teamA.id;
              const isActualWinnerB =
                showResult && match.winnerId === match.teamB.id;
              const matchActiveColor = isWinnerA ? "brawl-blue" : "brawl-red";

              const winsNeeded =
                match.format === "bo5" ? 3 : match.format === "bo3" ? 2 : 4;
              const scoreOptions = [];
              for (let loserWins = 0; loserWins < winsNeeded; loserWins++) {
                const label = isWinnerA
                  ? `${winsNeeded} - ${loserWins}`
                  : `${loserWins} - ${winsNeeded}`;
                scoreOptions.push(label);
              }

              return (
                <div
                  key={match.id}
                  className="w-full bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_#000] overflow-hidden transform hover:-translate-y-1 transition-all duration-200"
                >
                  {/* Match Header Bar */}
                  <div className="bg-zinc-900 border-b-[4px] border-black px-4 py-1.5 flex justify-between items-center">
                    <span className="text-[10px] md:text-xs font-black uppercase text-white tracking-[0.2em] italic">
                      {match.label || match.name || `MATCH ${idx + 1}`}
                    </span>
                  </div>

                  {/* Match Body - Split Design */}
                  <div className="relative min-h-[112px] h-auto flex overflow-hidden group">
                    {/* VS Divider Badge */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
                      <div className="bg-white border-[3px] border-black rotate-[15deg] px-1.5 py-0.5 shadow-[2px_2px_0px_0px_#000]">
                        <span className="font-display font-black text-black text-xs italic">
                          VS
                        </span>
                      </div>
                    </div>

                    {/* Team A Side */}
                    <div
                      onClick={() => {
                        onUpdatePrediction(match.id, match.teamA.id);
                      }}
                      className={clsx(
                        "flex-1 min-w-0 flex items-center pr-14 pl-6 py-4 relative transition-all duration-300 border-r-2 border-black/10 cursor-pointer hover:z-20",
                        isActualWinnerA
                          ? "bg-[#ccff00] text-black"
                          : isWinnerA
                            ? "bg-brawl-blue"
                            : "bg-white hover:bg-gray-50",
                        showResult &&
                          !isActualWinnerA &&
                          "opacity-50 grayscale",
                      )}
                    >
                      {isWinnerA && (
                        <>
                          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                          <div className="absolute top-2 left-2 bg-white text-black font-black italic text-[9px] px-2 py-0.5 border border-black shadow-sm z-30">
                            PICK
                          </div>
                        </>
                      )}
                      <div className="flex items-center gap-4 relative z-10 w-full overflow-hidden">
                        <div
                          className={clsx(
                            "w-14 h-14 shrink-0 rounded-full p-2 backdrop-blur-sm border-2 transition-all",
                            isWinnerA
                              ? "bg-white/20 border-white shadow-sm"
                              : "bg-black/5 border-black/10",
                          )}
                        >
                          <img
                            src={match.teamA.logoUrl || ""}
                            className="w-full h-full object-contain filter drop-shadow-md"
                            alt=""
                          />
                        </div>
                        <span
                          className={clsx(
                            "font-display font-black uppercase italic text-xl md:text-2xl tracking-tighter leading-tight transform -skew-x-6 line-clamp-2 px-1",
                            isActualWinnerA
                              ? "text-black"
                              : isWinnerA
                                ? "text-white"
                                : showResult
                                  ? "text-zinc-500" // Dimmer for losers
                                  : "text-zinc-400",
                          )}
                        >
                          {match.teamA.name}
                        </span>
                      </div>
                    </div>

                    {/* Team B Side */}
                    <div
                      onClick={() => {
                        onUpdatePrediction(match.id, match.teamB.id);
                      }}
                      className={clsx(
                        "flex-1 min-w-0 flex items-center justify-end pl-14 pr-6 py-4 relative transition-all duration-300 border-l-2 border-black/10 cursor-pointer hover:z-20",
                        isActualWinnerB
                          ? "bg-[#ccff00] text-black"
                          : isWinnerB
                            ? "bg-brawl-red"
                            : "bg-white hover:bg-gray-50",
                        showResult &&
                          !isActualWinnerB &&
                          "opacity-50 grayscale",
                      )}
                    >
                      {isWinnerB && (
                        <>
                          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                          <div className="absolute top-2 right-2 bg-white text-black font-black italic text-[9px] px-2 py-0.5 border border-black shadow-sm z-30">
                            PICK
                          </div>
                        </>
                      )}
                      <div className="flex items-center gap-4 justify-end relative z-10 w-full overflow-hidden">
                        <span
                          className={clsx(
                            "font-display font-black uppercase italic text-xl md:text-2xl tracking-tighter leading-tight transform -skew-x-6 text-right line-clamp-2 px-1",
                            isActualWinnerB
                              ? "text-black"
                              : isWinnerB
                                ? "text-white"
                                : showResult
                                  ? "text-zinc-500" // Dimmer for losers
                                  : "text-zinc-400",
                          )}
                        >
                          {match.teamB.name}
                        </span>
                        <div
                          className={clsx(
                            "w-14 h-14 shrink-0 rounded-full p-2 backdrop-blur-sm border-2 transition-all",
                            isWinnerB
                              ? "bg-white/20 border-white shadow-sm"
                              : "bg-black/5 border-black/10",
                          )}
                        >
                          <img
                            src={match.teamB.logoUrl || ""}
                            className="w-full h-full object-contain filter drop-shadow-md"
                            alt=""
                          />
                        </div>
                      </div>
                    </div>

                    {/* Predicted Score Overlay / Selector */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-50">
                      {isEditingScore ? (
                        <div className="flex gap-1 bg-white border-[3px] border-black p-1 shadow-[4px_4px_0px_0px_#000] -rotate-1 animate-in zoom-in-95 duration-200">
                          {scoreOptions.map((opt) => (
                            <button
                              key={opt}
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdatePrediction(
                                  match.id,
                                  prediction?.winnerId || 0,
                                  opt,
                                );
                                setEditingScoreMatchId(null);
                              }}
                              className={clsx(
                                "px-2 py-1 font-display font-black text-xs italic border-2 transition-all",
                                prediction?.score === opt
                                  ? matchActiveColor === "brawl-blue"
                                    ? "bg-brawl-blue border-black text-white"
                                    : "bg-brawl-red border-black text-white"
                                  : "bg-white border-transparent text-gray-400 hover:text-black hover:border-gray-200",
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingScoreMatchId(match.id);
                          }}
                          className={clsx(
                            "border-[3px] border-black px-4 py-1 shadow-[4px_4px_0px_0px_#000] -rotate-1 hover:scale-105 active:scale-95 transition-all outline-none",
                            matchActiveColor === "brawl-blue"
                              ? "bg-brawl-blue"
                              : "bg-brawl-red",
                          )}
                        >
                          <span className="font-display font-black text-sm text-white italic">
                            {prediction?.score || "N/A"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lock In Button */}
          <button
            onClick={() => setIsSuccessModalOpen(true)}
            className="w-full max-w-xs bg-brawl-red hover:bg-[#d41d1d] text-white py-4 font-black italic uppercase border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all flex items-center justify-center gap-3 text-xl mb-12"
          >
            <span className="material-symbols-outlined text-2xl">verified</span>
            Lock in All Picks
          </button>
        </div>
      </div>

      {/* COMPLETION MODAL */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-brawl-yellow border-[6px] border-black shadow-[16px_16px_0px_0px_#000] w-full max-w-md p-8 flex flex-col items-center text-center transform animate-in zoom-in-95 duration-500 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brawl-red/20 rounded-full blur-2xl"></div>

            <div className="w-24 h-24 bg-white border-[4px] border-black rounded-full flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_#000] rotate-3">
              <span className="material-symbols-outlined text-6xl text-green-500 font-black">
                celebration
              </span>
            </div>

            <h3 className="font-display font-black text-5xl italic uppercase text-black tracking-tighter mb-4 transform -skew-x-12 leading-none">
              PICKS <span className="text-brawl-red">LOCKED!</span>
            </h3>

            <p className="font-body font-bold text-black text-lg mb-8 leading-snug">
              Your predictions are in. Good luck on the board, champion!
            </p>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-black hover:bg-zinc-800 text-white py-4 font-black uppercase border-[4px] border-black shadow-[6px_6px_0px_0px_#ccff00] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-lg tracking-widest"
            >
              GO TO LEADERBOARD
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Home() {
  const { carouselMatches, bracketMatches } = Route.useLoaderData();
  const [viewMode, setViewMode] = useState<"list" | "bracket">("list");
  const [showReview, setShowReview] = useState(false);

  // Shared state for predictions
  const [predictions, setPredictions] = useState<Record<number, Prediction>>(
    {},
  );

  const updatePrediction = (
    matchId: number,
    winnerId: number,
    score?: string,
  ) => {
    setPredictions((prev) => {
      const current = prev[matchId];
      let newScore = score ?? current?.score ?? "";

      // If winner changed and score exists, flip the format (A-B format)
      if (current && current.winnerId !== winnerId && newScore.includes("-")) {
        const parts = newScore.split("-").map((s) => s.trim());
        if (parts.length === 2 && !score) {
          // Only flip if we are toggling winner, not setting explicit score
          newScore = `${parts[1]} - ${parts[0]}`;
        }
      }

      return {
        ...prev,
        [matchId]: {
          winnerId,
          score: newScore,
        },
      };
    });
  };

  const removePrediction = (matchId: number) => {
    setPredictions((prev) => {
      const newPredictions = { ...prev };
      delete newPredictions[matchId];
      return newPredictions;
    });
  };

  const hasMatches = carouselMatches.length > 0 || bracketMatches.length > 0;

  return (
    <div className="min-h-screen bg-paper bg-paper-texture">
      {/* VIEW SWITCHER */}
      {hasMatches && !showReview && (
        <div className="fixed bottom-6 right-6 z-[60]">
          <div className="inline-flex bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000] overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={clsx(
                "px-6 py-2 font-black uppercase text-sm transition-all flex items-center gap-2 relative",
                viewMode === "list"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-100",
              )}
            >
              {viewMode === "list" && (
                <div className="absolute inset-0 border-[3px] border-[#ccff00] pointer-events-none" />
              )}
              <span className="material-symbols-outlined text-base">
                view_carousel
              </span>
              Carrossel
            </button>
            <button
              onClick={() => setViewMode("bracket")}
              className={clsx(
                "px-6 py-2 font-black uppercase text-sm transition-all flex items-center gap-2 border-l-[3px] border-black relative",
                viewMode === "bracket"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-100",
              )}
            >
              {viewMode === "bracket" && (
                <div className="absolute inset-0 border-[3px] border-[#ccff00] pointer-events-none" />
              )}
              <span className="material-symbols-outlined text-base">
                account_tree
              </span>
              Chaves
            </button>
          </div>
        </div>
      )}

      {hasMatches ? (
        showReview ? (
          <ReviewScreen
            matches={[...carouselMatches, ...bracketMatches]}
            predictions={predictions}
            onUpdatePrediction={updatePrediction}
            onBack={() => setShowReview(false)}
          />
        ) : viewMode === "list" ? (
          <BettingCarousel
            matches={carouselMatches.filter(
              (m: any) => m.status === "scheduled",
            )}
            predictions={predictions}
            onUpdatePrediction={updatePrediction}
            onShowReview={() => setShowReview(true)}
          />
        ) : (
          <TournamentBracket
            matches={bracketMatches}
            predictions={predictions}
            onUpdatePrediction={updatePrediction}
            onRemovePrediction={removePrediction}
            onReview={() => setShowReview(true)}
          />
        )
      ) : (
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 relative z-10">
          <div className="bg-white border-[4px] border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] max-w-md w-full relative overflow-hidden transform rotate-2">
            <div className="absolute top-0 left-0 w-full h-2 bg-black opacity-10 repeating-linear-gradient-45"></div>

            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 rounded-full bg-gray-100 border-[3px] border-black flex items-center justify-center relative">
                <span className="text-6xl filter grayscale opacity-50">🏆</span>
                <div className="absolute -bottom-2 -right-2 bg-[#ff2e2e] text-white text-xs font-black uppercase px-2 py-1 border-2 border-black transform -rotate-12">
                  OFFLINE
                </div>
              </div>
            </div>

            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-black mb-2">
              NO ACTIVE <span className="text-[#2e5cff]">TOURNAMENTS</span>
            </h2>

            <p className="text-gray-500 font-bold text-sm uppercase mb-6 leading-relaxed">
              The arena is quiet... for now. Check back later for upcoming
              matches and predictions!
            </p>

            <div className="w-full h-[2px] bg-black opacity-10 mb-6"></div>

            <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
              SYSTEM STATUS: WAITING FOR ADMIN SEED
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute top-1/4 left-10 w-20 h-20 border-[4px] border-white/10 rounded-full animate-bounce delay-1000"></div>
            <div className="absolute bottom-1/4 right-10 w-16 h-16 bg-[#ccff00]/10 transform rotate-45 animate-pulse"></div>
          </div>
        </div>
      )}
    </div>
  );
}
