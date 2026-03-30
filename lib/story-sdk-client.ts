/**
 * Story Protocol SDK Client (Client-Side)
 * 
 * Single source of truth for Story Protocol client initialization.
 * Uses user's connected wallet for all IP operations - THEY sign transactions.
 * 
 * SDK Reference: https://docs.story.foundation/sdk-reference/overview
 */

import { StoryClient } from "@story-protocol/core-sdk";
import { http } from "viem";
import type { WalletClient, Transport, Chain, Account } from "viem";

// Story Protocol Aeneid Testnet
export const STORY_CHAIN_ID = 1315;

// Story Protocol RPC URL
export const STORY_RPC_URL = "https://aeneid.storyrpc.io";

// Story Protocol Explorer
export const STORY_EXPLORER_URL = "https://aeneid.storyscan.xyz";

// SPG (Story Protocol Gateway) contract for fast minting
export const STORY_SPG_CONTRACT =
  (process.env.NEXT_PUBLIC_STORY_SPG_CONTRACT ||
    "0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc") as `0x${string}`;

/**
 * Circuit breaker state for RPC failures
 */
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

const CIRCUIT_BREAKER_THRESHOLD = 5; // Open after 5 failures
const CIRCUIT_BREAKER_TIMEOUT = 30000; // Try again after 30 seconds

/**
 * Check if circuit breaker is open
 */
export function isStoryClientReady(): boolean {
  if (!circuitBreaker.isOpen) return true;
  
  // Check if timeout has passed
  if (Date.now() - circuitBreaker.lastFailure > CIRCUIT_BREAKER_TIMEOUT) {
    console.log('[Story SDK] Circuit breaker resetting, attempting connection...');
    circuitBreaker.isOpen = false;
    circuitBreaker.failures = 0;
    return true;
  }
  
  console.warn('[Story SDK] Circuit breaker is open, RPC unavailable');
  return false;
}

/**
 * Record a failure for circuit breaker
 */
export function recordStoryClientFailure(): void {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();
  
  if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    console.error('[Story SDK] Circuit breaker opened due to repeated failures');
    circuitBreaker.isOpen = true;
  }
}

/**
 * Record a success for circuit breaker
 */
export function recordStoryClientSuccess(): void {
  circuitBreaker.failures = 0;
  circuitBreaker.isOpen = false;
}

/**
 * Create a Story Protocol client from user's wallet
 * 
 * This is the ONLY way to interact with Story Protocol in writersarcade.
 * The user's wallet signs all transactions = THEY own the IP.
 * 
 * @param walletClient - User's connected wallet from wagmi useWalletClient()
 * @returns StoryClient instance or null if wallet not on Story chain
 */
export function createStoryClientFromWallet(
  walletClient: WalletClient<Transport, Chain, Account>
): StoryClient | null {
  if (!walletClient) {
    console.warn("[Story SDK] No wallet client provided");
    return null;
  }

  // Check circuit breaker first
  if (!isStoryClientReady()) {
    console.warn("[Story SDK] Circuit breaker is open, RPC unavailable");
    return null;
  }

  // Verify user is on Story chain
  if (walletClient.chain?.id !== STORY_CHAIN_ID) {
    console.warn(
      `[Story SDK] Wallet on chain ${walletClient.chain?.id}, need ${STORY_CHAIN_ID} (Story)`
    );
    return null;
  }

  try {
    // Note: Story SDK requires http transport with their RPC
    // We still use the user's account for signing
    const client = StoryClient.newClient({
      account: walletClient.account,
      transport: http(STORY_RPC_URL),
    });

    console.log(`✓ Story SDK initialized for user wallet: ${walletClient.account.address}`);
    recordStoryClientSuccess();
    return client;
  } catch (error) {
    console.error("[Story SDK] Failed to initialize:", error);
    recordStoryClientFailure();
    return null;
  }
}

/**
 * Check if the user is on Story Protocol network
 */
export function isOnStoryNetwork(chainId: number | undefined): boolean {
  return chainId === STORY_CHAIN_ID;
}

/**
 * Get the Story Protocol explorer URL for an IP asset
 */
export function getIPAssetExplorerUrl(ipId: string): string {
  return `${STORY_EXPLORER_URL}/ipa/${ipId}`;
}

/**
 * Get the Story Protocol explorer URL for a transaction
 */
export function getTxExplorerUrl(txHash: string): string {
  return `${STORY_EXPLORER_URL}/tx/${txHash}`;
}
