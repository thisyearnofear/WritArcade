import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('/api/image-proxy', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns 400 when url is missing', async () => {
    global.fetch = vi.fn()

    const { GET } = await import('@/app/api/image-proxy/route')
    const request = new Request('http://localhost:3000/api/image-proxy')
    const response = await GET(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Missing url parameter')
  })

  it('returns 400 for invalid url', async () => {
    global.fetch = vi.fn()

    const { GET } = await import('@/app/api/image-proxy/route')
    const request = new Request('http://localhost:3000/api/image-proxy?url=not-a-url')
    const response = await GET(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Invalid url parameter')
  })

  it('returns 400 for non-http protocols', async () => {
    global.fetch = vi.fn()

    const { GET } = await import('@/app/api/image-proxy/route')
    const request = new Request('http://localhost:3000/api/image-proxy?url=file:///etc/passwd')
    const response = await GET(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Only http/https URLs are supported')
  })

  it('returns 403 for non-allowlisted hostname (SSRF protection)', async () => {
    global.fetch = vi.fn()

    const { GET } = await import('@/app/api/image-proxy/route')
    const request = new Request(
      'http://localhost:3000/api/image-proxy?url=https%3A%2F%2Fexample.com%2Fimage.png'
    )
    const response = await GET(request)

    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json.error).toContain('Blocked')
  })

  it('proxies a valid image from allowlisted hostname with CORS headers', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'Content-Type': 'image/png' }),
      blob: async () => new Blob(['image-data'], { type: 'image/png' }),
    } as Response)

    const { GET } = await import('@/app/api/image-proxy/route')
    const request = new Request(
      'http://localhost:3000/api/image-proxy?url=https%3A%2F%2Fipfs.io%2Fimage.png'
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('returns 502 when upstream fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    const { GET } = await import('@/app/api/image-proxy/route')
    const request = new Request(
      'http://localhost:3000/api/image-proxy?url=https%3A%2F%2Fipfs.io%2Fmissing.png'
    )
    const response = await GET(request)

    expect(response.status).toBe(502)
  })
})
