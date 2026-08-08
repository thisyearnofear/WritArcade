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
import { DailyChallengeSubnav } from '@/components/daily-challenge/daily-challenge-subnav'
import { BasePaintTrack } from '@/components/basepaint/basepaint-track'
import { GAME_MODE_EXPLOAINER } from '@/lib/game-mode-labels'
import { getBasePaintDay } from '@/lib/daily-challenge/daily-challenge-ui'
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
              href="/basepaint"
              className="mb-4 inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Daily Challenge
            </Link>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/40 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
                Daily Challenge · BasePaint Day {basePaintDay}
              </span>
            </div>
            <h1 className="mb-2 text-center font-serif text-3xl font-bold text-foreground sm:text-4xl">
              {isDailyChallenge ? "Generate today's daily game" : 'Create from BasePaint'}
            </h1>
            <p className="mx-auto mb-6 max-w-lg text-center text-sm text-muted-foreground">
              {isDailyChallenge
                ? "Your on-chain modifier hand is ready. Pick genre and difficulty, then generate — today's BasePaint canvas is the shared source."
                : `BasePaint Day ${basePaintDay} is your story seed. Customize and generate a comic from today's canvas theme.`}
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-center font-serif text-3xl font-bold text-foreground sm:text-4xl">
              {isWordleMode ? 'Create a word puzzle' : 'Create your game'}
            </h1>
            <p className="mx-auto mb-2 max-w-md text-center text-sm text-muted-foreground">
              {isWordleMode
                ? 'Paste a Paragraph article URL to create a free word puzzle. No wallet needed.'
                : 'Paste a Paragraph article URL. AI turns it into a playable 5-panel comic.'}
            </p>
            {!isWordleMode && (
              <p className="mx-auto mb-6 max-w-lg px-4 text-center text-xs text-muted-foreground sm:mb-8">
                {GAME_MODE_EXPLOAINER}.{' '}
                <a href="/generate?mode=wordle" className="text-amber-600 hover:underline dark:text-amber-400">
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

function GenerateChrome({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const sourceParam = searchParams.get('source')
  const isDailyPath = sourceParam === 'basepaint' || sourceParam === 'daily' || searchParams.get('daily') === '1'

  return (
    <>
      {isDailyPath && <BasePaintTrack />}
      <Header />
      {isDailyPath && <DailyChallengeSubnav />}
      <main id="main-content" className="flex-1 py-8 sm:py-12">
        {children}
      </main>
      <Footer />
    </>
  )
}

export default function GeneratePage() {
  return (
    <ThemeWrapper theme="arcade">
      <div className="flex min-h-screen flex-col">
        <Suspense
          fallback={
            <>
              <Header />
              <main className="flex-1 py-8 sm:py-12">
                <div className="mx-auto max-w-4xl space-y-4 px-4 py-12">
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              </main>
              <Footer />
            </>
          }
        >
          <GenerateChrome>
            <GeneratePageContent />
          </GenerateChrome>
        </Suspense>
      </div>
    </ThemeWrapper>
  )
}
