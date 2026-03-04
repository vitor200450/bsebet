# AGENTS.md

Guidance for coding agents working in `bsebet`.
Follow this file plus `CLAUDE.md` and `DESIGN.md`.

## 1) Repository Snapshot

- Monorepo managed by Turborepo + Bun workspaces.
- Main app: `apps/web` (TanStack Start + TanStack Router + React 19).
- Shared packages: `packages/db`, `packages/auth`, `packages/api`, `packages/env`, `packages/config`.
- Database: PostgreSQL + Drizzle ORM.
- Lint/format: Biome.
- Deployment target: Cloudflare (Alchemy).

## 2) Setup And Core Commands

- Install dependencies: `bun install`
- Run all dev tasks: `bun run dev`
- Run only web app with root env file: `bun run dev:web`
- Build all packages/apps: `bun run build`
- Typecheck all packages/apps: `bun run check-types`
- Format + lint (writes fixes): `bun run check`

## 3) Package-Scoped Commands (Useful For Faster Iteration)

- Run web app only: `bun run turbo -F web dev`
- Build web app only: `bun run turbo -F web build`
- Typecheck web app only: `bun run turbo -F web check-types`
- Run DB push task only: `bun run turbo -F @bsebet/db db:push`
- Run infra deploy task only: `bun run turbo -F @bsebet/infra deploy`

## 4) Database Commands

- Push schema: `bun run db:push`
- Generate migrations: `bun run db:generate`
- Apply migrations: `bun run db:migrate`
- Open Drizzle Studio: `bun run db:studio`
- Seed database: `bun run db:seed`
- Production env variants exist (`*:prod` scripts in root `package.json`).

## 5) Test Commands (Important)

- Current state: there is no dedicated `test` script at root or package level.
- Current state: no committed `*.test.*` or `*.spec.*` files were found.
- For Bun tests, use Bun directly:
- Run all tests discovered by Bun: `bun test`
- Run a single test file: `bun test path/to/file.test.ts`
- Run one test by name pattern: `bun test path/to/file.test.ts -t "case name"`
- If tests are added under `apps/web`, run from repo root with explicit path, or run from package cwd.
- Example (explicit path): `bun test apps/web/src/components/example.test.tsx`
- Example (package cwd): `bun --cwd apps/web test src/components/example.test.tsx`

## 6) Build/Lint/Typecheck Expectations Before Finishing Work

- Minimum for most code changes:
- `bun run check-types`
- `bun run check`
- `bun run build` for changes that may affect bundling/runtime.
- Since `bun run check` writes files, re-run typecheck after large autofix passes.

## 7) Architecture And Data Flow Rules

- Prefer TanStack Start Server Functions for backend logic in `apps/web/src/server/*.ts`.
- tRPC exists but is minimal; do not introduce new tRPC surfaces unless needed.
- Access DB via Drizzle and shared schema from `@bsebet/db` and `@bsebet/db/schema`.
- Keep route logic in file-based routes under `apps/web/src/routes`.
- Do not edit generated router file: `apps/web/src/routeTree.gen.ts`.

## 8) Formatting And Import Rules

- Biome is the formatter/linter source of truth (`biome.json`).
- Indentation uses tabs.
- JS/TS strings use double quotes.
- Keep trailing commas where formatter applies them.
- Let Biome organize imports; do not hand-optimize import order.
- Prefer workspace/path aliases where configured (`@/*`, `@bsebet/*`).
- Keep imports value-first and use `import type` for type-only imports when possible.

## 9) TypeScript Rules

- Strict mode is enabled; keep code fully type-safe.
- Avoid `any`; if unavoidable, isolate and narrow quickly.
- Use Zod to validate external/input data at boundaries.
- Prefer explicit return types on exported utilities and server functions.
- Respect `noUnusedLocals`, `noUnusedParameters`, and `noUncheckedIndexedAccess`.
- Do not bypass type errors with broad casts unless forced by framework limitations.
- Known pattern: some Server Functions require cast wrappers for call-site typing.

## 10) Naming Conventions

- Components: PascalCase file and symbol names (for example `TournamentSelector.tsx`).
- Utilities/helpers: camelCase function names.
- Constants: UPPER_SNAKE_CASE only for true constants.
- DB/schema fields: follow existing Drizzle schema naming.
- Route files: follow TanStack file-based conventions (`index.tsx`, `$param.tsx`, nested dirs).
- Server function files: resource-oriented names (`tournaments.ts`, `matches.ts`, `bets.ts`).

## 11) React And UI Conventions

- Keep components functional and hook-based.
- Prefer derived state (`useMemo`) over duplicating source-of-truth state.
- Keep side effects in `useEffect` with clean dependencies.
- Reuse existing UI primitives under `apps/web/src/components/ui`.
- Follow design language from `DESIGN.md` (broadcast/comic style, bold borders/shadows).
- Preserve existing Tailwind token usage (`brawl-*`, `paper`, `ink`, etc.) where present.

## 11.1) Text Contrast Guardrails (Critical)

- Never rely on inherited text color on badges/cards/buttons with custom backgrounds.
- Always set explicit text color classes when setting background classes.
- Default-safe mappings:
  - light backgrounds (`bg-white`, `bg-gray-*`, `bg-[#f0f0f0]`, `bg-[#e6e6e6]`, `bg-[#ffc700]`, `bg-[#ccff00]`) -> `text-black`
  - dark/saturated backgrounds (`bg-black`, `bg-[#121212]`, `bg-[#ff2e2e]`, `bg-[#2e5cff]`) -> `text-white`
- For any UI edit touching buttons, pills, badges, tabs, or cards, verify hover/active states keep readable contrast.
- If a style change introduces white text on light surfaces, treat it as a bug and fix before finishing.

## 12) Error Handling And Logging

- Validate input early with Zod and fail fast with clear messages.
- In server logic, throw errors for invalid state rather than silently returning wrong data.
- Use `try/catch` around external I/O (storage, external APIs, destructive DB chains).
- Log actionable context in errors (`console.error("context", error)`).
- Avoid swallowing errors; either rethrow or return typed error objects consistently.
- Never leak secrets or full credentials in logs.

## 13) Data And DB Safety

- For destructive operations, delete dependents in FK-safe order (see tournament deletion patterns).
- Prefer transactions for multi-step writes that must be atomic.
- Keep migrations and schema updates aligned; avoid ad-hoc production mutations.
- Use package scripts for migrations and schema operations instead of custom one-offs.

## 14) Environment And Secrets

- Required env vars are documented in `CLAUDE.md`.
- Root `.env` is used by web dev script (`bun run dev:web`).
- Do not commit secrets or copy real credential values into docs/logs.

## 15) Git And Change Hygiene For Agents

- Make focused edits; avoid broad unrelated refactors.
- Do not revert unrelated user changes in a dirty worktree.
- Avoid editing generated files unless regeneration is part of the task.
- If formatting changes are extensive, mention that `bun run check` applied them.

## 16) Cursor/Copilot Rule Files Check

- Checked for `.cursor/rules/**`, `.cursorrules`, and `.github/copilot-instructions.md`.
- None were found in this repository at time of writing.
- If these files are added later, treat them as high-priority agent instructions and update this file.

## 17) Practical Agent Workflow (Recommended)

- 1. Read `CLAUDE.md` and relevant target files before editing.
- 2. Implement minimal, typed changes following existing patterns.
- 3. Run `bun run check-types`.
- 4. Run `bun run check`.
- 5. Run targeted command(s) for affected area (and `bun run build` when needed).
- 6. Summarize changed files, risks, and any follow-up verification steps.
