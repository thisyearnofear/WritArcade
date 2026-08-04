import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { VideoGenerationService, type VideoProviderName } from '@/domains/games/services/video-generation.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const actor = await getActor()

    const game = await prisma.game.findUnique({
      where: { slug },
      include: { artifactPanels: { orderBy: { panelIndex: 'asc' } } },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Private games are only visible to the owner.
    if (game.private && game.userId && actor?.user.id !== game.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const panels = game.artifactPanels

    // Refresh any pending panels by polling their provider jobs.
    const refreshedPanels = await Promise.all(
      panels.map(async (panel) => {
        if (panel.videoStatus === 'pending' && panel.videoJobId) {
          const providerName = (panel.videoProvider as VideoProviderName | null) ?? 'mock'
          const result = await VideoGenerationService.poll(panel.videoJobId, providerName)
          if (result.status !== panel.videoStatus || result.videoUrl) {
            await prisma.gameArtifactPanel.update({
              where: { id: panel.id },
              data: {
                videoStatus: result.status,
                videoUrl: result.videoUrl,
                videoError: result.error ?? null,
              },
            })
            return {
              id: panel.id,
              panelIndex: panel.panelIndex,
              videoStatus: result.status,
              videoUrl: result.videoUrl,
            }
          }
        }
        return {
          id: panel.id,
          panelIndex: panel.panelIndex,
          videoStatus: panel.videoStatus,
          videoUrl: panel.videoUrl,
        }
      })
    )

    const overallStatus = (() => {
      if (refreshedPanels.every((p) => p.videoStatus === 'completed')) return 'completed'
      if (refreshedPanels.some((p) => p.videoStatus === 'pending')) return 'pending'
      if (refreshedPanels.every((p) => p.videoStatus === 'failed')) return 'failed'
      // Mix of completed/failed or idle → surface as pending while any work remains.
      return game.videoUpsellStatus
    })()

    // Keep the Game-level status in sync.
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
