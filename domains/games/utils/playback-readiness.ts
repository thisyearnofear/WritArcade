export interface PlaybackReadiness {
  text: boolean
  images: boolean
}

/**
 * Narrative is the playable unit. Images enhance a panel but must not gate
 * the first choice or the next turn.
 */
export function isNarrativeReady(progress: PlaybackReadiness): boolean {
  return progress.text
}

export function canContinueAfterNarrative(response: PlaybackReadiness): boolean {
  return response.text
}
