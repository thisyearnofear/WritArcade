# WritArcade Product Roadmap

## Vision
Transform articles into immersive, visually stunning interactive games where every decision reshapes the narrative and the world responds with gorgeous, dynamic imagery.

## Design Philosophy: "WOW Through Visuals"

The optimal game experience combines:
1. **Narrative Immersion** - Compelling story progression driven by player choices
2. **Visual Storytelling** - Fresh, contextual imagery for every story beat
3. **Meaningful Agency** - Choices that visibly impact both narrative and world
4. **Cinematic Quality** - Gorgeous, impactful design that commands attention
5. **Tactile Feedback** - Clear, satisfying interactions that feel responsive

---

## Phase 1: Foundation (Current)

### ✅ Complete
- [x] Game generation from Paragraph.xyz articles
- [x] URL normalization for custom domains (avc.xyz support)
- [x] Chat-based gameplay with AI narrative
- [x] Mobile-responsive hero screen
- [x] Basic option selection

### 🔴 Critical Gaps
- ❌ **No per-turn image generation** - Static image only
- ❌ **Poor response formatting** - Text dump in chat bubbles
- ❌ **Invisible options** - Numbered text, not visual buttons
- ❌ **No visual feedback** - No sense of consequence or progression
- ❌ **Lacks immersion** - Feels like a chatbot, not a game

---

## Phase 2: Visual Storytelling (NEXT - HIGH PRIORITY)

### 2.1 Dynamic Image Generation
**Goal:** Fresh, contextual imagery for every narrative turn

**Implementation:**
- Trigger image generation on each AI response
- Use game's genre/theme as image style guide
- Generate 1-2 images per turn (fast inference)
- Display during narrative reveal with loading state
- Style options:
  - **Comic/Illustration** (matches Comicify inspiration) ← Recommended
  - **Realistic/Cinematic**
  - **Abstract/Stylized**

**Prompt Engineering:**
```
Style: [game.genre] comic illustration in [game.primaryColor] palette
Scene: [extracted from narrative response]
Mood: [match narrative tone]
```

**Technical Stack:**
- Image generation: Venice AI (fluently-xl model)
- Caching: Store generated images with game session
- Loading: Placeholder image + progressive reveal animation
- Fallback: Use primary game image if generation fails

---

### 2.2 Response Card Design
**Goal:** Transform text responses into visually striking story cards

**Layout:**
```
┌─────────────────────────────────────┐
│  [GENERATED IMAGE]                  │
│  (Full width, 400-600px height)     │
├─────────────────────────────────────┤
│  📖 NARRATIVE SECTION               │
│  ─────────────────────────────────  │
│  Bold opening hook (setup)          │
│  Flowing narrative paragraph(s)     │
│  Emotional stakes & tension         │
├─────────────────────────────────────┤
│  OPTIONS (Below image)              │
│  ┌─────────────────────────────────┐│
│  │ [1] Option text                 ││
│  │     Brief description of impact ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ [2] Option text                 ││
│  │     Brief description of impact ││
│  └─────────────────────────────────┘│
│  ... (up to 4 options)             │
└─────────────────────────────────────┘
```

**Visual Hierarchy:**
- **Image:** Large, immersive (60% vertical space on desktop, 100% on mobile)
- **Narrative:** Styled typography with clear story beats
- **Options:** Large, clickable buttons with hover feedback

**Typography:**
```
Narrative Section:
- Title: 24-32px, bold, game.primaryColor
- Body: 16-18px, line-height 1.6, text-gray-100
- Opening Hook: Italicized, game.primaryColor

Options:
- 18-20px, interactive, hover scale + color shift
- Selected option highlights with primaryColor glow
```

**Mobile Adaptation:**
- Full-screen image swipe through gallery
- Options stack vertically
- Better touch targets (48px minimum)

---

### 2.3 Option Buttons Redesign
**Goal:** Make choices feel consequential and compelling

**Current:** Numbered text (❌ invisible, no feedback)
**Desired:** Visual buttons with impact

**Design:**
```
Button States:
- Default: Subtle border, gray text
- Hover: Highlight with game.primaryColor, scale 1.02
- Active/Selected: Filled with primaryColor, white text, glow effect
- Disabled: Opacity 50% during generation

Button Content:
- [Number] Bold Option Title
- Subtext: "Outcome: [consequence hint]"
```

**Interaction:**
- Click triggers smooth transition
- "Generating response..." state with spinner
- Image fade-in as new narrative arrives
- Smooth scroll to new card

---

## Phase 3: Enhanced Immersion (High Priority)

### 3.1 Visual Progression
**Goal:** Make player feel their decisions shape the world

**Implementation:**
- Track key story elements (character mood, world state, resources)
- Reflect progression in image generation (darker/lighter tones, visual changes)
- Show decision impact explicitly ("Your generosity gains +5 Community Trust")
- Visual status bar or constellation map showing story state

### 3.2 Comic-Style Panels (Inspired by Comicify)
**Goal:** Sequential visual storytelling like a graphic novel

**When to Use:**
- Critical story moments
- Major turning points
- End-of-game sequences

**Design:**
- 2-4 panel layout per major scene
- Comic-style borders & speech bubbles
- Text integrated into images (like real comics)
- Smooth panel transitions

### 3.3 Contextual Imagery
**Goal:** Images adapt to player choices

**Examples:**
- Character's appearance changes (wealthy vs humble)
- Environment reflects story state (bustling market vs empty streets)
- Color palette shifts with narrative tone (hopeful vs desperate)

---

## Phase 4: Engagement Mechanics (Medium Priority)

### 4.1 Narrative Consequences
- Show impact of each choice
- Branching paths with visual differentiation
- Multiple endings based on decision tree

### 4.2 Story Metrics
- Track player stats (Generosity, Innovation, Community, etc.)
- Display character sheet that evolves
- Final "legacy" report with player impact

### 4.3 Replayability
- Highlight unseen paths on replay
- "New Game+" with harder choices
- Leaderboard of choices made across players

---

## Technical Implementation Order

### Sprint 1: Image Generation Pipeline
1. Enhance ImageGenerationService for per-turn generation
2. Create image prompt engineering from narrative
3. Implement loading states & fallbacks
4. Cache images with sessions (prevent duplicate Venice API calls)
5. **Target:** 1 image per turn working

### Sprint 2: Response Card Redesign
1. Parse AI response for title + narrative + options
2. Build card component with image area
3. Implement option button styling
4. Add animations (fade-in, scroll, transitions)
5. **Target:** Responsive card layout on mobile + desktop

### Sprint 3: Mobile Optimization
1. Swipeable image gallery
2. Full-screen narrative on small screens
3. Touch-friendly option buttons
4. Portrait + landscape support

### Sprint 4: Visual Progression
1. Story state tracking
2. Visual indicators of progression
3. Environment/character adaptation in prompts
4. End-game visualization

---

## Success Metrics

### Visual Impact
- [ ] Screenshots worthy of social sharing
- [ ] 3+ seconds average session duration (vs current chat feel)
- [ ] Mobile engagement rate > 60%

### Game Feel
- [ ] Player perceives choices as consequential
- [ ] Image-narrative alignment > 90% (subjective quality check)
- [ ] No "this feels like a chatbot" feedback

### Technical
- [ ] Image generation latency < 8 seconds
- [ ] 99% uptime on image pipeline
- [ ] Cache hit rate > 70% (don't regenerate duplicate prompts)

---

## Design Inspiration

### From InfinityArcade
- Clean, immersive text game interface
- Focus on narrative over UI chrome
- Game creation speed

### From Comicify.ai
- **Comic-style imagery** ← Primary inspiration
- **Panel-based layout** ← Use for key moments
- **Text integrated into visuals** ← Goal for Phase 3
- **Sequential storytelling** ← Narrative beats

### Our Unique Value
- **Per-turn fresh imagery** (not static)
- **Article-driven narratives** (real-world context)
- **Blockchain integration** (minting, writer coins)
- **Gorgeous color theming** (game.primaryColor-driven)

---

## Estimated Timeline

| Phase | Effort | Timeline | Dependencies |
|-------|--------|----------|--------------|
| **Phase 2.1** (Image Gen) | 2 weeks | Dec 2025 | Venice AI API key ✅ (configured) |
| **Phase 2.2** (Card Design) | 2 weeks | Jan 2026 | Phase 2.1 complete |
| **Phase 2.3** (Options UI) | 1 week | Jan 2026 | Parallel with 2.2 |
| **Phase 3** (Enhancement) | 3 weeks | Jan-Feb 2026 | Phase 2 complete |
| **Phase 4** (Mechanics) | 4 weeks | Feb-Mar 2026 | Phase 3 complete |

**MVP Visual Experience:** End of January 2026

---

## Current Blockers

1. **Image Generation Not Integrated** - Need API setup + prompt engineering
2. **Response Parsing** - AI returns narrative + options mixed; need clean extraction
3. **Option Button Visibility** - Currently invisible in text; need redesign
4. **Mobile Layout** - Game screen needs major responsive improvements

---

## Next Action

**Immediate (This Week):**
1. ✅ Extract narrative + options from AI response separately
2. ✅ Redesign game screen with card layout
3. ✅ Implement option buttons with visual appeal
4. 🔴 **Integrate image generation API** (core WOW factor)

**This will immediately improve from "chatbot" → "game" feel.**

---

## Design Principles

- **Visual First:** Every decision should be visible and impactful
- **Mobile Native:** Design for phone-first, scale up
- **Immersive:** Remove all "technical" UI; make it feel like a story
- **Fast:** Image generation shouldn't block narrative (progressive reveal)
- **Gorgeous:** High-quality imagery; every frame could be a screenshot
- **Responsive:** Visual feedback on every action
