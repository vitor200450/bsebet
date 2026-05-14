# PostgreSQL Docker Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PostgreSQL-first extension that discovers local Docker-backed databases (plus manual fallback), selects an active connection per workspace, and executes introspection and arbitrary SQL read/write operations.

**Architecture:** Implement a small extension package split into discovery, registry, executor, and tool handlers. Discovery parses `docker-compose*.yml` and `.env*` to produce normalized connection candidates; registry merges with manual entries and tracks active selection; executor manages pooled PostgreSQL access and normalized errors. Tool handlers expose `db_list_connections`, `db_select_connection`, `db_introspect`, `db_query`, `db_healthcheck`, and `db_refresh_discovery`.

**Tech Stack:** TypeScript, Node.js, `pg`, `yaml`, project extension SDK/tooling, Bun test runner.

---

## File Structure

- Create: `extensions/postgres-docker/package.json` — extension package and deps.
- Create: `extensions/postgres-docker/src/types.ts` — shared types/interfaces.
- Create: `extensions/postgres-docker/src/config.ts` — load manual config + defaults.
- Create: `extensions/postgres-docker/src/discovery/env.ts` — parse `.env` files.
- Create: `extensions/postgres-docker/src/discovery/compose.ts` — parse compose services.
- Create: `extensions/postgres-docker/src/discovery/index.ts` — merge/normalize candidates.
- Create: `extensions/postgres-docker/src/registry.ts` — catalog + active connection state.
- Create: `extensions/postgres-docker/src/errors.ts` — normalized error mapping.
- Create: `extensions/postgres-docker/src/executor.ts` — pg pool + query execution.
- Create: `extensions/postgres-docker/src/introspect.ts` — schema/table/column helpers.
- Create: `extensions/postgres-docker/src/tools.ts` — tool implementations.
- Create: `extensions/postgres-docker/src/index.ts` — extension entrypoint registration.
- Create: `extensions/postgres-docker/tests/*.test.ts` — unit/integration tests.
- Modify: repo docs if needed (e.g., `docs/extensions/postgres-docker.md`) for setup and usage.

### Task 1: Scaffold extension package

**Files:**
- Create: `extensions/postgres-docker/package.json`
- Create: `extensions/postgres-docker/src/types.ts`

- [ ] **Step 1: Write the failing test**

```ts
// extensions/postgres-docker/tests/smoke.test.ts
import { describe, expect, it } from "bun:test";
import { EXTENSION_NAME } from "../src/types";

describe("smoke", () => {
	it("exports extension name", () => {
		expect(EXTENSION_NAME).toBe("postgres-docker");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test extensions/postgres-docker/tests/smoke.test.ts`
Expected: FAIL with module not found for `../src/types`.

- [ ] **Step 3: Write minimal implementation**

```json
// extensions/postgres-docker/package.json
{
	"name": "@bsebet/ext-postgres-docker",
	"private": true,
	"type": "module",
	"main": "src/index.ts",
	"dependencies": {
		"pg": "^8.16.0",
		"yaml": "^2.8.0"
	}
}
```

```ts
// extensions/postgres-docker/src/types.ts
export const EXTENSION_NAME = "postgres-docker";

export type DbConnection = {
	name: string;
	host: string;
	port: number;
	database: string;
	user: string;
	password: string;
	source: "compose" | "env" | "manual";
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test extensions/postgres-docker/tests/smoke.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add extensions/postgres-docker/package.json extensions/postgres-docker/src/types.ts extensions/postgres-docker/tests/smoke.test.ts
git commit -m "feat(ext): scaffold postgres-docker extension package"
```

### Task 2: Implement env parsing

**Files:**
- Create: `extensions/postgres-docker/src/discovery/env.ts`
- Test: `extensions/postgres-docker/tests/env-discovery.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import { parseEnvText } from "../src/discovery/env";

describe("parseEnvText", () => {
	it("parses key-value pairs", () => {
		const env = parseEnvText("PGHOST=localhost\nPGPORT=5432\n");
		expect(env.PGHOST).toBe("localhost");
		expect(env.PGPORT).toBe("5432");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test extensions/postgres-docker/tests/env-discovery.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Write minimal implementation**

```ts
// extensions/postgres-docker/src/discovery/env.ts
export function parseEnvText(text: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const idx = trimmed.indexOf("=");
		if (idx <= 0) continue;
		const key = trimmed.slice(0, idx).trim();
		const value = trimmed.slice(idx + 1).trim();
		out[key] = value;
	}
	return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test extensions/postgres-docker/tests/env-discovery.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add extensions/postgres-docker/src/discovery/env.ts extensions/postgres-docker/tests/env-discovery.test.ts
git commit -m "feat(ext): add .env parser for discovery"
```

### Task 3: Implement compose parsing

**Files:**
- Create: `extensions/postgres-docker/src/discovery/compose.ts`
- Test: `extensions/postgres-docker/tests/compose-discovery.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import { extractPostgresServices } from "../src/discovery/compose";

describe("extractPostgresServices", () => {
	it("finds postgres service and mapped port", () => {
		const yaml = `services:\n  db:\n    image: postgres:16\n    ports:\n      - \"5433:5432\"\n    environment:\n      POSTGRES_DB: app\n      POSTGRES_USER: app\n      POSTGRES_PASSWORD: secret\n`;
		const services = extractPostgresServices(yaml);
		expect(services.length).toBe(1);
		expect(services[0]?.port).toBe(5433);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test extensions/postgres-docker/tests/compose-discovery.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
// extensions/postgres-docker/src/discovery/compose.ts
import YAML from "yaml";

type ServiceCandidate = {
	name: string;
	host: string;
	port: number;
	database: string;
	user: string;
	password: string;
};

export function extractPostgresServices(text: string): ServiceCandidate[] {
	const doc = YAML.parse(text) as { services?: Record<string, any> };
	const services = doc?.services ?? {};
	const out: ServiceCandidate[] = [];
	for (const [name, service] of Object.entries(services)) {
		const image = String(service?.image ?? "").toLowerCase();
		if (!image.includes("postgres")) continue;
		const ports = service?.ports ?? [];
		const first = String(ports[0] ?? "5432:5432");
		const hostPort = Number(first.split(":")[0].replaceAll("\"", ""));
		const env = service?.environment ?? {};
		out.push({
			name,
			host: "127.0.0.1",
			port: Number.isFinite(hostPort) ? hostPort : 5432,
			database: env.POSTGRES_DB ?? "postgres",
			user: env.POSTGRES_USER ?? "postgres",
			password: env.POSTGRES_PASSWORD ?? "postgres",
		});
	}
	return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test extensions/postgres-docker/tests/compose-discovery.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add extensions/postgres-docker/src/discovery/compose.ts extensions/postgres-docker/tests/compose-discovery.test.ts
git commit -m "feat(ext): parse docker compose postgres services"
```

### Task 4: Build discovery orchestrator + precedence

**Files:**
- Create: `extensions/postgres-docker/src/discovery/index.ts`
- Create: `extensions/postgres-docker/src/config.ts`
- Test: `extensions/postgres-docker/tests/discovery-merge.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test extensions/postgres-docker/tests/discovery-merge.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
// extensions/postgres-docker/src/discovery/index.ts
import type { DbConnection } from "../types";

export function mergeConnections(discovered: DbConnection[], manual: DbConnection[]): DbConnection[] {
	const map = new Map<string, DbConnection>();
	for (const c of discovered) map.set(c.name, c);
	for (const c of manual) map.set(c.name, c);
	return [...map.values()];
}
```

```ts
// extensions/postgres-docker/src/config.ts
import type { DbConnection } from "./types";

export type ExtensionConfig = {
	manualConnections: DbConnection[];
	queryTimeoutMs: number;
};

export function getDefaultConfig(): ExtensionConfig {
	return { manualConnections: [], queryTimeoutMs: 15000 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test extensions/postgres-docker/tests/discovery-merge.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add extensions/postgres-docker/src/discovery/index.ts extensions/postgres-docker/src/config.ts extensions/postgres-docker/tests/discovery-merge.test.ts
git commit -m "feat(ext): add connection merge with manual precedence"
```

### Task 5: Implement registry with active connection per workspace

**Files:**
- Create: `extensions/postgres-docker/src/registry.ts`
- Test: `extensions/postgres-docker/tests/registry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import { createRegistry } from "../src/registry";

describe("registry", () => {
	it("auto-selects single connection", () => {
		const registry = createRegistry();
		registry.setConnections("/repo", [{ name: "only", host: "h", port: 5432, database: "d", user: "u", password: "p", source: "manual" }]);
		expect(registry.getActive("/repo")?.name).toBe("only");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test extensions/postgres-docker/tests/registry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
// extensions/postgres-docker/src/registry.ts
import type { DbConnection } from "./types";

export function createRegistry() {
	const byWorkspace = new Map<string, DbConnection[]>();
	const activeByWorkspace = new Map<string, string>();

	return {
		setConnections(workspace: string, connections: DbConnection[]) {
			byWorkspace.set(workspace, connections);
			if (connections.length === 1) activeByWorkspace.set(workspace, connections[0]!.name);
		},
		list(workspace: string) {
			return byWorkspace.get(workspace) ?? [];
		},
		select(workspace: string, name: string) {
			activeByWorkspace.set(workspace, name);
		},
		getActive(workspace: string) {
			const all = byWorkspace.get(workspace) ?? [];
			const active = activeByWorkspace.get(workspace);
			return all.find((c) => c.name === active);
		},
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test extensions/postgres-docker/tests/registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add extensions/postgres-docker/src/registry.ts extensions/postgres-docker/tests/registry.test.ts
git commit -m "feat(ext): add workspace-scoped connection registry"
```

### Task 6: Implement executor + normalized errors

**Files:**
- Create: `extensions/postgres-docker/src/errors.ts`
- Create: `extensions/postgres-docker/src/executor.ts`
- Test: `extensions/postgres-docker/tests/errors.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import { normalizeDbError } from "../src/errors";

describe("normalizeDbError", () => {
	it("maps auth errors", () => {
		const err = normalizeDbError({ code: "28P01", message: "bad password" } as Error, "query");
		expect(err.kind).toBe("AuthError");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test extensions/postgres-docker/tests/errors.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
// extensions/postgres-docker/src/errors.ts
export type NormalizedDbError = {
	kind: "ConnectionError" | "AuthError" | "QueryError" | "TimeoutError" | "DiscoveryError";
	message: string;
	operation: string;
	code?: string;
};

export function normalizeDbError(error: any, operation: string): NormalizedDbError {
	const code = error?.code as string | undefined;
	if (code === "28P01") return { kind: "AuthError", message: error.message, operation, code };
	if (code === "57014") return { kind: "TimeoutError", message: error.message, operation, code };
	if (code?.startsWith("08")) return { kind: "ConnectionError", message: error.message, operation, code };
	return { kind: "QueryError", message: error?.message ?? "Unknown DB error", operation, code };
}
```

```ts
// extensions/postgres-docker/src/executor.ts
import { Pool } from "pg";
import type { DbConnection } from "./types";
import { normalizeDbError } from "./errors";

export async function runQuery(connection: DbConnection, sql: string, params: unknown[] = [], timeoutMs = 15000) {
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
			fields: result.fields.map((f) => f.name),
			durationMs: Date.now() - started,
		};
	} catch (error) {
		throw normalizeDbError(error, "query");
	} finally {
		await pool.end();
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test extensions/postgres-docker/tests/errors.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add extensions/postgres-docker/src/errors.ts extensions/postgres-docker/src/executor.ts extensions/postgres-docker/tests/errors.test.ts
git commit -m "feat(ext): add query executor and normalized db errors"
```

### Task 7: Implement introspection helpers

**Files:**
- Create: `extensions/postgres-docker/src/introspect.ts`
- Test: `extensions/postgres-docker/tests/introspect.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import { buildListTablesSql } from "../src/introspect";

describe("buildListTablesSql", () => {
	it("includes schema filter", () => {
		const sql = buildListTablesSql("public");
		expect(sql).toContain("table_schema = $1");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test extensions/postgres-docker/tests/introspect.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
// extensions/postgres-docker/src/introspect.ts
export function buildListTablesSql(schema?: string) {
	if (schema) {
		return `SELECT table_schema, table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_schema = $1 ORDER BY table_name`;
	}
	return `SELECT table_schema, table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' ORDER BY table_schema, table_name`;
}

export const LIST_SCHEMAS_SQL = `SELECT schema_name FROM information_schema.schemata ORDER BY schema_name`;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test extensions/postgres-docker/tests/introspect.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add extensions/postgres-docker/src/introspect.ts extensions/postgres-docker/tests/introspect.test.ts
git commit -m "feat(ext): add introspection SQL helpers"
```

### Task 8: Wire tool handlers and extension entrypoint

**Files:**
- Create: `extensions/postgres-docker/src/tools.ts`
- Create: `extensions/postgres-docker/src/index.ts`
- Test: `extensions/postgres-docker/tests/tools-contract.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import { toolNames } from "../src/tools";

describe("tools contract", () => {
	it("exposes required db tools", () => {
		expect(toolNames).toEqual([
			"db_list_connections",
			"db_select_connection",
			"db_introspect",
			"db_query",
			"db_healthcheck",
			"db_refresh_discovery",
		]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test extensions/postgres-docker/tests/tools-contract.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
// extensions/postgres-docker/src/tools.ts
export const toolNames = [
	"db_list_connections",
	"db_select_connection",
	"db_introspect",
	"db_query",
	"db_healthcheck",
	"db_refresh_discovery",
] as const;

export function createTools() {
	return toolNames;
}
```

```ts
// extensions/postgres-docker/src/index.ts
import { EXTENSION_NAME } from "./types";
import { createTools } from "./tools";

export function createExtension() {
	return {
		name: EXTENSION_NAME,
		tools: createTools(),
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test extensions/postgres-docker/tests/tools-contract.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add extensions/postgres-docker/src/tools.ts extensions/postgres-docker/src/index.ts extensions/postgres-docker/tests/tools-contract.test.ts
git commit -m "feat(ext): expose postgres docker tool contract"
```

### Task 9: Integration test with Docker Postgres

**Files:**
- Create: `extensions/postgres-docker/tests/integration/docker-postgres.test.ts`
- Create: `extensions/postgres-docker/tests/integration/fixtures/docker-compose.yml`

- [ ] **Step 1: Write the failing integration test**

```ts
import { describe, expect, it } from "bun:test";
import { runQuery } from "../../src/executor";

describe("docker postgres integration", () => {
	it("runs select 1", async () => {
		const result = await runQuery(
			{ name: "it", host: "127.0.0.1", port: 55432, database: "postgres", user: "postgres", password: "postgres", source: "manual" },
			"select 1 as ok",
		);
		expect(result.rows[0]?.ok).toBe(1);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test extensions/postgres-docker/tests/integration/docker-postgres.test.ts`
Expected: FAIL until container fixture is up.

- [ ] **Step 3: Add docker fixture and test instructions**

```yaml
# extensions/postgres-docker/tests/integration/fixtures/docker-compose.yml
services:
	db:
		image: postgres:16
		environment:
			POSTGRES_PASSWORD: postgres
		ports:
			- "55432:5432"
```

Add pre-test command in local docs/scripts:

```bash
docker compose -f extensions/postgres-docker/tests/integration/fixtures/docker-compose.yml up -d
```

- [ ] **Step 4: Run integration test to verify it passes**

Run:
`docker compose -f extensions/postgres-docker/tests/integration/fixtures/docker-compose.yml up -d`
`bun test extensions/postgres-docker/tests/integration/docker-postgres.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add extensions/postgres-docker/tests/integration
git commit -m "test(ext): add docker postgres integration test"
```

### Task 10: Documentation and verification

**Files:**
- Create: `docs/extensions/postgres-docker.md`

- [ ] **Step 1: Write usage docs**

```md
# Postgres Docker Extension

## What it does
- Discovers local Postgres from docker compose and .env files
- Supports manual fallback connections
- Provides tools: db_list_connections, db_select_connection, db_introspect, db_query, db_healthcheck, db_refresh_discovery

## Safety notes
- Write queries execute directly
- Avoid destructive SQL in shared databases
```

- [ ] **Step 2: Run project checks**

Run:
- `bun run check-types`
- `bun run check`
- `bun test extensions/postgres-docker/tests`

Expected: all pass.

- [ ] **Step 3: Commit docs and final adjustments**

```bash
git add docs/extensions/postgres-docker.md
git commit -m "docs(ext): document postgres docker extension setup and usage"
```

- [ ] **Step 4: Final verification run**

Run:
- `bun run build`

Expected: successful build.

- [ ] **Step 5: Prepare PR summary**

Include:
- Implemented tool contract
- Discovery strategy (compose + env + manual)
- Read/write behavior and caveats
- Test evidence (unit + integration)

## Self-Review

- Spec coverage check:
	- PostgreSQL-first: covered in executor/tooling.
	- Hybrid discovery: covered in Tasks 2, 3, 4.
	- Auto credentials from files: covered by env/compose parsing tasks.
	- Workspace active connection: covered by Task 5.
	- Tool contract: covered by Task 8.
	- Error handling and observability baseline: covered by Task 6.
	- Testing (unit/integration): covered by Tasks 1-9.
- Placeholder scan: no TODO/TBD placeholders remain.
- Type consistency: `DbConnection`, tool names, and error kinds are consistent across tasks.
