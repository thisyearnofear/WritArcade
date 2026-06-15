# Demo Video Checklist

## Etherfuse Ramp (0:00 – 1:30)

1. **Credit balance visible** — Header shows `BuyCreditsButton` with "0" credits
2. **Open Buy Credits modal** — Click the credits badge in header
3. **Select amount** — Pick `$10.00 (100 credits)`
4. **Get quote** — Click "Buy $10.00 worth" 
5. **Etherfuse widget** — Widget URL opens (or redirects to Etherfuse)
6. **Webhook arrives** — Show server logs: "Credited 100 to user X"
7. **Balance updates** — Close modal, header now shows "100" credits
8. **Balance dropdown** — Click wallet icon, show "Credits" section with 100

## Credit-Based Generation (1:30 – 2:30)

9. **Go to generate page** — Paste an article URL
10. **Payment options** — Show three tabs: `Writer Coin | MUSD | Credits`
11. **Select Credits** — Click the green "Credits" tab
12. **Credit balance** — Shows "Credit Balance: 100 Credits" + "10 credits needed"
13. **Pay with Credits** — Click "Pay 10 Credits and Generate"
14. **Success** — Shows "Paid with credits! 90 credits remaining"
15. **Game generates** — 5-panel comic story is created

## SuperRare NFT Minting (2:30 – 4:00)

16. **Navigate to game** — Open the game just created
17. **Scroll to SuperRare section** — "SuperRare Collectible" card
18. **Status: Available** — Shows "Available to mint" for game owner
19. **Click "Collect as SuperRare NFT"** — Pink button
20. **API processes** — Metadata uploaded to IPFS, mint payload prepared
21. **Wallet confirmation** — (Simulated) Show the metadata being signed
22. **Transaction confirmed** — PATCH request records `superrareTokenId`
23. **Section updates** — Now shows "Minted on SuperRare" with token ID

## NFT Gallery (4:00 – 4:30)

24. **Go to My Games** — Click "My Games" in header
25. **NFT Gallery tab** — Pink tab with count badge
26. **SuperRare collection** — Shows game card with SuperRare badge
27. **Details** — Token ID, mint date visible
28. **Empty state** — If no items, shows "No SuperRare collectibles yet"

## Jogadores Bônus

- **Balance Display** — Show credits in the wallet dropdown alongside Base tokens
- **Ramp Webhook** — Show the webhook handler verifying HMAC signature
- **SuperRare GraphQL** — Show `getNFTsByOwner` query returning minted NFTs

## Technical Verification (before recording)

```
# Prisma schema up to date
npx prisma db push --accept-data-loss

# Environment variables set
ETHERFUSE_API_KEY=your-key
ETHERFUSE_API_URL=https://api.sand.etherfuse.com
SUPERRARE_API_KEY=your-key

# Build passes
pnpm build
```
