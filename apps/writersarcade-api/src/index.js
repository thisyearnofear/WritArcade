require('dotenv').config()
const Fastify = require('fastify')
const cors = require('@fastify/cors')
const rateLimit = require('@fastify/rate-limit')
const { fetchWriterCoinBalance } = require('../../../dist-backend/domains/payments/services/writer-coin-balance.service.cjs')
const { generateImage } = require('../../../dist-backend/domains/media/services/image-generation-api.service.cjs')
const { generateAudio } = require('../../../dist-backend/domains/media/services/audio-generation.service.cjs')

const PORT = Number(process.env.PORT || 3800)
const ALLOWED_ORIGINS = [
  'https://writersarcade.vercel.app',
  'https://www.writersarcade.com',
  'https://writersarcade.com',
]

async function start() {
  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
      },
    },
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
      return reply.send(await generateAudio({
        text: body.text || '',
        voice: body.voice,
      }))
    } catch (error) {
      return reply.code(400).send({
        audioUrl: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

  await app.listen({ port: PORT, host: '0.0.0.0' })
}

start().catch((error) => {
  console.error(error)
  process.exit(1)
})
