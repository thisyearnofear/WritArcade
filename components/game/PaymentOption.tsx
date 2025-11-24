'use client'

import { useAccount } from 'wagmi'
import { type WriterCoin } from '@/lib/writerCoins'
import { PaymentFlow } from './PaymentFlow'
import { CostPreview } from './CostPreview'
import { PaymentCostService } from '@/domains/payments/services/payment-cost.service'
import { useMemo } from 'react'
import type { PaymentAction } from '@/domains/payments/types'

interface PaymentOptionProps {
  writerCoin: WriterCoin
  action: PaymentAction
  onPaymentSuccess?: (transactionHash: string) => void
  onPaymentError?: (error: string) => void
  disabled?: boolean
  optional?: boolean // If true, user can skip payment
  onSkip?: () => void
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
  optional = false,
  onSkip,
}: PaymentOptionProps) {
  const { isConnected, address } = useAccount()

  const cost = useMemo(() => {
    return PaymentCostService.calculateCost(writerCoin.id, action)
  }, [writerCoin.id, action])

  if (!isConnected) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-4">
          <p className="text-sm text-blue-200 mb-3">
            💰 <span className="font-semibold">Payment Required</span>
          </p>
          <p className="text-sm text-blue-200">
            Connect your wallet to enable payment and customization features. You can play games for free without connecting.
          </p>
        </div>

        {optional && onSkip && (
          <button
            onClick={onSkip}
            disabled={disabled}
            className="w-full rounded-lg border border-gray-600 px-6 py-3 font-medium text-gray-300 transition-colors hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue Without Payment
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cost Preview */}
      <CostPreview writerCoin={writerCoin} action={action} showBreakdown={true} />

      {/* Payment Flow */}
      <PaymentFlow
        writerCoin={writerCoin}
        action={action}
        costFormatted={cost.amountFormatted}
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
        disabled={disabled}
      />

      {/* Optional Skip */}
      {optional && onSkip && (
        <button
          onClick={onSkip}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-600 px-6 py-3 font-medium text-gray-300 transition-colors hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Skip & Play Free
        </button>
      )}

      {/* Info */}
      <div className="rounded-lg bg-purple-900/30 p-3 text-xs text-purple-300">
        <p>
          💡 <span className="font-semibold">Tip:</span> Payment unlocks customization (genre/difficulty). Free games use AI default choices.
        </p>
      </div>
    </div>
  )
}
