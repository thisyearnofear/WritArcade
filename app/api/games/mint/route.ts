import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWriterCoinById } from '@/lib/writerCoins'

interface MintRequest {
  gameId: string
  gameSlug: string
  wallet: string
  writerCoinId: string
}

/**
 * POST /api/games/mint
 * Initiate NFT minting for a game
 * 
 * Implementation:
 * 1. Validate game exists and user owns it
 * 2. Verify writer coin is whitelisted
 * 3. Prepare metadata for IPFS upload
 * 4. Return minting payload for frontend to execute transaction
 * 5. Store transaction hash in database once minted
 */
export async function POST(request: NextRequest) {
  try {
    const body: MintRequest = await request.json()
    const { gameId, gameSlug, wallet, writerCoinId } = body

    // Validation
    if (!gameId || !gameSlug || !wallet || !writerCoinId) {
      return NextResponse.json(
        { error: 'Missing required fields: gameId, gameSlug, wallet, writerCoinId' },
        { status: 400 }
      )
    }

    // Validate wallet format
    if (!wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Verify writer coin is valid
    const coin = getWriterCoinById(writerCoinId)
    if (!coin) {
      return NextResponse.json(
        { error: `Unknown writer coin: ${writerCoinId}` },
        { status: 400 }
      )
    }

    // Fetch game from database
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { user: true },
    })

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    // Verify user ownership (wallet matches game creator)
    if (game.user?.walletAddress?.toLowerCase() !== wallet.toLowerCase()) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this game' },
        { status: 403 }
      )
    }

    // Check if already minted
    if (game.nftTokenId) {
      return NextResponse.json(
        { error: 'Game already minted as NFT' },
        { status: 400 }
      )
    }

    // Prepare metadata for minting
    const metadata = {
      name: game.title,
      description: game.description || `A ${game.genre} game generated from an article`,
      image: game.imageUrl || '',
      attributes: [
        { trait_type: 'genre', value: game.genre },
        { trait_type: 'difficulty', value: game.difficulty },
        { trait_type: 'creator', value: wallet },
        { trait_type: 'created_at', value: new Date(game.createdAt).toISOString() },
      ],
    }

    // Return minting payload
    // Frontend will use this to call GameNFT.mintGame() contract function
    return NextResponse.json({
      success: true,
      data: {
        gameId,
        wallet,
        metadata,
        contractAddress: coin.gameNftAddress,
        chainId: 8453, // Base mainnet
        message: 'Prepare minting transaction. Click "Confirm" to mint as NFT.',
        estimatedCost: coin.mintCost.toString(),
      },
    })
  } catch (error) {
    console.error('Mint error:', error)
    return NextResponse.json(
      { error: 'Failed to prepare minting' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/games/mint
 * Confirm and store minting transaction
 * Called after NFT mint transaction succeeds on-chain
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameId, transactionHash, nftTokenId, wallet } = body

    if (!gameId || !transactionHash || !wallet) {
      return NextResponse.json(
        { error: 'Missing required fields: gameId, transactionHash, wallet' },
        { status: 400 }
      )
    }

    // Validate transaction hash format
    if (!transactionHash.match(/^0x[a-fA-F0-9]{64}$/)) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      )
    }

    // Update game with NFT details
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        nftTokenId: nftTokenId?.toString(),
        nftTransactionHash: transactionHash,
        nftMintedAt: new Date(),
      },
    })

    // Record payment for minting (if not already recorded)
    const existingPayment = await prisma.payment.findFirst({
      where: {
        transactionHash,
        action: 'mint-nft',
      },
    })

    if (!existingPayment) {
      await prisma.payment.create({
        data: {
          id: crypto.randomUUID(),
          transactionHash,
          action: 'mint-nft',
          amount: BigInt(50 * 10 ** 18), // 50 AVC (hardcoded for now)
          status: 'verified',
          userId: updatedGame.userId,
          writerCoinId: 'avc',
          verifiedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        gameId,
        nftTokenId,
        transactionHash,
        status: 'minted',
        message: 'NFT minting complete!',
      },
    })
  } catch (error) {
    console.error('Mint confirmation error:', error)
    return NextResponse.json(
      { error: 'Failed to confirm minting' },
      { status: 500 }
    )
  }
}
