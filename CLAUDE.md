# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BSEBET is an esports betting platform built with TanStack Start, featuring tournament bracket management, match betting, and an admin panel. The app uses a monorepo structure with Turborepo.

## Essential Commands

### Development
```bash
bun install                    # Install dependencies
bun run dev                    # Start all apps (web server on port 3001)
bun run dev:web                # Start only web app with env file
bun run build                  # Build all packages
bun run check-types            # Type check all packages
bun run check                  # Run Biome formatting and linting
```

### Database (Drizzle + PostgreSQL)
```bash
bun run db:push                # Push schema changes to database
bun run db:studio              # Open Drizzle Studio (database UI)
bun run db:generate            # Generate migration files
bun run db:migrate             # Run migrations
bun run db:seed                # Seed database with test data
```

### Deployment (Cloudflare via Alchemy)
```bash
cd apps/web && bun run alchemy dev    # Dev mode
cd apps/web && bun run deploy         # Deploy to Cloudflare
cd apps/web && bun run destroy        # Destroy deployment
```

## Architecture

### Monorepo Structure

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
│   └── config/                # Shared config (TypeScript, Biome)
```

### Data Flow Pattern

**Server Functions** are the primary backend pattern:
- Located in `apps/web/src/server/*.ts`
- Use `createServerFn()` from TanStack Start
- Direct database access via Drizzle
- Type-safe by default
- Examples: `getTournaments()`, `saveTournament()`, `getMatches()`

**tRPC** is available but minimally used (see `packages/api/src/routers/index.ts`). Prefer Server Functions for new backend logic.

### Database Schema Architecture

**Core entities** (in `packages/db/src/schema/index.ts`):
- `teams` - Team information (name, logo, region)
- `tournaments` - Tournament metadata with `stages` JSONB field for format config
- `tournamentTeams` - Many-to-many join table
- `matchDays` - Groups matches by date with betting status (`draft`, `open`, `locked`, `finished`)
- `matches` - Individual games with bracket navigation fields
- `bets` - User predictions with scoring

**Bracket System** - Three supported formats:
1. **Groups (GSL)**: `bracketSide: null` or `"groups"` - grid layout
2. **Single Elimination**: `bracketSide: "upper"` only - tree structure
3. **Double Elimination**: `bracketSide: "upper" | "lower" | "grand_final"` - dual brackets

Key bracket fields:
- `nextMatchWinnerId` / `nextMatchWinnerSlot` - winner progression
- `nextMatchLoserId` / `nextMatchLoserSlot` - loser bracket path
- `roundIndex` - bracket depth (0 = first round)
- `displayOrder` - vertical position within round

**Match Projection**: When users predict winners, the system automatically projects teams into future matches using the `next*` fields. This logic is implemented in multiple components (see `memory/MEMORY.md` for pattern).

### Authentication

Uses **Better-Auth** with:
- Email/Password + Google OAuth
- Drizzle adapter for PostgreSQL
- Session management via TanStack Start cookies
- Config: `packages/auth/src/index.ts`
- Auth schema: `packages/db/src/schema/auth.ts`

### Design System

**CRITICAL**: All UI must follow `DESIGN.md` at project root.
- Aesthetic: "Supercell Esports Official Broadcast" (Clean, Vector, Pop-Art)
- Background: `#e6e6e6` (paper texture)
- Team colors: Blue `#2e5cff`, Red `#ff2e2e`
- Accent: `#ccff00` (neon green for active states)
- Borders: `border-[3px] border-black` with comic shadows
- Typography: Inter (display), Geist Mono (data), Permanent Marker (handwritten)

**Active state pattern**:
```tsx
// Active button/toggle indicator
border-[3px] border-[#ccff00]
```

## Environment Variables

Required in `.env` at project root:
- `BETTER_AUTH_SECRET` - Auth signing key
- `BETTER_AUTH_URL` - Full app URL (e.g., http://localhost:3001)
- `CORS_ORIGIN` - Same as BETTER_AUTH_URL
- `DATABASE_URL` - PostgreSQL connection string (Neon)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth credentials

**Note**: `vite.config.ts` explicitly loads root `.env` and defines `process.env.*` for client-side access.

## Key Patterns

### Server Functions Type Safety

Server Functions return types need explicit casting due to TanStack Start limitations:

```typescript
const getTournamentFn = createServerFn({ method: "GET" })
  .handler(async (ctx: any) => { /* ... */ });

export const getTournament = getTournamentFn as unknown as (opts: {
  data: number;
}) => Promise<typeof tournaments.$inferSelect>;
```

### Routing

Uses **TanStack Router** with file-based routing:
- `apps/web/src/routes/index.tsx` - Home page
- `apps/web/src/routes/login.tsx` - Auth pages
- `apps/web/src/routes/admin/*.tsx` - Admin panel
- `apps/web/src/routeTree.gen.ts` - Auto-generated (do not edit)

Route context includes tRPC proxy and QueryClient (see `__root.tsx`).

### Component Organization

- **User-facing**: `apps/web/src/components/` - BettingCarousel, MatchCard, TournamentBracket
- **Admin-only**: `apps/web/src/components/admin/` - StageBuilder, BracketEditor, MatchModal
- **Validation**: `apps/web/src/utils/validators.ts` - Shared Zod schemas

## Admin Workflow

1. Create Tournament → Add Stages (StageBuilder) → Add Teams (TournamentTeamsManager)
2. Create Match Days (MatchDaysManager) with status control
3. Build Bracket (BracketEditor) - configure `nextMatch*` paths
4. Set Match Day to `open` to enable user betting
5. Update match results → System calculates points

## Tech Stack Notes

- **Runtime**: Bun (package manager + dev server)
- **Framework**: TanStack Start (SSR) + TanStack Router
- **Styling**: Tailwind CSS v4 with custom design tokens
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **Linting**: Biome (replaces ESLint + Prettier)
- **Deployment**: Cloudflare Workers via Alchemy
- **Icons**: lucide-react, Material Symbols

## Stitch UI Generation

This project uses Google Stitch for rapid UI prototyping:
1. Use `/enhance-prompt` skill to refine UI descriptions
2. Call `generate_screen_from_text` with `model_id: "GEMINI_3_PRO"` (never Flash)
3. Use `/react:components` skill to convert designs to code
4. Always set `device_type: "MOBILE"` or `"DESKTOP"` for responsive designs

See `.claude/rules/bsebet-project-rules.md` for detailed Stitch workflow.
