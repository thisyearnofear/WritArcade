'use client'

import { useEffect, useState } from 'react'
import { type PaymentToken, getPaymentTokenConfig } from '@/lib/writerCoins'
import { PaymentCostService } from '@/domains/payments/services/payment-cost.service'
import type { PaymentAction } from '@/domains/payments/types'

interface CostPreviewProps {
  paymentToken: PaymentToken
  action: PaymentAction
  showBreakdown?: boolean
  compact?: boolean
}

export function CostPreview({ paymentToken, action, showBreakdown = true, compact = false }: CostPreviewProps) {
  const [cost, setCost] = useState(() => PaymentCostService.calculateCostTokenSync(paymentToken, action))
  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const c = PaymentCostService.calculateCostTokenSync(paymentToken, action)
        if (!canceled) setCost(c)
      } catch {
        if (!canceled) setCost(PaymentCostService.calculateCostTokenSync(paymentToken, action))
      }
    })()
    return () => { canceled = true }
  }, [paymentToken, action])

  const [distribution, setDistribution] = useState({ writerShare: BigInt(0), platformShare: BigInt(0), creatorShare: BigInt(0) })
  useEffect(() => {
    let canceled = false
    if (paymentToken.type === 'musd') {
        // No breakdown for MUSD yet
        return
    }
    ;(async () => {
      try {
        const dist = await PaymentCostService.calculateDistribution(paymentToken.coin.id, action)
        if (!canceled) setDistribution(dist)
      } catch {
        if (!canceled) setDistribution({ writerShare: BigInt(0), platformShare: BigInt(0), creatorShare: BigInt(0) })
      }
    })()
    return () => { canceled = true }
  }, [paymentToken, action])

  const actionLabel = action === 'generate-game' ? 'Build cost' : 'Minting cost'
  const config = getPaymentTokenConfig(paymentToken)
  const tokenSymbol = config.symbol
  const decimals = config.decimals

  if (compact) {
    return (
      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-cyan-100/80">{actionLabel}</span>
          <span className="font-bold text-cyan-50">{cost.amountFormatted} {tokenSymbol}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[color:var(--ia-panel-border)] bg-[color:var(--ia-panel-bg)] p-4 shadow-[0_0_0_1px_var(--ia-outline)]">
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-purple-200">{actionLabel}:</span>
          <span className="font-semibold text-purple-100">{cost.amountFormatted} {tokenSymbol}</span>
        </div>

        {showBreakdown && paymentToken.type === 'writercoin' && (
          <>
            <div className="border-t border-purple-700 pt-2">
              {action === 'generate-game' ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300">Writer:</span>
                    <span className="font-semibold text-green-400">
                      {(Number(distribution.writerShare) / 10 ** decimals).toFixed(0)} {tokenSymbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300">Platform:</span>
                    <span className="font-semibold text-blue-400">
                      {(Number(distribution.platformShare) / 10 ** decimals).toFixed(0)} {tokenSymbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-200">Creator Pool:</span>
                    <span className="font-semibold text-purple-400">
                      {(Number(distribution.creatorShare) / 10 ** decimals).toFixed(0)} {tokenSymbol}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-200">Creator:</span>
                    <span className="font-semibold text-blue-400">
                      {(Number(distribution.creatorShare) / 10 ** decimals).toFixed(0)} {tokenSymbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300">Writer:</span>
                    <span className="font-semibold text-green-400">
                      {(Number(distribution.writerShare) / 10 ** decimals).toFixed(0)} {tokenSymbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300">Platform:</span>
                    <span className="font-semibold text-orange-400">
                      {(Number(distribution.platformShare) / 10 ** decimals).toFixed(0)} {tokenSymbol}
                    </span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
