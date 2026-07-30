/**
 * Pure prompt-preamble builders for game generation.
 * Kept free of I/O so they can be unit-tested directly.
 */

const MAX_MARKETING_COPY_CHARS = 20_000

export function clampCopy(text: string): string {
  return text.length > MAX_MARKETING_COPY_CHARS
    ? text.slice(0, MAX_MARKETING_COPY_CHARS)
    : text
}

export function buildMarketingCopyPrompt(copy: string): string {
  return `Create a game based on this marketing copy.

MARKETING SOURCE MATERIAL (${copy.length} chars):
${clampCopy(copy)}

DESIGN IMPERATIVE:
Turn this copy's core message into an interactive narrative. Each panel should test how the reader responds to a different framing of the message — the choices they make reveal which angles resonate. Keep the brand's voice and claims intact; dramatize them, don't replace them. The final panel should land the copy's main call-to-action as a natural story conclusion.`
}
