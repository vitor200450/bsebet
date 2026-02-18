import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/middleware/auth";
import { eq, and, sql } from "drizzle-orm";

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { db, matches, tournaments, bets } = await import("@bsebet/db");

    const userId = context.session?.user?.id;

    // 1. Calculate User Statistics
    let stats = {
      totalBets: 0,
      correctPredictions: 0,
      totalPoints: 0,
      accuracy: 0,
      pendingBets: 0,
      perfectPicks: 0,
      underdogWins: 0,
    };

    if (userId) {
      // Total bets and points
      const totalBetsResult = await db
        .select({
          count: sql<number>`count(*)`,
          totalPoints: sql<number>`COALESCE(SUM(${bets.pointsEarned}), 0)`,
          correctCount: sql<number>`count(*) FILTER (WHERE ${bets.pointsEarned} > 0)`,
          perfectCount: sql<number>`count(*) FILTER (WHERE ${bets.isPerfectPick} = true)`,
          underdogCount: sql<number>`count(*) FILTER (WHERE ${bets.isUnderdogPick} = true AND ${bets.pointsEarned} > 0)`,
        })
        .from(bets)
        .where(eq(bets.userId, userId));

      // Pending bets (matches not finished yet)
      const pendingBetsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(bets)
        .innerJoin(matches, eq(bets.matchId, matches.id))
        .where(
          and(
            eq(bets.userId, userId),
            sql`${matches.status} IN ('scheduled', 'live')`
          )
        );

      const data = totalBetsResult[0];
      stats.totalBets = data?.count || 0;
      stats.totalPoints = data?.totalPoints || 0;
      stats.correctPredictions = data?.correctCount || 0;
      stats.perfectPicks = data?.perfectCount || 0;
      stats.underdogWins = data?.underdogCount || 0;
      stats.accuracy = stats.totalBets > 0
        ? Math.round((stats.correctPredictions / stats.totalBets) * 100)
        : 0;
      stats.pendingBets = pendingBetsResult[0]?.count || 0;
    }

    // 2. Get User's Active Bets (only if authenticated)
    let activeBets: any[] = [];
    if (userId) {
      const userBets = await db.query.bets.findMany({
        where: eq(bets.userId, userId),
        with: {
          match: {
            with: {
              teamA: true,
              teamB: true,
              tournament: true,
            },
          },
          predictedWinner: true,
        },
      });

      // Filter to only scheduled or live matches with both teams defined
      activeBets = userBets.filter(
        (bet) =>
          (bet.match.status === "scheduled" || bet.match.status === "live") &&
          bet.match.teamA && // Team A must exist
          bet.match.teamB && // Team B must exist
          bet.match.teamA.id && // Team A must have ID
          bet.match.teamB.id // Team B must have ID
      );
    }

    // 3. Get Active Tournaments
    const activeTournaments = await db.query.tournaments.findMany({
      where: and(
        eq(tournaments.status, "active"),
        eq(tournaments.isActive, true)
      ),
      orderBy: (tournaments, { desc }) => [desc(tournaments.startDate)],
      limit: 5,
    });

    return {
      stats,
      activeBets,
      activeTournaments,
    };
  });
