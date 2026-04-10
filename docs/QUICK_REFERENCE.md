# Quick Reference Guide

Essential commands and file locations for writersarcade development.

## Environment Setup

```bash
# First time setup
cp .env.example .env.local
# Edit .env.local with your actual API keys
npm install --legacy-peer-deps
npm run dev
```

## Key File Locations

### Configuration
- `.env.local` - Your secrets (gitignored)
- `.env` - Non-sensitive defaults
- `.env.example` - Template for new devs

### Documentation
- `docs/` - All documentation
- `docs/MODAL_SETUP.md` - Modal deployment guide
- `docs/development.md` - Development guide
- `docs/architecture.md` - System architecture

### Scripts
- `scripts/modal/` - Modal deployment scripts
- `scripts/modal/modal_image_gen.py` - Deploy to Modal
- `scripts/modal/test-modal-integration.js` - Test Modal endpoint

## Common Commands

### Development
```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
```

### Database
```bash
npm run db:push          # Push schema changes
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio
```

### Modal (Image Generation)
```bash
cd scripts/modal
modal deploy modal_image_gen.py           # Deploy to Modal
modal run modal_image_gen.py --prompt "test"  # Test locally
node test-modal-integration.js            # Test deployed endpoint
```

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - WalletConnect
- `VENICE_API_KEY` - Primary image generation
- `MODAL_IMAGE_GEN_URL` - Fallback image generation

### Optional
- `NETMIND_API_KEY` - Secondary fallback
- `OPENAI_API_KEY` - Text generation
- `NEYNAR_API_KEY` - Farcaster integration

## Image Generation Providers

1. **Venice AI** (Primary) - `VENICE_API_KEY`
2. **Modal** (Fallback 1) - `MODAL_IMAGE_GEN_URL`
3. **Netmind** (Fallback 2) - `NETMIND_API_KEY`

## API Routes

### Games
- `POST /api/games/generate` - Generate game from article
- `POST /api/games/mint` - Mint game as NFT
- `GET /api/games/my-games` - List user's games

### Image Generation
- `POST /api/generate-image` - Generate images (auto-fallback)

### Assets
- `POST /api/assets/generate` - Generate asset
- `POST /api/assets/save` - Save asset
- `GET /api/assets/marketplace` - List marketplace assets

## Smart Contracts (Base Mainnet)

- GameNFT: `0x778C87dAA2b284982765688AE22832AADae7dccC`
- WriterCoinPayment: `0xf11822F99FF5f6982d42d4A0923d2b3f9589fA75`

## Useful Links

- Live Site: https://writersarcade.vercel.app/
- Modal Dashboard: https://modal.com/apps/papaandthejimjams
- Base Explorer: https://basescan.org/

## Troubleshooting

### Modal not working?
```bash
# Check deployment status
modal app list

# View logs
modal app logs writersarcade-image-gen

# Redeploy
cd scripts/modal
modal deploy modal_image_gen.py
```

### Database issues?
```bash
# Reset database
npm run db:push

# Check connection
npm run db:studio
```

### Build errors?
```bash
# Clean install
rm -rf node_modules .next
npm install --legacy-peer-deps
npm run dev
```

## Security Notes

- Never commit `.env.local`
- Keep API keys in `.env.local` only
- `.env` should have no sensitive data
- Modal endpoint URL is not sensitive but keep in `.env.local` for consistency

## Getting Help

1. Check `docs/development.md` for detailed guides
2. Check `docs/architecture.md` for system overview
3. Check `docs/MODAL_SETUP.md` for Modal-specific help
4. Review API route files for implementation details
