'use client'

import { useState, useEffect } from 'react'
import { type WriterCoin } from '@/lib/writer-coins'
import {
  encodePayForGameGeneration,
  encodePayAndMintGame,
} from '@/lib/contracts'
import { detectWalletProvider, type WalletProvider } from '@/lib/wallet'

import { triggerHaptic, cn } from '@/lib/utils'

interface PaymentButtonProps {
  writerCoin?: WriterCoin | null
  isMUSD?: boolean
  action: 'generate-game' | 'mint-nft'
  gameId?: string
  onPaymentSuccess?: (transactionHash: string, storyIPAssetId?: string) => void
  onPaymentError?: (error: string) => void
  disabled?: boolean
}

export function PaymentButton({
  writerCoin,
  isMUSD,
  action,
  gameId,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
}: PaymentButtonProps) {
  const [provider, setProvider] = useState<WalletProvider | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function setupProvider() {
      const { provider } = await detectWalletProvider()
      setProvider(provider)
    }
    setupProvider()
  }, [])

  const cost = isMUSD 
    ? (action === 'generate-game' ? 1000000000000000000n : 1000000000000000000n)
    : (action === 'generate-game' ? writerCoin?.gameGenerationCost || 0n : writerCoin?.mintCost || 0n)

  const symbol = isMUSD ? 'MUSD' : writerCoin?.symbol || 'TOKENS'
  const decimals = isMUSD ? 18 : writerCoin?.decimals || 18
  const costFormatted = (Number(cost) / 10 ** decimals).toFixed(0)

  const actionLabel = action === 'generate-game'
    ? `Generate Game (${costFormatted} ${symbol})`
    : `Mint as NFT (${costFormatted} ${symbol})`

  const handlePayment = async () => {
    if (isMUSD) {
      triggerHaptic('error')
      setError('Mezo payments are optimized for the web app today. Switching to MUSD (Mezo Matsnet) in Farcaster wallet is coming soon.')
      return
    }

    if (!writerCoin) return

    setIsProcessing(true)
    setError(null)

    try {
      // Check wallet availability
      if (!provider) {
        throw new Error('Wallet is not available in this context')
      }

      // Step 1: Get user's wallet address
      const userAddress = await provider.getAddress()
      if (!userAddress) {
        throw new Error('Failed to get wallet address from wallet')
      }

      // Step 2: Initiate payment on backend to get payment details
      const initiateResponse = await fetch('/api/mini-app/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          writerCoinId: writerCoin.id,
          action,
          gameId,
          userAddress,
        }),
      })

      if (!initiateResponse.ok) {
        const errorData = await initiateResponse.json()
        throw new Error(errorData.error || 'Failed to initiate payment')
      }

      const paymentInfo = await initiateResponse.json()
      const contractAddress = paymentInfo.contractAddress as `0x${string}`

      // Step 3: Encode transaction data based on action
      let transactionData: string
      if (action === 'generate-game') {
        transactionData = encodePayForGameGeneration(
          writerCoin.address
        )
      } else {
        // Minting flow: requires metadata
        if (!paymentInfo.tokenURI || !paymentInfo.metadata) {
          throw new Error('Missing minting metadata from backend')
        }

        transactionData = encodePayAndMintGame(
          writerCoin.address,
          paymentInfo.tokenURI,
          paymentInfo.metadata
        )
      }

      // Step 4: Send transaction through Farcaster Wallet
      const txResult = await provider.sendTransaction({
        to: contractAddress,
        data: transactionData as `0x${string}`,
      })

      if (!txResult.success || !txResult.transactionHash) {
        throw new Error(txResult.error || 'Transaction failed')
      }

      // Step 5: Verify payment on backend
      const verifyResponse = await fetch('/api/mini-app/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionHash: txResult.transactionHash,
          writerCoinId: writerCoin.id,
          action,
          gameId,
          userAddress,
        }),
      })

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        throw new Error(errorData.error || 'Failed to verify payment')
      }

      const verifyResult = await verifyResponse.json()
      onPaymentSuccess?.(txResult.transactionHash, verifyResult.storyIPAssetId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      onPaymentError?.(message)
      console.error('Payment error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handlePayment}
        disabled={disabled || isProcessing}
        className={cn(
          "w-full rounded-xl px-6 py-4 font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 shadow-lg",
          isMUSD 
            ? "bg-amber-600 hover:bg-amber-500 shadow-amber-900/20" 
            : "bg-purple-600 hover:bg-purple-500 shadow-purple-900/20"
        )}
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </span>
        ) : (
          actionLabel
        )}
      </button>

      {error && (
        <div className={cn(
          "rounded-lg border p-3 transition-all duration-300",
          isMUSD ? "bg-amber-500/10 border-amber-500/30 text-amber-200" : "bg-red-500/20 border-red-500/50 text-red-200"
        )}>
          <p className="text-xs font-medium leading-relaxed">{error}</p>
        </div>
      )}

      <div className={cn(
        "rounded-lg border p-3 text-[10px] leading-relaxed transition-all",
        isMUSD 
          ? "bg-amber-900/10 border-amber-500/10 text-amber-200/50" 
          : "bg-purple-900/30 border-white/5 text-purple-100/40"
      )}>
        <p>
          💡 <span className="font-bold text-white/40">Protocol Info:</span> {isMUSD 
            ? "You'll authorize the MUSD spend on Mezo Matsnet. Ensure your Mezo Passport or wallet is set to the correct network." 
            : "You'll approve spending in your Farcaster wallet, then we process your payment on Base."}
        </p>
      </div>
    </div>
  )
}
