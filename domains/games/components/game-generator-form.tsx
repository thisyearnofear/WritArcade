'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Sparkles, Info, Lightbulb, AlertTriangle, CheckCircle2, FileText, RefreshCw, X, ChevronDown, ExternalLink } from 'lucide-react'
import { GenreSelector, type GameGenre } from '@/components/game/GenreSelector'
import { DifficultySelector, type GameDifficulty } from '@/components/game/DifficultySelector'
import { PaymentOption } from '@/components/game/PaymentOption'
import { SuccessModal } from '@/components/success/SuccessModal'
import { GameGenerationOverlay } from '@/components/game/GameGenerationOverlay'
import { ArticleFidelityReview } from '@/components/game/article-fidelity-review'
import { type WriterCoin, WRITER_COINS, validateArticleUrl } from '@/lib/writerCoins'
import { WriterCoinSelector } from '@/components/game/WriterCoinSelector'
import { detectWriterCoinFromUrl } from '@/lib/payment-path-resolver'
import { retryWithBackoff } from '@/services/error-handler'
import { useWriterCoinBalance } from '@/hooks/useWriterCoinBalance'
import type { PaymentResult } from '@/domains/payments/strategies/payment-strategy'
import { trackEvent } from '@/services/analytics'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  DesktopStepIndicator,
  MobileStepHeader,
  MobileStepNav,
  type GenerateStep,
  getStepIndex,
  GENERATE_STEPS,
} from '@/components/ui/step-indicator'
import {
  type PaymentPath,
  type ImageQuality,
  type GenerateErrorState,
  type ArticlePreview,
  ARTICLE_PREVIEW_TIMEOUT_MS,
  GAME_GENERATION_TIMEOUT_MS,
  PAYMENT_RECOVERY_TIMEOUT_MS,
  PAYMENT_RECOVERY_INTERVAL_MS,
  paymentTokenForPath,
  getGenerationErrorMessage,
  isAbortError,
  shortTxHash,
  paymentExplorerUrl,
  fetchWithTimeout,
  articleError,
  paymentError,
  generationError,
  articlePreviewMeta,
  articleGamePremise,
  StylePreview,
  GenerateErrorPanel,
} from './game-generator-helpers'

const DEFAULT_WRITER_COIN = WRITER_COINS[0]

interface GameGeneratorFormProps {
  onGameGenerated?: (game: { id: string; title: string; slug: string; genre: string }) => void
  initialUrl?: string
  initialPaymentPath?: PaymentPath
  initialMode?: 'story' | 'wordle'
}

export function GameGeneratorForm({ onGameGenerated, initialUrl, initialPaymentPath = 'musd', initialMode }: GameGeneratorFormProps) {
  const { isConnected, address: accountAddress } = useAccount()
  const [isGenerating, setIsGenerating] = useState(false)
  const [url, setUrl] = useState(initialUrl || '')
  const [mode, setMode] = useState<'story' | 'wordle'>(initialMode || 'story')
  const [genre, setGenre] = useState<GameGenre>('horror')
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy')
  const [imageQuality, setImageQuality] = useState<ImageQuality>('fast')
  const [showCustomization, setShowCustomization] = useState(false)
  const [paymentApproved, setPaymentApproved] = useState(false)
  const paymentTxHashRef = useRef<string | undefined>(undefined)
  const paymentIdRef = useRef<string | undefined>(undefined)
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

  // Step-based mobile UX
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [mobileStep, setMobileStep] = useState<GenerateStep>('article')

  const handleStepBack = useCallback(() => {
    const currentIdx = getStepIndex(mobileStep)
    if (currentIdx > 0) {
      setMobileStep(GENERATE_STEPS[currentIdx - 1].id)
    }
  }, [mobileStep])

  const canGoBack = getStepIndex(mobileStep) > 0
  const hasPreviewedCurrentUrl = !!articlePreview && previewedUrl === url.trim()

  // Auto-advance on mobile when article is previewed
  useEffect(() => {
    if (isDesktop) return
    if (!hasPreviewedCurrentUrl) return
    if (mode === 'wordle') {
      setMobileStep('generate')
    } else if (mobileStep === 'article') {
      setMobileStep('customize')
    }
  }, [hasPreviewedCurrentUrl, isDesktop, mode, mobileStep])

  // Auto-advance on mobile when payment is approved
  useEffect(() => {
    if (isDesktop) return
    if (paymentApproved && mobileStep === 'payment') {
      setMobileStep('generate')
    }
  }, [paymentApproved, isDesktop, mobileStep])

  // Auto-detect writer coin from URL
  const detectedCoin = useMemo(() => detectWriterCoinFromUrl(url), [url])
  const isAutoDetected = Boolean(detectedCoin) && paymentPath === 'musd' && !showAdvancedPayment

  type LoadingStep = 'payment' | 'validate' | 'extract' | 'generate' | 'save'
  type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error'
  const [loadingStep, setLoadingStep] = useState<LoadingStep | null>(null)
  const [stepStatuses, setStepStatuses] = useState<Record<LoadingStep, StepStatus>>({
    payment: 'pending',
    validate: 'pending',
    extract: 'pending',
    generate: 'pending',
    save: 'pending',
  })

  const isStoryMode = mode === 'story'
  const isMusdPath = paymentPath === 'musd'
  const writerCoin = !isMusdPath && detectedCoin ? detectedCoin : selectedCoin
  const activePaymentTxHash = paymentTxHashRef.current
  const activePaymentExplorerUrl = activePaymentTxHash
    ? paymentExplorerUrl(paymentPath, activePaymentTxHash)
    : null

  useEffect(() => {
    if (paymentPath !== 'writercoin' || writerCoin.paymentEnabled) return
    setPaymentPath('musd')
    setPaymentApproved(false)
    paymentCompletedRef.current = false
    paymentTxHashRef.current = undefined
    paymentIdRef.current = undefined
  }, [paymentPath, writerCoin.paymentEnabled])

  const requiredAmount = useMemo(() => {
    if (isMusdPath) return 0
    return Number(writerCoin.gameGenerationCost) / 10 ** writerCoin.decimals
  }, [isMusdPath, writerCoin])

  const { balance, isLoading: isLoadingBalance } = useWriterCoinBalance(writerCoin.id)

  const userBalance = useMemo(() => {
    if (isMusdPath || !balance?.formattedBalance) return null
    return parseFloat(balance.formattedBalance)
  }, [balance, isMusdPath])

  useEffect(() => {
    if (paymentPath !== 'writercoin' || !detectedCoin || selectedCoin.id === detectedCoin.id) return
    setSelectedCoin(detectedCoin)
    setPaymentApproved(false)
    paymentCompletedRef.current = false
    paymentTxHashRef.current = undefined
    paymentIdRef.current = undefined
    setArticlePreview(null)
    setPreviewedUrl('')
    paymentPathExposureRef.current = null
  }, [detectedCoin, paymentPath, selectedCoin.id])

  const handlePaymentSuccess = async (payment: PaymentResult) => {
    paymentCompletedRef.current = true
    paymentTxHashRef.current = payment.transactionHash
    paymentIdRef.current = payment.paymentId
    trackEvent('payment_succeeded', {
      paymentPath,
      mode,
      articlePreviewed: hasPreviewedCurrentUrl,
      hasPaymentId: Boolean(payment.paymentId),
    })
    setPaymentApproved(true)
    setError(null)
    await generateGame(payment.transactionHash)
  }

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const pollVerifiedPayment = async (params: {
    paymentId?: string
    transactionHash?: string
  }) => {
    const startedAt = Date.now()

    while (Date.now() - startedAt < PAYMENT_RECOVERY_TIMEOUT_MS) {
      const searchParams = new URLSearchParams()
      if (params.paymentId) {
        searchParams.set('paymentId', params.paymentId)
      } else if (params.transactionHash) {
        searchParams.set('transactionHash', params.transactionHash)
      } else {
        return null
      }

      const response = await fetchWithTimeout(
        `/api/payments/verify?${searchParams.toString()}`,
        { method: 'GET' },
        10000
      ).catch(() => null)

      const result = response
        ? await response.json().catch(() => null as { status?: string; paymentId?: string } | null)
        : null

      if (response?.ok && result?.status === 'verified') {
        return result.paymentId || params.paymentId || null
      }

      await wait(PAYMENT_RECOVERY_INTERVAL_MS)
    }

    return null
  }

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

  const generateGame = async (paymentTransactionHash?: string) => {
    setIsGenerating(true)
    setError(null)
    const currentPaymentTxHash = paymentTransactionHash || paymentTxHashRef.current
    let currentPaymentId = paymentIdRef.current
    const hasPaymentProof = isStoryMode && (
      paymentApproved ||
      Boolean(currentPaymentId) ||
      Boolean(currentPaymentTxHash)
    )

    try {
      // Reset all steps, then mark payment as done (we're called after payment succeeds)
      setStepStatuses({ payment: 'completed', validate: 'pending', extract: 'pending', generate: 'pending', save: 'pending' })
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
              wallet: accountAddress || undefined,
              ...(hasPaymentProof && showCustomization && {
                customization: {
                  genre,
                  difficulty,
                  imageQuality,
                },
              }),
              ...(hasPaymentProof && {
                payment: {
                  paymentId: currentPaymentId,
                  writerCoinId: isMusdPath ? 'musd-testnet' : writerCoin.id,
                  paymentPath,
                  transactionHash: currentPaymentTxHash,
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

	            if (errorData.code === 'PAYMENT_NOT_VERIFIED' && (currentPaymentId || currentPaymentTxHash)) {
	              setLoadingStep('payment')
	              setStepStatuses((prev) => ({ ...prev, payment: 'in-progress' }))
	              const recoveredPaymentId = await pollVerifiedPayment({
	                paymentId: currentPaymentId,
	                transactionHash: currentPaymentTxHash,
	              })

	              if (recoveredPaymentId) {
	                paymentIdRef.current = recoveredPaymentId
	                currentPaymentId = recoveredPaymentId
	                setPaymentApproved(true)
	                setStepStatuses((prev) => ({ ...prev, payment: 'completed' }))
	                lastError = new Error('Payment verified. Continuing generation...')
	                throw lastError
	              }
	            }

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

  const resetPaymentProgress = () => {
    setPaymentApproved(false)
    paymentCompletedRef.current = false
    paymentTxHashRef.current = undefined
    paymentIdRef.current = undefined
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

    await generateGame(paymentTxHashRef.current)
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
      {/* Step indicator — desktop phase bar, mobile header */}
      <DesktopStepIndicator currentStep={mobileStep} />
      <MobileStepHeader currentStep={mobileStep} />

      <form onSubmit={handleSubmit} className="space-y-6 pb-28 md:pb-0">
        <div className="space-y-4">

          {/* ── STEP 1: Article ── */}
          <div className={`${mobileStep === 'article' || isDesktop ? 'block' : 'hidden'}`}>
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
                    resetPaymentProgress()
                    setError(null)
                    setArticlePreview(null)
                    setPreviewedUrl('')
                    paymentPathExposureRef.current = null
                  }}
                className="mt-1 font-mono focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              />
            </div>

            {/* Auto-detected writer coin recommendation */}
            {isAutoDetected && detectedCoin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-purple-300">
                        {detectedCoin.symbol} detected
                      </p>
                      <span className="rounded-full border border-purple-400/40 bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-200">
                        Writer Coin
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-purple-200/70">
                      This article is by {detectedCoin.name}. Pay with {detectedCoin.symbol} on Base to support them directly.
                    </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentPath('writercoin')
                        setSelectedCoin(detectedCoin)
                        setShowAdvancedPayment(true)
                        resetPaymentProgress()
                        trackEvent('payment_path_auto_detected', {
                        writer: detectedCoin.id,
                        symbol: detectedCoin.symbol,
                        path: 'writercoin',
                        source: 'auto_detect_banner',
                      })
                    }}
                    className="flex-shrink-0 inline-flex items-center gap-1 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-500 transition-colors"
                  >
                    Use {detectedCoin.symbol}
                  </button>
                </div>
              </motion.div>
            )}

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
                    resetPaymentProgress()
                    trackEvent('game_mode_selected', { mode: 'story', paymentPath })
                  }}
                className={`min-h-11 rounded-md px-3 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  mode === 'story'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                  <span className="font-semibold">Story</span>
                  <span className={`text-[10px] font-bold ${mode === 'story' ? 'text-purple-200' : 'text-purple-400'}`}>
                    5-panel · NFT · CDR
                  </span>
              </motion.button>
                <motion.button
                  type="button"
                  onClick={() => {
                    setMode('wordle')
                    resetPaymentProgress()
                    trackEvent('game_mode_selected', { mode: 'wordle', paymentPath })
                  }}
                className={`min-h-11 rounded-md px-3 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  mode === 'wordle'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                  <span className="font-semibold">Wordle</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider rounded-sm px-1 py-0.5 ${
                    mode === 'wordle'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  }`}>
                    Free
                  </span>
              </motion.button>
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === 'story'
                ? 'Story creates a 5-panel narrative game with AI-generated artwork, branching choices, mood tracking, and an encrypted CDR epilogue unlocked by the minted NFT.'
                : 'Wordle creates a free word puzzle derived from your article vocabulary. No payment or wallet needed — a quick taste of the engine.'}
            </p>
          </div>
          )}
          </div>
          {/* ── Close Step 1: Article ── */}

          {/* ── STEP 2: Customize ── */}
          <div className={`${mobileStep === 'customize' || isDesktop ? 'block' : 'hidden'}`}>

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
                                    resetPaymentProgress()
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
                              <p className={`mt-1.5 text-[11px] font-semibold ${writerCoin.paymentEnabled ? 'text-emerald-300/90' : 'text-amber-200/90'}`}>
                                {writerCoin.paymentEnabled
                                  ? `${writerCoin.writer} auto-receives 60% of every transaction.`
                                  : `${writerCoin.symbol} is not enabled on the Base payment contract yet. Use MUSD.`}
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
                                    if (!writerCoin.paymentEnabled) return
                                    setPaymentPath('writercoin')
                                    resetPaymentProgress()
                                    setArticlePreview(null)
                                    setPreviewedUrl('')
                                    paymentPathExposureRef.current = null
                                    setError(null)
                                  trackEvent('payment_path_selected', { paymentPath: 'writercoin', mode, source: 'advanced_click', writerCoinId: writerCoin.id })
                                }}
                                disabled={!writerCoin.paymentEnabled}
                                className={`inline-flex min-h-10 items-center justify-center rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
                                  writerCoin.paymentEnabled
                                    ? 'border-purple-500/40 bg-purple-500/10 text-purple-100 hover:bg-purple-500/20'
                                    : 'cursor-not-allowed border-slate-600/40 bg-slate-800/40 text-slate-400'
                                }`}
                              >
                                {writerCoin.paymentEnabled ? 'Use writer coin' : 'Use MUSD instead'}
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
                              {writerCoin.paymentEnabled
                                ? 'The article URL must match this writer. If it does not, switch back to MUSD.'
                                : `${writerCoin.symbol} payments are not active on Base yet. MUSD remains available for this writer's articles.`}
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
                                      resetPaymentProgress()
                                      setShowWriterSelector(false)
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
                            resetPaymentProgress()
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
          {/* ── Close Step 2: Customize ── */}

          {/* ── STEP 3: Payment ── */}
          <div className={`${mobileStep === 'payment' || isDesktop ? 'block' : 'hidden'}`}>

        {error && (
          <GenerateErrorPanel
            error={{
              ...error,
              retryLabel: error.phase === 'generation' && activePaymentTxHash
                ? 'Continue generation'
                : error.retryLabel,
            }}
            onRetry={() => {
              if (error.phase === 'article') {
                previewArticle()
                return
              }
              if (error.phase === 'generation') {
                generateGame(paymentTxHashRef.current)
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
                      onClick={() => generateGame(activePaymentTxHash)}
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
                onPaymentStart={() => {
                  setIsGenerating(true)
                  setStepStatuses({ payment: 'in-progress', validate: 'pending', extract: 'pending', generate: 'pending', save: 'pending' })
                  setLoadingStep('payment')
                }}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={(err) => setError(paymentError(err))}
                onPaymentPathChange={(path) => setPaymentPath(path)}
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

          </div>
          {/* ── Close Step 3: Payment ── */}

          {/* ── STEP 4: Generate ── */}
          <div className={`${mobileStep === 'generate' || isDesktop ? 'block' : 'hidden'}`}>

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
          </div>
          {/* ── Close Step 4: Generate ── */}

        </div>
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
          resetPaymentProgress()
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
          resetPaymentProgress()
        }}
        onReviewSource={generatedGame ? () => {
          setSuccessData(null)
          setShowFidelityReview(true)
        } : undefined}
      />

      {/* Mobile bottom nav — back button + step dots */}
      {!isGenerating && (
        <MobileStepNav
          currentStep={mobileStep}
          canGoBack={canGoBack}
          onBack={handleStepBack}
        />
      )}
    </div>
  )
}
