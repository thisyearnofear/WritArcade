# Inco Integration — WritersArcade Summer Game Jam 2026

> **Track**: Inco Prize Track  
> **Chain**: Base mainnet (Chain ID 8453)  
> **SDK**: `@inco/lightning-js` + Solidity `@inco/lightning`

---

## Overview

WritersArcade turns articles into playable 5-panel interactive story games. The Daily Challenge uses **Inco confidential compute** to create provably fair, hidden game mechanics — a shuffled modifier deck, encrypted scoring, and NFT-gated secret content — all living on Base mainnet.

Two smart contracts power the integration:

| Contract | Address | Role |
|----------|---------|------|
| `DailyChallengeVault` | [`0xcc271a53e4286012f3289273fdaa32f66fa64a33`](https://basescan.org/address/0xcc271a53e4286012f3289273fdaa32f66fa64a33) | Encrypted modifier deck, per-player sessions, gradient FHE scoring (10 \| 6 \| 3 \| 1 per panel), on-chain reveal |
| `SecretPanelVault` | [`0x36a3931f1acb69033f98e6eb8c3aa7d59cc6e5e8`](https://basescan.org/address/0x36a3931f1acb69033f98e6eb8c3aa7d59cc6e5e8) | Multi-chunk encrypted epilogue content, NFT-gated decryption |

---

## Hidden Mechanics — How Inco Powers the Game Loop

### 1. Verifiably Fair Deck Shuffle

```solidity
elist deck = e.shuffledRange(1, uint16(DECK_SIZE + 1), ETypes.Uint256);
```

Each daily challenge creates an encrypted permutation of 52 modifier cards. The shuffle output is an `elist` — an ordered sequence of `euint256` values whose plaintext order is hidden from everyone, including the contract deployer and backend.

### 2. Private Hand Dealing (No Replacement)

When a player starts a session, 5 cards are drawn sequentially from the encrypted deck:

```solidity
euint256 card = e.getEuint256(challenge.shuffledDeck, deckIndex);
card.allow(msg.sender);       // Player can decrypt later
card.allow(narrativeOperator); // Backend can read for AI narrative
```

Each card is `allow()`-ed only to the player and the narrative operator — no other player or observer can see the dealt hand. When fewer than 5 cards remain, the contract automatically reshuffles a new cycle (so the challenge is never capped at 10 players).

### 3. Encrypted Gradient Scoring via FHE

Panel choices are scored against the hidden optimal answer using fully homomorphic comparison. Rather than binary hit/miss, each choice earns a **gradient** verdict (10 | 6 | 3 | 1) derived from ring distance on the 4-option dial — near-the-right-intent choices give partial credit, so the per-panel UI signal is honest instead of decorative.

```solidity
euint256 optimalChoice = modifierCard.rem(CHOICES_PER_PANEL);
euint256 playerChoice = uint256(choiceIndex).asEuint256();
ebool isHit = optimalChoice.eq(playerChoice);

// Branch-free FHE ring distance: min(clockwise, counterClockwise) on a 4-dial
euint256 clockwise  = optimalChoice.add(N).sub(playerChoice).rem(N);
euint256 counterCw  = playerChoice.add(N).sub(optimalChoice).rem(N);
euint256 distance   = clockwise.min(counterCw); // 0 | 1 | 2

euint256 verdict = e.select(isHit, 10,
                 e.select(distance == 1, 6,
                 e.select(distance == 2, 3, 1)));

session.score = session.score.add(verdict);   // stays sealed until reveal
session.panelVerdicts.push(verdict);          // per-panel, allow(player)
verdict.allow(session.player);                // enables the resonance pulse
```

The running total stays ciphertext. Each panel's verdict is `allow()`-ed to the player when `recordChoice` lands, so the UI can `attestedDecrypt` just that one value and show real feedback (direct hit / near miss / faint / missed) without leaking the season total. Player-initiated reveal still opens only the final score + full hand.

### 4. Player-Initiated Reveal

```solidity
function completeAndReveal(bytes32 sessionId) external {
    session.score.reveal();
    for (uint8 i = 0; i < PANELS_PER_GAME; i++) {
        session.drawnModifiers[i].reveal();
    }
}
```

Only the player can call `completeAndReveal`. This transitions all encrypted values to public state on-chain, making the score and hand composition verifiable by anyone. The UI animates this moment as a dramatic card-flip sequence.

### 5. NFT-Gated Secret Epilogues (SecretPanelVault)

Game epilogues are encrypted as multi-chunk `euint256` values and stored on-chain. Only the NFT owner can decrypt:

```solidity
euint256 handle = ciphertextChunks[i].newEuint256(msg.sender);
handle.allow(nftOwner);
```

Client-side decryption uses `attestedDecrypt` from `@inco/lightning-js` — the wallet signs an attestation proving ownership, and Inco's covalidators release the plaintext only to the authorized party.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Daily Challenge Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Backend (SESSION_MANAGER_ROLE)                              │
│  ┌──────────────────────────────────┐                       │
│  │ createDailyChallenge(day)        │                       │
│  │  → e.shuffledRange(1, 53)        │ Encrypted 52-card deck│
│  │  → challenge.shuffledDeck = deck │                       │
│  └──────────────────────────────────┘                       │
│                     ↓                                        │
│  Player (wallet)                                            │
│  ┌──────────────────────────────────┐                       │
│  │ startSession(day) payable        │                       │
│  │  → deal 5 encrypted cards        │ allow(player)         │
│  │  → session.score = encrypt(0)    │                       │
│  └──────────────────────────────────┘                       │
│                     ↓                                        │
│  Backend (per-panel, after player choice)                   │
│  ┌──────────────────────────────────┐                       │
│  │ recordChoice(sessionId, panel, c)│                       │
│  │  → FHE: optimal.eq(choice)       │ Score updates in      │
│  │  → session.score += delta        │ ciphertext            │
│  └──────────────────────────────────┘                       │
│                     ↓ (×5 panels)                            │
│  Player (wallet)                                            │
│  ┌──────────────────────────────────┐                       │
│  │ completeAndReveal(sessionId)     │                       │
│  │  → score.reveal()                │ Now public on-chain   │
│  │  → modifiers[i].reveal()         │                       │
│  └──────────────────────────────────┘                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Why This Needs Confidential Compute

Without Inco, these mechanics are impossible on a transparent blockchain:

| Mechanic | Transparent chain | With Inco |
|----------|-------------------|-----------|
| Deck shuffle | Anyone reads card order from storage | Encrypted `elist` — order hidden |
| Dealt hand | Opponents see your cards | `allow()` restricts visibility |
| Scoring | Players game choices by observing score updates | FHE arithmetic on ciphertext |
| Reveal timing | No concept of "hidden until ready" | Player-initiated `reveal()` |
| Secret content | Epilogue text readable by anyone | `attestedDecrypt` enforces NFT ownership |

---

## File Map

| Path | Purpose |
|------|---------|
| `contracts/src/DailyChallengeVault.sol` | Core game session contract |
| `contracts/src/SecretPanelVault.sol` | Encrypted epilogue storage |
| `lib/daily-challenge/inco.ts` | TypeScript SDK wrapper (encrypt/decrypt/fee reads) |
| `lib/daily-challenge/daily-challenge-client.ts` | Client session lifecycle (start/resume/reveal) |
| `hooks/use-daily-challenge-onchain.ts` | React hook bridging wagmi → vault |
| `components/daily-challenge/daily-modifier-strip.tsx` | In-game encrypted card indicator |
| `components/daily-challenge/encrypted-state-indicator.tsx` | Live ciphertext visualization |
| `domains/games/components/modifier-reveal.tsx` | Multi-phase decrypt reveal animation |
| `domains/games/components/secret-panel.tsx` | NFT-gated epilogue decryption UI |

---

## Deployment

- **Network**: Base mainnet (live, real ETH fees)
- **Contracts compiled with**: Foundry + `@inco/lightning` Solidity library
- **Frontend SDK**: `@inco/lightning-js/lite` (lazy-loaded, tree-shaken)
- **Access control**: OpenZeppelin `AccessControl` + `Ownable2Step`
- **Fee model**: Players pay Inco network fees via `msg.value` (calculated dynamically from `inco.getFee()` and `inco.getEListFee()`)

---

## Judging Criteria Alignment

| Criterion (25%) | How we address it |
|-----------------|-------------------|
| **Hidden mechanics** | Two distinct encrypted systems: shuffled deck with FHE scoring + NFT-gated encrypted content. Not a single random number — a full game loop in ciphertext. |
| **Completeness** | Deployed on Base mainnet with working frontend, wallet integration, API routes, and client-side decryption. Full encrypt→store→play→reveal loop. |
| **Creativity** | Using confidential compute for *narrative* gaming — encrypted cards shape AI-generated story branches. The "hidden hand" is a storytelling mechanic, not just a poker hand. |
| **Fun** | Dramatic reveal animation, score count-up, card-flip physics, leaderboard competition. The moment of decryption is designed to feel rewarding. |
