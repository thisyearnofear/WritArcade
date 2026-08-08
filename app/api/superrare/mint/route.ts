import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mintNFT } from '@/lib/integrations/superrare'
import { getActor } from '@/services/auth'
import { authorizeGameOwner, ownershipError } from '@/domains/games/services/game-ownership.service'
import { z } from 'zod'

const superrareMintSchema = z.object({
  gameId: z.string().min(1),
  chainId: z.number().optional().default(8453),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = superrareMintSchema.parse(body)
    const { gameId } = validated

    const actor = await getActor()
    const actorWallet = actor?.identity === 'wallet' ? actor.user.walletAddress?.toLowerCase() : null
    if (!actorWallet) {
      return NextResponse.json({ error: 'Wallet authentication is required' }, { status: 401 })
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { user: true },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const ownership = authorizeGameOwner({ game, wallet: actorWallet })
    if (!ownership.authorized) {
      return NextResponse.json({ error: ownershipError() }, { status: 403 })
    }

    if (game.superrareTokenId) {
      return NextResponse.json({ error: 'Game already minted as SuperRare NFT' }, { status: 400 })
    }

    const mintResult = await mintNFT({
      gameId: game.id,
      gameSlug: game.slug,
      title: game.title,
      description: game.description,
      imageUrl: game.imageUrl || undefined,
      creatorAddress: actorWallet,
      genre: game.genre,
      attributes: [
        { trait_type: 'difficulty', value: game.difficulty || 'easy' },
        { trait_type: 'subgenre', value: game.subgenre },
        ...(game.writerCoinId
          ? [{ trait_type: 'payment_token', value: game.writerCoinId }]
          : []),
      ],
      chainId: validated.chainId,
    })

    return NextResponse.json({
      success: true,
      data: {
        tokenUri: mintResult.tokenUri,
        contractAddress: mintResult.contractAddress,
        creator: mintResult.creator,
        message: 'Ready to mint. Review the metadata and confirm in your wallet.',
        metadata: {
          name: game.title,
          description: game.description,
          image: game.imageUrl,
        },
      },
    })
  } catch (error) {
    console.error('[SuperRare Mint] Error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to prepare SuperRare mint' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameId, transactionHash, tokenId } = body

    if (!gameId || !transactionHash || !tokenId) {
      return NextResponse.json(
        { error: 'Missing required fields: gameId, transactionHash, tokenId' },
        { status: 400 }
      )
    }

    const actor = await getActor()
    const actorWallet = actor?.identity === 'wallet' ? actor.user.walletAddress?.toLowerCase() : null
    if (!actorWallet) {
      return NextResponse.json({ error: 'Wallet authentication is required' }, { status: 401 })
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { user: true },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const ownership = authorizeGameOwner({ game, wallet: actorWallet })
    if (!ownership.authorized) {
      return NextResponse.json({ error: ownershipError() }, { status: 403 })
    }

    const contractAddress = process.env.SUPERRARE_CONTRACT_ADDRESS || '0xb932a70a57673d89f4acffbe830e8ed7f75fb9e0'

    await prisma.game.update({
      where: { id: gameId },
      data: {
        superrareTokenId: tokenId,
        superrareContract: contractAddress,
        superrareMintedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        gameId,
        tokenId,
        transactionHash,
        contractAddress,
        status: 'minted',
        message: 'SuperRare NFT minted successfully!',
      },
    })
  } catch (error) {
    console.error('[SuperRare Confirm] Error:', error)
    return NextResponse.json({ error: 'Failed to confirm SuperRare mint' }, { status: 500 })
  }
}
