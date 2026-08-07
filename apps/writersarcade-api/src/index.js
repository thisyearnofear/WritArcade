require('dotenv').config()
const Fastify = require('fastify')
const cors = require('@fastify/cors')
const rateLimit = require('@fastify/rate-limit')
const { createPublicClient, http } = require('viem')
const { base } = require('viem/chains')

const PORT = Number(process.env.PORT || 3800)
const ALLOWED_ORIGINS = [
  'https://writersarcade.vercel.app',
  'https://www.writersarcade.com',
  'https://writersarcade.com',
  'http://localhost:3000',
]

const WRITER_COINS = {
  avc: { symbol: '$AVC', address: '0x06FC3D5D2369561e28F261148576520F5e49D6ea', decimals: 18 },
  debbie: { symbol: '$DEBBIE', address: '0x4ea5d3ff9e8295a552903d4bd486ce8cf8291c60', decimals: 18 },
  jake: { symbol: '$JAKE', address: '0xC2E3A4d07fdff60f3CdCb39FD94Fc11F254938B9', decimals: 18 },
  tso: { symbol: '$THOUGHTS', address: '0x98cacf94eb68ea4c5bdc4d70a1a04c2c2cffde39', decimals: 18 },
  papa: { symbol: '$PARAPAPA', address: '0x300efb94e4a7fcf71184eeeb82cb2b7af4a6ea58', decimals: 18 },
}

const balanceCache = new Map()
const CACHE_DURATION = 15000
const IN_FLIGHT = new Map()
const providerHealth = {
  pollinations: { failures: 0, lastSuccess: Date.now() },
  venice: { failures: 0, lastSuccess: Date.now() },
  netmind: { failures: 0, lastSuccess: Date.now() },
  modal: { failures: 0, lastSuccess: Date.now() },
  fal: { failures: 0, lastSuccess: Date.now() },
}

function formatBalance(balance, decimals) {
  const divisor = BigInt(10 ** decimals)
  const whole = (balance / divisor).toString()
  const remainder = (balance % divisor).toString().padStart(decimals, '0')
  const trimmed = remainder.slice(0, 6).replace(/0+$/, '')
  return trimmed ? `${whole}.${trimmed}` : whole
}

async function fetchWriterCoinBalance(wallet, coinId = 'avc') {
  if (!wallet) throw new Error('Wallet address required')
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) throw new Error('Invalid wallet address format')

  const coin = WRITER_COINS[coinId]
  if (!coin) throw new Error(`Unknown writer coin: ${coinId}`)

  const cacheKey = `${wallet.toLowerCase()}-${coinId}`
  const cached = balanceCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { success: true, data: cached.data }
  }

  const rpcUrls = [
    process.env.BASE_RPC_URL,
    'https://mainnet.base.org',
    'https://base.llamarpc.com',
    'https://base-mainnet.public.blastapi.io',
    'https://rpc.ankr.com/base',
    'https://1rpc.io/base',
    'https://base.drpc.org',
    'https://base-pokt.nodies.app',
  ].filter(Boolean)

  let client = null
  let lastError = null
  for (const rpcUrl of rpcUrls) {
    try {
      const candidate = createPublicClient({ chain: base, transport: http(rpcUrl, { timeout: 8000 }) })
      await candidate.getChainId()
      client = candidate
      break
    } catch (error) {
      lastError = error
      client = null
    }
  }

  if (!client) {
    throw new Error(`All RPC providers failed. Last error: ${lastError instanceof Error ? lastError.message : 'Unknown'}`)
  }

  const abi = [{
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  }]

  const balance = await client.readContract({
    address: coin.address,
    abi,
    functionName: 'balanceOf',
    args: [wallet],
  })

  const data = {
    wallet,
    coin: coinId,
    balance: balance.toString(),
    decimals: coin.decimals,
    symbol: coin.symbol,
    formattedBalance: formatBalance(balance, coin.decimals),
  }

  balanceCache.set(cacheKey, { data, timestamp: Date.now() })
  return { success: true, data }
}

function requestKey(prompt, model, provider) {
  return `${provider}::${model}::${prompt.slice(0, 200)}`
}

async function callPollinationsAPI(prompt) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    const encodedPrompt = encodeURIComponent(prompt)
    const response = await fetch(`https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!response.ok) {
      providerHealth.pollinations.failures++
      return { imageUrl: null, success: false }
    }
    const blob = await response.blob()
    const buffer = await blob.arrayBuffer()
    providerHealth.pollinations.failures = 0
    providerHealth.pollinations.lastSuccess = Date.now()
    return { imageUrl: `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`, success: true }
  } catch (error) {
    providerHealth.pollinations.failures++
    return { imageUrl: null, success: false }
  }
}

async function callVeniceAPI(prompt, model) {
  const apiKey = process.env.VENICE_API_KEY
  if (!apiKey) return { imageUrl: null, success: false }
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)
    const response = await fetch('https://api.venice.ai/api/v1/image/generate', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ prompt, model, width: 1024, height: 1024, format: 'png' }),
    })
    clearTimeout(timeoutId)
    if (!response.ok) {
      providerHealth.venice.failures += response.status === 402 ? 10 : 1
      return { imageUrl: null, success: false }
    }
    const data = await response.json()
    const imageUrl = data.images?.[0] ? `data:image/png;base64,${data.images[0]}` : null
    if (imageUrl) {
      providerHealth.venice.failures = 0
      providerHealth.venice.lastSuccess = Date.now()
    }
    return { imageUrl, success: !!imageUrl }
  } catch {
    providerHealth.venice.failures++
    return { imageUrl: null, success: false }
  }
}

async function callNetmindAPI(prompt, model) {
  const apiKey = process.env.NETMIND_API_KEY
  if (!apiKey) return { imageUrl: null, success: false }
  try {
    const response = await fetch('https://api.netmind.ai/inference-api/openai/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, prompt, response_format: 'b64_json' }),
    })
    if (!response.ok) {
      providerHealth.netmind.failures++
      return { imageUrl: null, success: false }
    }
    const data = await response.json()
    const imageUrl = data.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null
    if (imageUrl) {
      providerHealth.netmind.failures = 0
      providerHealth.netmind.lastSuccess = Date.now()
    }
    return { imageUrl, success: !!imageUrl }
  } catch {
    providerHealth.netmind.failures++
    return { imageUrl: null, success: false }
  }
}

async function callModalAPI(prompt) {
  const modalUrl = process.env.MODAL_IMAGE_GEN_URL
  if (!modalUrl) return { imageUrl: null, success: false }
  try {
    const response = await fetch(modalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, width: 1024, height: 1024 }),
    })
    if (!response.ok) {
      providerHealth.modal.failures++
      return { imageUrl: null, success: false }
    }
    const data = await response.json()
    const imageUrl = data.image || null
    if (imageUrl) {
      providerHealth.modal.failures = 0
      providerHealth.modal.lastSuccess = Date.now()
    }
    return { imageUrl, success: !!imageUrl }
  } catch {
    providerHealth.modal.failures++
    return { imageUrl: null, success: false }
  }
}

async function callFalAIAPI(prompt) {
  const apiKey = process.env.FAL_API_KEY
  if (!apiKey) return { imageUrl: null, success: false }
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        image_size: { width: 1280, height: 720 },
        num_inference_steps: 4,
      }),
    })
    clearTimeout(timeoutId)
    if (!response.ok) {
      providerHealth.fal.failures++
      return { imageUrl: null, success: false }
    }
    const data = await response.json()
    const imageUrl = data.images?.[0]?.url || null
    if (imageUrl) {
      providerHealth.fal.failures = 0
      providerHealth.fal.lastSuccess = Date.now()
    }
    return { imageUrl, success: !!imageUrl }
  } catch {
    providerHealth.fal.failures++
    return { imageUrl: null, success: false }
  }
}

function selectDefaultProvider() {
  if (process.env.FAL_API_KEY && providerHealth.fal.failures < 5) return 'fal'
  if (providerHealth.pollinations.failures < 10) return 'pollinations'
  if (process.env.VENICE_API_KEY && providerHealth.venice.failures < 5) return 'venice'
  if (process.env.NETMIND_API_KEY && providerHealth.netmind.failures < 5) return 'netmind'
  if (process.env.MODAL_IMAGE_GEN_URL && providerHealth.modal.failures < 5) return 'modal'
  return 'pollinations'
}

function defaultModelForProvider(provider) {
  if (provider === 'fal') return 'flux/schnell'
  if (provider === 'pollinations') return 'flux'
  if (provider === 'modal') return 'sdxl-turbo'
  if (provider === 'netmind') return 'black-forest-labs/FLUX.1-schnell'
  return 'venice-sd35'
}

async function generateImage({ prompt, type, model, provider }) {
  if (!prompt || !type) throw new Error('Missing prompt or type')

  const selectedProvider = provider || selectDefaultProvider()
  const selectedModel = model || defaultModelForProvider(selectedProvider)
  const key = requestKey(prompt, selectedModel, selectedProvider)
  const existing = IN_FLIGHT.get(key)
  if (existing) return existing

  const upstreamPromise = (async () => {
    const callProvider = (providerName, providerModel) => {
      if (providerName === 'fal') return callFalAIAPI(prompt)
      if (providerName === 'pollinations') return callPollinationsAPI(prompt)
      if (providerName === 'venice') return callVeniceAPI(prompt, providerModel)
      if (providerName === 'modal') return callModalAPI(prompt)
      return callNetmindAPI(prompt, providerModel)
    }

    let result = await callProvider(selectedProvider, selectedModel)
    if (result.success && result.imageUrl) {
      return { imageUrl: result.imageUrl, model: selectedModel, provider: selectedProvider }
    }

    const fallbackChain = [
      { provider: 'fal', model: 'flux/schnell' },
      { provider: 'venice', model: 'venice-sd35' },
      { provider: 'pollinations', model: 'flux' },
      { provider: 'modal', model: 'sdxl-turbo' },
      { provider: 'netmind', model: 'black-forest-labs/FLUX.1-schnell' },
    ].filter((entry) => entry.provider !== selectedProvider)

    for (const fallback of fallbackChain) {
      result = await callProvider(fallback.provider, fallback.model)
      if (result.success && result.imageUrl) {
        return { imageUrl: result.imageUrl, model: fallback.model, provider: fallback.provider }
      }
    }

    return { imageUrl: null, model: selectedModel, provider: 'failed' }
  })()

  IN_FLIGHT.set(key, upstreamPromise)
  try {
    return await upstreamPromise
  } finally {
    IN_FLIGHT.delete(key)
  }
}

function calculateMp3Duration(buffer) {
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

async function generateAudio({ text, voice = 'Rachel' }) {
  if (!text || typeof text !== 'string') throw new Error('Missing or invalid text parameter')
  if (text.length > 4096) throw new Error('Text exceeds maximum length of 4096 characters')

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return { audioUrl: null, error: 'ElevenLabs API key not configured' }

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
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    })
    if (!response.ok) {
      return { audioUrl: null, error: `ElevenLabs API error: ${response.status}` }
    }
    const audioBuffer = await response.arrayBuffer()
    return {
      audioUrl: `data:audio/mp3;base64,${Buffer.from(audioBuffer).toString('base64')}`,
      durationMs: calculateMp3Duration(audioBuffer),
      characterCount: text.length,
      voice: voiceId,
    }
  } catch {
    return { audioUrl: null, error: 'ElevenLabs TTS generation failed' }
  }
}

async function buildApp(opts = {}) {
  const app = Fastify({
    // Tests pass { logger: false }; production keeps the pretty transport.
    logger: opts.logger === undefined
      ? {
          level: 'info',
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
          },
        }
      : opts.logger,
    trustProxy: true,
    bodyLimit: 1048576,
  })

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin) || /\.vercel\.app$/.test(origin)) {
        cb(null, true)
        return
      }
      cb(new Error('Not allowed'), false)
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  })

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  app.get('/api/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
  }))

  app.get('/api/user/balance', async (request, reply) => {
    try {
      const { wallet, coin = 'avc' } = request.query || {}
      return reply.send(await fetchWriterCoinBalance(wallet || '', coin))
    } catch (error) {
      return reply.code(500).send({
        error: 'Failed to fetch balance',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

  app.post('/api/generate-image', async (request, reply) => {
    try {
      const body = request.body || {}
      return reply.send(await generateImage({
        prompt: body.prompt || '',
        type: body.type || '',
        model: body.model,
        provider: body.provider,
      }))
    } catch (error) {
      return reply.code(400).send({
        imageUrl: null,
        model: 'failed',
        provider: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

  app.post('/api/generate-audio', async (request, reply) => {
    try {
      const body = request.body || {}
      return reply.send(await generateAudio({ text: body.text || '', voice: body.voice }))
    } catch (error) {
      return reply.code(400).send({
        audioUrl: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

  /**
   * NFT Ownership Verification — proxied from Vercel to avoid cold-starting
   * a viem publicClient on every serverless invocation.
   *
   * Request:  { nftTokenId, walletAddress, contractAddress, chainId }
   * Response: { verified: boolean, error?: string }
   */
  app.post('/api/verify-nft-ownership', async (request, reply) => {
    try {
      const { nftTokenId, walletAddress, contractAddress, chainId } = request.body || {}

      if (!nftTokenId || !walletAddress || !contractAddress || !chainId) {
        return reply.code(400).send({
          verified: false,
          error: 'Missing required fields: nftTokenId, walletAddress, contractAddress, chainId',
        })
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return reply.code(400).send({ verified: false, error: 'Invalid wallet address' })
      }

      const rpcUrl = chainId === 8453
        ? 'https://mainnet.base.org'
        : chainId === 31611
          ? 'https://rpc.test.mezo.org'
          : 'https://mainnet.base.org'

      const chain = chainId === 8453
        ? base
        : { id: chainId, name: '', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } }

      const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })

      const owner = await publicClient.readContract({
        address: contractAddress,
        abi: [{
          name: 'ownerOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'tokenId', type: 'uint256' }],
          outputs: [{ name: '', type: 'address' }],
        }],
        functionName: 'ownerOf',
        args: [BigInt(nftTokenId)],
      })

      const verified = (owner).toLowerCase() === walletAddress.toLowerCase()
      return reply.send({
        verified,
        error: verified ? undefined : 'You do not own the NFT for this game.',
      })
    } catch (error) {
      return reply.send({
        verified: false,
        error: 'Could not verify NFT ownership. The token may not exist or the RPC is unavailable.',
      })
    }
  })

  return app
}

async function start() {
  const app = buildApp()
  await app.listen({ port: PORT, host: '0.0.0.0' })
}

module.exports = { buildApp, start }

// Only auto-start when run directly (`node src/index.js`), not when imported
// by tests or other tooling.
if (require.main === module) {
  start().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
