import { prisma } from '@/lib/prisma'

/**
 * Refund a hero-video charge at most once. The conditional game update is the
 * idempotency gate, so a retry or concurrent status request cannot double-credit.
 */
export async function refundVideoCharge(params: {
  gameId: string
  userId: string | null
  paymentRef: string | null
  cost: number
  slug: string
  reason: string
}): Promise<boolean> {
  if (!params.userId || !params.paymentRef) return false
  const userId = params.userId
  const paymentRef = params.paymentRef

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { transactionHash: paymentRef },
      select: { status: true },
    })

    // A crash before the debit transaction means there is nothing to refund.
    // Release only the reservation, without minting credits.
    if (!payment) {
      await tx.game.updateMany({
        where: {
          id: params.gameId,
          videoPaymentRef: paymentRef,
          videoChargeRefundedAt: null,
        },
        data: {
          videoUpsoldAt: null,
          videoUpsellStatus: 'idle',
          videoPaymentRef: null,
          videoPaymentUserId: null,
        },
      })
      return false
    }

    if (payment.status === 'failed') return false

    const marked = await tx.game.updateMany({
      where: {
        id: params.gameId,
        videoPaymentRef: paymentRef,
        videoChargeRefundedAt: null,
      },
      data: { videoChargeRefundedAt: new Date(), videoUpsellStatus: 'failed' },
    })
    if (marked.count !== 1) return false

    await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: params.cost } },
    })
    await tx.creditTransaction.create({
      data: {
        userId,
        fiatAmount: 0,
        creditAmount: params.cost,
        status: 'refunded',
        completedAt: new Date(),
        metadata: { reason: params.reason, gameSlug: params.slug },
      },
    })
    await tx.payment.updateMany({
      where: { transactionHash: paymentRef },
      data: { status: 'failed' },
    })
    return true
  })
}
