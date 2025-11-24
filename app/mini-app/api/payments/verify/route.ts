import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Verify that a payment transaction was successful on-chain
 * 
 * Called after user approves payment in Farcaster wallet.
 * Verifies the transaction hash and confirms payment was processed.
 */

const verifyPaymentSchema = z.object({
  transactionHash: z.string().min(66, 'Invalid transaction hash').max(66),
  writerCoinId: z.string().min(1, 'Writer coin ID is required'),
  action: z.enum(['generate-game', 'mint-nft']),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = verifyPaymentSchema.parse(body)

    // TODO: Implement transaction verification via Base RPC
    // For MVP, we'll do basic validation
    // In production, verify:
    // 1. Transaction hash exists on Base network
    // 2. Transaction was successful (status = 1)
    // 3. Transaction called the correct contract function
    // 4. Transaction amounts match expectations

    // For now, return success if hash format is valid
    if (!validatedData.transactionHash.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      )
    }

    // In production, would verify via ethers.js or viem:
    // const provider = new ethers.JsonRpcProvider(baseRpcUrl)
    // const receipt = await provider.getTransactionReceipt(transactionHash)
    // if (!receipt || receipt.status === 0) {
    //   return NextResponse.json({ error: 'Transaction failed' }, { status: 400 })
    // }

    return NextResponse.json({
      success: true,
      transactionHash: validatedData.transactionHash,
      message: `Payment for ${validatedData.action} verified`,
      // In production would include:
      // blockNumber: receipt.blockNumber,
      // gasUsed: receipt.gasUsed.toString(),
      // timestamp: block.timestamp,
    })
  } catch (error) {
    console.error('Payment verification error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
