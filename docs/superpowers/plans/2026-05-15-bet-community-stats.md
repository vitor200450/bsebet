# Bet Community Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the community betting distribution (% per team, as a split bar) after a user places their bets — in the review modal and on the /my-bets page.

**Architecture:** New `getMatchBetStats` server function returns aggregate counts/percentages per team. `getMyBets` is extended to batch-fetch stats alongside each bet. A new `BetSplitBar` component renders the visual bar. `MatchBetCard` and `SubmitBetsModal` are updated to consume it.

**Tech Stack:** TanStack Start server functions, Drizzle ORM, React 19, Tailwind CSS, react-i18next, TypeScript strict mode, Biome linter.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/web/src/server/bets.ts` | Modify | Add `BetStats` type + `getMatchBetStats` server fn |
| `apps/web/src/functions/get-my-bets.ts` | Modify | Batch-fetch `betStats` per bet, attach to return value |
| `apps/web/src/components/BetSplitBar.tsx` | Create | Split bar UI component |
| `apps/web/src/components/MatchBetCard.tsx` | Modify | Add optional `betStats` prop, render `BetSplitBar` in footer |
| `apps/web/src/routes/$lang/index.tsx` | Modify | Extend `SubmitBetsModal` to fetch stats on mount + render bet list with bars |
| `apps/web/src/routes/$lang/my-bets.tsx` | Modify | Pass `betStats` from `getMyBets` data to each `MatchBetCard` |
| `apps/web/src/locales/pt/betting.json` | Modify | Add `community.*` translation keys |
| `apps/web/src/locales/en/betting.json` | Modify | Add `community.*` translation keys |

---

## Task 1: Add `BetStats` type and `getMatchBetStats` server function

**Files:**
- Modify: `apps/web/src/server/bets.ts`

- [ ] **Step 1: Add the `BetStats` exported type** at the top of `apps/web/src/server/bets.ts`, right after the existing imports:

```ts
export type BetStats = {
	teamAId: number | null;
	teamBId: number | null;
	teamACount: number;
	teamBCount: number;
	teamAPercent: number;
	teamBPercent: number;
	totalCount: number;
};
```

- [ ] **Step 2: Add the `getMatchBetStats` server function** at the bottom of `apps/web/src/server/bets.ts`, before the final export line:

```ts
const getMatchBetStatsFn = createServerFn({ method: "GET" }).handler(
	async (ctx: any) => {
		const { db } = await import("@bsebet/db");
		const { matchId } = z.object({ matchId: z.number() }).parse(ctx.data);

		const match = await db.query.matches.findFirst({
			where: eq(matches.id, matchId),
			columns: { teamAId: true, teamBId: true },
		});

		const empty: BetStats = {
			teamAId: match?.teamAId ?? null,
			teamBId: match?.teamBId ?? null,
			teamACount: 0,
			teamBCount: 0,
			teamAPercent: 0,
			teamBPercent: 0,
			totalCount: 0,
		};

		if (!match?.teamAId || !match?.teamBId) return empty;

		const counts = await db
			.select({
				predictedWinnerId: bets.predictedWinnerId,
				count: sql<number>`count(*)::int`,
			})
			.from(bets)
			.where(eq(bets.matchId, matchId))
			.groupBy(bets.predictedWinnerId);

		let teamACount = 0;
		let teamBCount = 0;
		for (const row of counts) {
			if (row.predictedWinnerId === match.teamAId) teamACount = row.count;
			else if (row.predictedWinnerId === match.teamBId) teamBCount = row.count;
		}

		const totalCount = teamACount + teamBCount;
		const teamAPercent =
			totalCount > 0 ? Math.round((teamACount / totalCount) * 100) : 0;
		const teamBPercent = totalCount > 0 ? 100 - teamAPercent : 0;

		return {
			teamAId: match.teamAId,
			teamBId: match.teamBId,
			teamACount,
			teamBCount,
			teamAPercent,
			teamBPercent,
			totalCount,
		} satisfies BetStats;
	},
);

export const getMatchBetStats = getMatchBetStatsFn as unknown as (opts: {
	data: { matchId: number };
}) => Promise<BetStats>;
```

> **Note:** `matches` and `sql` are already imported at the top of `bets.ts` via `"@bsebet/db/schema"` and `"drizzle-orm"`. The `z` import from `"zod"` is also already present. Verify before adding any new imports.

- [ ] **Step 3: Run typecheck**

```powershell
bun run turbo -F web check-types
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```powershell
git add apps/web/src/server/bets.ts
git commit -m "feat: add BetStats type and getMatchBetStats server function"
```

---

## Task 2: Add `community.*` translation keys

**Files:**
- Modify: `apps/web/src/locales/pt/betting.json`
- Modify: `apps/web/src/locales/en/betting.json`

- [ ] **Step 1: Add keys to `apps/web/src/locales/pt/betting.json`** — insert the `"community"` block before the closing `}` of the JSON object (after the last key):

```json
"community": {
	"title": "Comunidade",
	"voted": "apostaram aqui",
	"noBets": "Nenhuma aposta ainda",
	"totalVotes_one": "{{count}} aposta no total",
	"totalVotes_other": "{{count}} apostas no total"
}
```

- [ ] **Step 2: Add keys to `apps/web/src/locales/en/betting.json`** — insert the `"community"` block before the closing `}`:

```json
"community": {
	"title": "Community",
	"voted": "voted here",
	"noBets": "No bets yet",
	"totalVotes_one": "{{count}} bet total",
	"totalVotes_other": "{{count}} bets total"
}
```

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/locales/pt/betting.json apps/web/src/locales/en/betting.json
git commit -m "feat: add community bet stats translation keys"
```

---

## Task 3: Create `BetSplitBar` component

**Files:**
- Create: `apps/web/src/components/BetSplitBar.tsx`

- [ ] **Step 1: Create the file** at `apps/web/src/components/BetSplitBar.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import type { BetStats } from "@/server/bets";

interface BetSplitBarProps {
	teamAName: string;
	teamBName: string;
	stats: BetStats;
	compact?: boolean;
}

export function BetSplitBar({
	teamAName,
	teamBName,
	stats,
	compact = false,
}: BetSplitBarProps) {
	const { t } = useTranslation("betting");

	const { teamAPercent, teamBPercent, totalCount } = stats;

	if (totalCount === 0) {
		return (
			<div className="w-full">
				{!compact && (
					<p className="mb-1 font-black text-[9px] text-gray-400 uppercase tracking-wider">
						{t("community.title")}
					</p>
				)}
				<div className="h-3 w-full rounded-sm border-2 border-black bg-gray-200 shadow-[2px_2px_0_0_#000]" />
				{!compact && (
					<p className="mt-1 text-center font-bold text-[9px] text-gray-400">
						{t("community.noBets")}
					</p>
				)}
			</div>
		);
	}

	return (
		<div className="w-full">
			{!compact && (
				<p className="mb-1 font-black text-[9px] text-gray-400 uppercase tracking-wider">
					{t("community.title")}
				</p>
			)}

			{/* Labels row */}
			<div className="mb-1 flex items-center justify-between">
				<span className="font-black text-[10px] text-[#2e5cff]">
					{teamAName} {teamAPercent}%
				</span>
				<span className="font-black text-[10px] text-[#ff2e2e]">
					{teamBPercent}% {teamBName}
				</span>
			</div>

			{/* Bar */}
			<div
				className={`relative w-full overflow-hidden rounded-sm border-2 border-black shadow-[2px_2px_0_0_#000] ${compact ? "h-3" : "h-5"}`}
			>
				<div
					className="absolute inset-y-0 left-0 bg-[#2e5cff] transition-[width] duration-[600ms] ease-out motion-reduce:transition-none"
					style={{ width: `${teamAPercent}%` }}
				/>
				<div
					className="absolute inset-y-0 right-0 bg-[#ff2e2e] transition-[width] duration-[600ms] ease-out motion-reduce:transition-none"
					style={{ width: `${teamBPercent}%` }}
				/>
			</div>

			{/* Total count */}
			{!compact && (
				<p className="mt-1 text-center font-bold text-[9px] text-gray-400">
					{t("community.totalVotes", { count: totalCount })}
				</p>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Run typecheck**

```powershell
bun run turbo -F web check-types
```

Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/components/BetSplitBar.tsx
git commit -m "feat: add BetSplitBar component"
```

---

## Task 4: Extend `MatchBetCard` with optional `betStats` prop

**Files:**
- Modify: `apps/web/src/components/MatchBetCard.tsx`

- [ ] **Step 1: Add import** at the top of `MatchBetCard.tsx`, alongside existing imports:

```ts
import type { BetStats } from "@/server/bets";
import { BetSplitBar } from "./BetSplitBar";
```

- [ ] **Step 2: Add `betStats` to the `MatchBetCardProps` interface** — insert after `className?: string`:

```ts
betStats?: BetStats;
```

- [ ] **Step 3: Destructure `betStats`** in the function signature — add it alongside `className`:

```ts
betStats,
```

- [ ] **Step 4: Render `BetSplitBar` in the footer** — the existing footer is at the bottom of the component, inside `{isFinished && !isProjected && (...)}`. Add a new section **outside and below** that footer block, before the closing `</div>` of the outer wrapper:

```tsx
{/* Community bet stats — shown whenever betStats is provided */}
{betStats && !isProjected && (
	<div className="border-black border-t-2 bg-[#fafafa] px-3 py-2">
		<BetSplitBar
			teamAName={teamA.name}
			teamBName={teamB.name}
			stats={betStats}
		/>
	</div>
)}
```

- [ ] **Step 5: Run typecheck**

```powershell
bun run turbo -F web check-types
```

Expected: no errors.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/components/MatchBetCard.tsx
git commit -m "feat: add betStats prop to MatchBetCard"
```

---

## Task 5: Extend `getMyBets` to batch-fetch bet stats

**Files:**
- Modify: `apps/web/src/functions/get-my-bets.ts`

- [ ] **Step 1: Add `BetStats` import** at the top of `get-my-bets.ts`, alongside existing imports:

```ts
import type { BetStats } from "@/server/bets";
```

- [ ] **Step 2: Add the batch-stats query** inside the handler, right before the final `return { stats, betsByTournament }` statement (around line 419). Insert this block:

```ts
// Batch-fetch community bet stats for all real bet matchIds (not synthetics)
const realBetMatchIds = rawUserBets.map((b) => b.matchId);
const betStatsMap = new Map<number, BetStats>();

if (realBetMatchIds.length > 0) {
	try {
		const { bets: betsTable } = await import("@bsebet/db/schema");
		const allBetCounts = await db
			.select({
				matchId: betsTable.matchId,
				predictedWinnerId: betsTable.predictedWinnerId,
				count: sql<number>`count(*)::int`,
			})
			.from(betsTable)
			.where(inArray(betsTable.matchId, realBetMatchIds))
			.groupBy(betsTable.matchId, betsTable.predictedWinnerId);

		// Group by matchId
		const countsByMatch = new Map<
			number,
			{ teamACount: number; teamBCount: number }
		>();

		for (const row of allBetCounts) {
			if (!row.matchId) continue;
			const matchRaw = betMatchesRaw.find((m) => m.id === row.matchId);
			if (!matchRaw) continue;

			if (!countsByMatch.has(row.matchId)) {
				countsByMatch.set(row.matchId, { teamACount: 0, teamBCount: 0 });
			}
			const entry = countsByMatch.get(row.matchId)!;
			if (row.predictedWinnerId === matchRaw.teamAId) {
				entry.teamACount = row.count;
			} else if (row.predictedWinnerId === matchRaw.teamBId) {
				entry.teamBCount = row.count;
			}
		}

		for (const matchRaw of betMatchesRaw) {
			const counts = countsByMatch.get(matchRaw.id) ?? {
				teamACount: 0,
				teamBCount: 0,
			};
			const totalCount = counts.teamACount + counts.teamBCount;
			const teamAPercent =
				totalCount > 0
					? Math.round((counts.teamACount / totalCount) * 100)
					: 0;
			betStatsMap.set(matchRaw.id, {
				teamAId: matchRaw.teamAId ?? null,
				teamBId: matchRaw.teamBId ?? null,
				teamACount: counts.teamACount,
				teamBCount: counts.teamBCount,
				teamAPercent,
				teamBPercent: totalCount > 0 ? 100 - teamAPercent : 0,
				totalCount,
			});
		}
	} catch (e) {
		console.error("[getMyBets] Failed to fetch bet stats", e);
		// non-fatal: betStatsMap stays empty, UI simply hides the bar
	}
}
```

- [ ] **Step 3: Attach `betStats` to each real bet** — find the `betsWithProjection` map (around line 305) and update it:

```ts
const betsWithProjection = userBets.map((bet) => ({
	...bet,
	match: allMatchesMap.get(bet.matchId) || bet.match,
	betStats: betStatsMap.get(bet.matchId),
}));
```

- [ ] **Step 4: Ensure synthetic bets do NOT get `betStats`** — find the `syntheticBets` array definition and confirm it does **not** include a `betStats` field (it shouldn't, since it's built separately). The `allBets` spread already merges `betsWithProjection` (with stats) and `syntheticBets` (without).

- [ ] **Step 5: Run typecheck**

```powershell
bun run turbo -F web check-types
```

Expected: no errors. If TypeScript complains about the `betStats` field not existing on the union type inside `TournamentGroup`, add `betStats?: BetStats` to the `BetWithRelations` type inference or use `as any` narrowly at the push site (line ~387: `tournamentMapProjected.get(t.id)!.bets.push(bet as any)`).

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/functions/get-my-bets.ts
git commit -m "feat: batch-fetch community bet stats in getMyBets"
```

---

## Task 6: Wire `betStats` into `/my-bets` page

**Files:**
- Modify: `apps/web/src/routes/$lang/my-bets.tsx`

- [ ] **Step 1: Pass `betStats` to `MatchBetCard`** — find the `<MatchBetCard ... />` render (around line 370) and add the new prop. The `bet` object from `getMyBets` now carries `betStats?`. Add after `isProjected={isProjected}`:

```tsx
betStats={
	isProjected ? undefined : (bet as any).betStats
}
```

> Using `(bet as any).betStats` is acceptable here since `getMyBets` return type inference is complex. If the type was properly propagated in Task 5, you can use `bet.betStats` directly.

- [ ] **Step 2: Run typecheck**

```powershell
bun run turbo -F web check-types
```

Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/routes/$lang/my-bets.tsx
git commit -m "feat: show community bet stats on /my-bets cards"
```

---

## Task 7: Add bet list with community stats to `SubmitBetsModal`

**Files:**
- Modify: `apps/web/src/routes/$lang/index.tsx`

The `SubmitBetsModal` component currently has no list of bets — just a title, description, and confirm/cancel buttons. This task adds:
1. A `matchBetStats` state that fetches stats for all pending bets when the modal opens
2. A scrollable list of bet summaries (team names + predicted score + compact `BetSplitBar`) above the buttons

- [ ] **Step 1: Add import for `getMatchBetStats` and `BetStats`** — find the top-level imports in `index.tsx`. Since `getMatchBetStats` is in `@/server/bets`, add a lazy import inside the `useEffect` (see Step 3). Add the type import at the top:

```ts
import type { BetStats } from "@/server/bets";
```

- [ ] **Step 2: Add `matchBetStats` state** inside `SubmitBetsModal`, right after the existing `useState` declarations for `status` and `errorMessage`:

```ts
const [matchBetStats, setMatchBetStats] = useState<Record<number, BetStats>>({});
```

- [ ] **Step 3: Fetch stats when modal mounts** — add this `useEffect` inside `SubmitBetsModal`, right after the existing `useEffect` that calls `onSuccess`:

```ts
useEffect(() => {
	const matchIds = Object.keys(predictions)
		.map(Number)
		.filter((id) => {
			const match = matchList.find((m: any) => m.id === id);
			return match && match.status !== "finished" && match.status !== "live";
		});

	if (matchIds.length === 0) return;

	let cancelled = false;

	(async () => {
		try {
			const { getMatchBetStats } = await import("@/server/bets");
			const results = await Promise.all(
				matchIds.map((id) => getMatchBetStats({ data: { matchId: id } })),
			);
			if (cancelled) return;
			const statsMap: Record<number, BetStats> = {};
			matchIds.forEach((id, i) => {
				if (results[i]) statsMap[id] = results[i];
			});
			setMatchBetStats(statsMap);
		} catch {
			// non-fatal — bars simply won't appear
		}
	})();

	return () => {
		cancelled = true;
	};
}, []); // intentionally empty — runs once on mount
```

- [ ] **Step 4: Add the bet list to the review modal JSX** — in the `return (...)` of `SubmitBetsModal` (the non-success state), find the paragraph `{t("review.description")}` and insert the following **after** that paragraph and **before** the error block:

```tsx
{/* Bet summary list with community stats */}
{Object.keys(predictions).length > 0 && (
	<div className="mb-6 w-full max-h-[40vh] overflow-y-auto space-y-3">
		{Object.entries(predictions).map(([matchIdStr, pred]) => {
			const matchId = Number(matchIdStr);
			const match = matchList.find((m: any) => m.id === matchId);
			if (!match || match.status === "live" || match.status === "finished")
				return null;
			if (matchDayStatus === "locked" && !editableRecoveryMatchIds.has(matchId))
				return null;

			const teamAName = match.teamA?.name ?? "Time A";
			const teamBName = match.teamB?.name ?? "Time B";
			const pickedTeamName =
				pred.winnerId === match.teamA?.id
					? teamAName
					: pred.winnerId === match.teamB?.id
						? teamBName
						: "?";
			const stats = matchBetStats[matchId];

			return (
				<div
					key={matchId}
					className="w-full rounded-sm border-2 border-black bg-[#fafafa] p-3 text-left shadow-[2px_2px_0_0_#000]"
				>
					<div className="mb-2 flex items-center justify-between">
						<span className="font-black text-[10px] text-gray-500 uppercase tracking-wider">
							{teamAName} vs {teamBName}
						</span>
						<span className="rounded-sm border border-black bg-[#ccff00] px-1.5 py-0.5 font-black text-[9px] text-black uppercase">
							{pickedTeamName}
						</span>
					</div>
					{stats && (
						<BetSplitBar
							teamAName={teamAName}
							teamBName={teamBName}
							stats={stats}
							compact
						/>
					)}
				</div>
			);
		})}
	</div>
)}
```

- [ ] **Step 5: Add `BetSplitBar` import** near the top of `index.tsx`, with the other component imports:

```ts
import { BetSplitBar } from "@/components/BetSplitBar";
```

- [ ] **Step 6: Run typecheck**

```powershell
bun run turbo -F web check-types
```

Expected: no errors.

- [ ] **Step 7: Run linter**

```powershell
bun run check
```

Expected: no errors. If Biome reorganizes imports, commit those changes too.

- [ ] **Step 8: Commit**

```powershell
git add apps/web/src/routes/$lang/index.tsx
git commit -m "feat: show community bet stats in SubmitBetsModal review"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full typecheck**

```powershell
bun run check-types
```

Expected: zero errors across all packages.

- [ ] **Step 2: Lint/format**

```powershell
bun run check
```

Expected: zero errors. Commit any auto-fixed formatting changes.

- [ ] **Step 3: Manual smoke test**
  1. Start dev server: `bun run dev:web`
  2. Log in and place bets on a match day
  3. Open the review modal — confirm the bet list appears with team names, picked team badge, and a compact split bar (or empty state if 0 bets exist)
  4. Confirm bets, navigate to `/my-bets`
  5. Verify each `MatchBetCard` shows the `BetSplitBar` at the bottom
  6. Verify synthetic/projected bets (negative IDs) do NOT show the bar
  7. Verify the bar renders correctly when one team has 0% (full bar one side)

- [ ] **Step 4: Final commit (if any cleanup needed)**

```powershell
git add -A
git commit -m "chore: final cleanup for community bet stats feature"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ `getMatchBetStats` server function → Task 1
- ✅ `BetStats` type → Task 1
- ✅ Translation keys → Task 2
- ✅ `BetSplitBar` component → Task 3
- ✅ `MatchBetCard` betStats prop → Task 4
- ✅ `getMyBets` extended → Task 5
- ✅ `/my-bets` wired → Task 6
- ✅ `SubmitBetsModal` review list + stats → Task 7
- ✅ Synthetic bets excluded → Task 5 Step 4 + Task 6 Step 1
- ✅ `totalCount === 0` empty state in bar → Task 3
- ✅ `compact` mode → Task 3 + used in Task 7
- ✅ Visibility structural enforcement → modal only shows for users with predictions; `/my-bets` only for authenticated users with bets
- ✅ Error handling silent swallow → Task 5 Step 2 (try/catch) + Task 7 Step 3 (try/catch)
- ✅ `prefers-reduced-motion` → Task 3 (motion-reduce:transition-none)

**Type consistency:** `BetStats` defined once in `bets.ts` and imported as a type everywhere else. `BetSplitBar` props use `stats: BetStats` (not individual fields) — consistent across Task 3, 4, 6, 7.
