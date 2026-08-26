import { describe, it, expect } from 'vitest'
import { storyPlanSchema } from '@/domains/games/services/story-planner.service'

const validPlan = {
  hero: { name: 'Maya', role: 'the analyst', desire: 'uncover the truth', flaw: 'trusts too easily', voice: 'wry, clinical' },
  stakes: 'The network collapses and millions lose access',
  thesis: 'Transparency is a process, not a reveal',
  arc: [
    { beat: 'inciting incident', intent: 'Introduce the anomaly', scene: 'A server room at night', mood: { tension: 6, chaos: 3, hope: 2 }, dilemmas: ['alert the board', 'investigate alone', 'leak it now', 'wait'] },
    { beat: 'escalation', intent: 'Raise the cost of inaction', scene: 'A boardroom confrontation', mood: { tension: 8, chaos: 5, hope: 1 }, dilemmas: ['disclose early', 'buy time'] },
    { beat: 'climax', intent: 'Force the choice', scene: 'The press conference', mood: { tension: 9, chaos: 7, hope: 3 }, dilemmas: ['tell the truth', 'spin the story', 'stay silent'] },
  ],
  endings: [
    { label: 'The leak', resolution: 'She reveals everything and faces the fallout' },
    { label: 'The fix', resolution: 'She fixes it quietly and stays' },
  ],
  setup: ['the flickering light', 'the unreturned call'],
}

describe('storyPlanSchema', () => {
  it('accepts a well-formed story plan', () => {
    const parsed = storyPlanSchema.parse(validPlan)
    expect(parsed.hero.name).toBe('Maya')
    expect(parsed.arc).toHaveLength(3)
  })

  it('rejects a plan with zero panels and zero dilemmas', () => {
    expect(() =>
      storyPlanSchema.parse({
        ...validPlan,
        arc: [{ beat: 'beat', intent: 'x', scene: 'the room', mood: { tension: 0, chaos: 0, hope: 0 }, dilemmas: [] }],
      })
    ).toThrow()
  })

  it('rejects mood values out of the -10..10 range', () => {
    expect(() =>
      storyPlanSchema.parse({ ...validPlan, arc: [{ ...validPlan.arc[0], mood: { tension: 11, chaos: 0, hope: 0 } }] })
    ).toThrow()
  })
})