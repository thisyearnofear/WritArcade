/** Canonical articleUrl for a BasePaint-sourced game. */
export function buildBasePaintSourceUrl(day: number): string {
  return `basepaint://day/${day}`
}

/**
 * Dual-source tag: keeps canvas day for split-view gameplay and embeds the
 * featured article URL for writer attribution.
 */
export function buildDualSourceUrl(day: number, articleUrl: string): string {
  const params = new URLSearchParams({ article: articleUrl })
  return `basepaint://day/${day}?${params.toString()}`
}

export function parseBasePaintDayFromSource(source?: string | null): number | null {
  if (!source) return null
  const match = /^basepaint:\/\/day\/(\d+)\/?/i.exec(source.trim())
  if (!match) return null
  const day = parseInt(match[1], 10)
  return Number.isFinite(day) && day > 0 ? day : null
}

export function parseArticleUrlFromDualSource(source?: string | null): string | null {
  if (!source?.startsWith('basepaint://')) return null
  const qIndex = source.indexOf('?')
  if (qIndex < 0) return null
  const params = new URLSearchParams(source.slice(qIndex + 1))
  const article = params.get('article')
  return article && /^https?:\/\//i.test(article) ? article : null
}
