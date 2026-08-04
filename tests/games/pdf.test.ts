import { describe, it, expect, vi, beforeEach } from 'vitest'

const fakePdfBuffer = Buffer.from('fake-pdf-buffer')

vi.mock('pdfmake', () => ({
  default: {
    setFonts: vi.fn(),
    addFonts: vi.fn(),
    createPdf: vi.fn(() => ({
      getBuffer: vi.fn(async () => fakePdfBuffer),
      getBase64: vi.fn(async () => fakePdfBuffer.toString('base64')),
      getStream: vi.fn(async () => ({})),
    })),
  },
}))

vi.mock('pdfmake/build/vfs_fonts', () => ({
  default: {
    'Roboto-Regular.ttf': Buffer.from('fake-regular').toString('base64'),
    'Roboto-Medium.ttf': Buffer.from('fake-bold').toString('base64'),
    'Roboto-Italic.ttf': Buffer.from('fake-italic').toString('base64'),
    'Roboto-MediumItalic.ttf': Buffer.from('fake-bold-italic').toString('base64'),
  },
}))

const mockGetGameBySlug = vi.fn()
vi.mock('@/domains/games/services/game-database.service', () => ({
  GameDatabaseService: {
    getGameBySlug: mockGetGameBySlug,
  },
}))

const mockGetActor = vi.fn()
vi.mock('@/services/auth', () => ({
  getActor: mockGetActor,
}))

describe('/api/games/[slug]/pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when game is not found', async () => {
    mockGetGameBySlug.mockResolvedValue(null)

    const { GET } = await import('@/app/api/games/[slug]/pdf/route')
    const response = await GET(new Request('http://localhost:3000/api/games/missing/pdf'), {
      params: Promise.resolve({ slug: 'missing' }),
    })

    expect(response.status).toBe(404)
  })

  it('returns 403 for private games when not the owner', async () => {
    mockGetGameBySlug.mockResolvedValue({
      id: 'game-1',
      slug: 'private-game',
      title: 'Private Game',
      description: 'A private game',
      private: true,
      userId: 'owner-1',
      savedPanels: [],
    })
    mockGetActor.mockResolvedValue({ user: { id: 'other-user' } })

    const { GET } = await import('@/app/api/games/[slug]/pdf/route')
    const response = await GET(new Request('http://localhost:3000/api/games/private-game/pdf'), {
      params: Promise.resolve({ slug: 'private-game' }),
    })

    expect(response.status).toBe(403)
  })

  it('generates a PDF for a private game when the owner requests it', async () => {
    mockGetGameBySlug.mockResolvedValue({
      id: 'game-1',
      slug: 'private-game',
      title: 'Private Game',
      description: 'A private game',
      private: true,
      userId: 'owner-1',
      savedPanels: [],
    })
    mockGetActor.mockResolvedValue({ user: { id: 'owner-1' } })

    const { GET } = await import('@/app/api/games/[slug]/pdf/route')
    const response = await GET(new Request('http://localhost:3000/api/games/private-game/pdf'), {
      params: Promise.resolve({ slug: 'private-game' }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Cache-Control')).toContain('max-age=3600')
  })

  it('generates a PDF for a public game', async () => {
    mockGetGameBySlug.mockResolvedValue({
      id: 'game-1',
      slug: 'public-game',
      title: 'Public Game',
      description: 'A public game',
      private: false,
      userId: 'owner-1',
      savedPanels: [
        {
          id: 'panel-1',
          narrativeText: 'The hero enters the cave.',
          imageUrl: 'https://example.com/cave.png',
          userChoice: 'Enter cautiously',
        },
      ],
    })

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'Content-Type': 'image/png' }),
      arrayBuffer: async () => new ArrayBuffer(8),
    } as Response)

    const { GET } = await import('@/app/api/games/[slug]/pdf/route')
    const response = await GET(new Request('http://localhost:3000/api/games/public-game/pdf'), {
      params: Promise.resolve({ slug: 'public-game' }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
  })
})
