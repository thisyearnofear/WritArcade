import { describe, it, expect } from 'vitest'
import { streamAgenticPanel } from '@/domains/games/services/panel-agent.service'

describe('panel-agent.service', () => {
  const panel = {
    narrative: 'Maya reached the server room.',
    options: [
      { id: 1, text: 'Pull the breaker' },
      { id: 2, text: 'Call for backup' },
    ],
    traces: [],
    budget: { maxTokens: 4000, spent: 0 },
  }

  it('streams a panel as content → options → end', async () => {
    const events: string[] = []
    for await (const ev of streamAgenticPanel(panel)) {
      events.push(ev.type)
      if (ev.type === 'content') expect(ev.content).toBe(panel.narrative)
      if (ev.type === 'options') expect(ev.options).toHaveLength(2)
    }
    expect(events).toEqual(['content', 'options', 'end'])
  })

  it('emits only content + end when there are no options', async () => {
    const noOptions = { ...panel, options: [] }
    const types: string[] = []
    for await (const ev of streamAgenticPanel(noOptions)) types.push(ev.type)
    expect(types).toEqual(['content', 'end'])
  })
})