import type { BasePaintTheme } from '@/lib/basepaint/types'

function parsePalette(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((c): c is string => typeof c === 'string')
  }
  if (typeof raw === 'string' && raw.length > 0) {
    return raw.split(',').map((c) => c.trim()).filter(Boolean)
  }
  return []
}

/**
 * Fetch theme metadata from the public REST API.
 * https://basepaint.xyz/api/theme/DAY
 */
export async function fetchBasePaintTheme(day: number): Promise<BasePaintTheme | null> {
  try {
    const response = await fetch(`https://basepaint.xyz/api/theme/${day}`)
    if (!response.ok) return null
    const data = (await response.json()) as Record<string, unknown>
    return {
      theme: typeof data.theme === 'string' ? data.theme : `BasePaint Day ${day}`,
      proposer: typeof data.proposer === 'string' ? data.proposer : '',
      size: typeof data.size === 'number' ? data.size : 256,
      palette: parsePalette(data.palette),
    }
  } catch (err) {
    console.error('[BasePaint] Failed to fetch theme:', err)
    return null
  }
}
