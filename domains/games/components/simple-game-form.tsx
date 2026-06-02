'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, Loader2, ArrowLeftRight, CheckCircle2 } from 'lucide-react'
import { chainForPaymentPath, getChainInfo } from '@/lib/chains'
import { detectWriterCoinFromUrl } from '@/lib/payment-path-resolver'
import { trackEvent } from '@/lib/analytics'
import { cn } from '@/lib/utils'

export type PaymentPath = 'writercoin' | 'musd'

interface SimpleGameFormProps {
  onGenerate: (url: string) => void
  isGenerating: boolean
  /**
   * Which payment ecosystem the user expects to use. Acts as a *default*
   * when the URL doesn't match a known writer; otherwise the form
   * auto-selects that writer's coin.
   */
  paymentPath?: PaymentPath
}

export function SimpleGameForm({ onGenerate, isGenerating, paymentPath: defaultPath = 'musd' }: SimpleGameFormProps) {
  const [url, setUrl] = useState('')
  // Allow the user to override the auto-detected path explicitly.
  // `null` means "use the auto-detected value".
  const [explicitPath, setExplicitPath] = useState<PaymentPath | null>(null)
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  // Auto-detect writer coin from the URL the user is typing.
  const detectedCoin = useMemo(() => detectWriterCoinFromUrl(url), [url])

  // The path the form will actually use to pay.
  const activePath: PaymentPath = explicitPath ?? (detectedCoin ? 'writercoin' : defaultPath)
  const isAutoMatched = Boolean(detectedCoin) && explicitPath === null

  // Track the moment a URL matches a known writer's coin. Fires once per
  // writer per typing session (not on every keystroke that keeps matching
  // the same writer). This measures the bet that auto-detect drives
  // writer-coin usage.
  const lastTrackedWriterRef = useRef<string | null>(null)
  useEffect(() => {
    const writerId = detectedCoin?.id ?? null
    if (writerId && writerId !== lastTrackedWriterRef.current) {
      lastTrackedWriterRef.current = writerId
      trackEvent('payment_path_auto_detected', {
        writer: writerId,
        symbol: detectedCoin?.symbol,
        path: 'writercoin',
      })
    } else if (!writerId) {
      lastTrackedWriterRef.current = null
    }
  }, [detectedCoin])

  /**
   * Wraps `setExplicitPath` to fire `payment_path_user_override` exactly
   * once per override. The detected writer is the implicit "from" target.
   */
  const overrideTo = (next: PaymentPath) => {
    setExplicitPath(next)
    trackEvent('payment_path_user_override', {
      from: 'writercoin', // user is overriding the auto-detected coin
      to: next,
      writer: detectedCoin?.id,
    })
  }

  const targetChainId = chainForPaymentPath(activePath)
  const targetChain = getChainInfo(targetChainId)
  const isWrongChain = isConnected && chainId !== targetChainId

  const placeholder = activePath === 'musd'
    ? 'https://paragraph.xyz/... (any article)'
    : detectedCoin
      ? `https://paragraph.xyz/@${detectedCoin.paragraphAuthor}/...`
      : 'https://paragraph.xyz/... (supported writers)'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGenerate(url)
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 w-full max-w-xl"
      >
        <Input
          type="url"
          placeholder={placeholder}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-12"
          required
        />
        <Button
          type="submit"
          disabled={isGenerating}
          className="h-12 px-6 font-bold uppercase tracking-widest"
          title="Start from this article"
        >
          {isGenerating ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        </Button>
      </form>

      {/* Auto-detection hint — only shown when the URL matches a known writer */}
      {isAutoMatched && detectedCoin && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-2 text-xs bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2"
        >
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>
              <span className="font-medium text-foreground">{detectedCoin.writer}</span> has a coin ({detectedCoin.symbol}) — will pay on Base.
            </span>
          </div>
          <button
            type="button"
            onClick={() => overrideTo('musd')}
            className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 hover:text-amber-500 transition-colors"
          >
            Use MUSD instead
          </button>
        </motion.div>
      )}

      {/* Manual toggle — only when no auto-match OR user explicitly overrode */}
      {!isAutoMatched && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Pay with:</span>
          <div className="inline-flex rounded-md border border-border bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => {
                if (!detectedCoin) return
                setExplicitPath('writercoin')
                trackEvent('payment_path_user_override', {
                  from: 'musd',
                  to: 'writercoin',
                  writer: detectedCoin.id,
                })
              }}
              disabled={!detectedCoin}
              className={cn(
                'px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors',
                activePath === 'writercoin'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              {detectedCoin ? `${detectedCoin.symbol} (Base)` : 'Writer coin (Base)'}
            </button>
            <button
              type="button"
              onClick={() => setExplicitPath('musd')}
              className={cn(
                'px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors',
                activePath === 'musd'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              MUSD (Mezo)
            </button>
          </div>
          {detectedCoin && explicitPath === 'musd' && (
            <button
              type="button"
              onClick={() => {
                setExplicitPath(null)
                trackEvent('payment_path_user_override', {
                  from: 'musd',
                  to: 'writercoin',
                  writer: detectedCoin.id,
                })
              }}
              className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors"
            >
              Use writer coin
            </button>
          )}
        </div>
      )}

      {!isConnected && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-muted-foreground bg-muted/50 border border-border rounded-lg p-3"
        >
          <p>
            Paste an article first. Create a free Wordle without a wallet, or connect later when you are ready to generate a paid story game.
          </p>
        </motion.div>
      )}

      {isWrongChain && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-2 text-sm bg-muted/50 border border-border rounded-lg p-3"
        >
          <p className="text-muted-foreground">
            {activePath === 'musd' ? 'MUSD' : (detectedCoin?.symbol ?? 'Writer coins')} live on{' '}
            <span className="font-medium text-foreground">{targetChain.name}</span>.
          </p>
          <button
            type="button"
            onClick={() => switchChain({ chainId: targetChainId })}
            disabled={isSwitching}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-foreground hover:text-foreground/80 disabled:opacity-50"
          >
            {isSwitching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
            Switch
          </button>
        </motion.div>
      )}
    </div>
  )
}
