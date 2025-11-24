/**
 * Smart Contract Configuration & ABIs
 * 
 * Defines contract addresses, ABIs, and helper functions for interacting
 * with WriterCoinPayment and GameNFT contracts on Base network.
 */

import { getWriterCoinById } from './writerCoins'

// Contract ABIs (simplified, use full ABI from contract compilation)
export const CONTRACT_ABIS = {
  WriterCoinPayment: [
    'function payForGameGeneration(address writerCoin, address user) external',
    'function payForMinting(address writerCoin, address user) external',
    'function isCoinWhitelisted(address coinAddress) external view returns (bool)',
    'function getCoinConfig(address coinAddress) external view returns (tuple(uint256, uint256, bool))',
    'function whitelistCoin(address coinAddress, uint256 gameGenerationCost, uint256 mintCost, address treasury, uint256 writerShare, uint256 platformShare, uint256 creatorPoolShare) external',
  ],
  GameNFT: [
    'function mintGame(address to, string memory tokenURI, tuple(string, address, address, string, string, uint256, string) memory metadata) external returns (uint256)',
    'function getGameMetadata(uint256 tokenId) external view returns (tuple(string, address, address, string, string, uint256, string))',
    'function getCreatorGames(address creator) external view returns (uint256[])',
    'function getTotalGamesMinted() external view returns (uint256)',
    'function tokenExists(uint256 tokenId) external view returns (bool)',
  ],
}

// Contract addresses by network
export const CONTRACT_ADDRESSES = {
  // Base Sepolia (testnet)
  baseSepolia: {
    WriterCoinPayment: process.env.NEXT_PUBLIC_WRITER_COIN_PAYMENT_SEPOLIA || '',
    GameNFT: process.env.NEXT_PUBLIC_GAME_NFT_SEPOLIA || '',
  },
  // Base Mainnet (production)
  baseMainnet: {
    WriterCoinPayment: process.env.NEXT_PUBLIC_WRITER_COIN_PAYMENT_MAINNET || '',
    GameNFT: process.env.NEXT_PUBLIC_GAME_NFT_MAINNET || '',
  },
}

// Network configuration
export const NETWORKS = {
  baseSepolia: {
    id: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
  },
  baseMainnet: {
    id: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
  },
}

/**
 * Get contract address for current network
 */
export function getContractAddress(
  contract: 'WriterCoinPayment' | 'GameNFT',
  network: 'baseSepolia' | 'baseMainnet' = 'baseSepolia'
): string {
  const address = CONTRACT_ADDRESSES[network][contract]
  if (!address) {
    throw new Error(`${contract} contract address not configured for ${network}`)
  }
  return address
}

/**
 * Get network configuration
 */
export function getNetwork(chainId: number) {
  if (chainId === 84532) return NETWORKS.baseSepolia
  if (chainId === 8453) return NETWORKS.baseMainnet
  throw new Error(`Unsupported chain ID: ${chainId}`)
}

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals)
  const wholePart = amount / divisor
  const fractionalPart = amount % divisor
  
  if (fractionalPart === 0n) {
    return wholePart.toString()
  }
  
  const paddedFractional = fractionalPart
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '')
  
  return `${wholePart}.${paddedFractional}`
}

/**
 * Parse token amount to bigint with decimals
 */
export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  const [wholePart, fractionalPart = ''] = amount.split('.')
  
  const fractional = fractionalPart
    .padEnd(decimals, '0')
    .slice(0, decimals)
  
  return BigInt(wholePart + fractional)
}

/**
 * Get game generation cost in tokens
 */
export function getGameGenerationCost(writerCoinId: string): bigint {
  const coin = getWriterCoinById(writerCoinId)
  if (!coin) {
    throw new Error(`Unknown writer coin: ${writerCoinId}`)
  }
  return coin.gameGenerationCost
}

/**
 * Get NFT minting cost in tokens
 */
export function getMintingCost(writerCoinId: string): bigint {
  const coin = getWriterCoinById(writerCoinId)
  if (!coin) {
    throw new Error(`Unknown writer coin: ${writerCoinId}`)
  }
  return coin.mintCost
}

/**
 * Calculate revenue split for game generation
 */
export function calculateGameRevenueSplit(amount: bigint, writerCoinId: string) {
  const coin = getWriterCoinById(writerCoinId)
  if (!coin) {
    throw new Error(`Unknown writer coin: ${writerCoinId}`)
  }
  
  const { writer, platform, creatorPool } = coin.revenueDistribution
  
  const writerShare = (amount * BigInt(writer)) / BigInt(100)
  const platformShare = (amount * BigInt(platform)) / BigInt(100)
  const creatorShare = (amount * BigInt(creatorPool)) / BigInt(100)
  
  return {
    writerShare,
    platformShare,
    creatorShare,
    total: writerShare + platformShare + creatorShare,
  }
}

/**
 * Calculate revenue split for NFT minting
 */
export function calculateMintRevenueSplit(amount: bigint) {
  const creatorShare = (amount * BigInt(30)) / BigInt(100)  // 30%
  const writerShare = (amount * BigInt(15)) / BigInt(100)   // 15%
  const platformShare = (amount * BigInt(5)) / BigInt(100)  // 5%
  const userShare = amount - creatorShare - writerShare - platformShare  // 50%
  
  return {
    creatorShare,
    writerShare,
    platformShare,
    userShare,
    total: amount,
  }
}

/**
 * Interface for contract interaction
 */
export interface GameMetadata {
  articleUrl: string
  creator: string  // wallet address
  writerCoin: string  // token contract address
  genre: 'horror' | 'comedy' | 'mystery'
  difficulty: 'easy' | 'hard'
  createdAt: number  // unix timestamp
  gameTitle: string
}

/**
 * Convert game data to on-chain format
 */
export function gameToMetadata(data: {
  articleUrl: string
  creator: string
  writerCoinId: string
  genre: string
  difficulty: string
  createdAt: Date
  gameTitle: string
}): GameMetadata {
  const coin = getWriterCoinById(data.writerCoinId)
  if (!coin) {
    throw new Error(`Unknown writer coin: ${data.writerCoinId}`)
  }
  
  return {
    articleUrl: data.articleUrl,
    creator: data.creator,
    writerCoin: coin.address,
    genre: data.genre as 'horror' | 'comedy' | 'mystery',
    difficulty: data.difficulty as 'easy' | 'hard',
    createdAt: Math.floor(data.createdAt.getTime() / 1000),
    gameTitle: data.gameTitle,
  }
}
