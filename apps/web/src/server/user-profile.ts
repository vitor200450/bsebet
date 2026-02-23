import { bets, matches, tournaments, user } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, sql } from "drizzle-orm";

// --- getUserProfile ---
const getUserProfileFn = createServerFn({ method: "GET" }).handler(
	async (ctx: any) => {
		const { db } = await import("@bsebet/db");
		const userId = ctx.data as string;

		const result = await db
			.select({
				id: user.id,
				name: user.name,
				nickname: user.nickname,
				image: user.image,
				createdAt: user.createdAt,
			})
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);

		return result[0] ?? null;
	},
);

export type UserProfile = {
	id: string;
	name: string;
	nickname: string | null;
	image: string | null;
	createdAt: Date;
};

export const getUserProfile = getUserProfileFn as unknown as (opts: {
	data: string;
}) => Promise<UserProfile | null>;

// --- getUserStats ---
const getUserStatsFn = createServerFn({ method: "GET" }).handler(
	async (ctx: any) => {
		const { db } = await import("@bsebet/db");
		const userId = ctx.data as string;

		const result = await db
			.select({
				totalBets: sql<number>`count(*)`,
				totalPoints: sql<number>`COALESCE(SUM(${bets.pointsEarned}), 0)`,
				correctPredictions: sql<number>`count(*) FILTER (WHERE ${bets.pointsEarned} > 0)`,
				perfectPicks: sql<number>`count(*) FILTER (WHERE ${bets.isPerfectPick} = true)`,
				underdogWins: sql<number>`count(*) FILTER (WHERE ${bets.isUnderdogPick} = true AND ${bets.pointsEarned} > 0)`,
			})
			.from(bets)
			.where(eq(bets.userId, userId));

		const data = result[0];
		const totalBets = Number(data?.totalBets || 0);
		const correctPredictions = Number(data?.correctPredictions || 0);

		return {
			totalBets,
			totalPoints: Number(data?.totalPoints || 0),
			correctPredictions,
			perfectPicks: Number(data?.perfectPicks || 0),
			underdogWins: Number(data?.underdogWins || 0),
			accuracy:
				totalBets > 0 ? Math.round((correctPredictions / totalBets) * 100) : 0,
		};
	},
);

export type UserStats = {
	totalBets: number;
	totalPoints: number;
	correctPredictions: number;
	perfectPicks: number;
	underdogWins: number;
	accuracy: number;
};

export const getUserStats = getUserStatsFn as unknown as (opts: {
	data: string;
}) => Promise<UserStats>;

// --- getUserMedals ---
// Computes top-3 placements in finished tournaments without raw SQL
const getUserMedalsFn = createServerFn({ method: "GET" }).handler(
	async (ctx: any) => {
		const { db } = await import("@bsebet/db");
		const userId = ctx.data as string;

		// Get all finished tournaments where user has placed bets
		const userFinishedTournaments = await db
			.select({
				tournamentId: matches.tournamentId,
				tournamentName: tournaments.name,
				tournamentSlug: tournaments.slug,
				tournamentLogoUrl: tournaments.logoUrl,
			})
			.from(bets)
			.innerJoin(matches, eq(bets.matchId, matches.id))
			.innerJoin(tournaments, eq(matches.tournamentId, tournaments.id))
			.where(and(eq(bets.userId, userId), eq(tournaments.status, "finished")))
			.groupBy(
				matches.tournamentId,
				tournaments.name,
				tournaments.slug,
				tournaments.logoUrl,
			);

		const medals: UserMedal[] = [];

		for (const t of userFinishedTournaments) {
			if (!t.tournamentId) continue;

			// Get top 3 users for this tournament — mesma ordenação do leaderboard
			// 1° pontos · 2° perfect picks · 3° acertos totais
			const top3 = await db
				.select({
					userId: bets.userId,
					totalPoints: sql<number>`COALESCE(SUM(${bets.pointsEarned}), 0)`.as(
						"total_points",
					),
					perfectPicks:
						sql<number>`COUNT(CASE WHEN ${bets.isPerfectPick} = true THEN 1 END)`.as(
							"perfect_picks",
						),
					correctPredictions:
						sql<number>`COUNT(CASE WHEN ${bets.pointsEarned} > 0 THEN 1 END)`.as(
							"correct_predictions",
						),
				})
				.from(bets)
				.innerJoin(matches, eq(bets.matchId, matches.id))
				.where(eq(matches.tournamentId, t.tournamentId))
				.groupBy(bets.userId)
				.orderBy(
					desc(sql`total_points`),
					desc(sql`perfect_picks`),
					desc(sql`correct_predictions`),
					asc(bets.userId),
				)
				.limit(3);

			const userIndex = top3.findIndex((e) => e.userId === userId);
			if (userIndex === -1) continue;

			medals.push({
				tournamentId: t.tournamentId,
				tournamentName: t.tournamentName ?? "",
				tournamentSlug: t.tournamentSlug ?? "",
				tournamentLogoUrl: t.tournamentLogoUrl,
				placement: (userIndex + 1) as 1 | 2 | 3,
				totalPoints: Number(top3[userIndex]?.totalPoints || 0),
			});
		}

		return medals.sort((a, b) => a.placement - b.placement);
	},
);

export type UserMedal = {
	tournamentId: number;
	tournamentName: string;
	tournamentSlug: string;
	tournamentLogoUrl: string | null;
	placement: 1 | 2 | 3;
	totalPoints: number;
};

export const getUserMedals = getUserMedalsFn as unknown as (opts: {
	data: string;
}) => Promise<UserMedal[]>;

// --- getUserMedalCounts ---
// Returns a summary count of medals by tier
const getUserMedalCountsFn = createServerFn({ method: "GET" }).handler(
	async (ctx: any) => {
		const userId = ctx.data as string;

		// Reuse the getUserMedals logic but return counts only
		const medals = await getUserMedals({ data: userId });

		return {
			total: medals.length,
			gold: medals.filter((m) => m.placement === 1).length,
			silver: medals.filter((m) => m.placement === 2).length,
			bronze: medals.filter((m) => m.placement === 3).length,
		};
	},
);

export type MedalCounts = {
	total: number;
	gold: number;
	silver: number;
	bronze: number;
};

export const getUserMedalCounts = getUserMedalCountsFn as unknown as (opts: {
	data: string;
}) => Promise<MedalCounts>;

// --- getUserMedalsExcludingTournament ---
// Returns medals for a user, optionally excluding a specific tournament
// Useful for tiebreaker calculations where current tournament medals shouldn't count
const getUserMedalsExcludingTournamentFn = createServerFn({
	method: "GET",
}).handler(async (ctx: any) => {
	const { userId, excludeTournamentId } = ctx.data as {
		userId: string;
		excludeTournamentId?: number;
	};

	// Get all medals first
	const allMedals = await getUserMedals({ data: userId });

	// Filter out the excluded tournament if specified
	const filteredMedals = excludeTournamentId
		? allMedals.filter((m) => m.tournamentId !== excludeTournamentId)
		: allMedals;

	return {
		medals: filteredMedals,
		gold: filteredMedals.filter((m) => m.placement === 1).length,
		silver: filteredMedals.filter((m) => m.placement === 2).length,
		bronze: filteredMedals.filter((m) => m.placement === 3).length,
		total: filteredMedals.length,
	};
});

export type UserMedalsExcludingTournament = {
	medals: UserMedal[];
	gold: number;
	silver: number;
	bronze: number;
	total: number;
};

export const getUserMedalsExcludingTournament =
	getUserMedalsExcludingTournamentFn as unknown as (opts: {
		data: { userId: string; excludeTournamentId?: number };
	}) => Promise<UserMedalsExcludingTournament>;

// --- getUserRecentBets ---
const getUserRecentBetsFn = createServerFn({ method: "GET" }).handler(
	async (ctx: any) => {
		const { db } = await import("@bsebet/db");
		const userId = ctx.data as string;

		const result = await db.query.bets.findMany({
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
			orderBy: (_bets, { desc }) => [desc(_bets.createdAt)],
			limit: 20,
		});

		// Only return bets on finished matches
		return result.filter((bet) => bet.match.status === "finished");
	},
);

export type UserRecentBet = {
	id: number;
	matchId: number;
	predictedWinnerId: number | null;
	predictedScoreA: number;
	predictedScoreB: number;
	pointsEarned: number | null;
	isPerfectPick: boolean | null;
	isUnderdogPick: boolean | null;
	createdAt: Date | null;
	predictedWinner: {
		id: number;
		name: string;
		logoUrl: string | null;
	} | null;
	match: {
		id: number;
		scoreA: number | null;
		scoreB: number | null;
		status: string | null;
		startTime: Date;
		teamA: { id: number; name: string; slug: string; logoUrl: string | null } | null;
		teamB: { id: number; name: string; slug: string; logoUrl: string | null } | null;
		winner: { id: number; name: string } | null;
		tournament: {
			id: number;
			name: string;
			slug: string;
			logoUrl: string | null;
		} | null;
	};
};

export const getUserRecentBets = getUserRecentBetsFn as unknown as (opts: {
	data: string;
}) => Promise<UserRecentBet[]>;

// --- getUserTournamentHistory ---
const getUserTournamentHistoryFn = createServerFn({ method: "GET" }).handler(
	async (ctx: any) => {
		const { db } = await import("@bsebet/db");
		const userId = ctx.data as string;

		// Aggregate user's bets by tournament
		const userTournamentStats = await db
			.select({
				tournamentId: matches.tournamentId,
				tournamentName: tournaments.name,
				tournamentSlug: tournaments.slug,
				tournamentLogoUrl: tournaments.logoUrl,
				tournamentStatus: tournaments.status,
				tournamentCreatedAt: tournaments.createdAt,
				numBets: sql<number>`count(${bets.id})`.as("num_bets"),
				totalPoints: sql<number>`COALESCE(SUM(${bets.pointsEarned}), 0)`.as(
					"total_points",
				),
				perfectPicks:
					sql<number>`count(CASE WHEN ${bets.isPerfectPick} = true THEN 1 END)`.as(
						"perfect_picks",
					),
			})
			.from(bets)
			.innerJoin(matches, eq(bets.matchId, matches.id))
			.innerJoin(tournaments, eq(matches.tournamentId, tournaments.id))
			.where(eq(bets.userId, userId))
			.groupBy(
				matches.tournamentId,
				tournaments.name,
				tournaments.slug,
				tournaments.logoUrl,
				tournaments.status,
				tournaments.createdAt,
			)
			.orderBy(desc(tournaments.createdAt));

		const result: UserTournamentHistory[] = [];

		for (const t of userTournamentStats) {
			if (!t.tournamentId) continue;

			// Get all users' totals for this tournament — mesma ordenação do leaderboard
			// 1° pontos · 2° perfect picks · 3° acertos totais
			const allUsers = await db
				.select({
					userId: bets.userId,
					totalPoints: sql<number>`COALESCE(SUM(${bets.pointsEarned}), 0)`.as(
						"total_points",
					),
					perfectPicks:
						sql<number>`COUNT(CASE WHEN ${bets.isPerfectPick} = true THEN 1 END)`.as(
							"perfect_picks",
						),
					correctPredictions:
						sql<number>`COUNT(CASE WHEN ${bets.pointsEarned} > 0 THEN 1 END)`.as(
							"correct_predictions",
						),
				})
				.from(bets)
				.innerJoin(matches, eq(bets.matchId, matches.id))
				.where(eq(matches.tournamentId, t.tournamentId))
				.groupBy(bets.userId)
				.orderBy(
					desc(sql`total_points`),
					desc(sql`perfect_picks`),
					desc(sql`correct_predictions`),
					asc(bets.userId),
				);

			const rank = allUsers.findIndex((u) => u.userId === userId) + 1 || 0;

			result.push({
				tournamentId: t.tournamentId,
				tournamentName: t.tournamentName ?? "",
				tournamentSlug: t.tournamentSlug ?? "",
				tournamentLogoUrl: t.tournamentLogoUrl,
				tournamentStatus: t.tournamentStatus ?? "",
				numBets: Number(t.numBets),
				totalPoints: Number(t.totalPoints),
				perfectPicks: Number(t.perfectPicks),
				rank,
			});
		}

		return result;
	},
);

export type UserTournamentHistory = {
	tournamentId: number;
	tournamentName: string;
	tournamentSlug: string;
	tournamentLogoUrl: string | null;
	tournamentStatus: string;
	numBets: number;
	totalPoints: number;
	perfectPicks: number;
	rank: number;
};

export const getUserTournamentHistory =
	getUserTournamentHistoryFn as unknown as (opts: {
		data: string;
	}) => Promise<UserTournamentHistory[]>;
