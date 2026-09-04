import 'dotenv/config'
import { Spectrum, richlink, text } from 'spectrum-ts'
import { imessage, effect } from 'spectrum-ts/providers/imessage'
import { terminal } from 'spectrum-ts/providers/terminal'
import { localIMessage } from '@spectrum-ts/imessage-local'

const API_URL = process.env.WRITERSARCADE_API_URL || 'http://localhost:3000'
const API_SECRET = process.env.IMESSAGE_API_SECRET
const PROJECT_ID = process.env.SPECTRUM_PROJECT_ID
const PROJECT_SECRET = process.env.SPECTRUM_PROJECT_SECRET

const BOT_NAME = 'Flynn'

function inboundText(content: unknown): string | undefined {
  if (typeof content === 'string') return content
  if (content && typeof content === 'object') {
    const c = content as Record<string, unknown>
    if (typeof c.text === 'string') return c.text
    if (typeof c.markdown === 'string') return c.markdown
  }
  return undefined
}

function extractUrl(text: string): { url: string; remainder: string } | null {
  const match = text.match(/https?:\/\/[^\s]+/i)
  if (!match) return null
  const url = match[0]
  const remainder = text.replace(url, '').trim().slice(0, 200)
  return { url, remainder }
}

function extractTone(remainder: string): string | undefined {
  const cleaned = remainder
    .replace(/^[\s,:-]+/, '')
    .replace(/[\s,:-]+$/, '')
    .trim()
  return cleaned || undefined
}

interface GameResult {
  title: string
  playUrl: string
}

async function generateGame(url: string, tone?: string): Promise<GameResult> {
  if (!API_SECRET) {
    throw new Error('IMESSAGE_API_SECRET is not set')
  }

  const res = await fetch(`${API_URL}/api/imessage/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_SECRET}`,
    },
    body: JSON.stringify({ url, tone }),
  })

  const payload = (await res.json().catch(() => ({ error: res.statusText }))) as {
    success?: boolean
    data?: GameResult
    error?: string
  }

  if (!res.ok || !payload.success || !payload.data) {
    throw new Error(payload.error || `API returned ${res.status}`)
  }

  return payload.data
}

async function sendReadingNote(space: any) {
  const content = text(`${BOT_NAME} is reading this now.`)
  try {
    await space.send(effect(content, imessage.effect.message.gentle))
  } catch {
    await space.send(content)
  }
}

async function sendReveal(space: any, game: GameResult) {
  const title = text(`It became: ${game.title}`)
  try {
    await space.send(effect(title, imessage.effect.message.spotlight))
  } catch {
    await space.send(title)
  }

  await space.send(richlink(game.playUrl))

  await space.send(
    text('Read the prose. Play the story. Share the link if it moved you.')
  )
}

async function main() {
  if (!API_SECRET) {
    throw new Error('IMESSAGE_API_SECRET is required')
  }

  const providers = []

  if (PROJECT_ID && PROJECT_SECRET) {
    providers.push(imessage.config())
    console.log(`[${BOT_NAME}] cloud iMessage provider enabled`)
  } else if (process.env.LOCAL_IMESSAGE !== 'false') {
    providers.push(localIMessage.config())
    console.log(`[${BOT_NAME}] local iMessage provider enabled (this Mac)`)
  }

  if (process.env.ENABLE_TERMINAL === 'true') {
    providers.push(terminal.config())
    console.log(`[${BOT_NAME}] terminal test mode enabled`)
  }

  if (providers.length === 0) {
    throw new Error(
      `No providers enabled. Set SPECTRUM_PROJECT_ID/SPECTRUM_PROJECT_SECRET, LOCAL_IMESSAGE=true, or ENABLE_TERMINAL=true.`
    )
  }

  const spectrumOptions =
    PROJECT_ID && PROJECT_SECRET
      ? { projectId: PROJECT_ID, projectSecret: PROJECT_SECRET, providers }
      : { providers }

  const app = await Spectrum(spectrumOptions as any)

  console.log(`${BOT_NAME} is running. Send a link to prose, an essay, or a post.`)

  for await (const [space, message] of app.messages) {
    try {
      const textContent = inboundText(message.content)
      if (!textContent) continue

      const extracted = extractUrl(textContent)

      if (!extracted) {
        await space.send(
          text(`${BOT_NAME} turns links into playable stories.\n\nSend a link to an article, essay, or post. You can add a few words — "make it a fable," "keep it close to the text," or "let it be strange."`)
        )
        continue
      }

      const { url, remainder } = extracted
      const tone = extractTone(remainder)

      console.log(`${BOT_NAME} received URL:`, url, tone ? `| tone: ${tone}` : '')

      await message.react?.('emphasis').catch(() => {})
      await sendReadingNote(space)
      await space.startTyping?.().catch(() => {})

      const game = await generateGame(url, tone)

      await sendReveal(space, game)
    } catch (err) {
      console.error(`${BOT_NAME} message handling error:`, err)
      try {
        await space.send(
          text(`${BOT_NAME} could not shape that link into a story. Try a different Paragraph.xyz article, or send the link again.`)
        )
      } catch (replyErr) {
        console.error('Failed to send error reply:', replyErr)
      }
    }
  }
}

main().catch((err) => {
  console.error(`${BOT_NAME} exited with error:`, err)
  process.exit(1)
})
