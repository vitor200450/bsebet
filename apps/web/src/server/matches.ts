import { matches, matchDays, bets } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, ilike, inArray, not } from "drizzle-orm";
import { z } from "zod";
import { settleBets } from "./scoring";

function getBracketMatchName(
  matchesCount: number,
  index: number,
  side: string,
) {
  if (side === "grand_final") return "Grand Final";

  const prefix =
    side === "upper" || side === "main" ? "" : side.toUpperCase() + " ";

  if (matchesCount === 1) return `${prefix}Final`;
  if (matchesCount === 2) return `${prefix}Semi-Final #${index + 1}`;
  if (matchesCount === 4) return `${prefix}Quarter-Final #${index + 1}`;
  if (matchesCount === 8) return `${prefix}Round of 16 #${index + 1}`;
  if (matchesCount === 16) return `${prefix}Round of 32 #${index + 1}`;
  return `${prefix}Round Match #${index + 1}`;
}

/**
 * Updates bracket progression by moving winner/loser to next matches
 * after a match is finished
 */
async function updateBracketProgression(db: any, finishedMatch: any) {
  if (!finishedMatch.winnerId) {
    return;
  }

  const winnerId = finishedMatch.winnerId;
  const loserId =
    finishedMatch.teamAId === winnerId
      ? finishedMatch.teamBId
      : finishedMatch.teamAId;

  // Find all matches that depend on this match result
  const dependentMatches = await db.query.matches.findMany({
    where: (m: any, { or, eq }: any) =>
      or(
        eq(m.teamAPreviousMatchId, finishedMatch.id),
        eq(m.teamBPreviousMatchId, finishedMatch.id),
      ),
  });

  // Update each dependent match
  for (const depMatch of dependentMatches) {
    const updates: any = {};

    // Check if this match feeds into Team A slot
    if (depMatch.teamAPreviousMatchId === finishedMatch.id) {
      if (depMatch.teamAPreviousMatchResult === "winner") {
        updates.teamAId = winnerId;
      } else if (depMatch.teamAPreviousMatchResult === "loser") {
        updates.teamAId = loserId;
      }
    }

    // Check if this match feeds into Team B slot
    if (depMatch.teamBPreviousMatchId === finishedMatch.id) {
      if (depMatch.teamBPreviousMatchResult === "winner") {
        updates.teamBId = winnerId;
      } else if (depMatch.teamBPreviousMatchResult === "loser") {
        updates.teamBId = loserId;
      }
    }

    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      await db.update(matches).set(updates).where(eq(matches.id, depMatch.id));
    }
  }
}

/**
 * Busca matches otimizada - Reduz dados transferidos em ~80%
 * Versão otimizada que evita LATERAL JOIN com json_build_array
 */
const getMatchesFn = createServerFn({ method: "GET" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const data = z.object({ tournamentId: z.number() }).parse(ctx.data);

    // Query 1: Apenas matches (sem joins pesados)
    // Seleciona apenas colunas necessárias (não *)
    const matchesData = await db.query.matches.findMany({
      where: eq(matches.tournamentId, data.tournamentId),
      orderBy: [asc(matches.startTime), asc(matches.displayOrder)],
      columns: {
        id: true,
        tournamentId: true,
        matchDayId: true,
        label: true,
        stageId: true,
        name: true,
        teamAId: true,
        teamBId: true,
        labelTeamA: true,
        labelTeamB: true,
        startTime: true,
        status: true,
        winnerId: true,
        scoreA: true,
        scoreB: true,
        nextMatchWinnerId: true,
        nextMatchWinnerSlot: true,
        nextMatchLoserId: true,
        nextMatchLoserSlot: true,
        roundIndex: true,
        bracketSide: true,
        displayOrder: true,
        isBettingEnabled: true,
        underdogTeamId: true,
        teamAPreviousMatchId: true,
        teamBPreviousMatchId: true,
        teamAPreviousMatchResult: true,
        teamBPreviousMatchResult: true,
      },
    });

    // Query 2: Busca apenas os teams necessários
    const teamIds = new Set<number>();
    matchesData.forEach((m) => {
      if (m.teamAId) teamIds.add(m.teamAId);
      if (m.teamBId) teamIds.add(m.teamBId);
    });

    if (teamIds.size === 0) {
      return matchesData.map((m) => ({ ...m, teamA: null, teamB: null }));
    }

    const { teams } = await import("@bsebet/db/schema");

    // Busca teams com logoUrl (agora é URL do R2, não Base64)
    const teamsData = await db.query.teams.findMany({
      where: inArray(teams.id, Array.from(teamIds)),
      columns: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true, // URL do R2 - leve e cacheável
        region: true,
      },
    });

    // Mapeamento eficiente na aplicação
    const teamsMap = new Map(teamsData.map((t) => [t.id, t]));

    return matchesData.map((match) => ({
      ...match,
      teamA: match.teamAId ? teamsMap.get(match.teamAId) || null : null,
      teamB: match.teamBId ? teamsMap.get(match.teamBId) || null : null,
    }));
  },
);

export const getMatches = getMatchesFn as unknown as (opts: {
  data: { tournamentId: number };
}) => Promise<any[]>;

const getLiveMatchFn = createServerFn({ method: "GET" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const { matchId } = z.object({ matchId: z.number() }).parse(ctx.data);

    const result = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
      with: {
        teamA: true,
        teamB: true,
        tournament: true,
      },
    });

    if (!result) throw new Error("Match not found");
    return result;
  },
);

export const getLiveMatch = getLiveMatchFn as unknown as (opts: {
  data: { matchId: number };
}) => Promise<any>;

const updateMatchFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const { matchId, ...updateData } = ctx.data;

    // Load current match state to check for status transitions
    const currentMatch = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
    });

    if (!currentMatch) throw new Error("Match not found");

    if (updateData.startTime && typeof updateData.startTime === "string") {
      updateData.startTime = new Date(updateData.startTime);
    }

    const [updated] = await db
      .update(matches)
      .set(updateData)
      .where(eq(matches.id, matchId))
      .returning();

    // Trigger bet settlement if status IS now finished (or was already finished and we updated it)
    if (updateData.status === "finished") {
      try {
        await settleBets({ data: { matchId } });
      } catch (e) {
        console.error("Failed to settle bets after update", e);
      }

      // Update bracket progression (move winner/loser to next matches)
      await updateBracketProgression(db, updated);
    }

    return updated;
  },
);

export const updateMatch = updateMatchFn as unknown as (opts: {
  data: { matchId: number; [key: string]: any };
}) => Promise<any>;

const createMatchFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const insertData = { ...ctx.data };
    if (insertData.startTime && typeof insertData.startTime === "string") {
      insertData.startTime = new Date(insertData.startTime);
    }
    const [created] = await db.insert(matches).values(insertData).returning();
    return created;
  },
);

export const createMatch = createMatchFn as unknown as (opts: {
  data: any;
}) => Promise<any>;

const deleteMatchFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const matchId = Number(ctx.data);
    await db.delete(matches).where(eq(matches.id, matchId));
    return { success: true };
  },
);

export const deleteMatch = deleteMatchFn as unknown as (opts: {
  data: number;
}) => Promise<{ success: boolean }>;

const incrementScoreFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const { matchId, team } = z
      .object({
        matchId: z.number(),
        team: z.enum(["A", "B"]),
      })
      .parse(ctx.data);

    const match = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
    });

    if (!match) throw new Error("Match not found");

    const update: any = { status: "live" };
    if (team === "A") update.scoreA = (match.scoreA || 0) + 1;
    else update.scoreB = (match.scoreB || 0) + 1;

    const [updated] = await db
      .update(matches)
      .set(update)
      .where(eq(matches.id, matchId))
      .returning();

    return updated;
  },
);

export const incrementScore = incrementScoreFn as unknown as (opts: {
  data: { matchId: number; team: "A" | "B" };
}) => Promise<any>;

const finalizeMatchFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const { matchId, winnerId } = z
      .object({
        matchId: z.number(),
        winnerId: z.number(),
      })
      .parse(ctx.data);

    const [updated] = await db
      .update(matches)
      .set({
        winnerId,
        status: "finished",
      })
      .where(eq(matches.id, matchId))
      .returning();

    await settleBets({ data: { matchId } });

    // Update bracket progression (move winner/loser to next matches)
    await updateBracketProgression(db, updated);

    return updated;
  },
);

export const finalizeMatch = finalizeMatchFn as unknown as (opts: {
  data: { matchId: number; winnerId: number };
}) => Promise<any>;

const resetScoresFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const { matchId, status } = z
      .object({
        matchId: z.number(),
        status: z.enum(["scheduled", "live", "finished"]).optional(),
      })
      .parse(ctx.data);

    const [updated] = await db
      .update(matches)
      .set({
        scoreA: 0,
        scoreB: 0,
        status: status || "live",
        winnerId: null,
      })
      .where(eq(matches.id, matchId))
      .returning();

    return updated;
  },
);

export const resetScores = resetScoresFn as unknown as (opts: {
  data: { matchId: number; status?: string };
}) => Promise<any>;

const updateMatchOrderFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const { updates } = z
      .object({
        updates: z.array(
          z.object({
            id: z.number(),
            displayOrder: z.number(),
          }),
        ),
      })
      .parse(ctx.data);

    for (const update of updates) {
      await db
        .update(matches)
        .set({ displayOrder: update.displayOrder })
        .where(eq(matches.id, update.id));
    }

    return { success: true };
  },
);

export const updateMatchOrder = updateMatchOrderFn as unknown as (opts: {
  data: { updates: { id: number; displayOrder: number }[] };
}) => Promise<{ success: boolean }>;

const generateNextRoundFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const { tournamentId, roundIndex, bracketSide } = z
      .object({
        tournamentId: z.number(),
        roundIndex: z.number(),
        bracketSide: z.string(),
      })
      .parse(ctx.data);

    const currentMatches = await db.query.matches.findMany({
      where: and(
        eq(matches.tournamentId, tournamentId),
        eq(matches.roundIndex, roundIndex),
        eq(matches.bracketSide, bracketSide),
      ),
    });

    const nextMatchesCount = Math.floor(currentMatches.length / 2);
    const createdMatches = [];

    for (let i = 0; i < nextMatchesCount; i++) {
      const matchA = currentMatches[i * 2];
      const matchB = currentMatches[i * 2 + 1];

      const matchName = getBracketMatchName(nextMatchesCount, i, bracketSide);
      const labelA = `Winner of ${matchA.name || "#" + matchA.id}`;
      const labelB = `Winner of ${matchB.name || "#" + matchB.id}`;

      const [created] = await db
        .insert(matches)
        .values({
          tournamentId,
          roundIndex: roundIndex + 1,
          bracketSide,
          labelTeamA: labelA,
          labelTeamB: labelB,
          teamAPreviousMatchId: matchA.id,
          teamBPreviousMatchId: matchB.id,
          startTime: new Date(),
          status: "scheduled",
          name: matchName,
          label: matchName,
        })
        .returning();
      createdMatches.push(created);
    }

    return createdMatches;
  },
);

export const generateNextRound = generateNextRoundFn as unknown as (opts: {
  data: { tournamentId: number; roundIndex: number; bracketSide: string };
}) => Promise<any[]>;

const generateFullBracketFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    console.log("generateFullBracketFn called with:", ctx.data);
    const { tournamentId, stageId } = z
      .object({
        tournamentId: z.number(),
        stageId: z.string().optional(),
      })
      .parse(ctx.data);
    console.log("Parsed data:", { tournamentId, stageId });

    try {
      const tournament = await db.query.tournaments.findFirst({
        where: (t, { eq }) => eq(t.id, tournamentId),
      });

      if (!tournament) throw new Error("Tournament not found");
      console.log("Tournament found:", tournament.id);

      const stages = (tournament.stages as any[]) || [];
      let stage;
      if (stageId) {
        stage = stages.find((s) => s.id === stageId);
      } else {
        stage = stages.find(
          (s) =>
            s.type === "Single Elimination" || s.type === "Double Elimination",
        );
        if (!stage) stage = stages[0];
      }

      if (!stage) throw new Error("Stage not found");

      // Clear ghost matches:
      if (stageId) {
        // Find matches to be deleted
        const matchesToDelete = await db.query.matches.findMany({
          where: eq(matches.stageId, stageId),
          columns: { id: true },
        });
        const matchIds = matchesToDelete.map((m) => m.id);

        if (matchIds.length > 0) {
          await db.delete(bets).where(inArray(bets.matchId, matchIds));
          await db.delete(matches).where(inArray(matches.id, matchIds));
        }
      } else {
        // Find matches to be deleted
        const matchesToDelete = await db.query.matches.findMany({
          where: and(
            eq(matches.tournamentId, tournamentId),
            inArray(matches.bracketSide, [
              "upper",
              "lower",
              "main",
              "grand_final",
            ]),
          ),
          columns: { id: true },
        });
        const matchIds = matchesToDelete.map((m) => m.id);

        if (matchIds.length > 0) {
          await db.delete(bets).where(inArray(bets.matchId, matchIds));
          await db.delete(matches).where(inArray(matches.id, matchIds));
        }
      }

      if (stage.type === "Groups") {
        const groupsCount = stage.settings?.groupsCount || 4;
        const format = stage.settings?.format || "GSL";

        const seededTeams = await db.query.tournamentTeams.findMany({
          where: (tt, { eq, isNotNull }) =>
            and(eq(tt.tournamentId, tournamentId), isNotNull(tt.group)),
          with: { team: true },
        });

        let matchDay = await db.query.matchDays.findFirst({
          where: eq(matchDays.tournamentId, tournamentId),
          orderBy: (md, { asc }) => [asc(md.date)],
        });

        if (!matchDay) {
          const [created] = await db
            .insert(matchDays)
            .values({
              tournamentId,
              date: new Date(),
              label: "Day 1",
              status: "draft",
            })
            .returning();
          matchDay = created;
        }
        const matchStartTime = matchDay.date || new Date();

        for (let i = 0; i < groupsCount; i++) {
          const groupChar = String.fromCharCode(65 + i);
          const groupTeams = seededTeams
            .filter((t: any) => t.group === groupChar)
            .sort((a: any, b: any) => (a.seed || 99) - (b.seed || 99));

          if (groupTeams.length === 0) continue;

          if (format === "GSL") {
            const [m1] = await db
              .insert(matches)
              .values({
                tournamentId,
                stageId: stage.id,
                bracketSide: "groups",
                label: `Group ${groupChar}`,
                name: `Group ${groupChar} - Opening Match 1`,
                teamAId: groupTeams[0]?.teamId,
                teamBId: groupTeams[3]?.teamId,
                displayOrder: i * 10 + 1,
                startTime: matchStartTime,
                matchDayId: matchDay.id,
                isBettingEnabled: true,
              })
              .returning();

            const [m2] = await db
              .insert(matches)
              .values({
                tournamentId,
                stageId: stage.id,
                bracketSide: "groups",
                label: `Group ${groupChar}`,
                name: `Group ${groupChar} - Opening Match 2`,
                teamAId: groupTeams[1]?.teamId,
                teamBId: groupTeams[2]?.teamId,
                displayOrder: i * 10 + 2,
                startTime: matchStartTime,
                matchDayId: matchDay.id,
                isBettingEnabled: true,
              })
              .returning();

            const [m3] = await db
              .insert(matches)
              .values({
                tournamentId,
                stageId: stage.id,
                bracketSide: "groups",
                label: `Group ${groupChar}`,
                name: `Group ${groupChar} - Winners Match`,
                teamAPreviousMatchId: m1.id,
                teamBPreviousMatchId: m2.id,
                labelTeamA: "Winner Match 1",
                labelTeamB: "Winner Match 2",
                displayOrder: i * 10 + 3,
                startTime: matchStartTime,
                matchDayId: matchDay.id,
                isBettingEnabled: true,
              })
              .returning();

            const [m4] = await db
              .insert(matches)
              .values({
                tournamentId,
                stageId: stage.id,
                bracketSide: "groups",
                label: `Group ${groupChar}`,
                name: `Group ${groupChar} - Elimination Match`,
                teamAPreviousMatchId: m1.id,
                teamBPreviousMatchId: m2.id,
                teamAPreviousMatchResult: "loser",
                teamBPreviousMatchResult: "loser",
                labelTeamA: "Loser Match 1",
                labelTeamB: "Loser Match 2",
                displayOrder: i * 10 + 4,
                startTime: matchStartTime,
                matchDayId: matchDay.id,
                isBettingEnabled: true,
              })
              .returning();

            await db.insert(matches).values({
              tournamentId,
              stageId: stage.id,
              bracketSide: "groups",
              label: `Group ${groupChar}`,
              name: `Group ${groupChar} - Decider Match`,
              teamAPreviousMatchId: m3.id,
              teamBPreviousMatchId: m4.id,
              teamAPreviousMatchResult: "loser",
              teamBPreviousMatchResult: "winner",
              labelTeamA: "Loser Winners Match",
              labelTeamB: "Winner Elim. Match",
              displayOrder: i * 10 + 5,
              startTime: matchStartTime,
              matchDayId: matchDay.id,
              isBettingEnabled: true,
            });
          }
        }
      } else {
        // Playoff Generation
        const groupsStage = stages.find((s) => s.type === "Groups");
        const advancingPerGroup = stage.settings?.advancingPerGroup || 2;
        const groupsCount = groupsStage?.settings?.groupsCount || 4;
        const totalTeams = advancingPerGroup * groupsCount;
        const firstRoundMatchesCount = totalTeams / 2;
        const side = stage.type === "Double Elimination" ? "upper" : "main";

        const placeholders = generatePlaceholderLabels(
          groupsCount,
          advancingPerGroup,
        );

        let playoffMatchDay = await db.query.matchDays.findFirst({
          where: and(
            eq(matchDays.tournamentId, tournamentId),
            not(ilike(matchDays.label, "%Group%")),
          ),
          orderBy: (md, { asc }) => [asc(md.date)],
        });

        if (!playoffMatchDay) {
          const [created] = await db
            .insert(matchDays)
            .values({
              tournamentId,
              date: new Date(),
              label: "Playoffs Day 1",
              status: "draft",
            })
            .returning();
          playoffMatchDay = created;
        }
        const playoffStartTime = playoffMatchDay.date || new Date();

        // R1
        for (let i = 0; i < firstRoundMatchesCount; i++) {
          const matchName = getBracketMatchName(
            firstRoundMatchesCount,
            i,
            side,
          );
          await db.insert(matches).values({
            tournamentId,
            stageId: stage.id,
            bracketSide: side,
            roundIndex: 0,
            labelTeamA: placeholders[i * 2],
            labelTeamB: placeholders[i * 2 + 1],
            displayOrder: i + 1,
            startTime: playoffStartTime,
            matchDayId: playoffMatchDay.id,
            status: "scheduled",
            isBettingEnabled: false,
            name: matchName,
            label: matchName,
          });
        }

        // Subsequent Rounds
        let currentRoundMatches = firstRoundMatchesCount;
        let roundIdx = 1;
        while (currentRoundMatches > 1) {
          const nextRoundMatches = Math.floor(currentRoundMatches / 2);
          const prevRoundMatches = await db.query.matches.findMany({
            where: and(
              eq(matches.tournamentId, tournamentId),
              eq(matches.stageId, stage.id),
              eq(matches.roundIndex, roundIdx - 1),
              eq(matches.bracketSide, side),
            ),
            orderBy: [asc(matches.displayOrder)],
          });

          for (let i = 0; i < nextRoundMatches; i++) {
            const matchA = prevRoundMatches[i * 2];
            const matchB = prevRoundMatches[i * 2 + 1];
            if (matchA && matchB) {
              const matchName = getBracketMatchName(nextRoundMatches, i, side);
              await db.insert(matches).values({
                tournamentId,
                stageId: stage.id,
                bracketSide: side,
                roundIndex: roundIdx,
                labelTeamA: `Winner of ${matchA.name}`,
                labelTeamB: `Winner of ${matchB.name}`,
                teamAPreviousMatchId: matchA.id,
                teamBPreviousMatchId: matchB.id,
                teamAPreviousMatchResult: "winner",
                teamBPreviousMatchResult: "winner",
                displayOrder: i + 1,
                startTime: playoffStartTime,
                matchDayId: playoffMatchDay.id,
                status: "scheduled",
                isBettingEnabled: false,
                name: matchName,
                label: matchName,
              });
            }
          }
          currentRoundMatches = nextRoundMatches;
          roundIdx++;
        }

        if (stage.type === "Double Elimination") {
          const allUpperMatches = await db.query.matches.findMany({
            where: and(
              eq(matches.tournamentId, tournamentId),
              eq(matches.stageId, stage.id),
              eq(matches.bracketSide, "upper"),
            ),
            orderBy: [asc(matches.roundIndex), asc(matches.displayOrder)],
          });

          if (allUpperMatches.length < 2) return { success: true };

          const upperRoundsMap: Record<number, any[]> = {};
          allUpperMatches.forEach((m) => {
            const r = m.roundIndex ?? 0;
            if (!upperRoundsMap[r]) upperRoundsMap[r] = [];
            upperRoundsMap[r].push(m);
          });

          const maxUpperRound = Math.max(
            ...allUpperMatches.map((m) => m.roundIndex ?? 0),
          );
          const lr0MatchesCount = upperRoundsMap[0].length / 2;
          const lr0Matches = [];

          for (let i = 0; i < lr0MatchesCount; i++) {
            const matchA = upperRoundsMap[0][i * 2];
            const matchB = upperRoundsMap[0][i * 2 + 1];
            if (!matchA || !matchB) continue;
            const matchName = `LB Round 1 - Match #${i + 1}`;
            const [created] = await db
              .insert(matches)
              .values({
                tournamentId,
                stageId: stage.id,
                bracketSide: "lower",
                roundIndex: 0,
                labelTeamA: `Loser of ${matchA.name}`,
                labelTeamB: `Loser of ${matchB.name}`,
                teamAPreviousMatchId: matchA.id,
                teamBPreviousMatchId: matchB.id,
                teamAPreviousMatchResult: "loser",
                teamBPreviousMatchResult: "loser",
                displayOrder: i + 1,
                startTime: playoffStartTime,
                matchDayId: playoffMatchDay.id,
                status: "scheduled",
                isBettingEnabled: false,
                name: matchName,
                label: matchName,
              })
              .returning();
            lr0Matches.push(created);
          }

          let prevLBMatches = lr0Matches;
          let lrIdx = 1;
          let ubRoundToPull = 1;

          while (ubRoundToPull <= maxUpperRound && prevLBMatches.length > 0) {
            const ubMatchesToPull = upperRoundsMap[ubRoundToPull] || [];
            if (ubMatchesToPull.length === prevLBMatches.length) {
              const currentLBMatches = [];
              for (let i = 0; i < prevLBMatches.length; i++) {
                const lbMatch = prevLBMatches[i];
                const ubMatch = ubMatchesToPull[i];
                const matchName = `LB R${lrIdx + 1} - Match #${i + 1}`;
                const [created] = await db
                  .insert(matches)
                  .values({
                    tournamentId,
                    stageId: stage.id,
                    bracketSide: "lower",
                    roundIndex: lrIdx,
                    labelTeamA: `Winner of ${lbMatch.name}`,
                    labelTeamB: `Loser of ${ubMatch.name}`,
                    teamAPreviousMatchId: lbMatch.id,
                    teamBPreviousMatchId: ubMatch.id,
                    teamAPreviousMatchResult: "winner",
                    teamBPreviousMatchResult: "loser",
                    displayOrder: i + 1,
                    startTime: playoffStartTime,
                    matchDayId: playoffMatchDay.id,
                    status: "scheduled",
                    isBettingEnabled: false,
                    name: matchName,
                    label: matchName,
                  })
                  .returning();
                currentLBMatches.push(created);
              }
              prevLBMatches = currentLBMatches;
              lrIdx++;
            }

            if (prevLBMatches.length > 1) {
              const midLBMatches = [];
              for (let i = 0; i < prevLBMatches.length / 2; i++) {
                const matchA = prevLBMatches[i * 2];
                const matchB = prevLBMatches[i * 2 + 1];
                const matchName = `LB R${lrIdx + 1} - Match #${i + 1}`;
                const [created] = await db
                  .insert(matches)
                  .values({
                    tournamentId,
                    stageId: stage.id,
                    bracketSide: "lower",
                    roundIndex: lrIdx,
                    labelTeamA: `Winner of ${matchA.name}`,
                    labelTeamB: `Winner of ${matchB.name}`,
                    teamAPreviousMatchId: matchA.id,
                    teamBPreviousMatchId: matchB.id,
                    teamAPreviousMatchResult: "winner",
                    teamBPreviousMatchResult: "winner",
                    displayOrder: i + 1,
                    startTime: playoffStartTime,
                    matchDayId: playoffMatchDay.id,
                    status: "scheduled",
                    isBettingEnabled: false,
                    name: matchName,
                    label: matchName,
                  })
                  .returning();
                midLBMatches.push(created);
              }
              prevLBMatches = midLBMatches;
              lrIdx++;
            }
            ubRoundToPull++;
          }

          const ubFinal = (upperRoundsMap[maxUpperRound] || [])[0];
          const lbFinal = prevLBMatches[0];
          if (ubFinal && lbFinal) {
            await db.insert(matches).values({
              tournamentId,
              stageId: stage.id,
              bracketSide: "grand_final",
              roundIndex: 0,
              labelTeamA: `Winner of ${ubFinal.name}`,
              labelTeamB: `Winner of ${lbFinal.name}`,
              teamAPreviousMatchId: ubFinal.id,
              teamBPreviousMatchId: lbFinal.id,
              teamAPreviousMatchResult: "winner",
              teamBPreviousMatchResult: "winner",
              displayOrder: 1,
              startTime: playoffStartTime,
              matchDayId: playoffMatchDay.id,
              status: "scheduled",
              isBettingEnabled: false,
              name: "Grand Final",
              label: "Grand Final",
            });
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Error generating bracket:", error);
      throw error;
    }
  },
);
// Helper function to generate placeholder labels with proper seeding
function generatePlaceholderLabels(
  groupsCount: number,
  advancingPerGroup: number,
): string[] {
  const labels: string[] = [];
  const positions = ["1st", "2nd", "3rd", "4th"];

  // Standard tournament seeding: 1st seeds face 2nd seeds from different groups
  // For 4 groups with 2 advancing: [1A, 2D, 1B, 2C, 1C, 2B, 1D, 2A]
  if (advancingPerGroup === 2 && groupsCount === 4) {
    // Optimized seeding for 4 groups, 2 advancing
    const groups = ["A", "B", "C", "D"];
    labels.push(`1st Group ${groups[0]}`); // 1A
    labels.push(`2nd Group ${groups[3]}`); // 2D
    labels.push(`1st Group ${groups[1]}`); // 1B
    labels.push(`2nd Group ${groups[2]}`); // 2C
    labels.push(`1st Group ${groups[2]}`); // 1C
    labels.push(`2nd Group ${groups[1]}`); // 2B
    labels.push(`1st Group ${groups[3]}`); // 1D
    labels.push(`2nd Group ${groups[0]}`); // 2A
  } else {
    // Generic seeding for other configurations
    for (let pos = 0; pos < advancingPerGroup; pos++) {
      for (let group = 0; group < groupsCount; group++) {
        const groupChar = String.fromCharCode(65 + group); // A, B, C, D
        labels.push(`${positions[pos]} Group ${groupChar}`);
      }
    }
  }

  return labels;
}

export const generateFullBracket = generateFullBracketFn as unknown as (opts: {
  data: { tournamentId: number; stageId?: string };
}) => Promise<{ success: boolean }>;

/**
 * Busca de match days otimizada - Reduz dados transferidos
 */
const getMatchDaysFn = createServerFn({ method: "GET" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");
    const data = ctx.data as { tournamentId: number };

    if (!data?.tournamentId) {
      throw new Error("Tournament ID required");
    }

    // Query 1: Match days (sem joins complexos)
    const days = await db.query.matchDays.findMany({
      where: eq(matchDays.tournamentId, data.tournamentId),
      orderBy: [asc(matchDays.date)],
      columns: {
        id: true,
        tournamentId: true,
        date: true,
        label: true,
        status: true,
      },
    });

    if (days.length === 0) return [];

    // Query 2: Matches dos match days
    const dayIds = days.map((d) => d.id);
    const { matches, teams } = await import("@bsebet/db/schema");

    const allMatches = await db.query.matches.findMany({
      where: inArray(matches.matchDayId, dayIds),
      columns: {
        id: true,
        matchDayId: true,
        tournamentId: true,
        label: true,
        name: true,
        teamAId: true,
        teamBId: true,
        labelTeamA: true,
        labelTeamB: true,
        startTime: true,
        status: true,
        winnerId: true,
        scoreA: true,
        scoreB: true,
        isBettingEnabled: true,
        displayOrder: true,
        teamAPreviousMatchId: true,
        teamBPreviousMatchId: true,
        teamAPreviousMatchResult: true,
        teamBPreviousMatchResult: true,
      },
    });

    // Query 3: Teams necessários
    const teamIds = new Set<number>();
    allMatches.forEach((m) => {
      if (m.teamAId) teamIds.add(m.teamAId);
      if (m.teamBId) teamIds.add(m.teamBId);
    });

    const teamsData =
      teamIds.size > 0
        ? await db.query.teams.findMany({
            where: inArray(teams.id, Array.from(teamIds)),
            columns: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true, // URL do R2 - leve e cacheável
            },
          })
        : [];

    const teamsMap = new Map(teamsData.map((t) => [t.id, t]));
    const matchesByDay = new Map<number, typeof allMatches>();

    allMatches.forEach((m) => {
      const dayId = m.matchDayId;
      if (dayId === null) return;
      const list = matchesByDay.get(dayId) || [];
      const matchWithTeams = {
        ...m,
        teamA: m.teamAId ? teamsMap.get(m.teamAId) || null : null,
        teamB: m.teamBId ? teamsMap.get(m.teamBId) || null : null,
      };
      list.push(matchWithTeams as any);
      matchesByDay.set(dayId, list);
    });

    return days.map((day) => ({
      ...day,
      matches: matchesByDay.get(day.id) || [],
    }));
  },
);

export const getMatchDays = getMatchDaysFn as unknown as (opts: {
  data: { tournamentId: number };
}) => Promise<any[]>;
