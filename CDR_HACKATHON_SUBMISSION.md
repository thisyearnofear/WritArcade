# WritersArcade — Story CDR Hackathon Submission

**Tracks targeted:** Best CDR Application **and** Technical Implementation
**Live demo:** https://writersarcade.vercel.app/
**Demo video:** _<paste Loom/YouTube link here before submitting>_
**Repo:** https://github.com/thisyearnofear/writersarcade
**Network:** Story Aeneid Testnet (chainId `1315`)

---

## Judge Quick Path

Want to see CDR doing real work in under 3 minutes? Follow this exact path.

1. Open https://writersarcade.vercel.app/
2. Toggle **"MUSD · Mezo"** or **"Writer Coin · Base"** on the homepage (either works for the CDR demo).
3. Paste a Paragraph article URL (or use the sample link), pay, and generate a **fresh** game — older games may be vaulted under the legacy default NFT contract.
4. Open the new game page and look for the **"Vaulted via CDR"** badge on the Secret Panel.
5. Try to unlock before completing the story → you'll be denied (the policy is checked before any vault UUID is exposed).
6. Play all 5 story panels.
7. Mint the game NFT (chain auto-switches based on the game's payment type).
8. Click **Unlock Secure Panel** with the NFT-owning wallet. The UI shows the live decryption steps:
   - "Verifying completion + NFT ownership…"
   - "Loading CDR SDK (WASM)…"
   - "Requesting CDR read on Story Aeneid…"
9. When the epilogue renders, the **CDR access policy** block shows the satisfied condition, gate NFT, token ID, panel count, and vault UUID — all copyable.

---

## What We Built

WritersArcade turns any [Paragraph.xyz](https://paragraph.xyz) article into an interactive 5-panel comic game, then stores the hidden **post-game epilogue** in a **Story CDR vault**. The secret panel is confidential until a player satisfies all of:

1. Complete the full 5-panel playthrough.
2. Own the minted Game NFT for that game.
3. Decrypt the CDR vault client-side through their wallet.

This makes the game ending **confidential, ownable IP** rather than ordinary app-gated content. The valuable creative payload isn't hidden behind a database flag — it's encrypted into a Story-Aeneid CDR vault and only decrypts when the player proves the right relationship to the game object on-chain.

---

## CDR Integration — Architecture

```
Paragraph article URL or prompt
  -> AI game generation (5 narrative panels)
  -> AI secret epilogue generation (panel 6, vaulted)
  -> uploadCDR() to Story Aeneid testnet
       writeCondition = ownerOnly(platform)
       readCondition  = tokenGate(GameNFT contract)
  -> game stored with promptVaultUuid + cdrReadConditionType
  -> player completes 5 panels (server tracks via session)
  -> player mints the Game NFT
  -> player clicks Unlock
       1) /api/games/[slug]/secret-panel
          - verifies session has 5 assistant chats for this game
          - verifies wallet owns the minted nftTokenId on the right chain
          - returns vault UUID + access-policy summary
       2) browser lazy-loads @piplabs/cdr-sdk (5.5 MB WASM)
       3) wallet signs CDR accessCDR(uuid) on Story Aeneid
       4) CDR validators check the tokenGate read condition
       5) decrypted dataKey is rendered as the secret epilogue
```

### What is confidential

| Data | CDR usage | Unlock path |
|---|---|---|
| Secret story epilogue (panel 6) | Encrypted vault content, `tokenGate` read condition | 5/5 panels played + Game NFT held + wallet decrypt |
| Wordle answer (mode = `wordle`) | Encrypted vault content, `open` read condition | Client decrypt during gameplay (answer never sent in plaintext from the server) |

### Conditions actually used (SDK 0.2.1)

| Factory | Where | Why |
|---|---|---|
| `ownerOnly` | All writes | Only the platform key can mutate vaults |
| `tokenGate` | Secret epilogue reads | Holder of the chain-specific GameNFT can decrypt |
| `open` | Wordle answer reads | Public puzzle — confidentiality is "no plaintext on the wire", not access control |

The chain-specific NFT contract is picked at vault-write time from `writerCoinId` via [`getMintConfig`](file:///Users/udingethe/Dev/writersarcade/lib/writerCoins.ts), so a game paid for in MUSD on Mezo vaults against the Mezo GameNFT, and a game paid in writer-coin on Base vaults against the Base GameNFT. One CDR pipeline, multiple destination chains.

---

## Why CDR Matters Here

Without CDR, the secret panel is just hidden app data — any backend admin can read it. With CDR, the creative payload is encrypted into a Story-Aeneid vault and **only becomes readable when the player satisfies the read condition**.

This is a **product-native confidentiality use case**: the private content is not an abstract file upload — it is the hidden ending of a generated, mintable game that judges can actually play in 3 minutes.

---

## Code Map (for judges)

| File | What it does |
|---|---|
| [`domains/story/services/cdr.service.ts`](file:///Users/udingethe/Dev/writersarcade/domains/story/services/cdr.service.ts) | Browser CDR client + backend-proxy helpers (`vaultSystemPrompt`, `vaultWordleAnswer`, `readVaultData`) |
| [`apps/writersarcade-api/src/cdr-vault.js`](file:///Users/udingethe/Dev/writersarcade/apps/writersarcade-api/src/cdr-vault.js) | PM2-backed vaulting service — singleton CDR client, lazy WASM init, circuit breaker, `ownerOnly` write + `open`/`tokenGate` read |
| [`app/api/games/generate/route.ts`](file:///Users/udingethe/Dev/writersarcade/app/api/games/generate/route.ts) | Generates the game, then `after()` writes the secret panel into a CDR vault in background |
| [`app/api/games/[slug]/secret-panel/route.ts`](file:///Users/udingethe/Dev/writersarcade/app/api/games/%5Bslug%5D/secret-panel/route.ts) | Server policy: 5-panel completion + exact-`tokenId` NFT ownership check before exposing vault UUID |
| [`app/api/games/[slug]/answer/route.ts`](file:///Users/udingethe/Dev/writersarcade/app/api/games/%5Bslug%5D/answer/route.ts) | Wordle answer vault gate |
| [`domains/games/components/secret-panel.tsx`](file:///Users/udingethe/Dev/writersarcade/domains/games/components/secret-panel.tsx) | The visible CDR UX — lock state, decryption step indicator, post-unlock access-policy panel with copyable vault UUID / NFT contract |

---

## Engineering Notes

- **Lazy WASM** — the 5.5 MB CDR Emscripten bundle is dynamically imported only when a user clicks Unlock. The initial game page bundle is unaffected.
- **PM2 backend vaulting** — vaulting moved to a persistent Node process (`snel-bot:3800`) because Vercel serverless cold-starts cannot afford a 5.5 MB WASM init plus an on-chain tx wait per request. The Next.js routes proxy to it via `API_BACKEND_URL`.
- **Singleton CDR client** — backend keeps one `CDRClient` per process; WASM is initialized once.
- **Circuit breaker** — 5 consecutive CDR failures open a 30 s breaker so a Story-side outage can't pin every Vercel function.
- **`uploadCDR` (on-chain) instead of IPFS** — vault payloads are small (a JSON epilogue or a Wordle answer), so on-chain storage gives stronger availability with no IPFS dependency.
- **`next.config.js` patches `node:` URI handling** so the Emscripten loader compiles inside the client chunk.
- **Generic CDR error surface** — the client maps any read-condition rejection to a clear "the vault's read condition was not satisfied" message rather than leaking SDK internals.

---

## Honest Limitations / Future Work

- The 5-panel completion check is currently enforced in the Next.js gate route, not inside a CDR read-condition contract. A future iteration deploys a **custom Story-Aeneid completion-attestation condition** (`conditions.custom(...)`) so the CDR validators themselves enforce "completed + NFT-owned" without trusting the application server.
- Cross-chain NFT ownership (Base / Mezo) is verified by the application and would, in a fully trustless version, be replaced with a Story-side bridge attestation or zk proof.
- Pre-upgrade legacy games may be vaulted against the default Base GameNFT contract; the demo path above generates a fresh game so chain + condition + minted NFT all line up.

---

## Track Fit

### Best CDR Application

| Criterion | How we meet it |
|---|---|
| Quality and polish | Live, ships 54 static pages, ships cover art + secret panel, decryption UX shows step-by-step progress |
| Real-world usability | Real Paragraph articles → real playable comic games → real on-chain mint → real CDR vault |
| End-to-end UX someone would use twice | Generate, play, mint, unlock — all from the homepage in a single session |
| CDR is product-native | The private content is the ending of the game itself, not an abstract upload |

### Technical Implementation

| Criterion | How we meet it |
|---|---|
| Multi-step access | Vault read requires **5/5 panel completion + exact-tokenId NFT ownership + wallet signature on Story Aeneid** |
| Composable vault systems | Vault read condition references a real ERC-721 deployed on Base or Mezo; chain selection is dynamic per-game via `writerCoinId` → `getMintConfig` |
| Smart-contract enforced access | `tokenGate(LICENSE_READ_CONDITION_ADDR, GameNFT, minBalance=1)` — decryption is gated by the CDR validator network, not by our server |
| Programmable permissions | Different games use different NFT contracts and different chains for the same vault pipeline |
| Custom WASM/serverless trade-offs handled correctly | Lazy WASM, singleton platform client, on-chain `uploadCDR`, circuit breaker |

---

## Demo Script (for the video)

1. Open homepage, show the dual-ecosystem toggle.
2. Paste a Paragraph article URL, pay, generate.
3. Land on the game page. Highlight the **"Vaulted via CDR"** badge.
4. Click Unlock with 0 panels played — show the denial.
5. Play all 5 panels.
6. Mint the NFT.
7. Click Unlock again — narrate the live progress steps as they render.
8. Show the **access-policy block** after decryption: condition type, gate NFT, token ID, chain, panel count, vault UUID. Copy the vault UUID to clipboard on camera.
9. Cut to [`cdr-vault.js`](file:///Users/udingethe/Dev/writersarcade/apps/writersarcade-api/src/cdr-vault.js) — show `conditions.tokenGate(...)` and `conditions.ownerOnly(...)` calls.
10. Close with: "The secret panel isn't hidden — it's encrypted into a Story CDR vault that the player's wallet decrypts on Aeneid."

---

## Repo Structure

- `app/` — Next.js 16 app router
- `apps/writersarcade-api/` — PM2 backend (CDR vaulting + NFT-ownership verification)
- `domains/story/` — Story Protocol SDK + CDR SDK integration
- `domains/games/` — Game generation, gameplay, secret-panel UI
- `contracts/` — Foundry contracts (GameNFT, payment splitters)

---

*Built for the Story CDR Hackathon, May 27 – June 5, 2026.*
