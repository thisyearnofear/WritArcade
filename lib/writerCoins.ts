/**
 * Writer Coin Configuration
 * 
 * Defines the whitelisted writer coins that can be used
 * to generate games from articles. Each writer coin is associated with
 * a specific Paragraph author/publication.
 */

export interface WriterCoin {
    id: string
    name: string
    symbol: string
    address: `0x${string}` // ERC-20 contract address on Base
    writer: string
    paragraphAuthor: string // Used to validate article URLs
    paragraphUrl: string
    bio: string // One-line description of the writer/publication
    gameGenerationCost: bigint // Cost in tokens to generate a game
    mintCost: bigint // Cost in tokens to mint game as NFT
    decimals: number
    gameNftAddress: `0x${string}` // GameNFT contract address
    paymentContractAddress: `0x${string}` // WriterCoinPayment contract address

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
 * 4. Tso's Thoughts ($TSO)
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
        gameGenerationCost: BigInt(100 * 10 ** 18), // 100 $AVC
        mintCost: BigInt(50 * 10 ** 18), // 50 $AVC
        decimals: 18,
        gameNftAddress: "0x778C87dAA2b284982765688AE22832AADae7dccC", // Base mainnet - GameNFT
        paymentContractAddress: "0xf11822F99FF5f6982d42d4A0923d2b3f9589fA75", // Base mainnet - WriterCoinPayment
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
        gameGenerationCost: BigInt(100 * 10 ** 18), // 100 $DEBBIE
        mintCost: BigInt(50 * 10 ** 18), // 50 $DEBBIE
        decimals: 18,
        gameNftAddress: "0x778C87dAA2b284982765688AE22832AADae7dccC", // Base mainnet - GameNFT
        paymentContractAddress: "0xf11822F99FF5f6982d42d4A0923d2b3f9589fA75", // Base mainnet - WriterCoinPayment
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
        gameGenerationCost: BigInt(100 * 10 ** 18), // 100 $JAKE
        mintCost: BigInt(50 * 10 ** 18), // 50 $JAKE
        decimals: 18,
        gameNftAddress: "0x778C87dAA2b284982765688AE22832AADae7dccC", // Base mainnet - GameNFT
        paymentContractAddress: "0xf11822F99FF5f6982d42d4A0923d2b3f9589fA75", // Base mainnet - WriterCoinPayment
        revenueDistribution: {
            writer: 60,
            creator: 20,
            burn: 0,
            platform: 20,
        },
    },
    {
        id: "tso",
        name: "Tso's Thoughts",
        symbol: "$TSO",
        address: "0x8072FC8Ee6Fd17B913833F2789bC9aa99D21AAeB", // Base mainnet
        writer: "Tso",
        paragraphAuthor: "cryptso",
        paragraphUrl: "https://paragraph.com/@cryptso",
        bio: "Crypto-native thinker writing about onchain ecosystems, DeFi, and the future of money.",
        gameGenerationCost: BigInt(100 * 10 ** 18), // 100 $TSO
        mintCost: BigInt(50 * 10 ** 18), // 50 $TSO
        decimals: 18,
        gameNftAddress: "0x778C87dAA2b284982765688AE22832AADae7dccC", // Base mainnet - GameNFT
        paymentContractAddress: "0xf11822F99FF5f6982d42d4A0923d2b3f9589fA75", // Base mainnet - WriterCoinPayment
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
        gameGenerationCost: BigInt(100 * 10 ** 18), // 100 $PARAPAPA
        mintCost: BigInt(50 * 10 ** 18), // 50 $PARAPAPA
        decimals: 18,
        gameNftAddress: "0x778C87dAA2b284982765688AE22832AADae7dccC", // Base mainnet - GameNFT
        paymentContractAddress: "0xf11822F99FF5f6982d42d4A0923d2b3f9589fA75", // Base mainnet - WriterCoinPayment
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
        if (articleUrl.hostname !== coinUrl.hostname) return false
        // For shared-domain hosts (e.g. paragraph.com), ensure the article
        // belongs to the correct author by checking the path prefix.
        if (coinUrl.pathname && coinUrl.pathname !== "/") {
            return articleUrl.pathname.toLowerCase().startsWith(coinUrl.pathname.toLowerCase())
        }
        return true
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
