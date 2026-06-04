'use client'

import { useState, useMemo } from 'react'
import { type WriterCoin, type PaymentToken, WRITER_COINS } from '@/lib/writerCoins'
import { GenreSelector, type GameGenre } from '@/components/game/GenreSelector'
import { DifficultySelector, type GameDifficulty } from '@/components/game/DifficultySelector'
import { CostPreview } from '@/components/game/CostPreview'
import { PaymentFlow } from '@/components/game/PaymentFlow'
import { PaymentTokenSelector } from '@/components/game/PaymentTokenSelector'
import { PaymentCostService } from '@/domains/payments/services/payment-cost.service'
import type { PaymentResult } from '@/domains/payments/strategies/payment-strategy'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GameCustomizerProps {
  writerCoin?: WriterCoin | null
  isMUSD?: boolean
  articleUrl: string
  onBack: () => void
  onGameGenerated?: (game: unknown) => void
}

function getGenerationErrorMessage(errorData: { error?: string; code?: string }, status: number, statusText: string): string {
  switch (errorData.code) {
    case 'CONTENT_PROCESSING_FAILED':
      return 'We could not read that article URL. Please ensure it is public and try another Paragraph link.'
    case 'AI_GENERATION_FAILED':
      return 'Game generation model failed this time. Please retry in a moment.'
    case 'DB_SAVE_FAILED':
      return 'Your game was generated but failed to save. Please retry to persist it.'
    default:
      return errorData.error || `Generation failed (${status}): ${statusText}`
  }
}

export function GameCustomizer({ writerCoin, isMUSD, articleUrl, onBack, onGameGenerated }: GameCustomizerProps) {
  const [genre, setGenre] = useState<GameGenre>('horror')
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy')
  const [mode, setMode] = useState<'story' | 'wordle'>('story')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentApproved, setPaymentApproved] = useState(false)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [selectedToken, setSelectedToken] = useState<PaymentToken>(
    isMUSD 
      ? { type: 'musd', network: 'testnet' } 
      : { type: 'writercoin', coin: writerCoin as WriterCoin }
  )

  const isStoryMode = mode === 'story'

  const cost = useMemo(() => {
    return PaymentCostService.calculateCostTokenSync(selectedToken, 'generate-game')
  }, [selectedToken])

  const handlePaymentSuccess = async (payment: PaymentResult) => {
    setPaymentResult(payment)
    setPaymentApproved(true)
    setError(null)
    await generateGame(payment)
  }

  const generateGame = async (payment = paymentResult) => {
    setIsGenerating(true)
    setError(null)
    try {
      const body =
        mode === 'wordle'
          ? {
              url: articleUrl,
              mode: 'wordle' as const,
            }
          : {
              url: articleUrl,
	              customization: {
	                genre,
	                difficulty,
	              },
	              payment: {
	                paymentId: payment?.paymentId,
	                writerCoinId: selectedToken.type === 'musd' ? 'musd-testnet' : (writerCoin?.id || 'musd-testnet'),
	                transactionHash: payment?.transactionHash,
	              },
	            }

      const response = await fetch('/api/games/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({} as { error?: string; code?: string }))
        throw new Error(getGenerationErrorMessage(errorData, response.status, response.statusText))
      }

      const game = await response.json()
      onGameGenerated?.(game.data || game)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      setPaymentApproved(false)
      console.error('[GameCustomizer] Error generating game:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Immersive Loading Overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#0a0a14]/90 backdrop-blur-2xl"
          >
            <div className="relative flex flex-col items-center">
              {/* Animated Rings */}
              <div className="relative h-32 w-32">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className={cn(
                    "absolute inset-0 rounded-full border-4 border-t-transparent",
                    isMUSD 
                      ? "border-amber-500/20 border-t-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]" 
                      : "border-purple-500/20 border-t-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                  )}
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className={cn(
                    "absolute inset-4 rounded-full border-4 border-b-transparent",
                    isMUSD ? "border-amber-600/20 border-b-amber-600" : "border-indigo-500/20 border-b-indigo-500"
                  )}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-black italic text-white animate-pulse">AI</span>
                </div>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-12 text-center"
              >
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Synthesizing Experience</h3>
                <div className="mt-4 flex items-center justify-center space-x-2">
                    <span className={cn("h-1 w-12 rounded-full overflow-hidden", isMUSD ? "bg-amber-500/20" : "bg-purple-500/20")}>
                        <motion.div 
                            animate={{ x: [-48, 48] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            className={cn("h-full w-full", isMUSD ? "bg-amber-500" : "bg-purple-500")}
                        />
                    </span>
                    <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] italic", isMUSD ? "text-amber-400/80" : "text-purple-400/80")}>Neural Engine Active</p>
                    <span className={cn("h-1 w-12 rounded-full overflow-hidden", isMUSD ? "bg-amber-500/20" : "bg-purple-500/20")}>
                        <motion.div 
                            animate={{ x: [48, -48] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            className={cn("h-full w-full", isMUSD ? "bg-amber-500" : "bg-purple-500")}
                        />
                    </span>
                </div>
                <p className={cn("mt-6 max-w-xs text-xs leading-relaxed font-medium", isMUSD ? "text-amber-200/40" : "text-purple-200/40")}>
                  {isMUSD 
                    ? "Scaling across Mezo Matsnet nodes..." 
                    : "Transforming static content into interactive protocol buffers..."}
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onBack}
        className={cn(
            "group flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest transition-colors",
            isMUSD ? "text-amber-500 hover:text-amber-400" : "text-purple-400 hover:text-purple-300"
        )}
        disabled={isGenerating}
      >
        <svg className="h-3 w-3 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back to Loader</span>
      </button>

      <div className="space-y-1">
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Configure Build</h2>
        <p className="text-sm text-white/40">Customize the parameters of your generated experience</p>
      </div>

      <div className="space-y-6">
        {/* Mode Selector */}
        <div className={cn(
            "rounded-2xl border p-1 flex",
            isMUSD ? "border-amber-500/20 bg-amber-900/10" : "border-white/10 bg-white/5"
        )}>
            <button
                onClick={() => setMode('story')}
                className={cn(
                    "flex-1 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
                    mode === 'story' 
                    ? isMUSD 
                        ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                        : 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                    : isMUSD 
                        ? 'text-amber-400/60 hover:text-amber-300'
                        : 'text-purple-400/60 hover:text-purple-300'
                )}
            >
                Story Mode
            </button>
            <button
                onClick={() => setMode('wordle')}
                className={cn(
                    "flex-1 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
                    mode === 'wordle' 
                    ? isMUSD 
                        ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                        : 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                    : isMUSD 
                        ? 'text-amber-400/60 hover:text-amber-300'
                        : 'text-purple-400/60 hover:text-purple-300'
                )}
            >
                Puzzle Mode (Beta)
            </button>
        </div>

        <div className={cn(
            "space-y-6 rounded-2xl border p-5",
            isMUSD ? "border-amber-500/10 bg-amber-900/5" : "border-white/5 bg-white/[0.02]"
        )}>
            {isStoryMode ? (
                <>
                    <div className="space-y-4">
                        <GenreSelector value={genre} onChange={setGenre} disabled={isGenerating} />
                        <DifficultySelector value={difficulty} onChange={setDifficulty} disabled={isGenerating} />
                    </div>

                    <div className={cn("pt-4 border-t", isMUSD ? "border-amber-500/10" : "border-white/5")}>
                        <PaymentTokenSelector 
                          selectedToken={selectedToken}
                          onSelectToken={setSelectedToken}
                          writerCoin={isMUSD 
                            ? { type: 'writercoin', coin: WRITER_COINS[0] } // Fallback for selector
                            : { type: 'writercoin', coin: writerCoin as WriterCoin }
                          }
                        />
                        <CostPreview paymentToken={selectedToken} action="generate-game" showBreakdown />
                    </div>
                </>
            ) : (
                <div className="py-8 text-center space-y-4">
                    <div className={cn(
                        "mx-auto h-12 w-12 rounded-full flex items-center justify-center border",
                        isMUSD ? "bg-amber-500/10 border-amber-500/20" : "bg-green-500/10 border-green-500/20"
                    )}>
                        <span className={cn("font-black italic", isMUSD ? "text-amber-400" : "text-green-400")}>!</span>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-tight">Free Generation Active</h4>
                        <p className={cn(
                            "mt-1 text-[10px] uppercase tracking-widest leading-relaxed",
                            isMUSD ? "text-amber-200/40" : "text-purple-300/40"
                        )}>
                            Puzzle mode is currently available without writer coin authorization during our Farcaster beta phase.
                        </p>
                    </div>
                </div>
            )}
        </div>

        {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                <div className="flex items-center space-x-3">
                    <span className="text-red-400 font-bold">FAULT:</span>
                    <p className="text-xs text-red-200/80">{error}</p>
                </div>
            </div>
        )}

        {isStoryMode ? (
          !paymentApproved ? (
            <div className="pt-2">
                <PaymentFlow
                    paymentToken={selectedToken}
                    action="generate-game"
                    costFormatted={cost.amountFormatted}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={(err) => setError(err)}
                    disabled={isGenerating}
                />
            </div>
          ) : (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 flex items-center justify-center space-x-3">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-xs font-black uppercase tracking-widest text-green-400">Authorization Confirmed</p>
            </div>
          )
        ) : (
          <button
            type="button"
            onClick={() => generateGame()}
            disabled={isGenerating}
            className="w-full rounded-2xl bg-purple-600 py-4 text-sm font-black uppercase tracking-[0.2em] italic text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all hover:bg-purple-500 hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] active:scale-[0.98] disabled:opacity-50"
          >
            Synthesize Experience
          </button>
        )}
      </div>
    </div>
  )
}
