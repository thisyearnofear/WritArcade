import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/database'
import { getActor } from '@/services/auth'
import { logger } from '@/lib/config'
import { reportServerError } from '@/services/error-reporting'
import { verifyOnChainPayment } from '@/services/payments/payment-verifier'

/**
 * Unified Payment Verification Endpoint
 *
 * Used by both web app and mini app to verify on-chain payments.
 * Implements async verification: stores payment and returns polling endpoint.
 *
 * Hardened (P0):
 *  - Requires an authenticated wallet session matched to userAddress.
 *  - Decodes transaction calldata + verifies the expected payment function,
 *    writer coin, and paid amount per action.
 *  - Requires the expected on-chain event (GameGenerated / GameMinted / Mezo
 *    equivalents) and validates its sender, token and amount.
 *  - Makes transaction hashes immutable: identical reuse is idempotent, any
 *    reuse under a different action / wallet / chain / coin returns 409, and an
 *    existing payment is never updated into a different purpose.
 */

const verifyPaymentSchema = z.object({
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  writerCoinId: z.string().min(1, 'Writer coin ID is required'),
  action: z.enum(['generate-game', 'mint-nft']),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid user address'),
  chainId: z.number().int().positive(),
})

function samePaymentIdentity(
  a: { action: string; walletAddress?: string | null; chainId?: number | null; writerCoinId: string },
  b: { action: string; walletAddress: string; chainId: number; writerCoinId: string }
): boolean {
  return (
    a.action === b.action &&
    a.walletAddress?.toLowerCase() === b.walletAddress.toLowerCase() &&
    a.chainId === b.chainId &&
    a.writerCoinId === b.writerCoinId
  )
}

/**
 * POST: Initiate async payment verification
 * Returns endpoint for polling verification status
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor()
    const actorWallet = actor?.identity === 'wallet' ? actor.user.walletAddress?.toLowerCase() : null
    if (!actor || !actorWallet) {
      return NextResponse.json({ error: 'Wallet authentication is required' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = verifyPaymentSchema.parse(body)

    if (validatedData.userAddress.toLowerCase() !== actorWallet) {
      return NextResponse.json({ error: 'Authenticated wallet does not match userAddress' }, { status: 403 })
    }

    // Immutability: inspect any existing record for this tx hash before touching it.
    const existing = await prisma.payment.findUnique({
      where: { transactionHash: validatedData.transactionHash },
    })

    if (existing) {
      if (
        samePaymentIdentity(
          {
            action: existing.action,
            walletAddress: existing.walletAddress,
            chainId: existing.chainId,
            writerCoinId: existing.writerCoinId,
          },
          {
            action: validatedData.action,
            walletAddress: validatedData.userAddress,
            chainId: validatedData.chainId,
            writerCoinId: validatedData.writerCoinId,
          }
        )
      ) {
        // Idempotent reuse with identical metadata — return the verified result.
        if (existing.status === 'verified') {
          return NextResponse.json({
            success: true,
            paymentId: existing.id,
            transactionHash: existing.transactionHash,
            status: existing.status,
            statusCheckUrl: `/api/payments/${existing.id}/status`,
            idempotent: true,
          })
        }
      } else {
        return NextResponse.json(
          { error: 'This transaction hash is already registered for a different payment' },
          { status: 409 }
        )
      }
    }

    // Full on-chain verification (receipt, sender, contract, calldata, event, amount).
    const verified = await verifyOnChainPayment({
      transactionHash: validatedData.transactionHash as `0x${string}`,
      writerCoinId: validatedData.writerCoinId,
      userAddress: validatedData.userAddress,
      action: validatedData.action,
      chainId: validatedData.chainId,
    })

    const createData = {
      transactionHash: validatedData.transactionHash,
      action: validatedData.action,
      writerCoinId: validatedData.writerCoinId,
      status: 'verified' as const,
      userId: actor.user.id,
      walletAddress: validatedData.userAddress,
      chainId: validatedData.chainId,
      amount: verified.amount,
      verifiedAt: new Date(),
    }

    const payment = existing
      ? await prisma.payment.update({ where: { id: existing.id }, data: { status: 'verified', verifiedAt: new Date() } })
      : await prisma.payment.create({ data: createData })

    logger.payment('Payment recorded for verification', {
      paymentId: payment.id,
      transactionHash: validatedData.transactionHash,
      action: validatedData.action,
      status: payment.status,
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
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
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

    const payment = await prisma.payment.findFirst({
      where: paymentId ? { id: paymentId } : { transactionHash: transactionHash || '' },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status === 'verified') {
      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        status: 'verified',
        verifiedAt: payment.verifiedAt,
      })
    }

    if (payment.status === 'failed') {
      return NextResponse.json({
        success: false,
        paymentId: payment.id,
        status: 'failed',
        error: 'Transaction failed or was not mined',
      })
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      status: 'pending',
      message: 'Waiting for blockchain confirmation. Check back in a few seconds.',
    })
  } catch (error) {
    logger.error('[Payment Status] Error', error)
    reportServerError(error, { route: '/api/payments/verify (status)' })
    return NextResponse.json({ error: 'Failed to check payment status' }, { status: 500 })
  }
}

