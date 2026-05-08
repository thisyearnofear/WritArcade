export interface AudioGenerationResponse {
  audioUrl: string | null
  durationMs?: number | null
  characterCount?: number
  voice?: string
  error?: string
}

export interface AudioGenerationPayload {
  text: string
  voice?: string
}

function calculateMp3Duration(buffer: ArrayBuffer): number {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  let frameStart = 0
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === 0xFF && (bytes[i + 1] & 0xE0) === 0xE0) {
      frameStart = i
      break
    }
  }

  if (frameStart + 4 > bytes.length) {
    return Math.round((buffer.byteLength * 8) / 128000 * 1000)
  }

  const header = view.getUint32(frameStart, false)
  const bitrateIndex = (header >> 12) & 0x0F
  const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
  const bitrate = bitrates[bitrateIndex] || 128

  return Math.round((buffer.byteLength * 8) / (bitrate * 1000) * 1000)
}

export async function generateAudio(payload: AudioGenerationPayload): Promise<AudioGenerationResponse> {
  const { text, voice = 'Rachel' } = payload

  if (!text || typeof text !== 'string') {
    throw new Error('Missing or invalid text parameter')
  }

  if (text.length > 4096) {
    throw new Error('Text exceeds maximum length of 4096 characters')
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return { audioUrl: null, error: 'ElevenLabs API key not configured' }
  }

  const voiceId = voice || process.env.ELEVENLABS_DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[generate-audio] ElevenLabs API error:', response.status, errorText)
      return { audioUrl: null, error: `ElevenLabs API error: ${response.status}` }
    }

    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')

    return {
      audioUrl: `data:audio/mp3;base64,${base64Audio}`,
      durationMs: calculateMp3Duration(audioBuffer),
      characterCount: text.length,
      voice: voiceId,
    }
  } catch (error) {
    console.error('[generate-audio] ElevenLabs TTS failed:', error)
    return { audioUrl: null, error: 'ElevenLabs TTS generation failed' }
  }
}
