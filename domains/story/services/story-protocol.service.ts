/**
 * Story Protocol Service (Client-Side)
 *
 * Handles IP registration for writersarcade games and assets.
 * ALL operations use the user's wallet - THEY sign transactions.
 *
 * SDK Reference: https://docs.story.foundation/sdk-reference/overview
 */

import { Address } from "viem";
import { StoryClient, PILFlavor } from "@story-protocol/core-sdk";
import type { IpMetadata } from "@story-protocol/core-sdk";
import { computeMetadataHash, uploadToIPFS } from "./ipfs-utils";
import {
  STORY_SPG_CONTRACT,
  STORY_RPC_URL,
  STORY_CHAIN_ID,
  WIP_TOKEN_ADDRESS,
  ROYALTY_POLICY_LAP,
  LICENSE_TERMS_ID_NON_COMMERCIAL,
  LICENSE_TERMS_ID_COMMERCIAL_REMIX,
  getIPAssetExplorerUrl,
  getTxExplorerUrl,
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
  gameMetadataUri: string;
  nftMetadataUri: string;
  parentIpIds?: string[];
  licenseTermsId?: bigint;
  platformAddress?: Address;
  mintLicenseTokens?: boolean;
  licenseTokenReceiver?: Address;
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
  platformAddress?: Address;
  authorWalletAddress?: Address;
}

export interface TransactionRetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: TransactionRetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

// ============================================================================
// IPA Metadata Standard Helpers
// ============================================================================

function buildIPMetadata(input: IPRegistrationInput): IpMetadata {
  return {
    title: input.title,
    description: input.description,
    createdAt: String(Math.floor(Date.now() / 1000)),
    image: input.gameMetadataUri,
    mediaUrl: input.articleUrl,
    mediaType: "text/html",
    creators: [
      {
        name: input.authorParagraphUsername,
        address: input.authorWalletAddress,
        contributionPercent: 100,
      },
    ],
    tags: ["writersarcade", input.genre, "game"],
    ipType: "Game",
    attributes: [
      { key: "GameCreator", value: input.gameCreatorAddress },
      { key: "Genre", value: input.genre },
      { key: "Difficulty", value: input.difficulty },
      { key: "Platform", value: "writersarcade" },
    ],
  };
}

function buildAssetIPMetadata(input: AssetIPRegistrationInput): IpMetadata {
  return {
    title: input.title,
    description: input.description,
    createdAt: String(Math.floor(Date.now() / 1000)),
    creators: [
      {
        name: input.creatorAddress,
        address: input.creatorAddress,
        contributionPercent: 100,
      },
    ],
    tags: ["writersarcade", input.genre, ...input.tags],
    ipType: input.type.charAt(0).toUpperCase() + input.type.slice(1),
    attributes: [
      { key: "Type", value: input.type },
      { key: "Genre", value: input.genre },
      { key: "Creator", value: input.creatorAddress },
      { key: "Platform", value: "writersarcade" },
    ],
  };
}

function buildNFTMetadata(input: IPRegistrationInput): Record<string, unknown> {
  return {
    name: input.title,
    description: input.description,
    image: input.gameMetadataUri,
    external_url: input.articleUrl,
    attributes: [
      { trait_type: "Genre", value: input.genre },
      { trait_type: "Difficulty", value: input.difficulty },
      { trait_type: "Author", value: input.authorParagraphUsername },
    ],
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

async function estimateGasForRegistration(
  walletAddress: Address,
  spgNftContract: Address
): Promise<{ estimatedGas: bigint; enoughFunds: boolean; costInEth?: string } | null> {
  try {
    const { createPublicClient, http, formatEther } = await import("viem");

    const publicClient = createPublicClient({
      chain: { id: STORY_CHAIN_ID, name: "Story Protocol", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [STORY_RPC_URL] } } },
      transport: http(STORY_RPC_URL),
    });

    const baseEstimatedGas = await publicClient.estimateContractGas({
      address: spgNftContract,
      abi: [
        {
          name: "mint",
          type: "function",
          inputs: [],
          outputs: [],
          stateMutability: "payable"
        }
      ],
      functionName: "mint" as any,
      args: [] as any,
    });

    const GAS_BUFFER_PERCENT = 15n;
    const estimatedGas = (baseEstimatedGas * (100n + GAS_BUFFER_PERCENT)) / 100n;
    const gasPrice = await publicClient.getGasPrice();
    const totalCost = estimatedGas * gasPrice;
    const balance = await publicClient.getBalance({ address: walletAddress });
    const enoughFunds = balance >= totalCost;
    const costInEth = formatEther(totalCost);

    return { estimatedGas, enoughFunds, costInEth };
  } catch (error) {
    console.warn(`   Could not estimate gas:`, error);
    return null;
  }
}

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
    if (message.includes('chain')) {
      return 'Network error. Please switch to Story Network and try again.';
    }
    return `Transaction failed: ${error.message}`;
  }
  return 'An unexpected error occurred. Please try again.';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAvailableLicenseTerms(
  client: StoryClient
): Promise<{ id: bigint; terms: Record<string, unknown> }[]> {
  const knownIds = [
    { id: LICENSE_TERMS_ID_NON_COMMERCIAL, name: "Non-Commercial Social Remixing" },
    { id: LICENSE_TERMS_ID_COMMERCIAL_REMIX, name: "Commercial Remix" },
  ];

  const results: { id: bigint; terms: Record<string, unknown> }[] = [];
  for (const { id, name } of knownIds) {
    try {
      const terms = await client.license.getLicenseTerms(id);
      results.push({ id, terms: { ...terms.terms, name } });
    } catch {
      results.push({ id, terms: { name, flavor: id === LICENSE_TERMS_ID_NON_COMMERCIAL ? "non-commercial-social-remixing" : "commercial-remix" } });
    }
  }
  return results;
}

function findCommercialRemixTermsId(availableTerms: { id: bigint; terms: Record<string, unknown> }[]): bigint {
  const remixTerms = availableTerms.find(
    (t) => String(t.terms?.name ?? "").toLowerCase().includes("commercial remix") ||
         String(t.terms?.flavor ?? "").includes("commercial-remix")
  );
  return remixTerms?.id || LICENSE_TERMS_ID_COMMERCIAL_REMIX;
}

// ============================================================================
// Core Registration Functions (Client-Side - User Signs)
// ============================================================================

export async function registerGameAsIP(
  client: StoryClient,
  input: IPRegistrationInput,
  retryConfig: Partial<TransactionRetryConfig> = {}
): Promise<IPRegistrationResult> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

  console.log(`📝 Registering game IP: ${input.title}`);

  // 1. Build IPA Metadata Standard-compliant IP metadata
  const ipMetadata = buildIPMetadata(input);
  const nftMetadata = buildNFTMetadata(input);

  // 2. Upload both metadata objects to IPFS
  const ipMetadataUri = input.gameMetadataUri || await uploadToIPFS(ipMetadata);
  const nftMetadataUri = input.nftMetadataUri || await uploadToIPFS(nftMetadata);

  // 3. Compute hashes for integrity verification
  const ipMetadataHash = computeMetadataHash(ipMetadata) as `0x${string}`;
  const nftMetadataHash = computeMetadataHash(nftMetadata) as `0x${string}`;

  // 4. Get license terms
  const availableTerms = await getAvailableLicenseTerms(client);
  const licenseTermsId = input.licenseTermsId || findCommercialRemixTermsId(availableTerms);

  // 5. Compute royalty token shares (60% author, 20% creator, 20% platform)
  const royaltyShares = [
    { recipient: input.authorWalletAddress, percentage: 60 },
    { recipient: input.gameCreatorAddress, percentage: 20 },
  ];
  if (input.platformAddress) {
    royaltyShares.push({ recipient: input.platformAddress, percentage: 20 });
  } else {
    royaltyShares[1].percentage += 20;
  }

  // 6. Register IP with license terms and royalty shares — single transaction
  let lastError: unknown;
  let response: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      response = await client.ipAsset.registerIpAsset({
        nft: { type: "mint", spgNftContract: STORY_SPG_CONTRACT },
        ipMetadata: {
          ipMetadataURI: ipMetadataUri,
          ipMetadataHash,
          nftMetadataURI: nftMetadataUri,
          nftMetadataHash,
        },
        licenseTermsData: [
          {
            terms: PILFlavor.commercialRemix({
              defaultMintingFee: 0n,
              commercialRevShare: 10,
              currency: WIP_TOKEN_ADDRESS,
              royaltyPolicy: ROYALTY_POLICY_LAP,
            }),
          },
        ],
        royaltyShares,
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
  const licenseTermsIds = (response.licenseTermsIds as bigint[]) || [licenseTermsId];

  console.log(`✅ Game IP registered: ${ipId} (tx: ${txHash})`);

  // 7. Mint license tokens as tradeable ERC-721s (if requested)
  if (input.mintLicenseTokens && response.ipId) {
    const receiver = input.licenseTokenReceiver || input.gameCreatorAddress;
    try {
      const licenseResponse = await client.license.mintLicenseTokens({
        licensorIpId: response.ipId as `0x${string}`,
        licenseTermsId: licenseTermsIds[0] || licenseTermsId,
        receiver,
        amount: 1,
      });
      console.log(`🎫 License token minted: ${licenseResponse.txHash}`);
    } catch (mintError) {
      console.warn(`⚠️ License token minting failed (non-critical):`, mintError);
    }
  }

  // 8. Wait for confirmation
  let blockNumber = 0;
  try {
    const { createPublicClient, http } = await import("viem");
    const publicClient = createPublicClient({
      chain: { id: STORY_CHAIN_ID, name: "Story Protocol", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [STORY_RPC_URL] } } },
      transport: http(STORY_RPC_URL),
    });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
      timeout: 60000,
    });
    blockNumber = Number(receipt.blockNumber);
  } catch {
    // Non-fatal
  }

  // 7. Register as derivative if parent assets provided
  if (input.parentIpIds?.length) {
    for (const parentId of input.parentIpIds) {
      try {
        await client.ipAsset.registerDerivativeIpAsset({
          nft: { type: "minted", nftContract: STORY_SPG_CONTRACT, tokenId: BigInt(ipId) },
          derivData: {
            parentIpIds: [parentId as `0x${string}`],
            licenseTermsIds: [licenseTermsId],
          },
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

export async function registerAssetAsIP(
  client: StoryClient,
  input: AssetIPRegistrationInput,
  retryConfig: Partial<TransactionRetryConfig> = {}
): Promise<IPRegistrationResult> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

  console.log(`📝 Registering asset IP: ${input.title} (${input.type})`);

  const ipMetadata = buildAssetIPMetadata(input);
  const ipMetadataUri = input.metadataUri || await uploadToIPFS(ipMetadata);
  const ipMetadataHash = computeMetadataHash(ipMetadata) as `0x${string}`;

  const nftMetadata = { name: input.title, description: input.description, image: input.metadataUri };
  const nftMetadataUri = await uploadToIPFS(nftMetadata);
  const nftMetadataHash = computeMetadataHash(nftMetadata) as `0x${string}`;

  const availableTerms = await getAvailableLicenseTerms(client);
  const licenseTermsId = findCommercialRemixTermsId(availableTerms);

  const royaltyShares = [{ recipient: input.creatorAddress, percentage: 100 }];

  let lastError: unknown;
  let response: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      response = await client.ipAsset.registerIpAsset({
        nft: { type: "mint", spgNftContract: STORY_SPG_CONTRACT },
        ipMetadata: {
          ipMetadataURI: ipMetadataUri,
          ipMetadataHash,
          nftMetadataURI: nftMetadataUri,
          nftMetadataHash,
        },
        licenseTermsData: [
          {
            terms: PILFlavor.commercialRemix({
              defaultMintingFee: 0n,
              commercialRevShare: 10,
              currency: WIP_TOKEN_ADDRESS,
              royaltyPolicy: ROYALTY_POLICY_LAP,
            }),
          },
        ],
        royaltyShares,
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
        await sleep(delayMs);
      }
    }
  }

  if (!response?.ipId) {
    throw new Error(parseTransactionError(lastError));
  }

  const ipId = response.ipId as string;
  const txHash = response.txHash as string;
  const licenseTermsIds = (response.licenseTermsIds as bigint[]) || [licenseTermsId];

  console.log(`✅ Asset IP registered: ${ipId} (tx: ${txHash})`);

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
// Utility Exports
// ============================================================================

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

    const IP_ASSET_REGISTRY = "0x77319B4031e6eF1250907aa00018B8B1c67a244b";

    const ipAssetRegistryAbi = [
      {
        name: "ownerOf",
        type: "function",
        inputs: [{ name: "tokenId", type: "uint256" }],
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view"
      },
      {
        name: "totalSupply",
        type: "function",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view"
      }
    ] as const;

    try {
      const tokenId = BigInt(ipId.startsWith("0x") ? ipId : `0x${ipId}`);
      const owner = await publicClient.readContract({
        address: IP_ASSET_REGISTRY,
        abi: ipAssetRegistryAbi,
        functionName: "ownerOf",
        args: [tokenId],
      });

      return { verified: true, owner: owner as string };
    } catch {
      if (txHash) {
        try {
          const receipt = await publicClient.getTransactionReceipt({
            hash: txHash as `0x${string}`,
          });
          if (receipt.status === 'success') {
            return { verified: true };
          }
          return { verified: false, error: 'Transaction failed on-chain' };
        } catch {
          return { verified: false, error: 'Could not verify transaction' };
        }
      }
      return { verified: false, error: 'Could not verify IP on-chain' };
    }
  } catch (error) {
    return { verified: false, error: error instanceof Error ? error.message : 'Verification failed' };
  }
}

export {
  STORY_SPG_CONTRACT,
  getIPAssetExplorerUrl,
  getTxExplorerUrl,
  WIP_TOKEN_ADDRESS,
  ROYALTY_POLICY_LAP,
} from "./story-sdk-client";

export { PILFlavor } from "@story-protocol/core-sdk";

export async function estimateGas(
  walletAddress: Address,
  spgNftContract: Address = STORY_SPG_CONTRACT
): Promise<{ estimatedGas: bigint; enoughFunds: boolean; costInEth?: string } | null> {
  return estimateGasForRegistration(walletAddress, spgNftContract);
}
