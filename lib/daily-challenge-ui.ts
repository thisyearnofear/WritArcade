import type { Modifier } from '@/lib/daily-challenge'

const PANEL_CATEGORIES: Modifier['category'][] = [
  'tone',
  'complication',
  'stakes',
  'complication',
  'resolution',
]

export const MODIFIER_CATEGORY_LABEL: Record<Modifier['category'], string> = {
  tone: 'Tone',
  complication: 'Complication',
  stakes: 'Stakes',
  resolution: 'Resolution',
}

export const MODIFIER_CATEGORY_HINT: Record<Modifier['category'], string> = {
  tone: 'Colors how the scene feels',
  complication: 'Adds friction or a twist',
  stakes: 'Raises what can be lost',
  resolution: 'Shapes how threads converge',
}

/** Short in-panel flavor line — teases the hidden card without naming it */
export const MODIFIER_CATEGORY_FLAVOR: Record<Modifier['category'], string> = {
  tone: 'Something in the air shifts the mood of this moment…',
  complication: 'A hidden twist presses against the scene…',
  stakes: 'The cost of this choice feels heavier than usual…',
  resolution: 'Threads you cannot see are pulling toward a conclusion…',
}

export const MODIFIER_CATEGORY_COLOR: Record<Modifier['category'], string> = {
  tone: '#a78bfa',
  complication: '#fb923c',
  stakes: '#f87171',
  resolution: '#34d399',
}

export function getModifierCategoryForPanel(panelIndex: number): Modifier['category'] {
  return PANEL_CATEGORIES[Math.max(0, Math.min(panelIndex, PANEL_CATEGORIES.length - 1))] ?? 'tone'
}
