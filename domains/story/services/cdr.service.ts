import { createPublicClient, http, type WalletClient, type Transport, type Chain, type Account } from "viem";
import { CDRClient, initWasm } from "@piplabs/cdr-sdk";
import { STORY_CHAIN_ID, STORY_RPC_URL } from "./story-sdk-client";

const STORY_CHAIN = {
  id: STORY_CHAIN_ID,
  name: 'Story Aeneid',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [STORY_RPC_URL] } },
} as const;

// Story-API REST endpoint for DKG state (NOT the EVM RPC)
export const CDR_REST_URL = process.env.CDR_API_URL || "http://172.192.41.96:1317";

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
  uuid: number
): Promise<string | null> {
  try {
    // accessCDR: reads data stored on-chain via uploadCDR.
    // Returns the decrypted dataKey (which IS our plaintext payload).
    const { dataKey } = await client.consumer.accessCDR({
      uuid,
      accessAuxData: "0x",
    });
    return new TextDecoder().decode(dataKey);
  } catch (err) {
    console.error('Failed to read vault data:', err);
    return null;
  }
}

// === Backend Proxy Vault Operations ===
// Vaulting happens on the persistent PM2 backend (snel-bot) instead of Vercel
// serverless, avoiding 5.5 MB WASM cold starts and timeout risks.

function getBackendUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.API_BACKEND_URL || 'https://api.snel.famile.xyz/writersarcade';
  }
  return '/api/cdr/vault';
}

/**
 * Proxy a vault operation to the backend server.
 * The backend has STORY_PLATFORM_PRIVATE_KEY, persistent WASM, and CDR SDK.
 */
export async function vaultViaBackend(
  data: string,
  options: { readCondition: 'open' | 'tokenGate'; nftContract?: string } = { readCondition: 'open' }
): Promise<string> {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}/api/cdr/vault`;

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
