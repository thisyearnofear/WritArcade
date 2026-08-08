import { describe, expect, it } from 'vitest'
import { decodeStrokeData, buildStrokeReplayFrames } from '@/lib/basepaint/strokes'
import { buildBasePaintSourceUrl, parseBasePaintDayFromSource } from '@/lib/basepaint/source-url'

describe('decodeStrokeData', () => {
  it('decodes multi-pixel stroke chunks', () => {
    const pixels = decodeStrokeData('0xfb0404fd0404ff0404')
    expect(pixels).toEqual([
      { x: 251, y: 4, colorIndex: 4 },
      { x: 253, y: 4, colorIndex: 4 },
      { x: 255, y: 4, colorIndex: 4 },
    ])
  })

  it('decodes single-pixel strokes', () => {
    expect(decodeStrokeData('0xcaa100')).toEqual([{ x: 202, y: 161, colorIndex: 0 }])
  })
})

describe('buildStrokeReplayFrames', () => {
  it('maps each stroke to a frame', () => {
    const frames = buildStrokeReplayFrames(['0xcaa100', '0xfb0404'])
    expect(frames).toHaveLength(2)
    expect(frames[1].pixels[0].x).toBe(251)
  })
})

describe('source-url', () => {
  it('round-trips basepaint day URLs', () => {
    expect(buildBasePaintSourceUrl(847)).toBe('basepaint://day/847')
    expect(parseBasePaintDayFromSource('basepaint://day/847')).toBe(847)
  })

  it('returns null for non-basepaint sources', () => {
    expect(parseBasePaintDayFromSource('https://paragraph.xyz/foo')).toBeNull()
    expect(
      parseBasePaintDayFromSource(
        'basepaint://day/847?article=https%3A%2F%2Fparagraph.xyz%2F%40ada%2Fx'
      )
    ).toBe(847)
  })
})
