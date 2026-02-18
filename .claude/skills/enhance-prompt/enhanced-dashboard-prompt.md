# Enhanced Stitch Prompt: BSEBET Dashboard "Command Center"

A high-energy esports betting dashboard that feels like a professional broadcast control room with animated live indicators, comic-style bet cards, and bold tournament navigation.

**DESIGN SYSTEM (REQUIRED - BSEBET Official Broadcast Style):**

**Platform & Theme:**
- Platform: Web, Desktop-first with mobile responsive breakpoints
- Aesthetic: Supercell Esports Official Broadcast - Clean, Vector, Pop-Art, High Contrast
- Typography: Black, Italic, Uppercase, Tracking Tight (font-black italic uppercase tracking-tighter)

**Color Palette:**
- Background: Tape Gray (#e6e6e6) - main page background with subtle paper texture
- Surface: Paper White (#f0f0f0) - card backgrounds
- Ink Black (#121212) - primary text, borders, all strokes
- Neon Green (#ccff00) - LIVE indicators, active states, glowing accents
- Brawl Yellow (#ffc700) - action buttons, highlights, badges
- Brawl Red (#ff2e2e) - team A accent, urgent states
- Brawl Blue (#2e5cff) - team B accent, secondary actions

**Visual Style Rules:**
- All cards: White background with 2-3px solid black borders
- Comic Shadows: 4px 4px 0 0 #000 (hard drop shadow, NO blur)
- Buttons: Transform skew-x-12deg with 3px black borders
- Icons: Material Symbols Outlined, bold weight
- Corners: Minimal radius (2-4px) - sharp but friendly
- Transformations: Subtle rotations (1-2deg) on cards to break grid rigidity

**Typography Hierarchy:**
- Page Title: 48-64px, Black 900, Italic, Uppercase, Tracking -0.05em
- Section Headers: 24-32px, Black 900, Italic, Uppercase
- Card Titles: 14-16px, Bold 700, Uppercase, Tracking 0.05em
- Body Text: 12-14px, Medium 500, Normal case
- Micro Labels: 10px, Bold 700, Uppercase, Tracking widest

---

**PAGE STRUCTURE:**

**1. Page Header (Command Center Title)**
- Black box with white text, skewed -12deg
- Text: "COMMAND CENTER" (48px, black 900, italic, uppercase)
- Positioned top-left with 4px comic shadow
- Welcome message below in small gray text

**2. Live Ticker Section**
- Section title: "PARTIDAS AO VIVO" with Activity icon (24px)
- Horizontal scrolling container (hide scrollbar)
- Each live match card:
  - White card, 2px black border, 3px comic shadow
  - Neon green (#ccff00) "LIVE" badge top-left with pulsing red dot
  - Team A logo (40px circle) | Score (32px bold) VS Score | Team B logo
  - Tournament name below in 10px gray uppercase
  - Min-width: 320px per card
  - Hover: Shadow increases to 5px
- Empty state: "Nenhuma partida ao vivo no momento" centered in white box

**3. My Active Bets Section**
- Section title: "MEUS PALPITES ATIVOS" with gamepad icon
- Grid layout: 1 column mobile, 2 tablet, 3 desktop (gap: 16px)
- Each bet card:
  - White background, 2px black border, 4px comic shadow
  - Status badge top-right: "AO VIVO" (red, pulsing) or "AGENDADO" (gray)
  - Tournament name: 10px gray uppercase, truncated
  - Team logos side-by-side with VS between
  - Predicted winner highlighted with Neon Green (#ccff00) 40% opacity background
  - Prediction score below: "Palpite: 2 - 1" (14px bold)
  - Match time at bottom: "15 Jan, 14:30" (9px gray)
  - Hover: Shadow grows, card lifts slightly
- Empty state: "Você não tem palpites ativos" + Yellow CTA button "VER PARTIDAS"

**4. Quick Actions Section (Tournament Buttons)**
- Section title: "TORNEIOS ATIVOS" with trophy icon
- Horizontal flex wrap row (gap: 12px)
- Each button:
  - Brawl Yellow (#ffc700) background
  - 3px black border, 3px comic shadow
  - Transform: skew-x-12deg
  - Content (de-skewed inside): Tournament logo (32px) + name (14px bold uppercase) + chevron icon
  - Hover: Translate 2px down+right, shadow reduces to 1px (press effect)
  - Active: Translate 3px, shadow disappears
- Empty state: White box with "Nenhum torneio ativo no momento"

**5. Loading States**
- Skeleton cards: White boxes with 2px black borders, gentle pulse animation
- Same dimensions as actual content

---

**INTERACTION DETAILS:**

**Animations:**
- LIVE badge: Pulsing red dot (animate-pulse)
- Hover states: Shadow growth + subtle lift (150ms ease)
- Button press: Translate transform (no scale)
- Scroll ticker: Smooth horizontal scroll, no vertical overflow

**Responsive Breakpoints:**
- Mobile (<768px): Single column bets, stacked buttons, smaller text
- Tablet (768-1024px): 2-column bet grid, wrapped buttons
- Desktop (>1024px): 3-column bet grid, full horizontal buttons

**Accessibility:**
- High contrast maintained (black on white, white on black)
- Icon + text labels for all actions
- Focus states: Neon green 2px outline
- Touch targets: Minimum 44px height

---

**CRITICAL DESIGN NOTES:**
- NO gradients, NO blur shadows, NO soft edges - this is hard vector pop-art
- NO white text on light backgrounds - always black or white with high contrast
- Comic shadows MUST be solid black, no transparency
- All transforms must de-transform content inside (skew container, unskew text)
- Maintain grid-breaking micro-rotations on cards (1-2deg) for energy

**Mood:** Professional esports broadcast meets playful comic book aesthetics - energetic, trustworthy, bold.
