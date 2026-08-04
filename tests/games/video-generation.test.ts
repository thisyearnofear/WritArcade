import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  VideoGenerationService,
  videoProviderRegistry,
  LumaProvider,
  FalProvider,
  ReplicateProvider,
  MockProvider,
  type VideoGenerationRequest,
} from '@/domains/games/services/video-generation.service'

const OLD_ENV = { ...process.env }

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new Request(url, init) as NextRequest
}

describe('VideoProvider Registry', () => {
  it('registers all built-in providers', () => {
    expect(videoProviderRegistry.get('luma')).toBeInstanceOf(LumaProvider)
    expect(videoProviderRegistry.get('fal')).toBeInstanceOf(FalProvider)
    expect(videoProviderRegistry.get('replicate')).toBeInstanceOf(ReplicateProvider)
    expect(videoProviderRegistry.get('mock')).toBeInstanceOf(MockProvider)
  })

  it('honors provider overrides', async () => {
    const res = await VideoGenerationService.generate({
      imageUrl: 'https://example.com/image.png',
      narrative: 'A quiet street at night.',
      genre: 'mystery',
      panelIndex: 0,
      providerOverride: 'mock',
    })
    expect(res.provider).toBe('mock')
    expect(res.status).toBe('pending')
  })

  it('returns failed provider when an unknown override is requested', async () => {
    const res = await VideoGenerationService.generate({
      imageUrl: 'https://example.com/image.png',
      narrative: 'A quiet street at night.',
      genre: 'mystery',
      panelIndex: 0,
      providerOverride: 'unknown' as unknown as Parameters<typeof VideoGenerationService.generate>[0]['providerOverride'],
    })
    expect(res.provider).toBe('failed')
    expect(res.status).toBe('failed')
  })
})

describe('LumaProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env = { ...OLD_ENV }
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('creates a generation job', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'luma-job-123', state: 'dreaming' }), { status: 200 })
    )

    const provider = new LumaProvider('test-luma-key')
    const result = await provider.createJob({
      imageUrl: 'https://example.com/image.png',
      narrative: 'A quiet street at night.',
      genre: 'mystery',
      panelIndex: 0,
    })

    expect(result.provider).toBe('luma')
    expect(result.providerJobId).toBe('luma-job-123')
    expect(result.status).toBe('pending')
  })

  it('polls a completed job', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'luma-job-123',
          state: 'completed',
          assets: { video: 'https://cdn.luma.com/video.mp4' },
        }),
        { status: 200 }
      )
    )

    const provider = new LumaProvider('test-luma-key')
    const result = await provider.poll('luma-job-123')

    expect(result.status).toBe('completed')
    expect(result.videoUrl).toBe('https://cdn.luma.com/video.mp4')
  })
})

describe('FalProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env = { ...OLD_ENV }
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('creates a generation job', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ request_id: 'fal-req-123', status: 'queued' }), { status: 200 })
    )

    const provider = new FalProvider('test-fal-key')
    const result = await provider.createJob({
      imageUrl: 'https://example.com/image.png',
      narrative: 'A quiet street at night.',
      genre: 'mystery',
      panelIndex: 0,
    })

    expect(result.provider).toBe('fal')
    expect(result.providerJobId).toBe('fal-req-123')
    expect(result.status).toBe('pending')
  })
})

describe('ReplicateProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env = { ...OLD_ENV }
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('creates a generation job', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'rep-job-123', status: 'starting' }), { status: 200 })
    )

    const provider = new ReplicateProvider('test-replicate-key')
    const result = await provider.createJob({
      imageUrl: 'https://example.com/image.png',
      narrative: 'A quiet street at night.',
      genre: 'mystery',
      panelIndex: 0,
    })

    expect(result.provider).toBe('replicate')
    expect(result.providerJobId).toBe('rep-job-123')
    expect(result.status).toBe('pending')
  })
})

describe('MockProvider', () => {
  it('returns pending immediately after creation', async () => {
    const provider = new MockProvider()
    const result = await provider.createJob({
      imageUrl: 'https://example.com/image.png',
      narrative: 'A quiet street at night.',
      genre: 'mystery',
      panelIndex: 0,
    })

    expect(result.provider).toBe('mock')
    expect(result.status).toBe('pending')
  })
})

describe('POST /api/games/[slug]/video/start', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...OLD_ENV }
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('returns 401 when not authenticated', async () => {
    vi.doMock('@/services/auth', () => ({ getActor: vi.fn().mockResolvedValue(null) }))
    const { POST } = await import('@/app/api/games/[slug]/video/start/route')
    const request = makeRequest('http://localhost:3000/api/games/test/video/start', { method: 'POST' })
    const response = await POST(request, { params: Promise.resolve({ slug: 'test' }) })
    expect(response.status).toBe(401)
  })
})

describe('GET /api/games/[slug]/video/status', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...OLD_ENV }
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('returns 404 when game not found', async () => {
    vi.doMock('@/services/auth', () => ({ getActor: vi.fn().mockResolvedValue(null) }))
    vi.doMock('@/lib/prisma', () => ({ prisma: { game: { findUnique: vi.fn().mockResolvedValue(null) } } }))
    const { GET } = await import('@/app/api/games/[slug]/video/status/route')
    const request = makeRequest('http://localhost:3000/api/games/test/video/status')
    const response = await GET(request, { params: Promise.resolve({ slug: 'test' }) })
    expect(response.status).toBe(404)
  })
})
