'use client'

import { useAccount } from 'wagmi'
import { type WriterCoin, type PaymentToken } from '@/lib/writerCoins'
import { PaymentFlow } from './PaymentFlow'
import { CostPreview } from './CostPreview'
import { WalletConnect } from '@/components/ui/wallet-connect'
import { PaymentCostService } from '@/domains/payments/services/payment-cost.service'
import { useMemo, useState } from 'react'
import type { PaymentAction } from '@/domains/payments/types'
import { AlertCircle } from 'lucide-react'
import { PaymentTokenSelector } from './PaymentTokenSelector'

interface PaymentOptionProps {
  writerCoin: WriterCoin
  action: PaymentAction
  onPaymentSuccess?: (transactionHash: string) => void
  onPaymentError?: (error: string) => void
  disabled?: boolean
  initialToken?: PaymentToken
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
  _optional = false,
  _onSkip,
}: PaymentOptionProps) {
  const { isConnected } = useAccount()

  const writerCoinToken = useMemo<{ type: 'writercoin'; coin: WriterCoin }>(
    () => ({ type: 'writercoin', coin: writerCoin }),
    [writerCoin]
  )
  const [selectedToken, setSelectedToken] = useState<PaymentToken>(initialToken ?? writerCoinToken)

  const cost = useMemo(() => {
    return PaymentCostService.calculateCostTokenSync(selectedToken, action)
  }, [selectedToken, action])

  if (!isConnected) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-600/50 bg-amber-900/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-200 mb-2">Wallet Connection Required</p>
              <p className="text-sm text-amber-300 mb-3">
                To proceed with payment and customization, please connect your wallet. You'll need to approve a transaction on the Base blockchain.
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
      {/* Network / Token Selection */}
      <PaymentTokenSelector 
        selectedToken={selectedToken}
        onSelectToken={setSelectedToken}
        writerCoin={writerCoinToken}
      />

      {/* Cost Preview */}
      <CostPreview paymentToken={selectedToken} action={action} showBreakdown={true} />

      {/* Payment Flow */}
      {/* Elevated CTA visuals for stronger contrast */}
      <div className="rounded-xl border border-[color:var(--ia-panel-border)] bg-[color:var(--ia-panel-bg)] p-3 shadow-[0_0_0_1px_var(--ia-outline)]">
        <PaymentFlow
        paymentToken={selectedToken}
        action={action}
        costFormatted={cost.amountFormatted}
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
        disabled={disabled}
      />
     </div>

      {/* Info */}
      <div className="rounded-lg border border-[color:var(--ia-panel-border)] bg-[color:var(--ia-panel-bg)] p-3 text-xs text-purple-100">
        <p>
          💡 <span className="font-semibold">Note:</span> Payment is required to generate games. Your payment supports the platform and content creators.
        </p>
      </div>
    </div>
  )
}
