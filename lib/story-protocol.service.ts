/**
 * Story Protocol Service (Client-Side)
 *
 * Handles IP registration for writersarcade games and assets.
 * ALL operations use the user's wallet - THEY sign transactions.
 * 
 * This is the single source of truth for Story Protocol interactions.
 * 
 * SDK Reference: https://docs.story.foundation/sdk-reference/overview
 */

import { Address } from "viem";
import { StoryClient, IpMetadata } from "@story-protocol/core-sdk";
import { computeMetadataHash } from "./ipfs-utils";
import {
  STORY_SPG_CONTRACT,
  STORY_RPC_URL,
  getIPAssetExplorerUrl,
  getTxExplorerUrl,
  STORY_CHAIN_ID,
  createStoryClientFromWallet,
  isStoryClientReady,
} from "./story-sdk-client";

// ============================================================================
// Types
// ============================================================================

export interface IPRegistrationInput {
  title: string;
  description: string;
  articleUrl: string;
  gameCreatorAddress: Address;
  authorParagraphUsername: string;
  authorWalletAddress: Address;
  genre: "horror" | "comedy" | "mystery";
  difficulty: "easy" | "hard";
  gameMetadataUri: string; // IPFS URI pointing to full game JSON
  nftMetadataUri: string; // IPFS URI pointing to NFT metadata
  parentIpIds?: string[]; // Optional: Assets this game is derived from
}

export interface IPRegistrationResult {
  ipId: string;
  txHash: string;
  registeredAt: number;
  explorerUrl: string;
  txExplorerUrl: string;
  licenseTermsIds: bigint[];
  blockNumber?: number;
  gasUsed?: bigint;
}

export interface AssetIPRegistrationInput {
  title: string;
  description: string;
  type: "character" | "mechanic" | "plot" | "world" | "dialog";
  genre: string;
  tags: string[];
  creatorAddress: Address;
  metadataUri: string;
}

export interface TransactionRetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

// Default retry config: 3 retries with exponential backoff
const DEFAULT_RETRY_CONFIG: TransactionRetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Estimate gas for a transaction before signing
 * Helps users know if they have enough ETH
 */
async function estimateGasForRegistration(
  walletAddress: Address,
  spgNftContract: Address
): Promise<{ estimatedGas: bigint; enoughFunds: boolean; costInEth?: string } | null> {
  try {
    const { createPublicClient, http, formatEther, parseEther } = await import("viem");
    
    const publicClient = createPublicClient({
      chain: { id: STORY_CHAIN_ID, name: "Story Protocol", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [STORY_RPC_URL] } } },
      transport: http(STORY_RPC_URL),
    });

    // Try to estimate gas - this may not work for all contracts
    const estimatedGas = await publicClient.estimateContractGas({
      address: spgNftContract,
      abi: [
        {
          name: "mintAndRegisterIp",
          type: "function",
          inputs: [],
          outputs: [],
          stateMutability: "payable"
        }
      ],
      functionName: "mintAndRegisterIp" as any,
      args: [] as any,
    });

    // Get current gas price
    const gasPrice = await publicClient.getGasPrice();
    
    // Estimate total cost
    const totalCost = estimatedGas * gasPrice;
    
    // Get user's balance
    const balance = await publicClient.getBalance({ address: walletAddress });
    
    const enoughFunds = balance >= totalCost;
    const costInEth = formatEther(totalCost);
    
    console.log(`   Gas estimation: ~${costInEth} ETH (${estimatedGas} gas units)`);
    
    return { estimatedGas, enoughFunds, costInEth };
  } catch (error) {
    console.warn(`   Could not estimate gas:`, error);
    return null;
  }
}

/**
 * Parse transaction error and return user-friendly message
 */
function parseTransactionError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('user rejected') || message.includes('user denied')) {
      return 'Transaction was rejected. Please approve the transaction in your wallet.';
    }
    if (message.includes('insufficient funds') || message.includes('gas')) {
      return 'Insufficient funds for gas. Please ensure you have enough ETH for the transaction.';
    }
    if (message.includes('nonce')) {
      return 'Transaction nonce error. Please try again.';
    }
    if (message.includes('链条') || message.includes('chain')) {
      return 'Network error. Please switch to Story Network and try again.';
    }
    return `Transaction failed: ${error.message}`;
  }
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get available license terms from the protocol
 * Returns array of available terms with their IDs
 * 
 * Note: In production, this would query the protocol directly.
 * For now, we use known default terms with fallback.
 */
async function getAvailableLicenseTerms(
  client: StoryClient
): Promise<{ id: bigint; terms: any }[]> {
  try {
    // In the current SDK version, license terms are queried differently
    // For production, you'd query the license template contract directly
    // For now, return the known default PIL Commercial Remix terms
    const knownTerms = [
      { id: 1n, terms: { flavor: 'non-commercial-social-remixing', name: 'Non-Commercial Social Remixing' } },
      { id: 2n, terms: { flavor: 'commercial-remix', name: 'Commercial Remix' } },
      { id: 3n, terms: { flavor: 'commercial-use', name: 'Commercial Use' } },
    ];
    
    console.log(`   Available license terms: ${knownTerms.length}`);
    return knownTerms;
  } catch (error) {
    console.warn('Could not fetch license terms, using defaults:', error);
    // Fallback to known terms
    return [
      { id: 1n, terms: { flavor: 'non-commercial-social-remixing' } },
      { id: 2n, terms: { flavor: 'commercial-remix' } },
    ];
  }
}

/**
 * Find the Commercial Remix license terms ID
 */
function findCommercialRemixTermsId(availableTerms: { id: bigint; terms: any }[]): bigint {
  // Look for commercial-remix in the terms
  const remixTerms = availableTerms.find(
    (t) => t.terms?.flavor === 'commercial-remix' || t.terms?.name?.toLowerCase().includes('commercial remix')
  );
  
  // Default to ID 2 for commercial remix if found, otherwise 1
  return remixTerms?.id || 2n;
}

// ============================================================================
// Core Registration Functions (Client-Side - User Signs)
// ============================================================================

/**
 * Register a game as an IP Asset on Story Protocol
 * 
 * USER FLOW:
 * 1. User is on Story Aeneid Testnet (via chain switch)
 * 2. User clicks "Register IP"
 * 3. Wallet prompts for signature
 * 4. Transaction sent from USER'S wallet
 * 5. IP registered with USER as owner
 * 
 * @param client - StoryClient created from user's wallet
 * @param input - Game metadata for IP registration
 * @param retryConfig - Optional retry configuration
 */
export async function registerGameAsIP(
  client: StoryClient,
  input: IPRegistrationInput,
  retryConfig: Partial<TransactionRetryConfig> = {}
): Promise<IPRegistrationResult> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  
  console.log(`📝 Registering game IP: ${input.title}`);
  console.log(`   Creator: ${input.gameCreatorAddress}`);
  console.log(`   Metadata: ${input.nftMetadataUri}`);

  // 1. Generate IP metadata with attribution
  const ipMetadata: IpMetadata = client.ipAsset.generateIpMetadata({
    title: input.title,
    description: input.description,
    watermarkImg: input.gameMetadataUri,
    attributes: [
      { key: "GameCreator", value: input.gameCreatorAddress },
      { key: "Author", value: input.authorParagraphUsername },
      { key: "AuthorWallet", value: input.authorWalletAddress },
      { key: "Genre", value: input.genre },
      { key: "Difficulty", value: input.difficulty },
      { key: "ArticleURL", value: input.articleUrl },
      { key: "Platform", value: "writersarcade" },
      { key: "ParentAssets", value: input.parentIpIds?.join(",") || "None" },
    ],
  });

  // 2. Compute metadata hashes for integrity
  const ipMetadataHash = computeMetadataHash(ipMetadata);
  const nftMetadataHash = computeMetadataHash({
    name: input.title,
    description: input.description,
  });

  // 3. Get available license terms dynamically
  const availableTerms = await getAvailableLicenseTerms(client);
  const licenseTermsId = findCommercialRemixTermsId(availableTerms);
  console.log(`   Using license terms ID: ${licenseTermsId}`);

  // 4. Mint and register IP with retry logic - USER SIGNS THIS TRANSACTION
  let lastError: unknown;
  let response: any;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      response = await client.ipAsset.mintAndRegisterIp({
        spgNftContract: STORY_SPG_CONTRACT,
        ipMetadata: {
          ipMetadataURI: input.nftMetadataUri,
          ipMetadataHash: ipMetadataHash as `0x${string}`,
          nftMetadataURI: input.nftMetadataUri,
          nftMetadataHash: nftMetadataHash as `0x${string}`,
        },
      });
      
      // Success - break out of retry loop
      break;
    } catch (error) {
      lastError = error;
      const errorMessage = parseTransactionError(error);
      
      // Don't retry on user rejection
      if (errorMessage.includes('rejected')) {
        throw new Error(errorMessage);
      }
      
      // Don't retry on insufficient funds
      if (errorMessage.includes('Insufficient funds')) {
        throw new Error(errorMessage);
      }
      
      if (attempt < config.maxRetries) {
        const delayMs = Math.min(
          config.baseDelayMs * Math.pow(2, attempt),
          config.maxDelayMs
        );
        console.log(`   ⚠️ Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);
        await sleep(delayMs);
      }
    }
  }
  
  // If we exhausted retries, throw the last error
  if (!response?.ipId) {
    const errorMessage = parseTransactionError(lastError);
    console.error(`   ❌ Registration failed after ${config.maxRetries + 1} attempts`);
    throw new Error(errorMessage);
  }

  const ipId = response.ipId as string;
  const txHash = response.txHash as string;

  console.log(`✅ Game IP registered: ${ipId}`);
  console.log(`   Transaction: ${txHash}`);

  // 5. Attach license terms (allow derivatives with royalties)
  let licenseTermsIds: bigint[] = [];
  try {
    await client.license.attachLicenseTerms({
      ipId: ipId as `0x${string}`,
      licenseTermsId, // Use dynamically determined license terms
    });
    licenseTermsIds = [licenseTermsId];
    console.log(`✅ License terms attached (PIL Commercial Remix)`);
  } catch (licenseError) {
    console.warn(`⚠️ Could not attach license terms:`, licenseError);
    // Non-fatal - IP is still registered
  }

  // 6. Wait for transaction confirmation with polling
  let blockNumber = 0;
  try {
    const { createPublicClient, http } = await import("viem");
    const publicClient = createPublicClient({
      chain: { id: STORY_CHAIN_ID, name: "Story Protocol", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [STORY_RPC_URL] } } },
      transport: http(STORY_RPC_URL),
    });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
      timeout: 60000, // 60 second timeout
    });
    blockNumber = Number(receipt.blockNumber);
    console.log(`✅ Transaction confirmed in block ${blockNumber}`);
  } catch (waitError) {
    console.warn(`⚠️ Transaction confirmation wait failed (non-critical):`, waitError);
    // Non-fatal - IP is still registered, just don't have block number
  }

  // 6. Register as derivative if parent assets provided
  if (input.parentIpIds?.length) {
    console.log(`🔗 Linking to ${input.parentIpIds.length} parent asset(s)...`);
    for (const parentId of input.parentIpIds) {
      try {
        await client.ipAsset.registerDerivative({
          childIpId: ipId as `0x${string}`,
          parentIpIds: [parentId as `0x${string}`],
          licenseTermsIds: [1n],
        });
        console.log(`   ✅ Linked to parent: ${parentId}`);
      } catch (linkError) {
        console.warn(`   ⚠️ Failed to link to ${parentId}:`, linkError);
      }
    }
  }

  return {
    ipId,
    txHash,
    registeredAt: Math.floor(Date.now() / 1000),
    explorerUrl: getIPAssetExplorerUrl(ipId),
    txExplorerUrl: getTxExplorerUrl(txHash),
    licenseTermsIds,
    blockNumber,
  };
}

/**
 * Register a standalone asset as IP
 * Used for marketplace assets (characters, mechanics, etc.)
 */
export async function registerAssetAsIP(
  client: StoryClient,
  input: AssetIPRegistrationInput,
  retryConfig: Partial<TransactionRetryConfig> = {}
): Promise<IPRegistrationResult> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  
  console.log(`📝 Registering asset IP: ${input.title} (${input.type})`);

  const ipMetadata: IpMetadata = client.ipAsset.generateIpMetadata({
    title: input.title,
    description: input.description,
    attributes: [
      { key: "Type", value: input.type },
      { key: "Genre", value: input.genre },
      { key: "Tags", value: input.tags.join(",") },
      { key: "Creator", value: input.creatorAddress },
      { key: "Platform", value: "writersarcade" },
    ],
  });

  const ipMetadataHash = computeMetadataHash(ipMetadata);
  const nftMetadataHash = computeMetadataHash({
    name: input.title,
    description: input.description,
  });

  // Get available license terms dynamically
  const availableTerms = await getAvailableLicenseTerms(client);
  const licenseTermsId = findCommercialRemixTermsId(availableTerms);

  // Execute transaction with retry logic - USER SIGNS THIS TRANSACTION
  let lastError: unknown;
  let response: any;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      response = await client.ipAsset.mintAndRegisterIp({
        spgNftContract: STORY_SPG_CONTRACT,
        ipMetadata: {
          ipMetadataURI: input.metadataUri,
          ipMetadataHash: ipMetadataHash as `0x${string}`,
          nftMetadataURI: input.metadataUri,
          nftMetadataHash: nftMetadataHash as `0x${string}`,
        },
      });
      break;
    } catch (error) {
      lastError = error;
      const errorMessage = parseTransactionError(error);
      
      if (errorMessage.includes('rejected') || errorMessage.includes('Insufficient funds')) {
        throw new Error(errorMessage);
      }
      
      if (attempt < config.maxRetries) {
        const delayMs = Math.min(config.baseDelayMs * Math.pow(2, attempt), config.maxDelayMs);
        console.log(`   ⚠️ Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);
        await sleep(delayMs);
      }
    }
  }
  
  if (!response?.ipId) {
    const errorMessage = parseTransactionError(lastError);
    throw new Error(errorMessage);
  }

  const ipId = response.ipId as string;
  const txHash = response.txHash as string;

  console.log(`✅ Asset IP registered: ${ipId}`);

  // Attach commercial remix license for derivatives
  let licenseTermsIds: bigint[] = [];
  try {
    await client.license.attachLicenseTerms({
      ipId: ipId as `0x${string}`,
      licenseTermsId,
    });
    licenseTermsIds = [licenseTermsId];
  } catch (error) {
    console.warn(`⚠️ License attachment skipped:`, error);
  }

  return {
    ipId,
    txHash,
    registeredAt: Math.floor(Date.now() / 1000),
    explorerUrl: getIPAssetExplorerUrl(ipId),
    txExplorerUrl: getTxExplorerUrl(txHash),
    licenseTermsIds,
  };
}

// ============================================================================
// Royalty & Revenue Functions
// ============================================================================

/**
 * Claim royalties from derivative works
 * IP owners can claim revenue generated by derivatives of their IP
 */
export async function claimRoyalties(
  client: StoryClient,
  ancestorIpId: string,
  claimer: Address,
  childIpIds: string[],
  royaltyPolicies: Address[],
  currencyTokens: Address[]
): Promise<{ txHash: string; claimedAt: number }> {
  console.log(`💰 Claiming royalties for IP ${ancestorIpId}`);

  const response = await client.royalty.claimAllRevenue({
    ancestorIpId: ancestorIpId as `0x${string}`,
    claimer: claimer as `0x${string}`,
    childIpIds: childIpIds.map((id) => id as `0x${string}`),
    royaltyPolicies: royaltyPolicies.map((p) => p as `0x${string}`),
    currencyTokens: currencyTokens.map((t) => t as `0x${string}`),
  });

  const txHash = Array.isArray(response.txHashes)
    ? response.txHashes[0]
    : response.txHashes;

  console.log(`✅ Royalties claimed: ${txHash}`);

  return {
    txHash: txHash as string,
    claimedAt: Math.floor(Date.now() / 1000),
  };
}

// ============================================================================
// License Functions
// ============================================================================

/**
 * Mint license tokens for an IP
 * Required for others to create derivatives
 */
export async function mintLicenseTokens(
  client: StoryClient,
  licensorIpId: string,
  licenseTermsId: bigint,
  receiver: Address,
  amount: number = 1
): Promise<{ txHash: string; licenseTokenIds: bigint[] }> {
  console.log(`🎫 Minting ${amount} license token(s) for IP ${licensorIpId}`);

  const response = await client.license.mintLicenseTokens({
    licensorIpId: licensorIpId as `0x${string}`,
    licenseTermsId,
    receiver: receiver,
    amount: BigInt(amount),
  });

  console.log(`✅ License tokens minted: ${response.txHash}`);

  return {
    txHash: response.txHash as string,
    licenseTokenIds: response.licenseTokenIds || [],
  };
}

// ============================================================================
// Utility Exports
// ============================================================================

/**
 * Verify IP was actually registered on-chain
 * Performs read-after-write to ensure registration succeeded
 */
export async function verifyIPRegistration(
  ipId: string,
  txHash?: string
): Promise<{ verified: boolean; owner?: string; metadataUri?: string; error?: string }> {
  try {
    const { http, createPublicClient } = await import("viem");
    
    const publicClient = createPublicClient({
      chain: { 
        id: STORY_CHAIN_ID, 
        name: "Story Protocol", 
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, 
        rpcUrls: { default: { http: [STORY_RPC_URL] } } 
      },
      transport: http(STORY_RPC_URL),
    });

    // IP Asset Registry ABI (simplified for verification)
    const ipAssetRegistryAbi = [
      {
        name: "ipAssetRegistry",
        type: "function",
        inputs: [{ name: "ipId", type: "address" }],
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "view"
      },
      {
        name: "ownerOf",
        type: "function", 
        inputs: [{ name: "tokenId", type: "uint256" }],
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view"
      }
    ] as const;

    // Convert IP ID to token ID format (IP ID is address, need to convert)
    // IP ID format: 0x + 40 hex chars (same as address)
    const ipIdAddress = ipId.startsWith('0x') ? ipId : `0x${ipId}`;

    try {
      // Try to read owner - if IP doesn't exist, this will revert
      // IP ID on Story Protocol is actually a token ID (bigint), not an address
      const ipIdBigInt = BigInt(ipIdAddress);
      
      const owner = await publicClient.readContract({
        address: STORY_SPG_CONTRACT,
        abi: ipAssetRegistryAbi,
        functionName: "ownerOf",
        args: [ipIdBigInt],
      });

      console.log(`✅ IP ${ipId} verified on-chain (owner: ${owner})`);
      return { verified: true, owner: owner as string };
    } catch (readError) {
      // If read fails, check if we have a transaction hash to verify
      if (txHash) {
        try {
          const receipt = await publicClient.getTransactionReceipt({
            hash: txHash as `0x${string}`,
          });
          
          if (receipt.status === 'success') {
            console.log(`✅ IP ${ipId} verified via transaction receipt (block: ${receipt.blockNumber})`);
            return { verified: true };
          } else {
            console.warn(`⚠️ Transaction ${txHash} failed`);
            return { verified: false, error: 'Transaction failed on-chain' };
          }
        } catch (txError) {
          console.warn(`⚠️ Could not verify transaction ${txHash}:`, txError);
          return { verified: false, error: 'Could not verify transaction' };
        }
      }
      
      // No txHash provided and contract read failed
      console.warn(`⚠️ Could not verify IP ${ipId}: contract read failed`);
      return { verified: false, error: 'Could not verify IP on-chain' };
    }
  } catch (error) {
    console.error(`❌ IP verification failed for ${ipId}:`, error);
    return { verified: false, error: error instanceof Error ? error.message : 'Verification failed' };
  }
}

export {
  STORY_SPG_CONTRACT,
  getIPAssetExplorerUrl,
  getTxExplorerUrl
} from "./story-sdk-client";

export { PILFlavor } from "@story-protocol/core-sdk";

/**
 * Estimate gas for IP registration
 * Useful for pre-flight checks before user confirms
 */
export async function estimateGas(
  walletAddress: Address,
  spgNftContract: Address = STORY_SPG_CONTRACT
): Promise<{ estimatedGas: bigint; enoughFunds: boolean; costInEth?: string } | null> {
  return estimateGasForRegistration(walletAddress, spgNftContract);
}
