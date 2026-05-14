import { describe, expect, it } from "bun:test";
import { mergeConnections } from "../src/discovery";

describe("mergeConnections", () => {
	it("prefers manual override over discovered values", () => {
		const merged = mergeConnections(
			[{ name: "local", host: "127.0.0.1", port: 5432, database: "a", user: "u", password: "p", source: "compose" }],
			[{ name: "local", host: "127.0.0.1", port: 5432, database: "b", user: "u2", password: "p2", source: "manual" }],
		);
		expect(merged[0]?.database).toBe("b");
	});

	it("includes discovered-only connections", () => {
		const merged = mergeConnections(
			[{ name: "discovered", host: "127.0.0.1", port: 5432, database: "a", user: "u", password: "p", source: "compose" }],
			[{ name: "manual1", host: "127.0.0.1", port: 5433, database: "b", user: "u2", password: "p2", source: "manual" }],
		);
		expect(merged.length).toBe(2);
	});
});
