# Swiss Auto-Review Unbet Matches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent users from being forced into review when the selected match day still has at least one eligible match without a user bet.

**Architecture:** Add a derived pending-bet gate in the Home route (`/$lang/index`) that has higher priority than the current auto-review trigger. The gate checks only eligible matches (`scheduled` + both teams defined) in the selected match day and keeps the UI in betting mode while any eligible match has no bet.

**Tech Stack:** React 19, TanStack Router, TypeScript, i18next, Bun, Biome.

---

### Task 1: Add pending-bet derivations for selected match day

**Files:**
- Modify: `apps/web/src/routes/$lang/index.tsx`

- [ ] **Step 1: Add `matchesInSelectedDay` derivation near auto-review effect**

Insert a local derivation before the `useEffect` that decides auto-review:

```ts
const matchesInSelectedDay = allCarouselMatches.filter(
	(m: any) => Number(m.matchDayId) === Number(selectedMatchDayId),
);
```

- [ ] **Step 2: Add `eligibleMatchesInSelectedDay` derivation**

Filter match-day matches using the agreed eligibility definition:

```ts
const eligibleMatchesInSelectedDay = matchesInSelectedDay.filter((m: any) => {
	const hasTeamA = Boolean(m.teamA?.id ?? m.teamAId);
	const hasTeamB = Boolean(m.teamB?.id ?? m.teamBId);
	return m.status === "scheduled" && hasTeamA && hasTeamB;
});
```

- [ ] **Step 3: Add `betMatchIdsInSelectedDay` and pending-bet gate**

Build a set of already-bet match IDs and derive pending status:

```ts
const betMatchIdsInSelectedDay = new Set(
	userBets
		.filter((bet: any) =>
			matchesInSelectedDay.some((m: any) => Number(m.id) === Number(bet.matchId)),
		)
		.map((bet: any) => Number(bet.matchId)),
);

const hasUnbetEligibleMatchesInSelectedDay = eligibleMatchesInSelectedDay.some(
	(m: any) => !betMatchIdsInSelectedDay.has(Number(m.id)),
);
```

- [ ] **Step 4: Run typecheck for fast feedback**

Run: `bun run turbo -F web check-types`

Expected: command exits successfully.

- [ ] **Step 5: Commit task**

```bash
git add apps/web/src/routes/$lang/index.tsx
git commit -m "fix: derive pending eligible bets for selected match day"
```

### Task 2: Prioritize pending eligible matches over auto-review

**Files:**
- Modify: `apps/web/src/routes/$lang/index.tsx`

- [ ] **Step 1: Replace the current `hasBetsInSelectedDay` auto-review condition**

In the existing effect around `// Auto-redirect to review...`, replace the review trigger priority with:

```ts
if (hasUnbetEligibleMatchesInSelectedDay) {
	if (showReview) {
		setShowReview(false);
	}
	return;
}
```

This block must execute before any `setShowReview(true)` path.

- [ ] **Step 2: Keep current review rules as fallback only**

After the pending gate, preserve existing conditions:
- selected day `finished`
- `locked` with editable recovery matches
- any other existing read-only/review logic currently used

But remove dependence on "user has any bets in selected day" as a standalone reason to force review.

- [ ] **Step 3: Ensure stable dependencies in `useEffect`**

Include the new derivations (`hasUnbetEligibleMatchesInSelectedDay`, and any local sets/arrays used directly) in dependencies, avoiding stale closure bugs.

- [ ] **Step 4: Re-run typecheck + lint/format**

Run:
- `bun run turbo -F web check-types`
- `bun run check`

Expected: both commands exit successfully; `check` may apply formatting.

- [ ] **Step 5: Commit task**

```bash
git add apps/web/src/routes/$lang/index.tsx
git commit -m "fix: prioritize unbet eligible matches over auto-review"
```

### Task 3: Validate behavior manually with Swiss round progression

**Files:**
- Modify: none

- [ ] **Step 1: Start web app**

Run: `bun run dev:web`

Expected: app starts and serves local web route.

- [ ] **Step 2: Reproduce baseline scenario with round progression**

Validation path:
1. Select tournament/match day in Swiss stage.
2. Place bets on all eligible round-1 matches.
3. Generate round-2 matches (admin flow).
4. Return as user to the same match day.

Expected: user lands in betting flow (not forced review) when at least one new eligible match has no bet.

- [ ] **Step 3: Validate no-regression scenario**

Complete bets for all eligible matches in the selected day.

Expected: review mode can open using fallback rules.

- [ ] **Step 4: Validate ineligible matches do not force betting mode**

Check a day where matches are not eligible (`live`, `finished`, or missing teamA/teamB).

Expected: those matches do not count as pending; review behavior remains unchanged.

- [ ] **Step 5: Commit verification notes (optional)**

If your team stores QA notes in-repo, add/update the proper notes file and commit:

```bash
git add <qa-notes-file>
git commit -m "docs: record swiss auto-review verification scenarios"
```

If no QA-notes convention exists, skip this step.

---

## Self-Review Checklist (completed)

- Spec coverage: all agreed rules covered (eligibility definition, pending-first priority, fallback review logic).
- Placeholder scan: no TBD/TODO placeholders left.
- Consistency: identifiers and behavior are consistent across tasks.
- Scope check: single subsystem change (Home betting/review decision), no decomposition required.
