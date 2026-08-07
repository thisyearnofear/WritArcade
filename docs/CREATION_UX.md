# Creation UX Contract

## Purpose

WritersArcade should feel like a game-making product first, not an AI media configuration tool. The first-run creation flow must get a user from source to a playable story with the fewest meaningful decisions.

## Product promise

> Give us a source. Choose the story direction. Get a playable experience.

The primary creation path is intentionally compact and mobile-first. More control remains available, but it appears when the user has enough context to use it.

## Core creation flow

The first-run flow has three user jobs:

1. **Source** — paste a public article URL or provide supported source text.
2. **Story direction** — choose the format, tone, story intensity, and optionally the visual finish.
3. **Generate** — complete the required payment or free path, then generate the playable story.

The interface may retain implementation steps for payment and generation progress, but the user-facing mental model remains three stages: **Source → Direction → Generate**.

### Primary controls

Show these controls without opening an advanced panel:

- Playable Story as the default format
- Tone: Horror, Comedy, or Mystery
- Story intensity: Faster progression or Deeper branches
- One primary generation action

Use outcome-based language. Users should understand what changes when they choose an option without knowing which model or provider is behind it.

### Advanced controls

Keep these discoverable but collapsed or secondary:

- Payment rail selection (MUSD versus Writer Coin)
- Specific writer selection
- Technical model/provider details
- Fine-grained generation settings
- IP registration and marketplace enrichment

The default path must not require a user to understand wallets, chains, tokens, model names, Inco, NFTs, or Story Protocol.

## Progressive optionality

> Reveal control when the user has earned the context to use it.

### Before generation

Optimize for confidence and clarity:

- Show the source preview.
- Show the five-beat story shape, not the exact ending.
- Explain that reader choices shape the resolution.
- Keep the primary CTA obvious.

### During play

Optimize for agency and consequence:

- Choices should be the main interaction.
- Story signals may be shown as feedback, but should not become a technical score wall.
- Play remains untimed; reading speed is never a core-game penalty.

### After completion

Optimize for expansion:

- Share the playable story.
- Own and unlock the secret epilogue where applicable.
- View reader insights for creators.
- Optionally turn the completed comic into a short cinematic animation.
- Offer refinement and alternate-ending tools only when those workflows are real and understandable.

## Feature placement decisions

### Video and animation

Animation is a post-generation derivative, not a first-run creation choice. It belongs after the user has completed a story and has an artifact worth extending:

> Turn your completed comic into a short cinematic cut.

Do not add an animation checkbox to the initial generator until a separate, clearly named cinematic creation mode exists.

### Model optionality

Expose outcomes, not providers:

- **Explore quickly** — faster generation for iteration.
- **Refined visuals** — more visual detail and potentially longer generation.

Do not expose provider names, model IDs, or separate narrative/image/video model decisions in the first-run path.

### Ending preview

Do not reveal the exact ending before play. Show a non-spoiler story shape:

1. Opening
2. Rising action
3. Your choice
4. Climax
5. Resolution

The user should know that the ending is shaped by choices without losing the curiosity that drives completion. A true ending editor or alternate-ending preview belongs in a future refinement workflow.

### Workshop and Studio

- **Generate** is the compact path from source to playable story.
- **Studio** is the wallet-free copy-to-story path for marketers and campaign creators.
- **Workshop / Creator Studio** is for deeper refinement, asset editing, IP, and creator controls—not a prerequisite for a first playable story.

## Mobile interaction rules

- One primary decision and one primary CTA per stage.
- Minimum 48px touch targets.
- Keep the primary action reachable without scrolling back to the top.
- Use a persistent mobile step bar for progression and back navigation.
- Do not put payment rails, model details, and output formats in the same visual group as the main story direction.
- Prefer compact summaries and disclosure panels over long explanatory cards.

## Mobile validation checkpoint

The first mobile usability pass was completed against `/generate` at a 390×844 viewport.

- Source, direction, and payment/generation progression remains compact and readable.
- The persistent mobile step bar is reachable and does not obscure the form; the form reserves bottom space for it.
- The source URL input and preview action use 48px touch targets.
- The page had no horizontal overflow (`scrollWidth` matched the 390px viewport width).
- An invalid public-looking article URL failed safely at preview with a clear backend error; it did not bypass the payment gate.
- Development-only chunk/Lit warnings were observed during local testing and were not reproduced as product-flow failures.

Keep this checkpoint as the baseline for future mobile funnel comparisons. Repeat the audit after any change to the generator hierarchy, sticky navigation, payment gate, or source preview.

## Feedback triage rule

When feedback arrives, classify it before implementing it:

| Request | Likely underlying need | Default response |
|---|---|---|
| “Make it more compact” | The next action is unclear | Reduce simultaneous decisions and copy |
| “Make it mobile optimized” | The flow is scroll-heavy or hard to advance | Improve step navigation and CTA reachability |
| “Let me choose the model” | Need control over speed, quality, or cost | Expose outcome-based quality presets |
| “Let me preview the ending” | Need confidence in the result | Show story shape, not the spoiler |
| “Let me make a video” | Need a richer shareable artifact | Offer animation after completion |
| “Let me take different directions” | Need authorship | Increase meaningful story-direction choices, not technical toggles |

## Success metrics

Measure the compact flow before adding more options:

- Mobile source submission rate
- Article preview completion
- Direction-step completion
- Payment abandonment by stage
- Generation completion rate
- Time to first meaningful action
- Play-start rate after generation
- Five-panel completion rate
- Share and animation uptake after completion
- Creator insight visits and repeat creation

A new option earns a place in the primary path only if it improves a user outcome without reducing source-to-playable-story completion.

The client funnel events are persisted as sanitized `ProductAnalyticsEvent` records. The persistence boundary validates known event names, stores selected outcome-safe properties, the pathname, and a server timestamp; it deliberately drops raw URLs, wallet addresses, article text, and unapproved properties. The admin report exposes event-volume ratios, not unique-user or session conversion, because the baseline intentionally does not identify users. Add a retention/cleanup policy before event volume grows materially.

## Sequencing

### Now

- ✅ Compact mobile creation hierarchy
- ✅ Outcome-based labels
- ✅ Non-spoiler story-shape preview
- ✅ Clear post-generation expansion language
- ✅ Instrument the funnel
- ✅ Complete the first 390×844 mobile usability checkpoint

### Next

- ✅ Build the first admin-only internal funnel report from persisted events (`GET /api/admin/analytics/funnel?days=30`, bounded to 1–90 days)
- Test Fast versus Refined visual presets
- Improve the completion tray for share, ownership, insights, and animation
- Measure demand for alternate endings and refinement

### Later

- Ending editor
- Alternate-ending preview/generation
- Creator-grade model controls
- Dedicated cinematic story creation mode
