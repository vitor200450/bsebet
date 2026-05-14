import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { runQuery } from "./executor";
import { buildListTablesSql, LIST_SCHEMAS_SQL } from "./introspect";
import { createRegistry } from "./registry";
import { normalizeDbError } from "./errors";
import { parseEnvText } from "./discovery/env";
import { extractPostgresServices } from "./discovery/compose";
import { mergeConnections } from "./discovery/index";
import { getDefaultConfig } from "./config";
import type { DbConnection } from "./types";

const registry = createRegistry();

function getWorkspace(): string {
	return process.cwd();
}

// Tools use ExtensionAPI and ExtensionContext for proper Pi integration

export function registerAllTools(pi: ExtensionAPI) {
	pi.registerTool({
		name: "db_list_connections",
		label: "List DB Connections",
		description: "List all available database connections (auto-discovered + manual) with reachability status",
		parameters: Type.Object({}),
		async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
			const connections = registry.list(getWorkspace());
			if (connections.length === 0) {
				return {
					content: [{ type: "text", text: "No database connections found. Try db_refresh_discovery first." }],
					details: { connections: [] },
				};
			}
			const active = registry.getActive(getWorkspace());
			const list = connections.map((c) => ({
				name: c.name,
				host: c.host,
				port: c.port,
				database: c.database,
				user: c.user,
				source: c.source,
				active: c.name === active?.name,
			}));
			return {
				content: [
					{
						type: "text",
						text: list
							.map(
								(c) =>
									`${c.active ? "* " : "  "}${c.name} (${c.source}) — ${c.host}:${c.port}/${c.database} as ${c.user}`,
							)
							.join("\n"),
					},
				],
				details: { connections: list },
			};
		},
	});

	pi.registerTool({
		name: "db_select_connection",
		label: "Select DB Connection",
		description: "Set the active database connection for the current workspace",
		parameters: Type.Object({
			name: Type.String({ description: "Name of the connection to activate" }),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			const { name } = params as { name: string };
			const connections = registry.list(getWorkspace());
			const found = connections.find((c) => c.name === name);
			if (!found) {
				return {
					content: [{ type: "text", text: `Connection "${name}" not found.` }],
					details: {},
					isError: true,
				};
			}
			registry.select(getWorkspace(), name);
			return {
				content: [{ type: "text", text: `Active connection set to "${name}" (${found.host}:${found.port}/${found.database})` }],
				details: { selected: name },
			};
		},
	});

	pi.registerTool({
		name: "db_introspect",
		label: "Introspect Database",
		description: "List schemas, tables, and columns from the active database connection",
		parameters: Type.Object({
			schema: Type.Optional(Type.String({ description: "Schema filter (e.g. 'public')" })),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			const active = registry.getActive(getWorkspace());
			if (!active) {
				return {
					content: [{ type: "text", text: "No active connection. Use db_select_connection first." }],
					details: {},
					isError: true,
				};
			}
			const { schema } = params as { schema?: string };
			try {
				const schemasResult = await runQuery(active, LIST_SCHEMAS_SQL);
				const tablesResult = await runQuery(active, buildListTablesSql(schema));
				return {
					content: [
						{
							type: "text",
							text: [
								`Schemas (${schemasResult.rows.length}):`,
								...schemasResult.rows.map((r: any) => `  ${r.schema_name}`),
								"",
								`Tables (${tablesResult.rows.length}):`,
								...tablesResult.rows.map((r: any) => `  ${r.table_schema}.${r.table_name}`),
							].join("\n"),
						},
					],
					details: {
						schemas: schemasResult.rows.map((r: any) => r.schema_name),
						tables: tablesResult.rows.map((r: any) => ({ schema: r.table_schema, name: r.table_name })),
					},
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Introspection failed: ${error.message}` }],
					details: {},
					isError: true,
				};
			}
		},
	});

	pi.registerTool({
		name: "db_query",
		label: "Run DB Query",
		description: "Execute an arbitrary SQL query (read or write) against the active database connection",
		parameters: Type.Object({
			sql: Type.String({ description: "SQL query to execute" }),
			params: Type.Optional(Type.Array(Type.Any({ description: "Query parameter values" }))),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			const active = registry.getActive(getWorkspace());
			if (!active) {
				return {
					content: [{ type: "text", text: "No active connection. Use db_select_connection first." }],
					details: {},
					isError: true,
				};
			}
			const { sql, params: queryParams } = params as { sql: string; params?: unknown[] };
			try {
				const result = await runQuery(active, sql, queryParams ?? []);
				return {
					content: [
						{
							type: "text",
							text: [
								`Duration: ${result.durationMs}ms`,
								`Rows affected: ${result.rowCount}`,
								`Columns: ${result.fields.join(", ")}`,
								"",
								...result.rows.map((r: any) => JSON.stringify(r, null, 2)),
							].join("\n"),
						},
					],
					details: result,
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Query failed: ${error.kind ?? "Error"}: ${error.message}` }],
					details: {},
					isError: true,
				};
			}
		},
	});

	pi.registerTool({
		name: "db_healthcheck",
		label: "DB Healthcheck",
		description: "Test connectivity to the active database (SELECT 1)",
		parameters: Type.Object({}),
		async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
			const active = registry.getActive(getWorkspace());
			if (!active) {
				return {
					content: [{ type: "text", text: "No active connection." }],
					details: {},
					isError: true,
				};
			}
			try {
				const result = await runQuery(active, "SELECT 1 AS ok");
				return {
					content: [{ type: "text", text: `Healthy (${result.durationMs}ms)` }],
					details: { healthy: true, durationMs: result.durationMs },
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Unhealthy: ${error.message}` }],
					details: { healthy: false, durationMs: 0 },
					isError: true,
				};
			}
		},
	});

	pi.registerTool({
		name: "db_refresh_discovery",
		label: "Refresh DB Discovery",
		description:
			"Re-read docker-compose and env files to discover database connections, then merge with manual config",
		parameters: Type.Object({}),
		async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
			const discovered: DbConnection[] = [];
			const workspace = getWorkspace();

			// Try to read docker-compose files
			for (const file of ["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"]) {
				try {
					const content = await Bun.file(workspace + "/" + file).text();
					const services = extractPostgresServices(content);
					for (const s of services) {
						discovered.push({
							name: s.name,
							host: s.host,
							port: s.port,
							database: s.database,
							user: s.user,
							password: s.password,
							source: "compose",
						});
					}
				} catch {
					// file not found, try next
				}
			}

			// Try to read .env files
			for (const file of [".env", ".env.local", ".env.development"]) {
				try {
					const content = await Bun.file(workspace + "/" + file).text();
					const env = parseEnvText(content);
					if (env.DATABASE_URL) {
						// Parse DATABASE_URL
						const url = new URL(env.DATABASE_URL);
						discovered.push({
							name: "default",
							host: url.hostname,
							port: Number(url.port) || 5432,
							database: url.pathname.slice(1),
							user: decodeURIComponent(url.username),
							password: decodeURIComponent(url.password),
							source: "env",
						});
					} else if (env.PGHOST) {
						discovered.push({
							name: "default",
							host: env.PGHOST,
							port: Number(env.PGPORT) || 5432,
							database: env.PGDATABASE ?? "postgres",
							user: env.PGUSER ?? "postgres",
							password: env.PGPASSWORD ?? "",
							source: "env",
						});
					}
				} catch {
					// file not found, try next
				}
			}

			const config = getDefaultConfig();
			const merged = mergeConnections(discovered, config.manualConnections);
			registry.setConnections(workspace, merged);

			return {
				content: [
					{
						type: "text",
						text: `Discovered ${discovered.length} connection(s), merged with ${config.manualConnections.length} manual entries. Total: ${merged.length}`,
					},
				],
				details: { discovered: discovered.length, manual: config.manualConnections.length, total: merged.length },
			};
		},
	});
}
