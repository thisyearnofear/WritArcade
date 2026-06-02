import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    const { walletAddress, storyIpId, transactionHash } = body

    if (!isAddress(walletAddress)) {
      return NextResponse.json({ error: 'Valid wallet address is required' }, { status: 400 })
    }

    if (!isAddress(storyIpId)) {
      return NextResponse.json({ error: 'Valid Story IP ID is required' }, { status: 400 })
    }

    if (!isHash(transactionHash)) {
      return NextResponse.json({ error: 'Valid transaction hash is required' }, { status: 400 })
    }

    const game = await prisma.game.findUnique({
      where: { slug },
      include: { user: true },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const ownerWallet = game.user?.walletAddress || game.creatorWallet || ''
    if (ownerWallet.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized: You do not own this game' }, { status: 403 })
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
      const groupResult = await ensureGroupForWriter(walletAddress, storyIpId)
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
