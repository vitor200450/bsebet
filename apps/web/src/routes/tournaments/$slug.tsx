import { createFileRoute, Link } from "@tanstack/react-router";
import { getTournamentBySlug } from "@/server/tournaments";
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
import { useState, useMemo } from "react";
import { GSLResultView } from "@/components/GSLResultView";
import { MatchCard as BracketMatchCard } from "@/components/bracket/MatchCard";

export const Route = createFileRoute("/tournaments/$slug")({
  loader: ({ params }) => getTournamentBySlug({ data: params.slug }),
  component: TournamentDetailsPage,
});

function TournamentDetailsPage() {
  const { tournament, matches, userBets } = Route.useLoaderData();
  const [filter, setFilter] = useState<
    "all" | "my-bets" | "upcoming" | "finished"
  >("all");

  // PROPAGATION LOGIC: Separated into Real and Predicted tracks
  const { realMatches, predictedMatches } = useMemo(() => {
    const runPropagation = (includePredictions: boolean) => {
      // 1. Clone matches to avoid mutating the original data
      const matchMap = new Map<number, any>();
      const cloned = JSON.parse(JSON.stringify(matches));
      cloned.forEach((m: any) => matchMap.set(m.id, m));

      // 2. Sort by order to ensure we process early rounds first
      const sortedIds = Array.from(matchMap.keys()).sort((a, b) => {
        const mA = matchMap.get(a);
        const mB = matchMap.get(b);
        return (mA.displayOrder || 0) - (mB.displayOrder || 0) || mA.id - mB.id;
      });

      // 3. Propagate (3 passes for depth)
      for (let i = 0; i < 3; i++) {
        sortedIds.forEach((matchId) => {
          const match = matchMap.get(matchId);
          const bet = userBets.find((b) => b.matchId === match.id);

          // Determine winner: Real result takes precedence. Prediction only if enabled.
          let winnerId = match.winnerId;
          if (!winnerId && includePredictions && bet) {
            winnerId = bet.predictedWinnerId;
          }

          const propagateTo = (
            targetMatchId: number | null,
            slot: string | null,
            team: any,
          ) => {
            if (!targetMatchId || !team) return;
            const next = matchMap.get(targetMatchId);
            if (next && next.status !== "finished") {
              if (slot === "A") {
                next.teamA = team;
                next.labelTeamA = null;
              }
              if (slot === "B") {
                next.teamB = team;
                next.labelTeamB = null;
              }
            }
          };

          if (winnerId) {
            const winnerTeam =
              winnerId === match.teamA?.id ? match.teamA : match.teamB;
            const loserTeam =
              winnerId === match.teamA?.id ? match.teamB : match.teamA;

            if (winnerTeam)
              propagateTo(
                match.nextMatchWinnerId,
                match.nextMatchWinnerSlot,
                winnerTeam,
              );
            if (loserTeam)
              propagateTo(
                match.nextMatchLoserId,
                match.nextMatchLoserSlot,
                loserTeam,
              );
          }
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
              const bet = userBets.find((b) => b.matchId === m.id);
              const wId =
                m.winnerId ||
                (includePredictions && bet ? bet.predictedWinnerId : null);
              if (!wId) return { w: null, l: null };
              return {
                w: wId === m.teamA?.id ? m.teamA : m.teamB,
                l: wId === m.teamA?.id ? m.teamB : m.teamA,
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
              const bet = userBets.find((b) => b.matchId === m.id);
              const wId =
                m.winnerId ||
                (includePredictions && bet ? bet.predictedWinnerId : null);
              if (!wId) return { w: null, l: null };
              return {
                w: wId === m.teamA?.id ? m.teamA : m.teamB,
                l: wId === m.teamA?.id ? m.teamB : m.teamA,
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
      return userBets.some((bet) => bet.matchId === match.id);
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

  return (
    <div className="min-h-screen bg-paper bg-paper-texture font-sans text-ink pb-20">
      {/* Header Banner */}
      <div className="relative bg-zinc-900 text-white overflow-hidden border-b-4 border-black">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

        {/* Abstract Shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brawl-blue/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brawl-red/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
          <div className="flex justify-between items-start mb-6">
            <Link
              to="/tournaments"
              search={{ filter: "active" }}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-bold uppercase tracking-wider text-sm"
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
            {/* Logo */}
            <div className="relative">
              <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-2xl border-4 border-black shadow-comic flex items-center justify-center overflow-hidden rotate-[-3deg]">
                {tournament.logoUrl ? (
                  <img
                    src={tournament.logoUrl}
                    alt={tournament.name}
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <Trophy className="w-16 h-16 text-gray-300" />
                )}
              </div>
              {isActive && (
                <div className="absolute -bottom-4 -right-4 bg-[#ccff00] text-black text-xs font-black px-3 py-1 rounded border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] transform rotate-3 animate-pulse">
                  AO VIVO
                </div>
              )}
            </div>

            {/* Title & Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                {tournament.region && (
                  <span className="bg-black/50 text-white border border-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-sm">
                    <MapPin className="w-3 h-3" />
                    {tournament.region}
                  </span>
                )}
                <span className="bg-black/50 text-white border border-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-sm">
                  <Calendar className="w-3 h-3" />
                  {formatDate(tournament.startDate)} -{" "}
                  {formatDate(tournament.endDate)}
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none mb-2 text-shadow-sm">
                {tournament.name}
              </h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-400 font-mono text-sm uppercase">
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
            <>
              {filter === "all" || filter === "my-bets"
                ? // Group by "Group Name" for GSL View
                  (() => {
                    const groups: Record<string, typeof matches> = {};
                    const otherMatches: typeof matches = [];

                    filteredMatches.forEach((m: any) => {
                      if (
                        m.bracketSide === "groups" ||
                        (m.label && m.label.includes("Group"))
                      ) {
                        const groupName =
                          m.label?.match(/Group\s+(\w+)/i)?.[0] ||
                          m.label ||
                          "Group Stage";
                        if (!groups[groupName]) groups[groupName] = [];
                        groups[groupName].push(m);
                      } else {
                        otherMatches.push(m);
                      }
                    });

                    return (
                      <div className="flex flex-col gap-12">
                        {/* Render GSL Groups */}
                        {Object.entries(groups)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([groupName, groupMatches]) => {
                            // Check for GSL structure (Opening, Winners, etc.) or just typical Group size (4-5 matches)
                            const hasOpening = groupMatches.some((m) => {
                              const text = (
                                m.label ||
                                m.name ||
                                ""
                              ).toLowerCase();
                              return (
                                text.includes("opening") ||
                                text.includes("abertura") ||
                                text.includes("rodada 1") ||
                                text.includes("round 1")
                              );
                            });

                            const isGSL =
                              hasOpening || groupMatches.length === 5;

                            // If it looks like GSL and has enough matches (or at least some structure), use GSL View
                            if (isGSL) {
                              return (
                                <GSLResultView
                                  key={groupName}
                                  groupName={groupName}
                                  matches={groupMatches as any[]}
                                  userBets={userBets}
                                  showPredictionScore={filter === "my-bets"}
                                />
                              );
                            }
                            // Fallback to standard grid for this group if not GSL
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
                                      label: match.label,
                                      name: match.name, // Pass name explicitly
                                      category: `${match.bracketSide === "groups" ? "Fase de Grupos" : "Playoffs"}`,
                                      isBettingEnabled:
                                        match.isBettingEnabled ?? false,
                                      status: match.status as
                                        | "scheduled"
                                        | "live"
                                        | "finished",
                                      startTime: match.startTime,
                                      format: "bo3",
                                      labelTeamA: match.labelTeamA as
                                        | string
                                        | null,
                                      labelTeamB: match.labelTeamB as
                                        | string
                                        | null,
                                      teamA: match.teamA as any,
                                      teamB: match.teamB as any,
                                    }}
                                    initialBet={
                                      userBets.find(
                                        (b) => b.matchId === match.id,
                                      ) as any
                                    }
                                    showPredictionScore={filter === "my-bets"}
                                  />
                                ))}
                              </div>
                            );
                          })}

                        {/* Render Others (Playoffs, etc.) as a Bracket */}
                        {otherMatches.length > 0 && (
                          <div className="flex flex-col gap-8 items-center mt-12 bg-white/40 p-8 rounded-3xl border-4 border-black/5 shadow-inner backdrop-blur-sm">
                            <div className="flex items-center gap-4 w-full mb-8">
                              <Workflow className="w-8 h-8 text-black" />
                              <h3 className="text-4xl font-black italic uppercase text-black">
                                Playoff Bracket
                              </h3>
                              <div className="h-1 bg-black/10 flex-grow rounded-full" />
                            </div>

                            <div className="flex gap-12 overflow-x-auto w-full pb-10 items-stretch">
                              {/* Group by Rounds */}
                              {(() => {
                                const rounds: Record<number, any[]> = {};
                                otherMatches.forEach((m: any) => {
                                  const r = m.roundIndex || 0;
                                  if (!rounds[r]) rounds[r] = [];
                                  rounds[r].push(m);
                                });

                                return Object.keys(rounds)
                                  .map(Number)
                                  .sort((a, b) => a - b)
                                  .map((rIdx) => (
                                    <div
                                      key={rIdx}
                                      className="flex flex-col gap-6"
                                    >
                                      <div className="text-center">
                                        <span className="text-sm font-black uppercase bg-black text-[#ccff00] px-4 py-1.5 -skew-x-12 inline-block shadow-sm">
                                          {(() => {
                                            const totalRounds =
                                              Object.keys(rounds).length;
                                            const reverseIdx =
                                              totalRounds - rIdx - 1;
                                            if (reverseIdx === 0)
                                              return "GRAND FINAL";
                                            if (reverseIdx === 1)
                                              return "SEMI-FINALS";
                                            if (reverseIdx === 2)
                                              return "QUARTER-FINALS";
                                            return `ROUND ${rIdx + 1}`;
                                          })()}
                                        </span>
                                      </div>
                                      <div className="flex flex-col gap-8 justify-around h-full min-w-max px-4">
                                        {rounds[rIdx]
                                          .sort(
                                            (a, b) =>
                                              (a.displayOrder || 0) -
                                              (b.displayOrder || 0),
                                          )
                                          .map((match) => (
                                            <div
                                              key={match.id}
                                              className="w-72"
                                            >
                                              <BracketMatchCard
                                                match={{
                                                  ...match,
                                                  teamA:
                                                    match.teamA ||
                                                    ({
                                                      id: 0,
                                                      name:
                                                        match.labelTeamA ||
                                                        "TBD",
                                                      color: "blue",
                                                    } as any),
                                                  teamB:
                                                    match.teamB ||
                                                    ({
                                                      id: 0,
                                                      name:
                                                        match.labelTeamB ||
                                                        "TBD",
                                                      color: "red",
                                                    } as any),
                                                }}
                                                prediction={
                                                  (() => {
                                                    const bet = userBets.find(
                                                      (b) =>
                                                        b.matchId === match.id,
                                                    );
                                                    if (!bet) return undefined;

                                                    // Check if prediction was correct
                                                    const isCorrect =
                                                      match.winnerId ===
                                                      bet.predictedWinnerId;

                                                    return {
                                                      winnerId:
                                                        bet.predictedWinnerId,
                                                      score:
                                                        bet.predictedScoreA +
                                                        " - " +
                                                        bet.predictedScoreB,
                                                      pointsEarned:
                                                        bet.pointsEarned ?? 0,
                                                      isCorrect,
                                                      isUnderdogPick:
                                                        bet.isUnderdogPick ??
                                                        false,
                                                    };
                                                  })() as any
                                                }
                                                onUpdatePrediction={() => {}} // Read-only in details page
                                                isReadOnly={true}
                                              />
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  ));
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                : // Standard List View for filters
                  filteredMatches.map((match: any) => (
                    <MatchCard
                      key={match.id}
                      match={{
                        ...match,
                        label: match.label,
                        name: match.name, // Pass name explicitly
                        category: `${match.bracketSide === "groups" ? "Fase de Grupos" : "Playoffs"}`,
                        isBettingEnabled: match.isBettingEnabled ?? false,
                        status: match.status as
                          | "scheduled"
                          | "live"
                          | "finished",
                        startTime: match.startTime,
                        format: "bo3",
                        labelTeamA: match.labelTeamA as string | null,
                        labelTeamB: match.labelTeamB as string | null,
                        teamA: match.teamA as any,
                        teamB: match.teamB as any,
                      }}
                      initialBet={
                        filter === "upcoming"
                          ? undefined
                          : (userBets.find(
                              (b) => b.matchId === match.id,
                            ) as any)
                      }
                      showPredictionScore={false}
                    />
                  ))}
            </>
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
