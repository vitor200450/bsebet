import { describe, expect, it } from "bun:test";
import { createExtension } from "../src/index";

describe("extension entrypoint", () => {
	it("exports extension name", () => {
		const ext = createExtension();
		expect(ext.name).toBe("postgres-docker");
	});

	it("exports correct number of tools", () => {
		const ext = createExtension();
		expect(ext.getToolNames().length).toBe(6);
	});

	it("includes all required tool names", () => {
		const ext = createExtension();
		const names = ext.getToolNames();
		expect(names).toContain("db_list_connections");
		expect(names).toContain("db_select_connection");
		expect(names).toContain("db_introspect");
		expect(names).toContain("db_query");
		expect(names).toContain("db_healthcheck");
		expect(names).toContain("db_refresh_discovery");
	});
});
