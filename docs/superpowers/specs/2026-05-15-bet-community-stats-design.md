# Bet Community Stats — Design Spec
**Date:** 2026-05-15  
**Status:** Approved

## Overview

Show users the community betting distribution (% per team) for each match **after** they have already placed their bet. This preserves prediction integrity — users who haven't bet yet never see the distribution.

The feature surfaces in two places:
1. **Modal de revisão** (`SubmitBetsModal`, states `idle` / `error`) — shown when the user opens the review screen before confirming bets
2. **`/my-bets` page** — shown on each `MatchBetCard` for already-registered bets

---

## Shared Type

```ts
// apps/web/src/server/bets.ts (co-located with server functions)
type BetStats = {
  teamAId: number | null
  teamBId: number | null
  teamACount: number
  teamBCount: number
  teamAPercent: number  // 0–100, rounded integer
  teamBPercent: number  // always sums to 100 when totalCount > 0
  totalCount: number
}
```

`teamAPercent + teamBPercent === 100` is guaranteed server-side by rounding one value and deriving the other as `100 - teamAPercent`.

---

## Server Layer

### New: `getMatchBetStats`
**File:** `apps/web/src/server/bets.ts`

```ts
getMatchBetStats({ data: { matchId: number } }): Promise<BetStats>
```

- Queries `bets` table grouped by `predictedWinnerId` for the given `matchId`
- Fetches match `teamAId` / `teamBId` to correctly assign counts
- No authentication required (counts are public aggregates; visibility is enforced structurally by callers)
- Returns `{ teamAId, teamBId, teamACount: 0, teamBCount: 0, teamAPercent: 0, teamBPercent: 0, totalCount: 0 }` when match has no bets

### Extended: `getMyBets`
**File:** `apps/web/src/functions/get-my-bets.ts` (or wherever it lives)

Each bet object in the returned array gains a `betStats: BetStats` field. This is computed server-side via a single additional aggregation query over all `matchId`s in the result set — no N+1, no extra client requests.

```ts
// Pseudocode — single batch query added at end of getMyBets handler
const betCounts = await db
  .select({ matchId, predictedWinnerId, count })
  .from(bets)
  .where(inArray(bets.matchId, allMatchIds))
  .groupBy(bets.matchId, bets.predictedWinnerId)

// Map into BetStats per matchId and attach to each bet
```

---

## UI Layer

### New Component: `BetSplitBar`
**File:** `apps/web/src/components/BetSplitBar.tsx`

Props:
```ts
interface BetSplitBarProps {
  teamAName: string
  teamBName: string
  teamAPercent: number
  teamBPercent: number
  totalCount: number
  compact?: boolean  // true → smaller height, used in modal review rows
}
```

Visual structure (default / full size):
```
COMUNIDADE
[TEAM A — 65%] ████████████████░░░░░░░░ [35% — TEAM B]
               X apostas no total
```

- Outer wrapper: `border-2 border-black rounded-sm shadow-[2px_2px_0_0_#000]`
- Left fill: `bg-[#2e5cff]` (brawl-blue), right fill: `bg-[#ff2e2e]` (brawl-red)
- Width driven by inline style `width: ${teamAPercent}%` with CSS `transition: width 600ms ease-out`
- `@media (prefers-reduced-motion: reduce)` → no transition
- When `totalCount === 0`: renders a single gray bar with label "Nenhuma aposta ainda" / "No bets yet"
- `compact` mode: bar height `h-3` (vs default `h-5`), labels hidden, only percentages shown inline

### `MatchBetCard` changes
**File:** `apps/web/src/components/MatchBetCard.tsx`

Add optional prop:
```ts
betStats?: BetStats
```

When `betStats` is present, render `BetSplitBar` inside the footer section (below the points/badges row), separated by a `border-t-2 border-black/10`.

The caller (`/my-bets`) passes `betStats` when available; `dashboard.tsx` passes nothing (no change to that page).

### `SubmitBetsModal` changes
**File:** `apps/web/src/routes/$lang/index.tsx`

When the modal mounts (status `idle`), fire a `Promise.all(matchIds.map(id => getMatchBetStats({ data: { matchId: id } })))` and store results in local state:

```ts
const [matchBetStats, setMatchBetStats] = useState<Record<number, BetStats>>({})
```

Each bet row in the review list renders a `BetSplitBar` (compact mode) below the team names/prediction. Stats load async — rows render without the bar first, then it appears once loaded (no loading spinner needed; the bar simply fades in).

---

## Translations

### `apps/web/src/locales/pt/betting.json`
```json
"community": {
  "title": "Comunidade",
  "voted": "apostaram aqui",
  "noBets": "Nenhuma aposta ainda",
  "totalVotes": "{{count}} aposta no total",
  "totalVotes_plural": "{{count}} apostas no total"
}
```

### `apps/web/src/locales/en/betting.json`
```json
"community": {
  "title": "Community",
  "voted": "voted here",
  "noBets": "No bets yet",
  "totalVotes": "{{count}} bet total",
  "totalVotes_plural": "{{count}} bets total"
}
```

---

## Visibility / Security

- **No schema changes.** No new columns in `bets` table.
- **No server-side auth guard on `getMatchBetStats`.** The aggregate counts are not sensitive. Visibility is enforced structurally: the two surfaces that render the stats are only reachable by authenticated users who already have a bet for that match.
- If in the future a stricter guard is needed, `getMatchBetStats` can check session + existing bet in one query.

---

## Error Handling

- `getMatchBetStats` failures are swallowed silently in the modal — the bet row renders without the split bar. No toast.
- `getMyBets` stats computation failure falls back to `betStats: undefined` per bet — `MatchBetCard` simply doesn't render the bar.

---

## Files Changed Summary

| File | Change |
|---|---|
| `apps/web/src/server/bets.ts` | Add `getMatchBetStats` server function + `BetStats` type |
| `apps/web/src/functions/get-my-bets.ts` | Extend return type + batch-fetch `betStats` per bet |
| `apps/web/src/components/BetSplitBar.tsx` | New component |
| `apps/web/src/components/MatchBetCard.tsx` | Add optional `betStats` prop + render `BetSplitBar` in footer |
| `apps/web/src/routes/$lang/index.tsx` | Extend `SubmitBetsModal` to fetch stats on mount + render compact bars |
| `apps/web/src/routes/$lang/my-bets.tsx` | Pass `betStats` from `getMyBets` data to each `MatchBetCard` |
| `apps/web/src/locales/pt/betting.json` | Add `community.*` keys |
| `apps/web/src/locales/en/betting.json` | Add `community.*` keys |
