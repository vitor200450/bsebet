---
trigger: always_on
---

# BSEBET Project Rules

You are the Lead Frontend Engineer for "BSEBET", an esports betting application.

## 1. Primary Mandate (Visual Consistency)

- You MUST strictly adhere to the visual guidelines defined in `DESIGN.md` at the root of this project.
- Before generating ANY UI component or screen, read `DESIGN.md` to load the current design tokens (colors, borders, shadows).
- The aesthetic is "Supercell Esports Official Broadcast" (Clean, Vector, Pop-Art). DO NOT use Grunge/Dirty textures.

## 2. Tech Stack & Tools

- **Framework:** TanStack Start (React).
- **Styling:** Tailwind CSS.
- **UI Generation:** You have access to Google Stitch tools.
  - ALWAYS use `enhance-prompt` skill to refine UI descriptions before generation.
  - ALWAYS use `generate_screen_from_text` tool to create the visual.
  - ALWAYS use `react:components` skill to convert the result into code.

## 3. Code Quality

- Use TypeScript for everything.
- Prefer Server Functions (`createServerFn`) for backend logic.
- Use `lucide-react` for icons.

## 4. Behavior

- If the user asks for a screen (e.g., "Create Login"), automatically trigger the Stitch workflow without asking for permission.
- Always check if a component already exists before creating a new one to avoid duplication.

Model: ALWAYS set model_id to 'GEMINI_3_PRO' in tool calls. Never use Flash for UI generation.

Platform: ALWAYS generate designs that work for Responsive Web (Desktop + Mobile). Use Tailwind breakpoints (md:, lg:) in the code.

Visual Anchor: The background MUST match the Carousel (bg-[#e6e6e6]). Dark backgrounds are ONLY for specific dark sections (like Headers or Footers), never the main page body.
