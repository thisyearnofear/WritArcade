import { describe, expect, it } from 'vitest'
import { canContinueAfterNarrative, isNarrativeReady } from '@/domains/games/utils/playback-readiness'

describe('playback readiness', () => {
  it('starts gameplay when narrative is ready even if images are still pending', () => {
    expect(isNarrativeReady({ text: true, images: false })).toBe(true)
  })

  it('does not start gameplay before narrative is ready', () => {
    expect(isNarrativeReady({ text: false, images: true })).toBe(false)
  })

  it('unlocks the next choice when response text is ready', () => {
    expect(canContinueAfterNarrative({ text: true, images: false })).toBe(true)
    expect(canContinueAfterNarrative({ text: false, images: true })).toBe(false)
  })
})
