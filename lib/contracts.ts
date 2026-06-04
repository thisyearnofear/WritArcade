/**
 * Smart Contract Configuration & ABIs
 * 
 * Defines contract addresses, ABIs, and helper functions for interacting
 * with WriterCoinPayment and GameNFT contracts on Base network.
 */

import { encodeFunctionData, createPublicClient, http } from 'viem'
import { getWriterCoinById } from './writerCoins'

// Contract ABIs (simplified, use full ABI from contract compilation)
export const CONTRACT_ABIS = {
  // Minimal ABI objects for viem reads
  __WriterCoinPaymentRead: [{
    name: 'getRevenueDistribution',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'coinAddress', type: 'address' }],
    outputs: [
      { name: 'writerShare', type: 'uint256' },
      { name: 'platformShare', type: 'uint256' },
      { name: 'creatorPoolShare', type: 'uint256' }
    ]
  }, {
    name: 'mintDistributions',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'coinAddress', type: 'address' }],
    outputs: [
      { name: 'creatorShare', type: 'uint256' },
      { name: 'writerShare', type: 'uint256' },
      { name: 'platformShare', type: 'uint256' }
    ]
  }, {
    name: 'gameNFT',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  }, {
    name: 'getCoinConfig',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'coinAddress', type: 'address' }],
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'gameGenerationCost', type: 'uint256' },
        { name: 'mintCost', type: 'uint256' },
        { name: 'enabled', type: 'bool' },
      ],
    }]
  }] as const,
  WriterCoinPayment: [
    'function getRevenueDistribution(address coinAddress) external view returns (uint256 writerShare, uint256 platformShare, uint256 creatorPoolShare)',
    'function mintDistributions(address coinAddress) external view returns (uint256 creatorShare, uint256 writerShare, uint256 platformShare)',
    'function payForGameGeneration(address writerCoin) external',
    'function payAndMintGame(address writerCoin, string memory tokenURI, tuple(string, address, address, string, string, uint256, string) memory metadata) external returns (uint256)',
    'function isCoinWhitelisted(address coinAddress) external view returns (bool)',
    'function getCoinConfig(address coinAddress) external view returns (tuple(uint256, uint256, bool))',
    'function whitelistCoin(address coinAddress, uint256 gameGenerationCost, uint256 mintCost, address treasury, uint256 writerShare, uint256 platformShare, uint256 creatorPoolShare, uint256 mintWriterShare, uint256 mintPlatformShare, uint256 mintCreatorShare) external',
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

  if (fractionalPart === BigInt(0)) {
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

/** Create a viem public client for the given chain */
export function getDefaultChainId(): number {
  const envId = parseInt(process.env.NEXT_PUBLIC_GAME_NFT_CHAIN_ID || process.env.NEXT_PUBLIC_BASE_MAINNET_CHAIN_ID || process.env.NEXT_PUBLIC_BASE_SEPOLIA_CHAIN_ID || '8453', 10)
  return Number.isFinite(envId) ? envId : 8453
}

export function getPublicClient(chainId: number = getDefaultChainId()) {
  const net = getNetwork(chainId)
  const rpcUrlOverride = process.env.BASE_RPC_URL && chainId === 8453 ? process.env.BASE_RPC_URL : undefined
  const rpc = rpcUrlOverride || net.rpcUrl
  return createPublicClient({ chain: { id: net.id, name: net.name, nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [rpc] } } } as import('viem').Chain, transport: http(rpc) })
}

export function getWriterCoinPaymentAddress(chainId: number = getDefaultChainId()): `0x${string}` {
  const network = chainId === 8453 ? 'baseMainnet' : 'baseSepolia'
  return CONTRACT_ADDRESSES[network].WriterCoinPayment as `0x${string}`
}

const __splitCache = new Map<string, { at: number; data: unknown }>()
const __SPLIT_TTL_MS = 60_000

function __getCache(key: string) {
  const hit = __splitCache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > __SPLIT_TTL_MS) { __splitCache.delete(key); return null }
  return hit.data
}
function __setCache<T>(key: string, data: T) { __splitCache.set(key, { at: Date.now(), data }) }

async function readWithRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 250): Promise<T> {
  try { return await fn() } catch (e) {
    if (retries <= 0) throw e
    await new Promise(r => setTimeout(r, delayMs))
    return readWithRetry(fn, retries - 1, delayMs * 2)
  }
}

export async function fetchGenerationDistributionOnChain(coinAddress: `0x${string}`, chainId: number = getDefaultChainId()) {
  const cacheKey = `gen:${chainId}:${coinAddress}`
  const cached = __getCache(cacheKey)
  if (cached) return cached
  const client = getPublicClient(chainId)
  const contractAddress = getWriterCoinPaymentAddress(chainId)
  const tuple = await readWithRetry(() => client.readContract({
    address: contractAddress,
    abi: CONTRACT_ABIS.__WriterCoinPaymentRead,
    functionName: 'getRevenueDistribution',
    args: [coinAddress],
  })) as unknown as [bigint, bigint, bigint];
  const [writerShare, platformShare, creatorPoolShare] = tuple;
  const res = {
    writerBP: Number(writerShare),
    platformBP: Number(platformShare),
    creatorBP: Number(creatorPoolShare),
  };
  __setCache(cacheKey, res);
  return res;
}

export async function fetchMintDistributionOnChain(coinAddress: `0x${string}`, chainId: number = getDefaultChainId()) {
  const cacheKey = `mint:${chainId}:${coinAddress}`
  const cached = __getCache(cacheKey)
  if (cached) return cached
  const client = getPublicClient(chainId)
  const contractAddress = getWriterCoinPaymentAddress(chainId)
  const tuple = await readWithRetry(() => client.readContract({
    address: contractAddress,
    abi: CONTRACT_ABIS.__WriterCoinPaymentRead,
    functionName: 'mintDistributions',
    args: [coinAddress],
  })) as unknown as [bigint, bigint, bigint]
  const [creatorShare, writerShare, platformShare] = tuple
  const res = {
    creatorBP: Number(creatorShare),
    writerBP: Number(writerShare),
    platformBP: Number(platformShare),
  }
  __setCache(cacheKey, res)
  return res
}

export async function fetchConfiguredGameNFT(chainId: number = getDefaultChainId()): Promise<`0x${string}`> {
  const cacheKey = `gameNFT:${chainId}`
  const cached = __getCache(cacheKey)
  if (cached) return cached as `0x${string}`

  const client = getPublicClient(chainId)
  const contractAddress = getWriterCoinPaymentAddress(chainId)
  const address = await readWithRetry(() => client.readContract({
    address: contractAddress,
    abi: CONTRACT_ABIS.__WriterCoinPaymentRead,
    functionName: 'gameNFT',
  })) as `0x${string}`

  __setCache(cacheKey, address)
  return address
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
export async function fetchCoinConfigOnChain(coinAddress: `0x${string}`, chainId: number = getDefaultChainId()) {
  const client = getPublicClient(chainId)
  const contractAddress = getWriterCoinPaymentAddress(chainId)
  const [genCost, mintCost, enabled] = await readWithRetry(() => client.readContract({
    address: contractAddress,
    abi: CONTRACT_ABIS.__WriterCoinPaymentRead,
    functionName: 'getCoinConfig',
    args: [coinAddress],
  })) as unknown as [bigint, bigint, boolean]
  return { generationCost: genCost as bigint, mintCost: mintCost as bigint, enabled: Boolean(enabled) }
}

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

  const { writer, platform, creator } = coin.revenueDistribution

  const writerShare = (amount * BigInt(writer)) / BigInt(100)
  const platformShare = (amount * BigInt(platform)) / BigInt(100)
  const creatorShare = (amount * BigInt(creator)) / BigInt(100)

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

/**
 * Prepare transaction data for game generation payment
 * 
 * @param writerCoinAddress - ERC-20 token address
 * @returns Encoded transaction data
 */
export function encodePayForGameGeneration(
  writerCoinAddress: string
): string {
  // Function signature: payForGameGeneration(address writerCoin)
  // Selector calculated from keccak256("payForGameGeneration(address)")
  const abi = [{
    name: 'payForGameGeneration',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'writerCoin', type: 'address' }
    ]
  }] as const

  return encodeFunctionData({
    abi,
    functionName: 'payForGameGeneration',
    args: [writerCoinAddress as `0x${string}`]
  })
}

/**
 * Prepare transaction data for atomic payment and minting
 */
export function encodePayAndMintGame(
  writerCoinAddress: string,
  tokenURI: string,
  metadata: GameMetadata
): string {
  const abi = [{
    name: 'payAndMintGame',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'writerCoin', type: 'address' },
      { name: 'tokenURI', type: 'string' },
      {
        name: 'metadata',
        type: 'tuple',
        components: [
          { name: 'articleUrl', type: 'string' },
          { name: 'creator', type: 'address' },
          { name: 'writerCoin', type: 'address' },
          { name: 'genre', type: 'string' },
          { name: 'difficulty', type: 'string' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'gameTitle', type: 'string' }
        ]
      }
    ]
  }] as const

  return encodeFunctionData({
    abi,
    functionName: 'payAndMintGame',
    args: [
      writerCoinAddress as `0x${string}`,
      tokenURI,
      {
        articleUrl: metadata.articleUrl,
        creator: metadata.creator as `0x${string}`,
        writerCoin: metadata.writerCoin as `0x${string}`,
        genre: metadata.genre,
        difficulty: metadata.difficulty,
        createdAt: BigInt(metadata.createdAt),
        gameTitle: metadata.gameTitle
      }
    ]
  })
}
