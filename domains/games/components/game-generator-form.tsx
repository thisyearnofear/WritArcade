'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { type GameGenre } from '@/components/game/GenreSelector'
import { type GameDifficulty } from '@/components/game/DifficultySelector'
import { GameGenerationOverlay } from '@/components/game/GameGenerationOverlay'
import { type WriterCoin, WRITER_COINS, validateArticleUrl } from '@/lib/writerCoins'
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
  getGenerationErrorMessage,
  isAbortError,
  paymentExplorerUrl,
  fetchWithTimeout,
  articleError,
  paymentError,
  generationError,
} from './game-generator-helpers'
import { ArticleStep } from './steps/article-step'
import { CustomizeStep } from './steps/customize-step'
import { PaymentStep } from './steps/payment-step'
import { GenerateStep as GenerateStepButton } from './steps/generate-step'

const DEFAULT_WRITER_COIN = WRITER_COINS[0]

interface GameGeneratorFormProps {
  onGameGenerated?: (game: { id: string; title: string; slug: string; genre: string }) => void
  initialUrl?: string
  initialPaymentPath?: PaymentPath
  initialMode?: 'story' | 'wordle'
}

export function GameGeneratorForm({ onGameGenerated, initialUrl, initialPaymentPath = 'musd', initialMode }: GameGeneratorFormProps) {
  const router = useRouter()
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
  // Game data is captured locally only long enough to redirect the user to the
  // playable game. No modal state is kept.
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

  // Auto-detect writer coin from URL and resolve the payment path automatically.
  // If the URL matches a supported writer coin, prefer that path; otherwise
  // fall back to MUSD/credits. Users can still override via advanced options.
  const detectedCoin = useMemo(() => detectWriterCoinFromUrl(url), [url])
  const isAutoDetected = Boolean(detectedCoin) && paymentPath === 'musd' && !showAdvancedPayment

  useEffect(() => {
    if (!detectedCoin) return
    if (showAdvancedPayment) return
    if (paymentPath === 'writercoin' && selectedCoin.id === detectedCoin.id) return
    if (detectedCoin.paymentEnabled) {
      setPaymentPath('writercoin')
      setSelectedCoin(detectedCoin)
      resetPaymentProgress()
    }
  }, [detectedCoin, paymentPath, selectedCoin.id, showAdvancedPayment])

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

  const previewArticle = useCallback(async () => {
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
  }, [url, paymentPath, mode, isMusdPath, writerCoin.id])

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
              ...(hasPaymentProof && {
                customization: {
                  genre,
                  difficulty,
                  imageQuality,
                },
              }),
              ...(hasPaymentProof && {
                payment: {
                  paymentId: currentPaymentId,
                  // Credits payments use the server-issued paymentId; their
                  // sentinel hash is not a 0x tx hash and must not be sent.
                  writerCoinId: currentPaymentTxHash?.startsWith('credits:')
                    ? 'credits'
                    : isMusdPath ? 'musd-testnet' : writerCoin.id,
                  paymentPath,
                  transactionHash: currentPaymentTxHash?.startsWith('0x')
                    ? currentPaymentTxHash
                    : undefined,
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
      trackEvent('game_generated', {
        mode,
        paymentPath,
        gameSlug: gameData.slug,
        genre,
        difficulty,
      })

      onGameGenerated?.(result.data)

      // Streamlined flow: skip modals dead-ends and take the user straight to the game.
      router.push(`/games/${gameData.slug}`)
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

  // Auto-preview on URL paste/edit after a short debounce so the user doesn't
  // have to click "Preview article". Manual preview remains a fallback.
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const normalizedUrl = url.trim()
    if (!normalizedUrl || normalizedUrl === previewedUrl) return
    if (autoPreviewedUrlRef.current === normalizedUrl) return
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current)

    previewTimeoutRef.current = setTimeout(() => {
      if (normalizedUrl.startsWith('http')) {
        previewArticle()
      }
    }, 800)

    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current)
    }
  }, [url, previewedUrl, previewArticle])

  // ── Step-component callbacks (encapsulate multi-step state updates) ──

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value)
    resetPaymentProgress()
    setError(null)
    setArticlePreview(null)
    setPreviewedUrl('')
    paymentPathExposureRef.current = null
  }, [])

  const handleUseDetectedCoin = useCallback(() => {
    if (!detectedCoin) return
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
  }, [detectedCoin])

  const handleSelectStory = useCallback(() => {
    setMode('story')
    resetPaymentProgress()
    trackEvent('game_mode_selected', { mode: 'story', paymentPath })
  }, [paymentPath])

  const handleSelectWordle = useCallback(() => {
    setMode('wordle')
    resetPaymentProgress()
    trackEvent('game_mode_selected', { mode: 'wordle', paymentPath })
  }, [paymentPath])

  const handleSetMusdPath = useCallback(() => {
    setPaymentPath('musd')
    resetPaymentProgress()
    setArticlePreview(null)
    setPreviewedUrl('')
    paymentPathExposureRef.current = null
    setError(null)
    trackEvent('payment_path_selected', { paymentPath: 'musd', mode, source: 'recommended_click' })
  }, [mode])

  const handleSetWriterCoinPath = useCallback(() => {
    if (!writerCoin.paymentEnabled) return
    setPaymentPath('writercoin')
    resetPaymentProgress()
    setArticlePreview(null)
    setPreviewedUrl('')
    paymentPathExposureRef.current = null
    setError(null)
    trackEvent('payment_path_selected', { paymentPath: 'writercoin', mode, source: 'advanced_click', writerCoinId: writerCoin.id })
  }, [mode, writerCoin])

  const handleToggleWriterSelector = useCallback(() => {
    setShowWriterSelector((v) => !v)
  }, [])

  const handleWriterCoinSelect = useCallback((coin: WriterCoin) => {
    setSelectedCoin(coin)
    resetPaymentProgress()
    setShowWriterSelector(false)
    setArticlePreview(null)
    setPreviewedUrl('')
    paymentPathExposureRef.current = null
    setError(null)
  }, [])

  const handleSetModeWordle = useCallback(() => {
    setMode('wordle')
    resetPaymentProgress()
    trackEvent('game_mode_selected', { mode: 'wordle', paymentPath, source: 'post_preview_link' })
  }, [paymentPath])

  const handleToggleCustomization = useCallback(() => {
    setShowCustomization((v) => !v)
  }, [])

  const handleToggleAdvancedPayment = useCallback(() => {
    setShowAdvancedPayment((v) => !v)
    if (!showAdvancedPayment) {
      trackEvent('payment_path_advanced_opened', {
        paymentPath,
        mode,
        writerCoinId: writerCoin.id,
      })
    }
  }, [showAdvancedPayment, paymentPath, mode, writerCoin.id])

  const handleResetDefaults = useCallback(() => {
    setGenre('horror')
    setDifficulty('easy')
  }, [])

  const handleRetry = useCallback(() => {
    if (error?.phase === 'article') {
      previewArticle()
      return
    }
    if (error?.phase === 'generation') {
      generateGame(paymentTxHashRef.current)
      return
    }
    setError(null)
  }, [error, previewArticle, generateGame, paymentTxHashRef])

  const handlePaymentStart = useCallback(() => {
    setIsGenerating(true)
    setStepStatuses({ payment: 'in-progress', validate: 'pending', extract: 'pending', generate: 'pending', save: 'pending' })
    setLoadingStep('payment')
  }, [])



  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Step indicator — desktop phase bar, mobile header */}
      <DesktopStepIndicator currentStep={mobileStep} />
      <MobileStepHeader currentStep={mobileStep} />

      <form onSubmit={handleSubmit} className="space-y-6 pb-28 md:pb-0">
        <div className="space-y-4">

          {/* ── STEP 1: Article ── */}
          <div className={`${mobileStep === 'article' || isDesktop ? 'block' : 'hidden'}`}>
            <ArticleStep
              url={url}
              onUrlChange={handleUrlChange}
              isMusdPath={isMusdPath}
              detectedCoin={detectedCoin}
              isAutoDetected={isAutoDetected}
              onUseDetectedCoin={handleUseDetectedCoin}
              articlePreview={articlePreview}
              hasPreviewedCurrentUrl={hasPreviewedCurrentUrl}
              isPreviewingArticle={isPreviewingArticle}
              onPreview={previewArticle}
              initialMode={initialMode}
              mode={mode}
              onSelectStory={handleSelectStory}
              onSelectWordle={handleSelectWordle}
            />
          </div>
          {/* ── Close Step 1: Article ── */}

          {/* ── STEP 2: Customize ── */}
          <div className={`${mobileStep === 'customize' || isDesktop ? 'block' : 'hidden'}`}>
            <CustomizeStep
              isStoryMode={isStoryMode}
              hasPreviewedCurrentUrl={hasPreviewedCurrentUrl}
              showAdvancedPayment={showAdvancedPayment}
              onToggleAdvancedPayment={handleToggleAdvancedPayment}
              paymentPath={paymentPath}
              mode={mode}
              writerCoin={writerCoin}
              isMusdPath={isMusdPath}
              onSetMusdPath={handleSetMusdPath}
              onSetWriterCoinPath={handleSetWriterCoinPath}
              showWriterSelector={showWriterSelector}
              onToggleWriterSelector={handleToggleWriterSelector}
              onWriterCoinSelect={handleWriterCoinSelect}
              onSetModeWordle={handleSetModeWordle}
              showCustomization={showCustomization}
              onToggleCustomization={handleToggleCustomization}
              genre={genre}
              onGenreChange={setGenre}
              difficulty={difficulty}
              onDifficultyChange={setDifficulty}
              imageQuality={imageQuality}
              onImageQualityChange={setImageQuality}
              onResetDefaults={handleResetDefaults}
              isGenerating={isGenerating}
              articlePreview={articlePreview}
            />
          </div>
          {/* ── Close Step 2: Customize ── */}

          {/* ── STEP 3: Payment ── */}
          <div className={`${mobileStep === 'payment' || isDesktop ? 'block' : 'hidden'}`}>
            <PaymentStep
              error={error}
              onRetry={handleRetry}
              onDismiss={() => setError(null)}
              isStoryMode={isStoryMode}
              isMusdPath={isMusdPath}
              balance={balance}
              paymentApproved={paymentApproved}
              userBalance={userBalance}
              requiredAmount={requiredAmount}
              isLoadingBalance={isLoadingBalance}
              writerCoin={writerCoin}
              hasPreviewedCurrentUrl={hasPreviewedCurrentUrl}
              isGenerating={isGenerating}
              isPreviewingArticle={isPreviewingArticle}
              activePaymentTxHash={activePaymentTxHash}
              activePaymentExplorerUrl={activePaymentExplorerUrl}
              onContinueGeneration={() => generateGame(activePaymentTxHash)}
              paymentPath={paymentPath}
              onPaymentStart={handlePaymentStart}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={(err) => setError(paymentError(err))}
              onPaymentPathChange={(path) => setPaymentPath(path)}
              url={url}
            />
          </div>
          {/* ── Close Step 3: Payment ── */}

          {/* ── STEP 4: Generate ── */}
          <div className={`${mobileStep === 'generate' || isDesktop ? 'block' : 'hidden'}`}>
            {/* Submit button — visible until the paid story payment CTA takes over. */}
            {(!isStoryMode || !hasPreviewedCurrentUrl) && (
              <GenerateStepButton
                isGenerating={isGenerating}
                hasPreviewedCurrentUrl={hasPreviewedCurrentUrl}
                isPreviewingArticle={isPreviewingArticle}
                isStoryMode={isStoryMode}
                paymentApproved={paymentApproved}
                genre={genre}
                url={url}
              />
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

      {/* Generation success now auto-redirects to /games/[slug] so the user
          lands on the playable game immediately. Article fidelity review is
          reserved for a future creator dashboard. */}

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
