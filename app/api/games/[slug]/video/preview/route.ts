import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { checkRateLimit } from '@/services/rate-limit'
import { generateHeroStill } from '@/domains/games/services/video-hero-still.service'
import { persistMediaUrl } from '@/domains/story/services/media-upload'
import { config } from '@/lib/config'

/**
 * Stage 1 — FREE "Preview & lock the look".
 *
 * Generates + persists the locked, type-free "real scene" hero still BEFORE any
 * credit is spent on video. This is the cheap validation step: stills are cheap
 * and video is where credits die, so we let the writer see the master frame and
 * approve it before committing to the 50-credit reveal. No probe is charged and
 * the result is idempotent — calling again returns the existing still so the
 * paid "Animate" action reuses it (via `videoStillUrl`) instead of regenerating.
 */
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
      return NextResponse.json({ error: 'Sign in to preview the animation.' }, { status: 401 })
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

    const body = await request.json().catch(() => ({})) as { panelIndex?: number }
    const artifactPanels = game.artifactPanels
    // Per-panel montage: default to the hero (last) panel but allow locking the
    // look for ANY panel, one at a time, before any credit spend.
    const targetPanel = artifactPanels.find((p) => p.panelIndex === body.panelIndex) ?? artifactPanels[artifactPanels.length - 1]
    if (!targetPanel || !targetPanel.imageUrl) {
      return NextResponse.json({ error: 'No panel image to preview. Finish the comic first.' }, { status: 400 })
    }

    // Idempotent: return the already-locked master still.
    if (targetPanel.videoStillUrl) {
      return NextResponse.json({
        success: true,
        data: { previewUrl: targetPanel.videoStillUrl, alreadyLocked: true, panelIndex: targetPanel.panelIndex },
      })
    }

    // Bound free still generation so it cannot be farmed.
    const burst = checkRateLimit(`video-preview:${actor.user.id}`)
    if (!burst.allowed) {
      return NextResponse.json(
        { error: 'Preview requests are temporarily limited. Please try again shortly.', resetIn: burst.resetIn },
        { status: 429 }
      )
    }

    const heroStill = await generateHeroStill({
      narrative: targetPanel.narrativeText,
      genre: game.genre,
      primaryColor: game.primaryColor ?? undefined,
    })
    if (!heroStill.imageUrl) {
      return NextResponse.json({ error: 'Could not generate a preview still.' }, { status: 502 })
    }

    const durableStillUrl =
      (await persistMediaUrl(heroStill.imageUrl, `writersarcade-${slug}-panel${targetPanel.panelIndex}-still.jpg`)) ??
      heroStill.imageUrl

    await prisma.gameArtifactPanel.update({
      where: { id: targetPanel.id },
      data: { videoStillUrl: durableStillUrl },
    })

    return NextResponse.json({
      success: true,
      data: { previewUrl: durableStillUrl, alreadyLocked: false, panelIndex: targetPanel.panelIndex },
    })
  } catch (error) {
    console.error('[Video Preview] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to preview the animation' },
      { status: 500 }
    )
  }
}