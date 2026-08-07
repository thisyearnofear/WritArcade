# UX Principles — Progressive Disclosure & Verbosity

Guiding standard for WritersArcade interfaces. Keep the product calm: lead with one
primary action, reveal detail on demand, and never let an advanced or optional feature
compete with the core loop.

## Core rules

1. **Defaults first, details on demand.**
   Every screen should complete its primary job with sensible defaults visible.
   Anything optional, advanced, or ownership-related (payment rails, IP registration,
   contracts, export formats) belongs behind a disclosure: `<details>/<summary>`,
   a tooltip (`ConceptTooltip`), a modal, or a progressive tab.

2. **One primary next action per screen.**
   A view should have at most one visually dominant CTA (the "share your ending"
   card, the "Play game" button, the hero "Create" field). Secondary paths are
   smaller, lower-emphasis rows — never a second big card competing for attention.

3. **Max 3 visible footer/nav links per group.**
   The footer Explore column lists the four core pillars only; everything else lives
   behind the "More" disclosure. Never duplicate a link that already exists in the
   header or user menu.

4. **No raw URLs or hashes as visible content.**
   Show the hostname for source links (`paragraph.com`), a shortened address for
   wallets/tx hashes, and put the full value in `title` or on the explorer page.

5. **Two-sentence explanations.**
   Descriptive copy gets one sentence of context plus one sentence of value. Longer
   mechanics go in a tooltip or a "How it works" disclosure, not a paragraph block.

6. **Clamp long content with an explicit affordance.**
   Generated descriptions use `line-clamp-2` with a "Read more" toggle. Never render
   a multi-paragraph blob inside a card or hero.

## Disclosure patterns already in the product

- Footer "More" and contract links in the bottom bar (`components/layout/footer.tsx`)
- Game metadata "Details" disclosure (`game-artifact-view.tsx`)
- Game description "Read more" toggle (`game-artifact-view.tsx`)
- Generate flow: "Advanced payment options" and "Adjust direction" panels
  (`customize-step.tsx`), payment "Details" (`payment-step.tsx`)
- My Games "Vault & collectibles" progressive tabs (`my-games-client.tsx`)
- `ConceptTooltip` inline term definitions (`components/ui/concept-tooltip.tsx`)
- Post-completion referral + export cards collapsed by default
  (`post-game-completion.tsx`)

## Anti-patterns to avoid

- A second full-screen onboarding coach when one exists (consolidate, don't stack).
- Showing payment, IP, or contract details before the user has reached that step.
- Three equally-weighted CTAs in a row (equal weight = no priority).
- Long paragraphs in heroes or cards; full articles belong on the source page.
