import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getModel } from '@/lib/ai-model-compatibility'

interface EpilogueRequest {
  gameId: string
  articleContext?: string
  genre: string
  gameTitle: string
  choices: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: EpilogueRequest = await request.json()
    const { articleContext, genre, gameTitle, choices } = body

    if (!gameTitle || !genre) {
      return NextResponse.json(
        { error: 'Missing required fields: gameTitle, genre' },
        { status: 400 }
      )
    }

    const model = getModel('')

    const choicesSummary = choices.length > 0
      ? choices.map((c, i) => `Choice ${i + 1}: "${c}"`).join('\n')
      : 'The player completed the story.'

    const prompt = `You are a literary commentator reflecting on an interactive comic story.

Article context (source material):
${articleContext || 'A Paragraph article'}

Game title: "${gameTitle}"
Genre: ${genre}

Player choices through the story:
${choicesSummary}

Write TWO distinct sections separated by "---REFLECTION---":

First section — EPILOGUE NARRATIVE (2-3 sentences):
Write a brief narrative epilogue that ties the player's specific choices back to the themes of the original article. End the story with meaning. Write in the same comic/storytelling style as the game. Do NOT reference "the player" — write as if this is the concluding scene of the story itself.

Second section — REFLECTION (3-4 sentences):
Write a reflective commentary that connects the player's choices to the deeper themes of the article. Explore what the choices reveal about the human experience of the article's subject matter. Address this to the player directly.

Format:
EPILOGUE NARRATIVE: <text>
---REFLECTION---
REFLECTION: <text>`

    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.8,
      maxTokens: 600,
    })

    const parts = text.split('---REFLECTION---')
    const epilogue = parts[0]
      ?.replace(/^EPILOGUE\s*NARRATIVE:\s*/i, '')
      ?.trim()
    const reflection = parts[1]
      ?.replace(/^REFLECTION:\s*/i, '')
      ?.trim()

    return NextResponse.json({
      success: true,
      data: {
        epilogue: epilogue || 'Your choices shaped a unique journey through this story.',
        reflection: reflection || 'Every choice reflects something about how we engage with stories and the ideas they explore.',
      },
    })
  } catch (error) {
    console.error('Epilogue generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate epilogue' },
      { status: 500 }
    )
  }
}
