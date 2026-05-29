import { createPublicClient, createWalletClient, http, type Address, type WalletClient, type Transport, type Chain, type Account } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CDRClient, initWasm, GatewayProvider, conditions } from "@piplabs/cdr-sdk";
import { STORY_CHAIN_ID, STORY_RPC_URL } from "./story-sdk-client";

const STORY_CHAIN = {
  id: STORY_CHAIN_ID,
  name: 'Story Aeneid',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [STORY_RPC_URL] } },
} as const;

export const CDR_API_URL = "https://aeneid.storyrpc.io/api";

// Condition Contract Addresses (Aeneid Testnet)
const OWNER_WRITE_CONDITION_ADDR = "0x4C9bFC96d7092b590D497A191826C3dA2277c34B" as const;
const LICENSE_READ_CONDITION_ADDR = "0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3" as const;

// === Circuit Breaker ===

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
};

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 30_000;

function isCdrReady(): boolean {
  if (!circuitBreaker.isOpen) return true;
  if (Date.now() - circuitBreaker.lastFailure > CIRCUIT_BREAKER_TIMEOUT) {
    circuitBreaker.isOpen = false;
    circuitBreaker.failures = 0;
    return true;
  }
  return false;
}

function recordFailure(): void {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();
  if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.isOpen = true;
  }
}

function recordSuccess(): void {
  circuitBreaker.failures = 0;
  circuitBreaker.isOpen = false;
}

// === WASM Initialization ===

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

// === Platform Client Singleton ===

let platformCdrClient: CDRClient | null = null;
let platformAccount: Address | null = null;

const ipfsStorage = new GatewayProvider({
  apiUrl: process.env.IPFS_API_URL || 'https://api.pinata.cloud',
  gatewayUrl: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs',
});

export async function createPlatformCdrClient(): Promise<{ client: CDRClient; account: Address }> {
  if (platformCdrClient && platformAccount) {
    return { client: platformCdrClient, account: platformAccount };
  }

  const privateKey = process.env.STORY_PLATFORM_PRIVATE_KEY as `0x${string}` | undefined;
  if (!privateKey) {
    throw new Error('STORY_PLATFORM_PRIVATE_KEY is not configured');
  }

  const wasmReady = await ensureWasmInitialized();
  if (!wasmReady) {
    throw new Error('CDR WASM module failed to initialize');
  }

  const account = privateKeyToAccount(privateKey);
  platformAccount = account.address;

  const transport = http(STORY_RPC_URL);
  const publicClient = createPublicClient({ chain: STORY_CHAIN, transport });
  const walletClient = createWalletClient({ account, chain: STORY_CHAIN, transport });

  platformCdrClient = new CDRClient({
    network: "testnet",
    publicClient,
    walletClient,
    apiUrl: CDR_API_URL,
  });

  return { client: platformCdrClient, account: platformAccount };
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
    apiUrl: CDR_API_URL,
  });
}

// === Vault Operations ===

async function runWithCircuitBreaker<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!isCdrReady()) {
    throw new Error(`CDR circuit breaker is open — ${label} unavailable`);
  }
  try {
    const result = await fn();
    recordSuccess();
    return result;
  } catch (err) {
    recordFailure();
    throw err;
  }
}

async function vaultData(
  client: CDRClient,
  data: string | Buffer,
  writeCondition: { address: `0x${string}`; conditionData: `0x${string}` },
  readCondition: { address: `0x${string}`; conditionData: `0x${string}` },
): Promise<number> {
  const content = typeof data === 'string' ? new TextEncoder().encode(data) : data;

  return runWithCircuitBreaker('uploadFile', () =>
    client.uploader.uploadFile({
      content,
      storageProvider: ipfsStorage,
      updatable: false,
      writeConditionAddr: writeCondition.address,
      readConditionAddr: readCondition.address,
      writeConditionData: writeCondition.conditionData,
      readConditionData: readCondition.conditionData,
      accessAuxData: "0x",
    }).then(r => r.uuid)
  );
}

export async function readVaultData(
  client: CDRClient,
  uuid: number
): Promise<string | null> {
  return runWithCircuitBreaker('downloadFile', async () => {
    try {
      const { content } = await client.consumer.downloadFile({
        uuid,
        accessAuxData: "0x",
        storageProvider: ipfsStorage,
      });
      return new TextDecoder().decode(content);
    } catch (err) {
      console.error('Failed to read vault data:', err);
      return null;
    }
  });
}

/**
 * Vault a Wordle answer with an open read condition.
 * The answer is never stored in plaintext — the vault UUID is the only reference.
 * Provable fairness: vault creation is timestamped on-chain; even the platform
 * cannot see the answer before the player if we gate visibility through the game flow.
 */
export async function vaultWordleAnswer(
  answer: string
): Promise<string> {
  const { client, account } = await createPlatformCdrClient();
  const writeCondition = conditions.ownerOnly({
    address: OWNER_WRITE_CONDITION_ADDR,
    owner: account,
  });
  const readCondition = conditions.open({
    address: LICENSE_READ_CONDITION_ADDR,
  });
  const uuid = await vaultData(client, answer, writeCondition, readCondition);
  return uuid.toString();
}

/**
 * Vault a system prompt with NFT-gated read access.
 * Only holders of the GameNFT can decrypt and view the prompt.
 */
export async function vaultSystemPrompt(
  prompt: string,
  gameNftAddress?: `0x${string}`
): Promise<string> {
  const { client, account } = await createPlatformCdrClient();
  const writeCondition = conditions.ownerOnly({
    address: OWNER_WRITE_CONDITION_ADDR,
    owner: account,
  });
  const readCondition = conditions.tokenGate({
    address: LICENSE_READ_CONDITION_ADDR,
    token: gameNftAddress || '0x778C87dAA2b284982765688AE22832AADae7dccC',
    minBalance: 1n,
  });
  const uuid = await vaultData(client, prompt, writeCondition, readCondition);
  return uuid.toString();
}
