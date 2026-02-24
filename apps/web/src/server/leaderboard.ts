import { bets, matches, tournaments, user } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { getUserMedalsExcludingTournament } from "./user-profile";

/**
 * Get leaderboard data aggregated from bets.
 * When tournamentId is provided, filters to that tournament only.
 * When null/undefined, aggregates across all tournaments (MUNDIAL).
 */
const getLeaderboardFn = createServerFn({
  method: "GET",
}).handler(async (ctx: any) => {
  const { db } = await import("@bsebet/db");
  const tournamentId = ctx.data as number | undefined;

  // First, get all users who placed bets in this tournament
  const baseQuery = db
    .select({
      userId: bets.userId,
      name: user.name,
      nickname: user.nickname,
      image: user.image,
      totalPoints: sql<number>`COALESCE(SUM(${bets.pointsEarned}), 0)`.as(
        "total_points",
      ),
      perfectPicks:
        sql<number>`COUNT(CASE WHEN ${bets.isPerfectPick} = true THEN 1 END)`.as(
          "perfect_picks",
        ),
      correctPredictions:
        sql<number>`COUNT(CASE WHEN ${bets.pointsEarned} > 0 THEN 1 END)`.as(
          "correct_predictions",
        ),
      underdogPicks:
        sql<number>`COUNT(CASE WHEN ${bets.isUnderdogPick} = true AND ${bets.pointsEarned} > 0 THEN 1 END)`.as(
          "underdog_picks",
        ),
      totalBets: sql<number>`COUNT(${bets.id})`.as("total_bets"),
    })
    .from(bets)
    .innerJoin(user, eq(bets.userId, user.id))
    .innerJoin(matches, eq(bets.matchId, matches.id))
    .groupBy(bets.userId, user.name, user.nickname, user.image);

  let rows;
  if (tournamentId) {
    rows = await baseQuery.where(eq(matches.tournamentId, tournamentId));
  } else {
    rows = await baseQuery;
  }

  // Fetch medal counts for all users in parallel
  // IMPORTANT: When calculating leaderboard for a specific tournament,
  // exclude medals from that tournament to avoid circular tiebreaker effects
  const userIds = rows.map((row) => row.userId);
  const medalsMap = new Map<
    string,
    { gold: number; silver: number; bronze: number; total: number }
  >();

  await Promise.all(
    userIds.map(async (userId) => {
      const result = await getUserMedalsExcludingTournament({
        data: {
          userId,
          excludeTournamentId: tournamentId,
        },
      });
      medalsMap.set(userId, {
        gold: result.gold,
        silver: result.silver,
        bronze: result.bronze,
        total: result.total,
      });
    }),
  );

  // For tournament-specific leaderboard, we need additional tiebreaker data
  let mostImportantMatchId: number | null = null;
  let mostImportantMatchWinners: Set<string> = new Set();
  let previousMonthRanks: Map<string, number> = new Map();
  let globalRanks: Map<string, number> = new Map();

  if (tournamentId) {
    // 1. Find the most important match (highest roundIndex) in this tournament
    const mostImportantMatch = await db
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.tournamentId, tournamentId))
      .orderBy(desc(matches.roundIndex))
      .limit(1);

    if (mostImportantMatch.length > 0) {
      mostImportantMatchId = mostImportantMatch[0].id;

      // Find users who correctly predicted this match
      const correctBets = await db
        .select({ userId: bets.userId })
        .from(bets)
        .where(
          and(
            eq(bets.matchId, mostImportantMatchId),
            sql`${bets.pointsEarned} > 0`,
          ),
        );

      mostImportantMatchWinners = new Set(
        correctBets.map((b) => b.userId),
      );
    }

    // 2. Calculate best previous month result for each user
    // Get tournaments that ended in the previous month
    const now = new Date();
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfPreviousMonth = new Date(firstDayOfCurrentMonth.getTime() - 1);

    const previousMonthTournaments = await db
      .select({ id: tournaments.id })
      .from(tournaments)
      .where(
        and(
          gte(tournaments.endDate, firstDayOfPreviousMonth),
          lte(tournaments.endDate, lastDayOfPreviousMonth),
        ),
      );

    for (const prevTournament of previousMonthTournaments) {
      // Get leaderboard for each previous month tournament
      const prevTournamentBets = await db
        .select({
          userId: bets.userId,
          totalPoints: sql<number>`COALESCE(SUM(${bets.pointsEarned}), 0)`.as("total_points"),
        })
        .from(bets)
        .innerJoin(matches, eq(bets.matchId, matches.id))
        .where(eq(matches.tournamentId, prevTournament.id))
        .groupBy(bets.userId)
        .orderBy(desc(sql`total_points`));

      // Track best rank for each user across all previous month tournaments
      prevTournamentBets.forEach((bet, index) => {
        const currentBest = previousMonthRanks.get(bet.userId);
        const rank = index + 1;
        if (currentBest === undefined || rank < currentBest) {
          previousMonthRanks.set(bet.userId, rank);
        }
      });
    }

    // 3. Calculate global ranking for tiebreaker
    const globalRows = await baseQuery;
    const globalMedalsMap = new Map<
      string,
      { gold: number; silver: number; bronze: number; total: number }
    >();

    await Promise.all(
      globalRows.map(async (row) => {
        const result = await getUserMedalsExcludingTournament({
          data: {
            userId: row.userId,
            excludeTournamentId: undefined,
          },
        });
        globalMedalsMap.set(row.userId, {
          gold: result.gold,
          silver: result.silver,
          bronze: result.bronze,
          total: result.total,
        });
      }),
    );

    // Sort global rows with GLOBAL tiebreaker rules
    const sortedGlobalRows = globalRows
      .map((row) => ({
        ...row,
        medals: globalMedalsMap.get(row.userId) || {
          gold: 0,
          silver: 0,
          bronze: 0,
          total: 0,
        },
      }))
      .sort((a, b) => {
        // 1° Pontos (descending)
        const pointsA = Number(a.totalPoints);
        const pointsB = Number(b.totalPoints);
        if (pointsB !== pointsA) return pointsB - pointsA;
        // 2° Acertos (descending)
        const correctA = Number(a.correctPredictions);
        const correctB = Number(b.correctPredictions);
        if (correctB !== correctA) return correctB - correctA;
        // 3° Perfect (descending)
        const perfectA = Number(a.perfectPicks);
        const perfectB = Number(b.perfectPicks);
        if (perfectB !== perfectA) return perfectB - perfectA;
        // 4° Underdogs (descending)
        const underdogA = Number(a.underdogPicks);
        const underdogB = Number(b.underdogPicks);
        if (underdogB !== underdogA) return underdogB - underdogA;
        // 5° Medalhas (descending)
        const medalsA = Number(a.medals.total);
        const medalsB = Number(b.medals.total);
        if (medalsB !== medalsA) return medalsB - medalsA;
        return 0;
      });

    sortedGlobalRows.forEach((row, index) => {
      globalRanks.set(row.userId, index + 1);
    });
  }

  // Sort rows based on leaderboard type
  const sortedRows = rows
    .map((row) => ({
      ...row,
      medals: medalsMap.get(row.userId) || {
        gold: 0,
        silver: 0,
        bronze: 0,
        total: 0,
      },
      gotMostImportantMatch: tournamentId
        ? mostImportantMatchWinners.has(row.userId)
        : undefined,
      bestPreviousMonthResult: tournamentId
        ? previousMonthRanks.get(row.userId) ?? null
        : undefined,
      globalRank: tournamentId ? globalRanks.get(row.userId) ?? null : undefined,
    }))
    .sort((a, b) => {
      // 1° Pontos (descending) - same for both
      const pointsA = Number(a.totalPoints);
      const pointsB = Number(b.totalPoints);
      if (pointsB !== pointsA) return pointsB - pointsA;

      // 2° Acertos (descending) - same for both
      const correctA = Number(a.correctPredictions);
      const correctB = Number(b.correctPredictions);
      if (correctB !== correctA) return correctB - correctA;

      // 3° Perfect Picks (descending) - same for both
      const perfectA = Number(a.perfectPicks);
      const perfectB = Number(b.perfectPicks);
      if (perfectB !== perfectA) return perfectB - perfectA;

      // 4° Underdog Picks (descending) - same for both
      const underdogA = Number(a.underdogPicks);
      const underdogB = Number(b.underdogPicks);
      if (underdogB !== underdogA) return underdogB - underdogA;

      // Tournament-specific tiebreakers
      if (tournamentId) {
        // 5° Got Most Important Match (descending - true > false)
        const gotMatchA = a.gotMostImportantMatch ? 1 : 0;
        const gotMatchB = b.gotMostImportantMatch ? 1 : 0;
        if (gotMatchB !== gotMatchA) return gotMatchB - gotMatchA;

        // 6° Best Previous Month Result (ascending - 1st is better than 10th)
        const prevMonthA = a.bestPreviousMonthResult ?? Infinity;
        const prevMonthB = b.bestPreviousMonthResult ?? Infinity;
        if (prevMonthA !== prevMonthB) return prevMonthA - prevMonthB;

        // 7° Global Rank (ascending - 1st is better than 10th)
        const globalRankA = a.globalRank ?? Infinity;
        const globalRankB = b.globalRank ?? Infinity;
        if (globalRankA !== globalRankB) return globalRankA - globalRankB;
      } else {
        // Global leaderboard: 5° Medalhas (descending)
        const medalsA = Number(a.medals.total);
        const medalsB = Number(b.medals.total);
        if (medalsB !== medalsA) return medalsB - medalsA;
      }

      return 0;
    });

  return sortedRows.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    name: row.nickname || row.name,
    image: row.image,
    totalPoints: Number(row.totalPoints),
    perfectPicks: Number(row.perfectPicks),
    correctPredictions: Number(row.correctPredictions),
    underdogPicks: Number(row.underdogPicks),
    totalBets: Number(row.totalBets),
    medals: row.medals,
    gotMostImportantMatch: row.gotMostImportantMatch,
    bestPreviousMonthResult: row.bestPreviousMonthResult,
    globalRank: row.globalRank,
  }));
});

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  totalPoints: number;
  perfectPicks: number;
  correctPredictions: number;
  underdogPicks: number;
  totalBets: number;
  medals: {
    gold: number;
    silver: number;
    bronze: number;
    total: number;
  };
  // Tournament-specific tiebreaker fields
  gotMostImportantMatch?: boolean; // acertou a partida mais importante
  bestPreviousMonthResult?: number | null; // melhor posição no mês anterior
  globalRank?: number | null; // posição no ranking global
};

export const getLeaderboard = getLeaderboardFn as unknown as (opts?: {
  data?: number;
}) => Promise<LeaderboardEntry[]>;

/**
 * Get tournaments that have finished matches (useful for filter dropdown)
 */
const getLeaderboardTournamentsFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const { db } = await import("@bsebet/db");
  const result = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      slug: tournaments.slug,
      logoUrl: tournaments.logoUrl,
      status: tournaments.status,
    })
    .from(tournaments)
    .innerJoin(matches, eq(tournaments.id, matches.tournamentId))
    .innerJoin(bets, eq(matches.id, bets.matchId))
    .innerJoin(user, eq(bets.userId, user.id))
    .where(
      or(eq(tournaments.status, "active"), eq(tournaments.status, "finished")),
    )
    .groupBy(tournaments.id, tournaments.createdAt)
    .orderBy(desc(tournaments.createdAt));
  return result;
});

export const getLeaderboardTournaments =
  getLeaderboardTournamentsFn as unknown as () => Promise<
    {
      id: number;
      name: string;
      slug: string;
      logoUrl: string | null;
      status: "active" | "finished";
    }[]
  >;
