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

## 18) Design Context

### Users
Brazilian Brawl Stars esports fans — mostly young, mobile-first gamers who follow competitive tournaments. They visit BSEBET to predict match outcomes, climb leaderboards, and earn bragging rights within their community. Their context is social and time-sensitive: they check in before match days, make picks, then watch results roll in. The job to be done is **fast, confident prediction-making** with clear feedback on how they performed.

### Brand Personality
**Sharp, Competitive, Fun.**

- **Voice**: Direct, energetic, sporty — like a broadcast commentator who's also your friend. Portuguese (Brazil) is the primary language.
- **Tone**: Competitive hype mixed with playful fun. Every interaction should feel exciting but never stressful or manipulative. The app celebrates bold picks and rewards engagement.
- **Emotional goals**: Users should feel the arena energy of a live esports broadcast — the thrill of making a call, the tension of watching scores, the satisfaction of climbing the leaderboard. But it should always stay fun and approachable, never punishing.

### Aesthetic Direction
**Supercell Esports Official Broadcast** — Clean, Vector, Pop-Art, High Contrast.

- **Visual tone**: Bold comic-book broadcast overlay. Think sports TV lower-thirds meets pop-art poster. Thick black borders, hard comic shadows, skewed elements, paper textures, paint splatters.
- **References**: Brawl Stars Championship broadcast graphics, Supercell's official esports branding, Japanese sports manga score panels, retro American pop-art posters.
- **Anti-references**:
  - **No generic SaaS/corporate** — no bland dashboards, no gray-on-gray minimalism, no "enterprise" feel.
  - **No casino/gambling dark patterns** — no flashing gold, no slot-machine vibes, no manipulative urgency. This is prediction, not gambling.
  - **No overly childish/cartoonish** — playful is fine, but don't cross into kindergarten territory. Keep it sharp.
- **Theme**: Light mode only. Paper (`#f0f0f0`) background with cream texture. Team duality expressed through Brawl Blue (`#2e5cff`) vs Brawl Red (`#ff2e2e`). Neon Green (`#ccff00`) for active/selected states. Brawl Yellow (`#ffc700`) for highlights and badges.
- **Motion**: Framer Motion for entrance animations, hover lifts, and tactile button presses. Keep animations snappy (200-600ms). Respect `prefers-reduced-motion`.

### Design Principles

1. **Broadcast Energy** — Every screen should feel like tuning into a live esports broadcast. Bold typography, high contrast, dynamic layouts with skewed elements and comic shadows. The UI IS the show.
2. **Clarity Under Pressure** — Users make time-sensitive decisions. Information hierarchy must be razor-sharp: team names, scores, and pick status should be instantly scannable. Never sacrifice readability for style.
3. **Tactile Feedback** — Every interaction should feel physical. Buttons press down with comic shadow shifts, cards lift on hover, selections snap with neon green borders. The interface should feel like touching a real broadcast control surface.
4. **Celebrate the Pick** — The core action is making a prediction. Make it feel significant — saved picks get badges, correct picks get satisfying point animations, leaderboard positions feel earned. Reward engagement visually.
5. **Contrast is Non-Negotiable** — Text must always be readable against its background. Light surfaces get dark text, dark/saturated surfaces get white text. No exceptions. Every badge, pill, button, and card must have explicit text color paired with its background. See `DESIGN.md` mandatory contrast rules.

## 19) i18n / Translation Rules (Critical)

BSEBET uses **react-i18next** with URL-path-prefix language detection (`/pt/` and `/en/`). Every user-facing string MUST use a `t()` call — hardcoded strings will appear in the wrong language.

### Architecture

- **Library:** `react-i18next` + `i18next`
- **Language detection:** URL path prefix (`/$lang/`) via TanStack Router segment
- **Provider:** `I18nRootProvider` in `__root.tsx` initializes i18next with the correct language from the URL
- **Routes:** All routes live under `routes/$lang/*` (e.g. `$lang/dashboard.tsx`, `$lang/admin/teams.tsx`)
- **Config:** `apps/web/src/i18n/config.ts` loads all JSON translation files statically
- **Init:** `apps/web/src/i18n/I18nRootProvider.tsx` — initializes i18next with the language from the URL

### How to translate

**In React components (client-side):**
```tsx
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation("myNamespace");
  return <h1>{t("myKey")}</h1>;
}
```

**For cross-namespace references:**
```tsx
t("common:actions.cancel")  // references common.json > actions > cancel
```

**In server functions (server-side, no React):**
```tsx
import { createServerT } from "@/i18n";

const t = createServerT(input.lang);
throw new Error(t("errors:unauthenticated"));
```

### Namespace organization

Translation files live in `apps/web/src/locales/{pt,en}/`:

| Namespace | File | Content |
|-----------|------|---------|
| `common` | `common.json` | Nav, buttons, status labels, shared actions |
| `betting` | `betting.json` | Betting carousel, match cards, recovery flow |
| `dashboard` | `dashboard.json` | Dashboard page |
| `my-bets` | `my-bets.json` | My bets page |
| `leaderboard` | `leaderboard.json` | Leaderboard page |
| `profile` | `profile.json` | Profile page + user menu |
| `tournament` | `tournament.json` | Tournament listing, bracket, podium, match day selector |
| `team` | `team.json` | Team detail page |
| `user` | `user.json` | Public user profile |
| `landing` | `landing.json` | Landing page + login |
| `admin` | `admin.json` | Admin tournaments, teams, compensations |
| `admin-matches` | `admin-matches.json` | Match builder, bracket editor, stage builder, live scoring |
| `errors` | `errors.json` | Server error messages |
| `validation` | `validation.json` | Zod validation messages |

### Golden rules (NEVER break these)

1. **NEVER hardcode user-facing strings.** Every text label, button, heading, tooltip, toast message, placeholder, and error message MUST use `t()`.
2. **Always add keys to BOTH `pt/` and `en/` JSON files.** A missing key means one language shows the raw key string (e.g. `"hero.title"`) instead of translated text.
3. **Use the correct namespace.** Check what `useTranslation("ns")` the file uses. If the key is in a different namespace, prefix it (e.g. `t("common:actions.save")`).
4. **Use cross-namespace for shared strings.** Don't duplicate keys. Reference `common:actions.cancel` instead of adding "cancel" to every namespace.
5. **Handle plurals.** i18next uses `_one`/`_other` suffixes:
   ```json
   { "betCount_one": "{{count}} palpite", "betCount_other": "{{count}} palpites" }
   ```
   ```tsx
   t("betCount", { count: bets.length })
   ```
6. **Never put HTML in translation values.** Use two separate `t()` calls for split text with markup:
   ```tsx
   // GOOD
   <span>{t("title")} <span className="highlight">{t("titleHighlight")}</span></span>
   // BAD (don't put <span> inside JSON)
   ```

### Navigation with language prefix

Use `useLangLink().routeTo()` for navigation inside the app:
```tsx
import { useLangLink } from "@/i18n/useLangLink";

const { routeTo } = useLangLink();
// <Link {...routeTo("/dashboard")}>Dashboard</Link>
```

This preserves the `/$lang` prefix and enables proper active-link highlighting.

### Date formatting

Always use the current language's locale:
```tsx
const { i18n } = useTranslation();
const locale = i18n.language === "pt" ? "pt-BR" : "en-US";
date.toLocaleDateString(locale, { day: "2-digit", month: "short" });
```

### Before submitting any PR

1. Search for Portuguese-specific characters (`ã`, `ç`, `ê`, etc.) in your changed files to catch missed hardcoded strings
2. Verify both `/pt/` and `/en/` routes render correctly
3. Run `bun run build` to catch missing imports or broken references
4. Add new keys to JSON files BEFORE using them in `t()` calls
