# BSEN Pickems

Community prediction (pick'em) product for Brawl Stars esports fans, under the BSEN fan project umbrella.

## Language

**BSEN**:
The fan Brawl Stars esports news project and brand umbrella (bsen.news and related community surfaces). Not a commercial licensee of Supercell or tournament organizers.
_Avoid_: Supercell, official esports org, the Pickems app itself

**BSEN Pickems**:
The separate community prediction product in this repository — accounts, match picks, brackets, and leaderboards as bragging rights only. Same BSEN project, distinct product surface from the news site.
_Avoid_: bsen.news, BSEN News, betting site, gambling app

**Fan Project**:
Unofficial community work under Supercell's Fan Content Policy; not endorsed by Supercell or its affiliates.
_Avoid_: official partner, licensed product, commercial rights holder

**Pickems Terms**:
The product-specific terms for BSEN Pickems (accounts, predictions, acceptable use). Not the editorial Terms of bsen.news.
_Avoid_: BSEN News Terms, Wix terms

**Pickems Privacy Policy**:
The product-specific privacy notice for BSEN Pickems (account, session cookies, picks, leaderboard data). Not the Wix-oriented privacy page of bsen.news.
_Avoid_: BSEN News Privacy Policy, site privacy (when meaning the news site)

## Tournaments

**Event Kind** (PT: **Tipo de Evento**):
A named circuit role in the admin-managed catalog (e.g. Monthly Finals, Qualifier, World Finals). Optional on a tournament — absent means default product UI and no template seed on create. When present, presentation resolves live from that kind's Presentation Theme, and on create the kind's Event Kind Template is copied once into the tournament. Removed kinds are archived (hidden from new assignment) rather than hard-deleted while still referenced. Not a circuit Series/Season grouping.
_Avoid_: category, tag, tournament type (collides with stage format), tier, mandatory Standard kind, hard-delete while referenced, series, season

**Archived Event Kind**:
An Event Kind withdrawn from the catalog for new tournaments but still resolvable for tournaments that already reference it, so live presentation keeps working.
_Avoid_: deleted kind, soft-deleted tournament

**Event Kind Template**:
The optional default `stages` and `scoringRules` owned by an Event Kind and copied once into a new tournament as a starting point. If empty, creation leaves stages/scoring to the normal product defaults (no-op seed). After creation, the tournament's own stages and scoring rules are authoritative and editable; changing Event Kind later does not rewrite them. No admin “re-apply template” action in the initial scope. Does not include match days.
_Avoid_: live template link, forced structure, category schema, match-day generator, mandatory template on every kind, re-apply template (deferred)

**Presentation Theme**:
A closed, product-defined visual treatment selected on an Event Kind and resolved live through the tournament's Event Kind reference. Initial set: `default` (no prestige chrome), `qualifier` (subtle badge), `monthly_finals` (strong list prominence), `major` (peak hero/broadcast presence). Not a Venue Mode signal — LAN/Online stays on Venue Mode.
_Avoid_: category style, custom CSS, skin (ambiguous with game skins), per-tournament theme override, lan theme (use Venue Mode)

**Venue Mode** (PT: **Modo de Realização**):
How the tournament is staged for play — a closed required set: Online or LAN (default Online). Independent of Event Kind; presentation/filter signal only, not a bracket template.
_Avoid_: category, location (that is region/venue), offline (prefer LAN when meaning on-site LAN), hybrid (out of scope until needed), unset/blank

## Predictions

**Pick** (PT: **Palpite**):
A user's prediction of a match outcome in BSEN Pickems. Bragging-rights only; not a wager and not real-money gambling.
_Avoid_: aposta, bet (in user-facing copy), wager, gambling stake

**Tournament Pick Reset**:
Admin action that deletes every Pick for a tournament and reopens all of that tournament's match days. Match results are kept.
_Avoid_: reset bets, clear wagers

**Tournament Reset**:
Admin action that removes all matches and Picks for a tournament. Stronger blast radius than Tournament Pick Reset.
_Avoid_: full wipe (ambiguous), reset scores (that is Match Score Reset)

**Match Score Reset**:
Admin action that clears a single match's score and winner so the match can be scored again.
_Avoid_: reset match (ambiguous with deleting the match), reset picks

