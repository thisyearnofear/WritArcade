import { prisma } from '@/lib/prisma'
import type { Game } from '@/domains/games/types'

export interface GameFundingContext {
  paymentId: string
  writerCoinId: string
  walletAddress: string | null
  userId?: string | null
  ownershipSource: 'payment_wallet' | 'credits_user'
}

type PaymentLookup =
  | { paymentId: string; transactionHash?: never }
  | { paymentId?: never; transactionHash: string }

export class GameFundingService {
  static async getVerifiedCreationPayment(lookup: PaymentLookup): Promise<GameFundingContext | null> {
    const payment = await prisma.payment.findUnique({
      where: 'paymentId' in lookup
        ? { id: lookup.paymentId }
        : { transactionHash: lookup.transactionHash },
      select: {
        id: true,
        action: true,
        status: true,
        writerCoinId: true,
        walletAddress: true,
        userId: true,
        user: { select: { walletAddress: true } },
      },
    })

    if (
      !payment ||
      payment.action !== 'generate-game' ||
      payment.status !== 'verified' ||
      !payment.writerCoinId
    ) {
      return null
    }

    const walletAddress = payment.walletAddress || payment.user?.walletAddress || null

    // Credits-funded generations have no wallet; ownership rides on games.userId.
    if (payment.writerCoinId === 'credits') {
      if (!payment.userId) return null
      return {
        paymentId: payment.id,
        writerCoinId: payment.writerCoinId,
        walletAddress,
        userId: payment.userId,
        ownershipSource: 'credits_user',
      }
    }

    if (!walletAddress) return null

    return {
      paymentId: payment.id,
      writerCoinId: payment.writerCoinId,
      walletAddress,
      ownershipSource: 'payment_wallet',
    }
  }

  static async getGameFunding(gameId: string): Promise<Pick<GameFundingContext, 'writerCoinId'> | null> {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        writerCoinId: true,
        payment: {
          select: {
            writerCoinId: true,
          },
        },
      },
    })

    const writerCoinId = game?.writerCoinId || game?.payment?.writerCoinId
    if (!game || !writerCoinId) return null

    if (!game.writerCoinId && game.payment?.writerCoinId) {
      await prisma.game.update({
        where: { id: game.id },
        data: { writerCoinId: game.payment.writerCoinId },
      })
    }

    return { writerCoinId }
  }

  static buildOwnership(
    funding: GameFundingContext | null,
    fallback: { siweWallet?: string | null; connectedWallet?: string | null }
  ): Pick<Game, 'ownerWallet' | 'ownershipSource' | 'creatorWallet' | 'paymentId'> {
    if (funding) {
      if (funding.ownershipSource === 'credits_user') {
        const wallet = funding.walletAddress || fallback.siweWallet || undefined
        return {
          ...(wallet ? { ownerWallet: wallet, creatorWallet: wallet } : {}),
          ownershipSource: funding.ownershipSource,
          paymentId: funding.paymentId,
        }
      }
      return {
        ownerWallet: funding.walletAddress ?? undefined,
        ownershipSource: funding.ownershipSource,
        creatorWallet: funding.walletAddress ?? undefined,
        paymentId: funding.paymentId,
      }
    }

    if (fallback.siweWallet) {
      return {
        ownerWallet: fallback.siweWallet,
        ownershipSource: 'siwe_user',
        creatorWallet: fallback.siweWallet,
      }
    }

    if (fallback.connectedWallet) {
      return {
        ownerWallet: fallback.connectedWallet,
        ownershipSource: 'legacy_creator_wallet',
        creatorWallet: fallback.connectedWallet,
      }
    }

    return {}
  }
}
