# Public Brand Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace public-facing BSEBET brand copy with BSEN Pickems while keeping internal package names, imports, DB identifiers, and routes stable.

**Architecture:** This is a public-brand copy and asset pass. Translation values, meta title, and visible logo usage move to BSEN Pickems; technical identifiers such as `@bsebet/*`, schema names, env names, and internal URLs remain unchanged.

**Tech Stack:** React 19, TanStack Start, react-i18next JSON locales, Bun test, static assets under `apps/web/public`.

---

### Task 1: Expand public copy guard for brand copy

**Files:**
- Modify: `apps/web/src/i18n/public-copy-guard.test.ts`

- [ ] Add a public brand guard that scans public locale values and selected public metadata files for visible `BSEBET`.
- [ ] Whitelist technical package/import names and non-public docs.
- [ ] Run the test and verify it fails before brand text updates.

### Task 2: Update public brand translations and metadata

**Files:**
- Modify: `apps/web/src/locales/en/common.json`
- Modify: `apps/web/src/locales/pt/common.json`
- Modify: `apps/web/src/locales/en/landing.json`
- Modify: `apps/web/src/locales/pt/landing.json`
- Modify: `apps/web/src/locales/en/leaderboard.json`
- Modify: `apps/web/src/locales/pt/leaderboard.json`
- Modify: `apps/web/src/routes/__root.tsx`

- [ ] Replace visible `BSEBET` values with `BSEN Pickems`.
- [ ] Preserve technical names and route paths.
- [ ] Keep Supercell disclaimer text intact except for the product name.

### Task 3: Use new generated logo asset publicly where applicable

**Files:**
- Existing asset: `apps/web/public/logo-newer.png`

- [ ] Confirm the asset exists.
- [ ] Search current logo usage and update public references from old logo asset to `logo-newer.png` if the app uses `logo-new.png` visibly.

### Task 4: Verify

- [ ] Run `bun test apps/web/src/i18n/public-copy-guard.test.ts`.
- [ ] Run `bun run check-types`.
- [ ] Report any pre-existing lint issues separately if `bun run check` is attempted.
