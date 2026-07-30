import { prisma } from '@/lib/database'

export interface PanelChoiceStat {
  choiceIndex: number
  count: number
  label: string | null
}

export interface PanelFunnelStep {
  panelIndex: number
  choices: number
  choiceDistribution: PanelChoiceStat[]
}

export interface ReferrerStat {
  referrer: string | null
  starts: number
}

export interface GameInsights {
  starts: number
  completions: number
  /** completions / starts — null until the sample is meaningful (starts < 5) */
  resonance: number | null
  embeddedStarts: number
  panelFunnel: PanelFunnelStep[]
  referrers: ReferrerStat[]
}

const MIN_STARTS_FOR_RESONANCE = 5
const MAX_PANELS = 5

export class GameInsightsService {
  static async getGameInsights(gameId: string): Promise<GameInsights> {
    const [typeCounts, choiceGroups, choiceLabels, referrerGroups, embeddedStarts] =
      await Promise.all([
        prisma.gamePlayEvent.groupBy({
          by: ['type'],
          where: { gameId },
          _count: { _all: true },
        }),
        prisma.gamePlayEvent.groupBy({
          by: ['panelIndex', 'choiceIndex'],
          where: { gameId, type: 'choice', panelIndex: { not: null } },
          _count: { _all: true },
        }),
        prisma.gamePlayEvent.findMany({
          where: { gameId, type: 'choice', panelIndex: { not: null } },
          distinct: ['panelIndex', 'choiceIndex'],
          select: { panelIndex: true, choiceIndex: true, choiceText: true },
        }),
        prisma.gamePlayEvent.groupBy({
          by: ['referrer'],
          where: { gameId, type: 'started' },
          _count: { _all: true },
        }),
        prisma.gamePlayEvent.count({
          where: { gameId, type: 'started', embedded: true },
        }),
      ])

    const countByType = new Map(typeCounts.map((row) => [row.type, row._count._all]))
    const starts = countByType.get('started') ?? 0
    const completions = countByType.get('completed') ?? 0

    const resonance =
      starts >= MIN_STARTS_FOR_RESONANCE ? completions / starts : null

    const labelByKey = new Map(
      choiceLabels.map((row) => [`${row.panelIndex}:${row.choiceIndex}`, row.choiceText])
    )

    const panelFunnel: PanelFunnelStep[] = []
    for (let panelIndex = 1; panelIndex <= MAX_PANELS; panelIndex++) {
      const groups = choiceGroups.filter((g) => g.panelIndex === panelIndex)
      panelFunnel.push({
        panelIndex,
        choices: groups.reduce((sum, g) => sum + g._count._all, 0),
        choiceDistribution: groups
          .filter((g) => g.choiceIndex !== null)
          .map((g) => ({
            choiceIndex: g.choiceIndex as number,
            count: g._count._all,
            label: labelByKey.get(`${panelIndex}:${g.choiceIndex}`) ?? null,
          }))
          .sort((a, b) => a.choiceIndex - b.choiceIndex),
      })
    }

    const referrers: ReferrerStat[] = referrerGroups
      .map((row) => ({ referrer: row.referrer, starts: row._count._all }))
      .sort((a, b) => b.starts - a.starts)

    return { starts, completions, resonance, embeddedStarts, panelFunnel, referrers }
  }
}
