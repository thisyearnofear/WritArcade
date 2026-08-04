import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { optionalAuth } from '@/services/auth'
import { ok, notFound, fail } from '@/lib/api-response'
import { z } from 'zod'

const feedbackSchema = z.object({
  npsScore: z.number().int().min(0).max(10),
  npsComment: z.string().optional(),
  fidelityRating: z.number().int().min(1).max(5).optional(),
  narrativeQuality: z.number().int().min(1).max(5).optional(),
  engagementScore: z.number().int().min(1).max(5).optional(),
})

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * POST /api/games/[slug]/feedback
 * Submit feedback after playing a game
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const user = await optionalAuth()

    const body = await request.json()
    const validated = feedbackSchema.parse(body)

    // Find game by slug
    const game = await prisma.game.findUnique({
      where: { slug },
    })

    if (!game) {
      return notFound('Game not found')
    }

    // Create feedback record
    const feedback = await prisma.gameFeedback.create({
      data: {
        gameId: game.id,
        userId: user?.id,
        npsScore: validated.npsScore,
        npsComment: validated.npsComment,
        fidelityRating: validated.fidelityRating,
        narrativeQuality: validated.narrativeQuality,
        engagementScore: validated.engagementScore,
      },
    })

    // Update game's aggregate NPS score
    const allFeedback = await prisma.gameFeedback.findMany({
      where: { gameId: game.id },
    })

    const avgNps = allFeedback.reduce((sum, f) => sum + f.npsScore, 0) / allFeedback.length

    return ok({
      id: feedback.id,
      averageNPS: avgNps,
    })
  } catch (error) {
    console.error('Feedback submission error:', error)

    if (error instanceof z.ZodError) {
      return fail('Invalid feedback data', 400, { details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`) })
    }

    return fail('Failed to submit feedback', 500)
  }
}

/**
 * GET /api/games/[slug]/feedback
 * Get aggregate feedback stats for a game
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params

    const game = await prisma.game.findUnique({
      where: { slug },
      include: { feedbacks: true },
    })

    if (!game) {
      return notFound('Game not found')
    }

    const feedbacks = game.feedbacks

    if (feedbacks.length === 0) {
      return ok({
        totalRatings: 0,
        averageNPS: null,
        averageFidelity: null,
        averageNarrative: null,
        averageEngagement: null,
      })
    }

    const avgNps = feedbacks.reduce((sum, f) => sum + f.npsScore, 0) / feedbacks.length
    const fidelityRatings = feedbacks.filter((f) => f.fidelityRating !== null)
    const narrativeRatings = feedbacks.filter((f) => f.narrativeQuality !== null)
    const engagementRatings = feedbacks.filter((f) => f.engagementScore !== null)

    return ok({
      totalRatings: feedbacks.length,
      averageNPS: Math.round(avgNps * 10) / 10,
      averageFidelity:
        fidelityRatings.length > 0
          ? Math.round((fidelityRatings.reduce((sum, f) => sum + (f.fidelityRating || 0), 0) / fidelityRatings.length) * 10) / 10
          : null,
      averageNarrative:
        narrativeRatings.length > 0
          ? Math.round((narrativeRatings.reduce((sum, f) => sum + (f.narrativeQuality || 0), 0) / narrativeRatings.length) * 10) / 10
          : null,
      averageEngagement:
        engagementRatings.length > 0
          ? Math.round((engagementRatings.reduce((sum, f) => sum + (f.engagementScore || 0), 0) / engagementRatings.length) * 10) / 10
          : null,
    })
  } catch (error) {
    console.error('Feedback retrieval error:', error)
    return fail('Failed to retrieve feedback', 500)
  }
}
