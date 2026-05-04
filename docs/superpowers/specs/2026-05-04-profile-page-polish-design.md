# Profile Page Polish Design

## Context
- Surface: `apps/web/src/routes/$lang/profile.tsx`
- Register: product UI
- Goal: polish the existing profile editing page so it matches the redesigned dashboard language without changing the information architecture.

## Approved Direction
- Keep the current three-block structure:
  - profile photo
  - locked account data
  - nickname editing
- Use the dashboard as the main visual reference: cleaner, more objective, less skew-heavy than the current profile page.
- Keep the page focused on editing, with balanced emphasis between avatar and nickname.

## Visual Strategy
- Preserve the paper background and black-border comic broadcast system already used across the app.
- Reduce ornamental skew and visual noise in the page header and section internals.
- Use color functionally:
  - blue for avatar/photo actions
  - red for locked account information
  - yellow for editable nickname and save action
- Keep the page in a narrow single-column layout for strong focus and mobile clarity.

## Layout Changes

### Header
- Keep the black page header, but make it cleaner and less dominant.
- Retain the title and supporting text while tightening spacing and reducing the feeling of a separate hero banner.

### Photo Card
- Keep it as the first card.
- Enlarge and simplify the avatar frame.
- Make the photo preview feel more important.
- Clarify hierarchy between:
  - change photo
  - restore Google photo
  - technical note about accepted formats

### Account Data Card
- Keep name and email as read-only fields.
- Make the locked state feel intentional and cleaner.
- Reduce repetitive lock icon noise.
- Improve distinction between labels and values.
- Keep this card visually secondary to avatar and nickname.

### Nickname Card
- Make this the main editable card.
- Improve hierarchy of label, helper text, and field.
- Strengthen the save button so it clearly reads as the primary page action.
- Integrate the public profile CTA into this section so it feels like part of the player identity flow instead of a disconnected extra action.

## Component-Level Intent
- Reuse existing primitives and structure where possible.
- Prefer small visual refinements over architectural changes.
- Avoid introducing a new page pattern; this should feel like the existing dashboard family applied to profile editing.

## UX Outcomes
- Users should instantly understand:
  - what can be edited
  - what is locked by Google account data
  - what the primary action is
- The page should feel like a player control panel rather than a generic form.

## Implementation Notes
- Update only `profile.tsx` unless a small shared helper is clearly necessary.
- Preserve all existing behaviors:
  - avatar upload/crop flow
  - Google avatar restore
  - nickname update
  - public profile link
- Keep all user-facing strings on `t()` calls.

## Verification
- Run `bun run turbo -F web build` after implementation.
- Confirm the page reads well on mobile and desktop.
- Confirm avatar actions, nickname saving, and public profile navigation still behave correctly.
