'use client'

/**
 * Pure helpers, types, and presentational sub-components extracted from
 * game-generator-form.tsx to reduce that file's size and separate concerns.
 *
 * Everything here is stateless — no hooks beyond framer-motion's
 * useReducedMotion in StylePreview.
 */

import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, X, Gamepad2, Sparkles } from 'lucide-react'
import { GENRE_LABEL, type GameGenre } from '@/components/game/GenreSelector'
import { DIFFICULTY_LABEL, type GameDifficulty } from '@/components/game/DifficultySelector'
import type { WriterCoin, PaymentToken } from '@/lib/writer-coins'

export type PaymentPath = 'writercoin' | 'musd'

export type ImageQuality = 'fast' | 'quality'

// ── Timing constants ──────────────────────────────────────────────────────
export const ARTICLE_PREVIEW_TIMEOUT_MS = 15000
export const GAME_GENERATION_TIMEOUT_MS = 120000
export const PAYMENT_RECOVERY_TIMEOUT_MS = 45000
export const PAYMENT_RECOVERY_INTERVAL_MS = 3000

// ── Error state ────────────────────────────────────────────────────────────
export type GenerateErrorPhase = 'article' | 'payment' | 'generation'

export interface GenerateErrorState {
  phase: GenerateErrorPhase
  title: string
  message: string
  retryLabel: string
  suggestions: string[]
}

// ── Article preview ────────────────────────────────────────────────────────
export interface ArticlePreview {
  title: string
  author: string
  publicationName?: string
  publishedAt?: string
  wordCount: number
  estimatedReadTime: number
  excerpt: string
  sourceUrl: string
}

// ── Pure helpers ────────────────────────────────────────────────────────────

export function paymentTokenForPath(path: PaymentPath, writerCoin: WriterCoin): PaymentToken {
  return path === 'musd'
    ? { type: 'musd', network: 'testnet' }
    : { type: 'writercoin', coin: writerCoin }
}

export function getGenerationErrorMessage(
  errorData: { error?: string; code?: string },
  status: number,
  statusText: string
): string {
  switch (errorData.code) {
    case 'CONTENT_PROCESSING_FAILED':
      return 'We could not read that article URL. Please ensure it is public and try another Paragraph link.'
    case 'AI_GENERATION_FAILED':
      return 'Game generation model failed this time. Please retry in a moment.'
    case 'DB_SAVE_FAILED':
      return 'Your game was generated but failed to save. Please retry to persist it.'
    case 'PAYMENT_REQUIRED':
      return 'Payment was not recognized. Your tokens are safe — retry to continue.'
    case 'PAYMENT_NOT_VERIFIED':
      return 'Payment is still being confirmed on-chain. Wait a moment and retry.'
    default:
      if (status === 402) return 'Payment required before generating. Your tokens are safe — retry to continue.'
      return errorData.error || `Generation failed (${status}): ${statusText}`
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function shortTxHash(hash: string): string {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`
}

export function paymentExplorerUrl(path: PaymentPath, hash: string): string {
  const baseUrl = path === 'musd'
    ? 'https://explorer.test.mezo.org/tx'
    : 'https://basescan.org/tx'
  return `${baseUrl}/${hash}`
}

export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
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

export function articleError(message: string): GenerateErrorState {
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

export function paymentError(message: string): GenerateErrorState {
  return {
    phase: 'payment',
    title: 'Payment did not complete',
    message,
    retryLabel: 'Try payment again',
    suggestions: [
      'Confirm your wallet is unlocked and connected.',
      'Check that you are on the requested network before approving.',
      'Confirm your token balance covers the generation cost and gas.',
      'Try free Wordle mode instead — no payment required.',
    ],
  }
}

export function generationError(message: string): GenerateErrorState {
  const lowerMessage = message.toLowerCase()
  const isTimeout = lowerMessage.includes('timed out') || lowerMessage.includes('timeout')
  const isPaymentError = lowerMessage.includes('payment') || lowerMessage.includes('402')
  const isQuota = lowerMessage.includes('quota') || lowerMessage.includes('429')

  if (isPaymentError) {
    return {
      phase: 'generation',
      title: 'Payment not found',
      message: 'Your payment was sent but the server did not recognize it yet. This happens when blockchain indexing is slow. Retry to continue — your tokens are safe.',
      retryLabel: 'Retry generation',
      suggestions: [
        'Wait 5-10 seconds for the transaction to be indexed.',
        'Retry once — the payment should be found on the next attempt.',
        'If retry fails, check your wallet to confirm the payment succeeded.',
      ],
    }
  }

  return {
    phase: 'generation',
    title: isTimeout ? 'Generation is taking too long' : isQuota ? 'Generation limit reached' : 'Game generation failed',
    message,
    retryLabel: 'Generate again',
    suggestions: [
      isTimeout ? 'Retry with Explore quickly if the article is long.' : isQuota ? 'Our AI quota is temporarily full — retry in a few minutes.' : 'Retry once; model failures are often temporary.',
      'Try a shorter article or switch to Wordle for a free article-derived result.',
      'Keep this tab open while generation is running.',
    ],
  }
}

export function articlePreviewMeta(preview: ArticlePreview): string {
  return [
    preview.author,
    preview.publicationName && preview.publicationName !== preview.author ? preview.publicationName : undefined,
    preview.wordCount > 50 ? `${preview.wordCount.toLocaleString()} words` : undefined,
    preview.estimatedReadTime > 1 ? `${preview.estimatedReadTime} min read` : undefined,
  ].filter(Boolean).join(' · ')
}

export function articleGamePremise(preview: ArticlePreview, genre: GameGenre): string {
  const title = preview.title.replace(/[.!?]+$/, '')
  const genreTone: Record<GameGenre, string> = {
    horror: 'a tense interactive comic about pressure, hidden risk, and difficult tradeoffs',
    comedy: 'a playful interactive comic that turns the article ideas into sharp choices and reversals',
    mystery: 'an investigative interactive comic where each choice uncovers what the article is really arguing',
  }

  return `"${title}" becomes ${genreTone[genre]}.`
}

// ── Presentational sub-components ───────────────────────────────────────────

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

export function StylePreview({ genre, difficulty }: { genre: GameGenre; difficulty: GameDifficulty }) {
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
          <div className="font-semibold mb-1">Live Preview — {GENRE_LABEL[genre]} · {DIFFICULTY_LABEL[difficulty]}</div>
          <div className="opacity-95">{s.blurb}</div>
          <div className="opacity-90">{s.diff}</div>
        </div>
      </motion.div>
    </div>
  )
}

export function GenerateErrorPanel({
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

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-red-500/20 pt-4">
            <Link
              href="/games"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-red-100/90 transition hover:text-red-50"
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              Browse the arcade
            </Link>
            {(error.phase === 'payment' || error.phase === 'generation') && (
              <Link
                href="/generate?mode=wordle"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-100/90 transition hover:text-red-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Try free Wordle
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
