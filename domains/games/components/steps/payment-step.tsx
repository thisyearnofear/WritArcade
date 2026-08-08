'use client'

import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, ExternalLink, Sparkles } from 'lucide-react'
import { PaymentOption } from '@/components/game/PaymentOption'
import type { WriterCoin } from '@/lib/writer-coins'
import type { PaymentResult } from '@/domains/payments/strategies/payment-strategy'
import {
  type GenerateErrorState,
  type PaymentPath,
  paymentTokenForPath,
  shortTxHash,
  GenerateErrorPanel,
} from '@/domains/games/components/game-generator-helpers'

interface PaymentStepProps {
  error: GenerateErrorState | null
  onRetry: () => void
  onDismiss: () => void
  isStoryMode: boolean
  isMusdPath: boolean
  balance: { formattedBalance: string } | null
  paymentApproved: boolean
  userBalance: number | null
  requiredAmount: number
  isLoadingBalance: boolean
  writerCoin: WriterCoin
  hasPreviewedCurrentUrl: boolean
  isGenerating: boolean
  isPreviewingArticle: boolean
  activePaymentTxHash: string | undefined
  activePaymentExplorerUrl: string | null
  onContinueGeneration: () => void
  paymentPath: PaymentPath
  onPaymentStart: () => void
  onPaymentSuccess: (payment: PaymentResult) => void
  onPaymentError: (error: string) => void
  onPaymentPathChange: (path: PaymentPath) => void
  url: string
}

/**
 * Step 3 — error display, insufficient-balance warning, and the
 * pay-and-generate section (PaymentOption or a "continue generation"
 * button when a payment tx hash is already saved).
 */
export function PaymentStep({
  error,
  onRetry,
  onDismiss,
  isStoryMode,
  isMusdPath,
  balance,
  paymentApproved,
  userBalance,
  requiredAmount,
  isLoadingBalance,
  writerCoin,
  hasPreviewedCurrentUrl,
  isGenerating,
  isPreviewingArticle,
  activePaymentTxHash,
  activePaymentExplorerUrl,
  onContinueGeneration,
  paymentPath,
  onPaymentStart,
  onPaymentSuccess,
  onPaymentError,
  onPaymentPathChange,
  url,
}: PaymentStepProps) {
  return (
    <>
      {error && (
        <GenerateErrorPanel
          error={{
            ...error,
            retryLabel: error.phase === 'generation' && activePaymentTxHash
              ? 'Continue generation'
              : error.retryLabel,
          }}
          onRetry={onRetry}
          onDismiss={onDismiss}
        />
      )}

      {isStoryMode && !isMusdPath && balance && !paymentApproved && userBalance !== null && userBalance < requiredAmount && (
        <div className="rounded-lg bg-red-900/20 border border-red-500/50 p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-red-200 font-medium">Insufficient {writerCoin.symbol} Balance</p>
            <p className="text-red-300/80">
              You have {balance.formattedBalance} {writerCoin.symbol} but need {requiredAmount} {writerCoin.symbol} to generate a game.
              {!isLoadingBalance && <span className="block mt-1">Your balance will be checked before payment.</span>}
            </p>
          </div>
        </div>
      )}

      {/* Payment section — appears after the article is ready. */}
      {isStoryMode && hasPreviewedCurrentUrl && (
        <div className="space-y-4 rounded-lg border border-cyan-500/40 bg-gradient-to-br from-slate-950/90 to-cyan-950/50 p-4 shadow-xl sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-cyan-300" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-200/80 mb-1">Ready to build</p>
              <h3 className="font-semibold text-lg text-cyan-50">Pay and generate</h3>
              <p className="text-xs text-cyan-300/70 mt-1">
                Why pay? Story games use AI to generate 5 custom panels with artwork, music, and branching narratives. The fee covers AI computation, on-chain registration, and supports the original writer.{' '}
                <span className="text-cyan-200 font-medium">You can read the comic for free afterward — no recurring costs.</span>
              </p>
            </div>
          </div>

          {activePaymentTxHash ? (
            <div className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md bg-emerald-500/20 p-1.5">
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    {isGenerating ? 'Generation running' : 'Payment received'}
                  </p>
                  <p className="mt-1 text-sm text-emerald-50">
                    {paymentApproved
                      ? 'Your payment is confirmed. Continue generation without paying again.'
                      : 'Your transaction is saved for this attempt. Continue generation without paying again.'}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md border border-emerald-400/25 bg-black/20 px-2 py-1 font-mono text-emerald-100">
                      {shortTxHash(activePaymentTxHash)}
                    </span>
                    {activePaymentExplorerUrl && (
                      <a
                        href={activePaymentExplorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-400/25 px-2 py-1 font-semibold text-emerald-100 transition hover:bg-emerald-500/10"
                      >
                        View transaction
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onContinueGeneration}
                    disabled={isGenerating || isPreviewingArticle}
                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {isGenerating ? 'Generating...' : 'Continue generation'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <PaymentOption
              key={`${paymentPath}-${writerCoin.id}`}
              writerCoin={writerCoin}
              initialToken={paymentTokenForPath(paymentPath, writerCoin)}
              action="generate-game"
              onPaymentStart={onPaymentStart}
              onPaymentSuccess={onPaymentSuccess}
              onPaymentError={onPaymentError}
              onPaymentPathChange={onPaymentPathChange}
              disabled={isGenerating || !url.trim()}
              compact
            />
          )}
          <details className="rounded-lg border border-cyan-500/20 bg-black/20 p-3 text-xs text-cyan-100/75">
            <summary className="cursor-pointer font-medium text-cyan-100">Details</summary>
            <p className="mt-2 leading-relaxed">
              {isMusdPath
                ? 'MUSD supports any public Paragraph article on Mezo.'
                : `${writerCoin.symbol} is the curated writer coin path on Base for supported writers.`}
            </p>
          </details>
        </div>
      )}

      {isStoryMode && !hasPreviewedCurrentUrl && (
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Preview the article to unlock paid story generation options.
        </div>
      )}
    </>
  )
}
