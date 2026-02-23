import { matches } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq, sql } from "drizzle-orm";

export const getLiveStatus = createServerFn({ method: "GET" }).handler(
	async () => {
		const { db } = await import("@bsebet/db");

		const result = await db
			.select({
				count: sql<number>`count(*)`,
			})
			.from(matches)
			.where(eq(matches.status, "live"));

		return {
			isLive: result[0]?.count > 0,
			count: result[0]?.count ?? 0,
		};
	},
);
