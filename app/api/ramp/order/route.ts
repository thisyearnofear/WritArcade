import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createOrder } from '@/lib/integrations/etherfuse'
import { getActor } from '@/services/auth'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const orderSchema = z.object({
  quoteId: z.string().min(1),
  fiatAmount: z.number().positive(),
  fiatCurrency: z.string().default('USD'),
  redirectUrl: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = orderSchema.parse(body)

    // Identity comes from the signed session cookie, never the request body.
    const actor = await getActor()
    if (!actor) {
      return NextResponse.json(
        { error: 'Sign in to buy credits.' },
        { status: 401 }
      )
    }
    const user = actor.user

    // Anonymous guests must attach an email before purchasing so the
    // purchase survives cookie loss (magic-link recovery).
    if (!user.walletAddress && !user.email) {
      return NextResponse.json(
        { error: 'Add an email to buy credits.', code: 'EMAIL_REQUIRED' },
        { status: 409 }
      )
    }

    // Settlement address: buyer wallet when present, otherwise the platform
    // treasury (credits are ledger entries; the crypto leg lands with us).
    const settlementAddress =
      user.walletAddress || process.env.ETHERFUSE_TREASURY_ADDRESS
    if (!settlementAddress) {
      console.error('[Ramp Order] ETHERFUSE_TREASURY_ADDRESS not configured for wallet-less purchase')
      return NextResponse.json(
        { error: 'Credit purchases are temporarily unavailable.' },
        { status: 503 }
      )
    }

    const idempotencyKey = uuidv4()
    const redirectUrl =
      validated.redirectUrl ||
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://writersarcade.vercel.app'}/my-games`
    const webhookUrl =
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://writersarcade.vercel.app'}/api/ramp/webhook`

    const order = await createOrder({
      quoteId: validated.quoteId,
      walletAddress: settlementAddress,
      redirectUrl,
      webhookUrl,
      idempotencyKey,
    })

    const creditAmount = Math.floor(validated.fiatAmount / 10)

    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        etherfuseOrderId: order.orderId,
        externalRef: idempotencyKey,
        fiatAmount: validated.fiatAmount,
        fiatCurrency: validated.fiatCurrency,
        creditAmount,
        status: 'pending',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.orderId,
        widgetUrl: order.widgetUrl,
        status: order.status,
        cryptoAmount: order.cryptoAmount,
        cryptoCurrency: order.cryptoCurrency,
        creditAmount,
        redirectUrl,
      },
    })
  } catch (error) {
    console.error('[Ramp Order] Error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create order' },
      { status: 500 }
    )
  }
}
