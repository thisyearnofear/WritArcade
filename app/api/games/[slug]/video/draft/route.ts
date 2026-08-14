import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { checkRateLimit } from '@/services/rate-limit'
import { VideoGenerationService, type VideoStyle } from '@/domains/games/services/video-generation.service'
import { persistMediaUrl } from '@/domains/story/services/media-upload'
import { generateHeroStill } from '@/domains/games/services/video-hero-still.service'
import { config } from '@/lib/config'

/**
 * Stage 2 — FREE "Check the motion" draft clip.
 *
 * Generates a SHORT (3s) single-camera draft from the SAME locked still so the
 * writer can validate motion before committing the 50-credit final reveal.
 * Per-second provider pricing makes a 3s draft genuinely cheaper than the 5s
 * final, and it is free to the user (rate-limited to prevent farming) — so no
 * credit ledger change and no "paying twice": the final is the only paid step.
 * Mirrors the companion-clip async pattern; failure never affects the final.
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
      return NextResponse.json({ error: 'Sign in to preview the motion.' }, { status: 401 })
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

    // Per-panel montage: draft ANY panel (default last/hero). Parse the target.
    const body = await request.json().catch(() => ({})) as { panelIndex?: number }
    const targetPanel = game.artifactPanels.find((p) => p.panelIndex === body.panelIndex) ?? game.artifactPanels[game.artifactPanels.length - 1]
    if (!targetPanel || !targetPanel.imageUrl) {
      return NextResponse.json({ error: 'No panel image to draft. Finish the comic first.' }, { status: 400 })
    }

    // Lock the master frame for this panel (reuse if already previewed).
    let targetStillUrl = targetPanel.videoStillUrl
    if (!targetStillUrl) {
      const locked = await generateHeroStill({
        narrative: targetPanel.narrativeText,
        genre: game.genre,
        primaryColor: game.primaryColor ?? undefined,
      })
      targetStillUrl = locked.imageUrl
        ? (await persistMediaUrl(locked.imageUrl, `writersarcade-${slug}-panel${targetPanel.panelIndex}-still.jpg`)) ?? locked.imageUrl
        : null
    }
    if (!targetStillUrl) {
      return NextResponse.json(
        { error: 'Could not lock a frame for this panel. Try the free preview first.' },
        { status: 502 }
      )
    }

    // Idempotent: return the existing draft clip.
    if (targetPanel.videoDraftUrl) {
      return NextResponse.json({
        success: true,
        data: { draftStatus: 'completed', videoDraftUrl: targetPanel.videoDraftUrl, panelIndex: targetPanel.panelIndex },
      })
    }
    // One active draft at a time; do not restart an in-flight job.
    if (targetPanel.videoDraftStatus === 'pending' && targetPanel.videoDraftJobId) {
      return NextResponse.json({
        success: true,
        data: { draftStatus: 'pending', videoDraftUrl: null, panelIndex: targetPanel.panelIndex },
      })
    }

    const burst = checkRateLimit(`video-draft:${actor.user.id}`)
    if (!burst.allowed) {
      return NextResponse.json(
        { error: 'Draft requests are temporarily limited. Please try again shortly.', resetIn: burst.resetIn },
        { status: 429 }
      )
    }

    // Reserve before touching the provider so a concurrent request cannot start
    // a second draft job.
    const sentinelJob = `draft-${randomBytes(8).toString('hex')}`
    const reserved = await prisma.gameArtifactPanel.updateMany({
            where: { id: targetPanel.id, videoDraftStatus: 'idle', videoDraftJobId: null },
      data: {
        videoDraftStatus: 'pending',
        videoDraftJobId: sentinelJob,
        videoDraftPolledAt: null,
        videoDraftError: null,
      },
    })
    if (reserved.count !== 1) {
      return NextResponse.json({
        success: true,
        data: { draftStatus: 'pending', videoDraftUrl: null },
      })
    }

    let result
    try {
            result = await VideoGenerationService.generate({
        imageUrl: targetStillUrl,
        narrative: targetPanel.narrativeText,
        genre: game.genre,
        panelIndex: targetPanel.panelIndex,
        primaryColor: game.primaryColor ?? undefined,
        style: (targetPanel.videoStyle as VideoStyle | null) ?? 'cinematic',
        // Short and native-ratio: cheap, single-move motion draft.
        aspectRatio: '9:16',
        durationSeconds: 3,
      })
    } catch (error) {
            await prisma.gameArtifactPanel.update({
        where: { id: targetPanel.id },
        data: {
          videoDraftStatus: 'idle',
          videoDraftJobId: null,
          videoDraftError: error instanceof Error ? error.message : 'Draft generation error',
        },
      })
      throw error
    }

    const durableUrl = result.status === 'completed' && result.videoUrl
      ? await persistMediaUrl(result.videoUrl, `writersarcade-${slug}-panel${targetPanel.panelIndex}-draft.mp4`)
      : null

    await prisma.gameArtifactPanel.update({
      where: { id: targetPanel.id },
      data: {
        videoDraftStatus: result.status,
        videoDraftProvider: result.provider,
        videoDraftJobId: result.providerJobId,
        videoDraftError: result.error ?? null,
        videoDraftUrl: (durableUrl ?? result.videoUrl) || null,
        videoDraftPolledAt: result.status === 'pending' ? new Date() : null,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        draftStatus: result.status,
        videoDraftUrl: (durableUrl ?? result.videoUrl) || null,
        panelIndex: targetPanel.panelIndex,
      },
    })
  } catch (error) {
    console.error('[Video Draft] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start the motion draft' },
      { status: 500 }
    )
  }
}