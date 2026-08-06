export type GameModeKind = 'story' | 'wordle'

export function getGameModeKind(mode?: string | null): GameModeKind {
  return mode === 'wordle' ? 'wordle' : 'story'
}

export function getGameModeBadge(mode?: string | null): {
  label: string
  hint: string
  className: string
} {
  if (mode === 'wordle') {
    return {
      label: 'Wordle',
      hint: 'Free word puzzle from article vocabulary',
      className: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    }
  }
  return {
    label: 'Story',
    hint: '5-panel branching comic · secret epilogue on mint',
    className: 'border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300',
  }
}

export const GAME_MODE_EXPLOAINER =
  'Story = 5-panel comic with choices and optional secret epilogue · Wordle = free word puzzle, no wallet needed'
