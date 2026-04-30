## Design Context

### Users
Brazilian Brawl Stars esports fans — mostly young, mobile-first gamers who follow competitive tournaments. They visit BSEBET to predict match outcomes, climb leaderboards, and earn bragging rights within their community. Their context is social and time-sensitive: they check in before match days, make picks, then watch results roll in. The job to be done is **fast, confident prediction-making** with clear feedback on how they performed.

### Brand Personality
**Sharp, Competitive, Fun.**

- **Voice**: Direct, energetic, sporty — like a broadcast commentator who's also your friend. Portuguese (Brazil) is the primary language.
- **Tone**: Competitive hype mixed with playful fun. Every interaction should feel exciting but never stressful or manipulative. The app celebrates bold picks and rewards engagement.
- **Emotional goals**: Users should feel the arena energy of a live esports broadcast — the thrill of making a call, the tension of watching scores, the satisfaction of climbing the leaderboard. But it should always stay fun and approachable, never punishing.

### Aesthetic Direction
**Supercell Esports Official Broadcast** — Clean, Vector, Pop-Art, High Contrast.

- **Visual tone**: Bold comic-book broadcast overlay. Think sports TV lower-thirds meets pop-art poster. Thick black borders, hard comic shadows, skewed elements, paper textures, paint splatters.
- **References**: Brawl Stars Championship broadcast graphics, Supercell's official esports branding, Japanese sports manga score panels, retro American pop-art posters.
- **Anti-references**:
  - **No generic SaaS/corporate** — no bland dashboards, no gray-on-gray minimalism, no "enterprise" feel.
  - **No casino/gambling dark patterns** — no flashing gold, no slot-machine vibes, no manipulative urgency. This is prediction, not gambling.
  - **No overly childish/cartoonish** — playful is fine, but don't cross into kindergarten territory. Keep it sharp.
- **Theme**: Light mode only. Paper (`#f0f0f0`) background with cream texture. Team duality expressed through Brawl Blue (`#2e5cff`) vs Brawl Red (`#ff2e2e`). Neon Green (`#ccff00`) for active/selected states. Brawl Yellow (`#ffc700`) for highlights and badges.
- **Motion**: Framer Motion for entrance animations, hover lifts, and tactile button presses. Keep animations snappy (200-600ms). Respect `prefers-reduced-motion`.

### Design Principles

1. **Broadcast Energy** — Every screen should feel like tuning into a live esports broadcast. Bold typography, high contrast, dynamic layouts with skewed elements and comic shadows. The UI IS the show.

2. **Clarity Under Pressure** — Users make time-sensitive decisions. Information hierarchy must be razor-sharp: team names, scores, and pick status should be instantly scannable. Never sacrifice readability for style.

3. **Tactile Feedback** — Every interaction should feel physical. Buttons press down with comic shadow shifts, cards lift on hover, selections snap with neon green borders. The interface should feel like touching a real broadcast control surface.

4. **Celebrate the Pick** — The core action is making a prediction. Make it feel significant — saved picks get badges, correct picks get satisfying point animations, leaderboard positions feel earned. Reward engagement visually.

5. **Contrast is Non-Negotiable** — Text must always be readable against its background. Light surfaces get dark text, dark/saturated surfaces get white text. No exceptions. Every badge, pill, button, and card must have explicit text color paired with its background. See `DESIGN.md` mandatory contrast rules.
