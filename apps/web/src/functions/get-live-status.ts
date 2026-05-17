import { matches } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq, sql } from "drizzle-orm";

export const getLiveStatus = createServerFn({ method: "GET" }).handler(
	async () => {
		try {
			const { db } = await import("@bsebet/db");

			const result = await db
				.select({
					count: sql<number>`count(*)`,
				})
				.from(matches)
				.where(eq(matches.status, "live"));

			const count = Number(result[0]?.count ?? 0);

			return {
				isLive: count > 0,
				count,
			};
		} catch (error) {
			console.error("[getLiveStatus] Failed to fetch live status", error);
			return {
				isLive: false,
				count: 0,
			};
		}
	},
);
