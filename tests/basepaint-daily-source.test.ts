import { describe, expect, it } from 'vitest'
import {
  buildBasePaintPromptText,
  buildDualSourcePromptText,
  pickAccentColor,
} from '@/lib/basepaint'
import { formatBasePaintDayPadded, getBasePaintDay } from '@/lib/basepaint/day'
import {
  buildDualSourceUrl,
  parseArticleUrlFromDualSource,
  parseBasePaintDayFromSource,
} from '@/lib/basepaint/source-url'
import { getBasePaintAnimationUrl, getBasePaintDayUrl } from '@/lib/basepaint/urls'

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

describe('buildDualSourcePromptText', () => {
  it('merges article plot with BasePaint world', () => {
    const prompt = buildDualSourcePromptText({
      articleTitle: 'On Hard Hats',
      articleAuthor: 'Ada',
      articleThemes: 'labor, safety, pride',
      articleText: 'The hard hat is a symbol of care.',
      articleUrl: 'https://paragraph.xyz/@ada/hard-hats',
      theme: 'Hard Hat',
      palette: ['#ff8800', '#223344'],
      canvasDescription: 'A giant yellow hard hat floats over a gray city.',
    })

    expect(prompt).toContain('On Hard Hats')
    expect(prompt).toContain('Ada')
    expect(prompt).toContain('labor, safety, pride')
    expect(prompt).toContain('giant yellow hard hat')
    expect(prompt).toContain('Hard Hat')
    expect(prompt).toContain('#ff8800')
    expect(prompt).toContain('inside')
  })
})

describe('dual source urls', () => {
  it('embeds article URL while preserving day parse', () => {
    const tagged = buildDualSourceUrl(847, 'https://paragraph.xyz/@ada/hard-hats')
    expect(parseBasePaintDayFromSource(tagged)).toBe(847)
    expect(parseArticleUrlFromDualSource(tagged)).toBe(
      'https://paragraph.xyz/@ada/hard-hats'
    )
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

describe('getBasePaintDay', () => {
  it('matches the official epoch formula', () => {
    const epochMs = 1691599315 * 1000
    expect(getBasePaintDay(epochMs)).toBe(1)
    expect(getBasePaintDay(epochMs + 86400 * 1000)).toBe(2)
  })
})

describe('basepaint urls', () => {
  it('zero-pads animation day', () => {
    expect(formatBasePaintDayPadded(847)).toBe('0847')
    expect(getBasePaintAnimationUrl(847)).toBe('https://basepaint.net/animations/0847.mp4')
  })

  it('builds day page URLs', () => {
    expect(getBasePaintDayUrl(100)).toContain('day=100')
    expect(getBasePaintDayUrl(100)).toContain('basepaint.xyz')
  })
})
