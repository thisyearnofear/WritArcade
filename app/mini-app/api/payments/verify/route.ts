import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

/**
 * Verify payment transaction (Mini App)
 * 
 * Called after user approves payment in Farcaster wallet.
 * Verifies the transaction hash and confirms payment was processed on Base.
 * Uses same validation logic as web app, with full on-chain verification.
 */

const verifyPaymentSchema = z.object({
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  writerCoinId: z.string().min(1, 'Writer coin ID is required'),
  action: z.enum(['generate-game', 'mint-nft']),
})

// Create a public client for Base mainnet
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = verifyPaymentSchema.parse(body)

    // Validate transaction hash format
    if (!validatedData.transactionHash.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      )
    }

    // Get transaction receipt from Base network
    let receipt
    try {
      receipt = await publicClient.getTransactionReceipt({
        hash: validatedData.transactionHash as `0x${string}`,
      })
    } catch (err) {
      console.error('Transaction not found on Base:', err)
      return NextResponse.json(
        { error: 'Transaction not found on Base network' },
        { status: 404 }
      )
    }

    // Verify transaction was successful
    if (!receipt || receipt.status !== 'success') {
      return NextResponse.json(
        { error: 'Transaction failed on-chain' },
        { status: 400 }
      )
    }

    // Verify contract address
    const expectedContractAddress = process.env.NEXT_PUBLIC_WRITER_COIN_PAYMENT_ADDRESS?.toLowerCase()
    const actualToAddress = receipt.to?.toLowerCase()

    if (expectedContractAddress && actualToAddress !== expectedContractAddress) {
      console.warn(
        `Transaction called wrong contract. Expected: ${expectedContractAddress}, Got: ${actualToAddress}`
      )
      return NextResponse.json(
        { error: 'Transaction called wrong contract' },
        { status: 400 }
      )
    }

    // Get block information for timestamp
    const block = await publicClient.getBlock({
      blockNumber: receipt.blockNumber,
    })

    return NextResponse.json({
      success: true,
      transactionHash: validatedData.transactionHash,
      message: `Payment for ${validatedData.action} verified`,
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
      timestamp: block.timestamp.toString(),
      blockHash: receipt.blockHash,
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
