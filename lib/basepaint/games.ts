import { prisma } from '@/lib/prisma'
import { buildBasePaintSourceUrl } from '@/lib/basepaint/source-url'

export interface BasePaintDayGameSummary {
  id: string
  slug: string
  title: string
  imageUrl: string | null
  playCount: number
  score?: number
  playerAddress?: string
}

/** Public games tagged with a BasePaint day via articleUrl or daily challenge session. */
export async function fetchGamesForBasePaintDay(day: number, limit = 12): Promise<BasePaintDayGameSummary[]> {
  const sourceUrl = buildBasePaintSourceUrl(day)

  const [directGames, challengeGames] = await Promise.all([
    prisma.game.findMany({
      where: {
        private: false,
        articleUrl: sourceUrl,
      },
      orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        imageUrl: true,
        playCount: true,
      },
    }),
    prisma.dailyChallengeSession.findMany({
      where: {
        revealed: true,
        challenge: { day, sourceType: 'basepaint' },
      },
      orderBy: { score: 'desc' },
      take: limit,
      select: {
        score: true,
        playerAddress: true,
        game: {
          select: {
            id: true,
            slug: true,
            title: true,
            imageUrl: true,
            playCount: true,
            private: true,
          },
        },
      },
    }),
  ])

  const bySlug = new Map<string, BasePaintDayGameSummary>()

  for (const g of directGames) {
    bySlug.set(g.slug, {
      id: g.id,
      slug: g.slug,
      title: g.title,
      imageUrl: g.imageUrl,
      playCount: g.playCount,
    })
  }

  for (const session of challengeGames) {
    const g = session.game
    if (g.private) continue
    const existing = bySlug.get(g.slug)
    if (existing) {
      if (session.score != null && (existing.score == null || session.score > existing.score)) {
        existing.score = session.score
        existing.playerAddress = session.playerAddress ?? undefined
      }
      continue
    }
    bySlug.set(g.slug, {
      id: g.id,
      slug: g.slug,
      title: g.title,
      imageUrl: g.imageUrl,
      playCount: g.playCount,
      score: session.score ?? undefined,
      playerAddress: session.playerAddress ?? undefined,
    })
  }

  return Array.from(bySlug.values())
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.playCount - a.playCount)
    .slice(0, limit)
}

/** Count public story games per day (for archive index). */
export async function countGamesForBasePaintDay(day: number): Promise<number> {
  const sourceUrl = buildBasePaintSourceUrl(day)
  return prisma.game.count({
    where: { private: false, articleUrl: sourceUrl },
  })
}
