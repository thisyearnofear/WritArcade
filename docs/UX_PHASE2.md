# UX Phase 2 — Toward 9/10

Prioritized checklist and tester script after the play-first library pass (Phase 1).

## Target scores

| Dimension | Phase 1 | Phase 2 goal |
|-----------|---------|--------------|
| Storytelling | 7.5 | 8.5+ |
| Intuitiveness | 7.0 | 8.5+ |
| Game design | 7.0 | 8.0+ |
| Product design | 7.5 | 8.5+ |

---

## P0 — Ship first (this sprint)

- [x] **Unified homepage story** — How it works includes Daily + secret epilogue when enabled
- [x] **In-panel daily modifier tease** — category label per panel during Daily Challenge play
- [x] **My Games advanced collapse** — Library default; ownership/collectibles tucked under “More”
- [x] **Epilogue gate clarity** — visible checklist before/during play (5 panels + mint)
- [x] **Onboarding dedupe** — shorter welcome coach when global onboarding already completed
- [x] **Empty library nudge** — link to browse public games before create

## P1 — Shipped

- [x] **Hero player CTA** — “Play something now” + today’s daily above creator form
- [x] **Post-complete epilogue CTA** — mint/unlock banner on comic finale + post-game screen
- [x] **Daily try-before-wallet** — source preview card; wallet only for dealing encrypted hand
- [x] **Milestone prompts** — ownership tabs + nudge only after first mint/unlock/IP

## P1 — Remaining

- [ ] **Modifier felt in copy** — optional subtle UI flavor per category in panel narrative
- [ ] **Wordle vs story explainer** — one line on generate + game cards for mode

## P2 — Polish

- [ ] **Single “Arcade” identity** — rename/consolidate tabs to Library / Vault / Collectibles
- [ ] **Session recap card** — shareable “my path + hidden hand” after daily complete
- [ ] **Accessibility pass** — focus order on coach, filters, collapsible sections

---

## Tester script (15 min)

Use a fresh browser profile or clear `localStorage` for onboarding tests.

### A. First-time visitor (5 min)

1. Land on `/` — note first CTA within 3 seconds.
2. Open onboarding — confirm order: play free → create → daily (if on) → secret epilogue → own/earn.
3. Scroll How it works — daily + epilogue appear in the product story.
4. Tap **Daily** in nav — understand today’s challenge without reading docs.
5. Tap **Arcade** — see compact daily banner above grid.

**Pass if:** tester can explain “play first, own later” without seeing CDR/vault jargon.

### B. Create → play (5 min)

1. Create a game from sample article → land on play page with welcome coach.
2. Dismiss coach — start play.
3. During panels: see progress (X/5) and epilogue requirements if applicable.
4. If Daily active: see modifier category tease on current panel.
5. Finish all 5 panels — hidden hand / modifier reveal appears at finale.

**Pass if:** tester knows what unlocks the secret epilogue before finishing.

### C. Library owner (5 min)

1. Open **My Games** — Library is default; advanced tabs not in face.
2. Expand “Ownership & collectibles” only if needed.
3. Use filters: Played / Not played / Daily.
4. Empty filter states make sense.
5. Play from card — Ownership collapsed by default.

**Pass if:** tester describes page as “my arcade,” not “admin dashboard.”

---

## Score rubric (internal)

| Score | Meaning |
|-------|---------|
| 9 | Tester completes script with zero jargon questions; primary action obvious in &lt;5s |
| 8 | One clarifying question on ownership or daily; play loop clear |
| 7 | Understands play but confused by a secondary tab or Web3 step |
| ≤6 | Wall of text, wrong primary action, or feature invisible |

Re-run script after each Phase 2 PR; target **8+ average** before calling 9/10.
