import { createPublicClient, http, type WalletClient, type Transport, type Chain, type Account } from "viem";
import { CDRClient, initWasm } from "@piplabs/cdr-sdk";
import { STORY_CHAIN_ID, STORY_RPC_URL } from "./story-sdk-client";

const STORY_CHAIN = {
  id: STORY_CHAIN_ID,
  name: 'Story Aeneid',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [STORY_RPC_URL] } },
} as const;

// Story-API REST endpoint for DKG state (NOT the EVM RPC).
// NEXT_PUBLIC_ prefix ensures the browser bundle can read this value at runtime.
export const CDR_REST_URL =
  process.env.NEXT_PUBLIC_CDR_API_URL ||
  process.env.CDR_API_URL ||
  "";

export function ensureCdrUrl(): void {
  if (!CDR_REST_URL) {
    throw new Error(
      "CDR REST URL is not configured. Set NEXT_PUBLIC_CDR_API_URL or CDR_API_URL."
    );
  }
}

// === WASM Initialization (client-side) ===

let wasmInitialized = false;

export async function ensureWasmInitialized(): Promise<boolean> {
  if (wasmInitialized) return true;
  try {
    await initWasm();
    wasmInitialized = true;
    return true;
  } catch (err) {
    console.error('CDR WASM initialization failed:', err);
    return false;
  }
}

export async function createUserCdrClient(walletClient: WalletClient<Transport, Chain, Account>): Promise<CDRClient | null> {
  const wasmReady = await ensureWasmInitialized();
  if (!wasmReady) {
    console.warn('CDR WASM not available — decryption not possible');
    return null;
  }

  const publicClient = createPublicClient({ chain: STORY_CHAIN, transport: http(STORY_RPC_URL) });

  return new CDRClient({
    network: "testnet",
    publicClient,
    walletClient,
    apiUrl: CDR_REST_URL,
  });
}

// === Read Vault Data (client-side, uses user's wallet for decryption) ===

export async function readVaultData(
  client: CDRClient,
  uuid: string | number | bigint
): Promise<string | null> {
  try {
    // accessCDR: reads data stored on-chain via uploadCDR.
    // Returns the decrypted dataKey (which IS our plaintext payload).
    // The SDK types uuid as number; cast to satisfy TS.
    const { dataKey } = await client.consumer.accessCDR({
      uuid: Number(uuid),
      accessAuxData: "0x",
    });
    return new TextDecoder().decode(dataKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Failed to read vault data:', msg)
    // Surface CDR-specific errors so callers can distinguish protocol
    // failures (read-condition rejection) from generic network errors.
    // Kept generic so it stays correct across condition types
    // (tokenGate, custom, merkle, ownerOnly).
    if (msg.includes('token') || msg.includes('gate') || msg.includes('condition') || msg.includes('access')) {
      throw new Error(`CDR access denied — the vault's read condition was not satisfied. (${msg})`)
    }
    return null
  }
}

// === Backend Proxy Vault Operations ===
// Vaulting happens on the persistent PM2 backend (snel-bot) instead of Vercel
// serverless, avoiding 5.5 MB WASM cold starts and timeout risks.
//
// Uses API_BACKEND_URL (includes /writersarcade prefix) to match the nginx
// reverse proxy config, consistent with /api/generate-image and other
// Hetzner-proxied routes in next.config.js rewrites.

const CDR_BACKEND_BASE =
  process.env.CDR_BACKEND_URL ||
  process.env.API_BACKEND_URL ||
  'https://api.snel.famile.xyz/writersarcade';

/**
 * Proxy a vault operation to the backend server.
 * The backend has STORY_PLATFORM_PRIVATE_KEY, persistent WASM, and CDR SDK.
 */
export async function vaultViaBackend(
  data: string,
  options: { readCondition: 'open' | 'tokenGate'; nftContract?: string } = { readCondition: 'open' }
): Promise<string> {
  const url = `${CDR_BACKEND_BASE}/api/cdr/vault`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data,
      readCondition: options.readCondition,
      nftContract: options.nftContract,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error || `CDR vault request failed (HTTP ${response.status})`);
  }

  const result = await response.json();
  return result.uuid;
}

/**
 * Vault a Wordle answer via the backend proxy.
 * The answer is never stored in plaintext — the vault UUID is the only reference.
 */
export async function vaultWordleAnswer(answer: string): Promise<string> {
  return vaultViaBackend(answer, { readCondition: 'open' });
}

/**
 * Vault a secret panel (system prompt) with NFT-gated read access via the backend proxy.
 * Only holders of the GameNFT can decrypt and view the prompt.
 */
export async function vaultSystemPrompt(
  prompt: string,
  gameNftAddress?: `0x${string}`
): Promise<string> {
  return vaultViaBackend(prompt, {
    readCondition: 'tokenGate',
    nftContract: gameNftAddress || '0x778C87dAA2b284982765688AE22832AADae7dccC',
  });
}
