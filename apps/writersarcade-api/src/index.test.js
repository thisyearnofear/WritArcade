/**
 * HTTP-level tests for the writersarcade-api Fastify server.
 *
 * These exercise the money-adjacent request surface using Fastify's inject
 * (no listening socket, no network). Provider/TTS/RPC calls are never
 * reached: every case here fails fast on validation or returns the pure
 * health payload.
 */
import { describe, it, expect } from 'vitest'
import { buildApp, start } from './index.js'

const VALID_WALLET = '0x0000000000000000000000000000000000000000'
const VALID_CONTRACT = '0x1111111111111111111111111111111111111111'

function makeApp() {
  return buildApp({ logger: false })
}

describe('GET /api/health', () => {
  it('returns ok with uptime and timestamp', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'GET', url: '/api/health' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('ok')
    expect(typeof body.uptime).toBe('number')
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false)
  })
})

describe('start() production entrypoint', () => {
  it('boots a real server on an ephemeral port and serves /api/health', async () => {
    // Regression: start() previously forgot to await the async buildApp(), so
    // app.listen was called on a Promise and production crashed on boot.
    const app = await start(0)
    try {
      const port = app.server.address().port
      const res = await fetch(`http://127.0.0.1:${port}/api/health`)
      expect(res.status).toBe(200)
      expect((await res.json()).status).toBe('ok')
    } finally {
      await app.close()
    }
  })
})

describe('GET /api/user/balance', () => {
  it('rejects a missing wallet address', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'GET', url: '/api/user/balance' })
    expect(res.statusCode).toBe(500)
    expect(res.json().details).toContain('Wallet address required')
  })

  it('rejects a malformed wallet address', async () => {
    const app = await makeApp()
    const res = await app.inject({
      method: 'GET',
      url: `/api/user/balance?wallet=${encodeURIComponent('not-an-address')}`,
    })
    expect(res.statusCode).toBe(500)
    expect(res.json().details).toContain('Invalid wallet address format')
  })

  it('rejects an unknown writer coin', async () => {
    const app = await makeApp()
    const res = await app.inject({
      method: 'GET',
      url: `/api/user/balance?wallet=${VALID_WALLET}&coin=not-a-coin`,
    })
    expect(res.statusCode).toBe(500)
    expect(res.json().details).toContain('Unknown writer coin')
  })
})

describe('POST /api/generate-image', () => {
  it('requires a prompt and type before any provider call', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'POST', url: '/api/generate-image', payload: {} })
    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.error).toContain('Missing prompt or type')
    expect(body.provider).toBe('failed')
  })

  it('requires a type even when a prompt is present', async () => {
    const app = await makeApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/generate-image',
      payload: { prompt: 'a neon alley' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toContain('Missing prompt or type')
  })
})

describe('POST /api/generate-audio', () => {
  it('rejects missing text', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'POST', url: '/api/generate-audio', payload: {} })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toContain('Missing or invalid text parameter')
  })

  it('rejects text over the 4096-character limit', async () => {
    const app = await makeApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/generate-audio',
      payload: { text: 'x'.repeat(5000) },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toContain('exceeds maximum length of 4096')
  })
})

describe('POST /api/verify-nft-ownership', () => {
  it('rejects missing required fields', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'POST', url: '/api/verify-nft-ownership', payload: {} })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ verified: false })
  })

  it('rejects a malformed wallet address before any RPC call', async () => {
    const app = await makeApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/verify-nft-ownership',
      payload: {
        nftTokenId: '1',
        walletAddress: 'not-a-wallet',
        contractAddress: VALID_CONTRACT,
        chainId: 8453,
      },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toContain('Invalid wallet address')
  })
})
