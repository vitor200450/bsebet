import { bets, matches, user, tournaments } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq, sql, desc, or } from "drizzle-orm";

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
      totalBets: sql<number>`COUNT(${bets.id})`.as("total_bets"),
    })
    .from(bets)
    .innerJoin(user, eq(bets.userId, user.id))
    .innerJoin(matches, eq(bets.matchId, matches.id))
    .groupBy(bets.userId, user.name, user.nickname, user.image)
    .orderBy(desc(sql`total_points`));

  let rows;
  if (tournamentId) {
    rows = await baseQuery.where(eq(matches.tournamentId, tournamentId));
  } else {
    rows = await baseQuery;
  }

  return rows.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    name: row.nickname || row.name,
    image: row.image,
    totalPoints: Number(row.totalPoints),
    perfectPicks: Number(row.perfectPicks),
    totalBets: Number(row.totalBets),
  }));
});

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  totalPoints: number;
  perfectPicks: number;
  totalBets: number;
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
