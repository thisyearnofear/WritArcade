# writersarcade Development Guide

**Last Updated:** March 6, 2026
**Status:** Phase 9 - Production Ready (Base Batches submission)

## Quick Start

### 1. Local Setup
```bash
# Install dependencies
pnpm install

# If you encounter lockfile issues, use:
# pnpm install --no-frozen-lockfile

# Start dev server (uses turbopack)
pnpm dev

# Opens:
# Web app: http://localhost:3000/
# Mini-app: http://localhost:3000/mini-app
```

### 2. Quick Testing (5 minutes)

**Basic Game Generation:**
1. Navigate to generator, paste any Paragraph.xyz URL
2. Click "Create Game" (no customization) → Verify 4 options parse correctly

**Customization Testing:**
1. Select Genre = "Horror", connect wallet, generate custom game
2. Verify horror-themed content and article context integration

**Visual Identity:**
- Games now generate with Venice AI cover art (requires API key)
- Hero images display on game pages with genre-specific styling
- Compact success modal navigates to game page (no new tabs)

**Error Handling:**
- Test offline/network errors → Should show red banner (no alert dialogs)
- Auto-retry mechanism triggers after 2 seconds

### 2. Environment Configuration
```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/writarcade"

# AI Services
OPENAI_API_KEY="sk-..."           # OpenAI for game generation
ANTHROPIC_API_KEY="sk-..."        # Claude for advanced prompting
VENICE_API_KEY="..."              # Venice AI for image generation

# Blockchain
BASE_RPC_URL="https://mainnet.base.org"    # Base mainnet RPC
STORY_RPC_URL="https://aeneid.storyrpc.io" # Story testnet RPC
STORY_WALLET_KEY="0x..."          # Private key for Story transactions
PINATA_JWT="pina_..."             # Pinata JWT for IPFS uploads

# Wallet Integration
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="..." # WalletConnect project ID

# Feature Flags
STORY_IP_REGISTRATION_ENABLED="true"  # Enable/disable Story Protocol integration
```

## Project Structure

```
writarcade/
├── app/                     # Next.js app router
│   ├── api/                 # API routes
│   ├── mini-app/            # Farcaster mini-app
│   └── web/                 # Web application
├── components/              # Shared React components
├── domains/                 # Business logic by domain
│   ├── games/               # Game generation and management
│   ├── assets/              # Asset creation and marketplace
│   └── payments/            # Payment processing
├── lib/                     # Shared utilities and services
├── contracts/               # Smart contracts
├── prisma/                  # Database schema and migrations
├── public/                  # Static assets
└── scripts/                 # Deployment and utility scripts
```

## Development Workflow

### 1. Branching Strategy
- `main` - Production code
- `develop` - Staging environment
- `feature/*` - New features
- `hotfix/*` - Emergency fixes

### 2. Code Quality
```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format

# Run tests
pnpm test
```

### 3. Database Management
```bash
# Generate Prisma client
pnpm db:generate

# Push schema changes to database
pnpm db:push

# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed
```

### 4. Building the Project
```bash
# Build the project for production
pnpm build

# The build process will:
# 1. Push any pending database schema changes
# 2. Compile the Next.js application
# 3. Generate TypeScript definitions
# 4. Create optimized static pages where possible

# If you encounter TypeScript errors during build:
# - Check for property access on potentially undefined objects
# - Ensure proper typing of contract return values
# - Verify that all required fields in interfaces are properly implemented
```

## API Endpoints

### Game Generation
```
POST /api/games/generate
{
  "articleUrl": "https://paragraph.xyz/@fredwilson/on-openai",
  "genre": "horror",
  "difficulty": "hard"
}

Response:
{
  "id": "uuid",
  "title": "Generated Game Title",
  "options": [...],
  "coverArt": "ipfs://..."
}
```

### Game Management
```
GET /api/games/my-games
GET /api/games/[id]
PUT /api/games/[id]/visibility
DELETE /api/games/[id]
```

### NFT Minting
```
POST /api/games/[id]/mint
{
  "recipient": "0x..."
}

Response:
{
  "transactionHash": "0x...",
  "nftId": "123"
}
```

### IP Registration (Story Protocol)
```
POST /api/assets/[id]/register
{
  "creatorWallet": "0x..."
}

Response:
{
  "storyIpId": "0x...",
  "transactionHash": "0x..."
}
```

### Game Feedback & Approval (Phase 8)
```
POST /api/games/[slug]/feedback
{
  "npsScore": 8,
  "npsComment": "Great game!",
  "fidelityRating": 5
}

Response: { "id": "...", "averageNPS": 7.5 }

---

GET /api/games/[slug]/feedback
Response: { "averageNPS": 7.5, "averageFidelity": 4.8, ... }

---

PATCH /api/games/[slug]/approve
{
  "action": "approve" | "reject",
  "reason": "optional rejection reason"
}

Response: { "approvalStatus": "approved", "approvedAt": "..." }
```

## Phase 8: Quality & UX Integration Guide

### Features Integrated (Dec 25, 2025)

#### 1. Narrative Preview Modal ✅
- **Component**: `components/game/narrative-preview-modal.tsx`
- **Integration**: `GamePlayInterface` (line 17, 1119)
- **Behavior**: Shows on "Start Game" click, displays first panel narrative + options
- **Testing**: 
  ```
  1. Click "Start Game" → Modal should appear
  2. Confirm preview → Proceed with payment or gameplay
  3. Cancel preview → Return to game list
  ```

#### 2. Article Fidelity Review ✅
- **Component**: `components/game/article-fidelity-review.tsx`
- **Integration**: `GameGeneratorForm` (line 17, 649)
- **Behavior**: Triggered after game generation, shows game preview + approval buttons
- **API**: Calls `PATCH /api/games/[slug]/approve` on approve/reject
- **Testing**:
  ```
  1. Generate a game → Fidelity review modal appears
  2. Click "Approve" → Game marked as approved, success modal shows
  3. Click "Reject" → Game marked as rejected, error message shows
  ```

#### 3. Post-Game Feedback (NPS) ✅
- **Component**: `components/game/post-game-feedback.tsx`
- **Integration**: `ComicBookFinale` (line 12, 857)
- **Behavior**: Shows after NFT mint completes, collects NPS score + optional comment
- **API**: Calls `POST /api/games/[slug]/feedback`
- **Testing**:
  ```
  1. Complete a game and click "Mint as NFT"
  2. After mint, feedback modal appears
  3. Select NPS score (0-10) → See comment field
  4. Submit feedback → Closes, saves via API
  5. Skip → Closes without saving
  ```

### Database Integration

All Phase 8 features use existing database tables (synced with `npx prisma db push`):
- `Game` table: `approvalStatus`, `articleFidelityScore`, `approvedAt`, `rejectionReason`
- `GameFeedback` table: `npsScore`, `npsComment`, `fidelityRating`, `narrativeQuality`, `engagementScore`
- `PanelRating` table: Per-panel image ratings

### Testing Checklist

- [x] Narrative preview modal appears on game start
- [x] Article fidelity review appears after generation
- [x] Feedback modal appears after NFT mint
- [x] All API calls succeed (feedback/approval endpoints)
- [x] Database schema synced
- [x] Build passes without errors (Dec 25)

## Smart Contracts

- [x] **Smart Contracts V1**: Deployed to Base.
- [x] **WriterCoinPayment V2 (Planned)**: Updated to support `payForGameplay` with dynamic splits (80% Creator / 10% Writer / 10% Platform).
- [ ] **Agent Wallet**: Integrate Coinbase AgentKit.

### Deployment
```bash
# Deploy to Base Sepolia testnet
npm run deploy:testnet

# Deploy to Base mainnet
npm run deploy:mainnet
```

### Contracts
1. `WriterCoinPayment.sol` - Handles writer coin payments
2. `GameNFT.sol` - Mints games as NFTs
3. `StoryIPAuthor.sol` - Manages IP registration on Story Protocol

## Testing

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### End-to-End Tests
```bash
npm run test:e2e
```

## Deployment

### Vercel Deployment
- Automatically deploys from `main` branch
- Preview deployments for pull requests
- Environment variables managed in Vercel dashboard

### Smart Contract Deployment
```bash
# Deploy contracts
pnpm deploy:contracts

# Verify contracts
pnpm verify:contracts
```

## Phase 8: Quality UX Features Integration

### Components Ready to Integrate
Three production-ready components have been created for better UX and quality metrics:

**1. Narrative Preview Modal** (`components/game/narrative-preview-modal.tsx`)
- Shows first panel before payment/gameplay
- Displays opening scene, player choices, and game stats
- Integration: Update `GamePlayInterface.handleStartClick()` to show preview first

**2. Article Fidelity Review** (`components/game/article-fidelity-review.tsx`)
- Shows article themes vs generated game side-by-side
- Computes semantic match score (0-100)
- Options: Approve, Regenerate, Edit Themes
- Integration: Update `GameGeneratorForm` to show after generation (before success)

**3. Post-Game Feedback** (`components/game/post-game-feedback.tsx`)
- Multi-step feedback: NPS (0-10) + optional comments
- Smooth animations, gamified UX
- Integration: Add to game finale after 5th panel

### Database Changes Required
Run migration to add:
```bash
npx prisma migrate dev --name add_game_feedback_and_approval
```

New tables/fields:
- `Game.approvalStatus` (pending|approved|rejected)
- `Game.articleFidelityScore` (0-100)
- `GameFeedback` table (NPS, ratings)
- `PanelRating` table (per-panel image ratings)

### Integration Checklist
- [ ] Migrate database schema
- [ ] Update `GamePlayInterface` to show preview modal
- [ ] Update `GameGeneratorForm` to show fidelity review
- [ ] Add feedback modal to game finale
- [ ] Test approval workflow (games blocked until approved)
- [ ] Verify feedback submission and persistence
- [ ] Add approval status check in game play page

**Estimated time**: 2-3 hours

## Troubleshooting

### Common Issues

**"Module not found" errors**
- Run `pnpm install` to ensure all dependencies are installed
- If you encounter lockfile issues, use `pnpm install --no-frozen-lockfile`
- Check that all imports use correct paths

**Build Errors Related to Type Mismatches**
- If you encounter TypeScript errors related to property access on potentially undefined objects, ensure proper optional chaining is used
- When working with contract return values, make sure to properly type the return data before destructuring

**Database connection errors**
- Verify `DATABASE_URL` in `.env.local`
- Ensure PostgreSQL is running locally
- Check that database user has proper permissions

**Wallet connection issues**
- Verify WalletConnect project ID is set
- Check that wallet provider supports the required networks
- Ensure user has sufficient funds for transactions

**AI generation failures**
- Verify API keys are set correctly
- Check rate limits on AI providers
- Ensure article URLs are accessible

### Debugging Tips

1. Check browser console for frontend errors
2. Check terminal output for backend errors
3. Use Prisma Studio to inspect database: `pnpm db:studio`
4. Enable debug logging with `DEBUG=*` environment variable
5. Use Postman or curl to test API endpoints directly

## Contributing

### Code Standards
- Follow existing code style and patterns
- Write TypeScript with strict type checking
- Include unit tests for new functionality
- Document public APIs and complex logic
- Keep pull requests focused on single features

### Pull Request Process
1. Create feature branch from `develop`
2. Implement changes with tests
3. Update documentation if needed
4. Submit pull request to `develop`
5. Address review feedback
6. Merge after approval

## Resources

- **Farcaster Mini-App Docs**: https://docs.farcaster.xyz/mini-apps
- **Story Protocol Docs**: https://docs.story.foundation/
- **Base Documentation**: https://docs.base.org/
- **OpenAI API**: https://platform.openai.com/docs/
- **Viem Documentation**: https://viem.sh/