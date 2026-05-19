# Public Pickems Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove public-facing gambling-coded copy from the UI and i18n while keeping internal routes, DB schema, and function names stable.

**Architecture:** This is a copy-only public safety pass. Translation values and hardcoded visible component strings change from betting language to pick/prediction language, while keys, namespaces, route paths, schema names, and server identifiers remain unchanged.

**Tech Stack:** React 19, TanStack Start, react-i18next JSON locales, Bun test, Biome.

---

### Task 1: Add public copy guard test

**Files:**
- Create: `apps/web/src/i18n/public-copy-guard.test.ts`

- [ ] Write a Bun test that scans public locale values and selected public components for forbidden public strings.
- [ ] Run it and verify it fails on current `Bet`, `Bets`, `Betting`, `Aposta`, and `Apostas` copy.

### Task 2: Update public locale values

**Files:**
- Modify: `apps/web/src/locales/en/*.json`
- Modify: `apps/web/src/locales/pt/*.json`

- [ ] Replace user-visible betting language with pick/prediction language.
- [ ] Preserve existing translation keys to avoid broad code refactors.
- [ ] Keep admin text user-safe where it describes public behavior.

### Task 3: Update hardcoded public strings

**Files:**
- Modify selected public components found by the guard test.

- [ ] Replace visible hardcoded `Apostas`, `Revisar Apostas`, and similar strings with `Palpites`/translation calls where practical.
- [ ] Avoid renaming files, routes, DB entities, or local variables in this pass.

### Task 4: Verify

- [ ] Run `bun test apps/web/src/i18n/public-copy-guard.test.ts`.
- [ ] Run `bun run check-types`.
- [ ] Run `bun run check` if typecheck passes.
