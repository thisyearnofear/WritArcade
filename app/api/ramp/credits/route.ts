import { NextRequest, NextResponse } from 'next/server'
import { CreditTransactionStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'

const creditsSelect = {
  credits: true,
  totalCreditsPurchased: true,
  creditTransactions: {
    where: { status: CreditTransactionStatus.completed },
    orderBy: { createdAt: 'desc' as const },
    take: 20,
    select: {
      id: true,
      creditAmount: true,
      fiatAmount: true,
      fiatCurrency: true,
      createdAt: true,
      completedAt: true,
    },
  },
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('wallet')

    let user
    if (walletAddress) {
      user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
        select: creditsSelect,
      })
    } else {
      // No wallet param: resolve from the signed session (guest/email users).
      // No session at all → data: null so the UI stays hidden for visitors.
      const actor = await getActor()
      if (!actor) {
        return NextResponse.json({ success: true, data: null })
      }
      user = await prisma.user.findUnique({
        where: { id: actor.user.id },
        select: creditsSelect,
      })
    }

    if (!user) {
      return NextResponse.json({
        success: true,
        data: { credits: 0, totalPurchased: 0, transactions: [] },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        credits: user.credits,
        totalPurchased: user.totalCreditsPurchased,
        transactions: user.creditTransactions,
      },
    })
  } catch (error) {
    console.error('[Ramp Credits] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    )
  }
}
