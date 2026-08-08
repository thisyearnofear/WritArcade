'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { GameGrid } from '@/domains/games/components/game-grid'
import { SimpleGameForm } from '@/domains/games/components/simple-game-form'
import { HeroGameStrip, type SampleGame } from '@/domains/games/components/hero-game-strip'
import { RecentlyPlayedSection } from '@/domains/games/components/recently-played-section'
import { DailyChallengeBanner } from '@/components/daily-challenge/daily-challenge-banner'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'
import { ConceptTooltip } from '@/components/ui/concept-tooltip'
import { useOnboarding } from '@/hooks/useOnboarding'
import {
  Puzzle,
  Wand2,
  Gamepad2,
  Coins,
  LockKeyhole,
  CalendarDays,
  BarChart3,
  ArrowUpRight,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import { GridSkeleton } from '@/components/effects'
import { WRITER_COINS } from '@/lib/writer-coins'
import { config } from '@/lib/config'
import { ConceptTerm } from '@/lib/concept-definitions'

/* ─── How It Works ──────────────────────────────────────────────────────── */

/** Used by the hero's primary CTA so cold visitors never need a URL of their own. */
const SAMPLE_ARTICLE_URL = 'https://paragraph.com/@papajams/the-infra-problem-defi-struggled-to-solve'

const baseSteps = [
  {
    icon: Wand2,
    title: 'Paste an article',
    description: 'Drop in any Paragraph.xyz article URL. AI reads it and generates a unique 5-panel interactive comic.',
  },
  {
    icon: Gamepad2,
    title: 'Play your story',
    description: 'Make five choices that branch the narrative. Every playthrough is different.',
  },
  {
    icon: LockKeyhole,
    title: 'Unlock the secret epilogue',
    description: (
      <>
        Finish all panels, then{' '}
        <ConceptTerm concept="mint">
          <span className="underline decoration-dotted underline-offset-2 cursor-help">mint</span>
        </ConceptTerm>{' '}
        to decrypt a bonus ending encrypted on Base.
      </>
    ),
  },
  {
    icon: Coins,
    title: 'Own and earn',
    description: (
      <>
        Mint your game and earn from plays. The original writer automatically receives a share of every transaction.
      </>
    ),
  },
]

const dailyStep = {
  icon: CalendarDays,
  title: 'Daily Challenge',
  description: (
    <>
      A featured writer&apos;s piece staged inside today&apos;s BasePaint canvas — same world for everyone,
      your hand of five encrypted{' '}
      <ConceptTerm concept="dailyChallenge">
        <span className="underline decoration-dotted underline-offset-2 cursor-help">modifier cards</span>
      </ConceptTerm>{' '}
      is unique. Compare scores on the leaderboard.
    </>
  ),
}

function getHowItWorksSteps() {
  if (!config.features.dailyChallenge) return baseSteps
  return [baseSteps[0], baseSteps[1], dailyStep, baseSteps[2], baseSteps[3]]
}

function HowItWorksSection() {
  const steps = getHowItWorksSteps()
  // Progressive disclosure: the first three steps carry the story; the
  // rest live behind a disclosure instead of competing above the fold.
  const primary = steps.slice(0, 3)
  const more = steps.slice(3)

  const renderStep = (step: (typeof steps)[number], index: number) => {
    const Icon = step.icon
    return (
      <motion.div
        key={step.title}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        className="text-center"
      >
        <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center mx-auto mb-4">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
      </motion.div>
    )
  }

  return (
    <section id="how-it-works" className="py-20 px-4 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          className="text-sm font-semibold text-foreground mb-12 text-center uppercase tracking-wider"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          How it works
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {primary.map((step, index) => renderStep(step, index))}
        </div>

        {more.length > 0 && (
          <details className="group mt-8">
            <summary className="mx-auto flex w-fit cursor-pointer list-none select-none items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/30 [&::-webkit-details-marker]:hidden">
              More
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {more.map((step, index) => renderStep(step, primary.length + index))}
            </div>
          </details>
        )}
      </div>
    </section>
  )
}

/* ─── Hooks ──────────────────────────────────────────────────────────────── */

function useGameCount() {
  const [count, setCount] = useState<{ publicGames: number; totalPlays: number } | null>(null)
  useEffect(() => {
    fetch('/api/games/stats')
      .then((r) => r.json())
      .then((r) => { if (r.success) setCount({ publicGames: r.data.publicGames, totalPlays: r.data.totalPlays ?? 0 }) })
      .catch(() => {})
  }, [])
  return count
}

/**
 * Backs both the hero strip and the hero's primary CTA from one request.
 *
 * The primary CTA needs a real, already-generated game: playing one is instant,
 * whereas /generate only prefills the form and still costs a pipeline run, so
 * pointing the loudest button there would make the fast path decorative.
 */
function useSampleGames() {
  const [games, setGames] = useState<SampleGame[]>([])
  useEffect(() => {
    let cancelled = false
    fetch('/api/games?limit=5&requireImage=true')
      .then((r) => r.json())
      .then((result) => {
        if (cancelled || !result?.success) return
        setGames(result.data?.games ?? [])
      })
      .catch(() => {
        // Silent: the hero falls back to the create-from-sample path below.
      })
    return () => { cancelled = true }
  }, [])
  return games
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export default function HomePage() {
  // The hero explains the product, so the tour is opt-in via "New here?" rather
  // than auto-opening a modal over the first impression.
  const { showOnboarding, dismissOnboarding, startTour } = useOnboarding()
  const router = useRouter()
  const gameCount = useGameCount()
  const sampleGames = useSampleGames()
  const featuredSample = sampleGames[0]
  const [hasFeatured, setHasFeatured] = useState<boolean | null>(null)
  const featuredLoadedRef = useRef(false)
  const [hasMostPlayed, setHasMostPlayed] = useState<boolean | null>(null)
  const mostPlayedLoadedRef = useRef(false)

  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-1">
          {/* Skip nav target */}
          <div id="main-content" tabIndex={-1} className="sr-only" />

          {/* Hero — single clear CTA above the fold. No wallet, no chain, no payment. */}
          <section className="py-20 sm:py-28 px-4" aria-labelledby="hero-heading">
            <div className="max-w-2xl mx-auto text-center">
              <motion.h1
                id="hero-heading"
                className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-5 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                Paste an article.
                <br />
                Get a playable game.
              </motion.h1>

              <motion.p
                className="text-base sm:text-lg text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.6, ease: 'easeOut' }}
              >
                Drop a{' '}
                <ConceptTooltip
                  term="Paragraph"
                  explanation="A publishing platform for writers and creators. Many crypto and tech writers publish there."
                >
                  <span className="underline decoration-dotted underline-offset-2 cursor-help text-foreground font-medium">Paragraph</span>
                </ConceptTooltip>{' '}
                article URL. AI reads it and turns it into a{' '}
                <span className="text-foreground font-medium">5-panel interactive comic</span>{' '}
                you play by making choices.
              </motion.p>

              {gameCount !== null && gameCount.publicGames >= 10 && (
                <motion.p
                  className="text-sm text-muted-foreground mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  {gameCount.publicGames} games created{' · '}
                  {gameCount.totalPlays.toLocaleString()} plays
                </motion.p>
              )}

              {/* Visual proof of the headline's promise, before the visitor has to act. */}
              <HeroGameStrip games={sampleGames} />

              {/* The one loud action, and the fastest path to value: an already
                  generated game opens instantly. It demonstrates the headline
                  rather than restating it. Falls back to the create-from-sample
                  path only if no public game with a cover has loaded. */}
              <motion.div
                className="mt-8 flex flex-col items-center gap-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
              >
                {featuredSample ? (
                  <Link
                    href={`/games/${featuredSample.slug}`}
                    className="inline-flex h-14 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-foreground px-6 text-sm font-bold uppercase tracking-widest text-background transition-all hover:-translate-y-0.5 hover:opacity-90"
                  >
                    <Sparkles className="h-4 w-4" />
                    See what an article becomes
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/generate?${new URLSearchParams({ url: SAMPLE_ARTICLE_URL }).toString()}`)
                    }}
                    className="inline-flex h-14 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-foreground px-6 text-sm font-bold uppercase tracking-widest text-background transition-all hover:-translate-y-0.5 hover:opacity-90"
                  >
                    <Sparkles className="h-4 w-4" />
                    Try it with a sample article
                  </button>
                )}
                <p className="text-xs text-muted-foreground">
                  {featuredSample ? 'Free to play · no wallet, no signup' : 'Free · no wallet, no signup'}
                </p>
                {config.features.dailyChallenge && (
                  <Link
                    href="/basepaint"
                    className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-700 transition-colors hover:border-purple-400/60 hover:bg-purple-500/15 dark:text-purple-200"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    New: today&apos;s BasePaint canvas as a playable comic
                  </Link>
                )}
              </motion.div>

              {/* Secondary block: creating is the commitment step, so it sits below
                  the free demo and carries no loud button of its own. */}
              <motion.div
                className="max-w-xl mx-auto mt-8"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
              >
                <ErrorBoundary>
                  <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4 text-left">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-primary">Make your own</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Turn an article into a 5-panel interactive comic. Your first story is free; public games are always free to play.
                      </p>
                    </div>

                    <SimpleGameForm
                      onGenerate={(url: string) => {
                        router.push(`/generate?${new URLSearchParams({ url }).toString()}`)
                      }}
                      isGenerating={false}
                    />

                    <div className="flex flex-col gap-2 border-t border-border pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          router.push(`/generate?${new URLSearchParams({ url: SAMPLE_ARTICLE_URL }).toString()}`)
                        }}
                        className="inline-flex items-center gap-1.5 text-left text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        No article handy? Build one from a sample
                      </button>
                      <Link
                        href="/generate?mode=wordle"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Puzzle className="w-3.5 h-3.5" />
                        Prefer something shorter? Make a word puzzle instead
                      </Link>
                    </div>
                  </div>
                </ErrorBoundary>
              </motion.div>

              {/* Secondary routes, deliberately quiet so the hero has one loud CTA. */}
              <motion.div
                className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Link href="/games" className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                  <Gamepad2 className="h-3.5 w-3.5" />
                  Browse the arcade
                </Link>
                {config.features.dailyChallenge && (
                  <Link href="/basepaint" className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Daily challenge
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => startTour('welcome')}
                  className="inline-flex items-center gap-1.5 underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground"
                >
                  New here?
                </button>
              </motion.div>

              {/* Social proof that is also a way in: each chip leads to the writer's
                  page, where their Paragraph publication is one click away. This is
                  the answer to "I don't have an article URL." */}
              <motion.div
                className="mt-6 flex flex-col items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.5 }}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Works with articles from
                </span>
                <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xl">
                  {WRITER_COINS.map((coin) => (
                    <Link
                      key={coin.id}
                      href={`/writers/${coin.id}`}
                      title={`${coin.writer} — find an article to turn into a game`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                    >
                      <span className="font-mono text-blue-600 dark:text-blue-400">{coin.symbol}</span>
                      <span className="hidden sm:inline truncate max-w-[8rem]">{coin.writer}</span>
                    </Link>
                  ))}
                  <Link
                    href="/writers"
                    className="text-[11px] text-muted-foreground underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground"
                  >
                    and more
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>

          {/* BasePaint Daily sits directly under the hero: it's the most distinctive
              thing the product does, and the reason to come back tomorrow. */}
          <DailyChallengeBanner />

          {/* Continue playing — only renders for returning users with play history */}
          <RecentlyPlayedSection />

          {/* Featured Works */}
          {hasFeatured !== false && (
            <section className="py-16 px-4 border-t border-border" aria-labelledby="featured-heading">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <h2 id="featured-heading" className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Featured works
                  </h2>
                  <Link href="/games" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    View all
                  </Link>
                </div>
                <Suspense fallback={<GridSkeleton count={3} columns={3} />}>
                  <GameGrid
                    limit={3}
                    featured={true}
                    requireFunding={true}
                    requireImage={true}
                    onLoad={({ count }) => {
                      if (!featuredLoadedRef.current) {
                        featuredLoadedRef.current = true
                        setHasFeatured(count > 0)
                      }
                    }}
                  />
                </Suspense>
              </div>
            </section>
          )}
          {/* No empty state when Featured is unpopulated — an absent section is
              invisible to visitors, whereas an apology for an absent section is not. */}

          {/* Most played — leaderboard sorted by playCount. Only rendered
              once there are at least a few plays AND the filtered query
              returns games, so we don't show a degenerate one-card
              leaderboard or an empty-state mid-page. */}
          {gameCount !== null && gameCount.totalPlays >= 3 && hasMostPlayed !== false && (
            <section className="py-16 px-4 border-t border-border" aria-labelledby="most-played-heading">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <h2 id="most-played-heading" className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Most played
                  </h2>
                  <Link href="/games" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    View all
                  </Link>
                </div>
                <Suspense fallback={<GridSkeleton count={6} columns={3} />}>
                  <GameGrid
                    limit={6}
                    sortBy="playCount"
                    requireImage={true}
                    onLoad={({ count }) => {
                      if (!mostPlayedLoadedRef.current) {
                        mostPlayedLoadedRef.current = true
                        setHasMostPlayed(count > 0)
                      }
                    }}
                  />
                </Suspense>
              </div>
            </section>
          )}
          {/* Likewise no empty state for Most played — it self-hides until there
              are enough plays to make a leaderboard meaningful. */}

          {/* Recent */}
          <section className="py-16 px-4 border-t border-border" aria-labelledby="recent-heading">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 id="recent-heading" className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Recent
                </h2>
                <Link href="/games" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  View all
                </Link>
              </div>
              <Suspense fallback={<GridSkeleton count={4} columns={3} />}>
                <GameGrid limit={4} requireImage={true} />
              </Suspense>
            </div>
          </section>

          <HowItWorksSection />

          {/* Creator value proposition — moved below the proof. The analytics
              argument lands better once a visitor has seen games work. */}
          <section className="border-t border-border px-4 py-12" aria-labelledby="creator-signal-heading">
            <div className="mx-auto flex max-w-5xl flex-col gap-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-500">For creators</p>
                  <h2 id="creator-signal-heading" className="mt-1 text-xl font-bold text-foreground">See what your readers actually choose</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Turn passive content into a measurable experience. Creator insights show starts, completions, panel drop-off, choice splits, and which placements drive plays.</p>
                </div>
              </div>
              <Link
                href="/studio"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
              >
                Create for insights <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </main>

        <Footer />

        <OnboardingModal isOpen={showOnboarding} onClose={dismissOnboarding} />
      </div>
    </ThemeWrapper>
  )
}
