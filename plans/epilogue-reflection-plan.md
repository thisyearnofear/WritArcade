# Epilogue Panel + Reflection Card Implementation Plan

## Overview

Add a 6th epilogue panel that connects the user's story back to the source article, then show a
reflection card on the finale screen. No backend changes needed — the epilogue is generated via a
new Next.js API route.

---

## Architecture

```
User finishes Panel 5
        │
        ▼
sendMessage gets 400 (gameComplete:true)
        │
        ▼
catch block triggers generateEpilogue()
        │
        ▼
POST /api/games/epilogue  ← new route
  │  input: { sessionId, gameId, choices[], articleContext, genre, gameTitle }
  │  calls LLM → returns { epilogue, reflection }
  ▼
Frontend generates image for epilogue text
        │
        ▼
6th assistant message added to messages array (isEpilogue: true)
  "View Comic" CTA appears
        │
        ▼
Finale defaults to grid view (6 panels)
  Reflection card below grid with article info + reflection text
```

---

## Step 1: New API Route — `/Users/udingethe/Dev/writersarcade/app/api/games/epilogue/route.ts`

POST endpoint that:
- Accepts `{ sessionId, gameId, choices: string[], articleContext?: string, genre: string, gameTitle: string }`
- Calls the LLM with a prompt that includes:
  - The article context (title, author, thematic summary)
  - The user's 5 choices
  - A prompt asking for two things: an epilogue narrative (2-3 sentences, same comic style) and a reflection (3-4 sentences connecting choices to article themes)
- Returns JSON: `{ epilogue: string, reflection: string }`

Uses the same model resolution from `game-ai.service.ts` / `getModel()` for consistency.

---

## Step 2: Modify `use-game-session.ts`

Add state:
- `epilogueReflection: string` — stored for passing to the finale
- `isGeneratingEpilogue: boolean` — loading state

Add `generateEpilogue()` method:
1. Sets `isGeneratingEpilogue = true`
2. Calls `/api/games/epilogue` with `sessionId`, `gameId`, `userChoices.map(c => c.choice)`, `game.articleContext`, `game.genre`, `game.title`
3. Gets back `{ epilogue, reflection }`
4. Stores `reflection` in `epilogueReflection` state
5. Calls `ImageGenerationService.generateImage({ prompt: epilogue, genre, style, aspectRatio })`
6. Creates a 6th assistant message: `{ id: 'epilogue-...', role: 'assistant', content: epilogue, narrativeImage: result.imageUrl, imageModel: result.model, isEpilogue: true }`
7. Appends to messages array
8. Sets `isGeneratingEpilogue = false`

Trigger: In `sendMessage`'s catch block, after detecting game completion (`error.message.includes('complete')` etc.), call `generateEpilogue()`.

Export `epilogueReflection` and `isGeneratingEpilogue` from the hook.

---

## Step 3: Modify `gameplay-screen.tsx`

- Show "Weaving your story's reflection..." loading state when `isGeneratingEpilogue` is true (below the last panel)
- The epilogue assistant message will render automatically via the existing `messages.map()` loop — it's just another assistant message without options
- Change "View & Mint Comic" CTA text to "View Comic" (keep the icon)
- When `isGeneratingEpilogue` is true, the "View Comic" button should not yet appear (wait until epilogue is done)

---

## Step 4: Modify `ComicPanelCard` for epilogue styling

When `isEpilogue` is passed as a prop:
- Don't show options (already handled — no options in the message)
- Don't show the rating stars overlay
- Add a subtle "What This Means" label/badge on the image
- Don't show the theme selector (it's a reflection, not a story panel)

---

## Step 5: Modify `game-play-interface.tsx`

- Pass `session.epilogueReflection` to `ComicFinaleScreen`
- Change progress bar from "Panel X of 5" to "Panel X of 6" — but only once the epilogue exists. Or keep it at 5 for the gameplay phase and show all 6 in the finale.
  - Better: keep "Panel X of 5" during play, then after epilogue is generated, don't show progress bar (since the game is already complete)

---

## Step 6: Modify `comic-finale-screen.tsx`

- Add `epilogueReflection?: string` prop
- Change initial viewMode to `'grid'`
- Pass `epilogueReflection` to `ComicBookFinale`
- In `buildComicPanels()`, don't slice to `maxPanels` — include all assistant messages (including the epilogue). The epilogue will have `isEpilogue` on the message which ComicBookFinale can use.

---

## Step 7: Modify `comic-book-finale.tsx`

- Add `epilogueReflection?: string` prop
- Add a reflection card below the panel grid area that shows:
  - Article title and author (more prominent — larger text, distinct card)
  - The reflection paragraph (2-3 sentences connecting choices to article themes)
  - A "Read Original Article" link (subtle, below the reflection)
- Style: distinct card with a subtle left border or background tint, positioned after the grid

Implementation details:
```tsx
{epilogueReflection && (
  <div className="mt-8 p-6 rounded-xl border-l-4" style={{ borderLeftColor: primaryColor, backgroundColor: `${primaryColor}08` }}>
    <div className="flex items-start gap-4">
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Back to the Source</h3>
        <h4 className="text-lg font-bold mb-1">{articleTitle || 'Original Article'}</h4>
        <p className="text-sm text-muted-foreground mb-3">by {authorParagraphUsername}</p>
        <p className="text-base leading-relaxed">{epilogueReflection}</p>
        <a href={articleUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-sm underline opacity-60 hover:opacity-100 transition-opacity">
          Read original article →
        </a>
      </div>
    </div>
  </div>
)}
```

- Pass article title from `game.title` or fetch it if available on the Game object (it's not currently passed — we should add it). Actually `gameTitle` is already the game's title, not the article's title. We'd need `articleTitle` on the Game model. Let me check — the `articleContext` field starts with `Article: "${processedContent.title}"` so the title is embedded in the context string. We could extract it, or better, pass `publicationName` or a new `articleTitle` prop.

Actually, looking at the Prisma schema, there's no `articleTitle` field — but `articleContext` begins with the title. We can pass `articleContext` and extract the title from it, or we can add `articleTitle` as a new prop. The simplest approach: include the article title in the `epilogueReflection` string itself (the LLM can reference the article title in the reflection text), and add `publicationName` / `articleTitle` as display props to `ComicBookFinale`.

Better: just add `publicationName` and `articleTitle` as optional display fields. These are available on the `Game` type (`publicationName`, `articlePublishedAt`). We just need to pass them through.

- Update `ComicBookFinaleProps` to include optional `publicationName?: string` and `articleTitle?: string`

---

## Key Decisions

1. **No backend changes** — the Hetzner backend's chat endpoint stays at 5 panels. The epilogue is generated through a new Next.js API route that calls the LLM directly.

2. **Epilogue + reflection generated in one LLM call** — avoids two separate API calls. The prompt asks for both outputs in a single response.

3. **Panel 6 is a regular assistant message** — with `isEpilogue: true` flag. It flows through all the existing rendering code with minimal modifications.

4. **Mint button stays in the finale** — just demoted from the CTA. Already exists as a header button.

5. **"View Comic" replaces "View & Mint Comic"** — cleaner CTA that matches what the user actually wants to do (view their comic first).

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/api/games/epilogue/route.ts` | NEW — LLM endpoint for epilogue + reflection |
| `domains/games/hooks/use-game-session.ts` | Add `generateEpilogue()`, state, trigger |
| `domains/games/components/screens/gameplay-screen.tsx` | Epilogue loading state, "View Comic" CTA |
| `domains/games/components/comic-panel-card.tsx` | `isEpilogue` prop for styling |
| `domains/games/components/game-play-interface.tsx` | Pass epilogue data to finale |
| `domains/games/components/screens/comic-finale-screen.tsx` | Grid default, pass reflection |
| `domains/games/components/comic-book-finale.tsx` | Reflection card, article attribution |

---

## Verification

1. Play through all 5 panels
2. After 5th choice, verify the epilogue loading state appears ("Weaving your story's reflection...")
3. Verify Panel 6 renders with an image, no options, and a "What This Means" badge
4. Verify CTA reads "View Comic" (not "View & Mint Comic")
5. Click "View Comic" → verify finale opens in grid view with 6 panels
6. Verify the reflection card is visible below the grid with article info and reflection text
7. Verify the reflection text references specific user choices and article themes
