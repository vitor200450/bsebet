import { auth } from "@bsebet/auth";
import {
	bets,
	matches,
	pointAdjustments,
	tournaments,
	user,
} from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

// Schema for creating a point adjustment
const adjustPointsSchema = z.object({
	userId: z.string(),
	tournamentId: z.number(),
	matchId: z.number().optional(),
	points: z.number().min(-100).max(100),
	reason: z
		.string()
		.min(10, "A justificativa deve ter pelo menos 10 caracteres"),
	isRecoveryCompensation: z.boolean().default(false),
});

type AdjustPointsInput = z.infer<typeof adjustPointsSchema>;

/**
 * Create a point adjustment for a user.
 * Only admins can create adjustments.
 * Records the adjustment in point_adjustments table and adds to bets.pointsEarned.
 */
const adjustUserPointsFn = createServerFn({ method: "POST" }).handler(
	async (ctx: any) => {
		const { db } = await import("@bsebet/db");

		// 1. Check authentication and admin role
		const session = await auth.api.getSession({
			headers: ctx.request.headers,
		});

		if (!session?.user?.id) {
			throw new Error("Não autenticado");
		}

		if (session.user.role !== "admin") {
			throw new Error("Apenas administradores podem ajustar pontos");
		}

		// 2. Parse and validate input
		const data = adjustPointsSchema.parse(ctx.data);

		// 3. Verify user exists
		const targetUser = await db.query.user.findFirst({
			where: eq(user.id, data.userId),
			columns: { id: true, name: true },
		});

		if (!targetUser) {
			throw new Error("Usuário não encontrado");
		}

		// 4. Verify tournament exists
		const tournament = await db.query.tournaments.findFirst({
			where: eq(tournaments.id, data.tournamentId),
			columns: { id: true, name: true },
		});

		if (!tournament) {
			throw new Error("Torneio não encontrado");
		}

		// 5. Verify match exists (if provided)
		if (data.matchId) {
			const match = await db.query.matches.findFirst({
				where: eq(matches.id, data.matchId),
				columns: { id: true },
			});

			if (!match) {
				throw new Error("Partida não encontrada");
			}
		}

		// 6. Create the point adjustment record
		const [adjustment] = await db
			.insert(pointAdjustments)
			.values({
				userId: data.userId,
				tournamentId: data.tournamentId,
				matchId: data.matchId || null,
				points: data.points,
				reason: data.reason,
				adminId: session.user.id,
				isRecoveryCompensation: data.isRecoveryCompensation,
			})
			.returning();

		// 7. Find or create a bet record to add points to
		// We'll create a "system" bet if no bet exists for this match
		// Or update existing bet's pointsEarned
		let updatedBet;

		if (data.matchId) {
			// Try to find existing bet for this match
			const existingBet = await db.query.bets.findFirst({
				where: and(
					eq(bets.userId, data.userId),
					eq(bets.matchId, data.matchId),
				),
			});

			if (existingBet) {
				// Update existing bet
				const [bet] = await db
					.update(bets)
					.set({
						pointsEarned: (existingBet.pointsEarned || 0) + data.points,
					})
					.where(eq(bets.id, existingBet.id))
					.returning();
				updatedBet = bet;
			} else {
				// Create a "system" bet record for this adjustment
				// This ensures the points show up in the leaderboard
				const [bet] = await db
					.insert(bets)
					.values({
						userId: data.userId,
						matchId: data.matchId,
						predictedScoreA: 0,
						predictedScoreB: 0,
						pointsEarned: data.points,
						isRecovery: data.isRecoveryCompensation,
					})
					.returning();
				updatedBet = bet;
			}
		}

		return {
			success: true,
			adjustment: {
				...adjustment,
				adminName: session.user.name || session.user.email,
			},
			bet: updatedBet,
			userName: targetUser.name,
			tournamentName: tournament.name,
		};
	},
);

export const adjustUserPoints = adjustUserPointsFn as unknown as (opts: {
	data: AdjustPointsInput;
}) => Promise<{
	success: boolean;
	adjustment: typeof pointAdjustments.$inferSelect & { adminName: string };
	bet?: typeof bets.$inferSelect;
	userName: string;
	tournamentName: string;
}>;

/**
 * Get point adjustments with optional filters
 */
const getPointAdjustmentsSchema = z.object({
	tournamentId: z.number().optional(),
	userId: z.string().optional(),
	limit: z.number().default(50),
	offset: z.number().default(0),
});

// Prepared statement for listing adjustments - created once and reused
const listAdjustmentsStmt: ReturnType<
	typeof db.query.pointAdjustments.findMany
> | null = null;

const getPointAdjustmentsFn = createServerFn({ method: "GET" }).handler(
	async (ctx: any) => {
		const { db } = await import("@bsebet/db");
		const { inArray } = await import("drizzle-orm");

		// Check admin authentication
		const session = await auth.api.getSession({
			headers: ctx.request.headers,
		});

		if (!session?.user?.id || session.user.role !== "admin") {
			throw new Error("Apenas administradores podem ver ajustes de pontos");
		}

		const params = getPointAdjustmentsSchema.parse(ctx.data);

		// Validate limit and offset for security
		const limit = Math.min(Math.max(params.limit, 1), 100);
		const offset = Math.max(params.offset, 0);

		try {
			// Build where conditions efficiently
			const conditions = [];
			if (params.tournamentId) {
				conditions.push(eq(pointAdjustments.tournamentId, params.tournamentId));
			}
			if (params.userId) {
				conditions.push(eq(pointAdjustments.userId, params.userId));
			}

			// Execute main query with prepared statement pattern
			const adjustments = await db.query.pointAdjustments.findMany({
				where: conditions.length > 0 ? and(...conditions) : undefined,
				orderBy: [desc(pointAdjustments.createdAt)],
				limit,
				offset,
			});

			if (adjustments.length === 0) {
				return [];
			}

			// Batch fetch related data in parallel for better performance
			const userIds = [...new Set(adjustments.map((a) => a.userId))];
			const adminIds = [...new Set(adjustments.map((a) => a.adminId))];
			const tournamentIds = [
				...new Set(adjustments.map((a) => a.tournamentId)),
			];
			const matchIds = [
				...new Set(adjustments.map((a) => a.matchId).filter(Boolean)),
			] as number[];

			const [users, admins, tournamentsData, matchesData] = await Promise.all([
				userIds.length > 0
					? db.query.user.findMany({
							where: (u) => inArray(u.id, userIds),
							columns: { id: true, name: true, nickname: true, image: true },
						})
					: Promise.resolve([]),
				adminIds.length > 0
					? db.query.user.findMany({
							where: (u) => inArray(u.id, adminIds),
							columns: { id: true, name: true },
						})
					: Promise.resolve([]),
				tournamentIds.length > 0
					? db.query.tournaments.findMany({
							where: (t) => inArray(t.id, tournamentIds),
							columns: { id: true, name: true },
						})
					: Promise.resolve([]),
				matchIds.length > 0
					? db.query.matches.findMany({
							where: (m) => inArray(m.id, matchIds),
							columns: { id: true, name: true },
						})
					: Promise.resolve([]),
			]);

			// Create lookup maps for O(1) access
			const userMap = new Map(users.map((u) => [u.id, u]));
			const adminMap = new Map(admins.map((a) => [a.id, a]));
			const tournamentMap = new Map(tournamentsData.map((t) => [t.id, t]));
			const matchMap = new Map(matchesData.map((m) => [m.id, m]));

			return adjustments.map((adj) => {
				const user = userMap.get(adj.userId);
				const admin = adminMap.get(adj.adminId);
				const tournament = tournamentMap.get(adj.tournamentId);
				const match = adj.matchId ? matchMap.get(adj.matchId) : null;

				return {
					...adj,
					userName: user?.nickname || user?.name || "Usuário",
					userImage: user?.image || null,
					adminName: admin?.name || "Admin",
					tournamentName: tournament?.name || "Torneio",
					matchLabel: match?.name || null,
				};
			});
		} catch (error) {
			console.error("Error fetching point adjustments:", error);
			throw new Error("Erro ao buscar ajustes de pontos");
		}
	},
);

export const getPointAdjustments = getPointAdjustmentsFn as unknown as (opts?: {
	data?: {
		tournamentId?: number;
		userId?: string;
		limit?: number;
		offset?: number;
	};
}) => Promise<
	(typeof pointAdjustments.$inferSelect & {
		userName: string;
		userImage: string | null;
		adminName: string;
		tournamentName: string;
		matchLabel: string | null;
	})[]
>;

/**
 * Get users eligible for point adjustments (simplified search)
 */
const searchUsersForAdjustmentFn = createServerFn({ method: "GET" }).handler(
	async (ctx: any) => {
		const { db } = await import("@bsebet/db");

		// Check admin authentication
		const session = await auth.api.getSession({
			headers: ctx.request.headers,
		});

		if (!session?.user?.id || session.user.role !== "admin") {
			throw new Error("Apenas administradores podem buscar usuários");
		}

		const searchTerm = ctx.data as string;

		if (!searchTerm || searchTerm.length < 2) {
			return [];
		}

		const users = await db
			.select({
				id: user.id,
				name: user.name,
				nickname: user.nickname,
				email: user.email,
				image: user.image,
			})
			.from(user)
			.where(
				sql`(
          ${user.name} ILIKE ${`%${searchTerm}%`} OR
          ${user.email} ILIKE ${`%${searchTerm}%`} OR
          ${user.nickname} ILIKE ${`%${searchTerm}%`}
        )`,
			)
			.limit(10);

		return users.map((u) => ({
			id: u.id,
			name: u.nickname || u.name,
			email: u.email,
			image: u.image,
		}));
	},
);

export const searchUsersForAdjustment =
	searchUsersForAdjustmentFn as unknown as (opts: { data: string }) => Promise<
		{
			id: string;
			name: string;
			email: string;
			image: string | null;
		}[]
	>;
