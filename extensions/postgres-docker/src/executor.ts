import { Pool } from "pg";
import { normalizeDbError } from "./errors";
import type { DbConnection } from "./types";

export type QueryResult = {
	rows: any[];
	rowCount: number;
	fields: string[];
	durationMs: number;
};

export async function runQuery(
	connection: DbConnection,
	sql: string,
	params: unknown[] = [],
	timeoutMs = 15000,
): Promise<QueryResult> {
	const pool = new Pool({
		host: connection.host,
		port: connection.port,
		database: connection.database,
		user: connection.user,
		password: connection.password,
		statement_timeout: timeoutMs,
	});
	const started = Date.now();
	try {
		const result = await pool.query(sql, params);
		return {
			rows: result.rows,
			rowCount: result.rowCount ?? 0,
			fields: result.fields.map((f: { name: string }) => f.name),
			durationMs: Date.now() - started,
		};
	} catch (error) {
		throw normalizeDbError(error, "query");
	} finally {
		await pool.end();
	}
}
