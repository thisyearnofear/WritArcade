'use client'

import { useState, useMemo, useCallback } from 'react'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import { encodeFunctionData, toHex } from 'viem'
import { type PaymentToken, getPaymentTokenConfig } from '@/lib/writerCoins'
import type { PaymentAction } from '@/domains/payments/types'
import { ErrorCard } from '@/components/error/ErrorCard'
import { getUserMessage, retryWithBackoff } from '@/lib/error-handler'
import { useWriterCoinBalance } from '@/hooks/useWriterCoinBalance'
import { Loader2, Wallet } from 'lucide-react'
import { WriterCoinStrategy } from '@/domains/payments/strategies/writer-coin.strategy'
import { MUSDStrategy } from '@/domains/payments/strategies/musd.strategy'

interface PaymentFlowProps {
  paymentToken: PaymentToken
  action: PaymentAction
  costFormatted: string
  onPaymentSuccess?: (transactionHash: string) => void
  onPaymentError?: (error: string) => void
  disabled?: boolean
}

const BASE_CHAIN_ID = 8453

export function PaymentFlow({
  paymentToken,
  action,
  costFormatted,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
}: PaymentFlowProps) {
  const { address: userAddress, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()

  const isMUSD = paymentToken.type === 'musd'
  const config = getPaymentTokenConfig(paymentToken)
  const tokenSymbol = isMUSD ? config.symbol : config.symbol

  // Only check balance for WriterCoin right now
  const { balance, isLoading: isLoadingBalance, error: balanceError, refresh } = useWriterCoinBalance(isMUSD ? '' : paymentToken.coin.id)
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requiredAmount = useMemo(() => {
    const cost = action === 'generate-game' ? config.gameGenerationCost : config.mintCost
    return Number(cost) / 10 ** config.decimals
  }, [config, action])

  const userBalance = useMemo(() => {
    if (isMUSD) return Infinity // mock sufficient balance for MUSD
    if (!balance?.formattedBalance) return null
    return parseFloat(balance.formattedBalance)
  }, [balance, isMUSD])

  const hasInsufficientBalance = useMemo(() => {
    if (isMUSD) return false
    if (userBalance === null || isLoadingBalance) return false
    return userBalance < requiredAmount
  }, [userBalance, requiredAmount, isLoadingBalance, isMUSD])

  const handlePayment = useCallback(async () => {
    if (!walletClient || !userAddress) {
      setError('Wallet not available. Please make sure your wallet is connected.')
      return
    }

    if (hasInsufficientBalance) {
      setError(`Insufficient ${tokenSymbol} balance. You need ${requiredAmount} ${tokenSymbol} but have ${userBalance} ${tokenSymbol}.`)
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      await retryWithBackoff(
        async () => {
          const strategy = isMUSD ? new MUSDStrategy() : new WriterCoinStrategy()
          const amount = (action === 'generate-game' ? config.gameGenerationCost : config.mintCost).toString()
          
          return strategy.executePayment({
            walletClient,
            userAddress,
            token: paymentToken,
            action,
            amount
          })
        },
        2,
        1500
      ).then((txHash) => {
        if (!isMUSD) refresh()
        onPaymentSuccess?.(txHash)
      })
    } catch (err) {
      const message = getUserMessage(err)
      setError(message)
      onPaymentError?.(message)
      console.error('[PaymentFlow] Error:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [walletClient, userAddress, paymentToken, action, hasInsufficientBalance, userBalance, requiredAmount, onPaymentSuccess, onPaymentError, refresh, isMUSD, config])

  const actionLabel =
    action === 'generate-game'
      ? `Generate Game (${costFormatted} ${tokenSymbol})`
      : `Mint as NFT (${costFormatted} ${tokenSymbol})`

  const targetChainId = isMUSD ? 31611 : BASE_CHAIN_ID // 31611 is Mezo Testnet
  const isWrongChain = Boolean(chainId && chainId !== targetChainId)

  return (
    <div className="space-y-3">
      {userAddress && (
        <div className="rounded-lg bg-purple-900/20 border border-purple-500/30 p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-400" />
              <span className="text-purple-200">Your Balance:</span>
            </div>
            <div className="flex items-center gap-2">
              {isLoadingBalance ? (
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              ) : balanceError ? (
                <span className="text-red-400">Unable to load</span>
              ) : (
                <>
                  <span className={`font-semibold ${hasInsufficientBalance ? 'text-red-400' : 'text-green-400'}`}>
                    {isMUSD ? 'N/A' : (balance ? balance.formattedBalance : '0')} {tokenSymbol}
                  </span>
                  {hasInsufficientBalance && (
                    <span className="text-xs text-red-400">(Insufficient)</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={disabled || isProcessing || !walletClient || !userAddress || !!isLoadingBalance || hasInsufficientBalance || isWrongChain}
        className="w-full rounded-lg bg-purple-600 px-6 py-4 font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing payment...
          </span>
        ) : isWrongChain ? (
          <span onClick={() => switchChainAsync({ chainId: targetChainId })} className="cursor-pointer">
            Switch to {isMUSD ? 'Mezo Network' : 'Base Network'}
          </span>
        ) : (
          actionLabel
        )}
      </button>

      {error && <ErrorCard error={error} onDismiss={() => setError(null)} />}

      <div className="rounded-lg bg-purple-900/30 p-3 text-xs text-purple-300">
        <p>
          💡 <span className="font-semibold">Payment flow:</span> You'll approve spending in your wallet, then we process your payment on Base.
        </p>
      </div>
    </div>
  )
}