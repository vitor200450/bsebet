import { describe, expect, it } from "bun:test";
import { runQuery } from "../../src/executor";
import { buildListTablesSql, LIST_SCHEMAS_SQL } from "../../src/introspect";

const TEST_CONNECTION = {
	name: "integration-test",
	host: "127.0.0.1",
	port: 55432,
	database: "postgres",
	user: "postgres",
	password: "postgres",
	source: "manual" as const,
};

describe("docker postgres integration", () => {
	it("runs select 1", async () => {
		const result = await runQuery(TEST_CONNECTION, "SELECT 1 AS ok");
		expect(result.rows[0]?.ok).toBe(1);
		expect(result.durationMs).toBeGreaterThan(0);
	});

	it("lists schemas", async () => {
		const result = await runQuery(TEST_CONNECTION, LIST_SCHEMAS_SQL);
		expect(result.rows.length).toBeGreaterThan(0);
		const schemas = result.rows.map((r: any) => r.schema_name);
		expect(schemas).toContain("public");
	});

	it("lists tables in public schema", async () => {
		const result = await runQuery(TEST_CONNECTION, buildListTablesSql("public"));
		expect(result).toBeDefined();
	});

	it("runs insert and select roundtrip", async () => {
		await runQuery(TEST_CONNECTION, "CREATE TEMP TABLE test_ping (id int, val text)");
		await runQuery(TEST_CONNECTION, "INSERT INTO test_ping (id, val) VALUES ($1, $2)", [1, "hello"]);
		const result = await runQuery(TEST_CONNECTION, "SELECT id, val FROM test_ping WHERE id = $1", [1]);
		expect(result.rows.length).toBe(1);
		expect(result.rows[0]?.val).toBe("hello");
	});
});
