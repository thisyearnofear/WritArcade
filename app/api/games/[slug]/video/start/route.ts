import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { VideoGenerationService, type VideoStyle, VIDEO_STYLE_LABELS } from '@/domains/games/services/video-generation.service'
import { CREDITS_CONFIG } from '@/lib/writerCoins'
import { randomBytes } from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const actor = await getActor()
    if (!actor) {
      return NextResponse.json({ error: 'Sign in to animate this comic.' }, { status: 401 })
    }

    const game = await prisma.game.findUnique({
      where: { slug },
      include: { artifactPanels: { orderBy: { panelIndex: 'asc' } } },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Private games can only be animated by the owner.
    if (game.private && game.userId && game.userId !== actor.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const panels = game.artifactPanels
    if (!panels.length) {
      return NextResponse.json(
        { error: 'No saved panels to animate. Finish the comic first.' },
        { status: 400 }
      )
    }

    const panelsWithoutImages = panels.filter((panel) => !panel.imageUrl)
    if (panelsWithoutImages.length > 0) {
      return NextResponse.json(
        { error: `Cannot animate ${panelsWithoutImages.length} panel(s) without images.` },
        { status: 400 }
      )
    }

    // Idempotency: if already completed or in progress, return current state.
    if (game.videoUpsoldAt && game.videoUpsellStatus !== 'failed') {
      const panelData = panels.map((panel) => ({
        id: panel.id,
        panelIndex: panel.panelIndex,
        videoStatus: panel.videoStatus,
        videoUrl: panel.videoUrl,
      }))
      return NextResponse.json({
        success: true,
        data: { gameId: game.id, status: game.videoUpsellStatus, panels: panelData },
      })
    }

    const cost = CREDITS_CONFIG.cost['video-upsell']
    if (actor.user.credits < cost) {
      return NextResponse.json(
        {
          error: `Insufficient credits. You need ${cost} credits but have ${actor.user.credits}.`,
          credits: actor.user.credits,
          required: cost,
        },
        { status: 402 }
      )
    }

    // Charge credits and mark upsell as started.
    const sentinelHash = `credits:${randomBytes(16).toString('hex')}`
    await prisma.$transaction([
      prisma.user.update({
        where: { id: actor.user.id },
        data: { credits: { decrement: cost } },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: actor.user.id,
          fiatAmount: 0,
          creditAmount: -cost,
          status: 'completed',
          completedAt: new Date(),
        },
      }),
      prisma.payment.create({
        data: {
          transactionHash: sentinelHash,
          action: 'video-upsell',
          amount: cost,
          status: 'verified',
          verifiedAt: new Date(),
          writerCoinId: 'credits',
          userId: actor.user.id,
          walletAddress: actor.user.walletAddress ?? null,
        },
      }),
      prisma.game.update({
        where: { id: game.id },
        data: { videoUpsoldAt: new Date(), videoUpsellStatus: 'pending' },
      }),
    ])

    // Read optional animation style from the request body.
    const body = await request.json().catch(() => ({})) as { style?: VideoStyle }
    const style = body?.style && VIDEO_STYLE_LABELS[body.style] ? body.style : 'cinematic'

    // Kick off video generation jobs in parallel.
    const generationResults = await Promise.all(
      panels.map((panel) =>
        VideoGenerationService.generate({
          imageUrl: panel.imageUrl ?? '',
          narrative: panel.narrativeText,
          genre: game.genre,
          panelIndex: panel.panelIndex,
          primaryColor: game.primaryColor ?? undefined,
          style,
        })
      )
    )

    // Persist job ids and statuses.
    await Promise.all(
      panels.map((panel, index) =>
        prisma.gameArtifactPanel.update({
          where: { id: panel.id },
          data: {
            videoStatus: generationResults[index].status,
            videoProvider: generationResults[index].provider,
            videoModel: generationResults[index].model,
            videoJobId: generationResults[index].providerJobId,
            videoUrl: generationResults[index].videoUrl,
            videoError: generationResults[index].error ?? null,
          },
        })
      )
    )

    const panelData = panels.map((panel, index) => ({
      id: panel.id,
      panelIndex: panel.panelIndex,
      videoStatus: generationResults[index].status,
      videoUrl: generationResults[index].videoUrl,
    }))

    return NextResponse.json({
      success: true,
      data: { gameId: game.id, status: 'pending', panels: panelData },
    })
  } catch (error) {
    console.error('[Video Start] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start video generation' },
      { status: 500 }
    )
  }
}
