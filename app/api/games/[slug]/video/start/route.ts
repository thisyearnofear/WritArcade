import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { checkRateLimit } from '@/services/rate-limit'
import {
  VideoGenerationService,
  type VideoStyle,
  VIDEO_STYLE_LABELS,
  getVideoDurationSeconds,
} from '@/domains/games/services/video-generation.service'
import { CREDITS_CONFIG } from '@/lib/writerCoins'
import { config } from '@/lib/config'
import { persistMediaUrl } from '@/domains/story/services/media-upload'
import { refundVideoCharge } from '@/domains/games/services/video-charge.service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    if (!config.features.videoPipeline) {
      return NextResponse.json({ error: 'Animation is not available.' }, { status: 404 })
    }
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

    // The social artifact is the ending reveal: animate only the final panel
    // first. The existing per-panel schema remains available for a later full
    // montage without making launch requests fan out across five providers.
    const heroPanel = panels[panels.length - 1]
    if (!heroPanel.imageUrl) {
      return NextResponse.json(
        { error: 'The ending panel has no image to animate. Regenerate it first.' },
        { status: 400 }
      )
    }

    const burst = checkRateLimit(`video:${actor.user.id}`)
    if (!burst.allowed) {
      return NextResponse.json(
        { error: 'Animation requests are temporarily limited. Please try again shortly.', resetIn: burst.resetIn },
        { status: 429 }
      )
    }

    const sentinelHash = `credits:${randomBytes(16).toString('hex')}`

    // Reserve the game atomically before charging. This prevents two rapid
    // clicks or duplicate requests from creating two paid jobs. The payment
    // reference is stored with the reservation so a later recovery/refund can
    // identify the charge even if the provider call fails.
    const reservation = await prisma.game.updateMany({
      where: {
        id: game.id,
        OR: [
          { videoUpsoldAt: null },
          {
            videoUpsellStatus: 'failed',
            OR: [
              { videoChargeRefundedAt: { not: null } },
              { videoPaymentRef: null },
            ],
          },
        ],
      },
      data: {
        videoUpsoldAt: new Date(),
        videoUpsellStatus: 'pending',
        videoPaymentRef: sentinelHash,
        videoPaymentUserId: actor.user.id,
        videoChargeRefundedAt: null,
      },
    })

    if (reservation.count === 0) {
      const current = await prisma.game.findUnique({
        where: { id: game.id },
        select: { videoUpsellStatus: true },
      })
      return NextResponse.json({
        success: true,
        data: {
          gameId: game.id,
          status: current?.videoUpsellStatus ?? 'pending',
          mode: 'hero',
          heroPanelId: heroPanel.id,
          panels: [{
            id: heroPanel.id,
            panelIndex: heroPanel.panelIndex,
            videoStatus: heroPanel.videoStatus,
            videoUrl: heroPanel.videoUrl,
          }],
        },
      })
    }

    const cost = CREDITS_CONFIG.cost['video-upsell']
    if (actor.user.credits < cost) {
      await prisma.game.update({
        where: { id: game.id },
        data: { videoUpsoldAt: null, videoUpsellStatus: 'idle', videoPaymentRef: null, videoPaymentUserId: null, videoChargeRefundedAt: null },
      })
      return NextResponse.json(
        {
          error: `Insufficient credits. You need ${cost} credits but have ${actor.user.credits}.`,
          credits: actor.user.credits,
          required: cost,
        },
        { status: 402 }
      )
    }

    const body = await request.json().catch(() => ({})) as { style?: VideoStyle }
    const style = body?.style && VIDEO_STYLE_LABELS[body.style] ? body.style : 'cinematic'

    // Reserve the credit before starting work. If every provider rejects the
    // request immediately, refund it below so users never pay for no job.
    try {
      await prisma.$transaction(async (tx) => {
        const debit = await tx.user.updateMany({
          where: { id: actor.user.id, credits: { gte: cost } },
          data: { credits: { decrement: cost } },
        })
        if (debit.count !== 1) {
          throw new Error('INSUFFICIENT_CREDITS')
        }

        await tx.creditTransaction.create({
          data: {
            userId: actor.user.id,
            fiatAmount: 0,
            creditAmount: -cost,
            status: 'completed',
            completedAt: new Date(),
          },
        })
        await tx.payment.create({
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
        })
      })
    } catch (error) {
      await prisma.game.update({
        where: { id: game.id },
        data: { videoUpsoldAt: null, videoUpsellStatus: 'idle', videoPaymentRef: null, videoPaymentUserId: null, videoChargeRefundedAt: null },
      })
      if (error instanceof Error && error.message === 'INSUFFICIENT_CREDITS') {
        return NextResponse.json(
          { error: `Insufficient credits. You need ${cost} credits.`, required: cost },
          { status: 402 },
        )
      }
      throw error
    }

    let result
    try {
      result = await VideoGenerationService.generate({
        imageUrl: heroPanel.imageUrl,
        narrative: heroPanel.narrativeText,
        genre: game.genre,
        panelIndex: heroPanel.panelIndex,
        primaryColor: game.primaryColor ?? undefined,
        style,
      })
    } catch (error) {
      await refundVideoCharge({
        gameId: game.id,
        userId: actor.user.id,
        paymentRef: sentinelHash,
        cost,
        slug,
        reason: 'video-generation-request-error',
      })
      throw error
    }

    const durableVideoUrl = result.status === 'completed' && result.videoUrl
      ? await persistMediaUrl(result.videoUrl, `writersarcade-${slug}-hero.mp4`)
      : null
    const persistenceFailed = result.status === 'completed' && !durableVideoUrl
    const effectiveResult = persistenceFailed
      ? { ...result, status: 'failed' as const, videoUrl: null, error: 'Durable media storage is not configured.' }
      : result
    const videoUrl = durableVideoUrl ?? effectiveResult.videoUrl

    await prisma.gameArtifactPanel.update({
      where: { id: heroPanel.id },
      data: {
        videoStatus: effectiveResult.status,
        videoProvider: effectiveResult.provider,
        videoModel: effectiveResult.model,
        videoJobId: effectiveResult.providerJobId,
        videoStyle: style,
        videoPolledAt: null,
        videoUrl,
        videoError: effectiveResult.error ?? null,
      },
    })

    await prisma.game.update({
      where: { id: game.id },
      data: { videoUpsellStatus: effectiveResult.status },
    })

    if (effectiveResult.status === 'failed') {
      await refundVideoCharge({
        gameId: game.id,
        userId: actor.user.id,
        paymentRef: sentinelHash,
        cost,
        slug,
        reason: 'video-generation-immediate-failure',
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        gameId: game.id,
        status: effectiveResult.status,
        mode: 'hero',
        heroPanelId: heroPanel.id,
        durationSeconds: getVideoDurationSeconds(),
        panels: [{
          id: heroPanel.id,
          panelIndex: heroPanel.panelIndex,
          videoStatus: effectiveResult.status,
          videoUrl,
        }],
      },
    })
  } catch (error) {
    console.error('[Video Start] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start video generation' },
      { status: 500 }
    )
  }
}
