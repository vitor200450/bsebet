import { describe, expect, it } from "bun:test";
import { buildListTablesSql, LIST_SCHEMAS_SQL } from "../src/introspect";

describe("introspect", () => {
	it("buildListTablesSql includes schema filter", () => {
		const sql = buildListTablesSql("public");
		expect(sql).toContain("table_schema = $1");
	});

	it("buildListTablesSql returns all schemas when no filter", () => {
		const sql = buildListTablesSql();
		expect(sql).not.toContain("$1");
	});

	it("LIST_SCHEMAS_SQL is defined", () => {
		expect(LIST_SCHEMAS_SQL).toContain("information_schema.schemata");
	});
});
