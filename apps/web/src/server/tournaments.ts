import { tournaments } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

// Schema for Tournament Input
const tournamentSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  slug: z.string().min(1, "Slug é obrigatório"),
  logoUrl: z
    .string()
    .refine(
      (val) =>
        val === "" ||
        val === null ||
        val === undefined ||
        z.string().url().safeParse(val).success ||
        val.startsWith("data:image/"),
      "Deve ser uma URL válida ou imagem Base64",
    )
    .optional(),
  format: z.string().optional(),
  region: z.string().optional(),
  participantsCount: z.coerce.number().optional(),
  stages: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(["Single Elimination", "Double Elimination", "Groups"]),
        settings: z.object({
          groupsCount: z.number().optional(),
          teamsPerGroup: z.number().optional(),
          advancingCount: z.number().optional(),
          matchType: z.enum(["Bo1", "Bo3", "Bo5"]).optional(),
        }),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .default([]),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(["upcoming", "active", "finished"]).default("upcoming"),
  isActive: z.boolean().default(true),
  // Default scoring rules if creating new
  scoringRules: z
    .object({
      winner: z.number(),
      exact: z.number(),
      underdog_25: z.number(),
    })
    .default({
      winner: 1,
      exact: 3,
      underdog_25: 0.25,
    }),
});

type TournamentInput = z.input<typeof tournamentSchema>;

/**
 * Fetch all tournaments ordered by created_at desc
 */
export const getTournaments = createServerFn({
  method: "GET",
}).handler(async () => {
  const { db } = await import("@bsebet/db");
  const allTournaments = await db
    .select()
    .from(tournaments)
    .orderBy(desc(tournaments.createdAt));
  return allTournaments;
});

const getTournamentFn = createServerFn({
  method: "GET",
}).handler(async (ctx: any) => {
  const { db } = await import("@bsebet/db");
  const id = Number(ctx.data);
  const result = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, id))
    .limit(1);
  return result[0];
});

export const getTournament = getTournamentFn as unknown as (opts: {
  data: number;
}) => Promise<typeof tournaments.$inferSelect>;

/**
 * Save (Create or Update) a tournament
 */
const saveTournamentFn = createServerFn({
  method: "POST",
}).handler(async (ctx: any) => {
  const { db } = await import("@bsebet/db");
  const data = ctx.data;
  const validData = tournamentSchema.parse(data);

  if (validData.id) {
    const updated = await db
      .update(tournaments)
      .set({
        name: validData.name,
        slug: validData.slug,
        logoUrl: validData.logoUrl || null,
        format: validData.format || null,
        region: validData.region || null,
        participantsCount: validData.participantsCount || null,
        stages: validData.stages,
        startDate: validData.startDate || null,
        endDate: validData.endDate || null,
        status: validData.status,
        isActive: validData.isActive,
      })
      .where(eq(tournaments.id, validData.id))
      .returning();
    return updated[0];
  } else {
    const inserted = await db
      .insert(tournaments)
      .values({
        name: validData.name,
        slug: validData.slug,
        logoUrl: validData.logoUrl || null,
        format: validData.format || null,
        region: validData.region || null,
        participantsCount: validData.participantsCount || null,
        stages: validData.stages,
        startDate: validData.startDate || null,
        endDate: validData.endDate || null,
        status: validData.status,
        isActive: validData.isActive,
        scoringRules: validData.scoringRules, // Add defaults
      })
      .returning();
    return inserted[0];
  }
});

export const saveTournament = saveTournamentFn as unknown as (opts: {
  data: TournamentInput;
}) => Promise<typeof tournaments.$inferSelect>;

/**
 * Delete a tournament
 */
const deleteTournamentFn = createServerFn({
  method: "POST",
}).handler(async (ctx: any) => {
  const { db } = await import("@bsebet/db");
  const data = ctx.data;
  if (typeof data !== "number") throw new Error("Invalid ID");
  await db.delete(tournaments).where(eq(tournaments.id, data));
  return { success: true };
});

export const deleteTournament = deleteTournamentFn as unknown as (opts: {
  data: number;
}) => Promise<{ success: boolean }>;
