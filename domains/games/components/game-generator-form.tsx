'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Sparkles, Info, Lightbulb, AlertTriangle, CheckCircle2, FileText, RefreshCw, X, ChevronDown } from 'lucide-react'
import { GenreSelector, type GameGenre } from '@/components/game/GenreSelector'
import { DifficultySelector, type GameDifficulty } from '@/components/game/DifficultySelector'
import { PaymentOption } from '@/components/game/PaymentOption'
import { SuccessModal } from '@/components/success/SuccessModal'
import { GameGenerationOverlay } from '@/components/game/GameGenerationOverlay'
import { ArticleFidelityReview } from '@/components/game/article-fidelity-review'
import { type WriterCoin, WRITER_COINS, validateArticleUrl, type PaymentToken } from '@/lib/writerCoins'
import { WriterCoinSelector } from '@/components/game/WriterCoinSelector'
import { retryWithBackoff } from '@/lib/error-handler'
import { useWriterCoinBalance } from '@/hooks/useWriterCoinBalance'
import type { PaymentPath } from '@/domains/games/components/simple-game-form'
import { trackEvent } from '@/lib/analytics'

interface GameGeneratorFormProps {
  onGameGenerated?: (game: { id: string; title: string; slug: string; genre: string }) => void
  initialUrl?: string
  initialPaymentPath?: PaymentPath
  initialMode?: 'story' | 'wordle'
}

const DEFAULT_WRITER_COIN = WRITER_COINS[0]
const ARTICLE_PREVIEW_TIMEOUT_MS = 15000
const GAME_GENERATION_TIMEOUT_MS = 120000

type GenerateErrorPhase = 'article' | 'payment' | 'generation'

interface GenerateErrorState {
  phase: GenerateErrorPhase
  title: string
  message: string
  retryLabel: string
  suggestions: string[]
}

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

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function articleError(message: string): GenerateErrorState {
  const lowerMessage = message.toLowerCase()
  const isUnsupportedUrl = lowerMessage.includes('url') || lowerMessage.includes('paragraph') || lowerMessage.includes('writer')
  const isTimeout = lowerMessage.includes('timed out') || lowerMessage.includes('timeout')

  return {
    phase: 'article',
    title: isTimeout ? 'Article preview timed out' : isUnsupportedUrl ? 'Article link needs attention' : 'Article preview failed',
    message,
    retryLabel: 'Check article again',
    suggestions: [
      'Use a public Paragraph.xyz article URL.',
      'Open the article in a private browser tab to confirm it is accessible.',
      'If writer coin mode is selected, switch to MUSD for any public Paragraph article.',
    ],
  }
}

function paymentError(message: string): GenerateErrorState {
  return {
    phase: 'payment',
    title: 'Payment did not complete',
    message,
    retryLabel: 'Try payment again',
    suggestions: [
      'Confirm your wallet is unlocked and connected.',
      'Check that you are on the requested network before approving.',
      'Confirm your token balance covers the generation cost and gas.',
    ],
  }
}

function generationError(message: string): GenerateErrorState {
  const lowerMessage = message.toLowerCase()
  const isTimeout = lowerMessage.includes('timed out') || lowerMessage.includes('timeout')

  return {
    phase: 'generation',
    title: isTimeout ? 'Generation is taking too long' : 'Game generation failed',
    message,
    retryLabel: 'Generate again',
    suggestions: [
      isTimeout ? 'Retry with Fast image quality if the article is long.' : 'Retry once; model failures are often temporary.',
      'Try a shorter article or switch to Wordle for a free article-derived result.',
      'Keep this tab open while generation is running.',
    ],
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

function GenerateErrorPanel({
  error,
  onRetry,
  onDismiss,
}: {
  error: GenerateErrorState
  onRetry: () => void
  onDismiss: () => void
}) {
  return (
    <div className="rounded-lg border border-red-600/50 bg-red-950/30 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-300/80">
                {error.phase}
              </p>
              <h3 className="mt-1 text-base font-semibold text-red-100">{error.title}</h3>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md p-1 text-red-300/70 transition hover:bg-red-500/10 hover:text-red-200"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-sm text-red-100/85">{error.message}</p>
          <ul className="mt-3 space-y-1 text-xs text-red-100/70">
            {error.suggestions.map((suggestion) => (
              <li key={suggestion}>- {suggestion}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/20 sm:w-auto"
          >
            <RefreshCw className="h-4 w-4" />
            {error.retryLabel}
          </button>
        </div>
      </div>
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
  const { isConnected } = useAccount()
  const [isGenerating, setIsGenerating] = useState(false)
  const [url, setUrl] = useState(initialUrl || '')
  const [mode, setMode] = useState<'story' | 'wordle'>(initialMode || 'story')
  const [genre, setGenre] = useState<GameGenre>('horror')
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy')
  const [imageQuality, setImageQuality] = useState<ImageQuality>('fast')
  const [showCustomization, setShowCustomization] = useState(false)
  const [paymentApproved, setPaymentApproved] = useState(false)
  const [error, setError] = useState<GenerateErrorState | null>(null)
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
  const [showAdvancedPayment, setShowAdvancedPayment] = useState(initialPaymentPath === 'writercoin')
  const [articlePreview, setArticlePreview] = useState<ArticlePreview | null>(null)
  const [isPreviewingArticle, setIsPreviewingArticle] = useState(false)
  const [previewedUrl, setPreviewedUrl] = useState('')
  const autoPreviewedUrlRef = useRef<string | null>(null)
  const paymentCompletedRef = useRef(false)
  const paymentPathExposureRef = useRef<string | null>(null)

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
    paymentCompletedRef.current = true
    trackEvent('payment_succeeded', {
      paymentPath,
      mode,
      articlePreviewed: hasPreviewedCurrentUrl,
    })
    setPaymentApproved(true)
    setError(null)
    await generateGame()
  }

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const previewArticle = async () => {
    if (!url.trim()) {
      setError(articleError('Please provide a Paragraph.xyz article URL.'))
      return null
    }

    setIsPreviewingArticle(true)
    setError(null)
    trackEvent('article_preview_started', {
      paymentPath,
      mode,
      writerCoinId: isMusdPath ? undefined : writerCoin.id,
    })

    try {
      const response = await fetchWithTimeout('/api/articles/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          paymentPath,
          writerCoinId: isMusdPath ? undefined : writerCoin.id,
        }),
      }, ARTICLE_PREVIEW_TIMEOUT_MS)

      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Could not preview this article.')
      }

      setArticlePreview(result.data)
      setPreviewedUrl(url.trim())
      trackEvent('article_preview_succeeded', {
        paymentPath,
        mode,
        writerCoinId: isMusdPath ? undefined : writerCoin.id,
        wordCount: result.data?.wordCount,
        estimatedReadTime: result.data?.estimatedReadTime,
      })
      return result.data as ArticlePreview
    } catch (err) {
      const message = isAbortError(err)
        ? 'Article preview timed out. The article host may be slow or blocking extraction.'
        : err instanceof Error ? err.message : 'Could not preview this article.'
      setArticlePreview(null)
      setPreviewedUrl('')
      setPaymentApproved(false)
      setError(articleError(message))
      trackEvent('article_preview_failed', {
        paymentPath,
        mode,
        writerCoinId: isMusdPath ? undefined : writerCoin.id,
        error: message,
      })
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

          const response = await fetchWithTimeout('/api/games/generate', {
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
          }, GAME_GENERATION_TIMEOUT_MS)

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
      setSuccessData({
        gameSlug: gameData.slug,
        title: gameData.title,
        author: undefined,
      })
      trackEvent('game_generated', {
        mode,
        paymentPath,
        gameSlug: gameData.slug,
        genre,
        difficulty,
      })

      onGameGenerated?.(result.data)
      // State resets handled in onClose callback to avoid blank form before modal dismisses
    } catch (err) {
      const message = isAbortError(err)
        ? 'Game generation timed out before the server returned a result.'
        : err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(generationError(message))
      setPaymentApproved(false)
      trackEvent('game_generation_failed', {
        mode,
        paymentPath,
        genre,
        difficulty,
        loadingStep,
        error: message,
      })

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
      setError(articleError('Please provide a Paragraph.xyz article URL.'))
      return
    }

    if (!hasPreviewedCurrentUrl) {
      await previewArticle()
      return
    }

    if (!paymentApproved && isStoryMode) {
      setError(paymentError('Story games are paid. Review the generation options below, connect your wallet if needed, and complete payment to generate. You can switch to Wordle for a free article-derived preview.'))
      return
    }

    await generateGame()
  }

  useEffect(() => {
    if (!isStoryMode || !hasPreviewedCurrentUrl) return

    const exposureKey = `${previewedUrl}:${paymentPath}:${writerCoin.id}`
    if (paymentPathExposureRef.current === exposureKey) return

    paymentPathExposureRef.current = exposureKey
    trackEvent('payment_path_selected', {
      paymentPath,
      mode,
      source: isMusdPath ? 'recommended_default' : 'advanced_writercoin',
      writerCoinId: isMusdPath ? undefined : writerCoin.id,
      articlePreviewed: true,
    })
  }, [hasPreviewedCurrentUrl, isMusdPath, isStoryMode, mode, paymentPath, previewedUrl, writerCoin.id])

  useEffect(() => {
    if (!isStoryMode || !hasPreviewedCurrentUrl || paymentApproved || paymentCompletedRef.current) return

    const handlePageHide = () => {
      trackEvent(
        isConnected ? 'payment_abandoned_after_wallet_connect' : 'payment_abandoned_before_wallet_connect',
        {
          paymentPath,
          mode,
          writerCoinId: isMusdPath ? undefined : writerCoin.id,
          articlePreviewed: true,
        }
      )
    }

    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
  }, [hasPreviewedCurrentUrl, isConnected, isMusdPath, isStoryMode, mode, paymentApproved, paymentPath, writerCoin.id])

  useEffect(() => {
    const normalizedUrl = url.trim()
    if (!initialUrl || !normalizedUrl || autoPreviewedUrlRef.current === normalizedUrl) return
    if (hasPreviewedCurrentUrl || isPreviewingArticle) return

    autoPreviewedUrlRef.current = normalizedUrl
    previewArticle()
    // Run only for URL arrivals; user edits are handled by the explicit preview button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl, url, hasPreviewedCurrentUrl, isPreviewingArticle])

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Paste the article</h2>
              <p className="text-sm text-muted-foreground">
                Start with a public Paragraph article.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="url" className="text-sm font-medium">
                  Paragraph.xyz Article URL
                </Label>
              </div>
              <Input
                id="url"
                type="url"
                placeholder={isMusdPath ? 'https://paragraph.xyz/... (any article)' : 'https://paragraph.xyz/...'}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  paymentCompletedRef.current = false
                  setError(null)
                  setArticlePreview(null)
                  setPreviewedUrl('')
                  paymentPathExposureRef.current = null
                  setPaymentApproved(false)
                }}
                className="mt-1 font-mono focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              />
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

          {!hasPreviewedCurrentUrl && (
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
            <div className="grid grid-cols-1 gap-2 rounded-lg bg-muted/40 border border-border p-1 min-[420px]:grid-cols-2">
              <motion.button
                type="button"
                onClick={() => {
                  setMode('story')
                  paymentCompletedRef.current = false
                  trackEvent('game_mode_selected', { mode: 'story', paymentPath })
                }}
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
                onClick={() => {
                  setMode('wordle')
                  paymentCompletedRef.current = false
                  trackEvent('game_mode_selected', { mode: 'wordle', paymentPath })
                }}
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
          )}

          {isStoryMode && hasPreviewedCurrentUrl && (
            <div className="rounded-xl border border-border bg-card">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvancedPayment((value) => !value)
                    if (!showAdvancedPayment) {
                      trackEvent('payment_path_advanced_opened', {
                        paymentPath,
                        mode,
                        writerCoinId: writerCoin.id,
                      })
                    }
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span>
                    <span className="block text-sm font-semibold text-foreground">Advanced payment options</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${showAdvancedPayment ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showAdvancedPayment && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-4 border-t border-border p-4">
                        <div className={`rounded-lg border p-3 ${
                          isMusdPath
                            ? 'border-amber-400/50 bg-amber-500/10'
                            : 'border-border bg-muted/30'
                        }`}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-bold text-foreground">MUSD · Mezo</p>
                                <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                                  Recommended
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Works with any public Paragraph article.
                              </p>
                            </div>
                            {isMusdPath ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Selected
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentPath('musd')
                                  paymentCompletedRef.current = false
                                  setPaymentApproved(false)
                                  setArticlePreview(null)
                                  setPreviewedUrl('')
                                  paymentPathExposureRef.current = null
                                  setError(null)
                                  trackEvent('payment_path_selected', { paymentPath: 'musd', mode, source: 'recommended_click' })
                                }}
                                className="inline-flex min-h-10 items-center justify-center rounded-md bg-amber-600 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-amber-500"
                              >
                                Use MUSD
                              </button>
                            )}
                          </div>
                        </div>

                        <div className={`rounded-lg border p-3 ${
                          !isMusdPath
                            ? 'border-purple-400/50 bg-purple-500/10'
                            : 'border-purple-500/20 bg-slate-950/30'
                        }`}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground">Writer coin · Base</p>
                              <p className="text-xs text-muted-foreground">
                                Best when you already know the article belongs to a supported writer.
                              </p>
                            </div>
                            {!isMusdPath ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 px-2.5 py-1 text-xs font-semibold text-purple-200">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Selected
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentPath('writercoin')
                                  paymentCompletedRef.current = false
                                  setPaymentApproved(false)
                                  setArticlePreview(null)
                                  setPreviewedUrl('')
                                  paymentPathExposureRef.current = null
                                  setError(null)
                                  trackEvent('payment_path_selected', { paymentPath: 'writercoin', mode, source: 'advanced_click', writerCoinId: writerCoin.id })
                                }}
                                className="inline-flex min-h-10 items-center justify-center rounded-md border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-purple-100 transition hover:bg-purple-500/20"
                              >
                                Use writer coin
                              </button>
                            )}
                          </div>
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

                            <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 p-3 text-xs text-purple-100/80">
                              The article URL must match this writer. If it does not, switch back to MUSD.
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
                                    paymentCompletedRef.current = false
                                    setShowWriterSelector(false)
                                    setPaymentApproved(false)
                                    setArticlePreview(null)
                                    setPreviewedUrl('')
                                    paymentPathExposureRef.current = null
                                    setError(null)
                                  }} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-200/80">
                    Your game
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-foreground">
                    {mode === 'wordle' ? 'Free article Wordle' : '5-panel playable comic'}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mode === 'wordle'
                      ? `A word puzzle derived from the language and themes in "${articlePreview.title}".`
                      : articleGamePremise(articlePreview, genre)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-cyan-100">
                      {mode === 'wordle' ? 'Free' : 'Paid'}
                    </span>
                    {mode === 'story' && (
                      <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-muted-foreground">
                        {genre} · {difficulty}
                      </span>
                    )}
                    {mode === 'story' && (
                      <button
                        type="button"
                        onClick={() => setShowCustomization((value) => !value)}
                        className="rounded-full border border-cyan-500/30 bg-black/20 px-2.5 py-1 text-cyan-100 transition hover:bg-cyan-500/10"
                      >
                        Customize
                      </button>
                    )}
                    {mode === 'story' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('wordle')
                          paymentCompletedRef.current = false
                          trackEvent('game_mode_selected', { mode: 'wordle', paymentPath, source: 'post_preview_link' })
                        }}
                        className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-muted-foreground transition hover:text-foreground"
                      >
                        Make free Wordle instead
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {!isGenerating && isStoryMode && hasPreviewedCurrentUrl && showCustomization && (
            <motion.div
              className="pt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <AnimatePresence>
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
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-purple-100">Customize style</span>
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
                        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
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
                            Fast (Turbo)
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
                            High Quality
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
                        </div>
                      </motion.div>
                    </motion.div>
                  </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

        </div>

        {error && (
          <GenerateErrorPanel
            error={error}
            onRetry={() => {
              if (error.phase === 'article') {
                previewArticle()
                return
              }
              if (error.phase === 'generation') {
                generateGame()
                return
              }
              setError(null)
            }}
            onDismiss={() => setError(null)}
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
              </div>
            </div>

            <PaymentOption
              key={`${paymentPath}-${writerCoin.id}`}
              writerCoin={writerCoin}
              initialToken={paymentTokenForPath(paymentPath, writerCoin)}
              action="generate-game"
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={(err) => setError(paymentError(err))}
              disabled={isGenerating || !url.trim()}
              compact
            />
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

        {/* Submit button — visible until the paid story payment CTA takes over. */}
        {(!isStoryMode || !hasPreviewedCurrentUrl) && (
          <motion.div
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            <Button
              type="submit"
              disabled={isGenerating || isPreviewingArticle || (isStoryMode && hasPreviewedCurrentUrl && !paymentApproved)}
              className="relative w-full whitespace-normal bg-purple-600 text-white hover:bg-purple-700 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
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
        )}
      </form>

      <details className="mt-8 rounded-lg border border-border bg-card p-4 text-card-foreground">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Tips for better games</summary>
        <ul className="mt-3 list-disc pl-4 text-sm text-muted-foreground space-y-1.5">
          <li>{mode === 'wordle' ? 'Wordle works with public Paragraph.xyz articles and does not require payment.' : isMusdPath ? 'Paste any public Paragraph.xyz article to remix with MUSD.' : 'Paste URLs from Paragraph.xyz articles by the selected writer.'}</li>
          <li>Genre and difficulty shape how the AI interprets the article.</li>
          <li><a href="/workshop" className="text-primary hover:underline font-medium">Use the Workshop</a> for deeper personalization.</li>
        </ul>
      </details>

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
            setSuccessData({
              gameSlug: generatedGame.slug,
              title: generatedGame.title,
              author: undefined,
            })
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
        title={successData?.title || 'Game Created Successfully!'}
        description="Your playable story is ready. Play it now, share it, or make another."
        gameSlug={successData?.gameSlug}
        action="generate"
        authorName={successData?.author}
        onMakeAnother={() => {
          setSuccessData(null)
          setGeneratedGame(null)
          setUrl('')
          setPaymentApproved(false)
          paymentCompletedRef.current = false
        }}
        onReviewSource={generatedGame ? () => {
          setSuccessData(null)
          setShowFidelityReview(true)
        } : undefined}
      />
    </div>
  )
}
