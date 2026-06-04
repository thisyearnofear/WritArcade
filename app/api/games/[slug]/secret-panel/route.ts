import { NextRequest, NextResponse } from 'next/server'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { getMintConfig } from '@/lib/writerCoins'
import { prisma } from '@/lib/database'

const GAME_NFT_ABI = [
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const

const BASE_GAME_NFT_ADDRESS =
  (process.env.NEXT_PUBLIC_GAME_NFT_MAINNET as `0x${string}` | undefined) ||
  (process.env.NEXT_PUBLIC_GAME_NFT_ADDRESS as `0x${string}` | undefined) ||
  '0x778C87dAA2b284982765688AE22832AADae7dccC'

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
    contractAddress: BASE_GAME_NFT_ADDRESS,
    chainId: 8453,
  }
}

/**
 * Verifies NFT ownership via the Hetzner backend to avoid cold-starting
 * a viem publicClient on every Vercel serverless invocation.
 * Falls back to direct on-chain check if Hetzner is unreachable.
 */
async function verifyNftOwnership(
  nftTokenId: string,
  walletAddress: string,
  contractAddress: `0x${string}`,
  chainId: number
): Promise<{ verified: boolean; error?: string }> {
  const backendUrl = process.env.CDR_BACKEND_URL || process.env.API_BACKEND_URL || 'https://api.snel.famile.xyz/writersarcade'

  try {
    const response = await fetch(`${backendUrl}/api/verify-nft-ownership`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nftTokenId, walletAddress, contractAddress, chainId }),
      signal: AbortSignal.timeout(8000),
    })

    if (response.ok) {
      return await response.json()
    }
  } catch {
    // Hetzner unreachable — fall through to direct check
  }

  // Fallback: direct on-chain verification (original path)
  try {
    const { createPublicClient, http } = await import('viem')
    const { base } = await import('viem/chains')

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
