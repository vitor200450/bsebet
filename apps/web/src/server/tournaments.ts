import { tournaments, matches, bets } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq, and, asc, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@bsebet/auth";
import {
  uploadLogoToR2,
  deleteLogoFromR2,
  base64ToBuffer,
  getTournamentLogoKey,
  isBase64DataUrl,
} from "./r2";

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
        scoringRules: z
          .object({
            winner: z.number(),
            exact: z.number(),
            underdog_25: z.number(),
          })
          .optional(),
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
      underdog_25: 2,
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

  let finalLogoUrl = validData.logoUrl || null;

  if (validData.id) {
    // Handling existing tournament
    if (finalLogoUrl && isBase64DataUrl(finalLogoUrl)) {
      // 1. Check for existing logo to delete
      const currentTournament = await db.query.tournaments.findFirst({
        where: eq(tournaments.id, validData.id),
        columns: { logoUrl: true },
      });

      if (currentTournament?.logoUrl) {
        try {
          // Format usually: .../tournaments/{id}/logo.{ext}
          const urlWithoutParams = currentTournament.logoUrl.split("?")[0];
          const urlParts = urlWithoutParams.split("/");
          const keyIndex = urlParts.indexOf("tournaments");
          if (keyIndex !== -1) {
            const oldKey = urlParts.slice(keyIndex).join("/");
            await deleteLogoFromR2(oldKey);
          }
        } catch (error) {
          console.error("Failed to delete old tournament logo:", error);
        }
      }

      // 2. Upload new logo
      const { buffer, contentType } = base64ToBuffer(finalLogoUrl);
      const extension = contentType.split("/")[1] || "png";
      const key = getTournamentLogoKey(validData.id, extension);
      const { publicUrl } = await uploadLogoToR2(key, buffer, contentType);
      // Append timestamp to force cache bypass
      finalLogoUrl = `${publicUrl}?t=${Date.now()}`;
    }

    const updated = await db
      .update(tournaments)
      .set({
        name: validData.name,
        slug: validData.slug,
        logoUrl: finalLogoUrl,
        format: validData.format || null,
        region: validData.region || null,
        participantsCount: validData.participantsCount || null,
        stages: validData.stages,
        startDate: validData.startDate || null,
        endDate: validData.endDate || null,
        status: validData.status,
        isActive: validData.isActive,
        scoringRules: validData.scoringRules,
      })
      .where(eq(tournaments.id, validData.id))
      .returning();
    return updated[0];
  } else {
    // Handling new tournament - need ID first
    const inserted = await db
      .insert(tournaments)
      .values({
        name: validData.name,
        slug: validData.slug,
        logoUrl: null, // Temp null
        format: validData.format || null,
        region: validData.region || null,
        participantsCount: validData.participantsCount || null,
        stages: validData.stages,
        startDate: validData.startDate || null,
        endDate: validData.endDate || null,
        status: validData.status,
        isActive: validData.isActive,
        scoringRules: validData.scoringRules,
      })
      .returning();

    const newTournament = inserted[0];

    if (finalLogoUrl && isBase64DataUrl(finalLogoUrl)) {
      const { buffer, contentType } = base64ToBuffer(finalLogoUrl);
      const extension = contentType.split("/")[1] || "png";
      const key = getTournamentLogoKey(newTournament.id, extension);
      const { publicUrl } = await uploadLogoToR2(key, buffer, contentType);

      // Update with the R2 URL
      const finalUpdate = await db
        .update(tournaments)
        .set({ logoUrl: `${publicUrl}?t=${Date.now()}` })
        .where(eq(tournaments.id, newTournament.id))
        .returning();
      return finalUpdate[0];
    }

    // If it was already a URL or empty, update if needed or return
    if (finalLogoUrl) {
      const finalUpdate = await db
        .update(tournaments)
        .set({ logoUrl: finalLogoUrl })
        .where(eq(tournaments.id, newTournament.id))
        .returning();
      return finalUpdate[0];
    }

    return newTournament;
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
  const { tournaments } = await import("@bsebet/db/schema");
  const { eq } = await import("drizzle-orm");

  const data = ctx.data;

  // Ensure data is the ID directly
  const id = typeof data === "object" && data.data ? data.data : data;

  if (!id || typeof id !== "number") {
    console.error("Invalid ID for deletion:", id);
    throw new Error("Invalid ID");
  }

  try {
    const { matches, bets, matchDays, tournamentTeams } = await import("@bsebet/db/schema");
    const { inArray } = await import("drizzle-orm");

    // 1. Find all matches to get their IDs for bet deletion
    const tournamentMatches = await db
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.tournamentId, id));

    const matchIds = tournamentMatches.map((m) => m.id);

    // 2. Delete bets (FK → matches.id)
    if (matchIds.length > 0) {
      await db.delete(bets).where(inArray(bets.matchId, matchIds));
    }

    // 3. Delete matches (FK → tournaments.id)
    await db.delete(matches).where(eq(matches.tournamentId, id));

    // 4. Delete match days (FK → tournaments.id)
    await db.delete(matchDays).where(eq(matchDays.tournamentId, id));

    // 5. Delete tournament teams (FK → tournaments.id)
    await db.delete(tournamentTeams).where(eq(tournamentTeams.tournamentId, id));

    // 6. Delete the tournament
    await db.delete(tournaments).where(eq(tournaments.id, id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting tournament:", error);
    throw new Error("Failed to delete tournament in DB");
  }
});

export const deleteTournament = deleteTournamentFn as unknown as (opts: {
  data: number;
}) => Promise<{ success: boolean }>;

/**
 * Get Tournament by Slug with Matches and User Bets
 */
const getTournamentBySlugFn = createServerFn({
  method: "GET",
}).handler(async (ctx: any) => {
  const { db } = await import("@bsebet/db");

  const slug = z.string().parse(ctx.data);

  // 1. Get Tournament
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.slug, slug),
  });

  if (!tournament) {
    throw new Error("Tournament not found");
  }

  // 2. Get Matches
  const tournamentMatches = await db.query.matches.findMany({
    where: eq(matches.tournamentId, tournament.id),
    orderBy: [asc(matches.startTime), asc(matches.displayOrder)],
    with: {
      teamA: true,
      teamB: true,
    },
  });

  // 3. Get User Bets (if authenticated)
  let userBets: any[] = [];
  const session = await auth.api.getSession({
    headers: ctx.request.headers,
  });

  if (session?.user) {
    const matchIds = tournamentMatches.map((m) => m.id);
    if (matchIds.length > 0) {
      userBets = await db.query.bets.findMany({
        where: and(
          eq(bets.userId, session.user.id),
          inArray(bets.matchId, matchIds),
        ),
      });
    }
  }

  return {
    tournament,
    matches: tournamentMatches,
    userBets,
  };
});

export const getTournamentBySlug = getTournamentBySlugFn as unknown as (opts: {
  data: string;
}) => Promise<{
  tournament: typeof tournaments.$inferSelect;
  matches: (typeof matches.$inferSelect & { teamA: any; teamB: any })[];
  userBets: (typeof bets.$inferSelect)[];
}>;

/**
 * Copy a tournament and its participants
 */
const copyTournamentFn = createServerFn({
  method: "POST",
}).handler(async (ctx: any) => {
  const { db } = await import("@bsebet/db");
  const { tournaments } = await import("@bsebet/db/schema");
  const { eq } = await import("drizzle-orm");

  const tournamentId = Number(ctx.data);

  if (!tournamentId) {
    throw new Error("Invalid Tournament ID");
  }

  // 1. Get Original Tournament
  const original = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });

  if (!original) {
    throw new Error("Tournament not found");
  }

  // 2. Create New Tournament Data
  const timestamp = Date.now();
  const newName = `${original.name} (Copy)`;
  const newSlug = `${original.slug}-copy-${timestamp}`; // Ensure uniqueness

  const inserted = await db
    .insert(tournaments)
    .values({
      name: newName,
      slug: newSlug,
      logoUrl: null, // Reset logo
      format: original.format,
      region: original.region,
      participantsCount: original.participantsCount,
      stages: original.stages, // Copy stages config
      status: "upcoming", // Reset status
      isActive: false, // Start inactive
      scoringRules: original.scoringRules, // Copy scoring rules
      startDate: null, // Reset dates
      endDate: null,
    })
    .returning();

  const newTournament = inserted[0];

  // 3. Skip Copying Participants (User requested clean state)
  // Logic removed here to keep new tournament empty of teams

  return newTournament;
});

export const copyTournament = copyTournamentFn as unknown as (opts: {
  data: number;
}) => Promise<typeof tournaments.$inferSelect>;
