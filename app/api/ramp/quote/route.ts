import { NextRequest, NextResponse } from 'next/server'
import { getQuote } from '@/lib/integrations/etherfuse'
import { z } from 'zod'

const quoteSchema = z.object({
  fiatAmount: z.number().positive().max(1000000, 'Amount too large'),
  fiatCurrency: z.string().default('USD'),
  cryptoCurrency: z.string().default('USDC'),
  destinationChain: z.string().default('base'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = quoteSchema.parse(body)

    const quote = await getQuote({
      fiatCurrency: validated.fiatCurrency,
      fiatAmount: validated.fiatAmount,
      cryptoCurrency: validated.cryptoCurrency,
      destinationChain: validated.destinationChain,
    })

    return NextResponse.json({
      success: true,
      data: {
        quoteId: quote.quoteId,
        fiatAmount: quote.fiatAmount,
        fiatCurrency: quote.fiatCurrency,
        cryptoAmount: quote.cryptoAmount,
        cryptoCurrency: quote.cryptoCurrency,
        exchangeRate: quote.exchangeRate,
        fee: quote.fee,
        expiresAt: quote.expiresAt,
        estimatedCredits: Math.floor(quote.fiatAmount / 10),
      },
    })
  } catch (error) {
    console.error('[Ramp Quote] Error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get quote' },
      { status: 500 }
    )
  }
}
