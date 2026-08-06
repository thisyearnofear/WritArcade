import { describe, expect, it } from 'vitest'
import { buildBasePaintPromptText, pickAccentColor } from '@/lib/daily-challenge'

describe('buildBasePaintPromptText', () => {
  it('grounds the story in the canvas description when available', () => {
    const prompt = buildBasePaintPromptText({
      theme: 'Hard Hat',
      palette: ['#ff8800', '#223344'],
      canvasDescription:
        'A giant yellow hard hat floats over a gray city. Small figures point upward.',
    })

    expect(prompt).toContain('Hard Hat')
    expect(prompt).toContain('giant yellow hard hat')
    expect(prompt).toContain('#ff8800')
    expect(prompt).toContain('community painted today')
  })

  it('falls back to a theme-only prompt without a description', () => {
    const prompt = buildBasePaintPromptText({
      theme: 'Hard Hat',
      palette: ['#ff8800'],
      canvasDescription: null,
    })

    expect(prompt).toContain('inspired by today\'s BasePaint artwork')
    expect(prompt).toContain('Hard Hat')
    expect(prompt).not.toContain('What the canvas actually shows')
  })

  it('handles missing theme gracefully', () => {
    const prompt = buildBasePaintPromptText({
      canvasDescription: 'Empty canvas with a single red pixel.',
    })
    expect(prompt).toContain('untitled')
  })
})

describe('pickAccentColor', () => {
  it('picks a saturated mid-lightness color', () => {
    expect(pickAccentColor(['#000000', '#ff8800', '#ffffff'])).toBe('#ff8800')
  })

  it('normalizes missing leading hash', () => {
    expect(pickAccentColor(['34d399'])).toEqual(expect.stringMatching(/^#[0-9a-f]{6}$/))
  })

  it('returns null for achromatic palettes', () => {
    expect(pickAccentColor(['#000000', '#404040', '#ffffff'])).toBeNull()
  })

  it('returns null for empty or invalid input', () => {
    expect(pickAccentColor([])).toBeNull()
    expect(pickAccentColor(undefined)).toBeNull()
    expect(pickAccentColor(['not-a-color'])).toBeNull()
  })
})
