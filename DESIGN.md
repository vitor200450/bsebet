# BSEN Pickems Design System

**Aesthetic:** BSEN esports newsroom meets Brawl Stars Championship broadcast. Clean vector panels, heavy typography, high contrast, tactical match-day energy.

## 1. Visual Theme & Atmosphere

BSEN Pickems is a public esports prediction product, not a gambling-adjacent experience. The visual system should feel like a trusted competitive broadcast companion: loud enough for match-day hype, structured enough for news credibility, and clear enough for fast mobile decisions.

The base direction merges the existing BSEBET pop-art broadcast language with cues from the official Brawl Stars Championship site: deep tactical surfaces, electric lime actions, championship red emphasis, bold monospace type, and sharp rectangular geometry.

### Scene

A young Brawl Stars esports fan checks a phone between social posts and livestream moments on match day, often in bright ambient light, needing to make a quick team pick with confidence. The UI therefore favors high-contrast light-first product surfaces with selective dark broadcast panels for dramatic moments.

### Design Keywords

- Esports newsroom
- Broadcast lower-third
- Match-day command center
- Community leaderboard
- Sharp pop-art paneling
- Tactical neon accents

## 2. Color Palette & Roles

Use existing Tailwind tokens where present, but new or revised tokens should move toward OKLCH equivalents over time. Never rely on inherited text color on colored surfaces.

### Core Brand Colors

| Name | Hex | Role |
| :--- | :--- | :--- |
| **Championship Red** | `#ff5543` | Primary BSEN energy, key highlights, destructive or final result emphasis when appropriate |
| **Brawl Blue** | `#2e5cff` | Team side, links, secondary broadcast accents |
| **Electric Lime** | `#d2ff00` | Primary action, saved pick state, active tabs, important community highlights |
| **Brawl Yellow** | `#ffc700` | Medals, ranked highlights, celebratory badges |
| **Ink** | `#121212` | Primary text, hard borders, dark buttons |
| **Paper** | `#f0f0f0` | Main app background |
| **Tape** | `#e6e6e6` | Secondary surfaces, disabled backgrounds |
| **Charcoal** | `#181818` | Dark broadcast panels and high-drama sections |
| **Panel Gray** | `#2b2b2b` | Dark nested surfaces, dialogs, overlays |
| **Apple Blue** | `#007aff` | Utility links, focus accents when blue is clearer than brand red |

### Suggested OKLCH Direction

```css
--color-bsen-red: oklch(0.67 0.22 31);
--color-bsen-lime: oklch(0.91 0.25 126);
--color-brawl-blue: oklch(0.55 0.25 267);
--color-brawl-yellow: oklch(0.86 0.18 86);
--color-paper: oklch(0.95 0.01 94);
--color-tape: oklch(0.91 0.01 94);
--color-ink: oklch(0.18 0.01 94);
--color-charcoal: oklch(0.16 0.01 94);
```

### Mandatory Contrast Pairings

- `bg-[#d2ff00]`, `bg-[#ccff00]`, `bg-[#ffc700]`, `bg-paper`, `bg-tape`, `bg-white`, `bg-gray-*` -> `text-black` or `text-ink`.
- `bg-[#121212]`, `bg-[#181818]`, `bg-[#2b2b2b]`, `bg-[#ff5543]`, `bg-[#ff2e2e]`, `bg-[#2e5cff]` -> `text-white`.
- Hover and active states must preserve contrast after background changes.
- Badges, pills, tabs, team labels, and buttons must always declare both background and text color explicitly.

## 3. Typography

### Font Families

- **Display / Match Titles:** Geist Mono or Inter Black, depending on existing route usage.
- **Data / Scores / Timers:** Geist Mono.
- **Editorial / Long Copy:** Inter or project body font, optimized for reading.
- **Handwritten Accent:** Permanent Marker only for rare hype annotations, not core UI.

### Hierarchy

| Role | Style |
| :--- | :--- |
| Hero / Tournament Title | `uppercase`, `font-black`, tight tracking, 40-56px desktop, 28-36px mobile |
| Section Header | `uppercase`, `font-black`, 24-36px, compact line height |
| Match Team Name | `font-black`, 16-24px, high contrast |
| Score / Rank Number | Geist Mono, `font-black`, tabular numbers |
| UI Label | `uppercase`, `font-bold`, `tracking-widest`, 10-12px |
| Body | 14-16px, max 65-75ch, clear line height |

### Copy Rules

- Primary public vocabulary: **prediction**, **pick**, **pick'em**, **palpite**, **escolha**, **placar**, **ranking**, **leaderboard**.
- Avoid financial or gambling-coded vocabulary across UI, docs, translation keys, labels, routes when public-facing, and marketing copy.
- Do not use em dashes in UI copy.
- Keep Portuguese energetic and natural, not literal English.

## 4. Layout & Geometry

### Product Layout

- Mobile-first, one-handed primary flow.
- Match cards should prioritize: tournament context, status, team names, pick state, score/result.
- Avoid nested card grids. Use broadcast strips, bracket lanes, score panels, and segmented sections instead.
- Use dark broadcast panels selectively for hero moments, locked match states, finals, or leaderboard emphasis.

### Borders & Shapes

- Standard border: `border-[2px] border-black`.
- Hero/button border: `border-[3px] border-black`.
- Championship-style panels may use square corners or `rounded-sm` only.
- Inputs may use pill radius when search/filter behavior benefits from it.
- Dynamic labels may use slight skew, but core content should remain readable.

### Shadows

- Comic hard shadow remains part of the product language:
  - `shadow-[3px_3px_0px_0px_#000000]`
  - Hover/press: `shadow-[1px_1px_0px_0px_#000000]` with small translate.
- Dark broadcast surfaces may use soft depth:
  - `rgba(0, 0, 0, 0.24) 0px 4px 4px 0px`
  - Avoid glass blur unless tied to an actual overlay need.

## 5. Component Guidance

### Primary Action Button

- Background: Electric Lime `#d2ff00`.
- Text: `text-black`, `font-black`, uppercase or concise label.
- Border: `border-[3px] border-black` when on light surfaces; no border is allowed only inside already framed dark broadcast panels.
- Motion: press down 1-2px, shorten hard shadow.

### Secondary Action Button

- Light surface: white or paper background, black border, black text.
- Dark surface: transparent or charcoal background, white text, lime/red hover depending on context.
- Never use casino-like gold primary actions.

### Pick / Prediction State

- Unsaved: neutral paper/tape surface with explicit black text.
- Selected/saved: Electric Lime border or fill with black text.
- Locked: charcoal or tape surface, clear locked icon/text, no pressure copy.
- Correct: celebratory lime/yellow with black text.
- Incorrect: restrained red outline or red badge with white text. Avoid punitive language.

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

## 6. Motion

- Snappy, tactile, 200-600ms.
- Use transform and opacity, not layout properties.
- Respect `prefers-reduced-motion`.
- Good uses: saved-pick confirmation, card hover lift, leaderboard rank reveal, bracket path highlight.
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
6. The experience reads as community predictions connected to esports news.
