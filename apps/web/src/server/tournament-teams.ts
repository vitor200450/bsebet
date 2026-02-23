import { teams, tournamentTeams } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const getTournamentTeamsFn = createServerFn({ method: "GET" }).handler(
	async (ctx: any) => {
		const { db } = await import("@bsebet/db");
		const tournamentId = Number(ctx.data);
		const results = await db
			.select({
				id: teams.id,
				name: teams.name,
				logoUrl: teams.logoUrl,
				region: teams.region,
				group: tournamentTeams.group,
				seed: tournamentTeams.seed,
			})
			.from(tournamentTeams)
			.innerJoin(teams, eq(tournamentTeams.teamId, teams.id))
			.where(eq(tournamentTeams.tournamentId, tournamentId));

		return results;
	},
);

export const getTournamentTeams = getTournamentTeamsFn as unknown as (opts: {
	data: number;
}) => Promise<
	{
		id: number;
		name: string;
		logoUrl: string | null;
		region: string | null;
		group: string | null;
		seed: number | null;
	}[]
>;

const addTeamToTournamentFn = createServerFn({ method: "POST" }).handler(
	async (ctx: any) => {
		const { db } = await import("@bsebet/db");
		const data = z
			.object({
				tournamentId: z.number(),
				teamId: z.number(),
			})
			.parse(ctx.data);

		await db
			.insert(tournamentTeams)
			.values({
				tournamentId: data.tournamentId,
				teamId: data.teamId,
			})
			.onConflictDoNothing();
	},
);

export const addTeamToTournament = addTeamToTournamentFn as unknown as (opts: {
	data: { tournamentId: number; teamId: number };
}) => Promise<void>;

const removeTeamFromTournamentFn = createServerFn({
	method: "POST",
}).handler(async (ctx: any) => {
	const { db } = await import("@bsebet/db");
	const data = z
		.object({
			tournamentId: z.number(),
			teamId: z.number(),
		})
		.parse(ctx.data);

	await db
		.delete(tournamentTeams)
		.where(
			and(
				eq(tournamentTeams.tournamentId, data.tournamentId),
				eq(tournamentTeams.teamId, data.teamId),
			),
		);
});

export const removeTeamFromTournament =
	removeTeamFromTournamentFn as unknown as (opts: {
		data: { tournamentId: number; teamId: number };
	}) => Promise<void>;

const updateTeamSeedingFn = createServerFn({ method: "POST" }).handler(
	async (ctx: any) => {
		const { db } = await import("@bsebet/db");
		const data = z
			.object({
				tournamentId: z.number(),
				teamId: z.number(),
				group: z.string().optional().nullable(),
				seed: z.number().optional().nullable(),
			})
			.parse(ctx.data);

		await db
			.update(tournamentTeams)
			.set({
				group: data.group,
				seed: data.seed,
			})
			.where(
				and(
					eq(tournamentTeams.tournamentId, data.tournamentId),
					eq(tournamentTeams.teamId, data.teamId),
				),
			);
	},
);

export const updateTeamSeeding = updateTeamSeedingFn as unknown as (opts: {
	data: {
		tournamentId: number;
		teamId: number;
		group?: string | null;
		seed?: number | null;
	};
}) => Promise<void>;
