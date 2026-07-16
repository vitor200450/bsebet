# AGENTS.md

Guidance for coding agents working in `bsebet`.
Follow this file plus `DESIGN.md`.

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

### Monorepo layout

```
bsebet/
├── apps/
│   └── web/                   # TanStack Start app (SSR React)
│       ├── src/
│       │   ├── routes/        # File-based routing (TanStack Router)
│       │   ├── components/    # Shared UI components
│       │   │   └── admin/     # Admin-specific components
│       │   └── server/        # Server Functions (backend logic)
├── packages/
│   ├── api/                   # tRPC API layer (currently minimal)
│   ├── auth/                  # Better-Auth configuration
│   ├── db/                    # Drizzle ORM schema & queries
│   ├── env/                   # Environment variable validation
│   ├── config/                # Shared config (TypeScript, Biome)
│   └── infra/                 # Cloudflare / Alchemy deployment
```

### Database schema (core entities)

In `packages/db/src/schema/index.ts`:
- `teams` — name, logo, region
- `tournaments` — metadata with `stages` JSONB for format config
- `tournamentTeams` — many-to-many join
- `matchDays` — groups matches by date; betting status `draft` | `open` | `locked` | `finished`
- `matches` — individual games with bracket navigation fields
- `bets` — user predictions with scoring

### Bracket system

Three supported formats:
1. **Groups (GSL)**: `bracketSide: null` or `"groups"` — grid layout
2. **Single Elimination**: `bracketSide: "upper"` only — tree structure
3. **Double Elimination**: `bracketSide: "upper" | "lower" | "grand_final"` — dual brackets

Key fields: `nextMatchWinnerId` / `nextMatchWinnerSlot`, `nextMatchLoserId` / `nextMatchLoserSlot`, `roundIndex` (0 = first round), `displayOrder`.

**Match projection**: when users predict winners, teams are projected into future matches via the `next*` fields.

### Authentication

Better-Auth with email/password + Google OAuth, Drizzle adapter, session via TanStack Start cookies.
- Config: `packages/auth/src/index.ts`
- Auth schema: `packages/db/src/schema/auth.ts`

### Server Functions type-safety pattern

Return types often need an explicit cast wrapper due to TanStack Start limitations:

```typescript
const getTournamentFn = createServerFn({ method: "GET" })
  .handler(async (ctx: any) => { /* ... */ });

export const getTournament = getTournamentFn as unknown as (opts: {
  data: number;
}) => Promise<typeof tournaments.$inferSelect>;
```

### Component organization

- User-facing: `apps/web/src/components/` — BettingCarousel, MatchCard, TournamentBracket
- Admin-only: `apps/web/src/components/admin/` — StageBuilder, BracketEditor, MatchModal
- Validation: `apps/web/src/utils/validators.ts` — shared Zod schemas

### Admin workflow

1. Create Tournament → Add Stages (StageBuilder) → Add Teams (TournamentTeamsManager)
2. Create Match Days (MatchDaysManager) with status control
3. Build Bracket (BracketEditor) — configure `nextMatch*` paths
4. Set Match Day to `open` to enable user betting
5. Update match results → system calculates points

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
- Apply typography tokens per §11.2: `font-display` (Inter) for titles/buttons/team names; `font-body` (Geist Mono) for labels/metadata.
- Preserve existing Tailwind token usage (`brawl-*`, `paper`, `ink`, etc.) where present.

## 11.1) Text Contrast Guardrails (Critical)

**Most common bug:** `text-white` inherited from a dark parent onto a child with `bg-white` / `bg-paper` → invisible text. Treat as a blocking bug.

- Never rely on inherited text color on badges/cards/buttons with custom backgrounds.
- Always set explicit text color classes when setting background classes.
- **Prefer `surface-*` utilities** over separate `bg-*` + `text-*` (see `apps/web/src/index.css` and `DESIGN.md` §2.1):
  - Light: `surface-paper`, `surface-white`, `surface-tape`, `surface-lime`, `surface-yellow`
  - Dark: `surface-ink`, `surface-charcoal`, `surface-panel`, `surface-brawl-blue`, `surface-brawl-red`, `surface-bsen-red`
  - Hover: `hover-surface-lime`, `hover-surface-brawl-blue`, `hover-surface-brawl-red`, `hover-surface-bsen-red`, `hover-surface-white`
- Default-safe mappings when not using `surface-*`:
  - light backgrounds (`bg-white`, `bg-paper`, `bg-tape`, `bg-gray-*`, `bg-[#f0f0f0]`, `bg-[#e6e6e6]`, `bg-[#ffc700]`, `bg-[#ccff00]`, `bg-electric-lime`) → `text-black` or `text-ink`
  - dark/saturated backgrounds (`bg-black`, `bg-ink`, `bg-charcoal`, `bg-panel-gray`, `bg-[#121212]`, `bg-[#ff2e2e]`, `bg-brawl-red`, `bg-[#2e5cff]`, `bg-brawl-blue`, `bg-bsen-red`) → `text-white`
- **Nesting:** children inside `text-white` parents that get a light `bg-*` must reset `text-ink`/`text-black` on that child.
- For any UI edit touching buttons, pills, badges, tabs, or cards, verify hover/active states keep readable contrast (change bg AND text together).
- Before finishing: grep changed files for `text-white` (must be on dark bg) and `bg-white`/`bg-paper` (must have dark text on same element).
- If a style change introduces white text on light surfaces, treat it as a bug and fix before finishing.

## 11.2) Typography Guardrails (Critical)

**Most common bug:** agents use bare `font-bold` / `font-black` without `font-display` or `font-body` → generic Inter that looks flat and inconsistent.

### Token rules

| Token | Family | Use for |
| :--- | :--- | :--- |
| `font-display` | Inter Black | Page titles, section headings, buttons, tabs, **team names**, tournament names |
| `font-body` | Geist Mono | Form labels, metadata pills, badges, table headers, scores/IDs/slugs, admin search bars |

> CSS vars: `--font-display` = Inter, `--font-body` = Geist Mono. Always set the Tailwind utility on every styled text node.

### Copy-paste class patterns

- **Form label:** `font-bold font-body text-black text-xs uppercase tracking-widest`
- **Small label:** `font-bold font-body text-[10px] text-gray-500 uppercase tracking-widest`
- **Metadata pill:** `font-bold font-body text-[10px] uppercase tracking-widest`
- **Team name (bracket / match):** `font-black font-display uppercase italic tracking-tighter`
- **Section title:** `font-black font-display uppercase italic`
- **Button / tab:** `font-black font-display uppercase`
- **Admin header search:** `font-bold font-body uppercase tracking-widest placeholder:font-body`
- **Numbers:** add `font-body tabular-nums`

### Blocking mistakes

1. **Team names on Geist Mono** — bracket and match cards must use `font-display`, not `font-body`.
2. **Labels on Inter** — form labels and metadata pills must use `font-body tracking-widest`, not bare `font-bold`.
3. **Bare weight classes** — `font-bold text-sm uppercase` without `font-display`/`font-body` is forbidden on new/edited UI.
4. **`font-mono` on new code** — use `font-body` instead.

### Before finishing UI work

Grep changed files for `font-bold` / `font-black` and verify each has `font-display` or `font-body`. See `DESIGN.md` §3 and `design-system/MASTER.md` Typography.

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

Required in `.env` at project root:
- `BETTER_AUTH_SECRET` — auth signing key
- `BETTER_AUTH_URL` — full app URL (e.g. http://localhost:3001)
- `CORS_ORIGIN` — same as `BETTER_AUTH_URL`
- `DATABASE_URL` — PostgreSQL connection string (Neon)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth credentials

- Root `.env` is used by web dev script (`bun run dev:web`).
- `vite.config.ts` loads root `.env` and defines `process.env.*` for client-side access.
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

- 1. Read this file and relevant target files before editing.
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

## 20) File Editing — Tab Indentation (Critical)

All `.ts`, `.tsx`, `.json` files in this repo use **tabs** for indentation (Biome: `"indentStyle": "tab"`).

The `edit` tool matches `old_string` as literal bytes. The `read` tool output prefixes each line with a line-number and a tab separator — the actual file content starts **after** that tab. When you copy indentation from `read` output into `old_string`, you will get the wrong number of tabs and the match will fail silently.

### Rule: always use Python for multi-line edits in TSX/TS files

Prefer a `python` inline script via `exec` for any edit that touches indented JSX/TSX blocks:

```python
path = r"C:\...\file.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Build old/new using explicit \t for each tab level
old = '\t\t\t<div className="foo">\n\t\t\t\t<span>bar</span>\n\t\t\t</div>'
new = '\t\t\t<div className="foo">\n\t\t\t\t<span>baz</span>\n\t\t\t</div>'

if old in content:
    content = content.replace(old, new, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
```

Key points:
- Always open/write with `encoding="utf-8"` — the files contain Portuguese characters and emoji.
- Use `\t` explicitly for each tab level — never paste spaces.
- Use `replace(old, new, 1)` (not `re.sub`) to avoid regex escaping issues in JSX.
- Always check `if old in content` before replacing and print a diagnostic if not found.
- To find the exact indentation of a block, run `cat -A file | sed -n 'Np'` (shows `^I` for each tab).

### When the `edit` tool is safe to use

The `edit` tool works reliably for:
- Single-line changes (no indented block context needed)
- JSON files (indentation is consistent and shallow)
- Changes where `old_string` is short and unique enough to not require indentation matching

## 21) Stitch UI Generation

This project uses Google Stitch for rapid UI prototyping:
1. Use `/enhance-prompt` skill to refine UI descriptions
2. Call `generate_screen_from_text` with `model_id: "GEMINI_3_PRO"` (never Flash)
3. Use `/react:components` skill to convert designs to code
4. Always set `device_type: "MOBILE"` or `"DESKTOP"` for responsive designs

See `.claude/rules/bsebet-project-rules.md` for detailed Stitch workflow.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `vitor200450/bsebet` (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

