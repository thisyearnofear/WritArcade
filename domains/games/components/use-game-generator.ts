'use client'

import { useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
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
  GENERATE_STEPS,
  getStepIndex,
} from '@/components/ui/step-indicator'
import {
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
import { useGameGeneratorStore } from '@/lib/stores'

const DEFAULT_WRITER_COIN = WRITER_COINS[0]

interface UseGameGeneratorOptions {
  onGameGenerated?: (game: { id: string; title: string; slug: string; genre: string }) => void
  initialUrl?: string
  initialPaymentPath?: 'musd' | 'writercoin'
  initialMode?: 'story' | 'wordle'
}

/**
 * Custom hook that encapsulates all game-generator-form state and logic,
 * using the Zustand store for form state and keeping refs for mutable
 * payment/session tracking.
 *
 * This replaces the 20+ useState calls that were previously scattered
 * across the GameGeneratorForm component.
 */
export function useGameGenerator({
  onGameGenerated,
  initialUrl,
  initialPaymentPath = 'musd',
  initialMode,
}: UseGameGeneratorOptions) {
  const router = useRouter()
  const { isConnected, address: accountAddress } = useAccount()

  // ── Store state ──────────────────────────────────────────────────────
  const store = useGameGeneratorStore()

  // ── Refs (mutable, don't trigger re-render) ─────────────────────────
  const paymentTxHashRef = useRef<string | undefined>(undefined)
  const paymentIdRef = useRef<string | undefined>(undefined)
  const paymentCompletedRef = useRef(false)
  const autoPreviewedUrlRef = useRef<string | null>(null)
  const paymentPathExposureRef = useRef<string | null>(null)
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Media query ──────────────────────────────────────────────────────
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // ── Derived values ──────────────────────────────────────────────────
  const detectedCoin = useMemo(() => detectWriterCoinFromUrl(store.url), [store.url])
  const isAutoDetected = Boolean(detectedCoin) && store.paymentPath === 'musd' && !store.showAdvancedPayment
  const hasPreviewedCurrentUrl = !!store.articlePreview && store.previewedUrl === store.url.trim()
  const isStoryMode = store.mode === 'story'
  const isMusdPath = store.paymentPath === 'musd'
  const writerCoin = !isMusdPath && detectedCoin ? detectedCoin : (store.selectedCoin ?? DEFAULT_WRITER_COIN)
  const activePaymentTxHash = paymentTxHashRef.current
  const activePaymentExplorerUrl = activePaymentTxHash
    ? paymentExplorerUrl(store.paymentPath, activePaymentTxHash)
    : null
  const canGoBack = getStepIndex(store.mobileStep) > 0

  const requiredAmount = useMemo(() => {
    if (isMusdPath) return 0
    return Number(writerCoin.gameGenerationCost) / 10 ** writerCoin.decimals
  }, [isMusdPath, writerCoin])

  const { balance, isLoading: isLoadingBalance } = useWriterCoinBalance(writerCoin.id)

  const userBalance = useMemo(() => {
    if (isMusdPath || !balance?.formattedBalance) return null
    return parseFloat(balance.formattedBalance)
  }, [balance, isMusdPath])

  // ── Initialize from props ───────────────────────────────────────────
  useEffect(() => {
    if (initialUrl) store.setUrl(initialUrl)
    if (initialPaymentPath) store.setPaymentPath(initialPaymentPath)
    if (initialMode) store.setMode(initialMode)
    if (initialPaymentPath === 'writercoin') store.toggleAdvancedPayment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-detect writer coin from URL ────────────────────────────────
  useEffect(() => {
    if (!detectedCoin) return
    if (store.showAdvancedPayment) return
    if (store.paymentPath === 'writercoin' && store.selectedCoin?.id === detectedCoin.id) return
    if (detectedCoin.paymentEnabled) {
      store.setPaymentPath('writercoin')
      store.setSelectedCoin(detectedCoin)
      resetPaymentProgress()
    }
  }, [detectedCoin, store.paymentPath, store.selectedCoin, store.showAdvancedPayment, store])

  // ── Auto-advance mobile steps ───────────────────────────────────────
  useEffect(() => {
    if (isDesktop) return
    if (!hasPreviewedCurrentUrl) return
    if (store.mode === 'wordle') {
      store.setMobileStep('generate')
    } else if (store.mobileStep === 'article') {
      store.setMobileStep('customize')
    }
  }, [hasPreviewedCurrentUrl, isDesktop, store.mode, store.mobileStep, store])

  useEffect(() => {
    if (isDesktop) return
    if (store.paymentApproved && store.mobileStep === 'payment') {
      store.setMobileStep('generate')
    }
  }, [store.paymentApproved, isDesktop, store.mobileStep, store])

  // ── Reset when writer coin is disabled ──────────────────────────────
  useEffect(() => {
    if (store.paymentPath !== 'writercoin' || writerCoin.paymentEnabled) return
    store.setPaymentPath('musd')
    store.setPaymentApproved(false)
    paymentCompletedRef.current = false
    paymentTxHashRef.current = undefined
    paymentIdRef.current = undefined
  }, [store.paymentPath, writerCoin.paymentEnabled, store])

  // ── Sync selectedCoin when detected coin changes ───────────────────
  useEffect(() => {
    if (store.paymentPath !== 'writercoin' || !detectedCoin || store.selectedCoin?.id === detectedCoin.id) return
    store.setSelectedCoin(detectedCoin)
    store.setPaymentApproved(false)
    paymentCompletedRef.current = false
    paymentTxHashRef.current = undefined
    paymentIdRef.current = undefined
    store.setArticlePreview(null)
    store.setPreviewedUrl('')
    paymentPathExposureRef.current = null
  }, [detectedCoin, store.paymentPath, store.selectedCoin, store])

  // ── Payment path exposure analytics ────────────────────────────────
  useEffect(() => {
    if (!isStoryMode || !hasPreviewedCurrentUrl) return
    const exposureKey = `${store.previewedUrl}:${store.paymentPath}:${writerCoin.id}`
    if (paymentPathExposureRef.current === exposureKey) return
    paymentPathExposureRef.current = exposureKey
    trackEvent('payment_path_selected', {
      paymentPath: store.paymentPath,
      mode: store.mode,
      source: isMusdPath ? 'recommended_default' : 'advanced_writercoin',
      writerCoinId: isMusdPath ? undefined : writerCoin.id,
      articlePreviewed: true,
    })
  }, [hasPreviewedCurrentUrl, isMusdPath, isStoryMode, store.mode, store.paymentPath, store.previewedUrl, writerCoin.id])

  // ── Payment abandonment tracking ───────────────────────────────────
  useEffect(() => {
    if (!isStoryMode || !hasPreviewedCurrentUrl || store.paymentApproved || paymentCompletedRef.current) return
    const handlePageHide = () => {
      trackEvent(
        isConnected ? 'payment_abandoned_after_wallet_connect' : 'payment_abandoned_before_wallet_connect',
        { paymentPath: store.paymentPath, mode: store.mode, writerCoinId: isMusdPath ? undefined : writerCoin.id, articlePreviewed: true }
      )
    }
    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
  }, [hasPreviewedCurrentUrl, isConnected, isMusdPath, isStoryMode, store.mode, store.paymentApproved, store.paymentPath, writerCoin.id])

  // ── Auto-preview on initial URL ────────────────────────────────────
  useEffect(() => {
    const normalizedUrl = store.url.trim()
    if (!initialUrl || !normalizedUrl || autoPreviewedUrlRef.current === normalizedUrl) return
    if (hasPreviewedCurrentUrl || store.isPreviewingArticle) return
    autoPreviewedUrlRef.current = normalizedUrl
    previewArticle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl, store.url, hasPreviewedCurrentUrl, store.isPreviewingArticle])

  // ── Debounced auto-preview on URL paste ───────────────────────────
  useEffect(() => {
    const normalizedUrl = store.url.trim()
    if (!normalizedUrl || normalizedUrl === store.previewedUrl) return
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.url, store.previewedUrl])

  // ── Helpers ────────────────────────────────────────────────────────
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const resetPaymentProgress = useCallback(() => {
    store.setPaymentApproved(false)
    paymentCompletedRef.current = false
    paymentTxHashRef.current = undefined
    paymentIdRef.current = undefined
  }, [store])

  const pollVerifiedPayment = async (params: { paymentId?: string; transactionHash?: string }) => {
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

  // ── Preview article ────────────────────────────────────────────────
  const previewArticle = useCallback(async () => {
    if (!store.url.trim()) {
      store.setError(articleError('Please provide a Paragraph.xyz article URL.'))
      return null
    }

    store.setIsPreviewingArticle(true)
    store.setError(null)
    trackEvent('article_preview_started', {
      paymentPath: store.paymentPath,
      mode: store.mode,
      writerCoinId: isMusdPath ? undefined : writerCoin.id,
    })

    try {
      const response = await fetchWithTimeout('/api/articles/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: store.url.trim(),
          paymentPath: store.paymentPath,
          writerCoinId: isMusdPath ? undefined : writerCoin.id,
        }),
      }, ARTICLE_PREVIEW_TIMEOUT_MS)

      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Could not preview this article.')
      }

      store.setArticlePreview(result.data as ArticlePreview)
      store.setPreviewedUrl(store.url.trim())
      trackEvent('article_preview_succeeded', {
        paymentPath: store.paymentPath,
        mode: store.mode,
        writerCoinId: isMusdPath ? undefined : writerCoin.id,
        wordCount: result.data?.wordCount,
        estimatedReadTime: result.data?.estimatedReadTime,
      })
      return result.data as ArticlePreview
    } catch (err) {
      const message = isAbortError(err)
        ? 'Article preview timed out. The article host may be slow or blocking extraction.'
        : err instanceof Error ? err.message : 'Could not preview this article.'
      store.setArticlePreview(null)
      store.setPreviewedUrl('')
      store.setPaymentApproved(false)
      store.setError(articleError(message))
      trackEvent('article_preview_failed', {
        paymentPath: store.paymentPath,
        mode: store.mode,
        writerCoinId: isMusdPath ? undefined : writerCoin.id,
        error: message,
      })
      return null
    } finally {
      store.setIsPreviewingArticle(false)
    }
  }, [store, isMusdPath, writerCoin.id])

  // ── Generate game ─────────────────────────────────────────────────
  const generateGame = async (paymentTransactionHash?: string) => {
    store.startGeneration()
    store.setError(null)
    const currentPaymentTxHash = paymentTransactionHash || paymentTxHashRef.current
    let currentPaymentId = paymentIdRef.current
    const hasPaymentProof = isStoryMode && (
      store.paymentApproved ||
      Boolean(currentPaymentId) ||
      Boolean(currentPaymentTxHash)
    )

    try {
      store.setStepStatuses({ payment: 'completed', validate: 'pending', extract: 'pending', generate: 'pending', save: 'pending' })
      store.setLoadingStep('validate')
      store.setStepStatus('validate', 'in-progress')
      await wait(700)

      if (!store.url.trim()) {
        throw new Error('Please provide a Paragraph.xyz article URL')
      }

      if (store.mode !== 'wordle' && !isMusdPath && !validateArticleUrl(store.url.trim(), writerCoin.id)) {
        throw new Error(`This URL does not match ${writerCoin.name}. Pick a matching article or switch to MUSD for any Paragraph article.`)
      }

      store.setStepStatus('validate', 'completed')
      store.setLoadingStep('extract')
      store.setStepStatus('extract', 'in-progress')
      await wait(600)
      store.setStepStatus('extract', 'completed')
      store.setLoadingStep('generate')
      store.setStepStatus('generate', 'in-progress')

      let lastError: Error | null = null
      let attempt = 0
      const maxAttempts = 3

      const result = await retryWithBackoff(
        async () => {
          attempt++
          const response = await fetchWithTimeout('/api/games/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: store.url.trim(),
              mode: store.mode,
              wallet: accountAddress || undefined,
              ...(hasPaymentProof && {
                customization: { genre: store.genre, difficulty: store.difficulty, imageQuality: store.imageQuality },
              }),
              ...(hasPaymentProof && {
                payment: {
                  paymentId: currentPaymentId,
                  writerCoinId: currentPaymentTxHash?.startsWith('credits:')
                    ? 'credits'
                    : isMusdPath ? 'musd-testnet' : writerCoin.id,
                  paymentPath: store.paymentPath,
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
            const errorData = await response.json().catch(() => ({} as { error?: string; code?: string }))
            const errorMsg = getGenerationErrorMessage(errorData, response.status, response.statusText)

            if (errorData.code === 'PAYMENT_NOT_VERIFIED' && (currentPaymentId || currentPaymentTxHash)) {
              store.setLoadingStep('payment')
              store.setStepStatus('payment', 'in-progress')
              const recoveredPaymentId = await pollVerifiedPayment({
                paymentId: currentPaymentId,
                transactionHash: currentPaymentTxHash,
              })
              if (recoveredPaymentId) {
                paymentIdRef.current = recoveredPaymentId
                currentPaymentId = recoveredPaymentId
                store.setPaymentApproved(true)
                store.setStepStatus('payment', 'completed')
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
      store.setStepStatus('generate', 'completed')

      store.setLoadingStep('save')
      store.setStepStatus('save', 'in-progress')
      await wait(500)
      store.setStepStatus('save', 'completed')

      trackEvent('game_generated', {
        mode: store.mode,
        paymentPath: store.paymentPath,
        gameSlug: result.data.slug,
        genre: store.genre,
        difficulty: store.difficulty,
      })

      onGameGenerated?.(result.data)
      router.push(`/games/${result.data.slug}?welcome=1`)
    } catch (err) {
      const message = isAbortError(err)
        ? 'Game generation timed out before the server returned a result.'
        : err instanceof Error ? err.message : 'An unexpected error occurred'
      store.setError(generationError(message))
      store.setPaymentApproved(false)
      trackEvent('game_generation_failed', {
        mode: store.mode,
        paymentPath: store.paymentPath,
        genre: store.genre,
        difficulty: store.difficulty,
        loadingStep: store.loadingStep,
        error: message,
      })
      if (store.loadingStep) {
        store.setStepStatus(store.loadingStep, 'error')
      }
      console.error('Error generating game:', err)
    } finally {
      store.setLoadingStep(null)
      store.setIsGenerating(false)
    }
  }

  // ── Payment success handler ────────────────────────────────────────
  const handlePaymentSuccess = async (payment: PaymentResult) => {
    paymentCompletedRef.current = true
    paymentTxHashRef.current = payment.transactionHash
    paymentIdRef.current = payment.paymentId
    trackEvent('payment_succeeded', {
      paymentPath: store.paymentPath,
      mode: store.mode,
      articlePreviewed: hasPreviewedCurrentUrl,
      hasPaymentId: Boolean(payment.paymentId),
    })
    store.setPaymentApproved(true)
    store.setError(null)
    await generateGame(payment.transactionHash)
  }

  // ── Submit handler ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store.url.trim()) {
      store.setError(articleError('Please provide a Paragraph.xyz article URL.'))
      return
    }
    if (!hasPreviewedCurrentUrl) {
      await previewArticle()
      return
    }
    if (!store.paymentApproved && isStoryMode) {
      store.setError(paymentError('Story games are paid. Review the generation options below, connect your wallet if needed, and complete payment to generate. You can switch to Wordle for a free article-derived preview.'))
      return
    }
    await generateGame(paymentTxHashRef.current)
  }

  // ── Step navigation ────────────────────────────────────────────────
  const handleStepBack = useCallback(() => {
    const currentIdx = getStepIndex(store.mobileStep)
    if (currentIdx > 0) {
      store.setMobileStep(GENERATE_STEPS[currentIdx - 1].id)
    }
  }, [store])

  // ── URL change handler ─────────────────────────────────────────────
  const handleUrlChange = useCallback((value: string) => {
    store.setUrl(value)
    resetPaymentProgress()
    store.setError(null)
    store.setArticlePreview(null)
    store.setPreviewedUrl('')
    paymentPathExposureRef.current = null
  }, [store, resetPaymentProgress])

  // ── Payment path handlers ─────────────────────────────────────────
  const handleUseDetectedCoin = useCallback(() => {
    if (!detectedCoin) return
    store.setPaymentPath('writercoin')
    store.setSelectedCoin(detectedCoin)
    store.toggleAdvancedPayment()
    resetPaymentProgress()
    trackEvent('payment_path_auto_detected', {
      writer: detectedCoin.id,
      symbol: detectedCoin.symbol,
      path: 'writercoin',
      source: 'auto_detect_banner',
    })
  }, [detectedCoin, store, resetPaymentProgress])

  const handleSetMusdPath = useCallback(() => {
    store.setPaymentPath('musd')
    resetPaymentProgress()
    store.setArticlePreview(null)
    store.setPreviewedUrl('')
    paymentPathExposureRef.current = null
    store.setError(null)
    trackEvent('payment_path_selected', { paymentPath: 'musd', mode: store.mode, source: 'recommended_click' })
  }, [store, resetPaymentProgress])

  const handleSetWriterCoinPath = useCallback(() => {
    if (!writerCoin.paymentEnabled) return
    store.setPaymentPath('writercoin')
    resetPaymentProgress()
    store.setArticlePreview(null)
    store.setPreviewedUrl('')
    paymentPathExposureRef.current = null
    store.setError(null)
    trackEvent('payment_path_selected', { paymentPath: 'writercoin', mode: store.mode, source: 'advanced_click', writerCoinId: writerCoin.id })
  }, [writerCoin, store, resetPaymentProgress])

  // ── Mode handlers ──────────────────────────────────────────────────
  const handleSelectStory = useCallback(() => {
    store.setMode('story')
    resetPaymentProgress()
    trackEvent('game_mode_selected', { mode: 'story', paymentPath: store.paymentPath })
  }, [store, resetPaymentProgress])

  const handleSelectWordle = useCallback(() => {
    store.setMode('wordle')
    resetPaymentProgress()
    trackEvent('game_mode_selected', { mode: 'wordle', paymentPath: store.paymentPath })
  }, [store, resetPaymentProgress])

  const handleSetModeWordle = useCallback(() => {
    store.setMode('wordle')
    resetPaymentProgress()
    trackEvent('game_mode_selected', { mode: 'wordle', paymentPath: store.paymentPath, source: 'post_preview_link' })
  }, [store, resetPaymentProgress])

  // ── Writer coin handlers ───────────────────────────────────────────
  const handleWriterCoinSelect = useCallback((coin: WriterCoin) => {
    store.setSelectedCoin(coin)
    resetPaymentProgress()
    store.toggleWriterSelector()
    store.setArticlePreview(null)
    store.setPreviewedUrl('')
    paymentPathExposureRef.current = null
    store.setError(null)
  }, [store, resetPaymentProgress])

  // ── UI toggle handlers ─────────────────────────────────────────────
  const handleToggleWriterSelector = useCallback(() => store.toggleWriterSelector(), [store])
  const handleToggleCustomization = useCallback(() => store.toggleCustomization(), [store])
  const handleToggleAdvancedPayment = useCallback(() => {
    store.toggleAdvancedPayment()
    if (!store.showAdvancedPayment) {
      trackEvent('payment_path_advanced_opened', {
        paymentPath: store.paymentPath,
        mode: store.mode,
        writerCoinId: writerCoin.id,
      })
    }
  }, [store, writerCoin.id])

  const handleResetDefaults = useCallback(() => {
    store.setGenre('horror')
    store.setDifficulty('easy')
  }, [store])

  // ── Retry handler ──────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    if (store.error?.phase === 'article') {
      previewArticle()
      return
    }
    if (store.error?.phase === 'generation') {
      generateGame(paymentTxHashRef.current)
      return
    }
    store.setError(null)
  }, [store, previewArticle])

  // ── Payment start ──────────────────────────────────────────────────
  const handlePaymentStart = useCallback(() => {
    store.setIsGenerating(true)
    store.setStepStatuses({ payment: 'in-progress', validate: 'pending', extract: 'pending', generate: 'pending', save: 'pending' })
    store.setLoadingStep('payment')
  }, [store])

  // ── Payment error ─────────────────────────────────────────────────
  const handlePaymentError = useCallback((err: string) => {
    store.setError(paymentError(err))
  }, [store])

  return {
    // State
    url: store.url,
    mode: store.mode,
    genre: store.genre,
    difficulty: store.difficulty,
    imageQuality: store.imageQuality,
    paymentPath: store.paymentPath,
    selectedCoin: store.selectedCoin,
    articlePreview: store.articlePreview,
    previewedUrl: store.previewedUrl,
    isPreviewingArticle: store.isPreviewingArticle,
    showCustomization: store.showCustomization,
    showAdvancedPayment: store.showAdvancedPayment,
    showWriterSelector: store.showWriterSelector,
    paymentApproved: store.paymentApproved,
    isGenerating: store.isGenerating,
    loadingStep: store.loadingStep,
    stepStatuses: store.stepStatuses,
    error: store.error,
    mobileStep: store.mobileStep,

    // Derived
    isDesktop,
    detectedCoin,
    isAutoDetected,
    hasPreviewedCurrentUrl,
    isStoryMode,
    isMusdPath,
    writerCoin,
    activePaymentTxHash,
    activePaymentExplorerUrl,
    canGoBack,
    requiredAmount,
    balance,
    isLoadingBalance,
    userBalance,

    // Handlers
    handleSubmit,
    handleUrlChange,
    handleUseDetectedCoin,
    handleSetMusdPath,
    handleSetWriterCoinPath,
    handleSelectStory,
    handleSelectWordle,
    handleSetModeWordle,
    handleWriterCoinSelect,
    handleToggleWriterSelector,
    handleToggleCustomization,
    handleToggleAdvancedPayment,
    handleResetDefaults,
    handleRetry,
    handlePaymentStart,
    handlePaymentSuccess,
    handlePaymentError,
    handleStepBack,
    generateGame,
    previewArticle,

    // Store setters for direct use by step components
    setGenre: store.setGenre,
    setDifficulty: store.setDifficulty,
    setImageQuality: store.setImageQuality,
    setPaymentPath: store.setPaymentPath,
    setMobileStep: store.setMobileStep,
    setError: store.setError,
  }
}
