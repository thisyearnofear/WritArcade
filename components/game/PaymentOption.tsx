'use client'

import { useAccount } from 'wagmi'
import { type WriterCoin, type PaymentToken } from '@/lib/writerCoins'
import { PaymentFlow } from './PaymentFlow'
import { CostPreview } from './CostPreview'
import { WalletConnect } from '@/components/ui/wallet-connect'
import { PaymentCostService } from '@/domains/payments/services/payment-cost.service'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PaymentAction } from '@/domains/payments/types'
import { AlertCircle } from 'lucide-react'
import { PaymentTokenSelector } from './PaymentTokenSelector'
import { trackEvent } from '@/lib/analytics'

interface PaymentOptionProps {
  writerCoin: WriterCoin
  action: PaymentAction
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
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  initialToken,
  compact = false,
  _optional = false,
  _onSkip,
}: PaymentOptionProps) {
  const { isConnected } = useAccount()
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

  return (
    <div className="space-y-4">
      {/* Network / Token Selection — always show so users can switch between Writer Coin and MUSD */}
      <PaymentTokenSelector 
        selectedToken={selectedToken}
        onSelectToken={setSelectedToken}
        writerCoin={writerCoinToken}
      />

      {/* Cost Preview */}
      <CostPreview paymentToken={selectedToken} action={action} showBreakdown={!compact} compact={compact} />

      {/* Payment Flow */}
      {/* Elevated CTA visuals for stronger contrast */}
      <div className={compact ? '' : 'rounded-xl border border-[color:var(--ia-panel-border)] bg-[color:var(--ia-panel-bg)] p-3 shadow-[0_0_0_1px_var(--ia-outline)]'}>
        <PaymentFlow
        paymentToken={selectedToken}
        action={action}
        costFormatted={cost.amountFormatted}
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
