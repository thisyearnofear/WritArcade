'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import { type PaymentToken, getPaymentTokenConfig, MEZO_CONFIG } from '@/lib/writerCoins'
import type { PaymentAction } from '@/domains/payments/types'
import { ErrorCard } from '@/components/error/ErrorCard'
import { getUserMessage, retryWithBackoff } from '@/lib/error-handler'
import { useWriterCoinBalance } from '@/hooks/useWriterCoinBalance'
import { useMezoBalance } from '@/hooks/useMezoBalance'
import { useMUSDBalance } from '@/hooks/useMUSDBalance'
import { Loader2, Wallet, Sparkles, ExternalLink, ArrowRight } from 'lucide-react'
import { WriterCoinStrategy } from '@/domains/payments/strategies/writer-coin.strategy'
import { MUSDStrategy } from '@/domains/payments/strategies/musd.strategy'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { BASE_MAINNET_CHAIN_ID, MEZO_TESTNET_CHAIN_ID, getChainInfo } from '@/lib/chains'
import { trackEvent } from '@/lib/analytics'

const MEZO_TESTNET_EXPLORER_URL = 'https://explorer.test.mezo.org/tx'

interface PaymentFlowProps {
  paymentToken: PaymentToken
  action: PaymentAction
  costFormatted: string
  onPaymentSuccess?: (transactionHash: string) => void
  onPaymentError?: (error: string) => void
  disabled?: boolean
  compact?: boolean
}

/**
 * Stylized MUSD Logo for Mezo Hackathon track
 */
const MUSDLogo = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center justify-center bg-amber-500 rounded-full text-black font-bold text-[10px] w-5 h-5", className)}>
    M
  </div>
)

export function PaymentFlow({
  paymentToken,
  action,
  costFormatted,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  compact = false,
}: PaymentFlowProps) {
  const { address: userAddress, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()

  const isMUSD = paymentToken.type === 'musd'
  const config = getPaymentTokenConfig(paymentToken)
  const tokenSymbol = isMUSD ? config.symbol : config.symbol

  // Only check balance for WriterCoin right now
  const { balance, isLoading: isLoadingBalance, error: balanceError, refresh } = useWriterCoinBalance(isMUSD ? '' : paymentToken.coin.id)

  // Read MEZO balance only when paying in MUSD.
  const { isHolder: isMezoHolder, formatted: mezoFormatted, balance: rawMezoBalance } = useMezoBalance()

  // Read MUSD balance from on-chain (replaces previously mocked "Available")
  const {
    balance: musdBalance,
    formatted: musdFormatted,
    isLoading: isMUSDBalanceLoading,
    error: musdBalanceError,
    refresh: refreshMUSDBalance,
  } = useMUSDBalance()

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const networkPromptTrackedRef = useRef<string | null>(null)
  const networkSwitchCompletedRef = useRef(false)

  const requiredAmount = useMemo(() => {
    const cost = action === 'generate-game' ? config.gameGenerationCost : config.mintCost
    return Number(cost) / 10 ** config.decimals
  }, [config, action])

  const userBalance = useMemo(() => {
    if (isMUSD) {
      return parseFloat(musdFormatted)
    }
    if (!balance?.formattedBalance) return null
    return parseFloat(balance.formattedBalance)
  }, [balance, isMUSD, musdFormatted])

  const hasInsufficientBalance = useMemo(() => {
    if (userBalance === null || isLoadingBalance) return false
    return userBalance < requiredAmount
  }, [userBalance, requiredAmount, isLoadingBalance])

  const handlePayment = useCallback(async () => {
    if (!walletClient || !userAddress) {
      setError('Wallet not available. Please make sure your wallet is connected.')
      return
    }

    if (!config) {
      setError('Payment configuration missing. Please try selecting a different payment method.')
      return
    }

    if (hasInsufficientBalance) {
      const message = `Insufficient ${tokenSymbol} balance. You need ${requiredAmount} ${tokenSymbol} but have ${userBalance} ${tokenSymbol}.`
      setError(message)
      trackEvent('payment_failed', {
        action,
        token: tokenSymbol,
        network: isMUSD ? 'mezo' : 'base',
        amount: requiredAmount,
        error: message,
      })
      return
    }

    setIsProcessing(true)
    setError(null)
    setCurrentStep('Starting…')
    trackEvent('payment_started', {
      action,
      token: tokenSymbol,
      network: isMUSD ? 'mezo' : 'base',
      amount: requiredAmount,
    })

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
            amount,
            onStep: setCurrentStep,
          })
        },
        2,
        1500
      ).then((txHash) => {
        setLastTxHash(txHash)
        setCurrentStep(null)
        if (isMUSD) {
          refreshMUSDBalance()
        } else {
          refresh()
        }
        onPaymentSuccess?.(txHash)
      })
    } catch (err) {
      const message = getUserMessage(err)
      setError(message)
      setCurrentStep(null)
      trackEvent('payment_failed', {
        action,
        token: tokenSymbol,
        network: isMUSD ? 'mezo' : 'base',
        amount: requiredAmount,
        error: message,
      })
      onPaymentError?.(message)
      console.error('[PaymentFlow] Error:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [walletClient, userAddress, paymentToken, action, hasInsufficientBalance, userBalance, requiredAmount, onPaymentSuccess, onPaymentError, refresh, isMUSD, config])

  const actionLabel =
    action === 'generate-game'
      ? `Pay ${costFormatted} ${tokenSymbol} and Generate`
      : `Mint as NFT (${costFormatted} ${tokenSymbol})`

  const targetChainId = isMUSD ? MEZO_TESTNET_CHAIN_ID : BASE_MAINNET_CHAIN_ID
  const isWrongChain = Boolean(chainId && chainId !== targetChainId)
  const networkName = isMUSD ? 'mezo' : 'base'

  useEffect(() => {
    if (!isWrongChain || !userAddress) return

    const promptKey = `${action}-${targetChainId}`
    if (networkPromptTrackedRef.current !== promptKey) {
      networkPromptTrackedRef.current = promptKey
      networkSwitchCompletedRef.current = false
      trackEvent('payment_network_switch_prompt_shown', {
        action,
        token: tokenSymbol,
        network: networkName,
        currentChainId: chainId,
        targetChainId,
      })
    }

    const handlePageHide = () => {
      if (networkSwitchCompletedRef.current) return
      trackEvent('payment_network_switch_abandoned', {
        action,
        token: tokenSymbol,
        network: networkName,
        currentChainId: chainId,
        targetChainId,
      })
    }

    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
  }, [action, chainId, isWrongChain, networkName, targetChainId, tokenSymbol, userAddress])

  const handleNetworkSwitch = useCallback(async () => {
    trackEvent('payment_network_switch_started', {
      action,
      token: tokenSymbol,
      network: networkName,
      currentChainId: chainId,
      targetChainId,
    })

    try {
      await switchChainAsync({ chainId: targetChainId })
      networkSwitchCompletedRef.current = true
      trackEvent('payment_network_switch_succeeded', {
        action,
        token: tokenSymbol,
        network: networkName,
        targetChainId,
      })
    } catch (err) {
      const message = getUserMessage(err)
      trackEvent('payment_network_switch_failed', {
        action,
        token: tokenSymbol,
        network: networkName,
        targetChainId,
        error: message,
      })
      setError(message)
      onPaymentError?.(message)
    }
  }, [action, chainId, networkName, onPaymentError, switchChainAsync, targetChainId, tokenSymbol])

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {userAddress && !compact && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "rounded-xl border p-4 transition-all duration-300",
              isMUSD 
                ? "bg-slate-900/60 border-amber-500/30 shadow-[0_0_20px_-12px_rgba(245,158,11,0.3)]" 
                : "bg-purple-900/20 border-purple-500/30"
            )}
          >
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {isMUSD ? (
                  <MUSDLogo className="shadow-sm" />
                ) : (
                  <Wallet className="w-4 h-4 text-purple-400" />
                )}
                <span className={isMUSD ? "text-amber-200" : "text-purple-200"}>
                  {isMUSD ? "MUSD Balance" : "Your Balance"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isMUSD ? (
                  // Real on-chain MUSD balance
                  <>
                    {isMUSDBalanceLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    ) : musdBalanceError ? (
                      <span className="text-amber-400/70 text-xs">{musdFormatted} {tokenSymbol}</span>
                    ) : (
                      <span className={cn(
                        "font-bold text-base",
                        hasInsufficientBalance ? 'text-red-400' : 'text-amber-400'
                      )}>
                        {musdFormatted} {tokenSymbol}
                      </span>
                    )}
                  </>
                ) : isLoadingBalance ? (
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                ) : balanceError ? (
                  <span className="text-red-400">Unable to load</span>
                ) : (
                  <span className={cn(
                    "font-bold text-base",
                    hasInsufficientBalance ? 'text-red-400' : 'text-green-400'
                  )}>
                    {balance ? balance.formattedBalance : '0'} {tokenSymbol}
                  </span>
                )}
              </div>
            </div>

            {isMUSD && (
              <div className="mt-3 pt-3 border-t border-amber-500/10 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-amber-200/60 font-medium tracking-wide uppercase">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Mezo Matsnet Testnet
                </div>
                <a 
                  href="https://mezo.org/docs/developers/musd/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-amber-500 hover:text-amber-400 transition-colors font-semibold"
                >
                  MUSD Faucet <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isMUSD && userAddress && !compact && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "rounded-xl border p-4 text-xs relative overflow-hidden group transition-all duration-500",
            isMezoHolder
              ? 'bg-amber-900/30 border-amber-400/50 text-amber-100 shadow-[0_0_25px_-10px_rgba(245,158,11,0.4)]'
              : 'bg-slate-900/40 border-slate-700/40 text-slate-300'
          )}
        >
          {/* Animated Background for Holders */}
          {isMezoHolder && (
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-600/0 via-amber-400/20 to-amber-600/0 animate-shimmer" />
            </div>
          )}

          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                isMezoHolder ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-500"
              )}>
                <Sparkles className={cn("w-4 h-4", isMezoHolder && "animate-pulse")} />
              </div>
              <div className="flex flex-col">
                <span className={cn("font-bold", isMezoHolder ? "text-amber-300" : "text-slate-300")}>
                  {isMezoHolder ? "MEZO Holder Status Active" : "Unlock MEZO Holder Perks"}
                </span>
                <span className="opacity-70 text-[10px]">
                  {isMezoHolder 
                    ? `Balance: ${mezoFormatted} MEZO` 
                    : `Requires ${Number(MEZO_CONFIG.holderThreshold) / 10**18} MEZO`}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className={cn(
                "font-mono font-bold text-sm",
                isMezoHolder ? "text-amber-400" : "text-slate-500"
              )}>
                {(MEZO_CONFIG.holderDiscountBP / 100).toFixed(0)}% Boost
              </div>
              <div className="text-[9px] opacity-60">Writer Share</div>
            </div>
          </div>
        </motion.div>
      )}

      <Button
        onClick={isWrongChain ? handleNetworkSwitch : handlePayment}
        disabled={disabled || isProcessing || !walletClient || !userAddress || !!isLoadingBalance || hasInsufficientBalance}
        size="lg"
        className={cn(
          "w-full whitespace-normal rounded-lg py-4 text-sm font-bold transition-all duration-300 shadow-lg group sm:py-7 sm:text-base",
          isWrongChain 
            ? "bg-slate-800 hover:bg-slate-700 text-white" 
            : isMUSD 
              ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20"
              : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20"
        )}
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            {currentStep ?? 'Processing…'}
          </span>
        ) : isWrongChain ? (
          <span className="flex items-center justify-center gap-2 text-center">
            Switch to {isMUSD ? 'Mezo' : 'Base'} and Continue <ArrowRight className="w-4 h-4" />
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2 text-center">
            {actionLabel}
            {!disabled && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
          </span>
        )}
      </Button>

      {isWrongChain && !error && (
        <p className="text-xs text-muted-foreground text-center">
          You&apos;re on {chainId === BASE_MAINNET_CHAIN_ID ? 'Base' : chainId === MEZO_TESTNET_CHAIN_ID ? 'Mezo' : `chain ${chainId}`}.
          {' '}Pick a payment token above for your current chain, or use the button below to switch networks.
        </p>
      )}

      {error && <ErrorCard error={error} onDismiss={() => setError(null)} />}

      {lastTxHash && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-xl border p-3 text-xs transition-all duration-300 flex items-center gap-3",
            isMUSD
              ? "bg-green-900/20 border-green-500/30 text-green-200"
              : "bg-green-900/20 border-green-500/30 text-green-200"
          )}
        >
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <span className="flex-1">
            Transaction confirmed! View on{' '}
            <a
              href={`${getChainInfo(targetChainId).blockExplorer ?? MEZO_TESTNET_EXPLORER_URL}/tx/${lastTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold hover:text-green-300 transition-colors"
            >
              {getChainInfo(targetChainId).name} Explorer <ExternalLink className="w-3 h-3 inline-block" />
            </a>
          </span>
          <button
            onClick={() => setLastTxHash(null)}
            className="text-green-400/60 hover:text-green-300 transition-colors"
          >
            ✕
          </button>
        </motion.div>
      )}

      {!compact && (
        <div className={cn(
        "rounded-xl p-4 text-xs transition-colors",
        isMUSD ? "bg-amber-900/10 text-amber-200/60" : "bg-purple-900/30 text-purple-300"
      )}>
        <p className="flex gap-2">
          <span className="text-base leading-none">💡</span>
          <span>
            <span className="font-bold text-white/80">Payment flow:</span> You'll approve the {tokenSymbol} spend in your wallet, then process the transaction on {isMUSD ? 'Mezo' : 'Base'}.
          </span>
        </p>
        </div>
      )}
    </div>
  )
}
