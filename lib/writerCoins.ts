/**
 * Writer Coin Configuration
 * 
 * Defines the whitelisted writer coins (memecoins) that can be used
 * to generate games from articles. Each writer coin is associated with
 * a specific Paragraph author/newsletter.
 */

export interface WriterCoin {
    id: string
    name: string
    symbol: string
    address: `0x${string}` // ERC-20 contract address on Base
    writer: string
    paragraphAuthor: string // Used to validate article URLs
    paragraphUrl: string
    gameGenerationCost: bigint // Cost in tokens to generate a game
    mintCost: bigint // Cost in tokens to mint game as NFT
    decimals: number

    // Revenue distribution (percentages)
    revenueDistribution: {
        writer: number // % to writer's treasury
        platform: number // % to WritArcade
        creatorPool: number // % to game creator/community pool
    }
}

/**
 * Whitelisted writer coins for MVP
 * 
 * Launch partners:
 * 1. AVC by Fred Wilson ($AVC)
 * 2. TBD - Writer Coin #2
 * 3. TBD - Writer Coin #3
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
        gameGenerationCost: BigInt(100 * 10 ** 18), // 100 $AVC
        mintCost: BigInt(50 * 10 ** 18), // 50 $AVC
        decimals: 18,
        revenueDistribution: {
            writer: 60, // 60% to Fred Wilson's treasury
            platform: 20, // 20% to WritArcade
            creatorPool: 20, // 20% to community pool
        },
    },
    // TODO: Add Writer Coin #2
    // {
    //   id: "coin2",
    //   name: "Writer Coin #2",
    //   symbol: "$COIN2",
    //   address: "0x...",
    //   writer: "TBD",
    //   paragraphAuthor: "TBD",
    //   paragraphUrl: "https://...",
    //   gameGenerationCost: BigInt(100 * 10 ** 18),
    //   mintCost: BigInt(50 * 10 ** 18),
    //   decimals: 18,
    //   revenueDistribution: {
    //     writer: 60,
    //     platform: 20,
    //     creatorPool: 20,
    //   },
    // },
    // TODO: Add Writer Coin #3
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

/**
 * Validate if an article URL matches a writer coin's Paragraph
 */
export function validateArticleUrl(url: string, writerCoinId: string): boolean {
    const coin = getWriterCoinById(writerCoinId)
    if (!coin) return false

    try {
        const articleUrl = new URL(url)
        const coinUrl = new URL(coin.paragraphUrl)
        return articleUrl.hostname === coinUrl.hostname
    } catch {
        return false
    }
}

/**
 * Check if a writer coin address is whitelisted
 */
export function isWhitelistedWriterCoin(address: string): boolean {
    return WRITER_COINS.some(
        (coin) => coin.address.toLowerCase() === address.toLowerCase()
    )
}
