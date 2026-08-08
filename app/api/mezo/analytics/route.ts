import { NextResponse } from 'next/server'
import { createPublicClient, http, parseAbiItem, type Log } from 'viem'
import { MEZO_TESTNET_CHAIN_ID } from '@/lib/wallet/chains'
import { MUSD_CONFIG } from '@/lib/writer-coins'

const MEZO_TESTNET_RPC = process.env.NEXT_PUBLIC_MEZO_TESTNET_RPC || 'https://rpc.test.mezo.org'

const SPLITTER_ADDRESS = MUSD_CONFIG.testnet.paymentSplitter as `0x${string}`

const GAME_MINTED_EVENT = parseAbiItem(
  'event GameMintedAndPaid(address indexed creator, string tokenURI, (string articleUrl, address creator, address writerCoin, string genre, string difficulty, uint256 createdAt, string gameTitle) metadata, uint256 creatorFee, uint256 platformFee, bool boosted)'
)

interface MezoAnalytics {
  totalGames: number
  totalVolumeMUSD: string
  totalPlatformFees: string
  totalCreatorPayouts: string
  boostedCount: number
  nonBoostedCount: number
  recentActivity: Array<{
    txHash: string
    gameTitle: string
    genre: string
    creator: string
    creatorFee: string
    platformFee: string
    boosted: boolean
    timestamp: number
    blockNumber: number
  }>
  lastUpdated: string
}

export async function GET() {
  try {
    const client = createPublicClient({
      chain: {
        id: MEZO_TESTNET_CHAIN_ID,
        name: 'Mezo Matsnet',
        network: 'mezo-testnet',
        nativeCurrency: { name: 'MUSD', symbol: 'MUSD', decimals: 18 },
        rpcUrls: {
          default: { http: [MEZO_TESTNET_RPC] },
          public: { http: [MEZO_TESTNET_RPC] },
        },
      },
      transport: http(MEZO_TESTNET_RPC, { timeout: 15000 }),
    })

    const latestBlock = await client.getBlockNumber()
    const fromBlock = latestBlock - 10000n

    const logs = await client.getLogs({
      address: SPLITTER_ADDRESS,
      event: GAME_MINTED_EVENT,
      fromBlock,
      toBlock: latestBlock,
    })

    let totalVolume = 0n
    let totalPlatformFees = 0n
    let totalCreatorPayouts = 0n
    let boostedCount = 0
    let nonBoostedCount = 0

    const formattedLogs = await Promise.all(
      logs.map(async (log) => {
        const { args } = log as Log & {
          args: {
            creator: `0x${string}`
            tokenURI: string
            metadata: {
              articleUrl: string
              creator: `0x${string}`
              writerCoin: `0x${string}`
              genre: string
              difficulty: string
              createdAt: bigint
              gameTitle: string
            }
            creatorFee: bigint
            platformFee: bigint
            boosted: boolean
          }
        }

        totalVolume += args.creatorFee + args.platformFee
        totalPlatformFees += args.platformFee
        totalCreatorPayouts += args.creatorFee

        if (args.boosted) {
          boostedCount++
        } else {
          nonBoostedCount++
        }

        const block = await client.getBlock({ blockNumber: log.blockNumber })

        return {
          txHash: log.transactionHash,
          gameTitle: args.metadata.gameTitle || 'Untitled',
          genre: args.metadata.genre || 'unknown',
          creator: args.creator,
          creatorFee: args.creatorFee.toString(),
          platformFee: args.platformFee.toString(),
          boosted: args.boosted,
          timestamp: Number(block.timestamp),
          blockNumber: Number(log.blockNumber),
        }
      })
    )

    formattedLogs.sort((a, b) => b.timestamp - a.timestamp)

    const data: MezoAnalytics = {
      totalGames: logs.length,
      totalVolumeMUSD: totalVolume.toString(),
      totalPlatformFees: totalPlatformFees.toString(),
      totalCreatorPayouts: totalCreatorPayouts.toString(),
      boostedCount,
      nonBoostedCount,
      recentActivity: formattedLogs.slice(0, 20),
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Mezo Analytics] Failed to fetch:', error)
    return NextResponse.json({
      success: true,
      data: {
        totalGames: 0,
        totalVolumeMUSD: '0',
        totalPlatformFees: '0',
        totalCreatorPayouts: '0',
        boostedCount: 0,
        nonBoostedCount: 0,
        recentActivity: [],
        lastUpdated: new Date().toISOString(),
      },
    })
  }
}
