# Swiss Stage Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `Swiss` tournament stage with record-based round suggestions, admin confirmation before publication, a public swiss panel, and editable playoff seeding from the final swiss standings.

**Architecture:** Keep `matches` as the only source of truth and move swiss-specific logic into a focused server-side domain module that calculates records, suggests pairings, and seeds playoffs from finished swiss matches. Then wire that module into the existing stage schema, admin tournament workflow, match generation endpoints, and the public tournament page with a dedicated swiss view component.

**Tech Stack:** Bun test, TanStack Start server functions, React 19, react-i18next, Sonner, Drizzle ORM, TypeScript, Biome

---

## File Map

- Create: `apps/web/src/server/swiss.ts`
  - Pure swiss domain helpers for standings, pairing suggestions, and playoff seeding.
- Create: `apps/web/src/server/swiss.test.ts`
  - Bun unit tests for swiss record calculation, pairing rules, and playoff seeds.
- Create: `apps/web/src/components/SwissStageView.tsx`
  - Public swiss panel with record buckets and round-grouped matches.
- Modify: `packages/db/src/schema/index.ts`
  - Extend tournament stage typing to include `Swiss` settings.
- Modify: `apps/web/src/server/tournaments.ts`
  - Accept `Swiss` in server validation for saved tournaments.
- Modify: `apps/web/src/components/admin/StageBuilder.tsx`
  - Add `Swiss` as a selectable stage type and expose swiss settings fields.
- Modify: `apps/web/src/routes/$lang/admin/tournaments/index.tsx`
  - Ensure tournament form can save swiss stage settings cleanly.
- Create: `apps/web/src/server/tournaments.test.ts`
  - Bun tests for tournament stage schema validation.
- Modify: `apps/web/src/server/matches.ts`
  - Add swiss-aware generation and visibility helpers without breaking existing group/bracket flows.
- Modify: `apps/web/src/routes/$lang/admin/tournaments/$tournamentId/matches.tsx`
  - Add swiss generation/confirmation controls and playoff draft generation hooks.
- Modify: `apps/web/src/components/admin/MatchModal.tsx`
  - Keep swiss matches editable without forcing group/bracket assumptions.
- Create: `apps/web/src/routes/$lang/admin/tournaments/$tournamentId/matches.test.tsx`
  - Focused UI test for swiss admin actions.
- Modify: `apps/web/src/routes/$lang/tournaments/$slug.tsx`
  - Render `SwissStageView` for swiss matches and keep hidden draft suggestions out of public output.
- Create: `apps/web/src/components/SwissStageView.test.tsx`
  - Focused UI test for swiss public rendering and hidden draft matches.
- Modify: `apps/web/src/locales/pt/admin-matches.json`
  - PT-BR admin copy for swiss labels, buttons, hints, and toasts.
- Modify: `apps/web/src/locales/en/admin-matches.json`
  - EN admin copy matching the PT-BR keys.
- Modify: `apps/web/src/locales/pt/tournament.json`
  - PT-BR public swiss labels, buckets, and status copy.
- Modify: `apps/web/src/locales/en/tournament.json`
  - EN public swiss labels, buckets, and status copy.

---

### Task 1: Extend tournament stage typing and admin stage configuration

**Files:**
- Modify: `packages/db/src/schema/index.ts`
- Modify: `apps/web/src/server/tournaments.ts`
- Modify: `apps/web/src/components/admin/StageBuilder.tsx`
- Modify: `apps/web/src/routes/$lang/admin/tournaments/index.tsx`
- Create: `apps/web/src/server/tournaments.test.ts`

- [ ] **Step 1: Write the failing test for swiss stage validation**

```ts
import { describe, expect, it } from "bun:test";
import { saveTournamentStageSchema } from "./tournaments";

describe("tournament swiss stage validation", () => {
	it("accepts Swiss stage settings", () => {
		const parsed = saveTournamentStageSchema.parse({
			id: "swiss-1",
			name: "Swiss Stage",
			type: "Swiss",
			settings: {
				participantsCount: 8,
				winsToAdvance: 2,
				lossesToEliminate: 2,
				roundsMax: 3,
				matchType: "Bo3",
			},
		});

		expect(parsed.type).toBe("Swiss");
		expect(parsed.settings.winsToAdvance).toBe(2);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --cwd apps/web test src/server/tournaments.test.ts -t "accepts Swiss stage settings"`

Expected: FAIL because `Swiss` is not part of the stage enum or the exported schema does not exist yet.

- [ ] **Step 3: Add the minimal shared stage typing**

```ts
// packages/db/src/schema/index.ts
type TournamentStage = {
	id: string;
	name: string;
	type: "Single Elimination" | "Double Elimination" | "Groups" | "Swiss";
	settings: {
		groupsCount?: number;
		teamsPerGroup?: number;
		advancingCount?: number;
		matchType?: "Bo1" | "Bo3" | "Bo5";
		groupFormat?: "GSL" | "Round Robin";
		participantsCount?: number;
		winsToAdvance?: number;
		lossesToEliminate?: number;
		roundsMax?: number;
	};
};
```

```ts
// apps/web/src/server/tournaments.ts
export const saveTournamentStageSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.enum([
		"Single Elimination",
		"Double Elimination",
		"Groups",
		"Swiss",
	]),
	settings: z.object({
		groupsCount: z.number().optional(),
		teamsPerGroup: z.number().optional(),
		advancingCount: z.number().optional(),
		matchType: z.enum(["Bo1", "Bo3", "Bo5"]).optional(),
		groupFormat: z.enum(["GSL", "Round Robin"]).optional(),
		participantsCount: z.number().optional(),
		winsToAdvance: z.number().optional(),
		lossesToEliminate: z.number().optional(),
		roundsMax: z.number().optional(),
	}),
});
```

```tsx
// apps/web/src/components/admin/StageBuilder.tsx
export type StageType =
	| "Single Elimination"
	| "Double Elimination"
	| "Groups"
	| "Swiss";

{ value: "Swiss", label: t("stageBuilder.swiss") }

{stage.type === "Swiss" && (
	<>
		<input value={stage.settings.participantsCount || ""} />
		<input value={stage.settings.winsToAdvance || ""} />
		<input value={stage.settings.lossesToEliminate || ""} />
		<input value={stage.settings.roundsMax || ""} />
	</>
)}
```

- [ ] **Step 4: Run tests and a targeted typecheck**

Run: `bun --cwd apps/web test src/server/tournaments.test.ts && bun run turbo -F web check-types`

Expected: PASS for the new validation test and no TypeScript errors from the added `Swiss` stage fields.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/index.ts apps/web/src/server/tournaments.ts apps/web/src/components/admin/StageBuilder.tsx apps/web/src/routes/$lang/admin/tournaments/index.tsx apps/web/src/server/tournaments.test.ts
git commit -m "feat: add swiss stage configuration"
```

---

### Task 2: Add the pure swiss domain module and tests

**Files:**
- Create: `apps/web/src/server/swiss.ts`
- Create: `apps/web/src/server/swiss.test.ts`

- [ ] **Step 1: Write the failing swiss domain tests**

```ts
import { describe, expect, it } from "bun:test";
import {
	buildSwissStandings,
	suggestSwissRound,
	seedSwissPlayoff,
	type SwissSettings,
} from "./swiss";

const settings: SwissSettings = {
	participantsCount: 8,
	winsToAdvance: 2,
	lossesToEliminate: 2,
	roundsMax: 3,
	matchType: "Bo3",
};

describe("swiss standings", () => {
	it("marks teams with two wins as qualified and two losses as eliminated", () => {
		const standings = buildSwissStandings({
			settings,
			seeds: [1, 2, 3, 4],
			matches: [
				{ id: 1, teamAId: 1, teamBId: 2, winnerId: 1, status: "finished" },
				{ id: 2, teamAId: 1, teamBId: 3, winnerId: 1, status: "finished" },
				{ id: 3, teamAId: 2, teamBId: 4, winnerId: 4, status: "finished" },
				{ id: 4, teamAId: 2, teamBId: 3, winnerId: 3, status: "finished" },
			],
		});

		expect(standings.byTeamId[1].status).toBe("qualified");
		expect(standings.byTeamId[2].status).toBe("eliminated");
	});

	it("suggests next round within the same record buckets", () => {
		const pairings = suggestSwissRound({
			settings,
			seeds: [1, 2, 3, 4],
			matches: [
				{ id: 1, teamAId: 1, teamBId: 4, winnerId: 1, status: "finished" },
				{ id: 2, teamAId: 2, teamBId: 3, winnerId: 2, status: "finished" },
			],
		});

		expect(pairings.roundNumber).toBe(2);
		expect(pairings.matches[0].recordBucket).toBe("1-0");
		expect(pairings.matches[1].recordBucket).toBe("0-1");
	});

	it("seeds the playoff with record first and seed as final tiebreaker", () => {
		const seeded = seedSwissPlayoff([
			{ teamId: 8, wins: 2, losses: 0, seed: 8 },
			{ teamId: 1, wins: 2, losses: 1, seed: 1 },
			{ teamId: 3, wins: 2, losses: 1, seed: 3 },
			{ teamId: 5, wins: 2, losses: 1, seed: 5 },
		]);

		expect(seeded[0].teamId).toBe(8);
		expect(seeded[1].teamId).toBe(1);
		expect(seeded[3].teamId).toBe(5);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --cwd apps/web test src/server/swiss.test.ts`

Expected: FAIL with module-not-found or missing export errors for `./swiss`.

- [ ] **Step 3: Implement the minimal swiss domain helpers**

```ts
export interface SwissSettings {
	participantsCount: number;
	winsToAdvance: number;
	lossesToEliminate: number;
	roundsMax: number;
	matchType: "Bo1" | "Bo3" | "Bo5";
}

export function buildSwissStandings(input: {
	settings: SwissSettings;
	seeds: number[];
	matches: Array<{
		id: number;
		teamAId: number | null;
		teamBId: number | null;
		winnerId: number | null;
		status: string | null;
	}>;
}) {
	const byTeamId: Record<number, { teamId: number; seed: number; wins: number; losses: number; record: string; status: "alive" | "qualified" | "eliminated" }> = {};

	for (const [index, teamId] of input.seeds.entries()) {
		byTeamId[teamId] = {
			teamId,
			seed: index + 1,
			wins: 0,
			losses: 0,
			record: "0-0",
			status: "alive",
		};
	}

	for (const match of input.matches) {
		if (match.status !== "finished" || !match.winnerId || !match.teamAId || !match.teamBId) {
			continue;
		}

		const loserId = match.winnerId === match.teamAId ? match.teamBId : match.teamAId;
		byTeamId[match.winnerId].wins += 1;
		byTeamId[loserId].losses += 1;
	}

	for (const team of Object.values(byTeamId)) {
		team.record = `${team.wins}-${team.losses}`;
		team.status =
			team.wins >= input.settings.winsToAdvance
				? "qualified"
				: team.losses >= input.settings.lossesToEliminate
					? "eliminated"
					: "alive";
	}

	const ordered = Object.values(byTeamId).sort((a, b) => {
		if (b.wins !== a.wins) return b.wins - a.wins;
		if (a.losses !== b.losses) return a.losses - b.losses;
		return a.seed - b.seed;
	});

	return {
		byTeamId,
		ordered,
		qualified: ordered.filter((team) => team.status === "qualified"),
	};
}

export function suggestSwissRound(input: {
	settings: SwissSettings;
	seeds: number[];
	matches: Array<{
		id: number;
		teamAId: number | null;
		teamBId: number | null;
		winnerId: number | null;
		status: string | null;
	}>;
}) {
	const standings = buildSwissStandings(input);
	const previousOpponents = new Set(
		input.matches
			.filter((match) => match.teamAId && match.teamBId)
			.map((match) => `${Math.min(match.teamAId!, match.teamBId!)}:${Math.max(match.teamAId!, match.teamBId!)}`),
	);
	const aliveTeams = standings.ordered.filter((team) => team.status === "alive");
	const bucketMap = new Map<string, typeof aliveTeams>();

	for (const team of aliveTeams) {
		const bucket = `${team.wins}-${team.losses}`;
		const teams = bucketMap.get(bucket) ?? [];
		teams.push(team);
		bucketMap.set(bucket, teams);
	}

	const matches: Array<{ teamAId: number; teamBId: number; recordBucket: string }> = [];
	for (const [recordBucket, teams] of bucketMap.entries()) {
		const queue = [...teams];
		while (queue.length >= 2) {
			const teamA = queue.shift()!;
			const nextIndex = queue.findIndex((teamB) => {
				const key = `${Math.min(teamA.teamId, teamB.teamId)}:${Math.max(teamA.teamId, teamB.teamId)}`;
				return !previousOpponents.has(key);
			});
			const teamB = nextIndex >= 0 ? queue.splice(nextIndex, 1)[0] : queue.shift()!;
			matches.push({ teamAId: teamA.teamId, teamBId: teamB.teamId, recordBucket });
		}
	}

	const playedRounds = input.matches.reduce((maxRound, match: any) => Math.max(maxRound, (match.roundIndex ?? 0) + 1), 0);
	return { roundNumber: playedRounds + 1, matches };
}

export function seedSwissPlayoff(
	qualifiedTeams: Array<{ teamId: number; wins: number; losses: number; seed: number }>,
) {
	return [...qualifiedTeams].sort((a, b) => {
		if (b.wins !== a.wins) return b.wins - a.wins;
		if (a.losses !== b.losses) return a.losses - b.losses;
		return a.seed - b.seed;
	});
}
```

- [ ] **Step 4: Add the anti-rematch test and make it pass**

```ts
it("avoids rematches when another valid bucket pairing exists", () => {
	const pairings = suggestSwissRound({
		settings,
		seeds: [1, 2, 3, 4],
		matches: [
			{ id: 1, teamAId: 1, teamBId: 2, winnerId: 1, status: "finished" },
			{ id: 2, teamAId: 3, teamBId: 4, winnerId: 3, status: "finished" },
		],
	});

	expect(pairings.matches).toEqual([
		{ teamAId: 1, teamBId: 3, recordBucket: "1-0" },
		{ teamAId: 2, teamBId: 4, recordBucket: "0-1" },
	]);
});
```

Run: `bun --cwd apps/web test src/server/swiss.test.ts`

Expected: PASS with all swiss domain tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/swiss.ts apps/web/src/server/swiss.test.ts
git commit -m "test: add swiss stage domain coverage"
```

---

### Task 3: Wire swiss generation into server match workflows

**Files:**
- Modify: `apps/web/src/server/matches.ts`
- Reuse: `apps/web/src/server/swiss.ts`
- Test: `apps/web/src/server/swiss.test.ts`

- [ ] **Step 1: Extend the failing test with round suggestion metadata expectations**

```ts
it("returns the next swiss round number and suggested bucket metadata", () => {
	const result = suggestSwissRound({
		settings,
		seeds: [1, 2, 3, 4],
		matches: [
			{ id: 1, teamAId: 1, teamBId: 4, winnerId: 1, status: "finished" },
			{ id: 2, teamAId: 2, teamBId: 3, winnerId: 2, status: "finished" },
		],
	});

	expect(result.roundNumber).toBe(2);
	for (const match of result.matches) {
		expect(match.recordBucket === "1-0" || match.recordBucket === "0-1").toBeTrue();
	}
});
```

- [ ] **Step 2: Run swiss tests to verify the new assertion fails**

Run: `bun --cwd apps/web test src/server/swiss.test.ts -t "returns the next swiss round number"`

Expected: FAIL because the pairing result shape is not complete yet.

- [ ] **Step 3: Add swiss-aware generation entry points in `matches.ts`**

```ts
async function generateSwissOpeningRound(params: {
	db: any;
	tournamentId: number;
	stage: any;
}) {
	const seededTeams = await params.db.query.tournamentTeams.findMany({
		where: (tt: any, { eq }: any) => eq(tt.tournamentId, params.tournamentId),
		orderBy: (tt: any, { asc }: any) => [asc(tt.seed)],
	});

	const ordered = seededTeams.filter((team: any) => team.seed !== null);
	const pairs = [
		[ordered[0], ordered[7]],
		[ordered[1], ordered[6]],
		[ordered[2], ordered[5]],
		[ordered[3], ordered[4]],
	];

	return Promise.all(
		pairs.map(([teamA, teamB], index) =>
			params.db.insert(matches).values({
				tournamentId: params.tournamentId,
				stageId: params.stage.id,
				bracketSide: "main",
				roundIndex: 0,
				name: `Swiss Round 1 - Match ${index + 1}`,
				label: "Swiss Round 1",
				teamAId: teamA.teamId,
				teamBId: teamB.teamId,
				status: "scheduled",
				isBettingEnabled: false,
				displayOrder: index + 1,
				startTime: new Date(),
			}),
		),
	);
}

async function generateSwissSuggestedRound(params: {
	db: any;
	tournamentId: number;
	stage: any;
}) {
	const swissMatches = await params.db.query.matches.findMany({
		where: and(
			eq(matches.tournamentId, params.tournamentId),
			eq(matches.stageId, params.stage.id),
		),
		orderBy: [asc(matches.roundIndex), asc(matches.displayOrder)],
	});

	const seededTeams = await params.db.query.tournamentTeams.findMany({
		where: (tt: any, { eq }: any) => eq(tt.tournamentId, params.tournamentId),
		orderBy: (tt: any, { asc }: any) => [asc(tt.seed)],
	});

	const suggestion = suggestSwissRound({
		settings: params.stage.settings,
		seeds: seededTeams.map((team: any) => team.seed),
		matches: swissMatches,
	});

	return Promise.all(
		suggestion.matches.map((pairing, index) =>
			params.db.insert(matches).values({
				tournamentId: params.tournamentId,
				stageId: params.stage.id,
				bracketSide: "main",
				roundIndex: suggestion.roundNumber - 1,
				name: `Swiss Round ${suggestion.roundNumber} - Match ${index + 1}`,
				label: `Swiss ${pairing.recordBucket}`,
				teamAId: pairing.teamAId,
				teamBId: pairing.teamBId,
				status: "scheduled",
				isBettingEnabled: false,
				displayOrder: index + 1,
				startTime: new Date(),
			}),
		),
	);
}

async function generateSwissPlayoffDraft(params: {
	db: any;
	tournamentId: number;
	swissStage: any;
	playoffStage: any;
}) {
	const swissMatches = await params.db.query.matches.findMany({
		where: and(
			eq(matches.tournamentId, params.tournamentId),
			eq(matches.stageId, params.swissStage.id),
		),
	});
	const tournamentTeams = await params.db.query.tournamentTeams.findMany({
		where: (tt: any, { eq }: any) => eq(tt.tournamentId, params.tournamentId),
	});
	const standings = buildSwissStandings({
		settings: params.swissStage.settings,
		seeds: tournamentTeams.map((team: any) => team.seed),
		matches: swissMatches,
	});
	const qualified = seedSwissPlayoff(standings.qualified);

	await params.db.insert(matches).values([
		{
			tournamentId: params.tournamentId,
			stageId: params.playoffStage.id,
			bracketSide: "main",
			roundIndex: 0,
			name: "Semi-Final #1",
			label: "Semi-Final #1",
			teamAId: qualified[0].teamId,
			teamBId: qualified[3].teamId,
			status: "scheduled",
			isBettingEnabled: false,
			displayOrder: 1,
			startTime: new Date(),
		},
		{
			tournamentId: params.tournamentId,
			stageId: params.playoffStage.id,
			bracketSide: "main",
			roundIndex: 0,
			name: "Semi-Final #2",
			label: "Semi-Final #2",
			teamAId: qualified[1].teamId,
			teamBId: qualified[2].teamId,
			status: "scheduled",
			isBettingEnabled: false,
			displayOrder: 2,
			startTime: new Date(),
		},
		{
			tournamentId: params.tournamentId,
			stageId: params.playoffStage.id,
			bracketSide: "main",
			roundIndex: 1,
			name: "Final",
			label: "Final",
			labelTeamA: "Winner of Semi-Final #1",
			labelTeamB: "Winner of Semi-Final #2",
			status: "scheduled",
			isBettingEnabled: false,
			displayOrder: 1,
			startTime: new Date(),
		},
	]);
}
```

```ts
if (stage.type === "Swiss") {
	return generateSwissOpeningRound({ db, tournamentId, stage });
}
```

```ts
export const generateNextRound = generateNextRoundFn as unknown as (opts: {
	data: {
		tournamentId: number;
		roundIndex: number;
		bracketSide: string;
		stageId?: string;
	};
}) => Promise<any[]>;
```

- [ ] **Step 4: Verify existing group/bracket generation still works conceptually**

Run: `bun --cwd apps/web test src/server/swiss.test.ts && bun run turbo -F web check-types`

Expected: PASS for swiss tests and no new type errors in `matches.ts` despite the added swiss branches.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/matches.ts apps/web/src/server/swiss.ts apps/web/src/server/swiss.test.ts
git commit -m "feat: add swiss match generation flows"
```

---

### Task 4: Add swiss controls to the admin tournament matches screen

**Files:**
- Modify: `apps/web/src/routes/$lang/admin/tournaments/$tournamentId/matches.tsx`
- Modify: `apps/web/src/components/admin/MatchModal.tsx`
- Modify: `apps/web/src/locales/pt/admin-matches.json`
- Modify: `apps/web/src/locales/en/admin-matches.json`
- Create: `apps/web/src/routes/$lang/admin/tournaments/$tournamentId/matches.test.tsx`

- [ ] **Step 1: Write the failing admin interaction test**

```ts
// apps/web/src/routes/$lang/admin/tournaments/$tournamentId/matches.test.tsx
it("shows swiss generation actions when the tournament has a Swiss stage", () => {
	render(<TournamentMatchesPage />, {
		loaderData: {
			tournament: {
				stages: [{ id: "swiss-1", type: "Swiss", name: "Swiss Stage", settings: {} }],
			},
			matches: [],
			matchDays: [],
		},
	});

	expect(screen.getByText("Gerar Rodada 1")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `bun --cwd apps/web test src/routes/$lang/admin/tournaments/$tournamentId/matches.test.tsx -t "shows swiss generation actions"`

Expected: FAIL because there is no swiss-specific UI or test harness yet.

- [ ] **Step 3: Add the minimal swiss admin controls**

```tsx
const swissStage = stages.find((stage: any) => stage.type === "Swiss");
const swissMatches = matches.filter((match: any) => match.stageId === swissStage?.id);

{swissStage && (
	<div className="space-y-6">
		<div className="border-[4px] border-black bg-white p-4">
			<h2>{t("matches.swissStage")}</h2>
			<p>{t("matches.swissStageDescription")}</p>
		</div>
		<button onClick={handleGenerateSwissRoundOne}>{t("matches.generateSwissRoundOne")}</button>
		<button onClick={handleSuggestSwissNextRound}>{t("matches.suggestSwissNextRound")}</button>
		<button onClick={handleGenerateSwissPlayoffDraft}>{t("matches.generateSwissPlayoffDraft")}</button>
	</div>
)}
```

```tsx
// apps/web/src/components/admin/MatchModal.tsx
const selectedStage = stages.find((s) => s.id === formData.stageId);
const isSwissStage = selectedStage?.type === "Swiss";

if (isSwissStage && formData.bracketSide === "groups") {
	setFormData((prev) => ({ ...prev, bracketSide: "main" }));
}
```

- [ ] **Step 4: Add translation keys and run the page test again**

```json
"matches": {
	"swissStage": "Swiss Stage",
	"swissStageDescription": "Gerencie a fase swiss, sugira confrontos por record e publique apenas partidas confirmadas.",
	"generateSwissRoundOne": "Gerar Rodada 1",
	"suggestSwissNextRound": "Sugerir Próxima Rodada",
	"generateSwissPlayoffDraft": "Gerar Playoff Rascunho"
}
```

Run: `bun --cwd apps/web test src/routes/$lang/admin/tournaments/$tournamentId/matches.test.tsx -t "shows swiss generation actions"`

Expected: PASS after the swiss section renders only when the stage exists.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/$lang/admin/tournaments/$tournamentId/matches.tsx apps/web/src/components/admin/MatchModal.tsx apps/web/src/locales/pt/admin-matches.json apps/web/src/locales/en/admin-matches.json apps/web/src/routes/$lang/admin/tournaments/$tournamentId/matches.test.tsx
git commit -m "feat: add swiss admin controls"
```

---

### Task 5: Add the public swiss panel and hide draft suggestions from users

**Files:**
- Create: `apps/web/src/components/SwissStageView.tsx`
- Create: `apps/web/src/components/SwissStageView.test.tsx`
- Modify: `apps/web/src/routes/$lang/tournaments/$slug.tsx`
- Modify: `apps/web/src/locales/pt/tournament.json`
- Modify: `apps/web/src/locales/en/tournament.json`

- [ ] **Step 1: Write the failing public swiss view test**

```tsx
import { render, screen } from "@testing-library/react";
import { SwissStageView } from "@/components/SwissStageView";

it("renders record buckets and hides draft-only suggestions", () => {
	render(
		<SwissStageView
			groupedRounds={[
				{
					roundLabel: "Rodada 1",
					matches: [{ id: 1, status: "scheduled", isBettingEnabled: true }],
				},
			]}
			buckets={{ "1-0": [{ id: 1, name: "LOUD" }] }}
		/>,
	);

	expect(screen.getByText("1-0")).toBeInTheDocument();
	expect(screen.queryByText("Sugerida")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the new component test to verify it fails**

Run: `bun --cwd apps/web test src/components/SwissStageView.test.tsx`

Expected: FAIL because `SwissStageView` does not exist yet.

- [ ] **Step 3: Build the minimal swiss public component and route integration**

```tsx
export function SwissStageView(props: {
	buckets: Record<string, Array<{ id: number; name: string; logoUrl?: string | null; status?: string }>>;
	groupedRounds: Array<{ roundLabel: string; matches: any[] }>;
	userBets: any[];
	showPredictionScore?: boolean;
}) {
	const { t } = useTranslation("tournament");

	return (
		<div className="flex flex-col gap-8">
			<section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				{Object.entries(props.buckets).map(([bucket, teams]) => (
					<div key={bucket} className="border-[3px] border-black bg-white p-4 shadow-[3px_3px_0_0_#000]">
						<div className="mb-3 flex items-center justify-between">
							<h3 className="font-black text-lg uppercase italic">{bucket}</h3>
							<span className="border-2 border-black bg-[#ccff00] px-2 py-1 font-black text-[10px] uppercase text-black">
								{teams.length}
							</span>
						</div>
						<div className="flex flex-col gap-2">
							{teams.map((team) => (
								<div key={team.id} className="flex items-center justify-between border-2 border-black bg-[#f0f0f0] px-3 py-2">
									<span className="font-black uppercase text-black">{team.name}</span>
									<span className="font-bold text-[10px] uppercase text-gray-600">
										{team.status ? t(`swiss.${team.status}`) : bucket}
									</span>
								</div>
							))}
						</div>
					</div>
				))}
			</section>
			<section className="flex flex-col gap-6">
				{props.groupedRounds.map((round) => (
					<div key={round.roundLabel} className="rounded-xl border-[3px] border-black bg-white p-4 shadow-[3px_3px_0_0_#000]">
						<h3 className="mb-4 font-black text-xl uppercase italic text-black">{round.roundLabel}</h3>
						<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
							{round.matches.map((match) => (
								<MatchCard
									key={match.id}
									match={{ ...match, format: "bo3", teamA: match.teamA, teamB: match.teamB }}
									initialBet={props.userBets.find((bet: any) => bet.matchId === match.id)}
									showPredictionScore={props.showPredictionScore}
								/>
							))}
						</div>
					</div>
				))}
			</section>
		</div>
	);
}
```

```tsx
// apps/web/src/routes/$lang/tournaments/$slug.tsx
const publicSwissMatches = filteredMatches.filter((match: any) => {
	if (match.stage?.type !== "Swiss") return false;
	if (!match.matchDay) return false;
	return match.matchDay.status !== "draft" && match.isBettingEnabled !== false;
});

{swissStageMatches.length > 0 && (
	<SwissStageView
		buckets={swissBuckets}
		groupedRounds={swissRounds}
		userBets={userBets}
		showPredictionScore={filter === "my-bets"}
	/>
)}
```

- [ ] **Step 4: Add public translations and rerun the test**

```json
"swiss": {
	"title": "Swiss Stage",
	"qualified": "Classificado",
	"eliminated": "Eliminado",
	"alive": "Na disputa",
	"round": "Rodada {{number}}"
}
```

Run: `bun --cwd apps/web test src/components/SwissStageView.test.tsx && bun run turbo -F web check-types`

Expected: PASS for the swiss view test and no type regressions on the tournament detail page.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/SwissStageView.tsx apps/web/src/components/SwissStageView.test.tsx apps/web/src/routes/$lang/tournaments/$slug.tsx apps/web/src/locales/pt/tournament.json apps/web/src/locales/en/tournament.json
git commit -m "feat: add public swiss stage view"
```

---

### Task 6: Add end-to-end domain coverage for playoff seeding and visibility guards

**Files:**
- Modify: `apps/web/src/server/swiss.test.ts`
- Modify: `apps/web/src/server/matches.ts`
- Modify: `apps/web/src/routes/$lang/tournaments/$slug.tsx`

- [ ] **Step 1: Add the failing regression tests for hidden draft matches and seeded playoffs**

```ts
it("does not include draft swiss suggestions in public round output", () => {
	const visible = selectPublicSwissMatches([
		{ id: 1, isBettingEnabled: false, matchDayStatus: "draft" },
		{ id: 2, isBettingEnabled: true, matchDayStatus: "open" },
	]);

	expect(visible.map((match) => match.id)).toEqual([2]);
});

it("builds playoff semifinals as seed 1 vs 4 and seed 2 vs 3", () => {
	const seeded = seedSwissPlayoff([
		{ teamId: 10, wins: 2, losses: 0, seed: 4 },
		{ teamId: 11, wins: 2, losses: 1, seed: 1 },
		{ teamId: 12, wins: 2, losses: 1, seed: 2 },
		{ teamId: 13, wins: 2, losses: 1, seed: 7 },
	]);

	expect([
		[seeded[0].teamId, seeded[3].teamId],
		[seeded[1].teamId, seeded[2].teamId],
	]).toEqual([
		[10, 13],
		[11, 12],
	]);
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `bun --cwd apps/web test src/server/swiss.test.ts -t "does not include draft swiss suggestions"`

Expected: FAIL because the public swiss selector helper does not exist yet.

- [ ] **Step 3: Implement the missing visibility helper and use it in the route**

```ts
export function selectPublicSwissMatches<T extends {
	id: number;
	isBettingEnabled?: boolean | null;
	matchDayStatus?: string | null;
}>(matches: T[]): T[] {
	return matches.filter(
		(match) => match.isBettingEnabled !== false && match.matchDayStatus !== "draft",
	);
}
```

```tsx
const swissMatches = selectPublicSwissMatches(
	filteredMatches
		.filter((match: any) => match.stage?.type === "Swiss")
		.map((match: any) => ({
			...match,
			matchDayStatus: match.matchDay?.status ?? null,
		})),
);
```

- [ ] **Step 4: Run the focused tests and the full verification commands**

Run: `bun --cwd apps/web test src/server/swiss.test.ts && bun run check-types && bun run check`

Expected: PASS for swiss tests, repository typecheck green, and Biome completes without introducing unresolved errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/swiss.ts apps/web/src/server/swiss.test.ts apps/web/src/server/matches.ts apps/web/src/routes/$lang/tournaments/$slug.tsx
git commit -m "test: cover swiss visibility and playoff seeding"
```

---

## Self-Review

- Spec coverage: stage typing, swiss settings, record-based pairing, manual admin workflow, public swiss panel, hidden draft suggestions, and playoff seeding each map to a dedicated task above.
- Placeholder scan: no `TODO`, `TBD`, or "implement later" markers remain in the plan tasks.
- Type consistency: the plan uses the same `Swiss` stage type, `winsToAdvance`, `lossesToEliminate`, `roundsMax`, `buildSwissStandings`, `suggestSwissRound`, and `seedSwissPlayoff` names across all tasks.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-06-swiss-stage-support.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
