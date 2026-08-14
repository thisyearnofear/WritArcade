import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { checkRateLimit } from '@/services/rate-limit'
import { VideoGenerationService, type VideoProviderName, type VideoStyle } from '@/domains/games/services/video-generation.service'
import { persistMediaUrl } from '@/domains/story/services/media-upload'
import { config } from '@/lib/config'

/**
 * Companion "wide" clip (native 16:9) derived from the SAME locked still as the
 * vertical 9:16 hero. Best-effort and idempotent: it is included in the already
 * paid "Animate" upsell (no additional credit charge), and its failure never
 * affects the primary hero clip. Video must be generated at native ratio per
 * platform — we never crop the vertical hero into a wide frame.
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
      return NextResponse.json({ error: 'Sign in to add a wide version.' }, { status: 401 })
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
    const heroPanel = panels[panels.length - 1]
    // Companion requires a completed hero AND the locked still as the master frame.
    if (!heroPanel || heroPanel.videoStatus !== 'completed' || !heroPanel.videoUrl || !heroPanel.videoStillUrl) {
      return NextResponse.json(
        { error: 'Animate the ending first so we have a still to work from.' },
        { status: 400 }
      )
    }

    // Idempotent: return the existing wide clip if already produced.
    if (heroPanel.videoCompanionUrl) {
      return NextResponse.json({
        success: true,
        data: { companionStatus: 'completed', videoCompanionUrl: heroPanel.videoCompanionUrl },
      })
    }
    // One active companion job at a time; do not restart an in-flight job.
    if (heroPanel.videoCompanionStatus === 'pending' && heroPanel.videoCompanionJobId) {
      return NextResponse.json({
        success: true,
        data: { companionStatus: 'pending', videoCompanionUrl: null },
      })
    }

    const burst = checkRateLimit(`video-companion:${actor.user.id}`)
    if (!burst.allowed) {
      return NextResponse.json(
        { error: 'Requests are temporarily limited. Please try again shortly.', resetIn: burst.resetIn },
        { status: 429 }
      )
    }

    // Reserve the companion job (no charge — it is part of the paid upsell) before
    // touching the provider, so a concurrent request cannot start a second job.
    const sentinelJob = `companion-${randomBytes(8).toString('hex')}`
    const reserved = await prisma.gameArtifactPanel.updateMany({
      where: { id: heroPanel.id, videoCompanionStatus: 'idle', videoCompanionJobId: null },
      data: {
        videoCompanionStatus: 'pending',
        videoCompanionJobId: sentinelJob,
        videoCompanionPolledAt: null,
        videoCompanionError: null,
      },
    })
    if (reserved.count !== 1) {
      // Another request already claimed it.
      return NextResponse.json({
        success: true,
        data: { companionStatus: 'pending', videoCompanionUrl: null },
      })
    }

    let result
    try {
      result = await VideoGenerationService.generate({
        imageUrl: heroPanel.videoStillUrl,
        narrative: heroPanel.narrativeText,
        genre: game.genre,
        panelIndex: heroPanel.panelIndex,
        primaryColor: game.primaryColor ?? undefined,
        style: (heroPanel.videoStyle as VideoStyle | null) ?? 'cinematic',
        // Native complement ratio: wide 16:9 version of the vertical hero.
        aspectRatio: '16:9',
      })
    } catch (error) {
      await prisma.gameArtifactPanel.update({
        where: { id: heroPanel.id },
        data: {
          videoCompanionStatus: 'idle',
          videoCompanionJobId: null,
          videoCompanionError: error instanceof Error ? error.message : 'Companion generation error',
        },
      })
      throw error
    }

    const durableUrl = result.status === 'completed' && result.videoUrl
      ? await persistMediaUrl(result.videoUrl, `writersarcade-${slug}-hero-wide.mp4`)
      : null

    await prisma.gameArtifactPanel.update({
      where: { id: heroPanel.id },
      data: {
        videoCompanionStatus: result.status,
        videoCompanionProvider: result.provider,
        videoCompanionJobId: result.providerJobId,
        videoCompanionError: result.error ?? null,
        videoCompanionUrl: (durableUrl ?? result.videoUrl) || null,
        videoCompanionPolledAt: result.status === 'pending' ? new Date() : null,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        companionStatus: result.status,
        videoCompanionUrl: (durableUrl ?? result.videoUrl) || null,
      },
    })
  } catch (error) {
    console.error('[Video Companion] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start wide-version generation' },
      { status: 500 }
    )
  }
}