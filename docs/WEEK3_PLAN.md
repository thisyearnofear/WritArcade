# Week 3: Game Generation Integration Plan

**Objective**: Connect GameCustomizer to actual game generation API and render playable games.

**Timeline**: 3-4 days

**Status**: ✅ API & UI Complete - Testing Phase

## Current Completed Status

### ✅ API Endpoint Creation
**File**: `app/mini-app/api/games/generate/route.ts`

```typescript
POST /api/games/generate
Request:
{
  writerCoinId: "avc",
  articleUrl: "https://avc.xyz/article",
  gameTitle: "My Game",
  genre: "horror" | "comedy" | "mystery",
  difficulty: "easy" | "hard"
}

Response:
{
  gameId: "uuid",
  status: "generating" | "complete",
  game: { /* game JSON */ },
  error?: string
}
```

**Logic**:
1. Validate writer coin ID against whitelist
2. Validate article URL matches writer coin's Paragraph
3. Fetch article content via Paragraph API
4. Call existing Infinity Arcade game generation service
5. Stream response back to frontend
6. Store game metadata in database

### ✅ GameCustomizer Integration
**File**: `app/mini-app/components/GameCustomizer.tsx`

**Update**:
```typescript
const handleGenerateGame = async () => {
  setIsGenerating(true)
  try {
    const response = await fetch('/api/games/generate', {
      method: 'POST',
      body: JSON.stringify({
        writerCoinId: writerCoin.id,
        articleUrl: articleUrl,
        gameTitle: gameTitle,
        genre: gameType,
        difficulty: difficulty
      })
    })
    
    const game = await response.json()
    // Navigate to game player or show inline
  }
}
```

### ✅ Game Player Component
**File**: `app/mini-app/components/GamePlayer.tsx`

Display the generated game with:
- Game title
- Genre/difficulty badges
- Playable game content
- "Mint as NFT" button
- "Share on Farcaster" button

**Input**: `game` object from API response
**Output**: Interactive game UI

### ✅ Game Flow Integration
**File**: `app/mini-app/page.tsx`

Add new step: `play-game`

```typescript
const [step, setStep] = useState<
  | 'select-coin'
  | 'input-article'
  | 'customize-game'
  | 'play-game'  // ← NEW
>('select-coin')

// New handler
const handleGameGenerated = (game) => {
  setGeneratedGame(game)
  setStep('play-game')
}

// New UI section
{step === 'play-game' && generatedGame && (
  <GamePlayer 
    game={generatedGame}
    onMint={handleMintGame}
    onShare={handleShareGame}
  />
)}
```

### ✅ Database Schema Update
**File**: `prisma/schema.prisma`

Add game table:

```prisma
model Game {
  id        String   @id @default(cuid())
  title     String
  articleUrl String
  genre     String   // "horror" | "comedy" | "mystery"
  difficulty String  // "easy" | "hard"
  content   Json     // Full game JSON
  writerCoinId String
  creatorId String   // User who generated it
  createdAt DateTime @default(now())
  
  // Relations
  creator   User @relation(fields: [creatorId], references: [id])
}
```

## Current Implementation Status

### Code Structure
```
app/mini-app/
├── page.tsx                          ✅ Main flow coordinator (4 steps)
├── layout.tsx                        ✅ Manifest metadata
├── components/
│   ├── WriterCoinSelector.tsx        ✅ DONE
│   ├── ArticleInput.tsx              ✅ DONE
│   ├── GameCustomizer.tsx            ✅ DONE (genre/difficulty)
│   ├── GamePlayer.tsx                ✅ DONE - Interactive gameplay
│   └── PaymentButton.tsx             ⏳ WEEK 4
└── api/
    └── games/
        ├── generate/
        │   └── route.ts              ✅ DONE - Writer coin validation + game generation
        └── mint/
            └── route.ts              ⏳ WEEK 5
```

## Remaining Testing Tasks

### 1. Game Generation Testing
- [ ] Test all 6 genre/difficulty combinations (Horror/Easy, Horror/Hard, Comedy/Easy, Comedy/Hard, Mystery/Easy, Mystery/Hard)
- [ ] Verify game generation completes in <30 seconds
- [ ] Ensure all generated games are playable and complete
- [ ] Test with different article types and lengths

### 2. Error Handling & Polish
- [ ] Handle API errors gracefully
- [ ] Show loading state while generating
- [ ] Add retry logic for failed generations
- [ ] Optimize game response times
- [ ] Test edge cases (very short articles, very long articles)

### 3. Database Migration
- [ ] Apply database schema updates when DB access is available
- [ ] Verify game records are stored correctly
- [ ] Test game retrieval and display

### 4. Integration Testing
- [ ] Full end-to-end flow: Select coin → Input article → Customize → Generate → Play
- [ ] Test navigation between steps
- [ ] Verify data persistence across steps
- [ ] Test user experience flow

### 5. UI/UX Polish
- [ ] Loading animations during game generation
- [ ] Error messages with helpful guidance
- [ ] Responsive design for mobile Mini App
- [ ] Accessibility improvements

## Success Criteria

- [x] GameCustomizer shows genre/difficulty selectors
- [x] API endpoint accepts game generation requests
- [x] Game renders properly in Mini App
- [x] GamePlayer component with interactive UI
- [x] Main flow has play-game step
- [x] Database schema supports mini-app fields
- [ ] Game generation completes in <30 seconds
- [ ] All 6 genre/difficulty combinations work
- [ ] Errors display user-friendly messages
- [ ] Loading states work smoothly
- [ ] Database migration applied

## Integration Points

### Existing Services
- **Infinity Arcade**: Game generation engine (use existing API)
- **Paragraph API**: Article fetching (already working)
- **Prisma**: Database storage (already configured)

### New Services Needed
- Game generation API wrapper (`app/mini-app/api/games/generate/route.ts`)
- Game player component (`app/mini-app/components/GamePlayer.tsx`)

## Manual Testing Checklist

### Core Flow Testing
- [ ] Select AVC coin
- [ ] Paste valid AVC article URL (e.g., https://avc.xyz/...)
- [ ] Click generate for Horror + Easy
- [ ] Game renders in <30 seconds
- [ ] All game controls work
- [ ] Repeat for other genre/difficulty combos

### Error Cases Testing
- [ ] Invalid article URL
- [ ] Article from different author
- [ ] API timeout (>60 seconds)
- [ ] Network error
- [ ] Game generation failure

## Dependencies Check

```bash
npm list | grep -E "(infinity|arcade)"
```

Confirm existing game generation service is available and callable.

## Potential Blockers & Solutions

| Blocker | Solution |
|---------|----------|
| Infinity Arcade API not accessible | Check if service is running, confirm endpoint URL |
| Game generation too slow | Optimize prompts, consider caching similar articles |
| Game JSON format unexpected | Add parsing/transformation layer |
| Database migrations fail | Review Prisma schema, check PostgreSQL connection |
| Game player rendering issues | Test with simple game first, add debug logs |

## Post-Week 3 Checklist

Before moving to Week 4, confirm:
- [ ] Game generation works end-to-end
- [ ] All 6 combinations tested
- [x] Error handling in place
- [ ] Database stores games correctly (pending migration)
- [x] UI responds quickly
- [ ] Deploy to staging works
- [ ] Ready for Week 4 (Payments)

## Key Files to Review

- `docs/ROADMAP.md` - Overall vision (section: Game Customization)
- `app/mini-app/components/GameCustomizer.tsx` - Current UI integration
- `app/mini-app/api/games/generate/route.ts` - Game generation API
- `app/mini-app/components/GamePlayer.tsx` - Game display component

## Next Phase Preparation

Once Week 3 is complete and tested:
1. **Week 4: Smart Contracts & Payments**
   - Farcaster Wallet integration
   - Payment verification before game generation
   - Base network deployment
   - Revenue distribution logic

2. **Week 5: NFT Minting & Launch**
   - Game NFT creation and metadata
   - Production deployment
   - Farcaster community launch

**Ready to proceed!** 🚀
