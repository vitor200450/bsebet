# BSEN Pickems Design System

**Aesthetic:** Championship Broadcast + Neo Brutal product. BSEN esports newsroom meets the official Brawl Stars Championship site — light-first product surfaces, selective dark tactical panels, electric lime actions, sharp geometry.

**Canonical tokens:** `apps/web/src/index.css` (`@theme inline`). Hierarchical mirror: `design-system/MASTER.md`.

## 1. Visual Theme & Atmosphere

BSEN Pickems is a public international esports prediction product, not a gambling-adjacent experience. The visual system should feel like a trusted competitive broadcast companion: loud enough for match-day hype, structured enough for news credibility, and clear enough for fast mobile decisions across Portuguese and English locales.

Direction merges Neo Brutalism (thick borders, hard offset shadows, mechanical press) with cues from [event.supercell.com/brawlstars](https://event.supercell.com/brawlstars/pt): deep tactical surfaces, electric lime CTAs, championship red emphasis, bold monospace display type, and sharp rectangular geometry.

### Scene

A young Brawl Stars esports fan anywhere in the world checks a phone between social posts and livestream moments on match day, often in bright ambient light, needing to make a quick team pick with confidence. The UI favors high-contrast light-first product surfaces with selective dark broadcast panels for dramatic moments — locale-aware copy (pt / en) without changing the visual language.

### Design Keywords

- Esports newsroom
- Broadcast lower-third
- Match-day command center
- Community leaderboard
- Neo brutal product panels
- Tactical neon accents

### Design Dials

| Dial | Value | Meaning |
| :--- | :--- | :--- |
| Variance | 8/10 | Bold / asymmetric broadcast energy |
| Motion | 7/10 | Standard snappy micro + entrance |
| Density | 5/10 | Standard product spacing |

## 2. Color Palette & Roles

Prefer Tailwind brand tokens (`bg-electric-lime`, `bg-bsen-red`, `bg-paper`, …) over raw hex. Legacy `#ccff00` should migrate to `electric-lime` (`#d2ff00`) in future PRs. Never rely on inherited text color on colored surfaces.

### Core Brand Colors

| Name | Hex | Token | Role |
| :--- | :--- | :--- | :--- |
| **Electric Lime** | `#d2ff00` | `electric-lime` | Primary CTA, saved pick, active tabs, community highlights |
| **Championship Red** | `#ff5543` | `bsen-red` | BSEN energy, key highlights, destructive / final-result emphasis |
| **Brawl Blue** | `#2e5cff` | `brawl-blue` | Team side, links, secondary broadcast accents |
| **Team Red** | `#ff2e2e` | `brawl-red` | Opposing team identity only (not primary brand red) |
| **Brawl Yellow** | `#ffc700` | `brawl-yellow` | Medals, ranked highlights, celebratory badges |
| **Ink** | `#121212` | `ink` | Primary text, hard borders, dark buttons |
| **Paper** | `#f5f4f0` | `paper` | Main app background (BSC warm paper) |
| **Tape** | `#e6e6e6` | `tape` | Secondary surfaces, disabled backgrounds |
| **Charcoal** | `#181818` | `charcoal` | Dark broadcast panels and high-drama sections |
| **Panel Gray** | `#2b2b2b` | `panel-gray` | Dark nested surfaces, dialogs, overlays |
| **Apple Blue** | `#007aff` | — | Utility links / focus when clearer than brand red |

### OKLCH Direction

```css
--color-electric-lime: oklch(0.93 0.24 122);
--color-bsen-red: oklch(0.67 0.22 31);
--color-brawl-blue: oklch(0.55 0.25 267);
--color-brawl-red: oklch(0.63 0.25 25);
--color-brawl-yellow: oklch(0.86 0.18 86);
--color-paper: oklch(0.96 0.01 95);
--color-tape: oklch(0.91 0.01 94);
--color-ink: oklch(0.18 0.01 94);
--color-charcoal: oklch(0.16 0.01 94);
--color-panel-gray: oklch(0.28 0.01 94);
```

### Mandatory Contrast Pairings

- Light / bright: `bg-electric-lime`, `bg-[#ccff00]` (legacy), `bg-brawl-yellow`, `bg-paper`, `bg-tape`, `bg-white`, `bg-gray-*` → `text-black` or `text-ink`.
- Dark / saturated: `bg-ink`, `bg-charcoal`, `bg-panel-gray`, `bg-bsen-red`, `bg-brawl-red`, `bg-brawl-blue` → `text-white`.
- Hover and active states must preserve contrast after background changes.
- Badges, pills, tabs, team labels, and buttons must always declare both background and text color explicitly.

### 2.1 Contrast Guardrails for Agents (Critical)

**Root cause of white-on-white bugs:** agents set `bg-white` or `bg-paper` on a child while the parent (or page section) already has `text-white`. CSS inheritance makes the text invisible.

#### Rules (blocking — do not ship violations)

1. **Pair bg + text on the same element.** Never add `bg-*` without `text-*` on badges, pills, tabs, buttons, cards, table cells, modals, or dropdown items.
2. **Prefer `surface-*` utilities** (`apps/web/src/index.css`) — they set background and text atomically:
   - Light: `surface-paper`, `surface-white`, `surface-tape`, `surface-lime`, `surface-yellow`
   - Dark: `surface-ink`, `surface-charcoal`, `surface-panel`, `surface-brawl-blue`, `surface-brawl-red`, `surface-bsen-red`
   - Hover: `hover-surface-lime`, `hover-surface-brawl-blue`, `hover-surface-brawl-red`, `hover-surface-bsen-red`, `hover-surface-white`
3. **Reset text inside dark sections.** When a child inside `text-white` / `surface-charcoal` gets a light background, add `text-ink` or `text-black` on that child (or use `surface-white` / `surface-paper`).
4. **Hover must update both.** `hover:bg-[#2e5cff] hover:text-white` is correct; `hover:bg-white` alone inside a dark context is not.
5. **Section-level text color is not enough.** Do not assume `text-white` on a `<section>` safely colors all descendants — any element with its own `bg-*` needs its own `text-*`.

#### Forbidden combinations

| Background class | Never use text | Required text |
| :--- | :--- | :--- |
| `bg-white`, `bg-paper`, `bg-tape`, `bg-gray-50`–`bg-gray-200` | `text-white`, `text-white/70`, `text-white/85` | `text-ink`, `text-black` |
| `bg-electric-lime`, `bg-brawl-yellow`, `bg-[#ccff00]` | `text-white` | `text-black` |
| `bg-ink`, `bg-charcoal`, `bg-panel-gray` | `text-black`, `text-ink` | `text-white` |
| `bg-brawl-blue`, `bg-brawl-red`, `bg-bsen-red` | `text-black` | `text-white` |

#### Before finishing any UI PR

Search changed files for `text-white` and verify each occurrence sits on a dark/saturated background. Search for `bg-white` / `bg-paper` and verify each has explicit dark text on the same element.

## 3. Typography

Broadcast dual-font system: **Inter Black** for editorial weight (names, titles, actions); **Geist Mono** for technical broadcast chrome (labels, metadata, numbers). Do not swap families for Russo One / Chakra Petch.

### Font Families (Tailwind utilities)

| Utility | Family | CSS var | Use for |
| :--- | :--- | :--- | :--- |
| **`font-display`** | Inter (800–900) | `--font-display` | Page titles, section headings, buttons/tabs, **team names**, tournament names, editorial UI text |
| **`font-body`** | Geist Mono (700–900) | `--font-body` | Form labels, metadata pills, badges, table headers, scores/ranks/IDs, admin search bars |
| **`font-sans`** | Inter Variable | `--font-sans` | Long body copy when not using explicit tokens |
| **`font-marker`** | Permanent Marker | `--font-marker` | Rare hype annotations only |
| **`font-military`** | Black Ops One | `--font-military` | Sparingly |

> **Naming note:** `--font-display` is Inter (sans editorial), not Geist. `--font-body` is Geist Mono (mono metadata), not Inter. Always set `font-display` or `font-body` explicitly — bare `font-bold` / `font-black` inherits `font-sans` and looks like generic Inter.

### Hierarchy

| Role | Token | Style |
| :--- | :--- | :--- |
| Page title / section header | `font-display` | `font-black font-display uppercase italic`, 24–36px |
| Tournament / match team name | `font-display` | `font-black font-display uppercase italic tracking-tighter`, 10–24px |
| Primary button / tab | `font-display` | `font-black font-display uppercase` |
| Form label | `font-body` | `font-bold font-body text-xs uppercase tracking-widest` |
| Metadata pill (region, dates, team count) | `font-body` | `font-bold font-body text-[10px] uppercase tracking-widest` |
| Status badge | `font-body` | `font-bold font-body text-[10px] uppercase tracking-widest` |
| Score / rank / ID / slug | `font-body` | `font-bold font-body tabular-nums` (+ `tracking-widest` when uppercase label) |
| Bracket match label (not team name) | `font-body` | `font-bold font-body text-[10px] uppercase tracking-widest` |
| Admin header search input | `font-body` | `font-bold font-body uppercase tracking-widest placeholder:font-body` |
| Body paragraph | `font-display` or `font-sans` | 14–16px, max 65–75ch |

### Class Recipes (copy-paste for agents)

```
/* Form label */
font-bold font-body text-black text-xs uppercase tracking-widest

/* Small gray field label */
font-bold font-body text-[10px] text-gray-500 uppercase tracking-widest

/* Metadata pill (region, dates, counts) */
font-bold font-body text-[10px] text-gray-600 uppercase tracking-widest

/* Team name in bracket / match card */
font-black font-display text-[10px] text-black uppercase italic leading-none tracking-tighter

/* Section title */
font-black font-display text-ink uppercase italic

/* Admin table header */
font-bold font-body text-sm text-white uppercase tracking-widest

/* Admin header search */
font-bold font-body text-sm uppercase tracking-widest placeholder:font-body placeholder:tracking-widest
```

### Typography Anti-Patterns (blocking)

- **Never** use bare `font-bold text-sm uppercase` or `font-black text-[10px] uppercase` without `font-display` or `font-body`.
- **Never** put **team names** (bracket, match cards, vs rows) on `font-body` — use `font-black font-display italic`.
- **Never** put form labels or metadata pills on `font-display` — use `font-body tracking-widest`.
- **Never** use `font-mono` for new UI — use `font-body` (Geist Mono is the canonical mono token).
- Parent with `font-body` does not fix children — each text element needs its own token class.

### Admin vs Public

| Surface | Search input | List metadata (region, dates) | Team names |
| :--- | :--- | :--- | :--- |
| **Admin** | `font-body` | `font-body` pills | `font-display` |
| **Public** | `font-display` | `font-body` pills | `font-display` |

Reference implementations: `apps/web/src/routes/$lang/admin/tournaments/index.tsx` (list metadata), `apps/web/src/components/admin/BracketEditor.tsx` (bracket cards), `apps/web/src/routes/$lang/tournaments/index.tsx` (public cards).

### Copy Rules

- Primary public vocabulary: **prediction**, **pick**, **pick'em**, **palpite**, **escolha**, **placar**, **ranking**, **leaderboard** — use locale-appropriate terms via i18n, never hardcoded strings.
- Avoid financial or gambling-coded vocabulary across UI, docs, translation keys, labels, routes when public-facing, and marketing copy.
- Do not use em dashes in UI copy.
- Portuguese (pt): keep energetic and natural, not literal English. English (en): direct, sporty broadcast tone — same energy, not a word-for-word translation.

## 4. Layout & Geometry

### Product Layout

- Mobile-first, one-handed primary flow.
- Match cards should prioritize: tournament context, status, team names, pick state, score/result.
- Avoid nested card grids. Use broadcast strips, bracket lanes, score panels, and segmented sections instead.
- Use dark broadcast panels selectively for hero moments, locked match states, finals, or leaderboard emphasis.

### Dual Surface Modes

Use one mode per region. Do not mix hard comic shadows with soft broadcast shadows on the same control.

#### Product comic (Neo Brutal)

- Borders: `border-[2px] border-black` standard; `border-[3px] border-black` on primary buttons/hero controls.
- Radius: `rounded-none` (`--radius-brutal: 0px`). Prefer square; slight skew only on decorative labels.
- Shadow scale: `shadow-comic-press` (1px) → `shadow-comic-sm` (2px) → `shadow-comic` (3px) → `shadow-comic-md` (4px) → `shadow-comic-lg` (6px); press via `.btn-press`.
- Canvas: `bg-paper` with optional paper texture.

#### Broadcast BSC (Championship panels)

- Surfaces: `bg-charcoal` / `bg-panel-gray`, thin `1px` borders in panel gray, not thick comic outlines.
- Radius: `rounded-broadcast` / `rounded-[4px]` or `rounded-none` (`--radius-broadcast: 4px`).
- Shadow: `shadow-broadcast`; modals `shadow-broadcast-deep`.
- Primary CTA on dark: Electric Lime fill, black text, soft broadcast shadow — no hard-offset comic shadow. Prefer `Button variant="broadcast"`.
- Do not change global shadcn `--radius` (0.625rem) for admin/forms; opt into brutal/broadcast radii per component.

### Borders & Shapes (shared)

- Inputs may use pill radius when search/filter behavior benefits from it.
- Dynamic labels may use slight skew, but core content should remain readable.

## 5. Component Guidance

### Primary Action Button

- Background: `bg-electric-lime` (`#d2ff00`).
- Text: `text-black`, `font-black`, uppercase or concise label.
- **Product comic:** `Button variant="brand"` — `border-[3px] border-black` + hard shadow + mechanical press.
- **Broadcast BSC:** `Button variant="broadcast"` — soft shadow, `rounded-broadcast`, no comic border.
- Never use casino-like gold as the primary action.

### Secondary Action Button

- Light surface: white or paper background, black border, black text.
- Dark surface: transparent or charcoal background, white text; hover lime or `bsen-red` depending on context.

### Pick / Prediction State

- Unsaved: neutral paper/tape surface with explicit black text.
- Selected/saved: Electric Lime border or fill with black text.
- Locked: charcoal or tape surface, clear locked icon/text, no pressure copy.
- Correct: celebratory lime/yellow with black text.
- Incorrect: restrained `bsen-red` or `brawl-red` outline/badge with white text. Avoid punitive language.

### Match Card

- Must show teams, status, and pick state without scrolling inside the card.
- Use team color sparingly as a side identity block, not as a thick side-stripe border.
- Prefer full-frame color bands, top labels, icons, or score blocks over side-stripe accents.
- Team logo areas should have stable dimensions to avoid layout shift.

### Leaderboard

- Treat rank as community bragging rights.
- Top positions can use yellow/lime accents with black text.
- Avoid prize, payout, value, stake, or reward framing.

### Admin UI

- Admin can be denser, but must still follow the same vocabulary and contrast rules for user-facing entities.
- Internal database names may remain temporarily, but labels, headings, toasts, and translations should use public-safe terms.
- Prefer existing shadcn radius unless a control is explicitly product-branded.

## 6. Motion

- Micro-interactions: 150–300ms.
- Entrances / route feel: 200–600ms.
- Use transform and opacity, not layout properties.
- Respect `prefers-reduced-motion`.
- Good uses: saved-pick confirmation, card hover lift, leaderboard rank reveal, bracket path highlight, mechanical button press.
- Avoid flashing, countdown pressure, slot-machine timing, or excessive reward loops.

## 7. Texture & Illustration

- Paper texture remains acceptable on light backgrounds if performance is unaffected.
- Paint splatters and comic marks can support broadcast energy, but should never obscure match information.
- BSEN partnership visuals should lean toward newsroom credibility: headline strips, ticker-like context rows, match-day labels, and clean editorial grouping.

## 8. Public Compliance Guardrails

Before shipping any public-facing screen, check:

1. No financial framing or gambling-coded vocabulary in visible UI.
2. No odds, stake, payout, prize-value, or risk mechanics.
3. No manipulative urgency. Lock times are informational, not pressure tactics.
4. All colored surfaces have explicit readable text color.
5. Portuguese and English translations are both present.
6. The experience reads as community predictions for international Brawl Stars esports fans.

## 9. Anti-Patterns

- **White text on light backgrounds** — never ship `text-white` on `bg-white`/`bg-paper`/lime/yellow; watch inheritance from dark sections (use `surface-*` utilities).
- Generic SaaS minimalism (gray-on-gray, soft enterprise cards).
- Casino / gambling dark patterns (flashing gold, slot timing, payout framing).
- Default AI purple / indigo gradient looks.
- Soft glassmorphism blur as decoration.
- Mixing product-comic and broadcast-BSC shadow languages on one control.
- Emoji as structural icons (use Lucide / Phosphor vectors).
- Hardcoded `#ccff00` in new code (use `electric-lime`).
