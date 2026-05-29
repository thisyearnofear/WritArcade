import { NextRequest, NextResponse } from 'next/server'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { getMintConfig } from '@/lib/writerCoins'
import { prisma } from '@/lib/database'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const GAME_NFT_ABI = [
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const

/**
 * Determines the NFT contract and chain for a game based on its payment type.
 */
function getNftConfig(writerCoinId?: string | null): { contractAddress: `0x${string}`; chainId: number } {
  if (writerCoinId) {
    const config = getMintConfig(writerCoinId)
    if (config) return config
  }
  // Default: Base mainnet GameNFT
  return {
    contractAddress: '0x778C87dAA2b284982765688AE22832AADae7dccC',
    chainId: 8453,
  }
}

/**
 * Verifies the requesting wallet owns the game's NFT.
 */
async function verifyNftOwnership(
  nftTokenId: string,
  walletAddress: string,
  contractAddress: `0x${string}`,
  chainId: number
): Promise<{ verified: boolean; error?: string }> {
  try {
    const rpcUrl = chainId === 8453
      ? 'https://mainnet.base.org'
      : chainId === 31611
        ? 'https://rpc.test.mezo.org'
        : 'https://mainnet.base.org'

    const publicClient = createPublicClient({
      chain: chainId === 8453 ? base : { id: chainId, name: '', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } },
      transport: http(rpcUrl),
    })

    const owner = await publicClient.readContract({
      address: contractAddress,
      abi: GAME_NFT_ABI,
      functionName: 'ownerOf',
      args: [BigInt(nftTokenId)],
    })

    if ((owner as string).toLowerCase() !== walletAddress.toLowerCase()) {
      return { verified: false, error: 'You do not own the NFT for this game.' }
    }

    return { verified: true }
  } catch {
    return { verified: false, error: 'Could not verify NFT ownership. The token may not exist or the RPC is unavailable.' }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { walletAddress, sessionId } = body

    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json({ error: 'Valid wallet address is required' }, { status: 400 })
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Complete this game before unlocking the CDR secret panel.' },
        { status: 400 }
      )
    }

    const game = await GameDatabaseService.getGameBySlug(slug)

    if (!game || !game.promptVaultUuid) {
      return NextResponse.json({ error: 'Game or vault not found' }, { status: 404 })
    }

    if (!game.nftTokenId) {
      return NextResponse.json(
        { error: 'This game has not been minted yet. Mint the NFT to unlock the secret panel.' },
        { status: 400 }
      )
    }

    const completedSession = await prisma.session.findFirst({
      where: {
        sessionId,
        chats: {
          some: {
            gameId: game.id,
            role: 'assistant',
          },
        },
      },
      select: {
        _count: {
          select: {
            chats: {
              where: {
                gameId: game.id,
                role: 'assistant',
              },
            },
          },
        },
      },
    })

    const completedPanels = completedSession?._count.chats ?? 0
    if (completedPanels < 5) {
      return NextResponse.json(
        { error: 'Finish all 5 story panels before the CDR vault can be unlocked.' },
        { status: 403 }
      )
    }

    const nftConfig = getNftConfig(game.writerCoinId)
    const { verified, error } = await verifyNftOwnership(
      game.nftTokenId,
      walletAddress,
      nftConfig.contractAddress,
      nftConfig.chainId
    )

    if (!verified) {
      return NextResponse.json({ error: error || 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      vaultUuid: game.promptVaultUuid,
      status: 'ready_for_decryption',
      chainId: 1315,
      accessPolicy: {
        cdrReadCondition: 'tokenGate',
        nftContract: nftConfig.contractAddress,
        nftTokenId: game.nftTokenId,
        nftChainId: nftConfig.chainId,
        completedPanels,
      },
    })

  } catch (error) {
    console.error('Secret panel access failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
