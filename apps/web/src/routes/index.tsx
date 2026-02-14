import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq, asc, and, not, like, inArray } from "drizzle-orm";
import { BettingCarousel } from "../components/BettingCarousel";
import {
  TournamentBracket,
  type Match,
  type Prediction,
} from "../components/TournamentBracket";
import { LandingPage } from "../components/LandingPage";
import { TournamentSelector } from "../components/TournamentSelector";
import { MatchDaySelector } from "../components/MatchDaySelector";
import { getUser } from "../functions/get-user";
import { useState, useMemo, useEffect } from "react";
import { clsx } from "clsx";
// 1. SERVER FUNCTION: Lista torneios ativos com apostas OU onde usuário tem apostas
const getActiveTournaments = createServerFn({ method: "GET" }).handler(
  async () => {
    const { db, matches, tournaments, bets } = await import("@bsebet/db");
    const user = await getUser();

    // Step 1: Get all active tournaments (simplified query without nested with)
    const activeTournaments = await db.query.tournaments.findMany({
      where: and(
        eq(tournaments.isActive, true),
        eq(tournaments.status, "active"),
        not(like(tournaments.name, "Test Tournament%")),
      ),
    });

    // Step 2: Get matches with betting enabled for these tournaments
    const tournamentIds = activeTournaments.map((t: any) => t.id);
    const bettingMatches = await db.query.matches.findMany({
      where: and(
        inArray(matches.tournamentId, tournamentIds),
        eq(matches.isBettingEnabled, true),
      ),
      columns: { id: true, tournamentId: true },
    });

    const bettingEnabledTournamentIds = new Set(
      bettingMatches.map((m: any) => m.tournamentId)
    );

    // Step 3: Get tournament IDs where user has bets
    let userBetTournamentIds = new Set<number>();
    if (user) {
      const userBetsData = await db.query.bets.findMany({
        where: eq(bets.userId, user.user.id),
        columns: { matchId: true },
      });

      if (userBetsData.length > 0) {
        const userMatchIds = userBetsData.map((b: any) => b.matchId);
        const userMatches = await db.query.matches.findMany({
          where: inArray(matches.id, userMatchIds),
          columns: { tournamentId: true },
        });
        userMatches.forEach((m: any) => {
          if (m.tournamentId) userBetTournamentIds.add(m.tournamentId);
        });
      }
    }

    // Step 4: Combine all tournament IDs we need to fetch
    const allTournamentIdsToFetch = new Set([
      ...bettingEnabledTournamentIds,
      ...userBetTournamentIds,
    ]);

    // Step 5: Fetch tournaments and their matches separately
    let allTournaments: any[] = [];
    if (allTournamentIdsToFetch.size > 0) {
      allTournaments = await db.query.tournaments.findMany({
        where: and(
          inArray(tournaments.id, Array.from(allTournamentIdsToFetch)),
          not(like(tournaments.name, "Test Tournament%")),
        ),
      });

      // Fetch matches separately for each tournament
      const allMatches = await db.query.matches.findMany({
        where: inArray(matches.tournamentId, Array.from(allTournamentIdsToFetch)),
        orderBy: [asc(matches.startTime)],
      });

      // Attach matches to tournaments
      const matchesByTournament: { [key: number]: any[] } = {};
      allMatches.forEach((m: any) => {
        if (!matchesByTournament[m.tournamentId]) {
          matchesByTournament[m.tournamentId] = [];
        }
        matchesByTournament[m.tournamentId].push(m);
      });

      allTournaments = allTournaments.map((t: any) => ({
        ...t,
        matches: matchesByTournament[t.id] || [],
      }));
    }

    // Step 6: Filter to only include tournaments that have matches
    const tournamentsWithBetting = allTournaments
      .filter((t: any) => t.matches && t.matches.length > 0)
      .map((t: any) => {
        // Find the "active stage" (the label of the first scheduled/live match)
        const activeMatch =
          t.matches.find((m: any) => m.status === "live") || t.matches[0];
        let activeStage = activeMatch?.label || "Fase de Grupos";

        // Normalize "Group A", "Grupo B" etc to "Fase de Grupos"
        if (
          activeStage.toLowerCase().startsWith("group") ||
          activeStage.toLowerCase().startsWith("grupo")
        ) {
          activeStage = "Fase de Grupos";
        }

        return {
          id: t.id,
          name: t.name,
          logoUrl: t.logoUrl,
          status: t.status,
          startDate: t.startDate,
          matchCount: t.matches.length,
          activeStage,
          hasUserBets: userBetTournamentIds.has(t.id),
        };
      })
      // Sort: tournaments with user bets first, then by start date (most recent first)
      .sort((a: any, b: any) => {
        if (a.hasUserBets && !b.hasUserBets) return -1;
        if (!a.hasUserBets && b.hasUserBets) return 1;
        return (
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
      });

    return { tournaments: tournamentsWithBetting, user };
  },
);

// 2. SERVER FUNCTION: Busca todos os dados do torneio (partidas + apostas) em uma única chamada
const getHomeTournamentDataFn = createServerFn({ method: "GET" }).handler(
  async (ctx: any) => {
    const { tournamentId } = ctx.data;
    const { db, matches, matchDays, tournaments } = await import("@bsebet/db");
    const user = await getUser();

    // Get tournament info once (instead of joining on every match)
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tournamentId),
    });

    // Get all match days for this tournament
    const allMatchDays = await db.query.matchDays.findMany({
      where: eq(matchDays.tournamentId, tournamentId),
      orderBy: [asc(matchDays.date)],
    });

    // Find the active match day (only "open" status is considered active)
    const activeMatchDay = allMatchDays.find((md: any) => md.status === "open");

    const allMatches = await db.query.matches.findMany({
      where: eq(matches.tournamentId, tournamentId),
      orderBy: [asc(matches.roundIndex), asc(matches.displayOrder)],
      with: {
        teamA: true,
        teamB: true,
        matchDay: true,
      },
    });

    const formattedMatches = formatMatches(allMatches, tournament);

    let userBetsData: any[] = [];
    if (user && allMatches.length > 0) {
      const matchIds = allMatches.map((m) => m.id);
      userBetsData = await db.query.bets.findMany({
        where: (betsTable, { eq, and, inArray }) =>
          and(
            eq(betsTable.userId, user.user.id),
            inArray(betsTable.matchId, matchIds),
          ),
      });
    }

    return {
      matches: formattedMatches,
      userBets: userBetsData,
      matchDays: allMatchDays,
      activeMatchDayId: activeMatchDay?.id || null,
    };
  },
);

const getHomeTournamentData = getHomeTournamentDataFn as unknown as (opts: {
  data: { tournamentId: number };
}) => Promise<{
  matches: Match[];
  userBets: any[];
  matchDays: any[];
  activeMatchDayId: number | null;
}>;

// Helper function to format matches for the frontend
function formatMatches(data: any[], tournament?: any): Match[] {
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
    tournamentName: tournament?.name ?? null,
    tournamentLogoUrl: tournament?.logoUrl ?? null,
    scoringRules: tournament?.scoringRules ?? {
      winner: 1,
      exact: 3,
      underdog_25: 2,
      underdog_50: 1,
    },
    matchDayId: m.matchDayId ?? null,
    matchDayLabel: m.matchDay?.label ?? null,
    matchDayStatus: m.matchDay?.status ?? null,
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
  // Otimização: Usamos um Map para evitar complexidade O(N^2) no nested loop.

  // 1. Criar um mapa de dependentes: MatchId -> List<Matches que dependem dele>
  const dependentsMap = new Map<number, typeof data>();

  data.forEach((follower) => {
    // Se o follower depende de alguém no Slot A
    if (follower.teamAPreviousMatchId) {
      const parentId = follower.teamAPreviousMatchId;
      if (!dependentsMap.has(parentId)) {
        dependentsMap.set(parentId, []);
      }
      dependentsMap.get(parentId)?.push(follower);
    }

    // Se o follower depende de alguém no Slot B
    if (follower.teamBPreviousMatchId) {
      const parentId = follower.teamBPreviousMatchId;
      // Um mesmo follower pode depender de dois parents diferentes, ou do mesmo (teoricamente)
      // Se parentId for igual ao anterior, já adicionamos? Não, pois a lista é por parentId.
      // Se parentId diferente, adicionamos na lista desse outro parent.
      if (!dependentsMap.has(parentId)) {
        dependentsMap.set(parentId, []);
      }
      // Evitar duplicar se o mesmo match depender do mesmo pai nos dois slots (caso raro/bizarro)
      const list = dependentsMap.get(parentId);
      if (list && !list.includes(follower)) {
        list.push(follower);
      }
    }
  });

  // 2. Iterar sobre as partidas e preencher os campos "nextMatch..."
  formattedMatches.forEach((match) => {
    const followers = dependentsMap.get(match.id);

    if (followers) {
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
    }
  });

  return formattedMatches;
}

// 4. A ROTA: Define o loader e renderiza a página
export const Route = createFileRoute("/")({
  loader: async () => {
    const { tournaments, user } = await getActiveTournaments();
    return {
      tournaments,
      isAuthenticated: !!user,
      userId: user?.user?.id,
    };
  },
  component: Home,
});

// Review Screen Component
function ReviewScreen({
  matches,
  predictions,
  onUpdatePrediction,
  onBack,
  isReadOnly = false,
  tournamentId,
  userId,
  userBets = [],
  setSelectedMatchDayId,
  setShowReview,
  setPredictions,
  handleSelectTournament,
  setSelectedTournamentId,
}: {
  matches: any[];
  predictions: Record<number, Prediction>;
  onUpdatePrediction: (
    matchId: number,
    winnerId: number,
    score?: string,
  ) => void;
  onBack: () => void;
  isReadOnly?: boolean;
  tournamentId: number;
  userId: string;
  userBets?: any[];
  setSelectedMatchDayId?: (id: number | null) => void;
  setShowReview?: (show: boolean) => void;
  setPredictions?: React.Dispatch<
    React.SetStateAction<Record<number, Prediction>>
  >;
  handleSelectTournament?: (id: number) => Promise<void>;
  setSelectedTournamentId?: (id: number | null) => void;
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

    // GSL Decider Match Projection
    // In GSL format, decider matches get teams from:
    // - Slot A: Loser of Winners Match
    // - Slot B: Winner of Elimination Match
    const isGSLGroup = (matchName: string) => {
      const text = matchName.toLowerCase();
      return text.includes("group") || text.includes("grupo");
    };

    const findMatchByName = (patterns: string[]) => {
      return projected.find((m) => {
        const text = (m.name || m.label || "").toLowerCase();
        return patterns.some((p) => text.includes(p.toLowerCase()));
      });
    };

    // Group matches by their group identifier (e.g., "Group A", "Group B")
    const groupMap = new Map<string, any[]>();
    projected.forEach((match) => {
      const matchName = (match.name || match.label || "").toLowerCase();
      const groupMatch = matchName.match(/(group|grupo)\s*([a-z])/i);
      if (groupMatch) {
        const groupKey = groupMatch[0].toUpperCase();
        if (!groupMap.has(groupKey)) {
          groupMap.set(groupKey, []);
        }
        groupMap.get(groupKey)!.push(match);
      }
    });

    // Process each GSL group
    groupMap.forEach((groupMatches) => {
      const findInGroup = (patterns: string[]) =>
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
              !text.includes("decider") &&
              !text.includes("decisiva") &&
              !text.includes("decisivo"))
          );
        })
        .sort((a, b) => a.id - b.id);

      const winnersMatch = findInGroup(["winners", "vencedores", "winner"]);
      const elimMatch = findInGroup(["elimination", "eliminação", "loser"]);
      const deciderMatch = findInGroup([
        "decider",
        "decisiva",
        "decisivo",
      ]);

      // Project from opening matches to winners/elimination matches
      if (openingMatches.length >= 2) {
        const op1 = openingMatches[0];
        const op2 = openingMatches[1];

        const getOutcome = (m: any) => {
          const pred = predictions[m.id];
          let wId = m.winnerId;
          if (!wId && pred) {
            wId = pred.winnerId;
          }
          if (!wId) return { w: null, l: null };
          return {
            w: wId === m.teamA.id ? m.teamA : m.teamB,
            l: wId === m.teamA.id ? m.teamB : m.teamA,
          };
        };

        const out1 = getOutcome(op1);
        const out2 = getOutcome(op2);

        if (winnersMatch && !winnersMatch.winnerId) {
          if (out1.w) {
            winnersMatch.teamA = out1.w;
            winnersMatch.labelTeamA = null;
          }
          if (out2.w) {
            winnersMatch.teamB = out2.w;
            winnersMatch.labelTeamB = null;
          }
        }
        if (elimMatch && !elimMatch.winnerId) {
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

      // Project to decider match: Loser of Winners vs Winner of Elimination
      if (winnersMatch && elimMatch && deciderMatch && !deciderMatch.winnerId) {
        const getOutcome = (m: any) => {
          const pred = predictions[m.id];
          let wId = m.winnerId;
          if (!wId && pred) {
            wId = pred.winnerId;
          }
          if (!wId) return { w: null, l: null };
          return {
            w: wId === m.teamA.id ? m.teamA : m.teamB,
            l: wId === m.teamA.id ? m.teamB : m.teamA,
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

    return projected;
  }, [matches, predictions]);

  // Filter matches to show in review:
  // - If read-only: show ALL matches (including draft/scheduled)
  // - Otherwise: show only predicted matches OR finished/live matches
  const matchesToDisplay = useMemo(() => {
    return projectedMatches
      .filter(
        (match) =>
          isReadOnly || // Show all matches in read-only mode
          predictions[match.id] ||
          match.status === "finished" ||
          match.status === "live",
      )
      .sort((a, b) => {
        // Sort by startTime if available, otherwise by displayOrder/roundIndex
        const timeA = new Date(a.startTime).getTime();
        const timeB = new Date(b.startTime).getTime();
        if (timeA !== timeB) return timeA - timeB;

        return (a.displayOrder || 0) - (b.displayOrder || 0);
      });
  }, [projectedMatches, predictions, isReadOnly]);

  // Filter userBets to only include bets for matches being displayed (current matchday)
  const matchIdsInDisplay = useMemo(() => {
    return new Set(matchesToDisplay.map((m) => m.id));
  }, [matchesToDisplay]);

  const filteredUserBets = useMemo(() => {
    return userBets.filter((bet) => matchIdsInDisplay.has(bet.matchId));
  }, [userBets, matchIdsInDisplay]);

  // Calculate total points earned (only for current matchday)
  const totalPoints = useMemo(() => {
    return filteredUserBets.reduce(
      (sum, bet) => sum + (bet.pointsEarned || 0),
      0,
    );
  }, [filteredUserBets]);

  // Calculate stats (only for current matchday)
  const stats = useMemo(() => {
    const finished = matchesToDisplay.filter((m) => m.status === "finished");
    const withBets = finished.filter((m) =>
      filteredUserBets.find((b) => b.matchId === m.id),
    );
    const correct = withBets.filter((m) => {
      const bet = filteredUserBets.find((b) => b.matchId === m.id);
      return bet && m.winnerId === bet.predictedWinnerId;
    });
    const perfectPicks = filteredUserBets.filter((b) => b.isPerfectPick).length;
    const underdogPicks = filteredUserBets.filter(
      (b) => b.isUnderdogPick && b.pointsEarned > 0,
    ).length;

    return {
      total: withBets.length,
      correct: correct.length,
      perfectPicks,
      underdogPicks,
    };
  }, [matchesToDisplay, userBets]);

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-paper bg-paper-texture flex flex-col p-6 overflow-y-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="w-full max-w-2xl lg:max-w-3xl mx-auto flex flex-col items-center">
          {/* Header */}
          <header className="text-center mb-8">
            <div className="bg-black text-[10px] font-black text-white px-3 py-1 rounded-full tracking-[0.2em] transform -skew-x-12 inline-flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 bg-brawl-yellow rounded-full"></span>
              {matches[0]?.tournamentName?.toUpperCase() || "TORNEIO"} - REVISÃO
            </div>
            <h2 className="font-display font-black text-4xl italic uppercase text-black tracking-tighter transform -skew-x-12">
              Review Your <span className="text-brawl-red">Picks</span>
            </h2>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">
              Check everything before locking in!
            </p>
          </header>

          {/* Navigation Controls */}
          {!isReadOnly ? (
            <button
              onClick={onBack}
              className="mb-6 text-sm font-black text-black hover:text-brawl-red transition-colors uppercase flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">
                arrow_back
              </span>
              Voltar para apostas
            </button>
          ) : (
            <button
              onClick={() => {
                // Reset all state to show tournament selector
                setSelectedTournamentId?.(null);
                setSelectedMatchDayId?.(null);
                setShowReview?.(false);
                setPredictions?.({});
              }}
              className="mb-6 text-sm font-black text-black hover:text-brawl-blue transition-colors uppercase flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">
                emoji_events
              </span>
              Ver Torneios
            </button>
          )}

          {/* Stats Summary - Only show if there are finished matches with bets */}
          {isReadOnly && stats.total > 0 && (
            <div className="w-full bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_#000] mb-8 overflow-hidden">
              {/* Header */}
              <div className="bg-black text-white px-4 py-2 flex items-center justify-between border-b-[4px] border-black">
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Resumo de Pontos
                </span>
                <span className="material-symbols-outlined text-[#ccff00] text-base">
                  leaderboard
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                {/* Total Points */}
                <div className="text-center p-3 bg-[#ccff00] border-[3px] border-black shadow-[3px_3px_0px_0px_#000] transform -rotate-1">
                  <div className="text-3xl font-black italic text-black">
                    {totalPoints}
                  </div>
                  <div className="text-[9px] font-black uppercase text-black/60 mt-1">
                    Pontos Totais
                  </div>
                </div>

                {/* Correct Predictions */}
                <div className="text-center p-3 bg-green-500 border-[3px] border-black shadow-[3px_3px_0px_0px_#000] transform rotate-1">
                  <div className="text-3xl font-black italic text-white">
                    {stats.correct}/{stats.total}
                  </div>
                  <div className="text-[9px] font-black uppercase text-white/80 mt-1">
                    Acertos
                  </div>
                </div>

                {/* Perfect Picks */}
                <div className="text-center p-3 bg-blue-500 border-[3px] border-black shadow-[3px_3px_0px_0px_#000] transform -rotate-1">
                  <div className="text-3xl font-black italic text-white">
                    {stats.perfectPicks}
                  </div>
                  <div className="text-[9px] font-black uppercase text-white/80 mt-1">
                    Placares Exatos
                  </div>
                </div>

                {/* Underdog Wins */}
                <div className="text-center p-3 bg-gradient-to-r from-purple-600 to-pink-600 border-[3px] border-black shadow-[3px_3px_0px_0px_#000] transform rotate-1">
                  <div className="text-3xl font-black italic text-white flex items-center justify-center gap-1">
                    <span>🔥</span>
                    {stats.underdogPicks}
                  </div>
                  <div className="text-[9px] font-black uppercase text-white/80 mt-1">
                    Azarões
                  </div>
                </div>
              </div>

              {/* Accuracy Bar */}
              {stats.total > 0 && (
                <div className="px-4 pb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black uppercase text-gray-500">
                      Taxa de Acerto
                    </span>
                    <span className="text-[9px] font-black text-black">
                      {Math.round((stats.correct / stats.total) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 border-2 border-black overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{
                        width: `${(stats.correct / stats.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Matches List */}
          <div className="w-full space-y-6 mb-12 px-1">
            {matchesToDisplay.map((match, idx) => {
              const prediction = predictions[match.id];
              const betData = filteredUserBets.find(
                (b) => b.matchId === match.id,
              );

              // Use betData as source of truth when available (readonly mode)
              // BUT only if the match has a valid winnerId (data integrity check)
              const effectivePrediction =
                betData && match.winnerId !== null
                  ? {
                      winnerId: betData.predictedWinnerId,
                      score: `${betData.predictedScoreA}-${betData.predictedScoreB}`,
                    }
                  : prediction;

              const isWinnerA =
                effectivePrediction?.winnerId === match.teamA.id;
              const isWinnerB =
                effectivePrediction?.winnerId === match.teamB.id;
              const isEditingScore = editingScoreMatchId === match.id;
              const showResult =
                match.status === "live" || match.status === "finished";
              const isActualWinnerA =
                showResult && match.winnerId === match.teamA.id;
              const isActualWinnerB =
                showResult && match.winnerId === match.teamB.id;

              // Check if predicted team is not in the current match (bracket projection changed)
              const predictedTeamNotInMatch =
                betData?.predictedWinnerId &&
                ![
                  match.teamA.id,
                  match.teamB.id,
                ].includes(betData.predictedWinnerId);

              const matchActiveColor =
                isActualWinnerA || (!showResult && isWinnerA)
                  ? "brawl-blue"
                  : "brawl-red";
              const displayScore = showResult
                ? `${match.scoreA} - ${match.scoreB}`
                : effectivePrediction?.score || "N/A";

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
                  className={clsx(
                    "w-full bg-white border-[4px] overflow-visible transform hover:-translate-y-1 transition-all duration-200 relative mb-4",
                    betData?.isPerfectPick && match.winnerId !== null
                      ? "border-[#ccff00] shadow-[6px_6px_0px_0px_#ccff00,12px_12px_0px_0px_#000]"
                      : "border-black shadow-[6px_6px_0px_0px_#000]",
                  )}
                >
                  {/* Match Header Bar */}
                  <div
                    className={clsx(
                      "border-b-[4px] border-black px-4 py-1.5 flex justify-between items-center",
                      betData?.isPerfectPick && match.winnerId !== null
                        ? "bg-gradient-to-r from-[#ccff00] via-yellow-300 to-[#ccff00]"
                        : betData?.isUnderdogPick && match.winnerId !== null
                          ? "bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600"
                          : "bg-zinc-900",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          "text-[10px] md:text-xs font-black uppercase tracking-[0.2em] italic",
                          betData?.isPerfectPick || betData?.isUnderdogPick
                            ? "text-white"
                            : "text-white",
                        )}
                      >
                        {match.label || match.name || `MATCH ${idx + 1}`}
                      </span>
                      {betData?.isPerfectPick && match.winnerId !== null && (
                        <span className="bg-black text-[#ccff00] text-[8px] font-black px-2 py-0.5 border-2 border-black flex items-center gap-1">
                          ⭐ PERFECT PICK!
                        </span>
                      )}
                      {betData?.isUnderdogPick &&
                        match.winnerId !== null &&
                        !betData?.isPerfectPick && (
                          <span className="bg-black text-purple-300 text-[8px] font-black px-2 py-0.5 border-2 border-black flex items-center gap-1">
                            🔥 UNDERDOG!
                          </span>
                        )}
                    </div>
                    <div
                      className={clsx(
                        "text-[10px] font-black italic flex items-center gap-1 shrink-0",
                        betData?.isPerfectPick
                          ? "text-black"
                          : "text-[#ccff00]",
                      )}
                    >
                      <span className="material-symbols-outlined text-xs">
                        schedule
                      </span>
                      {new Date(match.startTime).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {/* Match Body - Split Design */}
                  <div className="relative min-h-[112px] h-auto flex overflow-visible group">
                    {/* Perfect Pick Overlay Effect */}
                    {betData?.isPerfectPick && match.winnerId !== null && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-[#ccff00]/20 via-yellow-200/10 to-[#ccff00]/20 pointer-events-none z-10" />
                        {/* Decorative Stars */}
                        <div
                          className="absolute top-2 left-2 text-2xl animate-bounce z-10"
                          style={{ animationDelay: "0ms" }}
                        >
                          ⭐
                        </div>
                        <div
                          className="absolute top-4 right-4 text-xl animate-bounce z-10"
                          style={{ animationDelay: "200ms" }}
                        >
                          ✨
                        </div>
                        <div
                          className="absolute bottom-2 left-6 text-lg animate-bounce z-10"
                          style={{ animationDelay: "400ms" }}
                        >
                          💫
                        </div>
                        <div
                          className="absolute bottom-4 right-8 text-xl animate-bounce z-10"
                          style={{ animationDelay: "600ms" }}
                        >
                          ⭐
                        </div>
                      </>
                    )}
                    {/* Underdog Pick Overlay Effect */}
                    {betData?.isUnderdogPick &&
                      match.winnerId !== null &&
                      !betData?.isPerfectPick && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-pink-600/10 to-purple-600/10 pointer-events-none z-10" />
                          {/* Decorative Fire/Dogs */}
                          <div
                            className="absolute top-2 left-2 text-2xl animate-bounce z-10"
                            style={{ animationDelay: "0ms" }}
                          >
                            🔥
                          </div>
                          <div
                            className="absolute top-4 right-4 text-xl animate-bounce z-10"
                            style={{ animationDelay: "200ms" }}
                          >
                            🐕
                          </div>
                          <div
                            className="absolute bottom-2 left-6 text-lg animate-bounce z-10"
                            style={{ animationDelay: "400ms" }}
                          >
                            💪
                          </div>
                          <div
                            className="absolute bottom-4 right-8 text-xl animate-bounce z-10"
                            style={{ animationDelay: "600ms" }}
                          >
                            🔥
                          </div>
                        </>
                      )}
                    {/* VS Divider Badge */}
                    <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 z-40">
                      <div className="bg-white border-[3px] border-black rotate-[8deg] px-1.5 py-0.5 shadow-[2px_2px_0px_0px_#000]">
                        <span className="font-display font-black text-black text-xs italic">
                          VS
                        </span>
                      </div>
                    </div>

                    {/* Team A Side */}
                    <div
                      onClick={() => {
                        if (!showResult && !isReadOnly)
                          onUpdatePrediction(match.id, match.teamA.id);
                      }}
                      className={clsx(
                        "flex-1 min-w-0 flex items-center pr-14 pl-6 py-4 relative transition-all duration-300 border-r-2 border-black/10 hover:z-20",
                        !showResult && !isReadOnly
                          ? "cursor-pointer"
                          : "cursor-default",
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
                      {(isWinnerA || isActualWinnerA) && (
                        <>
                          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                          {isWinnerA && (
                            <div className="absolute top-2 left-2 bg-white text-black font-black italic text-[9px] px-2 py-0.5 border border-black shadow-sm z-30">
                              PICK
                            </div>
                          )}
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
                        if (!showResult && !isReadOnly)
                          onUpdatePrediction(match.id, match.teamB.id);
                      }}
                      className={clsx(
                        "flex-1 min-w-0 flex items-center justify-end pl-14 pr-6 py-4 relative transition-all duration-300 border-l-2 border-black/10 hover:z-20",
                        !showResult && !isReadOnly
                          ? "cursor-pointer"
                          : "cursor-default",
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
                      {(isWinnerB || isActualWinnerB) && (
                        <>
                          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                          {isWinnerB && (
                            <div className="absolute top-2 right-2 bg-white text-black font-black italic text-[9px] px-2 py-0.5 border border-black shadow-sm z-30">
                              PICK
                            </div>
                          )}
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

                    {/* Warning if predicted team didn't make it to this match */}
                    {predictedTeamNotInMatch && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-500 border-[2px] border-black px-2 py-0.5 shadow-[2px_2px_0px_0px_#000] transform -rotate-1 z-50 whitespace-nowrap">
                        <span className="text-[8px] font-black uppercase text-black">
                          ⚠️ Confronto diferente do palpite
                        </span>
                      </div>
                    )}

                    {/* Predicted Score Overlay / Selector */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-30">
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
                      ) : showResult && betData ? (
                        // Show comparison: predicted vs actual
                        <div className="flex flex-col items-center gap-1">
                          {/* Actual Score (Main) */}
                          <div className="border-[3px] border-black px-4 py-1 shadow-[4px_4px_0px_0px_#000] -rotate-1 bg-zinc-800">
                            <span className="font-display font-black text-sm text-white italic">
                              {displayScore}
                            </span>
                          </div>
                          {/* Predicted Score (Below) */}
                          <div
                            className={clsx(
                              "border-[2px] border-black px-3 py-0.5 rotate-1",
                              betData.isPerfectPick && match.winnerId !== null
                                ? "bg-[#ccff00] text-black"
                                : betData.predictedWinnerId === match.winnerId
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-600",
                            )}
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] font-bold uppercase">
                                Seu palpite:
                              </span>
                              <span className="font-display font-black text-xs italic">
                                {betData.predictedScoreA}-
                                {betData.predictedScoreB}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!showResult && !isReadOnly)
                              setEditingScoreMatchId(match.id);
                          }}
                          className={clsx(
                            "border-[3px] border-black px-4 py-1 shadow-[4px_4px_0px_0px_#000] -rotate-1 transition-all outline-none",
                            !showResult &&
                              "hover:scale-105 active:scale-95 cursor-pointer",
                            showResult
                              ? "bg-zinc-800"
                              : matchActiveColor === "brawl-blue"
                                ? "bg-brawl-blue"
                                : "bg-brawl-red",
                          )}
                        >
                          <span className="font-display font-black text-sm text-white italic">
                            {displayScore}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Points Badge - Show for finished matches */}
                    {match.status === "finished" &&
                      betData &&
                      betData.pointsEarned !== undefined && (
                        <div
                          className={clsx(
                            "absolute -bottom-2 -right-2 text-[8px] font-black uppercase px-2 py-1 border-2 z-20 flex items-center gap-1.5 cursor-help group/badge",
                            (() => {
                              const isCorrect =
                                match.winnerId === betData.predictedWinnerId;
                              if (!isCorrect)
                                return "bg-red-500 text-white border-black";
                              if (betData.isPerfectPick) {
                                return "bg-gradient-to-r from-yellow-400 via-[#ccff00] to-yellow-400 text-black border-[#ccff00] shadow-[0_0_20px_rgba(204,255,0,0.6)]";
                              }
                              if (betData.isUnderdogPick) {
                                return "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-black";
                              }
                              return "bg-green-500 text-white border-black";
                            })(),
                          )}
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full right-0 mb-2 hidden group-hover/badge:block w-52 bg-black text-white text-[10px] p-2 rounded border-2 border-white shadow-lg z-[100] pointer-events-none">
                            <div className="space-y-1">
                              {(() => {
                                const isCorrect =
                                  match.winnerId === betData.predictedWinnerId;

                                // Special case: predicted team never reached this match
                                if (predictedTeamNotInMatch) {
                                  return (
                                    <>
                                      <div className="font-bold text-yellow-400">
                                        ⚠️ Confronto Diferente
                                      </div>
                                      <div className="text-[9px] text-gray-300">
                                        Você apostou num confronto que não ocorreu nesta partida devido ao chaveamento.
                                      </div>
                                      <div className="border-t border-gray-600 pt-1 mt-1 font-bold text-red-400">
                                        Total: 0 pontos
                                      </div>
                                    </>
                                  );
                                }

                                if (!isCorrect) {
                                  return (
                                    <>
                                      <div className="font-bold text-red-300">
                                        ❌ Palpite Incorreto
                                      </div>
                                      <div className="text-[9px] text-gray-300">
                                        Você apostou em:{" "}
                                        {match.teamA?.id ===
                                        betData.predictedWinnerId
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
                                    {betData.isPerfectPick ? (
                                      <div className="font-bold text-[#ccff00] flex items-center gap-1">
                                        ⭐ PLACAR PERFEITO!
                                      </div>
                                    ) : (
                                      <div className="font-bold text-green-300">
                                        ✅ Breakdown de Pontos:
                                      </div>
                                    )}

                                    {/* Calculate point breakdown */}
                                    {(() => {
                                      // Get scoring rules from match (with fallback to defaults)
                                      const rules = match.scoringRules || {
                                        winner: 1,
                                        exact: 3,
                                        underdog_25: 2,
                                        underdog_50: 1,
                                      };

                                      let winnerPoints = 0;
                                      let exactPoints = 0;
                                      let underdogPoints = 0;

                                      if (betData.isPerfectPick) {
                                        // Perfect pick: exact score overwrites
                                        exactPoints = rules.exact;
                                      } else {
                                        // Only winner correct
                                        winnerPoints = rules.winner;
                                      }

                                      if (betData.isUnderdogPick) {
                                        // Calculate underdog bonus from total points
                                        underdogPoints =
                                          betData.pointsEarned -
                                          (exactPoints || winnerPoints);
                                      }

                                      return (
                                        <div className="space-y-0.5 text-[9px]">
                                          {betData.isPerfectPick ? (
                                            <div className="text-[#ccff00] font-bold flex justify-between">
                                              <span>
                                                ⭐ Placar exato (
                                                {betData.predictedScoreA}-
                                                {betData.predictedScoreB})
                                              </span>
                                              <span>+{exactPoints} pts</span>
                                            </div>
                                          ) : (
                                            <div className="text-gray-300 flex justify-between">
                                              <span>✓ Vencedor correto</span>
                                              <span>+{winnerPoints} pt</span>
                                            </div>
                                          )}
                                          {betData.isUnderdogPick &&
                                            underdogPoints > 0 && (
                                              <div className="text-purple-300 font-bold flex justify-between">
                                                <span>🔥 Bônus Underdog</span>
                                                <span>
                                                  +{underdogPoints} pts
                                                </span>
                                              </div>
                                            )}
                                        </div>
                                      );
                                    })()}

                                    <div
                                      className={clsx(
                                        "border-t pt-1 mt-1 font-bold flex justify-between",
                                        betData.isPerfectPick
                                          ? "border-[#ccff00] text-[#ccff00]"
                                          : "border-gray-600 text-yellow-300",
                                      )}
                                    >
                                      <span>Total:</span>
                                      <span>+{betData.pointsEarned} pts</span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
                          </div>

                          {/* Badge Content */}
                          {(() => {
                            const isCorrect =
                              match.winnerId === betData.predictedWinnerId;
                            if (!isCorrect) return "✗";
                            if (betData.isPerfectPick)
                              return <span className="text-[10px]">⭐</span>;
                            if (betData.isUnderdogPick) return <span>🔥</span>;
                            return "✓";
                          })()}
                          <span className="whitespace-nowrap">
                            {betData.pointsEarned > 0
                              ? `+${betData.pointsEarned}`
                              : betData.pointsEarned}{" "}
                            PTS
                          </span>
                          {betData.isUnderdogPick &&
                            match.winnerId === betData.predictedWinnerId && (
                              <span className="text-[7px]">🐕</span>
                            )}
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lock In Button */}
          {!isReadOnly ? (
            <button
              onClick={() => setIsSuccessModalOpen(true)}
              className="w-full max-w-xs bg-brawl-red hover:bg-[#d41d1d] text-white py-4 font-black italic uppercase border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all flex items-center justify-center gap-3 text-xl mb-12"
            >
              <span className="material-symbols-outlined text-2xl">
                verified
              </span>
              Lock in All Picks
            </button>
          ) : (
            <div className="w-full max-w-xs bg-zinc-100 text-zinc-400 py-4 font-black italic uppercase border-[4px] border-zinc-200 flex items-center justify-center gap-3 text-xl mb-12">
              <span className="material-symbols-outlined text-2xl">lock</span>
              Picks Locked
            </div>
          )}
        </div>
      </div>

      {/* COMPLETION MODAL */}
      {isSuccessModalOpen && (
        <SubmitBetsModal
          predictions={predictions}
          matchList={matches}
          onClose={() => setIsSuccessModalOpen(false)}
          tournamentId={tournamentId}
          userId={userId}
          setSelectedMatchDayId={setSelectedMatchDayId}
          setShowReview={setShowReview}
          setPredictions={setPredictions}
          handleSelectTournament={handleSelectTournament}
        />
      )}
    </>
  );
}

function SubmitBetsModal({
  predictions,
  matchList,
  onClose,
  tournamentId,
  userId,
  setSelectedMatchDayId,
  setShowReview,
  setPredictions,
  handleSelectTournament,
}: {
  predictions: Record<number, Prediction>;
  matchList: Match[];
  onClose: () => void;
  tournamentId: number;
  userId: string;
  setSelectedMatchDayId?: (id: number | null) => void;
  setShowReview?: (show: boolean) => void;
  setPredictions?: React.Dispatch<
    React.SetStateAction<Record<number, Prediction>>
  >;
  handleSelectTournament?: (id: number) => Promise<void>;
}) {
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setStatus("submitting");
    setErrorMessage(null);

    try {
      // Transform predictions to array and filter out started matches
      const betsToSubmit = Object.entries(predictions)
        .map(([matchIdStr, pred]) => {
          const matchId = parseInt(matchIdStr);
          const match = matchList.find((m) => m.id === matchId);

          // Skip if match not found or explicitly started/finished
          // We allow betting on "scheduled" matches even if start time has passed,
          // as admin might be late to start it.
          if (
            !match ||
            match.status === "live" ||
            match.status === "finished"
          ) {
            return null;
          }

          const [scoreA, scoreB] = pred.score
            .split("-")
            .map((s) => parseInt(s.trim()));

          return {
            matchId,
            predictedWinnerId: pred.winnerId,
            predictedScoreA: isNaN(scoreA) ? 0 : scoreA,
            predictedScoreB: isNaN(scoreB) ? 0 : scoreB,
          };
        })
        .filter((bet): bet is NonNullable<typeof bet> => bet !== null);

      if (betsToSubmit.length === 0) {
        throw new Error("No valid bets to submit (matches may have started).");
      }

      const { submitMultipleBets } = await import("../server/bets");
      await submitMultipleBets({ data: { bets: betsToSubmit } });

      setStatus("success");
      const key = `bse-predictions-${tournamentId}-${userId}`;
      localStorage.removeItem(key);
    } catch (error: any) {
      console.error("[SUBMIT BETS] Error submitting bets:", error);
      setStatus("error");
      setErrorMessage(
        error.message || "Failed to submit bets. Please try again.",
      );
    }
  };

  if (status === "success") {
    return (
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
            Suas apostas foram confirmadas! Boa sorte, campeão!
          </p>

          <button
            onClick={() => {
              onClose();
              // Clear selected match day to show selector
              setSelectedMatchDayId?.(null);
              setShowReview?.(false);
              setPredictions?.({});
              // Reload tournament data to get fresh user bets
              if (tournamentId) {
                handleSelectTournament?.(tournamentId);
              }
            }}
            className="w-full bg-black hover:bg-zinc-800 text-white py-4 font-black uppercase border-[4px] border-black shadow-[6px_6px_0px_0px_#ccff00] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-lg tracking-widest"
          >
            VER MINHAS APOSTAS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white border-[6px] border-black shadow-[16px_16px_0px_0px_#000] w-full max-w-md p-8 flex flex-col items-center text-center relative overflow-hidden">
        <h3 className="font-display font-black text-3xl italic uppercase text-black mb-4">
          CONFIRM YOUR PICKS
        </h3>

        <p className="font-body font-bold text-gray-600 mb-8">
          Are you sure you want to lock in these predictions? You won't be able
          to change them later.
        </p>

        {status === "error" && (
          <div className="w-full bg-red-100 border-2 border-red-500 text-red-700 p-3 mb-6 text-xs font-bold text-left">
            ⚠️ {errorMessage}
          </div>
        )}

        <div className="w-full flex gap-3">
          <button
            onClick={onClose}
            disabled={status === "submitting"}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-black py-3 font-black uppercase border-[3px] border-black shadow-[4px_4px_0px_0px_#000] active:shadow-none transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={status === "submitting"}
            className="flex-1 bg-brawl-red hover:bg-red-600 text-white py-3 font-black uppercase border-[3px] border-black shadow-[4px_4px_0px_0px_#000] active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {status === "submitting" ? (
              <span className="animate-spin material-symbols-outlined">
                refresh
              </span>
            ) : (
              <span>LOCK IN</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Home() {
  const { tournaments, isAuthenticated, userId } = Route.useLoaderData() as any;

  // Tournament selection state
  const [selectedTournamentId, setSelectedTournamentId] = useState<
    number | null
  >(null);
  const [tournamentData, setTournamentData] = useState<{
    carouselMatches: Match[];
    bracketMatches: Match[];
    userBets: any[];
    matchDays: any[];
    activeMatchDayId: number | null;
  } | null>(null);
  const [selectedMatchDayId, setSelectedMatchDayId] = useState<number | null>(
    null,
  );
  const [isLoadingTournament, setIsLoadingTournament] = useState(false);

  const [viewMode, setViewMode] = useState<"list" | "bracket">("list");
  const [showReview, setShowReview] = useState(false);

  // Clear state when user changes
  useEffect(() => {
    setPredictions({});
    setTournamentData(null);
    setSelectedTournamentId(null);
    setShowReview(false);
  }, [userId]);

  // Auto-select if only 1 tournament (no choice to make)
  useEffect(() => {
    if (tournaments.length === 1 && !selectedTournamentId) {
      handleSelectTournament(tournaments[0].id);
    }
  }, [tournaments, selectedTournamentId]);

  // Reset view mode to carousel when match day changes
  useEffect(() => {
    setViewMode("list");
  }, [selectedMatchDayId]);

  // Load tournament data on selection
  const handleSelectTournament = async (tournamentId: number) => {
    setSelectedTournamentId(tournamentId);
    setIsLoadingTournament(true);
    setTournamentData(null);
    setPredictions({});
    setShowReview(false);

    try {
      const data = await getHomeTournamentData({ data: { tournamentId } });

      setTournamentData({
        // Show all matches in carousel, not just betting-enabled ones
        // The match day status controls whether betting is allowed
        carouselMatches: data.matches
          .sort((a, b) => {
            const timeA = new Date(a.startTime).getTime();
            const timeB = new Date(b.startTime).getTime();
            if (timeA !== timeB) return timeA - timeB;
            return (a.displayOrder || 0) - (b.displayOrder || 0);
          }),
        bracketMatches: data.matches,
        userBets: data.userBets,
        matchDays: data.matchDays,
        activeMatchDayId: data.activeMatchDayId,
      });
    } catch (err) {
      console.error("Failed to load tournament data", err);
    } finally {
      setIsLoadingTournament(false);
    }
  };

  // Derived state
  const allCarouselMatches = tournamentData?.carouselMatches ?? [];
  const allBracketMatches = tournamentData?.bracketMatches ?? [];
  const userBets = tournamentData?.userBets ?? [];
  const matchDays = tournamentData?.matchDays ?? [];
  const activeMatchDayId = tournamentData?.activeMatchDayId;

  // Filter matches by selected match day
  const carouselMatches = useMemo(() => {
    if (!selectedMatchDayId) return allCarouselMatches;

    // Filter by matchDayId, but also include matches without matchDayId if no matches found
    const filtered = allCarouselMatches.filter(
      (m: any) => m.matchDayId === selectedMatchDayId,
    );

    // If no matches found for this matchDayId, show matches without matchDayId as fallback
    if (filtered.length === 0) {
      return allCarouselMatches.filter((m: any) => !m.matchDayId);
    }

    return filtered;
  }, [allCarouselMatches, selectedMatchDayId]);

  // Bracket view shows ALL matches by default, but if the selected match day
  // is playoffs-only (no group stage matches), filter to show only playoff bracket
  const bracketMatches = useMemo(() => {
    if (!selectedMatchDayId || !matchDays.length) {
      return allBracketMatches;
    }

    // Get matches for the selected match day
    const matchDayMatches = allBracketMatches.filter(
      (m: any) => m.matchDayId === selectedMatchDayId,
    );

    // If no matches for this match day, show all
    if (matchDayMatches.length === 0) {
      return allBracketMatches;
    }

    // Helper to check if a match is a playoff match (single/double elimination)
    // Single elimination: bracketSide "main" or "upper"
    // Double elimination: bracketSide "upper", "lower", "grand_final"
    const isPlayoffMatch = (m: any) => {
      if (m.bracketSide === "groups") return false;
      if (m.bracketSide === "main" || m.bracketSide === "upper" || m.bracketSide === "lower" || m.bracketSide === "grand_final") return true;
      // Single elimination may have bracketSide: null but have nextMatchWinnerId
      if (m.bracketSide === null && m.nextMatchWinnerId) return true;
      return false;
    };

    // Check if ALL matches in this match day are playoff matches
    const allPlayoffMatches = matchDayMatches.every(isPlayoffMatch);

    // If it's a playoffs-only match day, filter to show only playoff bracket matches
    if (allPlayoffMatches) {
      return allBracketMatches.filter(isPlayoffMatch);
    }

    // Otherwise show all matches (includes group stage)
    return allBracketMatches;
  }, [allBracketMatches, selectedMatchDayId, matchDays]);

  // Get selected match day info
  const selectedMatchDay = useMemo(() => {
    return matchDays.find((md: any) => md.id === selectedMatchDayId);
  }, [matchDays, selectedMatchDayId]);

  // Determine if we are in read-only mode (already submitted for THIS match day OR match day is closed)
  const isReadOnly = useMemo(() => {
    if (!selectedMatchDayId) return userBets.length > 0;

    // Get selected match day
    const selectedMatchDay = matchDays.find(
      (md: any) => md.id === selectedMatchDayId,
    );

    // If match day is draft, locked or finished, it's read-only (can't place new bets)
    if (
      selectedMatchDay?.status === "draft" ||
      selectedMatchDay?.status === "locked" ||
      selectedMatchDay?.status === "finished"
    ) {
      return true;
    }

    // Check if user has bets specifically for the selected match day
    const matchIdsInSelectedDay = allCarouselMatches
      .filter((m: any) => m.matchDayId === selectedMatchDayId)
      .map((m: any) => m.id);

    return userBets.some((bet: any) =>
      matchIdsInSelectedDay.includes(bet.matchId),
    );
  }, [userBets, selectedMatchDayId, allCarouselMatches, matchDays]);

  // Shared state for predictions
  const [predictions, setPredictions] = useState<Record<number, Prediction>>(
    {},
  );

  // Auto-redirect to review if user has bets but no matches available to bet on FOR THE SELECTED MATCH DAY
  // OR exit review mode if switching to a match day with available bets
  useEffect(() => {
    if (!tournamentData || !selectedMatchDayId) return;

    const scheduledMatches = carouselMatches.filter(
      (m: any) => m.status === "scheduled",
    );
    const scheduledMatchesCount = scheduledMatches.length;

    // Check if all scheduled matches have complete predictions
    const allScheduledMatchesHaveBets = scheduledMatches.every(
      (m: any) =>
        predictions[m.id] &&
        predictions[m.id].winnerId &&
        predictions[m.id].score &&
        predictions[m.id].score.trim() !== "",
    );

    // Get selected match day info
    const selectedMatchDay = matchDays.find(
      (md: any) => md.id === selectedMatchDayId,
    );

    // If in review mode and there are new matches available WITHOUT complete bets, exit review
    // BUT allow review if user has completed all bets (they clicked "Review All Bets" button)
    // ALSO don't exit review if match day is finished (results mode)
    if (
      showReview &&
      !isReadOnly &&
      scheduledMatchesCount > 0 &&
      !allScheduledMatchesHaveBets &&
      selectedMatchDay?.status !== "finished"
    ) {
      setShowReview(false);
    }

    // Automatically go to review screen if:
    // 1. User has bets for this match day (show their predictions)
    // 2. OR match day is finished (show results)
    if (
      !showReview &&
      (isReadOnly || selectedMatchDay?.status === "finished")
    ) {
      setShowReview(true);
    }
  }, [
    isReadOnly,
    tournamentData,
    showReview,
    carouselMatches,
    selectedMatchDayId,
    predictions,
  ]);

  // Persistence: Load from localStorage on mount (ONLY if not read-only)
  useEffect(() => {
    if (!tournamentData) return;
    if (isReadOnly) {
      const initial: Record<number, Prediction> = {};
      userBets.forEach((bet: any) => {
        initial[bet.matchId] = {
          winnerId: bet.predictedWinnerId ?? 0,
          score: `${bet.predictedScoreA}-${bet.predictedScoreB}`,
        };
      });
      setPredictions(initial);
    } else {
      const key = `bse-predictions-${selectedTournamentId}-${userId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setPredictions(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load predictions", e);
        }
      }
    }
  }, [isReadOnly, userBets, tournamentData, selectedTournamentId, userId]);

  // Persistence: Save to localStorage when change (ONLY if not read-only)
  useEffect(() => {
    if (
      !isReadOnly &&
      Object.keys(predictions).length > 0 &&
      selectedTournamentId &&
      userId
    ) {
      const key = `bse-predictions-${selectedTournamentId}-${userId}`;
      localStorage.setItem(key, JSON.stringify(predictions));
    }
  }, [predictions, isReadOnly, selectedTournamentId, userId]);

  const updatePrediction = (
    matchId: number,
    winnerId: number,
    score?: string,
  ) => {
    setPredictions((prev) => {
      const current = prev[matchId];
      let newScore = score ?? current?.score ?? "";

      if (current && current.winnerId !== winnerId && newScore.includes("-")) {
        const parts = newScore.split("-").map((s: string) => s.trim());
        if (parts.length === 2 && !score) {
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

  // Show Landing Page for unauthenticated users
  if (!isAuthenticated) {
    return <LandingPage isAuthenticated={false} />;
  }

  // Show Tournament Selector if no tournament selected yet (and multiple exist)
  if (!selectedTournamentId && tournaments.length > 1) {
    return (
      <TournamentSelector
        tournaments={tournaments}
        onSelect={handleSelectTournament}
      />
    );
  }

  // Show empty state if no tournaments
  if (tournaments.length === 0) {
    return (
      <div className="min-h-screen bg-paper bg-paper-texture flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <h2 className="font-display font-black text-3xl italic uppercase text-black">
            No Tournaments Available
          </h2>
          <p className="font-body text-zinc-500">
            Check back soon for upcoming tournaments!
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingTournament) {
    return (
      <div className="min-h-screen bg-paper bg-paper-texture flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-black border-t-[#ccff00] rounded-full mx-auto" />
          <h2 className="font-display font-black text-2xl italic uppercase animate-pulse text-black">
            Loading Tournament...
          </h2>
        </div>
      </div>
    );
  }

  // Show Match Day Selector if tournament is selected but no match day chosen
  if (selectedTournamentId && !selectedMatchDayId && matchDays.length > 0) {
    return (
      <div className="relative">
        {/* Back button */}
        {tournaments.length > 1 && (
          <button
            onClick={() => {
              setSelectedTournamentId(null);
              setTournamentData(null);
              setPredictions({});
              setShowReview(false);
            }}
            className="fixed top-28 left-4 z-[60] bg-white hover:bg-gray-50 text-black font-black py-2 px-4 border-[3px] border-black shadow-[4px_4px_0px_0px_#000] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all text-xs uppercase flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">
              arrow_back
            </span>
            Tournaments
          </button>
        )}

        <MatchDaySelector
          matchDays={matchDays.map((md: any) => ({
            ...md,
            matchCount: allBracketMatches.filter(
              (m: any) => m.matchDayId === md.id,
            ).length,
          }))}
          activeMatchDayId={activeMatchDayId ?? null}
          onSelect={(matchDayId) => setSelectedMatchDayId(matchDayId)}
        />
      </div>
    );
  }

  const hasMatches = carouselMatches.length > 0;

  return (
    <div className="min-h-screen bg-paper bg-paper-texture">
      {/* BACK BUTTON - returns to match day selector or tournament selector */}
      {selectedMatchDayId && (
        <button
          onClick={() => {
            setSelectedMatchDayId(null);
            setShowReview(false);
            setPredictions({});
          }}
          className="fixed top-28 left-4 z-[60] bg-white hover:bg-gray-50 text-black font-black py-2 px-4 border-[3px] border-black shadow-[4px_4px_0px_0px_#000] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all text-xs uppercase flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">
            arrow_back
          </span>
          {matchDays.length > 1 ? "Match Days" : "Voltar"}
        </button>
      )}

      {/* VIEW SWITCHER & ACTIONS */}
      {hasMatches && !showReview && (
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 items-end">
          {/* View Results Button - Only show if user has bets */}
          {isReadOnly && (
            <button
              onClick={() => setShowReview(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-black py-3 px-6 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all text-sm uppercase flex items-center gap-2 animate-pulse"
            >
              <span className="material-symbols-outlined text-base">
                emoji_events
              </span>
              Ver Meus Resultados
            </button>
          )}

          {!isReadOnly && (
            <>
              {/* Debug Button */}
              <button
                onClick={async () => {
                  const allMatches = [...carouselMatches, ...bracketMatches];
                  let currentPredictions: Record<number, any> = {};
                  const matchMap = new Map<number, any>();

                  allMatches.forEach((m) => {
                    matchMap.set(m.id, {
                      ...m,
                      teamA: { ...m.teamA },
                      teamB: { ...m.teamB },
                    });
                  });

                  let changed = true;
                  let iterations = 0;

                  while (changed && iterations < 10) {
                    changed = false;
                    iterations++;

                    const sortedIds = Array.from(matchMap.keys()).sort(
                      (a, b) => {
                        const mA = matchMap.get(a);
                        const mB = matchMap.get(b);
                        return (
                          (mA.displayOrder || 0) - (mB.displayOrder || 0) ||
                          (mA.roundIndex || 0) - (mB.roundIndex || 0)
                        );
                      },
                    );

                    for (const id of sortedIds) {
                      const match = matchMap.get(id);
                      if (!match || currentPredictions[match.id]) continue;

                      const isGhost = match.isGhost;
                      const isBettingEnabled = match.isBettingEnabled ?? true;
                      const isMatchStarted =
                        match.status === "live" || match.status === "finished";
                      const canInteract =
                        !isGhost && isBettingEnabled && !isMatchStarted;

                      if (!canInteract) continue;

                      if (
                        !match.teamA?.id ||
                        !match.teamB?.id ||
                        match.teamA.id === 0 ||
                        match.teamB.id === 0
                      ) {
                        continue;
                      }

                      const isTeamA = Math.random() > 0.5;
                      const winnerId = isTeamA
                        ? match.teamA.id
                        : match.teamB.id;
                      const winsNeeded = match.format === "bo5" ? 3 : 2;
                      const loserWins = Math.floor(Math.random() * winsNeeded);
                      const score = isTeamA
                        ? `${winsNeeded} - ${loserWins}`
                        : `${loserWins} - ${winsNeeded}`;

                      currentPredictions[match.id] = { winnerId, score };
                      changed = true;

                      const winnerTeam = isTeamA ? match.teamA : match.teamB;
                      const loserTeam = isTeamA ? match.teamB : match.teamA;

                      if (match.nextMatchWinnerId) {
                        const next = matchMap.get(match.nextMatchWinnerId);
                        if (next) {
                          if (match.nextMatchWinnerSlot === "A")
                            next.teamA = winnerTeam;
                          if (match.nextMatchWinnerSlot === "B")
                            next.teamB = winnerTeam;
                        }
                      }
                      if (match.nextMatchLoserId) {
                        const next = matchMap.get(match.nextMatchLoserId);
                        if (next) {
                          if (match.nextMatchLoserSlot === "A")
                            next.teamA = loserTeam;
                          if (match.nextMatchLoserSlot === "B")
                            next.teamB = loserTeam;
                        }
                      }
                    }
                  }

                  setPredictions(currentPredictions);
                }}
                className="bg-white hover:bg-gray-50 text-black font-black py-2 px-4 border-[3px] border-black shadow-[4px_4px_0px_0px_#000] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all text-xs uppercase flex items-center gap-2 self-end mb-2"
                title="Debug: Fill all matches with random predictions"
              >
                <span className="text-sm">🎲</span>
                <span>Fill Random</span>
              </button>

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
            </>
          )}
        </div>
      )}

      {/* Match Day Status Banner */}
      {selectedMatchDay &&
        selectedTournamentId &&
        !showReview &&
        hasMatches && (
          <div className="px-4 pt-24 pb-4 max-w-4xl mx-auto">
            {selectedMatchDay.status === "finished" && (
              <div className="bg-blue-500 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] p-4 mb-4 animate-in slide-in-from-top duration-300">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-2xl text-white flex-shrink-0">
                    check_circle
                  </span>
                  <div className="flex-1">
                    <h3 className="font-black text-white text-sm uppercase">
                      {selectedMatchDay.label} Concluído!
                    </h3>
                    <p className="text-xs text-blue-100 mt-1">
                      Este match day foi finalizado.{" "}
                      {matchDays.find((md: any) => md.status === "open")
                        ? "Há um novo match day disponível para apostas!"
                        : "Aguarde o próximo match day."}
                    </p>
                  </div>
                  {matchDays.find((md: any) => md.status === "open") && (
                    <button
                      onClick={() => {
                        const nextMD = matchDays.find(
                          (md: any) => md.status === "open",
                        );
                        if (nextMD) setSelectedMatchDayId(nextMD.id);
                      }}
                      className="bg-[#ccff00] hover:bg-[#bbe000] text-black font-black px-3 py-1 border-2 border-black text-xs uppercase whitespace-nowrap"
                    >
                      Ir para o novo →
                    </button>
                  )}
                </div>
              </div>
            )}
            {selectedMatchDay.status === "locked" && (
              <div className="bg-yellow-500 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] p-4 mb-4 animate-in slide-in-from-top duration-300">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-2xl text-black flex-shrink-0">
                    lock
                  </span>
                  <div className="flex-1">
                    <h3 className="font-black text-black text-sm uppercase">
                      {selectedMatchDay.label} Fechado
                    </h3>
                    <p className="text-xs text-black/80 mt-1">
                      As apostas para este match day estão fechadas. As partidas
                      estão em andamento ou prestes a começar.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      {showReview ? (
        <ReviewScreen
          matches={
            selectedMatchDayId
              ? bracketMatches.filter(
                  (m: any) => m.matchDayId === selectedMatchDayId,
                )
              : bracketMatches
          }
          predictions={predictions}
          onUpdatePrediction={updatePrediction}
          onBack={() => setShowReview(false)}
          isReadOnly={isReadOnly}
          tournamentId={selectedTournamentId!}
          userId={userId}
          userBets={userBets}
          setSelectedTournamentId={setSelectedTournamentId}
          setSelectedMatchDayId={setSelectedMatchDayId}
          setShowReview={setShowReview}
          setPredictions={setPredictions}
          handleSelectTournament={handleSelectTournament}
        />
      ) : viewMode === "list" ? (
        <BettingCarousel
          matches={carouselMatches.filter((m: any) => m.status === "scheduled")}
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
      )}
    </div>
  );
}
