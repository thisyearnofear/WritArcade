import { NextResponse } from 'next/server'
import PdfPrinter from 'pdfmake/src/printer'
import vfs from 'pdfmake/build/vfs_fonts'
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { getActor } from '@/services/auth'

function getFontBuffer(fileName: string): Buffer {
  const data = vfs[fileName]
  if (!data) {
    throw new Error(`Missing pdfmake font: ${fileName}`)
  }
  return Buffer.from(data, 'base64')
}

function createPrinter() {
  const fonts = {
    Roboto: {
      normal: getFontBuffer('Roboto-Regular.ttf'),
      bold: getFontBuffer('Roboto-Medium.ttf'),
      italics: getFontBuffer('Roboto-Italic.ttf'),
      bolditalics: getFontBuffer('Roboto-MediumItalic.ttf'),
    },
  }
  return new PdfPrinter(fonts)
}

async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(url, {
      headers: { Accept: 'image/*' },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) return null

    const contentType = response.headers.get('Content-Type')
    if (!contentType?.startsWith('image/')) return null

    const contentLength = response.headers.get('Content-Length')
    if (contentLength && Number.parseInt(contentLength, 10) > 5 * 1024 * 1024) {
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    return `data:${contentType};base64,${base64}`
  } catch {
    return null
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const game = await GameDatabaseService.getGameBySlug(slug)

    if (!game) {
      return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 })
    }

    // Enforce access control on private games. Anonymous private games have no
    // recoverable owner, so they are never exportable.
    if (game.private) {
      const actor = await getActor()
      if (!actor || !game.userId || actor.user.id !== game.userId) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://writersarcade.vercel.app'
    const gameUrl = `${siteUrl}/games/${game.slug}`

    const panels = game.savedPanels || []

    const panelContent: Content[] = (
      await Promise.all(
        panels.map(async (panel, index) => {
          const imageDataUri = panel.imageUrl ? await fetchImageAsDataUri(panel.imageUrl) : null

          const content: Content[] = [
            { text: `Panel ${index + 1}`, style: 'panelHeading' },
            { text: panel.narrativeText, style: 'panelText' },
          ]

          if (imageDataUri) {
            content.push({
              image: imageDataUri,
              width: 500,
              margin: [0, 12, 0, 0],
            })
          }

          if (panel.userChoice) {
            content.push({
              text: `Choice: ${panel.userChoice}`,
              style: 'choiceText',
              margin: [0, 12, 0, 0],
            })
          }

          return content
        })
      )
    ).flat()

    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: game.title, style: 'title' },
        { text: game.description, style: 'subtitle' },
        ...panelContent,
        { text: `Play at ${gameUrl}`, style: 'footer' },
      ],
      styles: {
        title: {
          fontSize: 28,
          bold: true,
          margin: [0, 0, 0, 12],
        },
        subtitle: {
          fontSize: 14,
          color: '#666666',
          margin: [0, 0, 0, 24],
        },
        panelHeading: {
          fontSize: 18,
          bold: true,
          margin: [0, 24, 0, 8],
        },
        panelText: {
          fontSize: 12,
          margin: [0, 0, 0, 8],
        },
        choiceText: {
          fontSize: 12,
          italics: true,
          color: '#333333',
        },
        footer: {
          fontSize: 10,
          color: '#999999',
          margin: [0, 24, 0, 0],
        },
      },
      defaultStyle: {
        font: 'Roboto',
      },
    }

    const printer = createPrinter()
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = printer.createPdfKitDocument(docDefinition)
        const chunks: Buffer[] = []
        doc.on('data', (chunk: Buffer) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.end()
      } catch (err) {
        reject(err)
      }
    })

    return new NextResponse(new Uint8Array(pdfBuffer).buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(game.slug)}-comic.pdf"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
