# Third Place Match Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Suportar partida opcional de disputa de 3o lugar em qualquer estagio `Single Elimination`, com geracao automatica e fluxo padrao de apostas.

**Architecture:** A flag `enableThirdPlaceMatch` sera adicionada em `stage.settings` de `Single Elimination` (default `false`). A geracao/regeneracao de chave no backend criara uma partida derivada de `loser/loser` das semifinais quando houver semis, e o restante do sistema tratara essa partida como match normal. A UI admin passara a expor um toggle no `StageBuilder` para essa configuracao.

**Tech Stack:** TanStack Start, React 19, TypeScript strict, Drizzle ORM, Bun, Biome.

---

### Task 1: Expandir schema/types para `enableThirdPlaceMatch`

**Files:**
- Modify: `apps/web/src/server/tournaments.ts`
- Modify: `apps/web/src/components/admin/StageBuilder.tsx`
- Modify: `apps/web/src/locales/pt/admin-matches.json`
- Modify: `apps/web/src/locales/en/admin-matches.json`

- [ ] **Step 1: Escrever teste de validacao de stage settings (falha primeiro)**

Adicionar caso em `apps/web/src/server/tournaments.test.ts`:

```ts
it("accepts single elimination third-place setting", () => {
	const parsed = stageSchema.parse({
		id: "playoff-main",
		name: "Playoff",
		type: "Single Elimination",
		settings: {
			matchType: "Bo3",
			enableThirdPlaceMatch: true,
		},
	});

	expect(parsed.settings.enableThirdPlaceMatch).toBe(true);
});
```

- [ ] **Step 2: Rodar teste e confirmar falha**

Run: `bun test apps/web/src/server/tournaments.test.ts`
Expected: falha de schema/typing por propriedade desconhecida.

- [ ] **Step 3: Atualizar schema Zod do stage em `tournaments.ts`**

No objeto `settings` do stage schema, incluir boolean opcional:

```ts
settings: z.object({
	matchType: z.enum(["Bo1", "Bo3", "Bo5"]).optional(),
	groupFormat: z.enum(["GSL", "Round Robin"]).optional(),
	groupsCount: z.number().int().positive().optional(),
	teamsPerGroup: z.number().int().positive().optional(),
	advancingCount: z.number().int().positive().optional(),
	participantsCount: z.number().int().positive().optional(),
	winsToAdvance: z.number().int().positive().optional(),
	lossesToEliminate: z.number().int().positive().optional(),
	roundsMax: z.number().int().positive().optional(),
	enableThirdPlaceMatch: z.boolean().optional(),
}),
```

- [ ] **Step 4: Atualizar tipo `Stage` no `StageBuilder.tsx`**

Adicionar no tipo `settings`:

```ts
settings: {
	groupsCount?: number;
	teamsPerGroup?: number;
	advancingCount?: number;
	matchType?: MatchType;
	groupFormat?: "GSL" | "Round Robin";
	participantsCount?: number;
	winsToAdvance?: number;
	lossesToEliminate?: number;
	roundsMax?: number;
	enableThirdPlaceMatch?: boolean;
};
```

- [ ] **Step 5: Adicionar labels i18n para o toggle**

Adicionar chaves em `admin-matches.json` PT/EN:

```json
"stageBuilder": {
	"thirdPlaceMatch": "Disputa de 3o lugar",
	"thirdPlaceMatchHelp": "Cria automaticamente partida entre os perdedores das semifinais"
}
```

```json
"stageBuilder": {
	"thirdPlaceMatch": "Third place match",
	"thirdPlaceMatchHelp": "Automatically creates a match between semifinal losers"
}
```

- [ ] **Step 6: Rodar testes novamente**

Run: `bun test apps/web/src/server/tournaments.test.ts`
Expected: PASS no novo caso + casos antigos.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/server/tournaments.ts apps/web/src/server/tournaments.test.ts apps/web/src/components/admin/StageBuilder.tsx apps/web/src/locales/pt/admin-matches.json apps/web/src/locales/en/admin-matches.json
git commit -m "feat: add single elimination third-place stage setting"
```

---

### Task 2: Expor toggle no StageBuilder (default off)

**Files:**
- Modify: `apps/web/src/components/admin/StageBuilder.tsx`

- [ ] **Step 1: Escrever teste de UI para render condicional do toggle**

Criar teste em `apps/web/src/components/admin/StageBuilder.test.tsx`:

```tsx
it("shows third-place toggle only for single elimination", () => {
	const stages = [
		{ id: "a", name: "Playoff", type: "Single Elimination", settings: { matchType: "Bo3" } },
		{ id: "b", name: "Swiss", type: "Swiss", settings: { matchType: "Bo3" } },
	] as any;

	render(<StageBuilder stages={stages} onChange={() => {}} />);

	expect(screen.getByText(/Disputa de 3o lugar|Third place match/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Rodar teste e confirmar falha**

Run: `bun test apps/web/src/components/admin/StageBuilder.test.tsx`
Expected: FAIL (toggle ainda nao existe).

- [ ] **Step 3: Implementar toggle no bloco de settings para Single Elimination**

Adicionar bloco renderizado apenas para `stage.type === "Single Elimination"`:

```tsx
{stage.type === "Single Elimination" && (
	<div className="col-span-2 md:col-span-4">
		<label className="mb-1 block font-bold text-[10px] text-gray-500 uppercase">
			{t("stageBuilder.thirdPlaceMatch")}
		</label>
		<button
			type="button"
			onClick={() =>
				updateSettings(index, "enableThirdPlaceMatch", !stage.settings.enableThirdPlaceMatch)
			}
			className={stage.settings.enableThirdPlaceMatch ? "...bg-[#ccff00]..." : "...bg-white..."}
		>
			{stage.settings.enableThirdPlaceMatch ? "ON" : "OFF"}
		</button>
		<p className="mt-1 text-[10px] text-gray-500">
			{t("stageBuilder.thirdPlaceMatchHelp")}
		</p>
	</div>
)}
```

- [ ] **Step 4: Garantir default off ao criar stage**

No `newStage`:

```ts
const newStage: Stage = {
	id: crypto.randomUUID(),
	name: t("stageBuilder.defaultName", { number: stages.length + 1 }),
	type: "Single Elimination",
	settings: {
		matchType: "Bo3",
		enableThirdPlaceMatch: false,
	},
};
```

- [ ] **Step 5: Rodar teste de UI**

Run: `bun test apps/web/src/components/admin/StageBuilder.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/StageBuilder.tsx apps/web/src/components/admin/StageBuilder.test.tsx
git commit -m "feat: add third-place toggle to single elimination stage builder"
```

---

### Task 3: Gerar partida de 3o lugar na criacao/regeneracao da chave

**Files:**
- Modify: `apps/web/src/server/matches.ts`
- Test: `apps/web/src/server/matches.test.ts` (ou arquivo de teste server equivalente para geracao)

- [ ] **Step 1: Escrever teste de geracao com flag ligada (falha primeiro)**

Adicionar caso de teste que monta um stage `Single Elimination` com semis e `enableThirdPlaceMatch: true` e valida match loser/loser:

```ts
it("creates third-place match from semifinal losers when enabled", async () => {
	// arrange tournament + stage settings
	// act generateBracket(...)
	// assert exactly one match with bracketSide === "third_place"
	// assert teamAPreviousMatchResult/teamBPreviousMatchResult === "loser"
});
```

- [ ] **Step 2: Rodar teste e confirmar falha**

Run: `bun test apps/web/src/server/matches.test.ts -t "third-place"`
Expected: FAIL (match ainda nao e criado).

- [ ] **Step 3: Implementar criacao condicional no fluxo Single Elimination**

No bloco de geracao de `Single Elimination` em `matches.ts`:

```ts
const enableThirdPlaceMatch =
	stage.type === "Single Elimination" &&
	Boolean(stage.settings?.enableThirdPlaceMatch);

// ...apos criar rounds e identificar semifinais
if (enableThirdPlaceMatch && semifinalMatches.length === 2) {
	const [semiA, semiB] = semifinalMatches;
	await db.insert(matches).values({
		tournamentId,
		stageId: stage.id,
		bracketSide: "third_place",
		roundIndex: semifinalRoundIndex + 1,
		name: "Third Place Match",
		label: "Third Place Match",
		teamAPreviousMatchId: semiA.id,
		teamBPreviousMatchId: semiB.id,
		teamAPreviousMatchResult: "loser",
		teamBPreviousMatchResult: "loser",
		startTime: playoffStartTime,
		matchDayId: playoffMatchDay.id,
		status: "scheduled",
		isBettingEnabled: false,
		displayOrder: nextOrder++,
	});
}
```

- [ ] **Step 4: Incluir `third_place` na limpeza de regeneracao**

No trecho que deleta matches derivados de playoff:

```ts
inArray(matches.bracketSide, [
	"upper",
	"lower",
	"main",
	"grand_final",
	"third_place",
])
```

- [ ] **Step 5: Escrever teste para flag desligada / 2 times / idempotencia**

Adicionar casos:

```ts
it("does not create third-place match when setting disabled", async () => { ... });
it("does not create third-place match without semifinals", async () => { ... });
it("regeneration keeps only one third-place match", async () => { ... });
```

- [ ] **Step 6: Rodar testes de matches**

Run: `bun test apps/web/src/server/matches.test.ts`
Expected: PASS dos casos novos e existentes.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/server/matches.ts apps/web/src/server/matches.test.ts
git commit -m "feat: generate optional third-place match for single elimination"
```

---

### Task 4: Exibicao e fluxo de aposta com comportamento padrao

**Files:**
- Modify: `apps/web/src/components/admin/BracketEditor.tsx`
- Modify: `apps/web/src/routes/$lang/admin/tournaments/$tournamentId/matches.tsx`
- Modify: `apps/web/src/routes/$lang/index.tsx` (se houver filtros de `bracketSide` restritivos)
- Test: `apps/web/src/utils/recovery-integration.test.ts` (apenas se impactar recovery filters)

- [ ] **Step 1: Escrever teste para visibilidade da partida de 3o lugar no admin/publico**

Teste de render/filtro:

```ts
it("includes third-place bracket matches in admin bracket views", () => {
	// mount with bracketSide: "third_place"
	// expect label visible
});
```

- [ ] **Step 2: Rodar teste e confirmar falha**

Run: `bun test apps/web/src/components/admin/BracketEditor.test.tsx -t "third-place"`
Expected: FAIL se filtro atual ignorar side novo.

- [ ] **Step 3: Ajustar filtros que assumem apenas upper/lower/main/grand_final**

Atualizar condicoes e agrupamentos para incluir `third_place` onde apropriado:

```ts
const isBracketMatch = [
	"upper",
	"lower",
	"main",
	"grand_final",
	"third_place",
].includes(match.bracketSide ?? "");
```

- [ ] **Step 4: Garantir i18n de label de 3o lugar na UI**

Adicionar/usar chave de traducao:

```json
"matches": {
	"thirdPlaceMatch": "Disputa de 3o Lugar"
}
```

```json
"matches": {
	"thirdPlaceMatch": "Third Place Match"
}
```

- [ ] **Step 5: Verificar fluxo de aposta sem regra especial**

Run: `bun test apps/web/src/utils/recovery.test.ts apps/web/src/utils/recovery-integration.test.ts`
Expected: PASS sem regressao de recovery/betting.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/BracketEditor.tsx apps/web/src/routes/$lang/admin/tournaments/$tournamentId/matches.tsx apps/web/src/routes/$lang/index.tsx apps/web/src/locales/pt/*.json apps/web/src/locales/en/*.json
git commit -m "feat: include third-place matches in bracket/admin betting flows"
```

---

### Task 5: Validacao final e limpeza

**Files:**
- Modify (se necessario): arquivos tocados nas tasks anteriores

- [ ] **Step 1: Rodar typecheck do web app**

Run: `bun --cwd apps/web tsc --noEmit`
Expected: sem novos erros alem dos pre-existentes conhecidos do repositorio.

- [ ] **Step 2: Rodar suite de testes relevante**

Run: `bun test apps/web/src/server/matches.test.ts apps/web/src/server/tournaments.test.ts apps/web/src/utils/recovery.test.ts apps/web/src/utils/recovery-integration.test.ts`
Expected: casos novos de third-place PASS; falhas pre-existentes documentadas separadamente se houver.

- [ ] **Step 3: Rodar check de lint/format do repo**

Run: `bun run check`
Expected: sem novos erros introduzidos pelos arquivos alterados.

- [ ] **Step 4: Commit final de ajustes**

```bash
git add -A
git commit -m "chore: finalize third-place single elimination support"
```

- [ ] **Step 5: Resumo para PR**

Documentar no corpo do PR:

```md
- Added optional `enableThirdPlaceMatch` in Single Elimination stage settings
- Generates third-place match automatically from semifinal losers when enabled
- Keeps behavior off by default and compatible with existing tournaments
- Includes third-place match in admin/public bracket and standard betting flow
```
