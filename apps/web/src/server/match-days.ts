import { db } from "@bsebet/db";
import { matchDays, matches } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq, asc } from "drizzle-orm";
// import { z } from "zod"; // Unused if we just cast handling, but good for validation if we want strictness

// --- GET MATCH DAYS ---
const getMatchDaysFn = createServerFn({ method: "GET" }).handler(
  async (ctx) => {
    const data = ctx.data as unknown as { tournamentId: number };
    if (!data || typeof data.tournamentId !== "number") {
      throw new Error("Invalid Input");
    }

    return await db.query.matchDays.findMany({
      where: eq(matchDays.tournamentId, data.tournamentId),
      orderBy: [asc(matchDays.date)],
      with: {
        matches: {
          with: {
            teamA: true,
            teamB: true,
          },
        },
      },
    });
  },
);

export const getMatchDays = getMatchDaysFn as unknown as (opts: {
  data: { tournamentId: number };
}) => Promise<any[]>;

// --- CREATE MATCH DAY ---
const createMatchDayFn = createServerFn({ method: "POST" }).handler(
  async (ctx) => {
    const data = ctx.data as unknown as {
      tournamentId: number;
      label: string;
      date: string;
      status: "draft" | "open" | "locked" | "finished";
    };

    const result = await db
      .insert(matchDays)
      .values({
        tournamentId: data.tournamentId,
        label: data.label,
        date: new Date(data.date),
        status: data.status,
      })
      .returning();
    return result[0];
  },
);

export const createMatchDay = createMatchDayFn as unknown as (opts: {
  data: {
    tournamentId: number;
    label: string;
    date: string;
    status: "draft" | "open" | "locked" | "finished";
  };
}) => Promise<any>;

// --- UPDATE MATCH DAY STATUS ---
const updateMatchDayStatusFn = createServerFn({ method: "POST" }).handler(
  async (ctx) => {
    const data = ctx.data as unknown as {
      id: number;
      status: "draft" | "open" | "locked" | "finished";
    };

    const result = await db
      .update(matchDays)
      .set({ status: data.status })
      .where(eq(matchDays.id, data.id))
      .returning();
    return result[0];
  },
);

export const updateMatchDayStatus =
  updateMatchDayStatusFn as unknown as (opts: {
    data: {
      id: number;
      status: "draft" | "open" | "locked" | "finished";
    };
  }) => Promise<any>;

// --- DELETE MATCH DAY ---
const deleteMatchDayFn = createServerFn({ method: "POST" }).handler(
  async (ctx) => {
    const id = Number(ctx.data);
    if (!id) throw new Error("Invalid ID");

    // First setup matches that were in this day to have null matchDayId
    await db
      .update(matches)
      .set({ matchDayId: null })
      .where(eq(matches.matchDayId, id));

    await db.delete(matchDays).where(eq(matchDays.id, id));
    return { success: true };
  },
);

export const deleteMatchDay = deleteMatchDayFn as unknown as (opts: {
  data: number;
}) => Promise<{ success: boolean }>;

// --- TOGGLE MATCH DAY BETTING ---
const toggleMatchDayBettingFn = createServerFn({ method: "POST" }).handler(
  async (ctx) => {
    const { id, enabled } = ctx.data as unknown as {
      id: number;
      enabled: boolean;
    };

    await db
      .update(matches)
      .set({ isBettingEnabled: enabled })
      .where(eq(matches.matchDayId, id));

    return { success: true };
  },
);

export const toggleMatchDayBetting =
  toggleMatchDayBettingFn as unknown as (opts: {
    data: {
      id: number;
      enabled: boolean;
    };
  }) => Promise<{ success: boolean }>;
