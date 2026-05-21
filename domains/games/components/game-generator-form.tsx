'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Sparkles, Info, Lightbulb, Wallet, AlertTriangle } from 'lucide-react'
import { GenreSelector, type GameGenre } from '@/components/game/GenreSelector'
import { DifficultySelector, type GameDifficulty } from '@/components/game/DifficultySelector'
import { PaymentOption } from '@/components/game/PaymentOption'
import { ErrorCard } from '@/components/error/ErrorCard'
import { SuccessModal } from '@/components/success/SuccessModal'
import { GameGenerationOverlay } from '@/components/game/GameGenerationOverlay'
import { ArticleFidelityReview } from '@/components/game/article-fidelity-review'
import { type WriterCoin, WRITER_COINS, validateArticleUrl, type PaymentToken } from '@/lib/writerCoins'
import { WriterCoinSelector } from '@/components/game/WriterCoinSelector'
import { retryWithBackoff } from '@/lib/error-handler'
import { useWriterCoinBalance } from '@/hooks/useWriterCoinBalance'
import type { PaymentPath } from '@/domains/games/components/simple-game-form'

interface GameGeneratorFormProps {
  onGameGenerated?: (game: { id: string; title: string; slug: string; genre: string }) => void
  initialUrl?: string
  initialPaymentPath?: PaymentPath
  initialMode?: 'story' | 'wordle'
}

const DEFAULT_WRITER_COIN = WRITER_COINS[0]

function paymentTokenForPath(path: PaymentPath, writerCoin: WriterCoin): PaymentToken {
  return path === 'musd'
    ? { type: 'musd', network: 'testnet' }
    : { type: 'writercoin', coin: writerCoin }
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

function previewStyleFor(genre: GameGenre, difficulty: GameDifficulty) {
  const genreMap: Record<GameGenre, { gradient: string; blurb: string }> = {
    horror: { gradient: 'from-indigo-900 via-red-900 to-black', blurb: 'Dark, tense pacing with dramatic contrasts.' },
    comedy: { gradient: 'from-pink-600 via-blue-600 to-indigo-700', blurb: 'Light, playful tone with punchy beats.' },
    mystery: { gradient: 'from-blue-900 via-indigo-900 to-black', blurb: 'Moody, investigative with slow reveals.' },
  }
  const diffMap: Record<GameDifficulty, string> = {
    easy: 'Simpler choices, faster progression',
    hard: 'Deeper branches, more complex narratives',
  }
  const g = genreMap[genre]
  return { ...g, diff: diffMap[difficulty] }
}

function StylePreview({ genre, difficulty }: { genre: GameGenre; difficulty: GameDifficulty }) {
  const s = previewStyleFor(genre, difficulty)
  const prefersReducedMotion = useReducedMotion()
  return (
    <div className="mx-auto max-w-md w-full">
      <motion.div
        key={`${genre}-${difficulty}`}
        className={`rounded-lg border border-purple-700/60 p-3 bg-gradient-to-br ${s.gradient} text-purple-100 shadow-md flex items-start gap-2`}
        initial={{ opacity: 0 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <div className="mt-0.5">
          {genre === 'horror' && (
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400 shadow" />
          )}
          {genre === 'comedy' && (
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-300 shadow" />
          )}
          {genre === 'mystery' && (
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-300 shadow" />
          )}
        </div>
        <div className="text-xs">
          <div className="font-semibold mb-1">Live Preview — {genre} • {difficulty}</div>
          <div className="opacity-95">{s.blurb}</div>
          <div className="opacity-90">{s.diff}</div>
        </div>
      </motion.div>
    </div>
  )
}

export type ImageQuality = 'fast' | 'quality'

export function GameGeneratorForm({ onGameGenerated, initialUrl, initialPaymentPath = 'writercoin', initialMode }: GameGeneratorFormProps) {
  const { isConnected } = useAccount()
  const [isGenerating, setIsGenerating] = useState(false)
  const [url, setUrl] = useState(initialUrl || '')
  const [mode, setMode] = useState<'story' | 'wordle'>(initialMode || 'story')
  const [genre, setGenre] = useState<GameGenre>('horror')
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy')
  const [imageQuality, setImageQuality] = useState<ImageQuality>('fast')
  const [showCustomization, setShowCustomization] = useState(true)
  const [paymentApproved, setPaymentApproved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{
    gameSlug: string
    title: string
    author?: string
  } | null>(null)
  const [generatedGame, setGeneratedGame] = useState<{
    id: string
    slug: string
    title: string
    description: string
    imageUrl?: string
  } | null>(null)
  const [showFidelityReview, setShowFidelityReview] = useState(false)
  const [paymentPath, setPaymentPath] = useState<PaymentPath>(initialPaymentPath)
  const [selectedCoin, setSelectedCoin] = useState<WriterCoin | null>(initialPaymentPath === 'musd' ? DEFAULT_WRITER_COIN : null)

  type LoadingStep = 'validate' | 'extract' | 'generate' | 'save'
  type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error'
  const [loadingStep, setLoadingStep] = useState<LoadingStep | null>(null)
  const [stepStatuses, setStepStatuses] = useState<Record<LoadingStep, StepStatus>>({
    validate: 'pending',
    extract: 'pending',
    generate: 'pending',
    save: 'pending',
  })

  const writerCoin = selectedCoin ?? DEFAULT_WRITER_COIN
  const isStoryMode = mode === 'story'
  const isMusdPath = paymentPath === 'musd'

  const requiredAmount = useMemo(() => {
    if (isMusdPath) return 0
    return Number(writerCoin.gameGenerationCost) / 10 ** writerCoin.decimals
  }, [isMusdPath, writerCoin])

  const { balance, isLoading: isLoadingBalance } = useWriterCoinBalance(writerCoin.id)

  const userBalance = useMemo(() => {
    if (isMusdPath || !balance?.formattedBalance) return null
    return parseFloat(balance.formattedBalance)
  }, [balance, isMusdPath])

  const handlePaymentSuccess = async (_transactionHash: string) => {
    setPaymentApproved(true)
    setError(null)
    await generateGame()
  }

  const generateGame = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      setLoadingStep('validate')

      if (!url.trim()) {
        throw new Error('Please provide a Paragraph.xyz article URL')
      }

      if (mode !== 'wordle' && !isMusdPath && !validateArticleUrl(url.trim(), writerCoin.id)) {
        throw new Error(`This URL does not match ${writerCoin.name}. Pick a matching article or switch to MUSD for any Paragraph article.`)
      }

      setStepStatuses((prev) => ({ ...prev, validate: 'completed' }))
      setLoadingStep('extract')
      setStepStatuses((prev) => ({ ...prev, extract: 'completed' }))
      setLoadingStep('generate')

      let lastError: Error | null = null
      let attempt = 0
      const maxAttempts = 3

      const result = await retryWithBackoff(
        async () => {
          attempt++

          const response = await fetch('/api/games/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: url.trim(),
              mode,
              ...(isStoryMode && showCustomization && paymentApproved && {
                customization: {
                  genre,
                  difficulty,
                  imageQuality,
                },
              }),
              ...(isStoryMode && paymentApproved && {
                payment: {
                  writerCoinId: writerCoin.id,
                  paymentPath,
                },
              }),
              _attempt: attempt,
              _maxAttempts: maxAttempts,
            }),
          })

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({} as { error?: string; code?: string }))
            const errorMsg = getGenerationErrorMessage(errorData, response.status, response.statusText)

            lastError = new Error(errorMsg)

            if (response.status === 400) {
              console.warn(`Attempt ${attempt}/${maxAttempts} failed with validation error:`, errorMsg)
            }

            throw lastError
          }

          const result = await response.json()

          if (!result.success) {
            lastError = new Error(result.error || 'Failed to generate game')
            throw lastError
          }

          return result
        },
        2,
        2000
      )
      setStepStatuses((prev) => ({ ...prev, generate: 'completed' }))

      setLoadingStep('save')
      setStepStatuses((prev) => ({ ...prev, save: 'completed' }))

      const gameData = {
        id: result.data.id,
        slug: result.data.slug,
        title: result.data.title || 'Your Game',
        description: result.data.description || '',
        imageUrl: result.data.imageUrl,
      }
      setGeneratedGame(gameData)
      setShowFidelityReview(true)

      onGameGenerated?.(result.data)
      // State resets handled in onClose callback to avoid blank form before modal dismisses
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(message)
      setPaymentApproved(false)

      if (loadingStep) {
        setStepStatuses((prev) => ({ ...prev, [loadingStep]: 'error' }))
      }

      console.error('Error generating game:', err)
    } finally {
      setIsGenerating(false)
      setLoadingStep(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url.trim()) {
      setError('Please provide a Paragraph.xyz article URL')
      return
    }

    if (!paymentApproved && isStoryMode) {
      return
    }

    await generateGame()
  }

  if (!selectedCoin && !isMusdPath) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        <WriterCoinSelector onSelect={(coin) => {
          setSelectedCoin(coin)
          setPaymentPath('writercoin')
        }} />
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        <motion.div 
          className="p-6 md:p-8 bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/50 rounded-xl text-center space-y-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg md:text-xl font-semibold text-foreground">Connect Wallet to Create Games</h3>
          <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
            {isMusdPath
              ? 'Game generation requires a connected wallet to pay with MUSD on Mezo and manage your creations.'
              : 'Game generation requires a connected wallet to pay with Writer Coins and manage your creations.'}
          </p>
          <div className="bg-card border border-border rounded-lg p-3 md:p-4 text-xs md:text-sm text-muted-foreground">
            <div className="flex flex-col md:flex-row gap-2 justify-center items-center">
              <span className="flex items-center gap-1">💰 Pay with {isMusdPath ? 'MUSD' : 'Writer Coins'}</span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center gap-1">🎮 Mint as NFTs</span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center gap-1">📜 Register IP Rights</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Click the <span className="font-semibold text-foreground">wallet icon</span> in the header to connect
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 px-1 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black ring-1 ${isMusdPath ? 'bg-amber-500/20 text-amber-300 ring-amber-500/30' : 'bg-purple-500/20 text-purple-400 ring-purple-500/30'}`}>
            {isMusdPath ? 'M' : writerCoin.symbol.slice(0, 1)}
          </div>
          <div>
            <span className="text-sm font-bold text-white">{isMusdPath ? 'MUSD on Mezo' : writerCoin.name}</span>
            <span className={`ml-2 text-xs ${isMusdPath ? 'text-amber-300' : 'text-purple-400'}`}>{isMusdPath ? 'Any Paragraph article' : writerCoin.symbol}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setPaymentPath(isMusdPath ? 'writercoin' : 'musd')
            setSelectedCoin(isMusdPath ? null : writerCoin)
            setPaymentApproved(false)
            setError(null)
          }}
          className={`text-xs underline decoration-dotted ${isMusdPath ? 'text-amber-300 hover:text-amber-200' : 'text-purple-400 hover:text-purple-300'}`}
        >
          {isMusdPath ? 'Switch to writer coin' : 'Switch to MUSD'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="flex gap-2 p-1 rounded-lg bg-slate-900/50 border border-purple-500/20">
            <button
              type="button"
              onClick={() => {
                setPaymentPath('writercoin')
                setSelectedCoin(writerCoin)
                setPaymentApproved(false)
                setError(null)
              }}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${paymentPath === 'writercoin' ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-300 hover:bg-purple-800/50'}`}
            >
              Writer coin · Base
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentPath('musd')
                setSelectedCoin(writerCoin)
                setPaymentApproved(false)
                setError(null)
              }}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${paymentPath === 'musd' ? 'bg-orange-600 text-white shadow-lg' : 'text-orange-300 hover:bg-orange-800/50'}`}
            >
              MUSD · Mezo
            </button>
          </div>

          {!isMusdPath && (
            <div className="flex items-center justify-between mb-1 px-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Selected writer</span>
                <span className="text-xs text-purple-400">{writerCoin.symbol}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCoin(null)
                  setPaymentApproved(false)
                  setError(null)
                }}
                className="text-xs text-purple-400 hover:text-purple-300 underline decoration-dotted"
              >
                Change coin
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Game Type</Label>
              <motion.div
                className="relative group"
                whileHover={{ scale: 1.1 }}
              >
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                <motion.div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-100 z-50 pointer-events-none"
                  initial={{ opacity: 0, y: 5 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  Choose between Story (narrative adventure) or Wordle (word puzzle) game types
                </motion.div>
              </motion.div>
            </div>
            <div className="game-type-selector">
              <motion.button
                type="button"
                onClick={() => setMode('story')}
                className={`game-type-option ${mode === 'story' ? 'active' : ''}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                <span className="font-semibold">Story (5-panel)</span>
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setMode('wordle')}
                className={`game-type-option ${mode === 'wordle' ? 'active' : ''}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                <span className="font-semibold">Wordle (Free)</span>
              </motion.button>
            </div>
            <p className="text-xs text-gray-400">
              {mode === 'story'
                ? 'Story creates a 5-panel narrative game with AI-generated artwork, branching choices, and mood tracking.'
                : 'Wordle creates a free word puzzle derived from your article. No payment needed.'}
            </p>
          </div>

          {!isGenerating && isStoryMode && (
            <motion.div
              className="pt-4 border-t border-gray-700"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <motion.button
                type="button"
                onClick={() => setShowCustomization(!showCustomization)}
                className="w-full text-sm font-medium text-purple-400 hover:text-purple-300 flex items-center gap-2"
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.span
                  initial={{ rotate: 0 }}
                  animate={{ rotate: showCustomization ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {showCustomization ? '▼' : '▶'}
                </motion.span>
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>Game Customization</span>
                <span className="ml-auto text-xs text-purple-300/80">Required • Paid Feature</span>
              </motion.button>

              <AnimatePresence>
                {showCustomization && (
                  <motion.div
                    className="mt-4 space-y-4 p-5 rounded-xl border-2 border-indigo-500/40 bg-gradient-to-br from-slate-900/80 to-indigo-950/60 shadow-lg"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <motion.div
                      className="space-y-4"
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-purple-100">Preview & Customize</span>
                          {paymentApproved && (
                            <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/50 rounded-full text-xs text-green-300">
                              ✓ Paid
                            </span>
                          )}
                          {!paymentApproved && (
                            <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/50 rounded-full text-xs text-amber-300">
                              Preview Mode
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="text-xs text-indigo-300 hover:text-indigo-200 underline decoration-dotted disabled:opacity-50"
                          onClick={() => { setGenre('horror'); setDifficulty('easy') }}
                          disabled={isGenerating}
                        >
                          Reset to defaults
                        </button>
                      </div>

                      <StylePreview genre={genre} difficulty={difficulty} />

                      <div className="flex justify-center gap-2 text-xs">
                        <span className="inline-flex items-center rounded-full bg-purple-800/80 border border-purple-500/80 px-3 py-1 text-purple-100 font-medium">
                          {genre}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-purple-800/80 border border-purple-500/80 px-3 py-1 text-purple-100 font-medium">
                          {difficulty}
                        </span>
                      </div>

                      <div>
                        <GenreSelector value={genre} onChange={setGenre} disabled={isGenerating} />
                      </div>

                      <div>
                        <DifficultySelector value={difficulty} onChange={setDifficulty} disabled={isGenerating} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-purple-100">
                          Image Quality
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setImageQuality('fast')}
                            disabled={isGenerating}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                              imageQuality === 'fast'
                                ? 'bg-purple-600 text-white border-2 border-purple-400'
                                : 'bg-purple-900/30 text-purple-300 border-2 border-purple-700/50 hover:border-purple-500'
                            }`}
                          >
                            ⚡ Fast (Turbo)
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageQuality('quality')}
                            disabled={isGenerating}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                              imageQuality === 'quality'
                                ? 'bg-purple-600 text-white border-2 border-purple-400'
                                : 'bg-purple-900/30 text-purple-300 border-2 border-purple-700/50 hover:border-purple-500'
                            }`}
                          >
                            ✨ High Quality
                          </button>
                        </div>
                        <p className="text-xs text-purple-300/70">
                          {imageQuality === 'fast'
                            ? 'Optimized for narrative flow - faster generation'
                            : 'Higher-end models - better visual fidelity'
                          }
                        </p>
                      </div>

                      <motion.div
                        className="p-3 rounded-lg bg-purple-900/50 border border-purple-500/30 text-sm text-purple-100 flex items-start gap-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                      >
                        <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-300" />
                        <div className="space-y-1 text-xs">
                          <div>• <strong>Genre</strong> shapes narrative tone and visual style</div>
                          <div>• <strong>Difficulty</strong> controls branching complexity</div>
                          <div className="mt-2 pt-2 border-t border-purple-500/20 text-yellow-200">
                            {paymentApproved ? (
                              <span className="text-green-300">✓ Payment approved - ready to generate!</span>
                            ) : (
                              <span>💳 Payment required to generate Story games</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="url" className="text-sm font-medium">
                Paragraph.xyz Article URL
              </Label>
              <motion.div
                className="relative group"
                whileHover={{ scale: 1.1 }}
              >
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                <motion.div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-100 z-50 pointer-events-none"
                  initial={{ opacity: 0, y: 5 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isMusdPath
                    ? 'Any public Paragraph.xyz article works with MUSD on Mezo.'
                    : 'Only Paragraph.xyz articles from the selected writer are accepted.'}
                </motion.div>
              </motion.div>
            </div>
            <Input
              id="url"
              type="url"
              placeholder={isMusdPath ? 'https://paragraph.xyz/... (any article)' : `${writerCoin.paragraphUrl}article-title`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1 font-mono focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            />
            <p className="text-xs text-gray-400 mt-1 px-1">
              {isMusdPath
                ? 'Paste any public Paragraph.xyz article URL.'
                : 'Tap to enter the full Paragraph.xyz URL for this writer.'}
            </p>
          </div>
        </div>

        {error && (
          <ErrorCard
            error={error}
            context="game generation"
            onRetry={() => generateGame()}
            onDismiss={() => setError(null)}
            suggestions={[
              'Check that your Paragraph.xyz URL is valid and publicly accessible',
              isMusdPath ? 'Try another public Paragraph article link' : 'Ensure the URL is from the selected writer',
              'Make sure your internet connection is stable',
            ]}
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

        {/* Payment section — always visible when in story mode so users can pay on first action */}
        {isStoryMode && (
          <div className="space-y-4 p-5 rounded-xl border-2 border-cyan-500/50 bg-gradient-to-br from-slate-950/90 to-cyan-950/60 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 border-2 border-cyan-500 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-cyan-300" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-cyan-50 mb-1">Pay to Generate</h3>
                <p className="text-sm text-cyan-100/90 mb-3">
                  Pay with {isMusdPath ? 'MUSD on Mezo' : `${writerCoin.symbol} on Base`} to generate your custom game.
                </p>
              </div>
            </div>

            <PaymentOption
              writerCoin={writerCoin}
              initialToken={paymentTokenForPath(paymentPath, writerCoin)}
              action="generate-game"
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={(err) => setError(err)}
              disabled={isGenerating}
            />
          </div>
        )}

        {/* Submit button — always visible */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            <Button
              type="submit"
              disabled={isGenerating}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 relative overflow-hidden focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
              size="mobile"
              arcade
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Game...
                  <motion.div
                    className="absolute inset-0 rounded-lg opacity-0"
                    style={{
                      background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(168, 85, 247, 0) 70%)',
                      filter: 'blur(10px)',
                    }}
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      opacity: { duration: 2, repeat: Infinity },
                      scale: { duration: 2, repeat: Infinity },
                    }}
                  />
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isStoryMode
                    ? paymentApproved
                      ? `Generate Custom ${genre.charAt(0).toUpperCase() + genre.slice(1)} Game`
                      : 'Generate Game (Pay Below)'
                    : 'Create Wordle Game (Free)'}
                </>
              )}
            </Button>
          </motion.div>
      </form>

      <div className="mt-8 p-4 rounded-lg border border-border bg-card text-card-foreground">
        <h3 className="font-medium mb-2 text-sm">💡 Tips for better games</h3>
        <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1.5">
          <li>{isMusdPath ? 'Paste any public Paragraph.xyz article to remix with MUSD.' : 'Paste URLs from Paragraph.xyz articles by the selected writer.'}</li>
          <li>Genre and difficulty shape how the AI interprets the article</li>
          <li><a href="/workshop" className="text-primary hover:underline font-medium">Use the Workshop</a> for deeper personalization</li>
        </ul>
      </div>

      <GameGenerationOverlay
        isOpen={isGenerating}
        currentStep={loadingStep}
        stepStatuses={stepStatuses}
        genre={genre}
        difficulty={difficulty}
      />

      {generatedGame && (
        <ArticleFidelityReview
          isOpen={showFidelityReview}
          game={{
            id: generatedGame.id,
            slug: generatedGame.slug,
            title: generatedGame.title,
            description: generatedGame.description,
            imageUrl: generatedGame.imageUrl,
          }}
          articleUrl={url}
          onApprove={() => {
            setShowFidelityReview(false)
            setSuccessData({
              gameSlug: generatedGame.slug,
              title: generatedGame.title,
              author: undefined,
            })
          }}
          onReject={() => {
            setShowFidelityReview(false)
            setGeneratedGame(null)
            setError('Game rejected. You can regenerate with different settings.')
          }}
        />
      )}

      <SuccessModal
        isOpen={!!successData}
        onClose={() => {
          setSuccessData(null)
          setGeneratedGame(null)
          setUrl('')
          setPaymentApproved(false)
        }}
        title="Game Created Successfully! 🎉"
        description="Your AI-generated game is ready to play. Share it with your community and mint it as an NFT."
        gameSlug={successData?.gameSlug}
        action="generate"
        authorName={successData?.author}
      />
    </div>
  )
}
