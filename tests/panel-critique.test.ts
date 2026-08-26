import { describe, it, expect } from 'vitest'
import { panelCritiqueSchema, critiqueDirective, MAX_CRITIQUE_RETRIES } from '@/domains/games/services/panel-critique.service'

describe('panel-critique.service', () => {
  it('accepts a keep decision', () => {
    const parsed = panelCritiqueSchema.parse({ passes: true, issues: [], action: 'keep' })
    expect(parsed.action).toBe('keep')
    expect(parsed.passes).toBe(true)
  })

  it('accepts a regenerate decision with issues', () => {
    const parsed = panelCritiqueSchema.parse({
      passes: false,
      issues: ['more than 4 options', 'recaps previous scene'],
      action: 'regenerate',
    })
    expect(parsed.issues).toHaveLength(2)
  })

  it('builds a regenerate directive listing the issues', () => {
    const dir = critiqueDirective({ passes: false, issues: ['too long', 'mixed scene'], action: 'regenerate' })
    expect(dir).toContain('too long')
    expect(dir).toContain('mixed scene')
  })

  it('returns empty directive for keep', () => {
    expect(critiqueDirective({ passes: true, issues: [], action: 'keep' })).toBe('')
  })

  it('caps regenerate attempts at 2', () => {
    expect(MAX_CRITIQUE_RETRIES).toBe(2)
  })
})