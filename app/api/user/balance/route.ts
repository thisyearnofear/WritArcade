import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { getWriterCoinById } from '@/lib/writerCoins'

/**
 * GET /api/user/balance
 * Fetch user's writer coin balance
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

    // Create Viem client with fallback providers
    const rpcUrls = [
      process.env.BASE_RPC_URL,
      'https://mainnet.base.org',
      'https://base.llamarpc.com',
      'https://base-mainnet.public.blastapi.io'
    ].filter(Boolean) as string[]

    console.log(`[Balance API] Fetching balance for ${wallet} (${coinId}) using ${rpcUrls.length} providers`)

    let client;
    let lastError;

    for (const rpcUrl of rpcUrls) {
      try {
        console.log(`[Balance API] Trying RPC: ${rpcUrl}`)
        client = createPublicClient({
          chain: base,
          transport: http(rpcUrl, { timeout: 8000 }),
        })
        
        // Test connection
        await client.getChainId()
        console.log(`[Balance API] RPC Success: ${rpcUrl}`)
        break
      } catch (e) {
        console.warn(`[Balance API] RPC Failed: ${rpcUrl}`, e instanceof Error ? e.message : 'Unknown error')
        lastError = e
        client = null
        continue
      }
    }

    if (!client) {
      console.error('[Balance API] All RPC providers failed')
      throw new Error(`All RPC providers failed. Last error: ${lastError instanceof Error ? lastError.message : 'Unknown'}`)
    }

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

    console.log(`[Balance API] Calling balanceOf on ${coin.address} for ${wallet}`)

    // Fetch balance from contract
    const balance = await client.readContract({
      address: coin.address as `0x${string}`,
      abi: ABI,
      functionName: 'balanceOf',
      args: [wallet as `0x${string}`],
    })

    console.log(`[Balance API] Raw balance: ${balance?.toString()}`)

    // Format balance (divide by decimals)
    const balanceBigInt = balance as bigint
    const divisor = BigInt(10 ** coin.decimals)
    const formattedBalance = (balanceBigInt / divisor).toString()
    const remainder = (balanceBigInt % divisor).toString().padStart(coin.decimals, '0')

    // Format with maximum 6 decimal places for better readability
    const maxDecimalPlaces = 6
    const formattedRemainder = remainder.slice(0, maxDecimalPlaces).replace(/0+$/, '')
    const formattedBalanceString = formattedRemainder === '' 
      ? formattedBalance 
      : `${formattedBalance}.${formattedRemainder}`

    return NextResponse.json({
      success: true,
      data: {
        wallet,
        coin: coinId,
        balance: balanceBigInt.toString(),
        decimals: coin.decimals,
        symbol: coin.symbol,
        formattedBalance: formattedBalanceString,
      },
    })
  } catch (error) {
    console.error('[Balance API] Error:', error)
    console.error('[Balance API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { 
        error: 'Failed to fetch balance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
