import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createOrder } from '@/lib/etherfuse'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const orderSchema = z.object({
  quoteId: z.string().min(1),
  walletAddress: z.string().min(1),
  fiatAmount: z.number().positive(),
  fiatCurrency: z.string().default('USD'),
  redirectUrl: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = orderSchema.parse(body)

    const idempotencyKey = uuidv4()
    const redirectUrl =
      validated.redirectUrl ||
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://writersarcade.vercel.app'}/my-games`
    const webhookUrl =
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://writersarcade.vercel.app'}/api/ramp/webhook`

    const order = await createOrder({
      quoteId: validated.quoteId,
      walletAddress: validated.walletAddress,
      redirectUrl,
      webhookUrl,
      idempotencyKey,
    })

    const creditAmount = Math.floor(validated.fiatAmount / 10)

    const user = await prisma.user.findUnique({
      where: { walletAddress: validated.walletAddress.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Connect your wallet first.' },
        { status: 404 }
      )
    }

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
