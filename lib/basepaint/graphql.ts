import { BASEPAINT_GRAPHQL_URL } from '@/lib/basepaint/constants'
import type { BasePaintCanvasStats, BasePaintContributor } from '@/lib/basepaint/types'

const CANVAS_QUERY = `
  query BasePaintCanvas($day: Int!, $limit: Int!) {
    canvas(id: $day) {
      id
      name
      palette
      size
      pixelsCount
      totalArtists
      totalMints
      proposer
      contributions(orderBy: "pixelsCount", orderDirection: "desc", limit: $limit) {
        items {
          pixelsCount
          account { id }
        }
      }
    }
  }
`

interface GraphQLCanvasResponse {
  canvas: {
    id: number
    name: string
    palette: string
    size: number
    pixelsCount: number
    totalArtists: number
    totalMints: number
    proposer?: string | null
    contributions: {
      items: Array<{
        pixelsCount: number
        account: { id: string } | null
      }>
    }
  } | null
}

function parseGraphQLPalette(raw: string): string[] {
  if (!raw) return []
  return raw.split(',').map((c) => {
    const trimmed = c.trim()
    return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  })
}

async function basePaintGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(BASEPAINT_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(`BasePaint GraphQL HTTP ${response.status}`)
  }

  const json = (await response.json()) as { data?: T; errors?: Array<{ message: string }> }
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '))
  }
  if (!json.data) {
    throw new Error('BasePaint GraphQL returned no data')
  }
  return json.data
}

const canvasStatsCache = new Map<number, Promise<BasePaintCanvasStats | null>>()

/**
 * On-chain canvas stats + top contributors via GraphQL indexer.
 * Cached per day for 5 minutes (Next fetch revalidate + in-memory dedupe).
 */
export function fetchBasePaintCanvasStats(
  day: number,
  contributorLimit = 5
): Promise<BasePaintCanvasStats | null> {
  let pending = canvasStatsCache.get(day)
  if (!pending) {
    pending = (async () => {
      try {
        const data = await basePaintGraphQL<GraphQLCanvasResponse>(CANVAS_QUERY, {
          day,
          limit: contributorLimit,
        })
        const canvas = data.canvas
        if (!canvas) return null

        const topContributors: BasePaintContributor[] = canvas.contributions.items
          .filter((item) => item.account?.id)
          .map((item) => ({
            address: item.account!.id,
            pixelsCount: item.pixelsCount,
          }))

        return {
          day: canvas.id,
          name: canvas.name,
          palette: parseGraphQLPalette(canvas.palette),
          size: canvas.size,
          pixelsCount: canvas.pixelsCount,
          totalArtists: canvas.totalArtists,
          totalMints: canvas.totalMints,
          proposer: canvas.proposer ?? undefined,
          topContributors,
        }
      } catch (err) {
        console.error('[BasePaint] GraphQL canvas stats failed:', err)
        return null
      }
    })()

    canvasStatsCache.set(day, pending)
    if (canvasStatsCache.size > 14) {
      const oldest = canvasStatsCache.keys().next().value
      if (oldest !== undefined) canvasStatsCache.delete(oldest)
    }
  }
  return pending
}

// ── Strokes (on-chain replay) ─────────────────────────────────────────────

const STROKES_PAGE_QUERY = `
  query BasePaintStrokes($day: Int!, $limit: Int!, $after: String) {
    canvas(id: $day) {
      size
      palette
      strokes(orderBy: "id", orderDirection: "asc", limit: $limit, after: $after) {
        items { id data }
        pageInfo { endCursor hasNextPage }
        totalCount
      }
    }
  }
`

export interface BasePaintStrokeBundle {
  day: number
  size: number
  palette: string[]
  strokeData: string[]
  totalStrokes: number
}

const strokeBundleCache = new Map<number, Promise<BasePaintStrokeBundle | null>>()

type StrokesPageResponse = {
  canvas: {
    size: number
    palette: string
    strokes: {
      items: Array<{ id: string; data: string }>
      pageInfo: { endCursor: string | null; hasNextPage: boolean }
      totalCount: number
    }
  } | null
}

/** Fetch all stroke data for a day (cursor-paginated server-side). */
export function fetchBasePaintStrokeBundle(day: number): Promise<BasePaintStrokeBundle | null> {
  let pending = strokeBundleCache.get(day)
  if (!pending) {
    pending = (async () => {
      try {
        const strokeData: string[] = []
        let after: string | null = null
        let size = 256
        let palette: string[] = []
        let totalStrokes = 0

        for (let page = 0; page < 50; page++) {
          const data: StrokesPageResponse = await basePaintGraphQL<StrokesPageResponse>(
            STROKES_PAGE_QUERY,
            {
              day,
              limit: 100,
              after,
            }
          )

          const canvas = data.canvas
          if (!canvas) return null

          size = canvas.size
          palette = parseGraphQLPalette(canvas.palette)
          totalStrokes = canvas.strokes.totalCount
          strokeData.push(...canvas.strokes.items.map((s: { data: string }) => s.data))

          if (!canvas.strokes.pageInfo.hasNextPage) break
          after = canvas.strokes.pageInfo.endCursor
          if (!after) break
        }

        return { day, size, palette, strokeData, totalStrokes }
      } catch (err) {
        console.error('[BasePaint] Stroke fetch failed:', err)
        return null
      }
    })()

    strokeBundleCache.set(day, pending)
    if (strokeBundleCache.size > 7) {
      const oldest = strokeBundleCache.keys().next().value
      if (oldest !== undefined) strokeBundleCache.delete(oldest)
    }
  }
  return pending
}

// ── Collector balances ────────────────────────────────────────────────────

const BASEPAINT_NFT_CONTRACT = '0xBa5e05cb26b78eDa3A2f8e3b3814726305dcAc83'

const ACCOUNT_BALANCES_QUERY = `
  query BasePaintAccountBalances($id: String!, $limit: Int!) {
    account(id: $id) {
      id
      balances(limit: $limit) {
        items {
          tokenId
          value
          contract
        }
      }
    }
  }
`

export interface BasePaintOwnedCanvas {
  day: number
  balance: number
}

export async function fetchBasePaintOwnedCanvases(
  address: string,
  limit = 200
): Promise<BasePaintOwnedCanvas[]> {
  try {
    const data = await basePaintGraphQL<{
      account: {
        balances: {
          items: Array<{ tokenId: string; value: number; contract: string }>
        }
      } | null
    }>(ACCOUNT_BALANCES_QUERY, { id: address.toLowerCase(), limit })

    const items = data.account?.balances.items ?? []
    return items
      .filter(
        (b) =>
          b.contract.toLowerCase() === BASEPAINT_NFT_CONTRACT.toLowerCase() && Number(b.value) > 0
      )
      .map((b) => ({
        day: parseInt(b.tokenId, 10),
        balance: Number(b.value),
      }))
      .filter((b) => b.day > 0)
      .sort((a, b) => b.day - a.day)
  } catch (err) {
    console.error('[BasePaint] Account balances failed:', err)
    return []
  }
}
