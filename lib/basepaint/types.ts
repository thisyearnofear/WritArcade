export interface BasePaintTheme {
  theme: string
  proposer: string
  size: number
  palette: string[]
}

export interface BasePaintContributor {
  address: string
  pixelsCount: number
}

export interface BasePaintCanvasStats {
  day: number
  name: string
  palette: string[]
  size: number
  pixelsCount: number
  totalArtists: number
  totalMints: number
  proposer?: string
  topContributors: BasePaintContributor[]
}

export interface BasePaintDailySource {
  day: number
  sourceType: 'basepaint'
  basePaintDay: number
  theme: string
  palette: string[]
  canvasUrl: string
  canvasDescription?: string
  promptText: string
}

/** Dual Daily: featured article (plot) + BasePaint canvas (world). */
export interface DualDailySource {
  day: number
  sourceType: 'dual'
  sourceUrl: string
  basePaintDay: number
  theme: string
  canvasTheme?: string
  articleTitle?: string
  articleAuthor?: string
  palette: string[]
  canvasUrl: string
  canvasDescription?: string
  promptText: string
}

export type ResolvedDailySource = BasePaintDailySource | DualDailySource
