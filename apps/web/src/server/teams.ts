import {
	bets,
	matches,
	pointAdjustments,
	teams,
	tournamentTeams,
	tournaments,
} from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import {
	base64ToBuffer,
	deleteLogoFromR2,
	getTeamLogoKey,
	isBase64DataUrl,
	uploadLogoToR2,
} from "./r2";

// Schema for Team Input
const teamSchema = z.object({
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
	region: z.string().optional(),
});

type TeamInput = z.infer<typeof teamSchema>;

/**
 * Fetch all teams ordered by created_at desc
 */
export const getTeams = createServerFn({
	method: "GET",
}).handler(async () => {
	// Dynamic import to prevent client-side evaluation of DB connection
	const { db } = await import("@bsebet/db");
	const allTeams = await db.select().from(teams).orderBy(desc(teams.createdAt));
	return allTeams;
});

/**
 * Save (Create or Update) a team
 */
const saveTeamFn = createServerFn({
	method: "POST",
}).handler(async (ctx: any) => {
	const { db } = await import("@bsebet/db");
	const data = ctx.data;
	const validData = teamSchema.parse(data);

	let finalLogoUrl = validData.logoUrl || null;

	if (validData.id) {
		// Handling existing team
		if (finalLogoUrl && isBase64DataUrl(finalLogoUrl)) {
			// 1. Check for existing logo to delete to avoid duplicates
			const currentTeam = await db.query.teams.findFirst({
				where: eq(teams.id, validData.id),
				columns: { logoUrl: true },
			});

			if (currentTeam?.logoUrl) {
				try {
					// Attempt to extract key from URL
					// Remove query params first if any (e.g. ?t=...)
					const urlWithoutParams = currentTeam.logoUrl.split("?")[0];
					const urlParts = urlWithoutParams.split("/");
					const keyIndex = urlParts.indexOf("teams");
					if (keyIndex !== -1) {
						const oldKey = urlParts.slice(keyIndex).join("/");
						await deleteLogoFromR2(oldKey);
					}
				} catch (error) {
					console.error("Failed to delete old logo:", error);
					// Continue with upload even if delete fails
				}
			}

			// 2. Upload new logo
			const { buffer, contentType } = base64ToBuffer(finalLogoUrl);
			const extension = contentType.split("/")[1] || "png";
			const key = getTeamLogoKey(validData.id, extension);
			const { publicUrl } = await uploadLogoToR2(key, buffer, contentType);
			// Append timestamp to force cache bypass on client
			finalLogoUrl = `${publicUrl}?t=${Date.now()}`;
		}

		const updated = await db
			.update(teams)
			.set({
				name: validData.name,
				slug: validData.slug,
				logoUrl: finalLogoUrl,
				region: validData.region || null,
			})
			.where(eq(teams.id, validData.id))
			.returning();
		return updated[0];
	}
	// Handling new team - need ID first if we want to use it for the R2 key
	const inserted = await db
		.insert(teams)
		.values({
			name: validData.name,
			slug: validData.slug,
			logoUrl: null, // Temp null
			region: validData.region || null,
		})
		.returning();

	const newTeam = inserted[0];

	if (finalLogoUrl && isBase64DataUrl(finalLogoUrl)) {
		const { buffer, contentType } = base64ToBuffer(finalLogoUrl);
		const extension = contentType.split("/")[1] || "png";
		const key = getTeamLogoKey(newTeam.id, extension);
		const { publicUrl } = await uploadLogoToR2(key, buffer, contentType);

		// Update with the R2 URL
		const finalUpdate = await db
			.update(teams)
			.set({ logoUrl: `${publicUrl}?t=${Date.now()}` })
			.where(eq(teams.id, newTeam.id))
			.returning();
		return finalUpdate[0];
	}

	// If it was already a URL or empty, just update if needed or return
	if (finalLogoUrl) {
		const finalUpdate = await db
			.update(teams)
			.set({ logoUrl: finalLogoUrl })
			.where(eq(teams.id, newTeam.id))
			.returning();
		return finalUpdate[0];
	}

	return newTeam;
});

export const saveTeam = saveTeamFn as unknown as (opts: {
	data: TeamInput;
}) => Promise<typeof teams.$inferSelect>;

/**
 * Delete a team
 */
const deleteTeamFn = createServerFn({
	method: "POST",
}).handler(async (ctx: any) => {
	const { db } = await import("@bsebet/db");
	const data = ctx.data;

	// Ensure data is the ID directly
	const id = typeof data === "object" && data?.data ? data.data : data;

	if (!id || typeof id !== "number") {
		console.error("Invalid ID for team deletion:", id);
		throw new Error("Invalid ID");
	}

	try {
		await db.transaction(async (tx) => {
			// 1) Prevent deletion if team is still linked to tournament participants
			const linkedTournamentEntries = await tx
				.select({
					tournamentId: tournamentTeams.tournamentId,
					tournamentName: tournaments.name,
				})
				.from(tournamentTeams)
				.innerJoin(
					tournaments,
					eq(tournamentTeams.tournamentId, tournaments.id),
				)
				.where(eq(tournamentTeams.teamId, id));

			if (linkedTournamentEntries.length > 0) {
				const tournamentNames = [
					...new Set(linkedTournamentEntries.map((entry) => entry.tournamentName)),
				];

				throw new Error(
					`Não é possível excluir este time porque ele está vinculado aos torneios: ${tournamentNames.join(", ")}.`,
				);
			}

			// 2) Find matches where this team appears in any role
			const relatedMatches = await tx
				.select({ id: matches.id })
				.from(matches)
				.where(
					or(
						eq(matches.teamAId, id),
						eq(matches.teamBId, id),
						eq(matches.winnerId, id),
						eq(matches.underdogTeamId, id),
					),
				);

			const matchIds = relatedMatches.map((m) => m.id);

			// 3) Remove dependencies that can block match updates
			if (matchIds.length > 0) {
				await tx
					.delete(pointAdjustments)
					.where(inArray(pointAdjustments.matchId, matchIds));

				await tx.delete(bets).where(inArray(bets.matchId, matchIds));
			}

			// 4) Nullify team references in matches before deleting the team
			await tx
				.update(matches)
				.set({
					teamAId: null,
					teamBId: null,
					winnerId: null,
					underdogTeamId: null,
				})
				.where(
					or(
						eq(matches.teamAId, id),
						eq(matches.teamBId, id),
						eq(matches.winnerId, id),
						eq(matches.underdogTeamId, id),
					),
				);

			// 5) Delete the team
			await tx.delete(teams).where(eq(teams.id, id));
		});

		return { success: true };
	} catch (error) {
		console.error("Error deleting team:", error);
		throw error instanceof Error
			? error
			: new Error("Failed to delete team in DB");
	}
});

export const deleteTeam = deleteTeamFn as unknown as (opts: {
	data: number;
}) => Promise<{ success: boolean }>;

/**
 * Get Team by ID with match history and tournaments
 */
const getTeamByIdFn = createServerFn({
	method: "GET",
}).handler(async (ctx: any) => {
	const { db } = await import("@bsebet/db");

	const teamId = z.number().parse(ctx.data);

	// 1. Get Team
	const team = await db.query.teams.findFirst({
		where: eq(teams.id, teamId),
	});

	if (!team) {
		throw new Error("Time não encontrado");
	}

	// 2. Get all matches where team participated
	const teamMatches = await db.query.matches.findMany({
		where: or(eq(matches.teamAId, teamId), eq(matches.teamBId, teamId)),
		orderBy: [desc(matches.startTime)],
		with: {
			teamA: true,
			teamB: true,
			tournament: true,
			winner: true,
		},
	});

	// 3. Get tournaments this team participated in
	const teamTournaments = await db.query.tournamentTeams.findMany({
		where: eq(tournamentTeams.teamId, teamId),
		with: {
			tournament: true,
		},
	});

	return {
		team,
		matches: teamMatches,
		tournaments: teamTournaments.map((tt) => tt.tournament),
	};
});

export const getTeamById = getTeamByIdFn as unknown as (opts: {
	data: number;
}) => Promise<{
	team: typeof teams.$inferSelect;
	matches: (typeof matches.$inferSelect & {
		teamA: any;
		teamB: any;
		tournament: any;
		winner: any;
	})[];
	tournaments: any[];
}>;

/**
 * Get Team by Slug with match history and tournaments
 */
const getTeamBySlugFn = createServerFn({
	method: "GET",
}).handler(async (ctx: any) => {
	const { db } = await import("@bsebet/db");

	const teamSlug = z.string().parse(ctx.data);

	// 1. Get Team by slug
	const team = await db.query.teams.findFirst({
		where: eq(teams.slug, teamSlug),
	});

	if (!team) {
		throw new Error("Time não encontrado");
	}

	// 2. Get all matches where team participated
	const teamMatches = await db.query.matches.findMany({
		where: or(eq(matches.teamAId, team.id), eq(matches.teamBId, team.id)),
		orderBy: [desc(matches.startTime)],
		with: {
			teamA: true,
			teamB: true,
			tournament: true,
			winner: true,
		},
	});

	// 3. Get tournaments this team participated in
	const teamTournaments = await db.query.tournamentTeams.findMany({
		where: eq(tournamentTeams.teamId, team.id),
		with: {
			tournament: true,
		},
	});

	return {
		team,
		matches: teamMatches,
		tournaments: teamTournaments.map((tt) => tt.tournament),
	};
});

export const getTeamBySlug = getTeamBySlugFn as unknown as (opts: {
	data: string;
}) => Promise<{
	team: typeof teams.$inferSelect;
	matches: (typeof matches.$inferSelect & {
		teamA: any;
		teamB: any;
		tournament: any;
		winner: any;
	})[];
	tournaments: any[];
}>;
