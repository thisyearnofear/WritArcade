import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGroupBy = vi.fn()
const mockFindMany = vi.fn()
const mockCount = vi.fn()

vi.mock('@/lib/database', () => ({
  prisma: {
    gamePlayEvent: {
      groupBy: (...args: unknown[]) => mockGroupBy(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}))

// groupBy is called twice (type counts, then choice groups) then referrers —
// dispatch on the `by` argument so ordering doesn't matter.
function setupPrisma({
  typeCounts = [] as Array<{ type: string; _count: { _all: number } }>,
  choiceGroups = [] as Array<{ panelIndex: number; choiceIndex: number; _count: { _all: number } }>,
  choiceLabels = [] as Array<{ panelIndex: number; choiceIndex: number; choiceText: string | null }>,
  referrerGroups = [] as Array<{ referrer: string | null; _count: { _all: number } }>,
  embeddedStarts = 0,
}) {
  mockGroupBy.mockImplementation((args: { by: string[] }) => {
    if (args.by.includes('type')) return Promise.resolve(typeCounts)
    if (args.by.includes('choiceIndex')) return Promise.resolve(choiceGroups)
    if (args.by.includes('referrer')) return Promise.resolve(referrerGroups)
    return Promise.resolve([])
  })
  mockFindMany.mockResolvedValue(choiceLabels)
  mockCount.mockResolvedValue(embeddedStarts)
}

describe('GameInsightsService.getGameInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('computes resonance and exact funnel numbers from seeded events', async () => {
    setupPrisma({
      typeCounts: [
        { type: 'started', _count: { _all: 10 } },
        { type: 'completed', _count: { _all: 4 } },
      ],
      choiceGroups: [
        { panelIndex: 1, choiceIndex: 1, _count: { _all: 6 } },
        { panelIndex: 1, choiceIndex: 2, _count: { _all: 3 } },
        { panelIndex: 2, choiceIndex: 1, _count: { _all: 5 } },
      ],
      choiceLabels: [
        { panelIndex: 1, choiceIndex: 1, choiceText: 'Investigate the vault' },
        { panelIndex: 1, choiceIndex: 2, choiceText: 'Call for backup' },
        { panelIndex: 2, choiceIndex: 1, choiceText: 'Open the door' },
      ],
      referrerGroups: [
        { referrer: 'newsletter-june', _count: { _all: 7 } },
        { referrer: null, _count: { _all: 3 } },
      ],
      embeddedStarts: 6,
    })

    const { GameInsightsService } = await import('@/domains/games/services/game-insights.service')
    const insights = await GameInsightsService.getGameInsights('game-1')

    expect(insights.starts).toBe(10)
    expect(insights.completions).toBe(4)
    expect(insights.resonance).toBeCloseTo(0.4)
    expect(insights.embeddedStarts).toBe(6)

    // Funnel: panel 1 = 9 choices, panel 2 = 5, panels 3-5 = 0
    expect(insights.panelFunnel).toHaveLength(5)
    expect(insights.panelFunnel[0]).toMatchObject({ panelIndex: 1, choices: 9 })
    expect(insights.panelFunnel[1]).toMatchObject({ panelIndex: 2, choices: 5 })
    expect(insights.panelFunnel[2].choices).toBe(0)
    expect(insights.panelFunnel[4].choices).toBe(0)

    // Choice distribution sorted by choiceIndex with labels
    expect(insights.panelFunnel[0].choiceDistribution).toEqual([
      { choiceIndex: 1, count: 6, label: 'Investigate the vault' },
      { choiceIndex: 2, count: 3, label: 'Call for backup' },
    ])

    // Referrers sorted by starts descending
    expect(insights.referrers).toEqual([
      { referrer: 'newsletter-june', starts: 7 },
      { referrer: null, starts: 3 },
    ])
  })

  it('returns null resonance below 5 starts (no premature percentages)', async () => {
    setupPrisma({
      typeCounts: [
        { type: 'started', _count: { _all: 4 } },
        { type: 'completed', _count: { _all: 4 } },
      ],
    })

    const { GameInsightsService } = await import('@/domains/games/services/game-insights.service')
    const insights = await GameInsightsService.getGameInsights('game-1')

    expect(insights.starts).toBe(4)
    expect(insights.resonance).toBeNull()
  })

  it('handles zero events without dividing by zero', async () => {
    setupPrisma({})

    const { GameInsightsService } = await import('@/domains/games/services/game-insights.service')
    const insights = await GameInsightsService.getGameInsights('game-1')

    expect(insights.starts).toBe(0)
    expect(insights.completions).toBe(0)
    expect(insights.resonance).toBeNull()
    expect(insights.embeddedStarts).toBe(0)
    expect(insights.panelFunnel.every((step) => step.choices === 0)).toBe(true)
    expect(insights.referrers).toEqual([])
  })

  it('resonance appears at exactly 5 starts', async () => {
    setupPrisma({
      typeCounts: [
        { type: 'started', _count: { _all: 5 } },
        { type: 'completed', _count: { _all: 1 } },
      ],
    })

    const { GameInsightsService } = await import('@/domains/games/services/game-insights.service')
    const insights = await GameInsightsService.getGameInsights('game-1')

    expect(insights.resonance).toBeCloseTo(0.2)
  })
})
