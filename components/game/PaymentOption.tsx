'use client'

import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { type WriterCoin, type PaymentToken } from '@/lib/writerCoins'
import { PaymentFlow } from './PaymentFlow'
import { CostPreview } from './CostPreview'
import { WalletConnect } from '@/components/ui/wallet-connect'
import { PaymentCostService } from '@/domains/payments/services/payment-cost.service'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PaymentAction } from '@/domains/payments/types'
import { AlertCircle, ArrowRightLeft } from 'lucide-react'
import { PaymentTokenSelector } from './PaymentTokenSelector'
import { trackEvent } from '@/lib/analytics'
import { BASE_MAINNET_CHAIN_ID, MEZO_TESTNET_CHAIN_ID, getChainInfo } from '@/lib/chains'

interface PaymentOptionProps {
  writerCoin: WriterCoin
  action: PaymentAction
  onPaymentStart?: () => void
  onPaymentSuccess?: (transactionHash: string) => void
  onPaymentError?: (error: string) => void
  disabled?: boolean
  initialToken?: PaymentToken
  compact?: boolean
  _optional?: boolean // If true, user can skip payment
  _onSkip?: () => void
}

/**
 * Payment UI component for web app
 *
 * Shows:
 * 1. Wallet connection requirement (if not connected)
 * 2. Cost preview
 * 3. Payment flow (if connected)
 * 4. Option to skip (if optional)
 */
export function PaymentOption({
  writerCoin,
  action,
  onPaymentStart,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  initialToken,
  compact = false,
  _optional = false,
  _onSkip,
}: PaymentOptionProps) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain()
  const walletPromptTrackedRef = useRef(false)
  const walletConnectedTrackedRef = useRef(false)

  const writerCoinToken = useMemo<{ type: 'writercoin'; coin: WriterCoin }>(
    () => ({ type: 'writercoin', coin: writerCoin }),
    [writerCoin]
  )
  const [selectedToken, setSelectedToken] = useState<PaymentToken>(initialToken ?? writerCoinToken)

  const cost = useMemo(() => {
    return PaymentCostService.calculateCostTokenSync(selectedToken, action)
  }, [selectedToken, action])

  const isMUSD = selectedToken.type === 'musd'
  const targetChainId = isMUSD ? MEZO_TESTNET_CHAIN_ID : BASE_MAINNET_CHAIN_ID
  const isWrongChain = Boolean(chainId && chainId !== targetChainId)
  const currentChain = getChainInfo(chainId)

  useEffect(() => {
    if (isConnected || walletPromptTrackedRef.current) return
    walletPromptTrackedRef.current = true
    trackEvent('payment_wallet_connect_prompt_shown', {
      action,
      paymentPath: selectedToken.type === 'musd' ? 'musd' : 'writercoin',
      token: selectedToken.type === 'musd' ? 'MUSD' : selectedToken.coin.symbol,
    })
  }, [action, isConnected, selectedToken])

  useEffect(() => {
    if (!isConnected || walletConnectedTrackedRef.current) return
    walletConnectedTrackedRef.current = true
    trackEvent('payment_wallet_connected', {
      action,
      paymentPath: selectedToken.type === 'musd' ? 'musd' : 'writercoin',
      token: selectedToken.type === 'musd' ? 'MUSD' : selectedToken.coin.symbol,
    })
  }, [action, isConnected, selectedToken])

  if (!isConnected) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-600/50 bg-amber-900/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-200 mb-2">Connect wallet to pay and generate</p>
              <p className="text-sm text-amber-300 mb-3">
                This is the only setup step before the wallet confirmation. We will use the selected payment network.
              </p>
              <WalletConnect />
            </div>
          </div>
        </div>

      </div>
    )
  }

  const otherToken: PaymentToken = isMUSD
    ? writerCoinToken
    : { type: 'musd', network: 'testnet' }

  return (
    <div className="space-y-4">
      {/* Network / Token Selection — always show so users can switch between Writer Coin and MUSD */}
      <PaymentTokenSelector
        selectedToken={selectedToken}
        onSelectToken={setSelectedToken}
        writerCoin={writerCoinToken}
      />

      {/* Two-path wrong-chain prompt: switch network OR switch payment token */}
      {isWrongChain && !compact && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-900/10 p-3 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-200">
            <AlertCircle className="w-4 h-4" />
            <span>You&apos;re on {currentChain.shortName} — this payment needs {isMUSD ? 'Mezo' : 'Base'}.</span>
          </div>
          <p className="text-amber-200/80">Pick the path that fits what you have:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => switchChain({ chainId: targetChainId })}
              disabled={isSwitchingChain}
              className="flex items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-blue-200 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span className="font-medium">Switch to {isMUSD ? 'Mezo' : 'Base'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedToken(otherToken)}
              className="flex items-center justify-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/5 px-3 py-2 text-purple-200 hover:bg-purple-500/10 transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span className="font-medium">
                Pay with {isMUSD ? 'Writer Coin' : 'MUSD'} on {currentChain.shortName}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Cost Preview */}
      <CostPreview paymentToken={selectedToken} action={action} showBreakdown={!compact} compact={compact} />

      {/* Payment Flow */}
      {/* Elevated CTA visuals for stronger contrast */}
      <div className={compact ? '' : 'rounded-xl border border-[color:var(--ia-panel-border)] bg-[color:var(--ia-panel-bg)] p-3 shadow-[0_0_0_1px_var(--ia-outline)]'}>
        <PaymentFlow
        paymentToken={selectedToken}
        action={action}
        costFormatted={cost.amountFormatted}
        onPaymentStart={onPaymentStart}
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
        disabled={disabled}
        compact={compact}
      />
     </div>

      {/* Info */}
      {!compact && (
        <div className="rounded-lg border border-[color:var(--ia-panel-border)] bg-[color:var(--ia-panel-bg)] p-3 text-xs text-purple-100">
        <p>
          💡 <span className="font-semibold">Note:</span> Payment is required to generate games. Your payment supports the platform and content creators.
        </p>
        </div>
      )}
    </div>
  )
}
