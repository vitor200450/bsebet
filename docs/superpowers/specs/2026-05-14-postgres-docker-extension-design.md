# PostgreSQL Docker Extension Design

Date: 2026-05-14
Status: Draft approved in chat

## 1. Objective
Build a PostgreSQL-first extension that lets the agent discover local Docker-backed databases across repositories and execute both analysis and data-change operations.

## 2. Scope (MVP)
- PostgreSQL only.
- Hybrid connection sourcing:
	- Auto-discovery from `docker-compose*.yml` + `.env`/`.env.*`.
	- Manual connection entries as fallback/override.
- Auto-use discovered credentials.
- Direct read/write SQL execution (no confirmation gate by default).
- Workspace-aware active connection selection.

Out of scope (MVP):
- Non-Postgres drivers.
- Advanced policy engine (query blockers/rewriters).
- Cross-machine secret managers.

## 3. Architecture
### 3.1 Discovery module
Responsibilities:
- Parse compose files and detect Postgres services.
- Parse env files and resolve connection values.
- Build normalized connection candidates.

Resolution precedence:
1. Explicit manual override fields
2. Compose service environment/ports
3. Env file defaults

### 3.2 Registry module
Responsibilities:
- Store discovered + manual connections in one catalog.
- Track active connection per workspace root.
- Expose refresh and listing APIs.
- Cache discovery briefly (30-60s) to reduce repeated parsing.

### 3.3 Executor module (Postgres)
Responsibilities:
- Manage `pg` pool lifecycle.
- Execute raw SQL with optional parameters.
- Return structured metadata (`rows`, `rowCount`, `fields`, `durationMs`).
- Provide introspection helpers.

### 3.4 Safety/observability module (minimal v1)
Responsibilities:
- Timeout per query.
- Normalize operational errors.
- Log operation metadata without secrets.

## 4. Tool contract (extension surface)
1. `db_list_connections()`
	- Returns available connections and reachability status.
2. `db_select_connection({ name })`
	- Sets active connection for current workspace.
3. `db_introspect({ schema? })`
	- Returns schemas, tables, columns summary.
4. `db_query({ sql, params? })`
	- Executes arbitrary SQL (read/write).
5. `db_healthcheck()`
	- Runs `SELECT 1` and returns latency.
6. `db_refresh_discovery()`
	- Re-runs compose/env discovery and updates catalog.

Behavior rules:
- If one connection exists, auto-select it.
- If multiple exist and none active, require explicit selection.
- Writes execute directly.

## 5. Data flow
1. On first DB action, run discovery + load manual config.
2. Build normalized connection catalog.
3. Resolve or request active connection.
4. Execute requested operation through executor.
5. Return structured output + normalized errors.
6. Refresh discovery on explicit command or cache expiry.

## 6. Error handling
Error classes/messages should be actionable:
- `ConnectionError`: host/port/container unreachable.
- `AuthError`: invalid credentials or missing required fields.
- `QueryError`: SQL syntax/runtime failure.
- `TimeoutError`: query exceeded configured timeout.
- `DiscoveryError`: invalid compose/env parse.

Requirements:
- Never log plaintext passwords.
- Include context (`connectionName`, `database`, `operation`).
- Preserve original database error code when available.

## 7. Testing strategy
### Unit
- Compose/env parsing and precedence resolution.
- Connection normalization.
- Error normalization mapping.

### Integration
- Local Docker Postgres fixture:
	- Discovery from compose.
	- Healthcheck and introspection.
	- Read query and write query roundtrip.

### Manual acceptance
- Multi-repo scenario with two compose projects.
- Manual fallback works when compose is absent.
- Active connection switching behaves predictably.

## 8. Risks and mitigations
- Risk: accidental destructive SQL.
	- Mitigation: clear docs and optional future safety policy mode.
- Risk: wrong connection selected in multi-project context.
	- Mitigation: explicit active connection command + workspace scoping.
- Risk: env/compose format drift.
	- Mitigation: tolerant parser and discovery diagnostics.

## 9. Future evolution (post-MVP)
- Optional policy engine (block unsafe patterns).
- Read-only mode toggle.
- Multi-database support (MySQL/MariaDB).
- Persisted connection profiles and tags.

## 10. Success criteria
- Agent can discover at least one local Postgres from Docker in target repo.
- Agent can introspect schema/tables without manual SQL.
- Agent can run read and write SQL successfully.
- Errors are actionable and do not leak secrets.
