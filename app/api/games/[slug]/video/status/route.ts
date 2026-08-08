import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { VideoGenerationService, type VideoProviderName } from '@/domains/games/services/video-generation.service'
import { persistMediaUrl } from '@/domains/story/services/media-upload'
import { refundVideoCharge } from '@/domains/games/services/video-charge.service'
import { CREDITS_CONFIG } from '@/lib/writer-coins'
import { config } from '@/lib/config'

const STATUS_POLL_MIN_INTERVAL_MS = 25_000

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    if (!config.features.videoPipeline) {
      return NextResponse.json({ error: 'Animation is not available.' }, { status: 404 })
    }
    const actor = await getActor()

    let game = await prisma.game.findUnique({
      where: { slug },
      include: { artifactPanels: { orderBy: { panelIndex: 'asc' } } },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.private && game.userId && actor?.user.id !== game.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Recover a terminally failed or orphaned charged job even if the
    // originating request crashed before it could issue its refund. A pending
    // reservation is reclaimed only after the provider/job window is stale and
    // no panel has a provider job to continue polling.
    const failedPanel = game.artifactPanels.find((panel) => panel.videoStatus === 'failed')
    const hasProviderJob = game.artifactPanels.some((panel) => panel.videoJobId)
    const reservationAge = game.videoUpsoldAt ? Date.now() - new Date(game.videoUpsoldAt).getTime() : 0
    const staleReservation = game.videoUpsellStatus === 'pending' && !hasProviderJob && reservationAge > 15 * 60 * 1000
    if (failedPanel || staleReservation) {
      await refundVideoCharge({
        gameId: game.id,
        userId: game.videoPaymentUserId,
        paymentRef: game.videoPaymentRef,
        cost: CREDITS_CONFIG.cost['video-upsell'],
        slug,
        reason: staleReservation ? 'video-generation-stale-reservation' : 'video-generation-recovery',
      })
      const recoveredGame = await prisma.game.findUnique({
        where: { slug },
        include: { artifactPanels: { orderBy: { panelIndex: 'asc' } } },
      })
      if (recoveredGame) game = recoveredGame
    }

    const panels = game.artifactPanels
    const pendingPanel = panels.find((panel) => panel.videoStatus === 'pending' && panel.videoJobId)

    const refreshedPanels = await Promise.all(
      panels.map(async (panel) => {
        if (pendingPanel?.id === panel.id && panel.videoJobId) {
          const lease = await prisma.gameArtifactPanel.updateMany({
            where: {
              id: panel.id,
              videoStatus: 'pending',
              videoJobId: panel.videoJobId,
              OR: [
                { videoPolledAt: null },
                { videoPolledAt: { lt: new Date(Date.now() - STATUS_POLL_MIN_INTERVAL_MS) } },
              ],
            },
            data: { videoPolledAt: new Date() },
          })
          if (lease.count === 1) {
            const providerName = (panel.videoProvider as VideoProviderName | null) ?? 'mock'
            const polled = await VideoGenerationService.poll(panel.videoJobId, providerName)
            const result = polled.retryable
              ? polled
              : polled.status === 'failed'
                ? await VideoGenerationService.generate({
                    imageUrl: panel.imageUrl ?? '',
                    narrative: panel.narrativeText,
                    genre: game.genre,
                    panelIndex: panel.panelIndex,
                    primaryColor: game.primaryColor ?? undefined,
                    style: (panel.videoStyle as 'cinematic' | 'loop' | 'subtle' | 'dynamic' | null) ?? 'cinematic',
                    excludeProviders: [providerName],
                  })
                : polled

            if (result.retryable) {
              return {
                id: panel.id,
                panelIndex: panel.panelIndex,
                videoStatus: panel.videoStatus,
                videoUrl: panel.videoUrl,
                videoProvider: panel.videoProvider,
                videoError: panel.videoError,
              }
            }

            if (result.status !== panel.videoStatus || result.videoUrl || result.provider !== panel.videoProvider) {
              const durableVideoUrl = result.status === 'completed' && result.videoUrl
                ? await persistMediaUrl(result.videoUrl, `writersarcade-${slug}-hero.mp4`)
                : null
              const persistenceFailed = result.status === 'completed' && !durableVideoUrl
              const effectiveResult = persistenceFailed
                ? { ...result, status: 'failed' as const, videoUrl: null, error: 'Durable media storage is not configured.' }
                : result
              const videoUrl = durableVideoUrl ?? effectiveResult.videoUrl
              await prisma.gameArtifactPanel.update({
                where: { id: panel.id },
                data: {
                  videoStatus: effectiveResult.status,
                  videoProvider: effectiveResult.provider,
                  videoModel: effectiveResult.model,
                  videoJobId: effectiveResult.providerJobId,
                  videoStyle: panel.videoStyle,
                  videoPolledAt: effectiveResult.status === 'pending' ? new Date() : null,
                  videoUrl,
                  videoError: effectiveResult.error ?? null,
                },
              })
              if (effectiveResult.status === 'failed') {
                await refundVideoCharge({
                  gameId: game.id,
                  userId: game.videoPaymentUserId,
                  paymentRef: game.videoPaymentRef,
                  cost: CREDITS_CONFIG.cost['video-upsell'],
                  slug,
                  reason: 'video-generation-terminal-failure',
                })
              }
              return {
                id: panel.id,
                panelIndex: panel.panelIndex,
                videoStatus: effectiveResult.status,
                videoUrl,
                videoProvider: effectiveResult.provider,
                videoError: effectiveResult.error ?? null,
              }
            }
          }
        }
        return {
          id: panel.id,
          panelIndex: panel.panelIndex,
          videoStatus: panel.videoStatus,
          videoUrl: panel.videoUrl,
          videoProvider: panel.videoProvider,
          videoError: panel.videoError,
        }
      })
    )

    const activePanels = refreshedPanels.filter((panel) => panel.videoStatus !== 'idle')
    const overallStatus = (() => {
      if (activePanels.length > 0 && activePanels.every((panel) => panel.videoStatus === 'completed')) return 'completed'
      if (activePanels.some((panel) => panel.videoStatus === 'pending')) return 'pending'
      if (activePanels.length > 0 && activePanels.every((panel) => panel.videoStatus === 'failed')) return 'failed'
      return game.videoUpsellStatus
    })()

    if (game.videoUpsellStatus !== overallStatus) {
      await prisma.game.update({
        where: { id: game.id },
        data: { videoUpsellStatus: overallStatus },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        gameId: game.id,
        status: overallStatus,
        mode: 'hero',
        heroPanelId: refreshedPanels.find((panel) => panel.videoUrl)?.id ?? pendingPanel?.id ?? null,
        panels: refreshedPanels,
      },
    })
  } catch (error) {
    console.error('[Video Status] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get video status' },
      { status: 500 }
    )
  }
}
