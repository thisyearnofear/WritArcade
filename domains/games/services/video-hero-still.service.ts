/**
 * Video pre-production: build a locked, type-free "real scene" still from the
 * comic's ending beat, plus a 3×3 storyboard grid as the visual DNA.
 *
 * Rationale (see docs/VIDEO_ARTIFACT_PIPELINE.md and the 2026 playbook):
 * - DO NOT feed the comic page itself to I2V — it will "film a comic".
 *   Instead lock ONE photorealistic still (object, light, grade) and let the
 *   motion prompt describe ONLY the real scene's camera move.
 * - The still is the durable through-line: native ratio, type-free, reused as
 *   the first frame for video and later for landing/OG/Stories.
 * - Type (Instrument Serif / DM Mono) is banned in the model and composited
 *   over the frame at display time, so it survives a model swap.
 */

import { generateImage } from '@/domains/media/services/image-generation-api.service'

export interface HeroStillInput {
  narrative: string
  genre: string
  primaryColor?: string
}

export interface HeroStillResult {
  imageUrl: string | null
  model: string
  provider: string
}

const GENRE_GRADE: Record<string, string> = {
  horror: 'cold moonlight, high-contrast shadows, damp air, grain',
  mystery: 'sodium-lamp glow, rain-filmed glass, smoke, film grain',
  comedy: 'warm flat midday light, everyday clutter, candid framing',
  adventure: 'golden-hour rim light, airborne dust, grounded low angle',
  'sci-fi': 'cool neon gradient, haze, reflective surfaces, slight bloom',
  fantasy: 'soft enchanted back-glow, pollen in the air, deep focus',
}

const GLOBAL_TYPE_BAN =
  'No faces, no logos, no captions, no typography, no speech bubbles, ' +
  'no signage, no writing, no watermarks, no camera gear, no drone. ' +
  'Put literal text in quotes only if you want it; otherwise ban all text.'

/**
 * Reduce narrative to a single distinctive subject, stripping quoted dialogue
 * (models render quoted text as speech bubbles) and truncating to the first
 * coherent scene (~2 sentences).
 */
export function toSubject(narrative: string): string {
  const stripped = narrative
    .replace(/["\u201C\u201D].*?["\u201C\u201D]|".*?"|'.*?'|[\u2018\u2019].*?[\u2018\u2019]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const excerpt = stripped.slice(0, 220).trim()
  return excerpt.length > 0 ? excerpt : 'a single distinctive object'
}

/**
 * Real-scene hero still prompt, structured background → subject → details →
 * constraints, phrased as a first-frame reference for image-to-video.
 */
export function buildHeroStillPrompt(input: HeroStillInput): string {
  const grade = GENRE_GRADE[input.genre.toLowerCase()] || 'natural documentary light'
  const subject = toSubject(input.narrative)
  const color = input.primaryColor
    ? `, composed around a ${input.primaryColor} palette`
    : ''

  return [
    `${subject}.`,
    `Photorealistic documentary still, ${grade}${color}, shot at chest height, one distinctive object or scene element centered and carrying the frame.`,
    'No comic styling, no ink lines, no cel shading — this is a real photographed scene.',
    GLOBAL_TYPE_BAN,
    'This is a first-frame reference for image-to-video; the motion comes later, the look comes from this frame.',
  ].join(' ')
}

/**
 * 3×3 storyboard grid in one pass (not nine generations). Every panel is the
 * SAME object, SAME light, SAME grade — the grid is the visual DNA that keeps
 * shots consistent and feeds the I2V model a single timeline instead of
 * disconnected frames. Capped at 9 panels by definition.
 */
export function buildShotGridPrompt(input: HeroStillInput): string {
  const subject = toSubject(input.narrative)
  const grade = GENRE_GRADE[input.genre.toLowerCase()] || 'natural documentary light'

  return [
    'A 3x3 storyboard grid, left to right, top to bottom, thin dark gutters.',
    `EVERY panel is the SAME scene, SAME light, SAME grade (${grade}): ${subject}.`,
    '1 wide establishing 2 medium re-framing 3 close-up on the object 4 ambient texture only 5 detail crop 6 empty negative space 7 light caustic 8 silhouette 9 hero beauty of the object.',
    'Photorealistic documentary style throughout, one consistent color grade.',
    'No text labels. No typography, no captions, no watermarks.',
    'Repeat at the end: the SAME object in every panel.',
  ].join(' ')
}

/**
 * Generate the locked hero still through the existing image-provider chain.
 * Returns a null imageUrl on total failure so callers can fall back to the
 * comic panel without breaking the flow.
 */
export async function generateHeroStill(
  input: HeroStillInput,
): Promise<HeroStillResult> {
  const prompt = buildHeroStillPrompt(input)
  const result = await generateImage({ prompt, type: 'narrative' })
  return {
    imageUrl: result.imageUrl,
    model: result.model,
    provider: result.provider,
  }
}

/**
 * Generate the 3×3 shot grid (the visual DNA). Optional — used to lock shot
 * variety and feed I2V with a single timeline grid.
 */
export async function generateShotGrid(
  input: HeroStillInput,
): Promise<HeroStillResult> {
  const prompt = buildShotGridPrompt(input)
  const result = await generateImage({ prompt, type: 'narrative' })
  return {
    imageUrl: result.imageUrl,
    model: result.model,
    provider: result.provider,
  }
}