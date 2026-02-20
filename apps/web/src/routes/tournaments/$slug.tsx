import { createFileRoute, Link } from "@tanstack/react-router";
import { getTournamentBySlug } from "@/server/tournaments";
import { extractColorsServer } from "@/server/color-extractor";
import { MatchCard } from "@/components/MatchCard";
import { clsx } from "clsx";
import {
  Calendar,
  MapPin,
  Trophy,
  Users,
  ArrowLeft,
  Filter,
  Sparkles,
  Workflow,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { GSLResultView } from "@/components/GSLResultView";
import { TournamentBracket } from "@/components/TournamentBracket";
import { getIntermediateColor } from "@/lib/color-extractor";

export const Route = createFileRoute("/tournaments/$slug")({
  loader: ({ params }) => getTournamentBySlug({ data: params.slug }),
  component: TournamentDetailsPage,
});

function TournamentDetailsPage() {
  const { tournament, matches, userBets } = Route.useLoaderData();
  const [filter, setFilter] = useState<
    "all" | "my-bets" | "upcoming" | "finished"
  >("all");

  // State for tournament colors extracted from logo
  const [tournamentColors, setTournamentColors] = useState({
    primary: "#2e5cff",
    secondary: "#ff2e2e",
    intermediate: "#7f46d6",
  });

  // Extract colors from tournament logo using server-side function
  useEffect(() => {
    if (tournament.logoUrl) {
      extractColorsServer({ data: tournament.logoUrl })
        .then((colors) => {
          const intermediate = getIntermediateColor(
            colors.primary,
            colors.secondary,
          );
          setTournamentColors({
            primary: colors.primary,
            secondary: colors.secondary,
            intermediate,
          });
        })
        .catch((error) => {
          console.error("Error extracting colors:", error);
        });
    }
  }, [tournament.logoUrl]);

  // PROPAGATION LOGIC: Separated into Real and Predicted tracks
  const { realMatches, predictedMatches } = useMemo(() => {
    const teamsPool = new Map<string, any>();
    matches.forEach((m: any) => {
      if (m.teamA?.id) teamsPool.set(String(m.teamA.id), m.teamA);
      if (m.teamB?.id) teamsPool.set(String(m.teamB.id), m.teamB);
    });

    const runPropagation = (includePredictions: boolean) => {
      // 1. Clone matches to avoid mutating the original data
      const matchMap = new Map<string, any>();
      const cloned = JSON.parse(JSON.stringify(matches));
      cloned.forEach((m: any) => matchMap.set(String(m.id), m));

      // 2. Sort by order to ensure we process early rounds first
      const sortedIds = Array.from(matchMap.keys()).sort((a, b) => {
        const mA = matchMap.get(a);
        const mB = matchMap.get(b);
        return (
          (mA.roundIndex || 0) - (mB.roundIndex || 0) ||
          (mA.displayOrder || 0) - (mB.displayOrder || 0) ||
          mA.id - mB.id
        );
      });

      // 3. Propagate (5 passes for depth - supports up to 32 team brackets)
      for (let i = 0; i < 5; i++) {
        sortedIds.forEach((matchId) => {
          const match = matchMap.get(matchId);
          if (!match) return;

          // Skip group-stage matches – they use GSL propagation below
          if (match.bracketSide === "groups" || match.label?.includes("Group"))
            return;

          const bet = userBets.find((b: any) => String(b.matchId) === matchId);

          // Determine winner: Real result takes precedence. Prediction only if enabled.
          let winnerValue = match.winnerId;
          if (!winnerValue && includePredictions && bet) {
            winnerValue = bet.predictedWinnerId;
          }

          const winnerId = winnerValue ? String(winnerValue) : null;
          if (!winnerId) return;

          const teamAId = match.teamA?.id ? String(match.teamA.id) : null;
          const teamBId = match.teamB?.id ? String(match.teamB.id) : null;

          const winnerTeam =
            winnerId === teamAId
              ? match.teamA
              : winnerId === teamBId
                ? match.teamB
                : (teamsPool.get(winnerId) ?? null);

          const loserId = winnerId === teamAId ? teamBId : teamAId;
          const loserTeam = loserId
            ? ((teamAId === loserId ? match.teamA : match.teamB) ??
              teamsPool.get(loserId) ??
              null)
            : null;

          // FIX: The bracket generator uses teamAPreviousMatchId/B (backward links).
          // nextMatchWinnerId is NEVER populated, so we scan child matches instead.
          matchMap.forEach((child) => {
            if (child.status === "finished") return;
            if (
              child.teamAPreviousMatchId &&
              String(child.teamAPreviousMatchId) === matchId
            ) {
              const needsWinner =
                (child.teamAPreviousMatchResult || "winner") === "winner";
              const team = needsWinner ? winnerTeam : loserTeam;
              if (team) {
                child.teamA = team;
                child.labelTeamA = null;
              }
            }
            if (
              child.teamBPreviousMatchId &&
              String(child.teamBPreviousMatchId) === matchId
            ) {
              const needsWinner =
                (child.teamBPreviousMatchResult || "winner") === "winner";
              const team = needsWinner ? winnerTeam : loserTeam;
              if (team) {
                child.teamB = team;
                child.labelTeamB = null;
              }
            }
          });
        });

        // GSL Specific Propagation
        const groups: Record<string, any[]> = {};
        matchMap.forEach((m) => {
          if (
            m.bracketSide === "groups" ||
            (m.label && m.label.includes("Group"))
          ) {
            const groupName =
              m.label?.match(/Group\s+(\w+)/i)?.[0] || m.label || "Group Stage";
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(m);
          }
        });

        Object.values(groups).forEach((groupMatches) => {
          const findMatch = (patterns: string[]) =>
            groupMatches.find((m) => {
              const text = (m.name || m.label || "").toLowerCase();
              return patterns.some((p) => text.includes(p.toLowerCase()));
            });

          const openingMatches = groupMatches
            .filter((m) => {
              const text = (m.name || m.label || "").toLowerCase();
              return (
                text.includes("opening") ||
                text.includes("abertura") ||
                text.includes("rodada 1") ||
                (!text.includes("winner") &&
                  !text.includes("loser") &&
                  !text.includes("decider"))
              );
            })
            .sort((a, b) => a.id - b.id);

          const winnersMatch = findMatch(["winners", "vencedores", "winner"]);
          const elimMatch = findMatch(["elimination", "eliminação", "loser"]);
          const deciderMatch = findMatch(["decider", "decisiva", "decisivo"]);

          if (openingMatches.length >= 2) {
            const op1 = openingMatches[0];
            const op2 = openingMatches[1];

            const getOutcome = (m: any) => {
              const bet = userBets.find((b: any) => b.matchId === m.id);
              const wId =
                m.winnerId ||
                (includePredictions && bet ? bet.predictedWinnerId : null);
              if (!wId) return { w: null, l: null };

              const winnerTeam =
                wId === m.teamA?.id
                  ? m.teamA
                  : wId === m.teamB?.id
                    ? m.teamB
                    : teamsPool.get(wId);

              // Find loser: if winner is A, loser is B.
              const isWinnerA = wId === m.teamA?.id;
              const loserId = isWinnerA ? m.teamB?.id : m.teamA?.id;
              const loserTeam = loserId
                ? teamsPool.get(loserId)
                : isWinnerA
                  ? m.teamB
                  : m.teamA;

              return {
                w: winnerTeam,
                l: loserTeam,
              };
            };

            const out1 = getOutcome(op1);
            const out2 = getOutcome(op2);

            if (winnersMatch && winnersMatch.status !== "finished") {
              if (out1.w) {
                winnersMatch.teamA = out1.w;
                winnersMatch.labelTeamA = null;
              }
              if (out2.w) {
                winnersMatch.teamB = out2.w;
                winnersMatch.labelTeamB = null;
              }
            }
            if (elimMatch && elimMatch.status !== "finished") {
              if (out1.l) {
                elimMatch.teamA = out1.l;
                elimMatch.labelTeamA = null;
              }
              if (out2.l) {
                elimMatch.teamB = out2.l;
                elimMatch.labelTeamB = null;
              }
            }
          }

          if (
            winnersMatch &&
            elimMatch &&
            deciderMatch &&
            deciderMatch.status !== "finished"
          ) {
            const getOutcome = (m: any) => {
              const bet = userBets.find((b: any) => b.matchId === m.id);
              const wId =
                m.winnerId ||
                (includePredictions && bet ? bet.predictedWinnerId : null);
              if (!wId) return { w: null, l: null };

              const winnerTeam =
                wId === m.teamA?.id
                  ? m.teamA
                  : wId === m.teamB?.id
                    ? m.teamB
                    : teamsPool.get(wId);

              // Find loser: if winner is A, loser is B.
              const isWinnerA = wId === m.teamA?.id;
              const loserId = isWinnerA ? m.teamB?.id : m.teamA?.id;
              const loserTeam = loserId
                ? teamsPool.get(loserId)
                : isWinnerA
                  ? m.teamB
                  : m.teamA;

              return {
                w: winnerTeam,
                l: loserTeam,
              };
            };
            const outWin = getOutcome(winnersMatch);
            const outElim = getOutcome(elimMatch);
            if (outWin.l) {
              deciderMatch.teamA = outWin.l;
              deciderMatch.labelTeamA = null;
            }
            if (outElim.w) {
              deciderMatch.teamB = outElim.w;
              deciderMatch.labelTeamB = null;
            }
          }
        });
      }
      return Array.from(matchMap.values());
    };

    return {
      realMatches: runPropagation(false),
      predictedMatches: runPropagation(true),
    };
  }, [matches, userBets]);

  const filteredMatches = (
    filter === "my-bets" ? predictedMatches : realMatches
  ).filter((match: any) => {
    if (filter === "my-bets") {
      // For personal bets view, always show the playoff matches to maintain bracket structure
      // even if no direct bet exists yet for a specific round.
      if (match.bracketSide !== "groups" && !match.label?.includes("Group")) {
        return true;
      }
      return userBets.some((bet: any) => bet.matchId === match.id);
    }
    if (filter === "upcoming") {
      return match.status === "scheduled";
    }
    if (filter === "finished") {
      return match.status === "finished";
    }
    return true;
  });

  const isActive = tournament.status === "active";

  // Performance Optimization: Group matches by side and round
  const groupedMatches = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const other: any[] = [];

    filteredMatches.forEach((m: any) => {
      if (
        m.bracketSide === "groups" ||
        (m.label && m.label.includes("Group"))
      ) {
        const groupName =
          m.label?.match(/Group\s+(\w+)/i)?.[0] || m.label || "Group Stage";
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(m);
      } else {
        other.push(m);
      }
    });

    // Group otherMatches by Rounds
    const rounds: Record<number, any[]> = {};
    other.forEach((m: any) => {
      const r = m.roundIndex || 0;
      if (!rounds[r]) rounds[r] = [];
      rounds[r].push(m);
    });

    const sortedRoundIndices = Object.keys(rounds)
      .map(Number)
      .sort((a, b) => a - b);

    const roundNamesMap: Record<number, string> = {};
    sortedRoundIndices.forEach((rIdx) => {
      const totalRounds = sortedRoundIndices.length;
      const reverseIdx = totalRounds - rIdx - 1;
      if (reverseIdx === 0) roundNamesMap[rIdx] = "GRAND FINAL";
      else if (reverseIdx === 1) roundNamesMap[rIdx] = "SEMI-FINALS";
      else if (reverseIdx === 2) roundNamesMap[rIdx] = "QUARTER-FINALS";
      else roundNamesMap[rIdx] = `ROUND ${rIdx + 1}`;
    });

    return {
      groups: Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)),
      otherMatchesByRound: sortedRoundIndices.map((rIdx) => ({
        rIdx,
        matches: rounds[rIdx].sort(
          (mA, mB) =>
            (mA.displayOrder || 0) - (mB.displayOrder || 0) || mA.id - mB.id,
        ),
      })),
      roundNames: roundNamesMap,
    };
  }, [filteredMatches]);

  return (
    <div className="min-h-screen bg-paper bg-paper-texture font-sans text-ink pb-20">
      {/* Header Banner - Tournament Colors (Dynamic) */}
      <div
        className="relative text-white overflow-hidden border-b-4 border-black transition-all duration-500"
        style={{
          background: `linear-gradient(90deg,
            ${tournamentColors.primary} 0%,
            ${tournamentColors.primary} 15%,
            ${tournamentColors.intermediate} 50%,
            ${tournamentColors.secondary} 85%,
            ${tournamentColors.secondary} 100%)`,
        }}
      >
        {/* Pattern Overlay */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

        {/* Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12" />

        {/* Soft Darkening Overlays for depth */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/20 via-transparent to-black/20" />

        <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
          <div className="flex justify-between items-start mb-6">
            <Link
              to="/tournaments"
              search={{ filter: "active" }}
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors font-bold uppercase tracking-wider text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Torneios
            </Link>

            {matches.some(
              (m) => m.isBettingEnabled && m.status === "scheduled",
            ) && (
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-[#ccff00] text-black hover:bg-[#b8e600] transition-all font-black uppercase tracking-wider px-4 py-2 border-2 border-black shadow-[4px_4px_0_0_#000] transform hover:scale-105 hover:rotate-1 active:translate-y-0.5 active:shadow-none -rotate-1 text-[10px] md:text-sm animate-in fade-in slide-in-from-right duration-500"
              >
                <Sparkles className="w-4 h-4" />
                🔥 Mais Apostas
              </Link>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
            {/* Logo - Platinum 3D Style */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-white/40 blur-3xl rounded-full scale-110" />

              <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-2xl border-[6px] border-black shadow-[8px_8px_0_0_#000,12px_12px_0_0_rgba(0,0,0,0.3)] flex items-center justify-center overflow-hidden p-6 bg-gradient-to-br from-gray-300 via-gray-100 to-gray-300">
                {/* Metallic shine bars */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent" />
                <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-black/20 to-transparent" />

                {/* Reflective highlights */}
                <div className="absolute top-4 left-4 w-12 h-12 bg-white/70 rounded-full blur-xl" />
                <div className="absolute bottom-6 right-6 w-8 h-8 bg-black/10 rounded-full blur-lg" />

                {tournament.logoUrl ? (
                  <img
                    src={tournament.logoUrl}
                    alt={tournament.name}
                    className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)] relative z-10"
                  />
                ) : (
                  <Trophy className="w-16 h-16 text-gray-400 relative z-10" />
                )}

                {/* Inner border highlight - platinum edge */}
                <div className="absolute inset-3 border-2 border-white/60 rounded-xl pointer-events-none" />
                <div className="absolute inset-2 border border-black/10 rounded-xl pointer-events-none" />
              </div>

              {isActive && (
                <div className="absolute -bottom-4 -right-4 bg-[#ccff00] text-black text-xs font-black px-3 py-1 rounded border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] transform rotate-3 animate-pulse">
                  AO VIVO
                </div>
              )}
            </div>

            {/* Title & Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                {tournament.region && (
                  <span className="bg-black text-[#ccff00] border-2 border-black px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    {tournament.region}
                  </span>
                )}
                <span className="bg-black text-[#ccff00] border-2 border-black px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {formatDate(tournament.startDate)} -{" "}
                  {formatDate(tournament.endDate)}
                </span>
              </div>

              <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none mb-3 text-white drop-shadow-[4px_4px_8px_rgba(0,0,0,0.4)]">
                {tournament.name}
              </h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-white/90 font-mono text-sm uppercase font-bold">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {tournament.participantsCount || 0} Times
                </span>
                <span>•</span>
                <span>
                  {tournament.format ||
                    (() => {
                      const stages = (tournament.stages as any[]) || [];
                      if (stages.length === 0) return "Formato Desconhecido";

                      const types = Array.from(
                        new Set(stages.map((s) => s.type)),
                      );
                      const typeMap: Record<string, string> = {
                        Groups: "Fase de Grupos",
                        "Single Elimination": "Playoffs",
                        "Double Elimination": "Playoffs (Double)",
                      };

                      return types.map((t) => typeMap[t] || t).join(" + ");
                    })()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="Todos os Jogos"
          />
          <FilterButton
            active={filter === "my-bets"}
            onClick={() => setFilter("my-bets")}
            label="Meus Palpites"
            badge={userBets.length}
          />
          <div className="w-px h-8 bg-black/10 mx-2 hidden md:block" />
          <FilterButton
            active={filter === "upcoming"}
            onClick={() => setFilter("upcoming")}
            label="Em Breve"
          />
          <FilterButton
            active={filter === "finished"}
            onClick={() => setFilter("finished")}
            label="Finalizados"
          />
        </div>

        {/* Matches Grid */}
        <div className="space-y-4">
          {filteredMatches.length > 0 ? (
            <div className="flex flex-col gap-12">
              {filter === "all" || filter === "my-bets" ? (
                <>
                  {/* Render GSL Groups */}
                  {groupedMatches.groups.map(([groupName, groupMatches]) => {
                    const hasOpening = groupMatches.some((m) => {
                      const text = (m.label || m.name || "").toLowerCase();
                      return (
                        text.includes("opening") ||
                        text.includes("abertura") ||
                        text.includes("rodada 1") ||
                        text.includes("round 1")
                      );
                    });

                    const isGSL = hasOpening || groupMatches.length === 5;

                    if (isGSL) {
                      return (
                        <GSLResultView
                          key={groupName}
                          groupName={groupName}
                          matches={groupMatches}
                          userBets={userBets}
                          showPredictionScore={filter === "my-bets"}
                        />
                      );
                    }

                    return (
                      <div key={groupName} className="space-y-4">
                        <h3 className="text-2xl font-black italic uppercase text-white bg-black px-4 py-2 inline-block transform -skew-x-12">
                          {groupName}
                        </h3>
                        {groupMatches.map((match) => (
                          <MatchCard
                            key={match.id}
                            match={{
                              ...match,
                              category:
                                match.bracketSide === "groups"
                                  ? "Fase de Grupos"
                                  : "Playoffs",
                              isBettingEnabled: match.isBettingEnabled ?? false,
                              status: match.status as
                                | "scheduled"
                                | "live"
                                | "finished",
                              format: "bo3",
                              teamA: match.teamA as any,
                              teamB: match.teamB as any,
                            }}
                            initialBet={
                              filter === "my-bets"
                                ? (userBets.find(
                                    (b: any) => b.matchId === match.id,
                                  ) as any)
                                : undefined
                            }
                            showPredictionScore={filter === "my-bets"}
                          />
                        ))}
                      </div>
                    );
                  })}

                  {/* Render Others (Playoffs, etc.) as a Bracket */}
                  {groupedMatches.otherMatchesByRound.length > 0 && (
                    <div className="flex flex-col gap-8 items-center mt-12 bg-white/40 p-8 rounded-3xl border-4 border-black/5 shadow-inner backdrop-blur-sm">
                      <div className="flex items-center gap-4 w-full mb-8">
                        <Workflow className="w-8 h-8 text-black" />
                        <h3 className="text-4xl font-black italic uppercase text-black">
                          Playoff Bracket
                        </h3>
                        <div className="h-1 bg-black/10 flex-grow rounded-full" />
                      </div>

                      <div className="w-full overflow-x-auto pb-6">
                        <TournamentBracket
                          className="w-full flex flex-col items-center min-w-max"
                          hideHeader={true}
                          matches={filteredMatches.filter(
                            (m: any) =>
                              m.bracketSide !== "groups" &&
                              !m.label?.includes("Group"),
                          )}
                          predictions={
                            filter === "my-bets"
                              ? userBets.reduce(
                                  (acc: any, bet: any) => {
                                    acc[bet.matchId] = {
                                      winnerId: bet.predictedWinnerId,
                                      score: `${bet.predictedScoreA}-${bet.predictedScoreB}`,
                                      pointsEarned: bet.pointsEarned,
                                      isCorrect:
                                        bet.match?.winnerId ===
                                        bet.predictedWinnerId,
                                      isUnderdogPick: bet.isUnderdogPick,
                                    };
                                    return acc;
                                  },
                                  {} as Record<number, any>,
                                )
                              : {}
                          }
                          onUpdatePrediction={() => {}}
                          isReadOnly={true}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Simple List View for Status Filtering */
                <div className="flex flex-col gap-4">
                  {filteredMatches
                    .sort(
                      (a, b) =>
                        new Date(a.startTime).getTime() -
                        new Date(b.startTime).getTime(),
                    )
                    .map((match) => (
                      <MatchCard
                        key={match.id}
                        match={{
                          ...match,
                          category:
                            match.bracketSide === "groups"
                              ? "Fase de Grupos"
                              : "Playoffs",
                          isBettingEnabled: match.isBettingEnabled ?? false,
                          status: match.status as
                            | "scheduled"
                            | "live"
                            | "finished",
                          format: "bo3",
                          teamA: match.teamA as any,
                          teamB: match.teamB as any,
                        }}
                        initialBet={userBets.find(
                          (b: any) => b.matchId === match.id,
                        )}
                        showPredictionScore={false}
                      />
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 bg-white border-4 border-black/10 rounded-xl border-dashed">
              <Filter className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-black italic uppercase text-gray-400">
                Nenhuma partida encontrada
              </h3>
              <p className="text-gray-400 text-sm font-bold uppercase mt-1">
                Tente mudar os filtros
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative px-4 py-2 font-black uppercase text-sm italic tracking-wider border-2 transition-all transform skew-x-[-6deg]",
        active
          ? "bg-brawl-yellow border-black text-black shadow-comic -translate-y-1"
          : "bg-white border-black/10 text-gray-400 hover:border-black hover:text-black",
      )}
    >
      <span className="block skew-x-[6deg] flex items-center gap-2">
        {label}
        {badge !== undefined && badge > 0 && (
          <span className="bg-brawl-red text-white text-[10px] px-1.5 py-0.5 rounded-full not-italic">
            {badge}
          </span>
        )}
      </span>
    </button>
  );
}

function formatDate(date: Date | string | null) {
  if (!date) return "TBA";
  return new Date(date)
    .toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    })
    .toUpperCase()
    .replace(".", "");
}
