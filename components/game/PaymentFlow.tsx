'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import { type PaymentToken, getPaymentTokenConfig, CREDITS_CONFIG } from '@/lib/writerCoins'
import type { PaymentAction } from '@/domains/payments/types'
import { ErrorCard } from '@/components/error/ErrorCard'
import { getUserMessage } from '@/services/error-handler'
import { useWriterCoinBalance } from '@/hooks/useWriterCoinBalance'
import { useMezoBalance } from '@/hooks/useMezoBalance'
import { useMUSDBalance } from '@/hooks/useMUSDBalance'
import { Loader2, Wallet, ExternalLink, ArrowRight, Banknote } from 'lucide-react'
import { PaymentStrategyFactory } from '@/domains/payments/services/payment-strategy-factory.service'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { BASE_MAINNET_CHAIN_ID, MEZO_TESTNET_CHAIN_ID, getChainInfo } from '@/lib/chains'
import { trackEvent } from '@/services/analytics'
import type { PaymentResult } from '@/domains/payments/strategies/payment-strategy'

const MEZO_TESTNET_EXPLORER_URL = 'https://explorer.test.mezo.org/tx'

interface PaymentFlowProps {
  paymentToken: PaymentToken
  action: PaymentAction
  costFormatted: string
  onPaymentStart?: () => void
  onPaymentSuccess?: (payment: PaymentResult) => void
  onPaymentError?: (error: string) => void
  disabled?: boolean
  compact?: boolean
}

const MUSDLogo = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center justify-center bg-amber-500 rounded-full text-black font-bold text-[10px] w-5 h-5", className)}>
    M
  </div>
)

export function PaymentFlow({
  paymentToken,
  action,
  costFormatted,
  onPaymentStart,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  compact = false,
}: PaymentFlowProps) {
  const { address: userAddress, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()

  const isMUSD = paymentToken.type === 'musd'
  const isCredits = paymentToken.type === 'credits'
  const config = getPaymentTokenConfig(paymentToken)
  const tokenSymbol = isCredits ? 'Credits' : isMUSD ? config.symbol : config.symbol

  const { balance, isLoading: isLoadingBalance, error: balanceError, refresh } = useWriterCoinBalance(isMUSD ? '' : (isCredits ? '' : paymentToken.coin.id))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isHolder: isMezoHolder, formatted: mezoFormatted, balance: rawMezoBalance } = useMezoBalance()

  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    balance: musdBalance,
    formatted: musdFormatted,
    isLoading: isMUSDBalanceLoading,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    error: musdBalanceError,
    refresh: refreshMUSDBalance,
  } = useMUSDBalance()

  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [isLoadingCredits, setIsLoadingCredits] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [creditSuccess, setCreditSuccess] = useState(false)
  const networkPromptTrackedRef = useRef<string | null>(null)
  const networkSwitchCompletedRef = useRef(false)

  useEffect(() => {
    if (!userAddress || !isCredits) return
    setIsLoadingCredits(true)
    fetch(`/api/ramp/credits?wallet=${encodeURIComponent(userAddress)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setCreditBalance(data.data.credits ?? 0)
      })
      .catch(() => setCreditBalance(0))
      .finally(() => setIsLoadingCredits(false))
  }, [userAddress, isCredits])

  const requiredAmount = useMemo(() => {
    if (isCredits) return CREDITS_CONFIG.cost[action] ?? 10
    const cost = action === 'generate-game' ? config.gameGenerationCost : config.mintCost
    return Number(cost) / 10 ** config.decimals
  }, [config, action, isCredits])

  const userBalance = useMemo(() => {
    if (isCredits) return creditBalance
    if (isMUSD) return parseFloat(musdFormatted)
    if (!balance?.formattedBalance) return null
    return parseFloat(balance.formattedBalance)
  }, [balance, isMUSD, musdFormatted, isCredits, creditBalance])

  const hasInsufficientBalance = useMemo(() => {
    if (userBalance === null || isLoadingBalance || isLoadingCredits) return false
    return userBalance < requiredAmount
  }, [userBalance, requiredAmount, isLoadingBalance, isLoadingCredits])

  const handleTokenPayment = useCallback(async () => {
    if (!walletClient || !userAddress) {
      setError('Wallet not available. Please make sure your wallet is connected.')
      return
    }

    if (hasInsufficientBalance) {
      const message = `Insufficient ${tokenSymbol} balance. You need ${requiredAmount} ${tokenSymbol} but have ${userBalance} ${tokenSymbol}.`
      setError(message)
      trackEvent('payment_failed', {
        action, token: tokenSymbol,
        network: isMUSD ? 'mezo' : 'base',
        amount: requiredAmount, error: message,
      })
      return
    }

    setIsProcessing(true)
    setError(null)
    setCurrentStep('Starting…')
    onPaymentStart?.()
    trackEvent('payment_started', { action, token: tokenSymbol, network: isMUSD ? 'mezo' : 'base', amount: requiredAmount })

    try {
      const strategy = PaymentStrategyFactory.getInstance().getStrategy(paymentToken)
      const amount = (action === 'generate-game' ? config.gameGenerationCost : config.mintCost).toString()
      const paymentResult = await strategy.executePayment({
        walletClient, userAddress, token: paymentToken, action, amount, onStep: setCurrentStep,
      })
      setLastTxHash(paymentResult.transactionHash)
      setCurrentStep(null)
      if (isMUSD) refreshMUSDBalance()
      else refresh()
      onPaymentSuccess?.(paymentResult)
    } catch (err) {
      const message = getUserMessage(err)
      setError(message)
      setCurrentStep(null)
      trackEvent('payment_failed', { action, token: tokenSymbol, network: isMUSD ? 'mezo' : 'base', amount: requiredAmount, error: message })
      onPaymentError?.(message)
      console.error('[PaymentFlow] Error:', err)
    } finally {
      setIsProcessing(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletClient, userAddress, paymentToken, action, hasInsufficientBalance, userBalance, requiredAmount, onPaymentSuccess, onPaymentError, refresh, isMUSD, config, tokenSymbol])

  const handleCreditPayment = useCallback(async () => {
    if (!userAddress) {
      setError('Wallet not connected.')
      return
    }
    if (hasInsufficientBalance) {
      setError(`Insufficient credits. Need ${requiredAmount} but have ${userBalance}.`)
      return
    }

    setIsProcessing(true)
    setError(null)
    setCurrentStep('Spending credits…')
    onPaymentStart?.()

    try {
      const response = await fetch('/api/credits/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error)

      setCreditBalance(data.data.creditsRemaining)
      setCurrentStep(null)
      setCreditSuccess(true)
      // Server-issued paymentId is the verification handle; the sentinel
      // transactionHash is display-only and never sent to the generate route.
      onPaymentSuccess?.({ transactionHash: `credits:${data.data.paymentId}`, paymentId: data.data.paymentId })
    } catch (err) {
      const message = getUserMessage(err)
      setError(message)
      setCurrentStep(null)
      onPaymentError?.(message)
    } finally {
      setIsProcessing(false)
    }
   
  }, [userAddress, action, hasInsufficientBalance, userBalance, requiredAmount, onPaymentStart, onPaymentSuccess, onPaymentError])

  const actionLabel = isCredits
    ? `Pay ${requiredAmount} Credits and ${action === 'generate-game' ? 'Generate' : 'Mint'}`
    : action === 'generate-game'
      ? `Pay ${costFormatted} ${tokenSymbol} and Generate`
      : `Mint as NFT (${costFormatted} ${tokenSymbol})`

  const targetChainId = isMUSD ? MEZO_TESTNET_CHAIN_ID : BASE_MAINNET_CHAIN_ID
  const isWrongChain = !isCredits && Boolean(chainId && chainId !== targetChainId)
  const networkName = isMUSD ? 'mezo' : 'base'

  useEffect(() => {
    if (!isWrongChain || !userAddress) return
    const promptKey = `${action}-${targetChainId}`
    if (networkPromptTrackedRef.current !== promptKey) {
      networkPromptTrackedRef.current = promptKey
      networkSwitchCompletedRef.current = false
      trackEvent('payment_network_switch_prompt_shown', { action, token: tokenSymbol, network: networkName, currentChainId: chainId, targetChainId })
    }
    const handlePageHide = () => {
      if (networkSwitchCompletedRef.current) return
      trackEvent('payment_network_switch_abandoned', { action, token: tokenSymbol, network: networkName, currentChainId: chainId, targetChainId })
    }
    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
  }, [action, chainId, isWrongChain, networkName, targetChainId, tokenSymbol, userAddress])

  const handleNetworkSwitch = useCallback(async () => {
    trackEvent('payment_network_switch_started', { action, token: tokenSymbol, network: networkName, currentChainId: chainId, targetChainId })
    try {
      await switchChainAsync({ chainId: targetChainId })
      networkSwitchCompletedRef.current = true
      trackEvent('payment_network_switch_succeeded', { action, token: tokenSymbol, network: networkName, targetChainId })
    } catch (err) {
      const message = getUserMessage(err)
      setError(message)
      onPaymentError?.(message)
    }
  }, [action, chainId, networkName, onPaymentError, switchChainAsync, targetChainId, tokenSymbol])

  if (creditSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-emerald-500/30 bg-emerald-900/20 p-4 text-sm text-emerald-200"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold">Paid with credits!</span>
        </div>
        <p className="mt-2 text-xs text-emerald-300/70">
          {requiredAmount} credits spent. {creditBalance !== null && `${creditBalance} credits remaining.`}
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {userAddress && !compact && !isCredits && (
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
                {isMUSD ? <MUSDLogo className="shadow-sm" /> : <Wallet className="w-4 h-4 text-purple-400" />}
                <span className={isMUSD ? "text-amber-200" : "text-purple-200"}>
                  {isMUSD ? "MUSD Balance" : "Your Balance"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isMUSD ? (
                  <>
                    {isMUSDBalanceLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    ) : (
                      <span className={cn("font-bold text-base", hasInsufficientBalance ? 'text-red-400' : 'text-amber-400')}>
                        {musdFormatted} {tokenSymbol}
                      </span>
                    )}
                  </>
                ) : isLoadingBalance ? (
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                ) : balanceError ? (
                  <span className="text-red-400">Unable to load</span>
                ) : (
                  <span className={cn("font-bold text-base", hasInsufficientBalance ? 'text-red-400' : 'text-green-400')}>
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
                <a href="https://mezo.org/docs/developers/musd/" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-amber-500 hover:text-amber-400 transition-colors font-semibold">
                  MUSD Faucet <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            )}
          </motion.div>
        )}

        {userAddress && !compact && isCredits && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-emerald-500/30 bg-slate-900/60 p-4"
          >
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-200">Credit Balance</span>
              </div>
              <div className="flex items-center gap-2">
                {isLoadingCredits ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                ) : (
                  <span className={cn("font-bold text-base", hasInsufficientBalance ? 'text-red-400' : 'text-emerald-400')}>
                    {creditBalance ?? 0} Credits
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-emerald-500/10 flex items-center justify-between text-[10px] text-emerald-200/60">
              <span>No blockchain fees — spend credits directly</span>
              <span className="font-semibold text-emerald-400">{requiredAmount} credits needed</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={isWrongChain ? handleNetworkSwitch : (isCredits ? handleCreditPayment : handleTokenPayment)}
        disabled={
          disabled || isProcessing || (isCredits ? !userAddress : (!walletClient || !userAddress)) ||
          (isCredits ? isLoadingCredits : isLoadingBalance) || hasInsufficientBalance
        }
        size="lg"
        className={cn(
          "w-full whitespace-normal rounded-lg py-4 text-sm font-bold transition-all duration-300 shadow-lg group sm:py-7 sm:text-base",
          isWrongChain ? "bg-slate-800 hover:bg-slate-700 text-white"
          : isCredits ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20"
          : isMUSD ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20"
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
            {isCredits && <Banknote className="w-4 h-4" />}
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
          className="rounded-xl border border-green-500/30 bg-green-900/20 p-3 text-xs flex items-center gap-3"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <span className="flex-1">
            Transaction confirmed! View on{' '}
            <a
              href={`${getChainInfo(targetChainId).blockExplorer ?? MEZO_TESTNET_EXPLORER_URL}/tx/${lastTxHash}`}
              target="_blank" rel="noopener noreferrer"
              className="underline font-semibold hover:text-green-300 transition-colors"
            >
              {getChainInfo(targetChainId).name} Explorer <ExternalLink className="w-3 h-3 inline-block" />
            </a>
          </span>
          <button onClick={() => setLastTxHash(null)} className="text-green-400/60 hover:text-green-300 transition-colors">✕</button>
        </motion.div>
      )}

      {!compact && (
        <div className={cn(
          "rounded-xl p-4 text-xs transition-colors",
          isCredits ? "bg-emerald-900/10 text-emerald-200/60"
          : isMUSD ? "bg-amber-900/10 text-amber-200/60"
          : "bg-purple-900/30 text-purple-300"
        )}>
          <p className="flex gap-2">
            <span className="text-base leading-none">💡</span>
            <span>
              {isCredits
                ? 'Credits are purchased via Etherfuse fiat onramp. No crypto wallet needed.'
                : <><span className="font-bold text-white/80">Payment flow:</span> You&apos;ll approve the {tokenSymbol} spend in your wallet, then process the transaction on {isMUSD ? 'Mezo' : 'Base'}.</>
              }
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
