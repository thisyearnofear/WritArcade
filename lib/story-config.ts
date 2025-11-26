/**
 * Story Protocol Configuration
 * 
 * Defines network settings, contract addresses, and RPC endpoints for Story Protocol integration.
 * Supports both testnet and mainnet.
 */

export type StoryNetwork = "testnet" | "mainnet";

export interface StoryNetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  explorer: string;
  storyContractRegistry: string;
  storyTokenAddress: string;
}

export const STORY_NETWORKS: Record<StoryNetwork, StoryNetworkConfig> = {
  testnet: {
    name: "Story Protocol Testnet",
    rpcUrl: "https://testnet-rpc.story.foundation",
    chainId: 1516, // Story testnet chain ID
    explorer: "https://testnet-explorer.story.foundation",
    storyContractRegistry: "0x1234567890123456789012345678901234567890", // Replace with actual
    storyTokenAddress: "0x0987654321098765432109876543210987654321", // Replace with actual
  },
  mainnet: {
    name: "Story Protocol Mainnet",
    rpcUrl: "https://mainnet-rpc.story.foundation",
    chainId: 1514, // Story mainnet chain ID
    explorer: "https://explorer.story.foundation",
    storyContractRegistry: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", // Replace with actual
    storyTokenAddress: "0xfedcbafedcbafedcbafedcbafedcbafedcbafed", // Replace with actual
  },
};

/**
 * Get the current Story network configuration
 * Determined by STORY_NETWORK environment variable (default: testnet)
 */
export function getStoryNetwork(): StoryNetworkConfig {
  const network = (process.env.STORY_NETWORK || "testnet") as StoryNetwork;
  return STORY_NETWORKS[network];
}

/**
 * Story Protocol Core Contracts
 * These are deployed on Story Protocol and handle IP operations
 */
export const STORY_CORE_CONTRACTS = {
  IPAssetRegistry: {
    description: "Registers and manages IP assets",
    functions: ["registerNonFungibleIP", "getIPAsset", "transferIP"],
  },
  RoyaltyTokenContract: {
    description: "Mints and manages royalty tokens for IP assets",
    functions: ["mint", "burn", "transfer", "setRoyalties"],
  },
  LicenseRegistry: {
    description: "Manages IP licenses and usage rights",
    functions: ["grantLicense", "revokeLicense", "getLicenseTerms"],
  },
  DisputeResolver: {
    description: "Handles IP infringement disputes",
    functions: ["raiseDispute", "resolveDispute", "enforceResolution"],
  },
};

/**
 * WritArcade Integration Settings for Story
 */
export const WRITARCADE_STORY_CONFIG = {
  // Default royalty splits (in basis points)
  royaltyShares: {
    author: 6000, // 60% - Article author (Paragraph writer)
    creator: 3000, // 30% - Game creator (WritArcade user)
    platform: 1000, // 10% - WritArcade platform
  },

  // Game metadata included in IP registration
  gameMetadataFields: [
    "title",
    "description",
    "articleUrl",
    "genre",
    "difficulty",
    "gameContent",
    "authorParagraphUsername",
    "generatedAt",
    "generatedBy",
  ],

  // Supported game genres (must match WritArcade's genre selector)
  supportedGenres: ["horror", "comedy", "mystery"],

  // Supported difficulty levels
  supportedDifficulties: ["easy", "hard"],

  // IPFS gateway for storing game metadata
  ipfsGateway: process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud",

  // Story IP Asset registration timeout (ms)
  registrationTimeout: 120000, // 2 minutes

  // Enable IP registration (can be disabled for testing)
  enabled: process.env.STORY_IP_REGISTRATION_ENABLED !== "false",
};

/**
 * Get recommended gas settings for Story Protocol transactions
 */
export function getGasSettings() {
  return {
    gasLimit: 300000n, // Typical for IP registration
    maxFeePerGas: 100n, // gwei (adjust based on network)
    maxPriorityFeePerGas: 2n, // gwei
  };
}

/**
 * Validate Story Protocol configuration
 * Called at startup to ensure environment is properly configured
 */
export function validateStoryConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check environment variables
  if (!process.env.STORY_RPC_URL && !process.env.STORY_NETWORK) {
    errors.push(
      "Either STORY_RPC_URL or STORY_NETWORK must be configured"
    );
  }

  if (!process.env.STORY_WALLET_KEY) {
    errors.push(
      "STORY_WALLET_KEY environment variable is required for IP registration"
    );
  }

  // Check network is valid
  const network = process.env.STORY_NETWORK as StoryNetwork;
  if (network && !STORY_NETWORKS[network]) {
    errors.push(
      `Invalid STORY_NETWORK: ${network}. Must be 'testnet' or 'mainnet'`
    );
  }

  // Check contract addresses
  if (!process.env.NEXT_PUBLIC_GAME_NFT_ADDRESS) {
    errors.push(
      "NEXT_PUBLIC_GAME_NFT_ADDRESS (Base) is required for IP linking"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Log Story Protocol configuration (for debugging)
 * Masks sensitive values
 */
export function logStoryConfig() {
  const config = getStoryNetwork();
  const validation = validateStoryConfig();

  console.log("🔷 Story Protocol Configuration:");
  console.log(`  Network: ${config.name}`);
  console.log(`  Chain ID: ${config.chainId}`);
  console.log(`  RPC: ${config.rpcUrl.slice(0, 20)}...`);
  console.log(`  Explorer: ${config.explorer}`);
  console.log(`  IP Registration: ${WRITARCADE_STORY_CONFIG.enabled ? "✓ Enabled" : "✗ Disabled"}`);

  if (validation.isValid) {
    console.log("  ✓ Configuration valid");
  } else {
    console.log("  ✗ Configuration errors:");
    validation.errors.forEach((err) => console.log(`    - ${err}`));
  }
}
