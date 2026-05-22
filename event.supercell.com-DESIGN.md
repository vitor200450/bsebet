# Design System Inspired by Brawl Stars

## 1. Visual Theme & Atmosphere

The Brawl Stars design system embodies high-energy competitive gaming with a bold, action-driven visual language. The aesthetic combines vibrant neon accents against deep, near-black foundations, creating dramatic contrast and urgency. The typography is heavy and geometric, emphasizing dominance and impact. This system prioritizes clarity and intensity, designed to engage competitive players in a global esports event context. The color palette screams excitement through electrifying yellows and reds, while the minimal whitespace and powerful shadows create depth and hierarchy. Every element feels purposeful and tactical, reflecting the fast-paced nature of the game and championship atmosphere.

**Key Characteristics**
- Deep dark backgrounds with high-contrast bright accents
- Bold, geometric typography with substantial weight
- Neon electric yellows and vibrant reds for maximum visibility
- Strong shadow systems for layered depth
- Sharp borders and minimal rounded corners (except inputs)
- Competitive, action-oriented visual language
- Clear visual hierarchy through color and typography weight

## 2. Color Palette & Roles

### Primary
- **Championship Red** (`#FF5543`): Primary accent used throughout the interface for CTAs, highlights, and key interactive elements
- **Electric Yellow** (`#D2FF00`): Warning state and secondary emphasis; eye-catching accent for important actions

### Accent Colors
- **Lime Green** (`#A3C617`): Tertiary accent for supporting callouts and secondary visual emphasis
- **Dark Forest Green** (`#78911B`): Muted accent for subdued supporting elements
- **Pale Lime** (`#F1FFB1`): Light highlight for special callouts and badges
- **Apple Blue** (`#007AFF`): Interactive state for links and alternative CTAs

### Interactive
- **Vibrant Red** (`#EB3B57`): Hover and active states for red-themed buttons
- **Deep Pink** (`#F55671`): Alternative interactive accent for depth variation

### Neutral Scale
- **Pure Black** (`#000000`): Primary text and dark backgrounds
- **Pure White** (`#FFFFFF`): Body text on dark backgrounds, light content
- **Charcoal Dark** (`#2B2B2B`): Secondary backgrounds and muted text
- **Dark Gray** (`#454545`): Tertiary text and borders
- **Medium Gray** (`#717070`): Disabled and subtle states
- **Light Gray** (`#A0A0A0`): Secondary borders and dividers
- **Pale Gray** (`#D1D1D1`): Light borders and subtle outlines
- **Almost Black** (`#181818`): Deep background emphasis

### Surface & Borders
- **Light Border** (`#D1D1D1`): Input and component borders on light surfaces
- **Dark Surface** (`#2B2B2B`): Modal and card backgrounds

### Semantic / Status
- **Danger Red** (`#BE324A`): Error states and critical warnings
- **Deep Danger** (`#B8233B`): High-severity error emphasis

## 3. Typography Rules

### Font Family
**Primary:** Geist Mono (Fallback: `'Courier New', monospace`)
**Secondary:** SupercellText-Regular (Fallback: `'Arial', sans-serif`)
**Tertiary:** SupercellText-Medium (Fallback: `'Arial', sans-serif`)

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|-----------------|-------|
| Display/H1 | Geist Mono | 56px | 800 | 56px | Normal | Championship titles, hero headlines |
| Heading/H2 | Geist Mono | 36px | 800 | 36px | Normal | Section headers, major divisions |
| Subheading/H3 | SupercellText-Regular | 16px | 400 | 20.8px | Normal | Module titles, secondary headers |
| Subheading/H4 | SupercellText-Medium | 18px | 400 | 22.5px | Normal | Card titles, emphasis headers |
| Body/Paragraph | Geist Mono | 16px | 800 | 16px | Normal | Main content, body text |
| Button/Label | Geist Mono | 16px | 800 | 16px | Normal | Button text, strong labels |
| Caption/Small | Geist Mono | 12px | 800 | 12px | Normal | Captions, helper text, meta information |

### Principles
- Heavy weights (800) for dominance and impact; reinforces competitive gaming aesthetic
- Geometric monospace as primary creates technical, precise feel
- Serif weights vary strategically; 400 for secondary hierarchy, 800 for primary
- Consistent line heights maintain rhythm and readability despite dark backgrounds
- All caps or strong case conventions reinforce energy and authority
- Minimal letter spacing; tight tracking emphasizes boldness

## 4. Component Stylings

### Buttons

#### Primary Button (Lime CTA)
- **Background:** `#D2FF00`
- **Text Color:** `#000000`
- **Font:** Geist Mono, 16px, weight 800
- **Padding:** `0px` (height: 48px, width: 100px)
- **Border Radius:** `4px`
- **Border:** None
- **Box Shadow:** `rgba(0, 0, 0, 0.24) 0px 4px 4px 0px`
- **Line Height:** 16px
- **Hover:** Brightness increase 10%, shadow expand to `rgba(0, 0, 0, 0.32) 0px 6px 8px 0px`
- **Active:** Brightness decrease 10%, shadow reduce to `rgba(0, 0, 0, 0.16) 0px 2px 2px 0px`

#### Primary Button (No Shadow)
- **Background:** `#D2FF00`
- **Text Color:** `#000000`
- **Font:** Geist Mono, 16px, weight 800
- **Padding:** `0px`
- **Border Radius:** `4px`
- **Border:** None
- **Box Shadow:** None
- **Height:** 48px
- **Width:** 100px
- **Line Height:** 16px

#### Secondary/Text Button
- **Background:** Transparent (`rgba(0, 0, 0, 0)`)
- **Text Color:** `#000000`
- **Font:** Geist Mono, 16px, weight 800
- **Padding:** `12px 16px 12px 16px`
- **Border Radius:** `0px`
- **Border:** None
- **Box Shadow:** None
- **Height:** 40px
- **Hover:** Text color shift to `#FF5543`
- **Active:** Text color `#EB3B57`

#### Ghost Button
- **Background:** Transparent (`rgba(0, 0, 0, 0)`)
- **Text Color:** `#000000`
- **Font:** Geist Mono, 16px, weight 800
- **Padding:** `0px`
- **Border Radius:** `0px`
- **Border:** None
- **Box Shadow:** None
- **Height:** 48px
- **Width:** 100px
- **Hover:** Text color `#FF5543`

#### Small Label Button
- **Background:** Transparent (`rgba(0, 0, 0, 0)`)
- **Text Color:** `#000000`
- **Font:** Geist Mono, 12px, weight 800
- **Padding:** `0px`
- **Border Radius:** `0px`
- **Border:** None
- **Box Shadow:** None
- **Height:** Auto
- **Width:** Auto
- **Line Height:** 12px

### Inputs & Forms

#### Text Input
- **Background:** `#FFFFFF`
- **Text Color:** `#000000`
- **Font:** SupercellText-Regular, 12.8px, weight 400
- **Padding:** `6px 35px 6px 15px`
- **Border Radius:** `50px`
- **Border:** `1px solid #D1D1D1`
- **Box Shadow:** None
- **Height:** 31px
- **Width:** 100%
- **Line Height:** Normal
- **Focus:** Border color shift to `#007AFF`, shadow `0px 0px 0px 2px rgba(0, 122, 255, 0.1)`
- **Placeholder:** Color `#A0A0A0`
- **Error State:** Border color `#BE324A`

### Navigation

#### Main Navigation
- **Background:** Transparent (`rgba(0, 0, 0, 0)`)
- **Text Color:** `#000000`
- **Font:** Geist Mono, 16px, weight 800
- **Padding:** `0px`
- **Border Radius:** `0px`
- **Border:** None
- **Box Shadow:** None
- **Height:** 165.391px
- **Width:** Full container width
- **Line Height:** 16px
- **Link Hover:** Color shift to `#FF5543`, underline appears
- **Active Link:** Color `#FF5543`, underline `2px solid #FF5543`

### Links

#### White Link (on dark backgrounds)
- **Background:** Transparent (`rgba(0, 0, 0, 0)`)
- **Text Color:** `#FFFFFF`
- **Font:** Geist Mono, 16px, weight 800
- **Padding:** `0px`
- **Border Radius:** `0px`
- **Border:** None (`#FFFFFF`)
- **Box Shadow:** None
- **Height:** 48px
- **Hover:** Color `#D2FF00`
- **Active:** Color `#FF5543`

#### Black Link (on light backgrounds)
- **Background:** Transparent (`rgba(0, 0, 0, 0)`)
- **Text Color:** `#000000`
- **Font:** Geist Mono, 16px, weight 800
- **Padding:** `0px`
- **Border Radius:** `0px`
- **Border:** None
- **Box Shadow:** None
- **Height:** 48px
- **Hover:** Color `#FF5543`
- **Active:** Color `#EB3B57`

#### Hyperlink with Underline
- **Background:** Transparent (`rgba(0, 0, 0, 0)`)
- **Text Color:** `#007AFF`
- **Font:** Geist Mono, 12px, weight 800
- **Padding:** `0px`
- **Border Radius:** `0px`
- **Border:** None
- **Box Shadow:** None
- **Text Decoration:** Underline
- **Hover:** Brightness increase 15%

### Cards & Containers

#### Modal/Dialog Container
- **Background:** `#2B2B2B`
- **Border:** `1px solid #454545`
- **Border Radius:** `0px`
- **Padding:** `24px` to `48px` (context-dependent)
- **Box Shadow:** `rgba(0, 0, 0, 0.5) 0px 8px 32px 0px`

#### Content Card
- **Background:** `#181818`
- **Border:** `1px solid #2B2B2B`
- **Border Radius:** `0px`
- **Padding:** `16px` to `24px`
- **Box Shadow:** `rgba(0, 0, 0, 0.24) 0px 4px 4px 0px`

#### Alert/Warning Box
- **Background:** `rgba(210, 255, 0, 0.1)` (Electric Yellow tint)
- **Border:** `1px solid #D2FF00`
- **Border Radius:** `4px`
- **Padding:** `12px 16px`
- **Text Color:** `#000000`
- **Font:** SupercellText-Regular, 14px, weight 400

#### Error Box
- **Background:** `rgba(190, 50, 74, 0.1)` (Danger Red tint)
- **Border:** `1px solid #BE324A`
- **Border Radius:** `4px`
- **Padding:** `12px 16px`
- **Text Color:** `#BE324A`
- **Font:** SupercellText-Regular, 14px, weight 400

## 5. Layout Principles

### Spacing System

**Base Unit:** `4px`

**Scale:**
- `4px` — Micro gaps, minimal spacing
- `8px` — Tight component gutters
- `12px` — Internal padding, small gaps
- `16px` — Standard padding, medium gaps
- `24px` — Card and section padding
- `28px` — Transitional margin
- `32px` — Section margins
- `40px` — Large section margins
- `48px` — Page/container padding
- `52px` — Major gap between sections
- `68px` — Prominent spacing
- `80px` — Large section separation

**Usage Context:**
- `4px`–`8px`: Icon spacing, internal component gaps
- `12px`–`16px`: Button padding, input spacing, tight containers
- `24px`–`32px`: Card padding, module margins
- `40px`–`80px`: Section breaks, page-level spacing

### Grid & Container

- **Max Width:** Full viewport with `48px` padding on sides
- **Desktop Container:** 1440px maximum width centered
- **Column Strategy:** Flexible grid (typically 12-column) with `16px` gutters
- **Section Pattern:** Consistent `52px` to `80px` vertical spacing between major sections
- **Modal/Overlay:** Centered with backdrop blur, `24px` minimum margin from viewport edges on mobile

### Whitespace Philosophy

Space is purposeful and hierarchical. Dense dark backgrounds necessitate generous breathing room to prevent visual fatigue. Sections are clearly separated with substantial gaps (52px–80px). Internal component spacing is tight (12px–16px) to reinforce grouping, while external spacing is expansive to create clear hierarchy and scan-ability. Typography and whitespace work together to guide attention to high-energy elements (bright buttons, warning states).

### Border Radius Scale

- `0px` — Buttons, navigation, links, cards, modals (sharp, geometric aesthetic)
- `4px` — Input fields, alert boxes, secondary containers (subtle roundness)
- `50px` — Form inputs (pill-shaped for softness in contrast to harsh design)

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (0) | No shadow, transparent or flat color | Buttons without elevation, text links, backgrounds |
| Raised (1) | `rgba(0, 0, 0, 0.24) 0px 4px 4px 0px` | Primary buttons with shadow, standard cards |
| Pressed (2) | `rgba(0, 0, 0, 0.32) 0px 6px 8px 0px` | Hovered/active buttons, enhanced cards |
| Sunken (3) | `rgba(0, 0, 0, 0.16) 0px 2px 2px 0px` | Pressed/active button state, recessed elements |
| Modal/Overlay (4) | `rgba(0, 0, 0, 0.5) 0px 8px 32px 0px` | Modals, dialogs, overlays above content |

**Shadow Philosophy:** Shadows are subtle but present, reinforcing the dark aesthetic. They use pure black with opacity to maintain cohesion with the near-black background palette. Elevation increases are measured and deliberate, avoiding excessive layering. Shadows appear primarily on interactive and prominent elements (buttons, cards, modals) to guide interaction and hierarchy. The system prioritizes contrast through color and typography over aggressive depth.

## 7. Do's and Don'ts

### Do

- **Use high-contrast colors deliberately.** Pair bright accents (`#D2FF00`, `#FF5543`) against `#000000` or `#2B2B2B` backgrounds for maximum impact and readability.
- **Apply heavy typography weights.** Default to 800-weight for primary and body text to maintain the bold, action-oriented aesthetic.
- **Maintain sharp corners.** Keep border-radius at `0px` for buttons, cards, and navigation to reinforce the geometric, competitive feel.
- **Space sections generously.** Use `52px`–`80px` margins between major content blocks to prevent visual overwhelm on dark backgrounds.
- **Prioritize buttons with shadow elevation.** Primary CTAs should include `rgba(0, 0, 0, 0.24) 0px 4px 4px 0px` shadow for click affordance.
- **Use semantic colors consistently.** `#D2FF00` for actions, `#BE324A` for errors, `#007AFF` for alternative links.
- **Ensure text color contrast.** Always pair black text with light backgrounds and white/light text with dark backgrounds (minimum 7:1 ratio).
- **Group related inputs with consistent padding.** Maintain `12px`–`16px` padding within form groups for visual coherence.

### Don't

- **Don't overuse neon accents.** Limit `#D2FF00` and `#FF5543` to critical interactive elements; excessive use dilutes impact.
- **Don't apply rounded corners to primary buttons.** Maintain `border-radius: 0px` for buttons (exception: inputs use `50px`).
- **Don't use light gray text on dark backgrounds.** Minimum text color should be `#FFFFFF` or `#D1D1D1`; avoid `#A0A0A0` for body copy.
- **Don't mix font families within a single component.** Use Geist Mono for buttons/labels; SupercellText for secondary headers only.
- **Don't reduce shadow on hover.** Increase shadow elevation on hover/active states; never remove it entirely for interactive elements.
- **Don't nest modals deeply.** Keep overlay hierarchy to one level; use breadcrumbs or back buttons for navigation.
- **Don't add multiple border styles.** Use either solid borders (`#D1D1D1`) or no border; avoid double/dashed patterns.
- **Don't shrink touch targets below 40px.** Maintain minimum `48px` height for buttons and interactive areas for accessibility.

## 8. Responsive Behavior

### Breakpoints

| Breakpoint | Width | Key Changes |
|------------|-------|-------------|
| Mobile | 320px–767px | Single-column layout, full-width containers (48px padding), buttons stack vertically, navigation collapses to mobile menu, font sizes reduce by 2–4px on captions |
| Tablet | 768px–1023px | Two-column grid, section padding reduces to `40px`, inputs full-width within columns, navigation wraps if needed |
| Desktop | 1024px–1440px | Three-plus column grid, max-width 1440px centered, full spacing scale applied, side-by-side layouts enabled |
| Wide | 1441px+ | 1440px max-width maintained, centered with outer padding, no further layout changes |

### Touch Targets

- **Minimum Interactive Height:** `48px` (buttons, link areas)
- **Minimum Interactive Width:** `48px` (icon buttons)
- **Input Height:** `31px` minimum (form inputs)
- **Spacing Between Targets:** Minimum `8px` to `12px` to prevent mis-taps
- **Mobile Padding:** `12px` minimum inner padding on interactive elements for thumb-friendly targets

### Collapsing Strategy

- **Mobile (320px–767px):**
  - Stack all sections vertically with `32px` spacing
  - Full-width inputs and buttons
  - Navigation transforms to hamburger menu or off-canvas drawer
  - Hide non-essential decorative elements
  - Typography: Display text reduces to `40px`; body remains `16px`
  - Padding around containers: `16px` instead of `48px`

- **Tablet (768px–1023px):**
  - Two-column grid for content sections
  - Forms can display side-by-side if appropriate
  - Navigation inline or partial collapse
  - Padding: `32px`–`40px`
  - Typography maintains desktop hierarchy

- **Desktop (1024px+):**
  - Multi-column layouts fully activated
  - Modals center with `24px` minimum margin
  - Full `48px` padding on containers
  - All typography at full scale
  - Navigation fully expanded

## 9. Agent Prompt Guide

### Quick Color Reference

- **Primary CTA:** Electric Yellow (`#D2FF00`)
- **Secondary CTA:** Championship Red (`#FF5543`)
- **Error/Danger:** Danger Red (`#BE324A`)
- **Alternative Link:** Apple Blue (`#007AFF`)
- **Success/Action:** Lime Green (`#A3C617`)
- **Body Background:** Pure Black (`#000000`)
- **Surface Background:** Charcoal Dark (`#2B2B2B`)
- **Body Text (dark bg):** Pure White (`#FFFFFF`)
- **Body Text (light bg):** Pure Black (`#000000`)
- **Borders:** Pale Gray (`#D1D1D1`)
- **Disabled/Secondary Text:** Medium Gray (`#717070`)

### Iteration Guide

1. **Start with black backgrounds and white text.** All dark sections use `#000000` or `#2B2B2B`; white text defaults to `#FFFFFF` or off-white. Ensure 7:1 contrast minimum.

2. **Apply Geist Mono 800-weight for dominance.** Buttons, navigation, and body text all use 800-weight monospace for that bold, championship feel. Headers use same font at `36px` (H2) or `56px` (H1).

3. **Use `#D2FF00` sparingly for primary CTAs only.** This is the electric yellow button color with `4px` border radius and shadow `rgba(0, 0, 0, 0.24) 0px 4px 4px 0px`. Only one primary button per section.

4. **Space sections with `52px`–`80px` gaps.** Never crowd content; use consistent vertical margins between major sections to maintain breathing room and hierarchy.

5. **Keep buttons and cards at `border-radius: 0px`.** The sharp, geometric aesthetic is critical. Only exception: form inputs use `50px` for pill-shaped appearance.

6. **Implement error states with `#BE324A` border and red tint backgrounds.** Use `rgba(190, 50, 74, 0.1)` for background, `#BE324A` for border on alert/error containers.

7. **Add shadows only to elevated interactive elements.** Primary buttons, cards, and modals get shadows; text links and ghost buttons remain flat (`box-shadow: none`).

8. **Input fields must be `#FFFFFF` background with `50px` border-radius.** Padding: `6px 35px 6px 15px`. Border: `1px solid #D1D1D1`. Font: SupercellText-Regular 12.8px.

9. **Modal/dialog containers use `#2B2B2B` background with strong shadow.** Shadow: `rgba(0, 0, 0, 0.5) 0px 8px 32px 0px`. Padding: `24px` minimum. Center on viewport with backdrop.

10. **Maintain responsive breakpoints strictly:** Mobile (320px) full-width stacked, Tablet (768px) two-column, Desktop (1024px+) multi-column with 1440px max-width. Adjust typography only on mobile captions (reduce 2–4px).