import { describe, expect, it } from "bun:test";
import { runTournamentListRefreshAfterMutation } from "./admin-tournament-duplicate";

describe("runTournamentListRefreshAfterMutation", () => {
	it("awaits mutation before invalidating loaders", async () => {
		const order: string[] = [];

		await runTournamentListRefreshAfterMutation({
			mutate: async () => {
				order.push("mutate-start");
				await new Promise((resolve) => setTimeout(resolve, 10));
				order.push("mutate-end");
				return { id: 99 };
			},
			invalidate: async () => {
				order.push("invalidate");
			},
		});

		expect(order).toEqual(["mutate-start", "mutate-end", "invalidate"]);
	});

	it("does not invalidate when mutation fails", async () => {
		const order: string[] = [];

		await expect(
			runTournamentListRefreshAfterMutation({
				mutate: async () => {
					order.push("mutate");
					throw new Error("copy failed");
				},
				invalidate: async () => {
					order.push("invalidate");
				},
			}),
		).rejects.toThrow("copy failed");

		expect(order).toEqual(["mutate"]);
	});
});
