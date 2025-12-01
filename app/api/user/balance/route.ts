import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { getWriterCoinById } from '@/lib/writerCoins'

/**
 * GET /api/user/balance
 * Fetch user's writer coin (AVC) balance
 * Query params: wallet (required), coin (optional, defaults to 'avc')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')
    const coinId = searchParams.get('coin') || 'avc'

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      )
    }

    // Validate wallet format
    if (!wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Get writer coin configuration
    const coin = getWriterCoinById(coinId)
    if (!coin) {
      return NextResponse.json(
        { error: `Unknown writer coin: ${coinId}` },
        { status: 400 }
      )
    }

    // Create Viem client for Base network
    const client = createPublicClient({
      chain: base,
      transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
    })

    // ERC-20 balanceOf ABI (minimal)
    const ABI = [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: 'balance', type: 'uint256' }],
      },
    ]

    // Fetch balance from contract
    const balance = await client.readContract({
      address: coin.address as `0x${string}`,
      abi: ABI,
      functionName: 'balanceOf',
      args: [wallet as `0x${string}`],
    })

    // Format balance (divide by decimals)
    const balanceBigInt = balance as bigint
    const divisor = BigInt(10 ** coin.decimals)
    const formattedBalance = (balanceBigInt / divisor).toString()
    const remainder = (balanceBigInt % divisor).toString().padStart(coin.decimals, '0')

    return NextResponse.json({
      success: true,
      data: {
        wallet,
        coin: coinId,
        balance: balanceBigInt.toString(),
        decimals: coin.decimals,
        symbol: coin.symbol,
        formattedBalance: remainder === '0' ? formattedBalance : `${formattedBalance}.${remainder}`,
      },
    })
  } catch (error) {
    console.error('Balance fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    )
  }
}
