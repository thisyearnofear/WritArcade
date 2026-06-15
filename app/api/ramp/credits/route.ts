import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('wallet')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'wallet parameter required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      select: {
        credits: true,
        totalCreditsPurchased: true,
        creditTransactions: {
          where: { status: 'completed' },
          orderBy: { createdAt: 'desc' },
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
      },
    })

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
