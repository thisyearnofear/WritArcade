import { describe, it, expect } from 'vitest'
import { buildMarketingCopyPrompt, clampCopy } from '@/domains/games/services/generation-prompts'

describe('generation prompts', () => {
  it('clamps copy to 20k chars', () => {
    expect(clampCopy('a'.repeat(25_000))).toHaveLength(20_000)
    expect(clampCopy('short')).toBe('short')
  })

  it('wraps marketing copy in the resonance-framing preamble', () => {
    const prompt = buildMarketingCopyPrompt('Buy our amazing widget today.')
    expect(prompt).toContain('MARKETING SOURCE MATERIAL')
    expect(prompt).toContain('Buy our amazing widget today.')
    expect(prompt).toContain('DESIGN IMPERATIVE')
  })
})
