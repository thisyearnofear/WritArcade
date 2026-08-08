/**
 * Build the story-generation prompt for a BasePaint daily source.
 * When a vision-derived canvas description is available, the story is grounded
 * in what the community actually drew — not just the theme word.
 */
export function buildBasePaintPromptText(input: {
  theme?: string
  palette?: string[]
  canvasDescription?: string | null
}): string {
  const { theme, palette = [], canvasDescription } = input
  const paletteText = palette.join(', ')

  if (canvasDescription) {
    return [
      `Create a 5-panel interactive comic game set inside today's BasePaint collaborative canvas: "${theme ?? 'untitled'}".`,
      ``,
      `What the canvas actually shows: ${canvasDescription}`,
      ``,
      `Build the story from these drawn elements — the characters, objects, and scenes the community painted today. ` +
        `Visual style: pixel art honoring this exact palette: ${paletteText}. ` +
        `The story should reflect the theme "${theme ?? 'untitled'}" and feel recognizably connected to this specific artwork.`,
    ].join('\n')
  }

  return `Create a 5-panel interactive comic game inspired by today's BasePaint artwork: "${theme}". The visual style should match a pixel art aesthetic with this color palette: ${paletteText}. The story should reflect the theme "${theme}" and feel connected to the collaborative pixel art canvas.`
}

/**
 * Dual-source Daily: article = plot/voice; BasePaint = world/palette/visuals.
 */
export function buildDualSourcePromptText(input: {
  articleTitle?: string | null
  articleAuthor?: string | null
  articleThemes?: string | null
  articleText?: string | null
  articleUrl?: string | null
  theme?: string
  palette?: string[]
  canvasDescription?: string | null
}): string {
  const {
    articleTitle,
    articleAuthor,
    articleThemes,
    articleText,
    articleUrl,
    theme,
    palette = [],
    canvasDescription,
  } = input
  const paletteText = palette.join(', ') || 'the canvas palette'
  const title = articleTitle?.trim() || 'Untitled article'
  const author = articleAuthor?.trim() || 'the author'
  const canvasTheme = theme?.trim() || 'untitled'

  const worldBlock = canvasDescription
    ? [
        `WORLD — today's BasePaint collaborative canvas "${canvasTheme}":`,
        canvasDescription,
        `Visual style: pixel art locked to this palette: ${paletteText}.`,
      ].join('\n')
    : [
        `WORLD — today's BasePaint collaborative canvas "${canvasTheme}".`,
        `Visual style: pixel art locked to this palette: ${paletteText}.`,
      ].join('\n')

  const plotParts = [
    `PLOT — stage this writer's piece inside that world: "${title}" by ${author}.`,
  ]
  if (articleUrl) plotParts.push(`Article URL: ${articleUrl}`)
  if (articleThemes?.trim()) {
    plotParts.push(``, `THEMATIC ESSENCE:`, articleThemes.trim())
  }
  if (articleText?.trim()) {
    const excerpt = articleText.trim().slice(0, 6000)
    plotParts.push(
      ``,
      `FULL ARTICLE TEXT (preserve the original author's voice and ideas):`,
      excerpt
    )
  }

  return [
    `Create a 5-panel interactive comic game that combines two sources:`,
    ``,
    worldBlock,
    ``,
    plotParts.join('\n'),
    ``,
    `DESIGN IMPERATIVE:`,
    `- The article supplies plot, voice, characters, and themes.`,
    `- The BasePaint canvas supplies setting, atmosphere, and visual identity.`,
    `- Players should feel they are playing the writer's ideas *inside* today's community painting.`,
    `- Honor both the author and the collaborative artwork; do not ignore either source.`,
  ].join('\n')
}

/** Pick a saturated mid-lightness accent from a BasePaint palette. */
export function pickAccentColor(palette?: string[]): string | null {
  if (!palette?.length) return null

  let best: string | null = null
  let bestScore = 0

  for (const hex of palette) {
    const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
    if (!match) continue

    const n = parseInt(match[1], 16)
    const r = ((n >> 16) & 0xff) / 255
    const g = ((n >> 8) & 0xff) / 255
    const b = (n & 0xff) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const lightness = (max + min) / 2
    const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1))

    const score = saturation * (1 - Math.abs(lightness - 0.5) * 2)
    if (score > bestScore) {
      bestScore = score
      best = `#${match[1].toLowerCase()}`
    }
  }

  return bestScore > 0.15 ? best : null
}
