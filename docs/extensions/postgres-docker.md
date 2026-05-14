# Postgres Docker Extension

## Overview
Automatically discovers local PostgreSQL databases running in Docker containers (via docker-compose) or configured in `.env` files, and exposes them as tools to the LLM.

## Installation

### Global (recommended)
```bash
ln -s "$PWD/extensions/postgres-docker" ~/.pi/agent/extensions/postgres-docker
```

### Project-local
```bash
ln -s "$PWD/extensions/postgres-docker" .pi/extensions/postgres-docker
```

Or symlink just the entrypoint:
```bash
ln -s "$PWD/extensions/postgres-docker/src/index.ts" ~/.pi/agent/extensions/postgres-docker.ts
```

Then run `/reload` in pi or restart.

## Tools

| Tool | Description |
|------|-------------|
| `db_list_connections` | List all discovered + manual connections |
| `db_select_connection` | Set active connection by name |
| `db_introspect` | Show schemas, tables, and columns |
| `db_query` | Execute arbitrary SQL (read/write) |
| `db_healthcheck` | Test connectivity (`SELECT 1`) |
| `db_refresh_discovery` | Re-read compose/.env files for connections |

## How discovery works

1. **Docker Compose** — Scans `docker-compose.yml`, `docker-compose.yaml`, `compose.yml`, `compose.yaml` in the project root. Services with `image: postgres*` are detected; mapped ports, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` are extracted.
2. **Environment files** — Scans `.env`, `.env.local`, `.env.development`. Supports `DATABASE_URL` (PostgreSQL connection strings) and individual `PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`/`PGPASSWORD` variables.
3. **Manual config** — Future: extend `config.ts` to load from `~/.pi/config.json` or project `.pi/config.json` for connection overrides.

### Precedence
Manual connections override discovered connections with the same name. Auto-selection: if only one connection exists, it becomes active automatically.

## Safety notes
- Write queries execute without confirmation gates.
- Avoid destructive SQL (`DROP`, `TRUNCATE`, etc.) on shared databases.
- The extension never logs plaintext passwords.

## Development

```bash
# Install deps
bun install

# Run unit tests (no Docker required)
bun test

# Run integration tests (requires Docker)
docker compose -f tests/integration/fixtures/docker-compose.yml up -d
bun test tests/integration/
```
