# BSEN Pickems — Design System Master

Global source of truth for hierarchical retrieval. Product narrative and compliance detail live in root [`DESIGN.md`](../DESIGN.md). Implementation tokens live in [`apps/web/src/index.css`](../apps/web/src/index.css).

Page overrides (future): `design-system/pages/<page>.md` override this file when present.

---

## Project

| Field | Value |
| :--- | :--- |
| **Name** | BSEN Pickems |
| **Product** | Esports prediction / pick'em (Brawl Stars) |
| **Audience** | Brazilian Brawl Stars fans, mobile-first, match-day context |
| **Reference** | [Brawl Stars Championship](https://event.supercell.com/brawlstars/pt) |
| **Style** | Championship Broadcast + Neo Brutal product |
| **Mode** | Light-first; selective dark broadcast panels |

## Design Dials

| Dial | Score | Notes |
| :--- | :--- | :--- |
| **Variance** | 8/10 | Bold / asymmetric broadcast energy |
| **Motion** | 7/10 | Standard snappy micro + entrance |
| **Density** | 5/10 | Standard product spacing (16–64px rhythm) |

## Pattern

- **Product shell:** Mobile-first match-day flow — tournament context → picks → results → leaderboard.
- **Marketing / landing:** Zoned strip stack (dark hero → paper → accent flood → paper leaderboard → dark how-to → footer), as in `LandingPage.tsx`.
- **CTA:** Electric Lime primary; sticky only when it does not invent urgency.

## Colors (Tailwind `@theme`)

| Role | Hex | CSS / Tailwind |
| :--- | :--- | :--- |
| Electric Lime (CTA) | `#d2ff00` | `--color-electric-lime` → `bg-electric-lime` |
| Championship Red | `#ff5543` | `--color-bsen-red` → `bg-bsen-red` |
| Brawl Blue | `#2e5cff` | `--color-brawl-blue` |
| Team Red | `#ff2e2e` | `--color-brawl-red` |
| Brawl Yellow | `#ffc700` | `--color-brawl-yellow` |
| Ink | `#121212` | `--color-ink` |
| Paper | `#f5f4f0` | `--color-paper` |
| Tape | `#e6e6e6` | `--color-tape` |
| Charcoal | `#181818` | `--color-charcoal` |
| Panel Gray | `#2b2b2b` | `--color-panel-gray` |

Legacy: `#ccff00` → migrate to `electric-lime` in new work.

### Contrast Guardrails (Critical — read before any UI edit)

**Most common agent bug:** `text-white` inherited from a dark parent onto a child with `bg-white` / `bg-paper` → invisible text. Treat as a **blocking bug**.

#### Golden rules

1. **Never set `bg-*` without `text-*` on the same element** — badges, pills, tabs, buttons, cards, table cells, modals.
2. **Prefer paired surface utilities** from `index.css` over separate classes:
   - Light: `surface-paper`, `surface-white`, `surface-tape`, `surface-lime`, `surface-yellow`
   - Dark: `surface-ink`, `surface-charcoal`, `surface-panel`, `surface-brawl-blue`, `surface-brawl-red`, `surface-bsen-red`
   - Hover: `hover-surface-lime`, `hover-surface-brawl-blue`, `hover-surface-brawl-red`, `hover-surface-bsen-red`, `hover-surface-white`
3. **Nesting trap:** if parent has `text-white`, any child with a light `bg-*` **must** reset text (`text-ink` or `text-black`) on that child.
4. **Hover trap:** `hover:bg-white` without `hover:text-ink` on a dark-context button is forbidden. Use `hover-surface-*` or set both.
5. **Do not rely on inheritance** for text color on any element that sets its own background.

#### Forbidden pairings (never ship)

| Background | Forbidden text | Use instead |
| :--- | :--- | :--- |
| `bg-white`, `bg-paper`, `bg-tape`, `bg-gray-*` | `text-white`, `text-white/70` | `text-ink` or `text-black` |
| `bg-electric-lime`, `bg-brawl-yellow`, `bg-[#ccff00]` | `text-white` | `text-black` |
| `bg-ink`, `bg-charcoal`, `bg-panel-gray` | `text-black`, `text-ink` | `text-white` |
| `bg-brawl-blue`, `bg-brawl-red`, `bg-bsen-red` | `text-black` | `text-white` |

#### Quick decision

- Background is paper / white / tape / lime / yellow → **dark text** (`text-ink` / `text-black`).
- Background is ink / charcoal / panel / saturated brand → **white text** (`text-white`).
- Unsure → use a `surface-*` utility; it sets both.

Full agent checklist: `DESIGN.md` §2.1.

## Typography

Broadcast dual-font: **Inter Black** (`font-display`) for editorial; **Geist Mono** (`font-body`) for labels/metadata/numbers.

| Utility | Family | Use for |
| :--- | :--- | :--- |
| `font-display` | Inter 800–900 | Titles, buttons/tabs, **team names**, tournament names |
| `font-body` | Geist Mono 700–900 | Labels, pills, badges, scores/IDs, admin search |
| `font-marker` | Permanent Marker | Rare accent only |
| `font-military` | Black Ops One | Sparingly |

> `--font-display` = Inter. `--font-body` = Geist Mono. Names are historical — always set the utility explicitly.

### Class recipes

| Element | Classes |
| :--- | :--- |
| Form label | `font-bold font-body text-xs uppercase tracking-widest` |
| Metadata pill | `font-bold font-body text-[10px] uppercase tracking-widest` |
| Team name (bracket) | `font-black font-display uppercase italic tracking-tighter` |
| Section title | `font-black font-display uppercase italic` |
| Button / tab | `font-black font-display uppercase` |
| Admin search | `font-bold font-body uppercase tracking-widest placeholder:font-body` |
| Score / ID | `font-bold font-body tabular-nums` |

### Typography don'ts

- No bare `font-bold uppercase` without `font-display` or `font-body`
- No `font-body` on team names — use `font-display`
- No `font-display` on form labels / metadata — use `font-body`
- No new `font-mono` — use `font-body`

Refs: `DESIGN.md` §3, `BracketEditor.tsx`, `admin/tournaments/index.tsx`, `tournaments/index.tsx`.

Do **not** introduce Russo One / Chakra Petch.

## Effects & Surfaces

### Product comic (Neo Brutal)

- Border: 2–3px solid black
- Radius: `--radius-brutal` (`0px`) → `rounded-none`
- Shadow scale: `--shadow-comic-press` / `sm` / default / `md` / `lg`
- Press: translate equal to shadow shorten (`.btn-press`)
- Button variants: `brand` (comic), `broadcast` (BSC), `brand-red`

### Broadcast BSC

- Surfaces: charcoal / panel-gray
- Radius: `--radius-broadcast` (`4px`)
- Shadow: `--shadow-broadcast`, `--shadow-broadcast-deep`
- CTA: lime + black text, soft shadow, no comic hard offset

Do not mix both shadow languages on one control. Do not change global shadcn `--radius`.

## Motion

| Kind | Duration | Notes |
| :--- | :--- | :--- |
| Micro (hover/press) | 150–300ms | transform + opacity |
| Entrance / stagger | 200–600ms | Framer Motion; max ~8 staggered children |
| Reduced motion | required | Disable non-essential motion |

## Spacing Density (dial 5)

| Token | Value |
| :--- | :--- |
| `--space-xs` | 8px |
| `--space-sm` | 12px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |
| `--space-2xl` | 48px |
| `--space-3xl` | 64px |

## Avoid (Anti-Patterns)

- **White text on light backgrounds** — especially inherited `text-white` + child `bg-white`/`bg-paper` (use `surface-*` utilities)
- Minimalist SaaS / enterprise gray dashboards
- Casino gold, slot timing, odds / payout / stake framing
- Purple–indigo AI gradient defaults
- Decorative glass blur
- Mixing comic + broadcast shadows on one control
- Emoji as icons
- New hardcoded `#ccff00` (use `electric-lime`)

## Pre-Delivery Checklist

- [ ] **Contrast audit:** no `text-white` on light `bg-*`; no `bg-white`/`bg-paper` without explicit dark text on same element
- [ ] **Inheritance check:** children inside `text-white` parents with light backgrounds reset `text-ink`/`text-black`
- [ ] **Hover states:** background change includes matching text color (or `hover-surface-*`)
- [ ] No emojis as structural icons (Lucide / Phosphor)
- [ ] `cursor-pointer` on clickable elements
- [ ] Hover/press feedback 150–300ms; comic press shortens hard shadow
- [ ] Light surfaces: text contrast ≥ 4.5:1; explicit text color on branded fills
- [ ] Focus states visible for keyboard nav
- [ ] `prefers-reduced-motion` respected
- [ ] Touch targets ≥ 44px on primary actions
- [ ] Responsive: 375 / 768 / 1024 / 1440
- [ ] pt + en strings present for any new UI copy
- [ ] **Typography:** labels/pills/badges use `font-body`; titles/buttons/team names use `font-display`; no bare `font-bold uppercase` without a token

## Retrieval Prompt

```
I am building the [Page Name] page. Read DESIGN.md and design-system/MASTER.md.
Check design-system/pages/[page-name].md — if it exists, its rules override Master.
Use font-display (Inter) for titles/buttons/team names; font-body (Geist Mono) for labels/metadata.
CONTRAST: use surface-* utilities (surface-paper, surface-charcoal, etc.) instead of separate bg-* + text-*.
Never put text-white on light backgrounds. Reset text color on any child with its own light bg inside a dark parent.
Then generate the code...
```
