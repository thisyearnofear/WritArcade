'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { CardSkeleton } from '@/components/effects'
import { GAME_MODE_EXPLOAINER } from '@/lib/game-mode-labels'
import { getBasePaintDay } from '@/lib/daily-challenge-ui'
import { Sparkles, ArrowLeft } from 'lucide-react'

type PaymentPath = 'writercoin' | 'musd'

const GameGenerator = dynamic(
  () => import('@/domains/games/components/game-generator-form').then(m => m.GameGeneratorForm),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    ),
  }
)

function paymentPathFromParam(value: string | null): PaymentPath | undefined {
  if (value === 'musd' || value === 'writercoin') {
    return value
  }
  return undefined
}

function GeneratePageContent() {
  const searchParams = useSearchParams()
  const urlParam = searchParams.get('url')
  const payParam = paymentPathFromParam(searchParams.get('pay'))
  const isWordleMode = searchParams.get('mode') === 'wordle'
  const sourceParam = searchParams.get('source')
  const isDailyChallenge = searchParams.get('daily') === '1'
  const isBasePaintSource = sourceParam === 'basepaint' || sourceParam === 'daily'
  const dayParam = searchParams.get('day')
  const basePaintDay = dayParam ? Number.parseInt(dayParam, 10) : isBasePaintSource ? getBasePaintDay() : undefined

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto px-4">
        {isBasePaintSource && basePaintDay && !Number.isNaN(basePaintDay) ? (
          <>
            <Link
              href="/daily"
              className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 mb-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to daily challenge
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/40 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-bold tracking-widest uppercase text-purple-400">
                {isDailyChallenge ? 'Daily Challenge' : 'BasePaint theme'}
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-center mb-2 text-foreground">
              {isDailyChallenge ? "Generate today's daily game" : 'Create from BasePaint'}
            </h1>
            <p className="text-center text-muted-foreground mb-6 text-sm max-w-lg mx-auto">
              {isDailyChallenge
                ? 'Your on-chain modifier hand is ready. Pick genre and difficulty, then generate — no article URL or story payment needed.'
                : `BasePaint Day ${basePaintDay} is your story seed. Customize and generate a comic from today's canvas theme.`}
            </p>
          </>
        ) : (
          <>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-center mb-2 text-foreground">
              {isWordleMode ? 'Create a word puzzle' : 'Create your game'}
            </h1>
            <p className="text-center text-muted-foreground mb-2 text-sm max-w-md mx-auto">
              {isWordleMode
                ? 'Paste a Paragraph article URL to create a free word puzzle. No wallet needed.'
                : 'Paste a Paragraph article URL. AI turns it into a playable 5-panel comic.'}
            </p>
            {!isWordleMode && (
              <p className="text-center text-xs text-muted-foreground mb-6 max-w-lg mx-auto sm:mb-8 px-4">
                {GAME_MODE_EXPLOAINER}.{' '}
                <a href="/generate?mode=wordle" className="text-amber-600 dark:text-amber-400 hover:underline">
                  Try Wordle instead
                </a>
              </p>
            )}
            {isWordleMode && <div className="mb-6 sm:mb-8" />}
          </>
        )}

        <GameGenerator
          initialUrl={urlParam || undefined}
          initialPaymentPath={payParam}
          initialMode={isWordleMode ? 'wordle' : undefined}
          initialBasePaintDay={isBasePaintSource && basePaintDay && !Number.isNaN(basePaintDay) ? basePaintDay : undefined}
          initialDailyChallenge={isDailyChallenge}
        />
      </div>
    </ErrorBoundary>
  )
}

export default function GeneratePage() {
  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header />

        <main id="main-content" className="flex-1 py-8 sm:py-12">
          <Suspense fallback={
            <div className="max-w-4xl mx-auto px-4 space-y-4 py-12">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          }>
            <GeneratePageContent />
          </Suspense>
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
