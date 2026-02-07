import { matches, teams } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { asc, eq, and, notInArray } from "drizzle-orm";
import { z } from "zod";

const getMatchesFn = createServerFn({ method: "GET" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const data = ctx.data;
    const { tournamentId } = z.object({ tournamentId: z.number() }).parse(data);

    const results = await db.query.matches.findMany({
      where: eq(matches.tournamentId, tournamentId),
      with: {
        teamA: true,
        teamB: true,
        winner: true,
      },
      orderBy: [asc(matches.displayOrder), asc(matches.startTime)],
    });
    return results;
  },
);

export const getMatches = getMatchesFn as unknown as (opts: {
  data: { tournamentId: number };
}) => Promise<
  (typeof matches.$inferSelect & {
    teamA: typeof teams.$inferSelect | null;
    teamB: typeof teams.$inferSelect | null;
    winner: typeof teams.$inferSelect | null;
  })[]
>;

const createMatchFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const data = ctx.data;
    const validData = z
      .object({
        tournamentId: z.number(),
        label: z.string().nullable().optional(),
        teamAId: z.coerce.number().nullable().optional(),
        teamBId: z.coerce.number().nullable().optional(),
        labelTeamA: z.string().nullable().optional(),
        labelTeamB: z.string().nullable().optional(),
        startTime: z.string(), // ISO string
        matchDayId: z.coerce.number().nullable().optional(),
        name: z.string().nullable().optional(),
        // New Dependency Fields
        teamAPreviousMatchId: z.number().nullable().optional(),
        teamAPreviousMatchResult: z
          .enum(["winner", "loser"])
          .nullable()
          .optional(),
        teamBPreviousMatchId: z.number().nullable().optional(),
        teamBPreviousMatchResult: z
          .enum(["winner", "loser"])
          .nullable()
          .optional(),
        isBettingEnabled: z.boolean().default(true),
        nextMatchWinnerId: z.coerce.number().nullable().optional(),
        nextMatchWinnerSlot: z.string().nullable().optional(),
        nextMatchLoserId: z.coerce.number().nullable().optional(),
        nextMatchLoserSlot: z.string().nullable().optional(),
        // Visual Bracket Fields
        roundIndex: z.number().nullable().optional(),
        bracketSide: z
          .enum(["upper", "lower", "grand_final"])
          .nullable()
          .optional(),
        displayOrder: z.number().nullable().optional(),
      })
      .parse(data);

    await db.insert(matches).values({
      tournamentId: validData.tournamentId,
      label: validData.label,
      teamAId: validData.teamAId,
      teamBId: validData.teamBId,
      labelTeamA: validData.labelTeamA,
      labelTeamB: validData.labelTeamB,
      startTime: new Date(validData.startTime),
      matchDayId: validData.matchDayId,
      name: validData.name,
      // Dependencies
      teamAPreviousMatchId: validData.teamAPreviousMatchId,
      teamAPreviousMatchResult: validData.teamAPreviousMatchResult,
      teamBPreviousMatchId: validData.teamBPreviousMatchId,
      teamBPreviousMatchResult: validData.teamBPreviousMatchResult,
      isBettingEnabled: validData.isBettingEnabled,
      nextMatchWinnerId: validData.nextMatchWinnerId,
      nextMatchWinnerSlot: validData.nextMatchWinnerSlot,
      nextMatchLoserId: validData.nextMatchLoserId,
      nextMatchLoserSlot: validData.nextMatchLoserSlot,
      roundIndex: validData.roundIndex,
      bracketSide: validData.bracketSide,
      displayOrder: validData.displayOrder,
    });
  },
);

export const createMatch = createMatchFn as unknown as (opts: {
  data: {
    tournamentId: number;
    label?: string | null;
    teamAId?: number | null;
    teamBId?: number | null;
    labelTeamA?: string | null;
    labelTeamB?: string | null;
    startTime: string;
    matchDayId?: number | null;
    name?: string | null;
    teamAPreviousMatchId?: number | null;
    teamAPreviousMatchResult?: "winner" | "loser" | null;
    teamBPreviousMatchId?: number | null;
    teamBPreviousMatchResult?: "winner" | "loser" | null;
    isBettingEnabled?: boolean;
    nextMatchWinnerId?: number | null;
    nextMatchWinnerSlot?: string | null;
    nextMatchLoserId?: number | null;
    nextMatchLoserSlot?: string | null;
    roundIndex?: number | null;
    bracketSide?: "upper" | "lower" | "grand_final" | null;
    displayOrder?: number | null;
  };
}) => Promise<void>;

const deleteMatchFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const id = z.number().parse(ctx.data);
    await db.delete(matches).where(eq(matches.id, id));
  },
);

export const deleteMatch = deleteMatchFn as unknown as (opts: {
  data: number;
}) => Promise<void>;

const updateMatchFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const data = ctx.data;
    // Separate ID from the rest of the data for update
    const { id, ...updateData } = z
      .object({
        id: z.number(),
        tournamentId: z.number(),
        label: z.string().nullable().optional(),
        teamAId: z.coerce.number().nullable().optional(),
        teamBId: z.coerce.number().nullable().optional(),
        labelTeamA: z.string().nullable().optional(),
        labelTeamB: z.string().nullable().optional(),
        startTime: z.string(), // ISO string
        matchDayId: z.coerce.number().nullable().optional(),
        name: z.string().nullable().optional(),
        // Dependency Fields
        teamAPreviousMatchId: z.number().nullable().optional(),
        teamAPreviousMatchResult: z
          .enum(["winner", "loser"])
          .nullable()
          .optional(),
        teamBPreviousMatchId: z.number().nullable().optional(),
        teamBPreviousMatchResult: z
          .enum(["winner", "loser"])
          .nullable()
          .optional(),
        isBettingEnabled: z.boolean().default(true),
        nextMatchWinnerId: z.coerce.number().nullable().optional(),
        nextMatchWinnerSlot: z.string().nullable().optional(),
        nextMatchLoserId: z.coerce.number().nullable().optional(),
        nextMatchLoserSlot: z.string().nullable().optional(),
        // Visual Bracket Fields
        roundIndex: z.number().nullable().optional(),
        bracketSide: z
          .enum(["upper", "lower", "grand_final"])
          .nullable()
          .optional(),
        displayOrder: z.number().nullable().optional(),
      })
      .parse(data);

    await db
      .update(matches)
      .set({
        tournamentId: updateData.tournamentId,
        label: updateData.label,
        teamAId: updateData.teamAId,
        teamBId: updateData.teamBId,
        labelTeamA: updateData.labelTeamA,
        labelTeamB: updateData.labelTeamB,
        startTime: new Date(updateData.startTime),
        matchDayId: updateData.matchDayId,
        name: updateData.name,
        teamAPreviousMatchId: updateData.teamAPreviousMatchId,
        teamAPreviousMatchResult: updateData.teamAPreviousMatchResult,
        teamBPreviousMatchId: updateData.teamBPreviousMatchId,
        teamBPreviousMatchResult: updateData.teamBPreviousMatchResult,
        isBettingEnabled: updateData.isBettingEnabled,
        nextMatchWinnerId: updateData.nextMatchWinnerId,
        nextMatchWinnerSlot: updateData.nextMatchWinnerSlot,
        nextMatchLoserId: updateData.nextMatchLoserId,
        nextMatchLoserSlot: updateData.nextMatchLoserSlot,
        roundIndex: updateData.roundIndex,
        bracketSide: updateData.bracketSide,
        displayOrder: updateData.displayOrder,
      })
      .where(eq(matches.id, id));
  },
);

export const updateMatch = updateMatchFn as unknown as (opts: {
  data: {
    id: number;
    tournamentId: number;
    label?: string | null;
    teamAId?: number | null;
    teamBId?: number | null;
    labelTeamA?: string | null;
    labelTeamB?: string | null;
    startTime: string;
    matchDayId?: number | null;
    name?: string | null;
    teamAPreviousMatchId?: number | null;
    teamAPreviousMatchResult?: "winner" | "loser" | null;
    teamBPreviousMatchId?: number | null;
    teamBPreviousMatchResult?: "winner" | "loser" | null;
    isBettingEnabled?: boolean;
    nextMatchWinnerId?: number | null;
    nextMatchWinnerSlot?: string | null;
    nextMatchLoserId?: number | null;
    nextMatchLoserSlot?: string | null;
    roundIndex?: number | null;
    bracketSide?: "upper" | "lower" | "grand_final" | null;
    displayOrder?: number | null;
  };
}) => Promise<void>;

const generateNextRoundFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const { tournamentId, roundIndex, bracketSide } = z
      .object({
        tournamentId: z.number(),
        roundIndex: z.number(),
        bracketSide: z.enum(["upper", "lower"]),
      })
      .parse(ctx.data);

    // 1. Fetch matches from current round
    const currentMatches = await db.query.matches.findMany({
      where: (m, { and, eq }) =>
        and(
          eq(m.tournamentId, tournamentId),
          eq(m.roundIndex, roundIndex),
          eq(m.bracketSide, bracketSide),
        ),
      orderBy: (m, { asc }) => [asc(m.displayOrder), asc(m.id)],
    });

    if (currentMatches.length < 2) {
      throw new Error("Not enough matches to generate next round");
    }

    // 2. Pair them up
    // Match 1 (Order 1) vs Match 2 (Order 2) -> Next Match 1
    const nextRoundIndex = roundIndex + 1;

    for (let i = 0; i < currentMatches.length; i += 2) {
      const matchA = currentMatches[i];
      const matchB = currentMatches[i + 1];

      if (!matchB) break; // Odd number of matches, maybe a bye? For now ignore.

      const nextDisplayOrder = Math.floor(i / 2) + 1;

      // Create the new match
      await db.insert(matches).values({
        tournamentId,
        roundIndex: nextRoundIndex,
        bracketSide,
        displayOrder: nextDisplayOrder,
        label: `Round ${nextRoundIndex + 1} - Match ${nextDisplayOrder}`,
        name: `Match ${nextDisplayOrder}`,
        startTime: new Date(), // Default to now, user edits later
        // Link Predecessors
        teamAPreviousMatchId: matchA.id,
        teamAPreviousMatchResult: "winner",
        labelTeamA: `Winner of #${matchA.displayOrder}`,

        teamBPreviousMatchId: matchB.id,
        teamBPreviousMatchResult: "winner",
        labelTeamB: `Winner of #${matchB.displayOrder}`,
      });
    }
  },
);

export const generateNextRound = generateNextRoundFn as unknown as (opts: {
  data: {
    tournamentId: number;
    roundIndex: number;
    bracketSide: "upper" | "lower";
  };
}) => Promise<void>;

const generateFullBracketFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const { tournamentId } = z
      .object({
        tournamentId: z.number(),
      })
      .parse(ctx.data);

    // 1. Fetch all existing matches for this tournament to find quarters
    const allMatches = await db.query.matches.findMany({
      where: (m, { eq }) => eq(m.tournamentId, tournamentId),
      orderBy: (m, { asc }) => [asc(m.roundIndex), asc(m.displayOrder)],
    });

    const quarters = allMatches.filter(
      (m) => (m as any).roundIndex === 0 && (m as any).bracketSide === "upper",
    );

    if (quarters.length < 4) {
      throw new Error(
        "Need at least 4 Quarter-Final matches in Upper Bracket to generate a full 8-team DE structure.",
      );
    }

    // 2. CLEANUP: Delete all other matches to allow re-generation (Idempotency)
    const quarterIds = quarters.map((q) => q.id);
    await db
      .delete(matches)
      .where(
        and(
          eq(matches.tournamentId, tournamentId),
          notInArray(matches.id, quarterIds),
        ),
      );

    // 3. Re-sort quarters explicitly by displayOrder to be extra safe
    const sortedQuarters = [...quarters].sort((a, b) => {
      const orderA = (a as any).displayOrder ?? 999;
      const orderB = (b as any).displayOrder ?? 999;
      return orderA - orderB;
    });

    // Helper to create or get match
    const createMatch = async (data: any) => {
      const [newMatch] = await db
        .insert(matches)
        .values({
          tournamentId,
          startTime: new Date(),
          isBettingEnabled: true,
          ...data,
        })
        .returning();
      return newMatch;
    };

    const q1 = sortedQuarters[0];
    const q2 = sortedQuarters[1];
    const q3 = sortedQuarters[2];
    const q4 = sortedQuarters[3];

    // --- UPPER BRACKET ---
    // UB Semis (Round 1)
    const ubSf1 = await createMatch({
      roundIndex: 1,
      bracketSide: "upper",
      displayOrder: 1,
      name: "Upper Semi-Final 1",
      label: "UB Semi-Final 1",
      teamAPreviousMatchId: q1.id,
      teamAPreviousMatchResult: "winner",
      labelTeamA: "UB Quarter 1 Winner",
      teamBPreviousMatchId: q2.id,
      teamBPreviousMatchResult: "winner",
      labelTeamB: "UB Quarter 2 Winner",
    });

    const ubSf2 = await createMatch({
      roundIndex: 1,
      bracketSide: "upper",
      displayOrder: 2,
      name: "Upper Semi-Final 2",
      label: "UB Semi-Final 2",
      teamAPreviousMatchId: q3.id,
      teamAPreviousMatchResult: "winner",
      labelTeamA: "UB Quarter 3 Winner",
      teamBPreviousMatchId: q4.id,
      teamBPreviousMatchResult: "winner",
      labelTeamB: "UB Quarter 4 Winner",
    });

    // UB Final (Round 2)
    const ubFinal = await createMatch({
      roundIndex: 2,
      bracketSide: "upper",
      displayOrder: 1,
      name: "Upper Bracket Final",
      label: "UB Final",
      teamAPreviousMatchId: ubSf1.id,
      teamAPreviousMatchResult: "winner",
      labelTeamA: "UB Semi 1 Winner",
      teamBPreviousMatchId: ubSf2.id,
      teamBPreviousMatchResult: "winner",
      labelTeamB: "UB Semi 2 Winner",
    });

    // --- LOWER BRACKET ---
    // LB Round 1 (Round 0)
    // Connecting losers of Quarters
    const lbR1_1 = await createMatch({
      roundIndex: 0,
      bracketSide: "lower",
      displayOrder: 1,
      name: "Lower Bracket R1 - M1",
      label: "LB Round 1",
      teamAPreviousMatchId: q1.id,
      teamAPreviousMatchResult: "loser",
      labelTeamA: "UB Quarter 1 Loser",
      teamBPreviousMatchId: q2.id,
      teamBPreviousMatchResult: "loser",
      labelTeamB: "UB Quarter 2 Loser",
    });

    const lbR1_2 = await createMatch({
      roundIndex: 0,
      bracketSide: "lower",
      displayOrder: 2,
      name: "Lower Bracket R1 - M2",
      label: "LB Round 1",
      teamAPreviousMatchId: q3.id,
      teamAPreviousMatchResult: "loser",
      labelTeamA: "UB Quarter 3 Loser",
      teamBPreviousMatchId: q4.id,
      teamBPreviousMatchResult: "loser",
      labelTeamB: "UB Quarter 4 Loser",
    });

    // LB Round 2 (Quarter-Finals) (Round 1)
    // Winner of LB R1 vs Loser of UB Semis (Crossed)
    const lbQf1 = await createMatch({
      roundIndex: 1,
      bracketSide: "lower",
      displayOrder: 1,
      name: "Lower Bracket Quarter-Final 1",
      label: "LB Quarter-Final",
      teamAPreviousMatchId: lbR1_1.id,
      teamAPreviousMatchResult: "winner",
      labelTeamA: "LB R1 Winner",
      teamBPreviousMatchId: ubSf2.id, // Crossed loser from UB SF2
      teamBPreviousMatchResult: "loser",
      labelTeamB: "UB Semi 2 Loser",
    });

    const lbQf2 = await createMatch({
      roundIndex: 1,
      bracketSide: "lower",
      displayOrder: 2,
      name: "Lower Bracket Quarter-Final 2",
      label: "LB Quarter-Final",
      teamAPreviousMatchId: lbR1_2.id,
      teamAPreviousMatchResult: "winner",
      labelTeamA: "LB R1 Winner",
      teamBPreviousMatchId: ubSf1.id, // Crossed loser from UB SF1
      teamBPreviousMatchResult: "loser",
      labelTeamB: "UB Semi 1 Loser",
    });

    // LB Round 3 (Semi-Final) (Round 2)
    const lbSf = await createMatch({
      roundIndex: 2,
      bracketSide: "lower",
      displayOrder: 1,
      name: "Lower Bracket Semi-Final",
      label: "LB Semi-Final",
      teamAPreviousMatchId: lbQf1.id,
      teamAPreviousMatchResult: "winner",
      labelTeamA: "LB Quarter 1 Winner",
      teamBPreviousMatchId: lbQf2.id,
      teamBPreviousMatchResult: "winner",
      labelTeamB: "LB Quarter 2 Winner",
    });

    // LB Round 4 (Final) (Round 3)
    // Winner of LB SF vs Loser of UB Final
    const lbFinal = await createMatch({
      roundIndex: 3,
      bracketSide: "lower",
      displayOrder: 1,
      name: "Lower Bracket Final",
      label: "LB Final",
      teamAPreviousMatchId: lbSf.id,
      teamAPreviousMatchResult: "winner",
      labelTeamA: "LB Semi Winner",
      teamBPreviousMatchId: ubFinal.id,
      teamBPreviousMatchResult: "loser",
      labelTeamB: "UB Final Loser",
    });

    // --- GRAND FINAL ---
    await createMatch({
      roundIndex: 4, // Incremented to 4 to follow LB Final (Round 3)
      bracketSide: "grand_final",
      displayOrder: 1,
      name: "Grand Final",
      label: "Grand Final",
      teamAPreviousMatchId: ubFinal.id,
      teamAPreviousMatchResult: "winner",
      labelTeamA: "UB Final Champion",
      teamBPreviousMatchId: lbFinal.id,
      teamBPreviousMatchResult: "winner",
      labelTeamB: "LB Final Champion",
    });
  },
);

export const generateFullBracket = generateFullBracketFn as unknown as (opts: {
  data: {
    tournamentId: number;
    roundIndex: number;
    bracketSide: "upper" | "lower";
  };
}) => Promise<void>;

// ============================================
// LIVE MATCH CONTROL FUNCTIONS
// ============================================

/**
 * Get a single match by ID with team data (for live control)
 */
const getLiveMatchFn = createServerFn({ method: "GET" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const data = ctx.data;
    const { matchId } = z.object({ matchId: z.number() }).parse(data);

    const match = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
      with: {
        teamA: true,
        teamB: true,
        winner: true,
        tournament: true,
      },
    });

    if (!match) {
      throw new Error("Partida não encontrada");
    }

    return match;
  },
);

export const getLiveMatch = getLiveMatchFn as unknown as (opts: {
  data: { matchId: number };
}) => Promise<
  typeof matches.$inferSelect & {
    teamA: typeof teams.$inferSelect | null;
    teamB: typeof teams.$inferSelect | null;
    winner: typeof teams.$inferSelect | null;
    tournament: any;
  }
>;

/**
 * Update live score for a match (instant update)
 */
const updateLiveScoreFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const data = ctx.data;
    const validData = z
      .object({
        matchId: z.number(),
        scoreA: z.number().min(0).max(10),
        scoreB: z.number().min(0).max(10),
      })
      .parse(data);

    // Update match scores
    const updated = await db
      .update(matches)
      .set({
        scoreA: validData.scoreA,
        scoreB: validData.scoreB,
        status: "live", // Set to live when updating scores
      })
      .where(eq(matches.id, validData.matchId))
      .returning();

    if (!updated[0]) {
      throw new Error("Partida não encontrada");
    }

    return updated[0];
  },
);

export const updateLiveScore = updateLiveScoreFn as unknown as (opts: {
  data: { matchId: number; scoreA: number; scoreB: number };
}) => Promise<typeof matches.$inferSelect>;

/**
 * Increment score for a specific team
 */
const incrementScoreFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const data = ctx.data;
    const validData = z
      .object({
        matchId: z.number(),
        team: z.enum(["A", "B"]),
      })
      .parse(data);

    // Get current match with tournament info
    const currentMatch = await db.query.matches.findFirst({
      where: eq(matches.id, validData.matchId),
      with: {
        tournament: true,
      },
    });

    if (!currentMatch) {
      throw new Error("Partida não encontrada");
    }

    // Determine Best Of X (default to Bo5 if unknown)
    let bestOf = 5;
    const format = currentMatch.tournament?.format?.toLowerCase() || "";
    if (format.includes("bo3")) bestOf = 3;
    else if (format.includes("bo5")) bestOf = 5;
    else if (format.includes("bo7")) bestOf = 7;

    const winsNeeded = Math.ceil(bestOf / 2);

    // Calculate new scores
    let newScoreA = currentMatch.scoreA || 0;
    let newScoreB = currentMatch.scoreB || 0;

    if (validData.team === "A") {
      if (newScoreA + 1 > winsNeeded) {
        throw new Error(
          `Score limit reached for Bo${bestOf} (Max ${winsNeeded})`,
        );
      }
      newScoreA++;
    } else {
      if (newScoreB + 1 > winsNeeded) {
        throw new Error(
          `Score limit reached for Bo${bestOf} (Max ${winsNeeded})`,
        );
      }
      newScoreB++;
    }

    // Update match
    const updated = await db
      .update(matches)
      .set({
        scoreA: newScoreA,
        scoreB: newScoreB,
        status: "live",
      })
      .where(eq(matches.id, validData.matchId))
      .returning();

    return updated[0];
  },
);

export const incrementScore = incrementScoreFn as unknown as (opts: {
  data: { matchId: number; team: "A" | "B" };
}) => Promise<typeof matches.$inferSelect>;

/**
 * Reset scores to 0-0
 */
const resetScoresFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const data = ctx.data;
    const { matchId } = z.object({ matchId: z.number() }).parse(data);

    const updated = await db
      .update(matches)
      .set({
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        status: "live",
      })
      .where(eq(matches.id, matchId))
      .returning();

    if (!updated[0]) {
      throw new Error("Partida não encontrada");
    }

    return updated[0];
  },
);

export const resetScores = resetScoresFn as unknown as (opts: {
  data: { matchId: number };
}) => Promise<typeof matches.$inferSelect>;

/**
 * Finalize match - set winner and status to finished
 */
const finalizeMatchFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const data = ctx.data;
    const validData = z
      .object({
        matchId: z.number(),
        winnerId: z.number(),
      })
      .parse(data);

    // Get match to verify winner is valid
    const currentMatch = await db.query.matches.findFirst({
      where: eq(matches.id, validData.matchId),
    });

    if (!currentMatch) {
      throw new Error("Partida não encontrada");
    }

    // Verify winner is one of the teams
    if (
      validData.winnerId !== currentMatch.teamAId &&
      validData.winnerId !== currentMatch.teamBId
    ) {
      throw new Error("Vencedor deve ser um dos times da partida");
    }

    // Update match with winner
    const updated = await db
      .update(matches)
      .set({
        winnerId: validData.winnerId,
        status: "finished",
      })
      .where(eq(matches.id, validData.matchId))
      .returning();

    // --- BRACKET PROGRESSION ---
    // Find matches that depend on this match
    const dependentMatches = await db.query.matches.findMany({
      where: (m, { or, eq }) =>
        or(
          eq(m.teamAPreviousMatchId, validData.matchId),
          eq(m.teamBPreviousMatchId, validData.matchId),
        ),
    });

    const loserId =
      validData.winnerId === currentMatch.teamAId
        ? currentMatch.teamBId
        : currentMatch.teamAId;

    if (!loserId) {
      // Should not happen if match was valid, but good for safety
      console.error("Could not determine loser ID for progression");
      return updated[0];
    }

    for (const match of dependentMatches) {
      const updates: any = {};

      // Check Team A dependency
      if (match.teamAPreviousMatchId === validData.matchId) {
        if (match.teamAPreviousMatchResult === "winner") {
          updates.teamAId = validData.winnerId;
        } else if (match.teamAPreviousMatchResult === "loser") {
          updates.teamAId = loserId;
        }
      }

      // Check Team B dependency
      if (match.teamBPreviousMatchId === validData.matchId) {
        if (match.teamBPreviousMatchResult === "winner") {
          updates.teamBId = validData.winnerId;
        } else if (match.teamBPreviousMatchResult === "loser") {
          updates.teamBId = loserId;
        }
      }

      // If we have updates, apply them
      if (Object.keys(updates).length > 0) {
        await db.update(matches).set(updates).where(eq(matches.id, match.id));
      }
    }

    return updated[0];
  },
);

const updateMatchOrderFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const { matches: matchesSchema } = await import("@bsebet/db/schema");
    console.log(
      "updateMatchOrder called with:",
      JSON.stringify(ctx.data, null, 2),
    );
    try {
      console.log("Attempting to parse data for updateMatchOrder.");
      const data = ctx.data;
      const { updates } = z
        .object({
          updates: z.array(
            z.object({
              id: z.number(),
              displayOrder: z.number(),
            }),
          ),
        })
        .parse(data);

      // Neon HTTP driver doesn't support transactions, so we'll run updates sequentially
      // This is acceptable here since the order is not critical data integrity-wise
      for (const update of updates) {
        await db
          .update(matchesSchema)
          .set({ displayOrder: update.displayOrder })
          .where(eq(matchesSchema.id, update.id));
      }

      console.log("updateMatchOrder success");
      return { success: true };
    } catch (error) {
      console.error("updateMatchOrder failed:", error);
      throw error;
    }
  },
);

export const updateMatchOrder = updateMatchOrderFn as unknown as (opts: {
  data: {
    updates: {
      id: number;
      displayOrder: number;
    }[];
  };
}) => Promise<{ success: boolean }>;

export const finalizeMatch = finalizeMatchFn as unknown as (opts: {
  data: { matchId: number; winnerId: number };
}) => Promise<typeof matches.$inferSelect>;
