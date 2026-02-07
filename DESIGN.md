# BSEBET Design System (Official Broadcast Style)

**Aesthetic:** Supercell Esports Broadcast. Clean, Vector, Pop-Art. High Contrast.

## 1. Color Palette

### Semantic Colors

| Name                         | Hex       | Usage                                             |
| :--------------------------- | :-------- | :------------------------------------------------ |
| **Brawl Red** (Primary)      | `#ff2e2e` | Main accent, Team Red, Primary Buttons            |
| **Brawl Blue** (Secondary)   | `#2e5cff` | Team Blue, Secondary accents                      |
| **Brawl Yellow** (Highlight) | `#ffc700` | Highlights, Badges, Active Pagination             |
| **Neon Green** (Action)      | `#ccff00` | Active Selection Border, High priority indicators |
| **Ink** (Text/Dark)          | `#121212` | Primary Text, Dark Buttons, Borders               |
| **Paper** (Background)       | `#f0f0f0` | Main Background Surface                           |
| **Tape** (Neutral)           | `#e6e6e6` | Secondary Backgrounds, Disabled states            |
| **Surface Dark**             | `#0a0a0a` | Dark overlays, Modals                             |
| **Surface Light**            | `#e8e8e0` | Decorative elements                               |

### Tailwind Configuration

```css
--color-brawl-blue: #2e5cff;
--color-brawl-red: #ff2e2e;
--color-brawl-yellow: #ffc700;
--color-paper: #f0f0f0;
--color-ink: #121212;
--color-tape: #e6e6e6;
```

## 2. Borders & Shadows

### Borders

- **Standard Border**: `border-black` (solid black)
- **Thick Border**: `border-[3px]` or `border-[4px]` (for headers/buttons)
- **Standard Width**: `border` (1px) or `border-[2px]`

### Shadows (Comic / Pop-Art Style)

- **Shadow Comic**: `shadow-[3px_3px_0px_0px_#000000]` (Class: `shadow-comic`)
- **Shadow Comic Hover**: `shadow-[1px_1px_0px_0px_#000000]` (Class: `shadow-comic-hover`)
- **Shadow Deep**: `shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)]` (Class: `shadow-comic-deep`)
- **Drop Shadow**: `drop-shadow-sm` (clean, non-neon depth).

### Interactive States

- **Button Press**:
  ```css
  .btn-press:active {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0 0 #000;
  }
  ```

## 3. Typography

### Font Families

- **Display**: `Inter` (Class: `font-display`) - Used for Headings, Buttons, Labels.
- **Body / Data**: `Geist Mono` (Class: `font-body`) - Used for Stats, Descriptions, Numbers.
- **Marker**: `Permanent Marker` (Class: `font-marker`) - Used for handwritten annotations.
- **Military**: `Black Ops One` (Class: `font-military`) - Stylized headers.

### Text Styles

- **Headings**: `uppercase`, `font-black`, `italic`, `tracking-tighter`.
- **Labels (Small)**: `uppercase`, `font-bold`, `tracking-widest`, `text-[10px]` or `text-xs`.
- **Effects**: `text-shadow-sm` (subtle shadow for legibility).
- **Contrast**: Text color MUST NEVER match the background color (e.g. no white text on light gray). Always force `text-black` or `text-white` explicitly.

## 4. Shapes & Geometry

### Transformations

- **Dynamic Skew**: `skew-x-[-5deg]` or `skew-x-[5deg]` (used on labels/badges).
- **Rotation**: `rotate-1`, `-rotate-1`, `-rotate-6` (used on cards and decorations to break the grid).
- **Pop Animations**: `active:translate-y-1` (tactile feel).

### Corners

- **Small Radius**: `rounded-sm` (standard for buttons/cards - sharp but friendly).
- **Full Radius**: `rounded-full` (for VS circles, pagination dots).

## 5. Textures & Decorations

- **Paper Texture**: `url("https://www.transparenttextures.com/patterns/cream-paper.png")` (applied to background).
- **Noise**: `url("https://www.transparenttextures.com/patterns/noise-lines.png")`.
- **Paint Splatters**: SVG components (`PaintSplatterBlue`, `PaintSplatterRed`) with `fractalNoise` turbulence for ink bleed effects.
- **Pencil Texture**: `filter: contrast(110%) brightness(100%)`.
