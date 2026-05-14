import { describe, expect, it } from "bun:test";
import { createRegistry } from "../src/registry";

describe("registry", () => {
	it("auto-selects single connection", () => {
		const registry = createRegistry();
		registry.setConnections("/repo", [
			{ name: "only", host: "h", port: 5432, database: "d", user: "u", password: "p", source: "manual" },
		]);
		expect(registry.getActive("/repo")?.name).toBe("only");
	});

	it("does not auto-select when multiple connections exist", () => {
		const registry = createRegistry();
		registry.setConnections("/repo", [
			{ name: "a", host: "h", port: 5432, database: "d", user: "u", password: "p", source: "compose" },
			{ name: "b", host: "h", port: 5433, database: "d", user: "u", password: "p", source: "manual" },
		]);
		expect(registry.getActive("/repo")).toBeUndefined();
	});

	it("selects connection by name", () => {
		const registry = createRegistry();
		registry.setConnections("/repo", [
			{ name: "a", host: "h", port: 5432, database: "d", user: "u", password: "p", source: "compose" },
			{ name: "b", host: "h", port: 5433, database: "d", user: "u", password: "p", source: "manual" },
		]);
		registry.select("/repo", "b");
		expect(registry.getActive("/repo")?.name).toBe("b");
	});

	it("lists connections for workspace", () => {
		const registry = createRegistry();
		registry.setConnections("/repo", [
			{ name: "a", host: "h", port: 5432, database: "d", user: "u", password: "p", source: "manual" },
		]);
		expect(registry.list("/repo").length).toBe(1);
	});
});
