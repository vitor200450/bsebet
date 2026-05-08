# Tournament Status Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block any admin action that starts a match or records a real result while the parent tournament is still `upcoming`, without auto-promoting the tournament to `active`.

**Architecture:** Add one focused server-side guard module that computes whether a proposed match mutation represents a real match start, and reuse it from every server function that can write competitive match state. Then surface the guard cleanly in admin UI by translating the error, disabling risky controls when the tournament is `upcoming`, and preserving backend enforcement as the source of truth.

**Tech Stack:** Bun test, TanStack Start server functions, React 19, react-i18next, Sonner, Drizzle ORM, TypeScript

---

## File Map

- Create: `apps/web/src/server/tournament-status-guard.ts`
  - Pure server-side domain guard for tournament/match consistency.
- Create: `apps/web/src/server/tournament-status-guard.test.ts`
  - Bun unit tests for the guard logic and error semantics.
- Modify: `apps/web/src/server/matches.ts`
  - Call the guard from all write paths that can create started/finished/result-bearing matches.
- Modify: `apps/web/src/components/admin/MatchModal.tsx`
  - Surface backend guard failures in the match editor/create modal with translated, specific toasts.
- Modify: `apps/web/src/routes/$lang/admin/live/$matchId.tsx`
  - Show guard failure toasts and disable competitive actions when the tournament is `upcoming`.
- Modify: `apps/web/src/routes/$lang/admin/tournaments/$tournamentId/matches.tsx`
  - Disable entry points like "Set Result" and live control when tournament status is `upcoming`.
- Modify: `apps/web/src/locales/pt/admin-matches.json`
  - Add PT-BR copy for guard toasts and disabled-state hints.
- Modify: `apps/web/src/locales/en/admin-matches.json`
  - Add EN copy matching the PT-BR keys.

---

### Task 1: Add the reusable tournament status guard

**Files:**
- Create: `apps/web/src/server/tournament-status-guard.ts`
- Test: `apps/web/src/server/tournament-status-guard.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import {
	TOURNAMENT_UPCOMING_CANNOT_START_MATCH,
	TournamentUpcomingCannotStartMatchError,
	assertTournamentAllowsMatchMutation,
	type MatchMutationSnapshot,
} from "./tournament-status-guard";

const baseState: MatchMutationSnapshot = {
	currentTournamentStatus: "upcoming",
	currentMatchStatus: "scheduled",
	nextMatchStatus: "scheduled",
	currentWinnerId: null,
	nextWinnerId: null,
	currentScoreA: 0,
	nextScoreA: 0,
	currentScoreB: 0,
	nextScoreB: 0,
};

describe("tournament status guard", () => {
	it("throws when an upcoming tournament match is moved to live", () => {
		expect(() =>
			assertTournamentAllowsMatchMutation({
				...baseState,
				nextMatchStatus: "live",
			}),
		).toThrow(TOURNAMENT_UPCOMING_CANNOT_START_MATCH);
	});

	it("throws when an upcoming tournament receives a winner", () => {
		expect(() =>
			assertTournamentAllowsMatchMutation({
				...baseState,
				nextWinnerId: 10,
			}),
		).toThrow(TournamentUpcomingCannotStartMatchError);
	});

	it("throws when an upcoming tournament receives a non-zero score", () => {
		expect(() =>
			assertTournamentAllowsMatchMutation({
				...baseState,
				nextScoreA: 1,
			}),
		).toThrow(TOURNAMENT_UPCOMING_CANNOT_START_MATCH);
	});

	it("allows neutral scheduled edits for upcoming tournaments", () => {
		expect(() =>
			assertTournamentAllowsMatchMutation({
				...baseState,
				nextScoreA: 0,
				nextScoreB: 0,
			}),
		).not.toThrow();
	});

	it("allows competitive changes when tournament is active", () => {
		expect(() =>
			assertTournamentAllowsMatchMutation({
				...baseState,
				currentTournamentStatus: "active",
				nextMatchStatus: "finished",
				nextWinnerId: 20,
				nextScoreA: 3,
				nextScoreB: 1,
			}),
		).not.toThrow();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --cwd apps/web test src/server/tournament-status-guard.test.ts`

Expected: FAIL with module-not-found or export-not-found errors for `./tournament-status-guard`.

- [ ] **Step 3: Write the minimal implementation**

```ts
export const TOURNAMENT_UPCOMING_CANNOT_START_MATCH =
	"TOURNAMENT_UPCOMING_CANNOT_START_MATCH";

export class TournamentUpcomingCannotStartMatchError extends Error {
	code = TOURNAMENT_UPCOMING_CANNOT_START_MATCH;

	constructor() {
		super(TOURNAMENT_UPCOMING_CANNOT_START_MATCH);
		this.name = "TournamentUpcomingCannotStartMatchError";
	}
}

export interface MatchMutationSnapshot {
	currentTournamentStatus: "upcoming" | "active" | "finished";
	currentMatchStatus: "scheduled" | "live" | "finished" | null;
	nextMatchStatus: "scheduled" | "live" | "finished" | null;
	currentWinnerId: number | null;
	nextWinnerId: number | null;
	currentScoreA: number | null;
	nextScoreA: number | null;
	currentScoreB: number | null;
	nextScoreB: number | null;
}

function isPositiveScore(value: number | null): boolean {
	return typeof value === "number" && value > 0;
}

function isCompetitiveState(snapshot: MatchMutationSnapshot): boolean {
	return (
		snapshot.nextMatchStatus === "live" ||
		snapshot.nextMatchStatus === "finished" ||
		snapshot.nextWinnerId !== null ||
		isPositiveScore(snapshot.nextScoreA) ||
		isPositiveScore(snapshot.nextScoreB)
	);
}

export function assertTournamentAllowsMatchMutation(
	snapshot: MatchMutationSnapshot,
): void {
	if (snapshot.currentTournamentStatus !== "upcoming") {
		return;
	}

	if (!isCompetitiveState(snapshot)) {
		return;
	}

	throw new TournamentUpcomingCannotStartMatchError();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun --cwd apps/web test src/server/tournament-status-guard.test.ts`

Expected: PASS with 5 passing tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/tournament-status-guard.ts apps/web/src/server/tournament-status-guard.test.ts
git commit -m "test: add tournament status guard domain checks"
```

---

### Task 2: Enforce the guard in every competitive match write path

**Files:**
- Modify: `apps/web/src/server/matches.ts`
- Reuse: `apps/web/src/server/tournament-status-guard.ts`
- Test: `apps/web/src/server/tournament-status-guard.test.ts`

- [ ] **Step 1: Extend the failing test with payload-to-next-state coverage**

```ts
it("treats finished status plus winner as competitive state", () => {
	expect(() =>
		assertTournamentAllowsMatchMutation({
			...baseState,
			nextMatchStatus: "finished",
			nextWinnerId: 99,
			nextScoreA: 3,
			nextScoreB: 1,
		}),
	).toThrow(TOURNAMENT_UPCOMING_CANNOT_START_MATCH);
});

it("treats live score increments as competitive state", () => {
	expect(() =>
		assertTournamentAllowsMatchMutation({
			...baseState,
			nextMatchStatus: "live",
			nextScoreA: 1,
		}),
	).toThrow(TOURNAMENT_UPCOMING_CANNOT_START_MATCH);
});
```

- [ ] **Step 2: Run test to verify the new assertions fail if the helper is too weak**

Run: `bun --cwd apps/web test src/server/tournament-status-guard.test.ts`

Expected: PASS if Task 1 already covered this correctly; if it fails, fix the helper before touching `matches.ts`.

- [ ] **Step 3: Add a small helper inside `matches.ts` that loads tournament status and asserts the next state before writing**

```ts
import {
	assertTournamentAllowsMatchMutation,
	TournamentUpcomingCannotStartMatchError,
} from "./tournament-status-guard";

async function assertTournamentStatusBeforeMatchWrite(params: {
	db: any;
	matchId?: number;
	tournamentId?: number | null;
	next: {
		status: "scheduled" | "live" | "finished" | null;
		winnerId: number | null;
		scoreA: number | null;
		scoreB: number | null;
	};
	current?: {
		status: "scheduled" | "live" | "finished" | null;
		winnerId: number | null;
		scoreA: number | null;
		scoreB: number | null;
		tournamentId: number | null;
	};
}) {
	const tournamentId = params.current?.tournamentId ?? params.tournamentId ?? null;
	if (!tournamentId) {
		return;
	}

	const tournament = await params.db.query.tournaments.findFirst({
		where: eq(tournaments.id, tournamentId),
		columns: { status: true },
	});

	if (!tournament) {
		throw new Error("Tournament not found");
	}

	assertTournamentAllowsMatchMutation({
		currentTournamentStatus: tournament.status,
		currentMatchStatus: params.current?.status ?? null,
		nextMatchStatus: params.next.status,
		currentWinnerId: params.current?.winnerId ?? null,
		nextWinnerId: params.next.winnerId,
		currentScoreA: params.current?.scoreA ?? null,
		nextScoreA: params.next.scoreA,
		currentScoreB: params.current?.scoreB ?? null,
		nextScoreB: params.next.scoreB,
	});
}
```

- [ ] **Step 4: Call the guard from every competitive write path before the database mutation**

Apply the helper in these places:

```ts
// updateMatch
await assertTournamentStatusBeforeMatchWrite({
	db,
	matchId,
	current: {
		status: currentMatch.status,
		winnerId: currentMatch.winnerId,
		scoreA: currentMatch.scoreA,
		scoreB: currentMatch.scoreB,
		tournamentId: currentMatch.tournamentId,
	},
	next: {
		status: nextStatus ?? null,
		winnerId: nextWinnerId ?? null,
		scoreA: normalizedWalkoverState.scoreA ?? null,
		scoreB: normalizedWalkoverState.scoreB ?? null,
	},
});

// incrementScore
await assertTournamentStatusBeforeMatchWrite({
	db,
	current: {
		status: match.status,
		winnerId: match.winnerId,
		scoreA: match.scoreA,
		scoreB: match.scoreB,
		tournamentId: match.tournamentId,
	},
	next: {
		status: "live",
		winnerId: match.winnerId ?? null,
		scoreA: team === "A" ? (match.scoreA || 0) + 1 : match.scoreA ?? 0,
		scoreB: team === "B" ? (match.scoreB || 0) + 1 : match.scoreB ?? 0,
	},
});

// finalizeMatch
await assertTournamentStatusBeforeMatchWrite({
	db,
	current: {
		status: match.status,
		winnerId: match.winnerId,
		scoreA: match.scoreA,
		scoreB: match.scoreB,
		tournamentId: match.tournamentId,
	},
	next: {
		status: "finished",
		winnerId,
		scoreA: match.scoreA ?? 0,
		scoreB: match.scoreB ?? 0,
	},
});

// createMatch
await assertTournamentStatusBeforeMatchWrite({
	db,
	tournamentId: insertData.tournamentId ?? null,
	next: {
		status: insertData.status ?? "scheduled",
		winnerId: insertData.winnerId ?? null,
		scoreA: insertData.scoreA ?? null,
		scoreB: insertData.scoreB ?? null,
	},
});

// refreshWalkoverWinner
await assertTournamentStatusBeforeMatchWrite({
	db,
	current: {
		status: match.status,
		winnerId: match.winnerId,
		scoreA: match.scoreA,
		scoreB: match.scoreB,
		tournamentId: match.tournamentId,
	},
	next: {
		status: match.status,
		winnerId: nextWinnerId,
		scoreA: nextWinnerId === match.teamAId ? 3 : 0,
		scoreB: nextWinnerId === match.teamBId ? 3 : 0,
	},
});
```

Also fix `finalizeMatch` so it loads the current match first instead of updating blindly. That read is required for both guard input and consistent downstream behavior.

- [ ] **Step 5: Normalize the guard failure into a stable server error shape**

Inside each `catch` boundary that currently emits generic errors, preserve the guard code instead of swallowing it:

```ts
if (error instanceof TournamentUpcomingCannotStartMatchError) {
	throw error;
}
```

Do not wrap the guard error in a generic `Failed to ...` message.

- [ ] **Step 6: Run focused tests**

Run: `bun --cwd apps/web test src/server/tournament-status-guard.test.ts`

Expected: PASS.

Run: `bun run turbo -F web check-types`

Expected: PASS with no new TypeScript errors from `matches.ts`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/server/tournament-status-guard.ts apps/web/src/server/tournament-status-guard.test.ts apps/web/src/server/matches.ts
git commit -m "fix: block match starts in upcoming tournaments"
```

---

### Task 3: Translate and surface the guard cleanly in admin UI

**Files:**
- Modify: `apps/web/src/components/admin/MatchModal.tsx`
- Modify: `apps/web/src/routes/$lang/admin/live/$matchId.tsx`
- Modify: `apps/web/src/routes/$lang/admin/tournaments/$tournamentId/matches.tsx`
- Modify: `apps/web/src/locales/pt/admin-matches.json`
- Modify: `apps/web/src/locales/en/admin-matches.json`

- [ ] **Step 1: Add the translation keys first**

Add these keys under `modal` and `live` in both locale files:

```json
{
	"modal": {
		"tournamentMustBeActive": "Defina o torneio como ativo antes de iniciar partidas ou registrar resultados.",
		"tournamentUpcomingHint": "Torneio em breve: ative o torneio antes de registrar placar, vencedor ou resultado."
	},
	"live": {
		"tournamentMustBeActive": "Defina o torneio como ativo antes de iniciar partidas ou registrar resultados.",
		"tournamentUpcomingHint": "Este controle fica bloqueado enquanto o torneio estiver em breve."
	}
}
```

And the English equivalents:

```json
{
	"modal": {
		"tournamentMustBeActive": "Set the tournament to active before starting matches or recording results.",
		"tournamentUpcomingHint": "Tournament is still upcoming: activate it before saving scores, winners, or final results."
	},
	"live": {
		"tournamentMustBeActive": "Set the tournament to active before starting matches or recording results.",
		"tournamentUpcomingHint": "This control stays locked while the tournament is upcoming."
	}
}
```

- [ ] **Step 2: Add a tiny error-code mapper in `MatchModal.tsx` and use it in every save/create failure path**

```ts
function getMatchMutationErrorMessage(error: unknown, t: TFunction<"admin-matches">) {
	if (
		error &&
		typeof error === "object" &&
		"code" in error &&
		error.code === "TOURNAMENT_UPCOMING_CANNOT_START_MATCH"
	) {
		return t("modal.tournamentMustBeActive");
	}

	if (
		error instanceof Error &&
		error.message === "TOURNAMENT_UPCOMING_CANNOT_START_MATCH"
	) {
		return t("modal.tournamentMustBeActive");
	}

	return null;
}
```

Use it here:

```ts
const specificMessage = getMatchMutationErrorMessage(error, t);
toast.error(specificMessage ?? t("modal.saveError"));
```

Apply the same fallback pattern to:
- auto-save failure
- manual save failure
- create failure
- W.O. refresh failure

- [ ] **Step 3: Add the same mapper pattern in the live admin route and disable controls up front**

In `apps/web/src/routes/$lang/admin/live/$matchId.tsx`:

```ts
const isTournamentUpcoming = match.tournament?.status === "upcoming";

function showLiveGuardError(error: unknown) {
	if (
		error instanceof Error &&
		error.message === "TOURNAMENT_UPCOMING_CANNOT_START_MATCH"
	) {
		alert(t("live.tournamentMustBeActive"));
		return;
	}

	console.error(error);
}
```

Then block these actions locally before the network call:

```ts
if (isTournamentUpcoming) {
	alert(t("live.tournamentMustBeActive"));
	return;
}
```

Apply that guard at the start of:
- `handleDirectScoreSubmit`
- `handleIncrement`
- `handleFinalize`

And disable the related buttons/score editors when `isTournamentUpcoming` is `true`.

- [ ] **Step 4: Disable risky entry points in the tournament matches page**

In `apps/web/src/routes/$lang/admin/tournaments/$tournamentId/matches.tsx`:

```ts
const isTournamentUpcoming = tournament.status === "upcoming";
```

Use it to:
- disable the "Set Result" button for scheduled matches;
- disable the live-control link/button for live matches;
- add `title={t("live.tournamentUpcomingHint")}` or adjacent helper text so the disabled state is explainable.

Example button state:

```tsx
<button
	disabled={isTournamentUpcoming}
	title={isTournamentUpcoming ? t("live.tournamentUpcomingHint") : undefined}
	className={clsx(
		"flex w-full items-center justify-center gap-2 border-[3px] border-black px-3 py-2 font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000]",
		isTournamentUpcoming
			? "cursor-not-allowed bg-gray-200 text-gray-500 opacity-70"
			: "bg-[#ccff00] text-black transition-all hover:bg-black hover:text-[#ccff00] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
	)}
>
	<CheckCircle2 className="h-4 w-4" />
	{t("live.setResult")}
</button>
```

- [ ] **Step 5: Run targeted verification**

Run: `bun run turbo -F web check-types`

Expected: PASS.

Run: `bun --cwd apps/web test src/server/tournament-status-guard.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/MatchModal.tsx apps/web/src/routes/$lang/admin/live/$matchId.tsx apps/web/src/routes/$lang/admin/tournaments/$tournamentId/matches.tsx apps/web/src/locales/pt/admin-matches.json apps/web/src/locales/en/admin-matches.json
git commit -m "fix: explain upcoming tournament match guard in admin"
```

---

### Task 4: Final verification and cleanup

**Files:**
- Verify: `apps/web/src/server/matches.ts`
- Verify: `apps/web/src/server/tournament-status-guard.ts`
- Verify: `apps/web/src/components/admin/MatchModal.tsx`
- Verify: `apps/web/src/routes/$lang/admin/live/$matchId.tsx`
- Verify: `apps/web/src/routes/$lang/admin/tournaments/$tournamentId/matches.tsx`
- Verify: `apps/web/src/locales/pt/admin-matches.json`
- Verify: `apps/web/src/locales/en/admin-matches.json`

- [ ] **Step 1: Run the focused server test suite**

Run: `bun --cwd apps/web test src/server/tournament-status-guard.test.ts`

Expected: PASS.

- [ ] **Step 2: Run typecheck for the affected app**

Run: `bun run turbo -F web check-types`

Expected: PASS.

- [ ] **Step 3: Run formatter/lint autofix for the repo**

Run: `bun run check`

Expected: PASS, possibly with Biome autofixes.

- [ ] **Step 4: Re-run typecheck if `bun run check` changed files**

Run: `bun run turbo -F web check-types`

Expected: PASS.

- [ ] **Step 5: Run a production build for the web app**

Run: `bun run turbo -F web build`

Expected: PASS.

- [ ] **Step 6: Commit the final verification-safe state**

```bash
git add apps/web/src/server/matches.ts apps/web/src/server/tournament-status-guard.ts apps/web/src/server/tournament-status-guard.test.ts apps/web/src/components/admin/MatchModal.tsx apps/web/src/routes/$lang/admin/live/$matchId.tsx apps/web/src/routes/$lang/admin/tournaments/$tournamentId/matches.tsx apps/web/src/locales/pt/admin-matches.json apps/web/src/locales/en/admin-matches.json
git commit -m "fix: enforce tournament activation before match results"
```

---

## Self-Review

### Spec coverage

- Backend hard-stop: covered by Tasks 1 and 2.
- All current competitive admin write paths: covered by Task 2 (`updateMatch`, `incrementScore`, `finalizeMatch`, `createMatch`, `refreshWalkoverWinner`).
- Admin UX and i18n: covered by Task 3.
- Regression and verification: covered by Task 4.

### Placeholder scan

- No `TODO`, `TBD`, or "implement later" placeholders remain.
- All code-changing steps include code blocks.
- All verification steps include exact commands and expected outcomes.

### Type consistency

- Error code is consistently `TOURNAMENT_UPCOMING_CANNOT_START_MATCH`.
- Guard function is consistently `assertTournamentAllowsMatchMutation`.
- Snapshot type is consistently `MatchMutationSnapshot`.
