/**
 * Writer Coin Configuration
 * 
 * Defines the whitelisted writer coins that can be used
 * to generate games from articles. Each writer coin is associated with
 * a specific Paragraph author/publication.
 */

import { BASE_MAINNET_CHAIN_ID, MEZO_TESTNET_CHAIN_ID, MEZO_MAINNET_CHAIN_ID } from '@/lib/wallet/chains'

const BASE_GAME_NFT_ADDRESS =
    (process.env.NEXT_PUBLIC_GAME_NFT_MAINNET as `0x${string}` | undefined) ||
    (process.env.NEXT_PUBLIC_GAME_NFT_ADDRESS as `0x${string}` | undefined) ||
    "0x32D0356f533cC429F94Db73f383bBb21a459E16b"

const BASE_WRITER_COIN_PAYMENT_ADDRESS =
    (process.env.NEXT_PUBLIC_WRITER_COIN_PAYMENT_MAINNET as `0x${string}` | undefined) ||
    (process.env.NEXT_PUBLIC_WRITER_COIN_PAYMENT_ADDRESS as `0x${string}` | undefined) ||
    "0x56Ee5A3f122da00B635DdbB319708e24450aEB89"

export interface WriterCoin {
    id: string
    name: string
    symbol: string
    address: `0x${string}` // ERC-20 contract address
    writer: string
    paragraphAuthor: string // Used to validate article URLs
    paragraphUrl: string
    bio: string // One-line description of the writer/publication
    gameGenerationCost: bigint // Cost in tokens to generate a game
    mintCost: bigint // Cost in tokens to mint game as NFT
    decimals: number
    gameNftAddress: `0x${string}` // GameNFT contract address
    paymentContractAddress: `0x${string}` // WriterCoinPayment contract address
    chainId?: number // Chain ID where this coin lives (defaults to Base mainnet)
    paymentEnabled: boolean // True only when WriterCoinPayment accepts this coin on-chain

    // Revenue distribution (percentages, should sum to 100)
    revenueDistribution: {
        writer: number // % to writer's treasury
        creator: number // % to game creator
        platform: number // % to writersarcade
        burn: number // % token burn (deflationary)
    }
}

/**
 * Whitelisted writer coins for MVP
 * 
 * Launch partners:
 * 1. AVC by Fred Wilson ($AVC)
 * 2. Debbie Soon ($DEBBIE)
 * 3. Blog of Jake ($JAKE)
 * 4. Tso Thoughts ($THOUGHTS)
 * 5. Papa ($PARAPAPA)
 */
export const WRITER_COINS: WriterCoin[] = [
    {
        id: "avc",
        name: "AVC",
        symbol: "$AVC",
        address: "0x06FC3D5D2369561e28F261148576520F5e49D6ea", // Base mainnet
        writer: "Fred Wilson",
        paragraphAuthor: "fredwilson",
        paragraphUrl: "https://avc.xyz/",
        bio: "Venture capitalist and blogger writing about technology, startups, and markets since 2003.",
        gameGenerationCost: 100000000000000000000n, // 100 $AVC (100 * 10^18)
        mintCost: 50000000000000000000n, // 50 $AVC (50 * 10^18)
        decimals: 18,
        gameNftAddress: BASE_GAME_NFT_ADDRESS,
        paymentContractAddress: BASE_WRITER_COIN_PAYMENT_ADDRESS,
        paymentEnabled: true,
        revenueDistribution: {
            writer: 60,
            creator: 20,
            burn: 0,
            platform: 20,
        },
    },
    {
        id: "debbie",
        name: "Debbie Soon",
        symbol: "$DEBBIE",
        address: "0x4ea5d3ff9e8295a552903d4bd486ce8cf8291c60", // Base mainnet
        writer: "Debbie Soon",
        paragraphAuthor: "debbie",
        paragraphUrl: "https://paragraph.com/@debbie",
        bio: "Writer and researcher exploring the intersection of technology, culture, and human behaviour.",
        gameGenerationCost: 100000000000000000000n, // 100 $DEBBIE (100 * 10^18)
        mintCost: 50000000000000000000n, // 50 $DEBBIE (50 * 10^18)
        decimals: 18,
        gameNftAddress: BASE_GAME_NFT_ADDRESS,
        paymentContractAddress: BASE_WRITER_COIN_PAYMENT_ADDRESS,
        paymentEnabled: true,
        revenueDistribution: {
            writer: 60,
            creator: 20,
            burn: 0,
            platform: 20,
        },
    },
    {
        id: "jake",
        name: "Blog of Jake",
        symbol: "$JAKE",
        address: "0xC2E3A4d07fdff60f3CdCb39FD94Fc11F254938B9", // Base mainnet
        writer: "Jake",
        paragraphAuthor: "jake",
        paragraphUrl: "https://paragraph.com/@jake",
        bio: "Independent writer covering crypto, culture, and the open web.",
        gameGenerationCost: 100000000000000000000n, // 100 $JAKE (100 * 10^18)
        mintCost: 50000000000000000000n, // 50 $JAKE (50 * 10^18)
        decimals: 18,
        gameNftAddress: BASE_GAME_NFT_ADDRESS,
        paymentContractAddress: BASE_WRITER_COIN_PAYMENT_ADDRESS,
        paymentEnabled: true,
        revenueDistribution: {
            writer: 60,
            creator: 20,
            burn: 0,
            platform: 20,
        },
    },
    {
        id: "tso",
        name: "Tso Thoughts",
        symbol: "$THOUGHTS",
        address: "0x98cacf94eb68ea4c5bdc4d70a1a04c2c2cffde39", // Base mainnet
        writer: "Tso",
        paragraphAuthor: "cryptso",
        paragraphUrl: "https://paragraph.com/@cryptso",
        bio: "Crypto-native thinker writing about onchain ecosystems, DeFi, and the future of money.",
        gameGenerationCost: 100000000000000000000n, // 100 $THOUGHTS (100 * 10^18)
        mintCost: 50000000000000000000n, // 50 $THOUGHTS (50 * 10^18)
        decimals: 18,
        gameNftAddress: BASE_GAME_NFT_ADDRESS,
        paymentContractAddress: BASE_WRITER_COIN_PAYMENT_ADDRESS,
        paymentEnabled: true,
        revenueDistribution: {
            writer: 60,
            creator: 20,
            burn: 0,
            platform: 20,
        },
    },
    {
        id: "papa",
        name: "Papa",
        symbol: "$PARAPAPA",
        address: "0x300efb94e4a7fcf71184eeeb82cb2b7af4a6ea58", // Base mainnet
        writer: "Papa Jams",
        paragraphAuthor: "papajams.eth",
        paragraphUrl: "https://paragraph.com/@papajams.eth",
        bio: "Music, culture, and life — personal essays from the intersection of fatherhood and the creative life.",
        gameGenerationCost: 100000000000000000000n, // 100 $PARAPAPA (100 * 10^18)
        mintCost: 50000000000000000000n, // 50 $PARAPAPA (50 * 10^18)
        decimals: 18,
        gameNftAddress: BASE_GAME_NFT_ADDRESS,
        paymentContractAddress: BASE_WRITER_COIN_PAYMENT_ADDRESS,
        paymentEnabled: true,
        revenueDistribution: {
            writer: 60,
            creator: 20,
            burn: 0,
            platform: 20,
        },
    },
]

/**
 * Get writer coin by contract address
 */
export function getWriterCoinByAddress(address: string): WriterCoin | undefined {
    return WRITER_COINS.find(
        (coin) => coin.address.toLowerCase() === address.toLowerCase()
    )
}

/**
 * Get writer coin by ID
 */
export function getWriterCoinById(id: string): WriterCoin | undefined {
    return WRITER_COINS.find((coin) => coin.id === id)
}

/**
 * Get writer coin by Paragraph author
 */
export function getWriterCoinByAuthor(author: string): WriterCoin | undefined {
    return WRITER_COINS.find(
        (coin) => coin.paragraphAuthor.toLowerCase() === author.toLowerCase()
    )
}

export function getPaymentEnabledWriterCoins(): WriterCoin[] {
    return WRITER_COINS.filter((coin) => coin.paymentEnabled)
}

export function isWriterCoinPaymentEnabled(writerCoinId: string): boolean {
    return Boolean(getWriterCoinById(writerCoinId)?.paymentEnabled)
}

const PARAGRAPH_HOSTNAMES = new Set(['paragraph.com', 'paragraph.xyz'])

function normalizeHostname(hostname: string): string {
    return hostname.replace(/^www\./, '').toLowerCase()
}

function normalizePathname(pathname: string): string {
    const normalized = pathname.toLowerCase().replace(/\/+$/, '')
    return normalized || '/'
}

function hostnamesMatch(articleHostname: string, coinHostname: string): boolean {
    const articleHost = normalizeHostname(articleHostname)
    const coinHost = normalizeHostname(coinHostname)

    if (articleHost === coinHost) return true

    return PARAGRAPH_HOSTNAMES.has(articleHost) && PARAGRAPH_HOSTNAMES.has(coinHost)
}

/**
 * Validate if an article URL matches a writer coin's Paragraph
 * For paragraph.com coins, also checks the author path prefix.
 */
export function validateArticleUrl(url: string, writerCoinId: string): boolean {
    const coin = getWriterCoinById(writerCoinId)
    if (!coin) return false

    try {
        const articleUrl = new URL(url)
        const coinUrl = new URL(coin.paragraphUrl)
        if (!hostnamesMatch(articleUrl.hostname, coinUrl.hostname)) return false
        // For shared-domain hosts (e.g. paragraph.com), ensure the article
        // belongs to the correct author by checking the path prefix.
        const coinPath = normalizePathname(coinUrl.pathname)
        if (coinPath !== "/") {
            const articlePath = normalizePathname(articleUrl.pathname)
            return articlePath === coinPath || articlePath.startsWith(`${coinPath}/`)
        }
        return true
    } catch {
        return false
    }
}

export function getWriterCoinByArticleUrl(url: string): WriterCoin | undefined {
    return WRITER_COINS.find((coin) => coin.paymentEnabled && validateArticleUrl(url, coin.id))
}

/**
 * Check if a writer coin address is whitelisted
 */
export function isWhitelistedWriterCoin(address: string): boolean {
    return WRITER_COINS.some(
        (coin) => coin.address.toLowerCase() === address.toLowerCase()
    )
}

/**
 * MUSD Payment Configuration
 *
 * MUSD is the Bitcoin-backed stablecoin on Mezo network.
 * It is used as a primary payment method for game generation in the
 * Mezo Hackathon track (MUSD/Consumer Experiences).
 *
 * Docs: https://mezo.org/docs/developers/musd/
 *
 * The `paymentSplitter` address is a deployed `MezoPaymentSplitter` instance
 * that pulls MUSD from the user and atomically forwards platform/writer/
 * creator shares on-chain. See contracts/src/MezoPaymentSplitter.sol.
 *
 * The address can be overridden per-environment via
 * `NEXT_PUBLIC_MEZO_PAYMENT_SPLITTER_TESTNET` / `_MAINNET`.
 */
const MEZO_TESTNET_PAYMENT_SPLITTER =
    (process.env.NEXT_PUBLIC_MEZO_PAYMENT_SPLITTER_TESTNET as `0x${string}` | undefined) ||
    "0x5eEb15C32F54B242B07B5Dc23859a3DC71D0C592" // MezoBoostedSplitter v3 (with payForGeneration + MEZO holder boost), deployed 2026-05-26

const MEZO_MAINNET_PAYMENT_SPLITTER =
    (process.env.NEXT_PUBLIC_MEZO_PAYMENT_SPLITTER_MAINNET as `0x${string}` | undefined) ||
    "0x0000000000000000000000000000000000000000" // not yet deployed

const MEZO_TESTNET_GAME_NFT =
    (process.env.NEXT_PUBLIC_MEZO_GAME_NFT_ADDRESS as `0x${string}` | undefined) ||
    "0xb6001687e4700843e0a04a442031525f669465e7" // GameNFTMezo, deployed 2026-05-25

const MEZO_MAINNET_GAME_NFT =
    (process.env.NEXT_PUBLIC_MEZO_GAME_NFT_MAINNET as `0x${string}` | undefined) ||
    "0x0000000000000000000000000000000000000000" // not yet deployed

export const MUSD_CONFIG = {
    // Mezo Testnet MUSD token (Mezo Matsnet, chainId 31611)
    testnet: {
        address: "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503" as `0x${string}`,
        paymentSplitter: MEZO_TESTNET_PAYMENT_SPLITTER,
        chainId: MEZO_TESTNET_CHAIN_ID,
        gameNftAddress: MEZO_TESTNET_GAME_NFT,
        decimals: 18,
        symbol: "MUSD",
        name: "Mezo USD",
        // Cost: $1 USD equivalent (in wei)
        gameGenerationCost: 1000000000000000000n, // 1 MUSD
        mintCost: 500000000000000000n,            // 0.5 MUSD (informational; splitter currently fixes mint at 1 MUSD)
    },
    // Mezo Mainnet MUSD token (Mezo Mainnet, chainId 30062)
    mainnet: {
        address: "0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186" as `0x${string}`,
        paymentSplitter: MEZO_MAINNET_PAYMENT_SPLITTER,
        chainId: MEZO_MAINNET_CHAIN_ID,
        gameNftAddress: MEZO_MAINNET_GAME_NFT,
        decimals: 18,
        symbol: "MUSD",
        name: "Mezo USD",
        gameGenerationCost: 1000000000000000000n,
        mintCost: 500000000000000000n,
    },
} as const

/**
 * MEZO Token Configuration
 *
 * MEZO is the native governance/utility token of the Mezo network. The same
 * address is deployed on both Mezo Mainnet (chainId 31612) and Mezo Matsnet
 * (chainId 31611) as a system precompile.
 *
 * In WritersArcade, MEZO is used as a "loyalty" signal: holders see a
 * "MEZO Holder" badge in the MUSD payment flow and (roadmap) will receive
 * boosted writer/creator share weights enforced on-chain by an extended
 * MezoPaymentSplitter ("MezoBoostedSplitter"). The minimum-balance threshold
 * to qualify is configurable.
 *
 * Docs: https://mezo.org/docs/users/resources/contracts-reference/
 */
export const MEZO_CONFIG = {
    address: "0x7B7c000000000000000000000000000000000001" as `0x${string}`,
    decimals: 18,
    symbol: "MEZO",
    name: "MEZO",
    /** Minimum MEZO balance (wei) that earns the "MEZO Holder" perk in UI. */
    holderThreshold: 1000000000000000000n, // 1 MEZO
    /** Writer share boost (in basis points) applied when a wallet meets `holderThreshold`. More of the payment goes to the writer. */
    holderDiscountBP: 1000, // 10% boost to writer share
} as const

export type PaymentToken = 
    | { type: 'writercoin'; coin: WriterCoin }
    | { type: 'musd'; network: 'testnet' | 'mainnet' }
    | { type: 'credits' }/** Credit-based payment config */
export const CREDITS_CONFIG = {
  address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  decimals: 0,
  symbol: 'Credits',
  name: 'Credits',
    gameGenerationCost: 10n, // 10 credits per game generation
  mintCost: 5n,            // 5 credits per NFT mint
  videoUpsellCost: 50n,    // 50 credits to animate a completed comic
  videoMontageCost: 100n,  // 100 credits to animate the WHOLE comic (all panels)
  cost: {
    'generate-game': 10,
    'mint-nft': 5,
    'play-wordle': 1,
    'video-upsell': 50,
    'video-montage': 100,
  } as Record<string, number>,
} as const

/**
 * Mint config lookup: returns the contract address and chain ID for minting
 * an NFT for a given writerCoinId (e.g. "avc", "papa", "musd-testnet").
 * Handles both WriterCoin and MUSD payment types.
 */
export interface MintConfig {
    contractAddress: `0x${string}`
    chainId: number
}

export function getMintConfig(writerCoinId: string): MintConfig | undefined {
    if (writerCoinId.startsWith('musd')) {
        const network = writerCoinId === 'musd-mainnet' ? 'mainnet' : 'testnet'
        const config = MUSD_CONFIG[network]
        return {
            contractAddress: config.gameNftAddress,
            chainId: config.chainId,
        }
    }
    const coin = getWriterCoinById(writerCoinId)
    if (!coin) return undefined
    return {
        contractAddress: coin.gameNftAddress,
        chainId: coin.chainId ?? BASE_MAINNET_CHAIN_ID,
    }
}

/**
 * Get payment token config by type
 */
export function getPaymentTokenConfig(token: PaymentToken) {
    if (token.type === 'musd') {
        return MUSD_CONFIG[token.network]
    }
    if (token.type === 'credits') {
        return CREDITS_CONFIG
    }
    return token.coin
}
