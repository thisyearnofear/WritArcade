import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createPublicClient, http, type Chain } from 'viem'
import { prisma } from '@/lib/database'
import { getCurrentUser } from '@/services/auth'
import { logger } from '@/lib/config'
import { reportServerError } from '@/services/error-reporting'
import { BASE_MAINNET_CHAIN_ID, MEZO_TESTNET_CHAIN_ID } from '@/lib/chains'
import { getWriterCoinById, MUSD_CONFIG } from '@/lib/writerCoins'

/**
 * Unified Payment Verification Endpoint
 * 
 * Used by both web app and mini app to verify on-chain payments.
 * Implements async verification: stores payment and returns polling endpoint.
 * 
 * POST: Initiate verification (returns polling endpoint)
 * GET: Check verification status
 */

const verifyPaymentSchema = z.object({
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  writerCoinId: z.string().min(1, 'Writer coin ID is required'),
  action: z.enum(['generate-game', 'mint-nft']),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid user address'),
  chainId: z.number().int().positive(),
})

function getExpectedPaymentContract(writerCoinId: string): string | null {
  if (writerCoinId.startsWith('musd')) {
    const network = writerCoinId === 'musd-mainnet' ? 'mainnet' : 'testnet'
    return MUSD_CONFIG[network].paymentSplitter
  }

  const writerCoin = getWriterCoinById(writerCoinId)
  return process.env.NEXT_PUBLIC_WRITER_COIN_PAYMENT_ADDRESS || writerCoin?.paymentContractAddress || null
}

function getPaymentAmount(writerCoinId: string, action: 'generate-game' | 'mint-nft') {
  if (writerCoinId.startsWith('musd')) {
    const network = writerCoinId === 'musd-mainnet' ? 'mainnet' : 'testnet'
    const config = MUSD_CONFIG[network]
    return action === 'generate-game' ? config.gameGenerationCost : config.mintCost
  }

  const writerCoin = getWriterCoinById(writerCoinId)
  if (!writerCoin) {
    throw new Error(`Writer coin "${writerCoinId}" is not configured`)
  }

  return action === 'generate-game' ? writerCoin.gameGenerationCost : writerCoin.mintCost
}

function toNativeBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' || typeof value === 'string') return BigInt(value)
  if (
    value &&
    typeof value === 'object' &&
    '$type' in value &&
    'value' in value &&
    (value as { $type?: unknown }).$type === 'BigInt'
  ) {
    return BigInt(String((value as { value: unknown }).value))
  }
  throw new Error('Invalid payment amount')
}

function getRpcUrl(chainId: number) {
  if (chainId === BASE_MAINNET_CHAIN_ID) return process.env.BASE_RPC_URL || 'https://mainnet.base.org'
  if (chainId === MEZO_TESTNET_CHAIN_ID) return process.env.NEXT_PUBLIC_MEZO_TESTNET_RPC || 'https://rpc.test.mezo.org'
  return null
}

function createReceiptClient(chainId: number) {
  const rpcUrl = getRpcUrl(chainId)
  if (!rpcUrl) return null

  const chain = {
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  } as Chain

  return createPublicClient({ chain, transport: http(rpcUrl, { timeout: 15000 }) })
}

async function verifyTransactionReceipt(params: {
  transactionHash: `0x${string}`
  writerCoinId: string
  userAddress: string
  chainId: number
}) {
  const expectedContract = getExpectedPaymentContract(params.writerCoinId)
  if (!expectedContract) {
    throw new Error(`Payment contract is not configured for ${params.writerCoinId}`)
  }

  const client = createReceiptClient(params.chainId)
  if (!client) {
    throw new Error(`Unsupported payment chain: ${params.chainId}`)
  }

  const [receipt, transaction] = await Promise.all([
    client.getTransactionReceipt({ hash: params.transactionHash }),
    client.getTransaction({ hash: params.transactionHash }),
  ])

  if (receipt.status !== 'success') {
    throw new Error('Transaction did not succeed')
  }

  if (transaction.from.toLowerCase() !== params.userAddress.toLowerCase()) {
    throw new Error('Payment sender does not match connected wallet')
  }

  if (transaction.to?.toLowerCase() !== expectedContract.toLowerCase()) {
    throw new Error('Transaction was not sent to the expected payment contract')
  }
}

/**
 * POST: Initiate async payment verification
 * Returns endpoint for polling verification status
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const body = await request.json()
    const validatedData = verifyPaymentSchema.parse(body)
    await verifyTransactionReceipt({
      transactionHash: validatedData.transactionHash as `0x${string}`,
      writerCoinId: validatedData.writerCoinId,
      userAddress: validatedData.userAddress,
      chainId: validatedData.chainId,
    })
    const amount = toNativeBigInt(getPaymentAmount(validatedData.writerCoinId, validatedData.action)).toString()

    // Store the verified payment wallet directly. SIWE is optional during
    // creation, so userId can be null while walletAddress remains canonical.
    const payment = await prisma.payment.upsert({
      where: { transactionHash: validatedData.transactionHash },
      update: {
        action: validatedData.action,
        writerCoinId: validatedData.writerCoinId,
        status: 'verified',
        userId: user?.id,
        walletAddress: validatedData.userAddress,
        chainId: validatedData.chainId,
        amount,
        verifiedAt: new Date(),
      },
      create: {
        transactionHash: validatedData.transactionHash,
        action: validatedData.action,
        writerCoinId: validatedData.writerCoinId,
        status: 'verified',
        userId: user?.id,
        walletAddress: validatedData.userAddress,
        chainId: validatedData.chainId,
        amount,
        verifiedAt: new Date(),
      }
    })

    logger.payment('Payment recorded for verification', {
      paymentId: payment.id,
      transactionHash: validatedData.transactionHash,
      action: validatedData.action,
      status: payment.status,
      userId: user?.id,
      walletAddress: validatedData.userAddress,
      chainId: validatedData.chainId,
    })

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      transactionHash: validatedData.transactionHash,
      status: payment.status,
      statusCheckUrl: `/api/payments/${payment.id}/status`,
    })
  } catch (error) {
    logger.error('[Payment Verify] Error', error)
    reportServerError(error, { route: '/api/payments/verify' })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}

/**
 * GET: Check payment verification status
 * Polls blockchain for transaction confirmation
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const paymentId = searchParams.get('paymentId')
    const transactionHash = searchParams.get('transactionHash')

    if (!paymentId && !transactionHash) {
      return NextResponse.json(
        { error: 'Either paymentId or transactionHash is required' },
        { status: 400 }
      )
    }

    // Fetch payment record
    const payment = await prisma.payment.findFirst({
      where: paymentId 
        ? { id: paymentId }
        : { transactionHash: transactionHash || '' }
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // If already verified, return cached result
    if (payment.status === 'verified') {
      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        status: 'verified',
        verifiedAt: payment.verifiedAt,
      })
    }

    // If failed, return failure
    if (payment.status === 'failed') {
      return NextResponse.json({
        success: false,
        paymentId: payment.id,
        status: 'failed',
        error: 'Transaction failed or was not mined',
      })
    }

    // Verification in progress - return pending status
    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      status: 'pending',
      message: 'Waiting for blockchain confirmation. Check back in a few seconds.',
    })
  } catch (error) {
    logger.error('[Payment Status] Error', error)
    reportServerError(error, { route: '/api/payments/verify (status)' })
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    )
  }
}
