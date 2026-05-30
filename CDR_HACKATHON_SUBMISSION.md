# WritersArcade — CDR Hackathon Submission

**Track:** Confidential Data Rails by Story Protocol
**Live demo:** https://writersarcade.vercel.app/
**Demo video:** [Link to your Loom/YouTube video]

---

## What We Built

WritersArcade turns articles into interactive 5-panel comic games, then stores the hidden post-game epilogue in a Story CDR vault. The secret panel is confidential until a player satisfies both product and ownership conditions:

1. Complete the full 5-panel playthrough.
2. Own the minted Game NFT.
3. Decrypt the CDR vault through the wallet-backed client flow.

This turns the game ending into confidential, ownable IP instead of ordinary app-gated content.

## CDR Integration

```
Article or prompt
  -> AI game generation
  -> AI secret epilogue generation
  -> Story CDR encrypted vault
  -> token-gated read condition against the Game NFT contract
  -> player completes all 5 story panels
  -> app verifies exact NFT token ownership
  -> wallet decrypts CDR vault client-side
```

### What Is Confidential

| Data | CDR usage | Unlock path |
|------|-----------|-------------|
| Secret story epilogue | Stored as encrypted CDR vault content | Completed playthrough + Game NFT ownership |
| Article-derived Wordle answer | Stored as CDR vault content, never persisted as plaintext | Client decrypt path for gameplay |

### Secret Panel Policy

The secret panel is the main CDR demo path:

- The vault UUID is stored in the game record as `promptVaultUuid`.
- The CDR read condition is `tokenGate(...)`.
- The token address is selected from the game payment type via `writerCoinId`, so Mezo/MUSD games and Base writer-coin games can point at the correct Game NFT contract.
- The unlock endpoint verifies the requester owns the exact minted `nftTokenId`.
- The unlock endpoint also verifies the session has 5 assistant story panels before allowing the browser to attempt CDR decryption.
- The UI displays the satisfied access policy after unlock: condition type, NFT contract, token ID, chain ID, and completed panel count.

## Why CDR Matters Here

Without CDR, the secret panel is just hidden app data. With CDR, the valuable creative payload is encrypted into a vault and only becomes readable after the player proves the right relationship to the game object.

This is a product-native confidentiality use case: the private content is not an abstract file upload; it is the hidden ending of a generated, mintable game.

## Demo Script

1. Generate a new story game from a Paragraph article or prompt.
2. Open the game page and show the “Vaulted via CDR” secret panel badge.
3. Try to unlock before completing the story; show the completion gate.
4. Play all 5 story panels.
5. Mint the game as an NFT.
6. Unlock the secret panel with the NFT-owning wallet.
7. Show the revealed epilogue and the CDR access policy block.
8. Call out the vault UUID and token-gated read condition in the UI/API response.

## Demo Data Guidance

Use a freshly generated game for judging. Games created before the CDR token-gate upgrade may have secret panels vaulted against the default Game NFT contract rather than the writer-coin-specific NFT contract.

For the final demo, generate a new game after this commit so the CDR vault condition, game payment type, minted NFT contract, and visible access policy all line up.

## Technical Notes

- CDR SDK is lazy-loaded in the browser only when a player unlocks or decrypts vaulted data.
- The heavy CDR/WASM graph is code-split away from the initial game page bundle.
- **Vaulting moved to the persistent PM2 backend** (`snel-bot:3800`) to avoid Vercel serverless cold-start costs (5.5 MB WASM + EVM tx waits).
- Backend uses `uploadCDR()` for on-chain storage (no IPFS dependency for small payloads).
- Backend has `STORY_PLATFORM_PRIVATE_KEY` configured; WASM initializes lazily on first vault request.
- Webpack `node:` URI handling is patched in `next.config.js` so the CDR Emscripten loader can compile in the client chunk.
- Production build renders all 54 static pages successfully.

## Current Limitations

- Wordle is currently a secondary CDR proof point. Its answer is vaulted, but the strongest judging narrative is the secret panel flow because it combines CDR, NFT ownership, and gameplay completion.
- Existing pre-upgrade games should be treated as legacy demo data unless re-vaulted.
