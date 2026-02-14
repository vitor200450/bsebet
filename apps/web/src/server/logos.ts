import { teams, tournaments } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  uploadLogoToR2,
  deleteLogoFromR2,
  base64ToBuffer,
  getTeamLogoKey,
  getTournamentLogoKey,
  isBase64DataUrl,
} from "./r2";

/**
 * Endpoint para upload de logo de time
 * Aceita Base64 ou URL, converte para R2 se for Base64
 */
const uploadTeamLogoFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const data = z
      .object({
        teamId: z.number(),
        logoUrl: z.string(), // Pode ser Base64 ou URL
      })
      .parse(ctx.data);

    const { db } = await import("@bsebet/db");

    // Se for Base64, faz upload para R2
    if (isBase64DataUrl(data.logoUrl)) {
      const { buffer, contentType } = base64ToBuffer(data.logoUrl);
      const extension = contentType.split("/")[1] || "png";
      const key = getTeamLogoKey(data.teamId, extension);

      const { publicUrl } = await uploadLogoToR2(key, buffer, contentType);

      // Atualiza banco com URL do R2
      await db
        .update(teams)
        .set({ logoUrl: publicUrl })
        .where(eq(teams.id, data.teamId));

      return { logoUrl: publicUrl };
    }

    // Se já for URL, apenas salva no banco
    await db
      .update(teams)
      .set({ logoUrl: data.logoUrl })
      .where(eq(teams.id, data.teamId));

    return { logoUrl: data.logoUrl };
  }
);

export const uploadTeamLogo = uploadTeamLogoFn as unknown as (opts: {
  data: { teamId: number; logoUrl: string };
}) => Promise<{ logoUrl: string }>;

/**
 * Endpoint para upload de logo de torneio
 */
const uploadTournamentLogoFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const data = z
      .object({
        tournamentId: z.number(),
        logoUrl: z.string(),
      })
      .parse(ctx.data);

    const { db } = await import("@bsebet/db");

    if (isBase64DataUrl(data.logoUrl)) {
      const { buffer, contentType } = base64ToBuffer(data.logoUrl);
      const extension = contentType.split("/")[1] || "png";
      const key = getTournamentLogoKey(data.tournamentId, extension);

      const { publicUrl } = await uploadLogoToR2(key, buffer, contentType);

      await db
        .update(tournaments)
        .set({ logoUrl: publicUrl })
        .where(eq(tournaments.id, data.tournamentId));

      return { logoUrl: publicUrl };
    }

    await db
      .update(tournaments)
      .set({ logoUrl: data.logoUrl })
      .where(eq(tournaments.id, data.tournamentId));

    return { logoUrl: data.logoUrl };
  }
);

export const uploadTournamentLogo = uploadTournamentLogoFn as unknown as (opts: {
  data: { tournamentId: number; logoUrl: string };
}) => Promise<{ logoUrl: string }>;

/**
 * Busca logos de múltiplos times (para uso interno)
 */
const getTeamLogosFn = createServerFn({ method: "GET" }).handler(
  async (ctx: any) => {
    const data = z.object({ teamIds: z.array(z.number()) }).parse(ctx.data);

    if (data.teamIds.length === 0) {
      return {};
    }

    const { db } = await import("@bsebet/db");

    const teamsData = await db.query.teams.findMany({
      where: inArray(teams.id, data.teamIds),
      columns: {
        id: true,
        logoUrl: true,
      },
    });

    const result: Record<number, string | null> = {};
    for (const team of teamsData) {
      result[team.id] = team.logoUrl;
    }

    return result;
  }
);

export const getTeamLogos = getTeamLogosFn as unknown as (opts: {
  data: { teamIds: number[] };
}) => Promise<Record<number, string | null>>;

/**
 * Busca logo de um único time
 */
const getTeamLogoFn = createServerFn({ method: "GET" }).handler(
  async (ctx: any) => {
    const data = z.object({ teamId: z.number() }).parse(ctx.data);

    const { db } = await import("@bsebet/db");

    const team = await db.query.teams.findFirst({
      where: eq(teams.id, data.teamId),
      columns: {
        logoUrl: true,
      },
    });

    return { logoUrl: team?.logoUrl || null };
  }
);

export const getTeamLogo = getTeamLogoFn as unknown as (opts: {
  data: { teamId: number };
}) => Promise<{ logoUrl: string | null }>;

/**
 * Busca logo de torneio
 */
const getTournamentLogoFn = createServerFn({ method: "GET" }).handler(
  async (ctx: any) => {
    const data = z.object({ tournamentId: z.number() }).parse(ctx.data);

    const { db } = await import("@bsebet/db");

    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
      columns: {
        logoUrl: true,
      },
    });

    return { logoUrl: tournament?.logoUrl || null };
  }
);

export const getTournamentLogo = getTournamentLogoFn as unknown as (opts: {
  data: { tournamentId: number };
}) => Promise<{ logoUrl: string | null }>;

/**
 * Deleta logo de time do R2 e do banco
 */
const deleteTeamLogoFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const data = z.object({ teamId: z.number() }).parse(ctx.data);

    const { db } = await import("@bsebet/db");

    // Busca logo atual
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, data.teamId),
      columns: { logoUrl: true },
    });

    if (team?.logoUrl && team.logoUrl.includes("r2.cloudflarestorage.com")) {
      // Extrai a chave da URL
      const key = team.logoUrl.split("/").slice(-2).join("/");
      await deleteLogoFromR2(key);
    }

    // Limpa no banco
    await db
      .update(teams)
      .set({ logoUrl: null })
      .where(eq(teams.id, data.teamId));

    return { success: true };
  }
);

export const deleteTeamLogo = deleteTeamLogoFn as unknown as (opts: {
  data: { teamId: number };
}) => Promise<{ success: boolean }>;
