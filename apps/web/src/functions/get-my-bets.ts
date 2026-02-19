import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/middleware/auth";
import { eq, sql } from "drizzle-orm";

export const getMyBets = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { db, bets, matches } = await import("@bsebet/db");

    const userId = context.session?.user?.id;
    if (!userId) {
      return { stats: null, betsByTournament: [] };
    }

    // 1. Stats aggregation (same as dashboard)
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

    const pendingBetsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(bets)
      .innerJoin(matches, eq(bets.matchId, matches.id))
      .where(
        sql`${bets.userId} = ${userId} AND ${matches.status} IN ('scheduled', 'live')`
      );

    const data = totalBetsResult[0];
    const stats = {
      totalBets: Number(data?.count) || 0,
      totalPoints: Number(data?.totalPoints) || 0,
      correctPredictions: Number(data?.correctCount) || 0,
      perfectPicks: Number(data?.perfectCount) || 0,
      underdogWins: Number(data?.underdogCount) || 0,
      accuracy:
        Number(data?.count) > 0
          ? Math.round((Number(data?.correctCount) / Number(data?.count)) * 100)
          : 0,
      pendingBets: Number(pendingBetsResult[0]?.count) || 0,
    };

    // 2. ALL user bets with full relations (includes winner for finished matches)
    // Also include matches from the same tournaments to project winners
    const userBets = await db.query.bets.findMany({
      where: eq(bets.userId, userId),
      with: {
        match: {
          with: {
            teamA: true,
            teamB: true,
            tournament: true,
            winner: true,
          },
        },
        predictedWinner: true,
      },
      orderBy: (bets, { desc }) => [desc(bets.createdAt)],
    });

    // Get tournament IDs where user has bets
    const tournamentIds = [...new Set(userBets.map(b => b.match.tournamentId).filter(Boolean))];

    // Get ALL matches from those tournaments for projection
    // Also need to load the previous match IDs to know the connections
    const allTournamentMatches = tournamentIds.length > 0
      ? await db.query.matches.findMany({
          where: sql`${matches.tournamentId} IN (${tournamentIds.join(',')})`,
          with: {
            teamA: true,
            teamB: true,
            tournament: true,
          },
        })
      : [];

    // Create a map of all matches for lookup
    const allMatchesMap = new Map(allTournamentMatches.map(m => [m.id, m]));

    // Create a map of user's predicted winners by matchId
    const userPredictions = new Map(
      userBets.map(bet => [bet.matchId, bet.predictedWinner])
    );

    // 3. PROJECT WINNERS FORWARD
    // For each match the user bet on, project the winner to matches that depend on it
    // The system uses teamAPreviousMatchId/teamBPreviousMatchId (backward links)
    // So we need to find matches where this match is a previous match

    // First, build a map of which matches feed into which slots
    // matchId -> [{ targetMatchId, slot }]
    const matchFeedsInto = new Map<number, Array<{ targetId: number; slot: 'A' | 'B' }>>();

    for (const match of allTournamentMatches) {
      // This match feeds into slot A of another match
      if (match.teamAPreviousMatchId) {
        const feeds = matchFeedsInto.get(match.teamAPreviousMatchId) || [];
        feeds.push({ targetId: match.id, slot: 'A' });
        matchFeedsInto.set(match.teamAPreviousMatchId, feeds);
      }
      // This match feeds into slot B of another match
      if (match.teamBPreviousMatchId) {
        const feeds = matchFeedsInto.get(match.teamBPreviousMatchId) || [];
        feeds.push({ targetId: match.id, slot: 'B' });
        matchFeedsInto.set(match.teamBPreviousMatchId, feeds);
      }
    }

    // Now project winners
    for (const [matchId, predictedWinner] of userPredictions) {
      if (!predictedWinner) continue;

      const targets = matchFeedsInto.get(matchId);
      if (!targets || targets.length === 0) continue;

      for (const target of targets) {
        const targetMatch = allMatchesMap.get(target.targetId);
        if (!targetMatch) continue;

        // Project the winner
        if (target.slot === 'A') {
          targetMatch.teamA = predictedWinner;
        } else {
          targetMatch.teamB = predictedWinner;
        }
      }
    }

    // 4. Group by tournament
    type BetWithRelations = (typeof userBets)[number];
    type TournamentGroup = {
      tournament: {
        id: number;
        name: string;
        slug: string;
        logoUrl: string | null;
      };
      bets: BetWithRelations[];
    };

    // Update bets with projected matches
    const betsWithProjection = userBets.map(bet => ({
      ...bet,
      match: allMatchesMap.get(bet.matchId) || bet.match,
    }));

    // 5. Find all projected future matches that user hasn't bet on yet
    // These are matches where at least one team was projected from user's predictions
    const userMatchIds = new Set(userBets.map(b => b.matchId));
    const projectedFutureMatches: typeof allTournamentMatches = [];

    for (const match of allTournamentMatches) {
      // Skip matches user already bet on
      if (userMatchIds.has(match.id)) continue;

      // Check if this match has any team projected from user's predictions
      // A team is "projected" if it came from a previous match where user made a prediction
      let hasProjectedTeam = false;

      // Check slot A
      if (match.teamAPreviousMatchId) {
        const prevMatchPrediction = userPredictions.get(match.teamAPreviousMatchId);
        if (prevMatchPrediction && match.teamA?.id === prevMatchPrediction.id) {
          hasProjectedTeam = true;
        }
      }

      // Check slot B
      if (match.teamBPreviousMatchId) {
        const prevMatchPrediction = userPredictions.get(match.teamBPreviousMatchId);
        if (prevMatchPrediction && match.teamB?.id === prevMatchPrediction.id) {
          hasProjectedTeam = true;
        }
      }

      if (hasProjectedTeam) {
        projectedFutureMatches.push(match);
      }
    }

    // Create synthetic bets for projected future matches
    const syntheticBets = projectedFutureMatches.map(match => ({
      id: -match.id, // Negative ID to indicate synthetic bet
      userId,
      matchId: match.id,
      predictedWinnerId: null,
      predictedScoreA: 0,
      predictedScoreB: 0,
      pointsEarned: null,
      isPerfectPick: null,
      isUnderdogPick: null,
      createdAt: new Date(),
      match,
      predictedWinner: null,
    }));

    // Combine real bets with synthetic projected bets
    const allBets = [...betsWithProjection, ...syntheticBets];

    // Regroup by tournament
    const tournamentMapProjected = new Map<number, TournamentGroup>();
    for (const bet of allBets) {
      const t = bet.match.tournament;
      if (!t) continue;
      if (!tournamentMapProjected.has(t.id)) {
        tournamentMapProjected.set(t.id, {
          tournament: { id: t.id, name: t.name, slug: t.slug, logoUrl: t.logoUrl },
          bets: [],
        });
      }
      tournamentMapProjected.get(t.id)!.bets.push(bet as any);
    }

    const betsByTournament = Array.from(tournamentMapProjected.values());

    return { stats, betsByTournament };
  });
