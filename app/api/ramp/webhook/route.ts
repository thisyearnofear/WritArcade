import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  type RampWebhookPayload,
  verifyWebhookSignature,
} from '@/lib/etherfuse'
import { reportServerError } from '@/services/error-reporting'

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text()
    const signature = request.headers.get('x-etherfuse-signature') || ''

    if (!await verifyWebhookSignature(bodyText, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const payload: RampWebhookPayload = JSON.parse(bodyText)

    const transaction = await prisma.creditTransaction.findFirst({
      where: { etherfuseOrderId: payload.orderId },
      include: { user: true },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (payload.event === 'order.completed') {
      await prisma.$transaction([
        prisma.creditTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        }),
        prisma.user.update({
          where: { id: transaction.userId },
          data: {
            credits: { increment: transaction.creditAmount },
            totalCreditsPurchased: { increment: transaction.creditAmount },
          },
        }),
      ])

      console.log(
        `[Ramp Webhook] Credited ${transaction.creditAmount} to user ${transaction.userId}`
      )
    } else if (payload.event === 'order.failed') {
      await prisma.creditTransaction.update({
        where: { id: transaction.id },
        data: { status: 'failed' },
      })

      console.warn(
        `[Ramp Webhook] Order ${payload.orderId} failed`
      )
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Ramp Webhook] Error:', error)
    reportServerError(error, { route: '/api/ramp/webhook' })
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
