import { StoryClient } from "@story-protocol/core-sdk";
import { toHex, Address } from "viem";

/**
 * Story Protocol Service
 * 
 * Handles IP registration, royalty configuration, and NFT linking for WritArcade games.
 * Connects to Story Protocol to register games as intellectual property assets.
 */

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
}

export interface IPRegistrationResult {
  storyIPAssetId: string;
  txHash: string;
  registeredAt: number;
  royaltyConfig: {
    authorShare: number; // 60%
    creatorShare: number; // 30%
    platformShare: number; // 10%
  };
}

export interface RoyaltyToken {
  recipientAddress: Address;
  share: number; // Basis points (6000 = 60%)
  name: string; // "Author", "Creator", "Platform"
}

/**
 * Initialize Story Protocol client
 * Requires: STORY_RPC_URL and STORY_WALLET_KEY in environment
 */
export async function initializeStoryClient() {
  const rpcUrl = process.env.STORY_RPC_URL;
  const privateKey = process.env.STORY_WALLET_KEY;

  if (!rpcUrl) {
    throw new Error("STORY_RPC_URL environment variable is required");
  }

  if (!privateKey) {
    throw new Error("STORY_WALLET_KEY environment variable is required");
  }

  const client = StoryClient.newClient({
    transport: rpcUrl,
    account: privateKey,
  });

  return client;
}

/**
 * Register a game as an IP Asset on Story Protocol
 * 
 * This creates a new IP Asset and configures royalty distribution:
 * - Author: 60% of royalties
 * - Game Creator (user): 30% of royalties
 * - Platform (WritArcade): 10% of royalties
 */
export async function registerGameAsIP(
  input: IPRegistrationInput
): Promise<IPRegistrationResult> {
  try {
    const client = await initializeStoryClient();

    // 1. Register IP Asset on Story
    const ipMetadata = {
      title: input.title,
      description: input.description,
      uri: input.gameMetadataUri,
      attributes: [
        { key: "articleUrl", value: input.articleUrl },
        { key: "genre", value: input.genre },
        { key: "difficulty", value: input.difficulty },
        { key: "author", value: input.authorParagraphUsername },
        { key: "gameCreator", value: input.gameCreatorAddress },
      ],
    };

    // Register as nonfungible IP
    const response = await client.ipAsset.registerNonFungibleIP({
      nftContractAddress: process.env.NEXT_PUBLIC_GAME_NFT_ADDRESS as Address,
      nftTokenId: toHex(0), // Token ID will be set when minting
      ipMetadata: ipMetadata,
      txOptions: { waitForTransaction: true },
    });

    const storyIPAssetId = response.ipAssetId || response.txHash;

    // 2. Configure royalties
    const royaltyConfig = buildRoyaltyConfig(
      input.authorWalletAddress,
      input.gameCreatorAddress
    );

    // Set up royalty tokens using Story's royalty token contract
    await configureRoyalties(client, storyIPAssetId, royaltyConfig);

    return {
      storyIPAssetId,
      txHash: response.txHash,
      registeredAt: Math.floor(Date.now() / 1000),
      royaltyConfig: {
        authorShare: 6000, // 60%
        creatorShare: 3000, // 30%
        platformShare: 1000, // 10%
      },
    };
  } catch (error) {
    console.error("Error registering IP on Story Protocol:", error);
    throw new Error(
      `IP registration failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Link an IP Asset to its Base NFT token after minting
 * This creates the connection between Story IP and Base NFT
 */
export async function linkIPAssetToNFT(
  storyIPAssetId: string,
  baseNFTTokenId: number,
  baseNFTContractAddress: Address
): Promise<{ txHash: string; linkedAt: number }> {
  try {
    const client = await initializeStoryClient();

    // Link IP to NFT contract
    const response = await client.ipAsset.linkIPToNFT({
      ipAssetId: storyIPAssetId,
      nftContractAddress: baseNFTContractAddress,
      nftTokenId: toHex(baseNFTTokenId),
      txOptions: { waitForTransaction: true },
    });

    return {
      txHash: response.txHash,
      linkedAt: Math.floor(Date.now() / 1000),
    };
  } catch (error) {
    console.error("Error linking IP to NFT:", error);
    throw new Error(
      `IP-to-NFT link failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Build royalty configuration for game IP
 * Returns array of royalty recipients and their shares
 */
function buildRoyaltyConfig(
  authorAddress: Address,
  creatorAddress: Address
): RoyaltyToken[] {
  const platformAddress = (process.env.NEXT_PUBLIC_WRITARCADE_TREASURY ||
    process.env.NEXT_PUBLIC_GAME_NFT_ADDRESS) as Address;

  return [
    {
      recipientAddress: authorAddress,
      share: 6000, // 60%
      name: "Author",
    },
    {
      recipientAddress: creatorAddress,
      share: 3000, // 30%
      name: "Creator",
    },
    {
      recipientAddress: platformAddress,
      share: 1000, // 10%
      name: "Platform",
    },
  ];
}

/**
 * Configure royalties for an IP Asset
 * Creates Royalty Tokens that can be traded/staked
 */
async function configureRoyalties(
  client: any,
  storyIPAssetId: string,
  royaltyConfig: RoyaltyToken[]
): Promise<void> {
  try {
    // Register royalty tokens for each recipient
    for (const recipient of royaltyConfig) {
      await client.royalty.setRoyalties({
        ipAssetId: storyIPAssetId,
        royalties: [
          {
            recipientAddress: recipient.recipientAddress,
            share: recipient.share,
          },
        ],
        txOptions: { waitForTransaction: true },
      });
    }
  } catch (error) {
    console.error("Error configuring royalties:", error);
    // Non-fatal: Continue even if royalty setup fails
    // Can be retried later
  }
}

/**
 * Retrieve IP Asset details from Story Protocol
 */
export async function getIPAssetDetails(storyIPAssetId: string) {
  try {
    const client = await initializeStoryClient();

    const asset = await client.ipAsset.getIpAsset({
      ipAssetId: storyIPAssetId,
    });

    return asset;
  } catch (error) {
    console.error("Error retrieving IP asset:", error);
    throw new Error(
      `Failed to retrieve IP asset: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Get royalty distribution for an IP Asset
 */
export async function getRoyaltyDistribution(storyIPAssetId: string) {
  try {
    const client = await initializeStoryClient();

    const royalties = await client.royalty.getRoyalties({
      ipAssetId: storyIPAssetId,
    });

    return royalties;
  } catch (error) {
    console.error("Error retrieving royalties:", error);
    throw new Error(
      `Failed to retrieve royalties: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Get all IP Assets created by a user/creator
 */
export async function getCreatorIPAssets(creatorAddress: Address) {
  try {
    const client = await initializeStoryClient();

    const assets = await client.ipAsset.getIPAssetsWithWhere({
      where: {
        creator: creatorAddress,
      },
    });

    return assets;
  } catch (error) {
    console.error("Error retrieving creator IP assets:", error);
    throw new Error(
      `Failed to retrieve IP assets: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Calculate royalty payment to an address for IP Asset sales
 * Used for secondary market transactions
 */
export function calculateRoyaltyPayment(
  totalPrice: bigint,
  recipientShare: number // Basis points (6000 = 60%)
): bigint {
  return (totalPrice * BigInt(recipientShare)) / BigInt(10000);
}
