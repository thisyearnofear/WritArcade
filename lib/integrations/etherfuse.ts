/**
 * Etherfuse FX API — fiat-to-crypto onramp service
 *
 * Docs: https://docs.etherfuse.com/
 * Sandbox: https://api.sand.etherfuse.com
 * Production: https://api.etherfuse.com
 */

const ETHERFUSE_API_URL =
  process.env.ETHERFUSE_API_URL || 'https://api.sand.etherfuse.com'
const ETHERFUSE_API_KEY = process.env.ETHERFUSE_API_KEY || ''

function getHeaders() {
  return {
    Authorization: ETHERFUSE_API_KEY,
    'Content-Type': 'application/json',
  }
}

export interface RampQuoteRequest {
  fiatCurrency: string
  fiatAmount: number
  cryptoCurrency: string
  destinationChain: string
}

export interface RampQuoteResponse {
  quoteId: string
  fiatAmount: number
  fiatCurrency: string
  cryptoAmount: string
  cryptoCurrency: string
  exchangeRate: string
  fee: string
  feeCurrency: string
  expiresAt: string
}

export interface RampOrderRequest {
  quoteId: string
  walletAddress: string
  redirectUrl: string
  webhookUrl: string
  idempotencyKey: string
}

export interface RampOrderResponse {
  orderId: string
  status: 'pending' | 'completed' | 'failed'
  widgetUrl?: string
  cryptoAmount: string
  cryptoCurrency: string
  destinationAddress: string
  destinationChain: string
  createdAt: string
}

export interface RampWebhookPayload {
  event: 'order.completed' | 'order.failed' | 'order.pending'
  orderId: string
  status: 'pending' | 'completed' | 'failed'
  walletAddress: string
  fiatAmount: number
  fiatCurrency: string
  cryptoAmount: string
  cryptoCurrency: string
  transactionHash?: string
  destinationChain: string
  timestamp: string
}

/**
 * Get a conversion quote for fiat → crypto
 */
export async function getQuote(
  request: RampQuoteRequest
): Promise<RampQuoteResponse> {
  const response = await fetch(
    `${ETHERFUSE_API_URL}/api/ramp/quote`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(request),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Etherfuse quote failed: ${response.status} ${error}`)
  }

  return response.json()
}

/**
 * Create a ramp order (fiat purchase)
 */
export async function createOrder(
  request: RampOrderRequest
): Promise<RampOrderResponse> {
  const response = await fetch(
    `${ETHERFUSE_API_URL}/api/ramp/order`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(request),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Etherfuse order failed: ${response.status} ${error}`)
  }

  return response.json()
}

/**
 * Verify webhook signature using Node.js crypto
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string
): Promise<boolean> {
  if (!process.env.ETHERFUSE_WEBHOOK_SECRET) {
    return true
  }
  const { createHmac, timingSafeEqual } = await import('node:crypto')
  const expected = createHmac('sha256', process.env.ETHERFUSE_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')
  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}
