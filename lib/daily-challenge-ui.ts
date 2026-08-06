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

export function getModifierCategoryForPanel(panelIndex: number): Modifier['category'] {
  return PANEL_CATEGORIES[Math.max(0, Math.min(panelIndex, PANEL_CATEGORIES.length - 1))] ?? 'tone'
}
