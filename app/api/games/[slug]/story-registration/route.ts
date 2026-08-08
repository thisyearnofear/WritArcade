import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { authorizeGameOwner, ownershipError } from '@/domains/games/services/game-ownership.service'

function isAddress(value: unknown): value is string {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value)
}

function isHash(value: unknown): value is string {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/.test(value)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { storyIpId, transactionHash } = body

    if (!isAddress(storyIpId)) {
      return NextResponse.json({ error: 'Valid Story IP ID is required' }, { status: 400 })
    }

    if (!isHash(transactionHash)) {
      return NextResponse.json({ error: 'Valid transaction hash is required' }, { status: 400 })
    }

    const actor = await getActor()
    const actorWallet = actor?.identity === 'wallet' ? actor.user.walletAddress?.toLowerCase() : null
    if (!actorWallet) {
      return NextResponse.json({ error: 'Wallet authentication is required' }, { status: 401 })
    }

    const game = await prisma.game.findUnique({
      where: { slug },
      include: {
        user: true,
        payment: { include: { user: true } },
      },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const ownership = authorizeGameOwner({ game, wallet: actorWallet })
    if (!ownership.authorized) {
      return NextResponse.json({ error: ownershipError() }, { status: 403 })
    }

    const updated = await prisma.game.update({
      where: { id: game.id },
      data: {
        storyIpId,
        storyRegistrationTxHash: transactionHash,
        storyRegisteredAt: new Date(),
      },
      select: {
        id: true,
        slug: true,
        storyIpId: true,
        storyRegistrationTxHash: true,
        storyRegisteredAt: true,
      },
    })

    // Fire-and-forget: add the game IP to the writer's group IP Asset
    try {
      const { ensureGroupForWriter } = await import('@/domains/story/story-grouping-server')
      const groupResult = await ensureGroupForWriter(actorWallet, storyIpId)
      console.log(`[grouping] Result for ${storyIpId}: ${JSON.stringify(groupResult)}`)
    } catch (groupError) {
      console.warn(`[grouping] Non-critical failure:`, groupError)
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Game Story registration persistence failed:', error)
    return NextResponse.json({ error: 'Failed to save Story registration' }, { status: 500 })
  }
}
