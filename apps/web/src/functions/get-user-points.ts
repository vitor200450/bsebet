import { bets, matches, tournaments } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";
import { careerBetsUserFilter, careerStatsSelect } from "@/utils/career-points";

export const getUserPoints = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		const { db } = await import("@bsebet/db");
		if (!context.session) {
			throw new Error("Unauthorized");
		}
		const userId = context.session.user.id;

		const result = await db
			.select({
				totalPoints: careerStatsSelect.totalPoints,
			})
			.from(bets)
			.innerJoin(matches, eq(bets.matchId, matches.id))
			.innerJoin(tournaments, eq(matches.tournamentId, tournaments.id))
			.where(careerBetsUserFilter(userId));

		return Number(result[0]?.totalPoints ?? 0);
	});
