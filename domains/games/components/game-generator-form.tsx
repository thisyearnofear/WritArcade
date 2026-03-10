'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Sparkles, Info, Lightbulb } from 'lucide-react'
import { GenreSelector, type GameGenre } from '@/components/game/GenreSelector'
import { DifficultySelector, type GameDifficulty } from '@/components/game/DifficultySelector'
import { PaymentOption } from '@/components/game/PaymentOption'
import { ErrorCard } from '@/components/error/ErrorCard'
import { SuccessModal } from '@/components/success/SuccessModal'
import { GameGenerationOverlay } from '@/components/game/GameGenerationOverlay'
import { ArticleFidelityReview } from '@/components/game/article-fidelity-review'
import { type WriterCoin } from '@/lib/writerCoins'
import { WriterCoinSelector } from '@/components/game/WriterCoinSelector'
import { retryWithBackoff } from '@/lib/error-handler'

interface GameGeneratorFormProps {
  onGameGenerated?: (game: { id: string; title: string; slug: string; genre: string }) => void
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
        {/* Genre icon for quick recognition */}
        <div className="mt-0.5">
          {/* Reuse small inline icons for genre */}
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

export function GameGeneratorForm({ onGameGenerated }: GameGeneratorFormProps) {
  const { isConnected } = useAccount()
  const [isGenerating, setIsGenerating] = useState(false)
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState<'story' | 'wordle'>('story')
  const [genre, setGenre] = useState<GameGenre>('horror')
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy')
  const [showCustomization, setShowCustomization] = useState(true)
  const [showPayment, setShowPayment] = useState(false)
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

  // Loading step states
  type LoadingStep = 'validate' | 'extract' | 'generate' | 'save'
  type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error'
  const [loadingStep, setLoadingStep] = useState<LoadingStep | null>(null)
  const [stepStatuses, setStepStatuses] = useState<Record<LoadingStep, StepStatus>>({
    validate: 'pending',
    extract: 'pending',
    generate: 'pending',
    save: 'pending',
  })

  const [selectedCoin, setSelectedCoin] = useState<WriterCoin | null>(null)
  // writerCoin is guaranteed non-null after the coin-selection gate below
  const writerCoin = selectedCoin as WriterCoin
  const isStoryMode = mode === 'story'

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

      // Validate input
      if (!url.trim()) {
        throw new Error('Please provide a Paragraph.xyz article URL')
      }
      setStepStatuses((prev) => ({ ...prev, validate: 'completed' }))

      setLoadingStep('extract')
      // Note: content extraction happens on the server during the fetch call
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
                },
              }),
              ...(isStoryMode && paymentApproved && {
                payment: {
                  writerCoinId: writerCoin.id,
                },
              }),
              // Add attempt metadata for server-side agentic retry
              _attempt: attempt,
              _maxAttempts: maxAttempts,
            }),
          })

          // Handle network errors
          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({} as { error?: string; code?: string }))
            const errorMsg = getGenerationErrorMessage(errorData, response.status, response.statusText)

            lastError = new Error(errorMsg)

            // On validation or schema errors, log for retry insight
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
        2, // Max 2 retries for generation (plus initial attempt = 3 total)
        2000 // 2 second base delay
      )
      setStepStatuses((prev) => ({ ...prev, generate: 'completed' }))

      setLoadingStep('save')
      // Game is already saved on server, just mark as complete
      setStepStatuses((prev) => ({ ...prev, save: 'completed' }))

      // NEW: Store generated game and show fidelity review (approval workflow).
      // BUG FIX: successData was being set HERE (before approval), causing both
      // ArticleFidelityReview AND SuccessModal to appear simultaneously.
      // Now successData is only set inside the onApprove callback below.
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

      // Reset form
      setUrl('')
      setPaymentApproved(false)
      setShowPayment(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(message)
      setPaymentApproved(false)

      // Mark current step as failed
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

    // Story mode always requires payment
    if (isStoryMode && !paymentApproved) {
      setShowPayment(true)
      return
    }

    // Wordle mode is free, generate directly
    await generateGame()
  }

  // Coin selection gate — must pick a writer coin before proceeding
  if (!selectedCoin) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        <WriterCoinSelector onSelect={setSelectedCoin} />
      </div>
    )
  }

  // Wallet requirement gate
  if (!isConnected) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        <div className="p-6 md:p-8 bg-gradient-to-br from-purple-950/80 to-purple-800/80 border border-purple-400/50 rounded-xl text-center space-y-4">
          <h3 className="text-lg md:text-xl font-semibold text-white">Connect Wallet to Create</h3>
          <p className="text-sm md:text-base text-gray-200">Get access to game generation, minting, and IP registration</p>
          <div className="bg-purple-900/40 border border-purple-400/40 rounded-lg p-3 md:p-4 text-xs md:text-sm text-gray-200">
            <div className="flex flex-col md:flex-row gap-2 justify-center">
              <span>💰 Writer Coins</span>
              <span className="hidden md:inline">•</span>
              <span>🎮 NFT Mint</span>
              <span className="hidden md:inline">•</span>
              <span>📜 IP Rights</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Selected coin badge */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-sm font-black text-purple-400 ring-1 ring-purple-500/30">
            {writerCoin.symbol.slice(0, 1)}
          </div>
          <div>
            <span className="text-sm font-bold text-white">{writerCoin.name}</span>
            <span className="ml-2 text-xs text-purple-400">{writerCoin.symbol}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setSelectedCoin(null); setUrl(''); setPaymentApproved(false); setShowPayment(false); setError(null) }}
          className="text-xs text-purple-400 hover:text-purple-300 underline decoration-dotted"
        >
          Change coin
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {/* Game Type Toggle with Arcade Styling */}
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
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <span className="text-black font-semibold">Story (5-panel)</span>
              </motion.button>
              <motion.button
                type="button"
                onClick={() => {
                  setMode('wordle')
                  // Wordle is free and does not use genre/difficulty customization yet
                  setShowCustomization(false)
                  setShowPayment(false)
                  setPaymentApproved(false)
                }}
                className={`game-type-option ${mode === 'wordle' ? 'active' : ''}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <span className="text-black font-semibold">Wordle (beta)</span>
              </motion.button>
            </div>
            <p className="text-xs text-gray-400">
              Story creates a 5-panel narrative game. Wordle creates a free article-derived word puzzle.
            </p>
          </div>

          {/* URL Input with Typewriter Styling */}
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
                  Only Paragraph.xyz articles from supported authors are accepted. Check FAQ for full list.
                </motion.div>
              </motion.div>
            </div>
            <Input
              id="url"
              type="url"
              placeholder={`${writerCoin.paragraphUrl}article-title`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1 typewriter-input focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
              typewriter
            />
            <p className="text-xs text-gray-400 mt-1 px-1">Tap to enter the full Paragraph.xyz URL</p>
          </div>



          {/* Enhanced Customization Section - Redesigned UX */}
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
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    {/* Customization Controls - Always interactive for preview */}
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

                      {/* Live style preview */}
                      <StylePreview genre={genre} difficulty={difficulty} />

                      {/* Current selection pills */}
                      <div className="flex justify-center gap-2 text-xs">
                        <span className="inline-flex items-center rounded-full bg-purple-800/80 border border-purple-500/80 px-3 py-1 text-purple-100 font-medium">
                          {genre}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-purple-800/80 border border-purple-500/80 px-3 py-1 text-purple-100 font-medium">
                          {difficulty}
                        </span>
                      </div>

                      {/* Genre selector - Always enabled for preview */}
                      <div>
                        <GenreSelector value={genre} onChange={setGenre} disabled={isGenerating} />
                      </div>

                      {/* Difficulty selector - Always enabled for preview */}
                      <div>
                        <DifficultySelector value={difficulty} onChange={setDifficulty} disabled={isGenerating} />
                      </div>

                      {/* Info tip with payment requirement notice */}
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
        </div>

        {error && (
          <ErrorCard
            error={error}
            context="game generation"
            onRetry={() => generateGame()}
            onDismiss={() => setError(null)}
            suggestions={[
              'Check that your Paragraph.xyz URL is valid and publicly accessible',
              'Ensure the URL is from a supported author',
              'Make sure your internet connection is stable',
            ]}
          />
        )}

        {/* Payment Section (shown when customization requested in story mode) */}
        {isStoryMode && showPayment && (
          <div className="space-y-4 p-5 rounded-xl border-2 border-cyan-500/50 bg-gradient-to-br from-slate-950/90 to-cyan-950/60 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 border-2 border-cyan-500 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-cyan-300" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-cyan-50 mb-1">Confirm Your Customization</h3>
                <p className="text-sm text-cyan-100/90 mb-3">
                  You've selected custom options below. Approve payment to generate with these settings.
                </p>
              </div>
            </div>

            {/* Show what user selected */}
            <div className="p-4 rounded-lg bg-slate-900/60 border border-cyan-500/30 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-cyan-100">
                <span>📋</span>
                <span>Your Selections</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-950/50 border border-indigo-500/40">
                  <div className="text-xs text-indigo-300 mb-1">Genre</div>
                  <div className="font-semibold text-white capitalize flex items-center gap-2">
                    {genre === 'horror' && '🎃'}
                    {genre === 'comedy' && '😄'}
                    {genre === 'mystery' && '🔍'}
                    {genre}
                  </div>
                  <div className="text-xs text-purple-300/80 mt-1">
                    {genre === 'horror' && 'Dark, high stakes'}
                    {genre === 'comedy' && 'Light, witty beats'}
                    {genre === 'mystery' && 'Clues and reveals'}
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-slate-950/50 border border-cyan-500/40">
                  <div className="text-xs text-cyan-300 mb-1">Difficulty</div>
                  <div className="font-semibold text-white capitalize flex items-center gap-2">
                    {difficulty === 'easy' && '⚡'}
                    {difficulty === 'hard' && '🎯'}
                    {difficulty}
                  </div>
                  <div className="text-xs text-purple-300/80 mt-1">
                    {difficulty === 'easy' && 'Faster progression'}
                    {difficulty === 'hard' && 'Deeper branches'}
                  </div>
                </div>
              </div>

              {/* Preview the style they'll get */}
              <div className="pt-2">
                <StylePreview genre={genre} difficulty={difficulty} />
              </div>
            </div>

            <PaymentOption
              writerCoin={writerCoin}
              action="generate-game"
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={(err) => setError(err)}
              disabled={isGenerating}
            />

            <p className="text-xs text-purple-300/70 text-center">
              Payment is required to generate games with custom settings
            </p>
          </div>
        )}

        {!showPayment && (
          <motion.div
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
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
                  {/* Loading glow effect */}
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
                      : 'Review Customization & Pay'
                    : 'Create Wordle Game (Free)'}
                </>
              )}
            </Button>
          </motion.div>
        )}
      </form>

      {/* Tips with Comic Book Styling */}
      <div className="mt-8 p-4 bg-white rounded-lg border border-gray-300">
        <h3 className="font-medium mb-2 text-gray-900">💡 Tips for better games:</h3>
        <ul className="comic-bubble text-sm space-y-1">
          <li>• Paste URLs from Paragraph.xyz articles by supported authors</li>
          <li>• Choose genre and difficulty settings that match the article's tone</li>
          <li>• The AI will create unique game interpretations based on the article content</li>
          <li>• Different genres will influence how the story is gamified</li>
          <li>• <a href="/workshop" className="text-purple-600 hover:text-purple-700 underline font-medium">Use the Workshop</a> for deeper personalization — edit characters, mechanics, and story beats before generating</li>
        </ul>
      </div>

      {/* Full-screen generation overlay */}
      <GameGenerationOverlay
        isOpen={isGenerating}
        currentStep={loadingStep}
        stepStatuses={stepStatuses}
        genre={genre}
        difficulty={difficulty}
      />

      {/* NEW: Fidelity Review Modal (approval workflow) */}
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
            // BUG FIX: successData now set ONLY after approval — prevents double modal
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

      {/* Success Modal */}
      <SuccessModal
        isOpen={!!successData}
        onClose={() => setSuccessData(null)}
        title="Game Created Successfully! 🎉"
        description="Your AI-generated game is ready to play. Share it with your community and mint it as an NFT."
        gameSlug={successData?.gameSlug}
        action="generate"
        authorName={successData?.author}
      />
    </div>
  )
}
