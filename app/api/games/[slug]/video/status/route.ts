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
                videoStillUrl: panel.videoStillUrl,
                videoCompanionUrl: panel.videoCompanionUrl,
                videoCompanionStatus: panel.videoCompanionStatus,
                videoDraftUrl: panel.videoDraftUrl,
                videoDraftStatus: panel.videoDraftStatus,
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
                videoStillUrl: panel.videoStillUrl,
                videoCompanionUrl: panel.videoCompanionUrl,
                videoCompanionStatus: panel.videoCompanionStatus,
                videoDraftUrl: panel.videoDraftUrl,
                videoDraftStatus: panel.videoDraftStatus,
              }
            }
          }
        }
        // Poll the companion wide clip (native 16:9) independently so it never
        // overwrites the primary hero clip's URL or status. Sentinel job ids
        // ('companion-…') are placeholders reserved before the real provider job
        // exists and must not be polled.
        let companionUrl = panel.videoCompanionUrl
        let companionStatus = panel.videoCompanionStatus
        const companionJobId = panel.videoCompanionJobId

        // Recover a stale sentinel reservation: a job id left as 'companion-…'
        // means the route crashed before the real provider job was registered.
        // Release it after the window so a retry can start fresh.
        if (
          panel.videoCompanionStatus === 'pending' &&
          companionJobId?.startsWith('companion-')
        ) {
          const companionAge = panel.videoCompanionPolledAt
            ? Date.now() - new Date(panel.videoCompanionPolledAt).getTime()
            : Infinity
          if (companionAge > 15 * 60 * 1000) {
            await prisma.gameArtifactPanel.update({
              where: { id: panel.id },
              data: { videoCompanionStatus: 'idle', videoCompanionJobId: null, videoCompanionPolledAt: null },
            })
            companionStatus = 'idle'
          }
        }

        if (
          panel.videoCompanionStatus === 'pending' &&
          companionJobId &&
          !companionJobId.startsWith('companion-')
        ) {
          const companionLease = await prisma.gameArtifactPanel.updateMany({
            where: {
              id: panel.id,
              videoCompanionStatus: 'pending',
              videoCompanionJobId: companionJobId,
              OR: [
                { videoCompanionPolledAt: null },
                { videoCompanionPolledAt: { lt: new Date(Date.now() - STATUS_POLL_MIN_INTERVAL_MS) } },
              ],
            },
            data: { videoCompanionPolledAt: new Date() },
          })
          if (companionLease.count === 1) {
            const companionProvider = (panel.videoCompanionProvider as VideoProviderName | null) ?? 'mock'
            const companionResult = await VideoGenerationService.poll(companionJobId, companionProvider)
            if (
              !companionResult.retryable &&
              (companionResult.status !== panel.videoCompanionStatus ||
              companionResult.videoUrl ||
              companionResult.provider !== panel.videoCompanionProvider)
            ) {
              const durableCompanion = companionResult.status === 'completed' && companionResult.videoUrl
                ? await persistMediaUrl(companionResult.videoUrl, `writersarcade-${slug}-hero-wide.mp4`)
                : null
              const companionUrlFinal = (durableCompanion ?? companionResult.videoUrl) || null
              await prisma.gameArtifactPanel.update({
                where: { id: panel.id },
                data: {
                  videoCompanionStatus: companionResult.status,
                  videoCompanionProvider: companionResult.provider,
                  videoCompanionJobId: companionResult.providerJobId ?? companionJobId,
                  videoCompanionError: companionResult.error ?? null,
                  videoCompanionUrl: companionUrlFinal,
                  videoCompanionPolledAt: companionResult.status === 'pending' ? new Date() : null,
                },
              })
              companionUrl = companionUrlFinal
              companionStatus = companionResult.status
            }
          }
        }

        // Poll the free motion draft clip independently (mirrors companion).
        let draftUrl = panel.videoDraftUrl
        let draftStatus = panel.videoDraftStatus
        const draftJobId = panel.videoDraftJobId

        // Recover a stale sentinel reservation ('draft-…' = crashed before the
        // real provider job was registered).
        if (panel.videoDraftStatus === 'pending' && draftJobId?.startsWith('draft-')) {
          const draftAge = panel.videoDraftPolledAt
            ? Date.now() - new Date(panel.videoDraftPolledAt).getTime()
            : Infinity
          if (draftAge > 15 * 60 * 1000) {
            await prisma.gameArtifactPanel.update({
              where: { id: panel.id },
              data: { videoDraftStatus: 'idle', videoDraftJobId: null, videoDraftPolledAt: null },
            })
            draftStatus = 'idle'
          }
        }

        if (
          panel.videoDraftStatus === 'pending' &&
          draftJobId &&
          !draftJobId.startsWith('draft-')
        ) {
          const draftLease = await prisma.gameArtifactPanel.updateMany({
            where: {
              id: panel.id,
              videoDraftStatus: 'pending',
              videoDraftJobId: draftJobId,
              OR: [
                { videoDraftPolledAt: null },
                { videoDraftPolledAt: { lt: new Date(Date.now() - STATUS_POLL_MIN_INTERVAL_MS) } },
              ],
            },
            data: { videoDraftPolledAt: new Date() },
          })
          if (draftLease.count === 1) {
            const draftProvider = (panel.videoDraftProvider as VideoProviderName | null) ?? 'mock'
            const draftResult = await VideoGenerationService.poll(draftJobId, draftProvider)
            if (
              !draftResult.retryable &&
              (draftResult.status !== panel.videoDraftStatus ||
              draftResult.videoUrl ||
              draftResult.provider !== panel.videoDraftProvider)
            ) {
              const durableDraft = draftResult.status === 'completed' && draftResult.videoUrl
                ? await persistMediaUrl(draftResult.videoUrl, `writersarcade-${slug}-hero-draft.mp4`)
                : null
              const draftUrlFinal = (durableDraft ?? draftResult.videoUrl) || null
              await prisma.gameArtifactPanel.update({
                where: { id: panel.id },
                data: {
                  videoDraftStatus: draftResult.status,
                  videoDraftProvider: draftResult.provider,
                  videoDraftJobId: draftResult.providerJobId ?? draftJobId,
                  videoDraftError: draftResult.error ?? null,
                  videoDraftUrl: draftUrlFinal,
                  videoDraftPolledAt: draftResult.status === 'pending' ? new Date() : null,
                },
              })
              draftUrl = draftUrlFinal
              draftStatus = draftResult.status
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
          videoStillUrl: panel.videoStillUrl,
          videoCompanionUrl: companionUrl,
          videoCompanionStatus: companionStatus,
          videoDraftUrl: draftUrl,
          videoDraftStatus: draftStatus,
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
