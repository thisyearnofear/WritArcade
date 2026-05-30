'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Sparkles, Info, Lightbulb, AlertTriangle, CheckCircle2, FileText } from 'lucide-react'
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

interface ArticlePreview {
  title: string
  author: string
  publicationName?: string
  publishedAt?: string
  wordCount: number
  estimatedReadTime: number
  excerpt: string
  sourceUrl: string
}

function articlePreviewMeta(preview: ArticlePreview) {
  return [
    preview.author,
    preview.publicationName && preview.publicationName !== preview.author ? preview.publicationName : undefined,
    preview.wordCount > 50 ? `${preview.wordCount.toLocaleString()} words` : undefined,
    preview.estimatedReadTime > 1 ? `${preview.estimatedReadTime} min read` : undefined,
  ].filter(Boolean).join(' · ')
}

function articleGamePremise(preview: ArticlePreview, genre: GameGenre) {
  const title = preview.title.replace(/[.!?]+$/, '')
  const genreTone: Record<GameGenre, string> = {
    horror: 'a tense interactive comic about pressure, hidden risk, and difficult tradeoffs',
    comedy: 'a playful interactive comic that turns the article ideas into sharp choices and reversals',
    mystery: 'an investigative interactive comic where each choice uncovers what the article is really arguing',
  }

  return `"${title}" becomes ${genreTone[genre]}.`
}

export function GameGeneratorForm({ onGameGenerated, initialUrl, initialPaymentPath = 'musd', initialMode }: GameGeneratorFormProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [url, setUrl] = useState(initialUrl || '')
  const [mode, setMode] = useState<'story' | 'wordle'>(initialMode || 'story')
  const [genre, setGenre] = useState<GameGenre>('horror')
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy')
  const [imageQuality, setImageQuality] = useState<ImageQuality>('fast')
  const [showCustomization, setShowCustomization] = useState(false)
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
  const [selectedCoin, setSelectedCoin] = useState<WriterCoin>(DEFAULT_WRITER_COIN)
  const [showWriterSelector, setShowWriterSelector] = useState(false)
  const [articlePreview, setArticlePreview] = useState<ArticlePreview | null>(null)
  const [isPreviewingArticle, setIsPreviewingArticle] = useState(false)
  const [previewedUrl, setPreviewedUrl] = useState('')

  type LoadingStep = 'validate' | 'extract' | 'generate' | 'save'
  type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error'
  const [loadingStep, setLoadingStep] = useState<LoadingStep | null>(null)
  const [stepStatuses, setStepStatuses] = useState<Record<LoadingStep, StepStatus>>({
    validate: 'pending',
    extract: 'pending',
    generate: 'pending',
    save: 'pending',
  })

  const writerCoin = selectedCoin
  const isStoryMode = mode === 'story'
  const isMusdPath = paymentPath === 'musd'
  const hasPreviewedCurrentUrl = !!articlePreview && previewedUrl === url.trim()

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

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const previewArticle = async () => {
    if (!url.trim()) {
      setError('Please provide a Paragraph.xyz article URL')
      return null
    }

    setIsPreviewingArticle(true)
    setError(null)

    try {
      const response = await fetch('/api/articles/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          paymentPath,
          writerCoinId: isMusdPath ? undefined : writerCoin.id,
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Could not preview this article.')
      }

      setArticlePreview(result.data)
      setPreviewedUrl(url.trim())
      return result.data as ArticlePreview
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not preview this article.'
      setArticlePreview(null)
      setPreviewedUrl('')
      setPaymentApproved(false)
      setError(message)
      return null
    } finally {
      setIsPreviewingArticle(false)
    }
  }

  const generateGame = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      setLoadingStep('validate')
      setStepStatuses((prev) => ({ ...prev, validate: 'in-progress' }))
      await wait(700)

      if (!url.trim()) {
        throw new Error('Please provide a Paragraph.xyz article URL')
      }

      if (mode !== 'wordle' && !isMusdPath && !validateArticleUrl(url.trim(), writerCoin.id)) {
        throw new Error(`This URL does not match ${writerCoin.name}. Pick a matching article or switch to MUSD for any Paragraph article.`)
      }

      setStepStatuses((prev) => ({ ...prev, validate: 'completed' }))
      setLoadingStep('extract')
      setStepStatuses((prev) => ({ ...prev, extract: 'in-progress' }))
      await wait(600)
      setStepStatuses((prev) => ({ ...prev, extract: 'completed' }))
      setLoadingStep('generate')
      setStepStatuses((prev) => ({ ...prev, generate: 'in-progress' }))

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
                  writerCoinId: isMusdPath ? 'musd-testnet' : writerCoin.id,
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
      setStepStatuses((prev) => ({ ...prev, save: 'in-progress' }))
      await wait(500)
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

    if (!hasPreviewedCurrentUrl) {
      await previewArticle()
      return
    }

    if (!paymentApproved && isStoryMode) {
      setError('Story games are paid. Review the generation options below, connect your wallet if needed, and complete payment to generate. You can switch to Wordle for a free article-derived preview.')
      return
    }

    await generateGame()
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Step 1</p>
              <h2 className="text-lg font-semibold text-foreground">Paste the article</h2>
              <p className="text-sm text-muted-foreground">
                Start with the source. Wallet, payment, minting, and IP options come after the article is in place.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="url" className="text-sm font-medium">
                  Paragraph.xyz Article URL
                </Label>
                <motion.div
                  className="relative group"
                  whileHover={{ scale: 1.1 }}
                >
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  <motion.div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-muted border border-border rounded-lg text-xs text-foreground z-50 pointer-events-none"
                    initial={{ opacity: 0, y: 5 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isMusdPath
                      ? 'Any public Paragraph.xyz article works with MUSD on Mezo.'
                      : 'Writer coin generation validates against the selected writer.'}
                  </motion.div>
                </motion.div>
              </div>
              <Input
                id="url"
                type="url"
                placeholder={isMusdPath ? 'https://paragraph.xyz/... (any article)' : 'https://paragraph.xyz/...'}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setError(null)
                  setArticlePreview(null)
                  setPreviewedUrl('')
                  setPaymentApproved(false)
                }}
                className="mt-1 font-mono focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              />
              <p className="text-xs text-muted-foreground mt-1 px-1">
                Wordle is free. Story generation asks for payment only after this URL is ready.
              </p>
            </div>

            {articlePreview && hasPreviewedCurrentUrl && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md bg-emerald-500/20 p-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Article ready</p>
                    <h3 className="mt-1 text-sm font-semibold text-foreground">{articlePreview.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {articlePreviewMeta(articlePreview)}
                    </p>
                    {articlePreview.excerpt && (
                      <p className="mt-2 max-h-10 overflow-hidden text-xs text-muted-foreground">{articlePreview.excerpt}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {!articlePreview && (
              <button
                type="button"
                onClick={previewArticle}
                disabled={isPreviewingArticle || !url.trim()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPreviewingArticle ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {isPreviewingArticle ? 'Checking article...' : 'Preview article'}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Game Type</Label>
              <motion.div
                className="relative group"
                whileHover={{ scale: 1.1 }}
              >
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                <motion.div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-muted border border-border rounded-lg text-xs text-foreground z-50 pointer-events-none"
                  initial={{ opacity: 0, y: 5 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  Choose between Story (narrative adventure) or Wordle (word puzzle) game types
                </motion.div>
              </motion.div>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 border border-border p-1">
              <motion.button
                type="button"
                onClick={() => setMode('story')}
                className={`min-h-11 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  mode === 'story'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                <span className="font-semibold">Story (5-panel)</span>
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setMode('wordle')}
                className={`min-h-11 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  mode === 'wordle'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                <span className="font-semibold">Wordle (Free)</span>
              </motion.button>
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === 'story'
                ? 'Story creates a 5-panel narrative game with AI-generated artwork, branching choices, and mood tracking.'
                : 'Wordle creates a free word puzzle derived from your article. No payment needed.'}
            </p>
          </div>

          {isStoryMode && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Step 2</p>
                <h2 className="text-lg font-semibold text-foreground">Choose generation path</h2>
                <p className="text-sm text-muted-foreground">
                  MUSD works with any Paragraph article. Writer coin mode is curated around supported writers.
                </p>
              </div>

              <div className="flex gap-2 p-1 rounded-lg bg-slate-900/50 border border-purple-500/20">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentPath('musd')
                    setPaymentApproved(false)
                    setArticlePreview(null)
                    setPreviewedUrl('')
                    setError(null)
                  }}
                  className={`flex-1 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${paymentPath === 'musd' ? 'bg-orange-600 text-white shadow-lg' : 'text-orange-300 hover:bg-orange-800/50'}`}
                >
                  Any article · MUSD
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentPath('writercoin')
                    setPaymentApproved(false)
                    setArticlePreview(null)
                    setPreviewedUrl('')
                    setError(null)
                  }}
                  className={`flex-1 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${paymentPath === 'writercoin' ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-300 hover:bg-purple-800/50'}`}
                >
                  Writer coin · Base
                </button>
              </div>

              {!isMusdPath && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">Selected writer</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {writerCoin.writer} · {writerCoin.symbol}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWriterSelector((value) => !value)}
                      className="text-xs text-purple-400 hover:text-purple-300 underline decoration-dotted"
                    >
                      {showWriterSelector ? 'Done' : 'Change writer'}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showWriterSelector && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <WriterCoinSelector onSelect={(coin) => {
                          setSelectedCoin(coin)
                          setShowWriterSelector(false)
                          setPaymentApproved(false)
                          setArticlePreview(null)
                          setPreviewedUrl('')
                          setError(null)
                        }} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {hasPreviewedCurrentUrl && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-cyan-500/20 p-2">
                  <Sparkles className="h-4 w-4 text-cyan-200" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-200/80">
                    Game preview
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-foreground">
                    {mode === 'wordle' ? 'Free article Wordle' : '5-panel playable comic'}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mode === 'wordle'
                      ? `A word puzzle derived from the language and themes in "${articlePreview.title}".`
                      : articleGamePremise(articlePreview, genre)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-cyan-100">
                      {mode === 'wordle' ? 'Free' : 'Paid generation'}
                    </span>
                    <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-muted-foreground">
                      Source-linked
                    </span>
                    {mode === 'story' && (
                      <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-muted-foreground">
                        {genre} · {difficulty}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {!isGenerating && isStoryMode && (
            <motion.div
              className="pt-4 border-t border-border"
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

        {/* Payment section — appears after the article is ready. */}
        {isStoryMode && hasPreviewedCurrentUrl && (
          <div className="space-y-4 p-5 rounded-xl border border-cyan-500/40 bg-gradient-to-br from-slate-950/90 to-cyan-950/50 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-cyan-300" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-200/80 mb-1">Step 3</p>
                <h3 className="font-semibold text-lg text-cyan-50 mb-1">Generate full story game</h3>
                <p className="text-sm text-cyan-100/90 mb-3">
                  Create the playable 5-panel game, save it to your arcade, and keep minting/IP options for after generation.
                </p>
              </div>
            </div>

            <PaymentOption
              key={`${paymentPath}-${writerCoin.id}`}
              writerCoin={writerCoin}
              initialToken={paymentTokenForPath(paymentPath, writerCoin)}
              action="generate-game"
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={(err) => setError(err)}
              disabled={isGenerating || !url.trim()}
              compact
            />
            <details className="rounded-lg border border-cyan-500/20 bg-black/20 p-3 text-xs text-cyan-100/75">
              <summary className="cursor-pointer font-medium text-cyan-100">Payment details</summary>
              <p className="mt-2 leading-relaxed">
                {isMusdPath
                  ? 'MUSD supports any public Paragraph article on Mezo. The original writer still remains part of the attribution flow.'
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

        {/* Submit button — always visible */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            <Button
              type="submit"
              disabled={isGenerating || isPreviewingArticle || (isStoryMode && hasPreviewedCurrentUrl && !paymentApproved)}
              className="w-full bg-purple-600 text-white hover:bg-purple-700 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 relative overflow-hidden focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
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
                  {!hasPreviewedCurrentUrl
                    ? isPreviewingArticle
                      ? 'Checking Article...'
                      : 'Preview Article'
                    : isStoryMode
                    ? paymentApproved
                      ? `Generate Custom ${genre.charAt(0).toUpperCase() + genre.slice(1)} Game`
                      : url.trim()
                        ? 'Complete Payment to Generate'
                        : 'Paste Article to Start'
                    : 'Create Wordle Game (Free)'}
                </>
              )}
            </Button>
          </motion.div>
      </form>

      <div className="mt-8 p-4 rounded-lg border border-border bg-card text-card-foreground">
        <h3 className="font-medium mb-2 text-sm">💡 Tips for better games</h3>
        <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1.5">
          <li>{mode === 'wordle' ? 'Wordle works with public Paragraph.xyz articles and does not require payment.' : isMusdPath ? 'Paste any public Paragraph.xyz article to remix with MUSD.' : 'Paste URLs from Paragraph.xyz articles by the selected writer.'}</li>
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
        title="Game Created Successfully!"
        description="Your AI-generated game is ready to play. Minting and IP registration are optional next steps in My Games."
        gameSlug={successData?.gameSlug}
        action="generate"
        authorName={successData?.author}
      />
    </div>
  )
}
