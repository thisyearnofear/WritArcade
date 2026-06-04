# WritersArcade — Mezo Hackathon Submission

**Track**: MUSD — Consumer experiences where Bitcoin-backed MUSD powers payments, gaming, creator monetization, and everyday apps.

**Live demo**: https://writersarcade.vercel.app/
**Demo video**: [Link to your Loom/YouTube video]

---

## 🏆 What We Built

**WritersArcade** turns any Paragraph.xyz article into an interactive, playable, mintable 5-panel comic game — powered by **MUSD payments on Mezo** with on-chain revenue splits that automatically compensate writers, creators, and the platform.

The entire Mezo/MUSD integration was built during this hackathon (April–May 2026) as a completely new direction for our existing project, which previously only supported writer-coin payments on Base.

---

## 🎯 Mezo Integration (What Was Built During the Hackathon)

| Feature | Status | Details |
|---------|--------|---------|
| **MUSD Payment Flow** | ✅ Live | Pay 1 MUSD to generate a game; atomic on-chain revenue split via smart contract |
| **MezoPaymentSplitter** | ✅ Deployed | `0x32D0356f533cC429F94Db73f383bBb21a459E16b` — handles MUSD approval + split |
| **MezoBoostedSplitter** 🆕 | ✅ Deployed | `0x56Ee5A3f122da00B635DdbB319708e24450aEB89` — v2 with 10% creator share boost for MEZO holders |
| **GameNFTMezo** 🆕 | ✅ Deployed | `0xb6001687e4700843e0a04a442031525f669465e7` — open-mint ERC-721 for minting comic NFTs directly on Mezo (no role required) |
| **Chain-Aware Minting** | ✅ Live | Mint endpoint returns correct chainId + contract per payment type; frontend auto-switches chains before mint tx |
| **MEZO Holder Badge** | ✅ Live | On-chain MEZO balance detection; UI badge in payment flow for holders ≥ 1 MEZO |
| **Mezo Passport SDK** | ✅ Integrated | Bitcoin wallet connections (Xverse, Unisat, OKX) via Mezo Passport |
| **MUSD Strategy Pattern** | ✅ Live | Decoupled payment architecture — supports both Mezo (MUSD) and Base (writer coins) |
| **Dual-Ecosystem UI** | ✅ Live | Homepage toggle between "MUSD · Mezo" and "Writer Coin · Base" with progressive disclosure |
| **Tenderly Multi-Chain Sim** | ✅ Integrated | Cross-chain simulation for both Base and Mezo networks |
| **Goldsky Subgraph** | ✅ Configured | Indexed analytics pipeline for Mezo contract events |

---

## 🔧 Technical Stack

- **Frontend**: Next.js 16 + TypeScript + TailwindCSS + Framer Motion
- **Web3**: wagmi + viem + RainbowKit + **Mezo Passport**
- **Mezo**: MUSD (Bitcoin-backed stablecoin), MEZO token, Mezo Matsnet (testnet)
- **AI**: OpenAI/Anthropic (ai-sdk); Venice AI + Pollinations (images)
- **IP**: Story Protocol (testnet) + IPFS (Pinata primary, Grove fallback)
- **Access Control**: Lit Protocol (NFT-gated encryption)
- **Indexing**: Goldsky subgraph (configured for Mezo contract events)
- **Testing**: Tenderly multi-chain simulation
- **Backend**: Next.js API routes + Prisma + PostgreSQL (Neon)

---

## 🏗 Architecture

```
                    ┌─────────────────────────────┐
                    │   User (Browser / Wallet)    │
                    │   - Mezo Passport (Bitcoin)  │
                    │   - RainbowKit (EVM)         │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │   Next.js App (Frontend)     │
                    │   - Homepage (dual-eco UI)   │
                    │   - Generate flow            │
                    │   - GamePlayer               │
                    │   - Workshop                 │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐  ┌─────▼──────┐  ┌──────▼─────────┐
    │  Base Mainnet   │  │ Mezo Testnet│  │  Story Protocol │
    │  (Chain 8453)   │  │(Chain 31611)│  │  (Chain 1516)   │
    │                 │  │             │  │                  │
    │ Writer Coins    │  │  MUSD       │  │  IP Registration │
    │ GameNFT         │  │  MEZO token │  │  PIL Licenses    │
    │ Payment         │  │  Boosted    │  │  Royalty Tracking│
    │  Contracts      │  │  Splitter   │  │                  │
    └─────────────────┘  └─────────────┘  └──────────────────┘
```

### MUSD Payment + Mint Flow (Detailed)

```
1. User selects "MUSD · Mezo" on homepage
2. User pastes a Paragraph article URL
3. User connects Bitcoin wallet via Mezo Passport
4. Approve MezoBoostedSplitter to spend 1 MUSD
5. Call payForGeneration(1 MUSD) on the splitter
6. Splitter atomically forwards:
   ├── 50% → Writer Pool
   ├── 25% → Platform Treasury
   └── 25% → Creator Pool
7. MEZO holders get +10% creator share boost
8. AI generates 5-panel comic
9. Mint as NFT (separate tx, gas only):
   ├── POST /api/games/mint → returns chainId, contractAddress, metadata
   ├── Frontend auto-switches to Mezo chain if needed
   ├── Calls GameNFTMezo.mintGame() with base64 data URI tokenURI
   └── PATCH /api/games/mint → stores tx hash
```

### Smart Contracts on Mezo Testnet

| Contract | Address | Explorer |
|----------|---------|----------|
| **MUSD Token** | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` | [Explorer](https://explorer.test.mezo.org/address/0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503) |
| **MEZO Token** (precompile) | `0x7B7c000000000000000000000000000000000001` | [Explorer](https://explorer.test.mezo.org/address/0x7B7c000000000000000000000000000000000001) |
| **MezoPaymentSplitter** | `0x32D0356f533cC429F94Db73f383bBb21a459E16b` | [Explorer](https://explorer.test.mezo.org/address/0x32D0356f533cC429F94Db73f383bBb21a459E16b) |
| **MezoBoostedSplitter** 🆕 | `0x56Ee5A3f122da00B635DdbB319708e24450aEB89` | [Explorer](https://explorer.test.mezo.org/address/0x56Ee5A3f122da00B635DdbB319708e24450aEB89) |
| **GameNFTMezo** 🆕 | `0xb6001687e4700843e0a04a442031525f669465e7` | [Explorer](https://explorer.test.mezo.org/address/0xb6001687e4700843e0a04a442031525f669465e7) |

Deployer: `0xb8CE765cD679ECB958c0D2869d516C386b9d5a85`
Platform Treasury: `0xb8CE765cD679ECB958c0D2869d516C386b9d5a85`

---

## 💰 Revenue Model

| Action | Writer Share | Platform Share | Creator Share |
|--------|-------------|----------------|---------------|
| **Game Generation** | 60% (via pool) | 20% | 20% |
| **Mint as NFT** | 15% | 5% | 30% (remainder to minter) |
| **MEZO Holder Boost** | +10% boost to writer share (from platform) |

---

## 🧪 How to Demo

1. **Visit** https://writersarcade.vercel.app/
2. **Toggle to "MUSD · Mezo"** (amber tab) — it's the default
3. **Paste any Paragraph.xyz article URL** or use the sample link
4. **Connect via Mezo Passport** (Xverse, Unisat, or OKX wallet)
5. **Pay 1 MUSD** to generate your 5-panel game
6. **Play the game** — navigate panels with mood tracking
7. **Mint as NFT** — on-chain revenue split via MezoBoostedSplitter
8. **See the MEZO holder badge** if your wallet has ≥ 1 MEZO

**Contract Verification**: View the [MezoBoostedSplitter](https://explorer.test.mezo.org/address/0x56Ee5A3f122da00B635DdbB319708e24450aEB89) on Mezo testnet explorer.


---

## 🗓 Development Timeline (During Hackathon)

| Date | Milestone |
|------|-----------|
| Apr 13 | Hackathon announced; MUSD payment architecture designed |
| Apr 25 | Abstract payment flow; Mezo Passport support |
| May 6 | MUSD payment flow live; MEZO holder perks; UI redesign |
| May 6 | MezoBoostedSplitter contract with holder boost logic |
| May 7–8 | Build fixes, Mezo Passport SDK, dual-ecosystem UI polish |
| May 8 | UX improvements (9/10 scorecard); homepage conversion flow |
| May 21 | **MezoBoostedSplitter deployed**; critical env bug fix; submission docs |

---

## 🚀 What's Next

- [x] **GameNFTMezo** — deployed open-mint NFT contract for minting comics directly on Mezo (no IPFS needed, base64 data URIs)
- [x] **Chain-aware minting** — auto-switch from Base to Mezo before mint tx; mint endpoint returns correct chainId per payment type
- [ ] Deploy MezoBoostedSplitter to **Mezo Mainnet** (post-hackathon)
- [ ] Goldsky subgraph live indexing for real-time analytics
- [ ] Farcaster Mini-App integration with Mezo Passport
- [ ] Additional MUSD-based monetization (premium panels, creator tipping)

---

## 👥 Team

**WritersArcade** — Turn articles into interactive, ownable games.

- **Live**: https://writersarcade.vercel.app/
- **GitHub**: https://github.com/thisyearnofear/writersarcade
- **Mezo Explorer**: https://explorer.test.mezo.org/

---

*Built for the Mezo Hackathon by Encode Club, April–May 2026.*

---

## 📊 Track Fit — MUSD Track

| Criteria | How We Meet It |
|----------|---------------|
| Integrates MUSD | ✅ Primary payment method — 1 MUSD per game generation/mint |
| Integrates MEZO | ✅ MEZO holder detection + boosted creator shares (10% boost) |
| Working testnet demo | ✅ Deployed on Mezo Matsnet, publicly accessible |
| Built during hackathon | ✅ Entire Mezo track built April–May 2026 (git log verified) |
| Consumer-facing | ✅ Gaming + creator monetization — everyday Bitcoin use case |
| Revenue model | ✅ On-chain splits with real economic incentives |
| Technical partners | ✅ Uses Tenderly (simulation) + Goldsky (indexing) |
