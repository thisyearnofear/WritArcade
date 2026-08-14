import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildHeroStillPrompt,
  buildShotGridPrompt,
  generateHeroStill,
  generateShotGrid,
  toSubject,
} from '@/domains/games/services/video-hero-still.service'
import { resolveAspectRatio } from '@/domains/games/services/video-generation.service'

vi.mock('@/domains/media/services/image-generation-api.service', () => ({
  generateImage: vi.fn(),
}))

import { generateImage as mockGenerateImage } from '@/domains/media/services/image-generation-api.service'

const mockGenerateImageTyped = mockGenerateImage as unknown as ReturnType<typeof vi.fn>

describe('video hero-still pre-production', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds a real-scene, type-free hero still prompt', () => {
    const prompt = buildHeroStillPrompt({
      narrative: '"I can\'t believe it," she said. Then the lime LED digits started to flicker.',
      genre: 'mystery',
    })

    // Real photoreal scene, not a comic.
    expect(prompt).toContain('Photorealistic documentary still')
    expect(prompt).toContain('No comic styling')
    // Type is banned in the model (composited later).
    expect(prompt).toContain('no typography')
    expect(prompt).toContain('no captions')
    expect(prompt).toContain('No faces')
    // Framed as a first-frame reference for I2V.
    expect(prompt).toContain('first-frame reference for image-to-video')
    // Quoted dialogue stripped — models render it as speech bubbles.
    expect(prompt).not.toMatch(/I can't believe it/)
  })

  it('builds a 3x3 shot grid where every panel is the SAME object', () => {
    const prompt = buildShotGridPrompt({ narrative: 'A lone substitution board in the night air.', genre: 'horror' })

    expect(prompt).toContain('3x3 storyboard grid')
    expect(prompt).toContain('SAME scene, SAME light, SAME grade')
    expect(prompt).toContain('SAME object in every panel')
    expect(prompt).toContain('No text labels')
    expect(prompt).toContain('No typography')
  })

  it('generateHeroStill returns the generated URL and model', async () => {
    mockGenerateImageTyped.mockResolvedValue({
      imageUrl: 'https://example.com/hero.png',
      model: 'flux',
      provider: 'pollinations',
    })

    const result = await generateHeroStill({ narrative: 'A quiet object.', genre: 'mystery' })

    expect(result.imageUrl).toBe('https://example.com/hero.png')
    expect(result.model).toBe('flux')
    expect(mockGenerateImageTyped).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'narrative', prompt: expect.stringContaining('Photorealistic documentary still') }),
    )
  })

  it('generateHeroStill returns a null imageUrl on upstream failure', async () => {
    mockGenerateImageTyped.mockResolvedValue({ imageUrl: null, model: 'failed', provider: 'failed' })

    const result = await generateHeroStill({ narrative: 'A scene.', genre: 'adventure' })

    expect(result.imageUrl).toBeNull()
  })

  it('generateShotGrid passes the grid prompt', async () => {
    mockGenerateImageTyped.mockResolvedValue({ imageUrl: 'https://example.com/grid.png', model: 'flux', provider: 'pollinations' })

    const result = await generateShotGrid({ narrative: 'A scene.', genre: 'sci-fi' })

    expect(result.imageUrl).toBe('https://example.com/grid.png')
    expect(mockGenerateImageTyped).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining('3x3 storyboard grid') }),
    )
  })

  it('toSubject strips quoted dialogue', () => {
    expect(toSubject('"Hello," she said. Then motion.')).not.toContain('Hello')
  })

  it('resolveAspectRatio defaults to vertical 9:16 and honors an explicit ratio', () => {
    expect(resolveAspectRatio({})).toBe('9:16')
    expect(resolveAspectRatio({ aspectRatio: '16:9' })).toBe('16:9')
    expect(resolveAspectRatio({ aspectRatio: '1:1' })).toBe('1:1')
  })
})