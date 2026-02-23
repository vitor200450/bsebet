import { bets } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";

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
				totalPoints: sql<number>`COALESCE(SUM(${bets.pointsEarned}), 0)`,
			})
			.from(bets)
			.where(eq(bets.userId, userId));

		return result[0]?.totalPoints ?? 0;
	});
