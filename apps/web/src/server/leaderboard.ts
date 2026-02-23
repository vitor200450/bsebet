import { bets, matches, tournaments, user } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { asc, desc, eq, or, sql } from "drizzle-orm";
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

  // Sort with tiebreakers: 1° Pontos · 2° Perfect Picks · 3° Acertos · 4° Underdogs · 5° Medalhas · 6° Nome
  const sortedRows = rows
    .map((row) => ({
      ...row,
      medals: medalsMap.get(row.userId) || {
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
      if (pointsB !== pointsA) {
        return pointsB - pointsA;
      }
      // 2° Perfect Picks (descending)
      const perfectA = Number(a.perfectPicks);
      const perfectB = Number(b.perfectPicks);
      if (perfectB !== perfectA) {
        return perfectB - perfectA;
      }
      // 3° Acertos (descending)
      const correctA = Number(a.correctPredictions);
      const correctB = Number(b.correctPredictions);
      if (correctB !== correctA) {
        return correctB - correctA;
      }
      // 4° Underdog Picks (descending) - azarões acertados
      const underdogA = Number(a.underdogPicks);
      const underdogB = Number(b.underdogPicks);
      if (underdogB !== underdogA) {
        return underdogB - underdogA;
      }
      // 5° Total de Medalhas (descending)
      const medalsA = Number(a.medals.total);
      const medalsB = Number(b.medals.total);
      if (medalsB !== medalsA) {
        return medalsB - medalsA;
      }
      // 6° Nome (ascending - alfabética)
      const nameA = String(a.nickname || a.name || "")
        .toLowerCase()
        .trim();
      const nameB = String(b.nickname || b.name || "")
        .toLowerCase()
        .trim();
      if (nameA !== nameB) {
        return nameA.localeCompare(nameB, "pt-BR");
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
