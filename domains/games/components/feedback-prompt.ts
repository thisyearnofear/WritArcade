/**
 * Post-game feedback prompt helpers.
 *
 * Extracted from comic-book-finale.tsx. Controls when the NPS feedback
 * prompt surfaces: every N completions, and dismissible permanently.
 */

const FEEDBACK_DISABLED_KEY = 'writersarcade.feedback.disabled'
const FEEDBACK_COMPLETIONS_KEY = 'writersarcade.feedback.completions'
const FEEDBACK_INTERVAL = 10

export function shouldShowFeedbackPrompt(): boolean {
  if (typeof window === 'undefined') return false
  if (window.localStorage.getItem(FEEDBACK_DISABLED_KEY) === 'true') return false

  const currentCount = Number(window.localStorage.getItem(FEEDBACK_COMPLETIONS_KEY) || '0')
  const nextCount = Number.isFinite(currentCount) ? currentCount + 1 : 1
  window.localStorage.setItem(FEEDBACK_COMPLETIONS_KEY, String(nextCount))
  return nextCount % FEEDBACK_INTERVAL === 0
}

export function disableFeedbackPrompts(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(FEEDBACK_DISABLED_KEY, 'true')
}
