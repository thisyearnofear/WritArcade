'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameGrid } from '@/domains/games/components/game-grid'
import { SimpleGameForm } from '@/domains/games/components/simple-game-form'
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
} from 'lucide-react'
import { GridSkeleton } from '@/components/effects'
import { WRITER_COINS } from '@/lib/writer-coins'
import { config } from '@/lib/config'
import { ConceptTerm } from '@/lib/concept-definitions'

/* ─── How It Works ──────────────────────────────────────────────────────── */

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

/* ─── Hero Components ────────────────────────────────────────────────────── */

function WriterTicker() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % WRITER_COINS.length), 4500)
    return () => clearInterval(id)
  }, [])
  const coin = WRITER_COINS[index]
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <AnimatePresence mode="wait">
        <motion.span
          key={coin.id}
          initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="inline-flex items-center gap-1.5"
        >
          <a
            href={`/writers/${coin.id}`}
            className="font-semibold text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-all"
          >
            {coin.writer}
          </a>
          <span className="text-xs font-mono text-muted-foreground">{coin.symbol}</span>
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export default function HomePage() {
  const { showOnboarding, dismissOnboarding } = useOnboarding('welcome')
  const gameCount = useGameCount()
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
                <span className="text-foreground font-medium">free word puzzle</span>{' '}
                or a{' '}
                <span className="text-foreground font-medium">5-panel interactive comic</span>.
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

              <motion.div
                className="mb-6 flex flex-col items-center gap-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
              >
                <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
                  <a
                    href="/games"
                    className="group inline-flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background transition-all hover:-translate-y-0.5 hover:opacity-90"
                  >
                    <span className="inline-flex items-center gap-2"><Gamepad2 className="w-4 h-4" /> Play</span>
                    <span className="text-[11px] font-normal opacity-70">Jump into a story</span>
                  </a>
                  <a
                    href="/generate"
                    className="group inline-flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-muted"
                  >
                    <span className="inline-flex items-center gap-2"><Wand2 className="w-4 h-4 text-primary" /> Create</span>
                    <span className="text-[11px] font-normal text-muted-foreground">Turn writing into play</span>
                  </a>
                  {config.features.dailyChallenge && (
                    <a
                      href="/basepaint"
                      className="group inline-flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-purple-500/40 bg-purple-500/10 px-4 py-3 text-sm font-semibold text-purple-700 transition-all hover:-translate-y-0.5 hover:border-purple-400/60 hover:bg-purple-500/15 dark:text-purple-200"
                    >
                      <span className="inline-flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Daily</span>
                      <span className="text-[11px] font-normal text-purple-700/70 dark:text-purple-200/70">Writer × today&apos;s canvas</span>
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Play free · create from any article · Daily stages a writer inside today&apos;s BasePaint world
                </p>
              </motion.div>

              {/* Primary CTA card — just URL input, no wallet, no payment toggle */}
              <motion.div
                className="max-w-xl mx-auto"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
              >
                <ErrorBoundary>
                  <div className="p-6 rounded-2xl bg-card border border-border shadow-xl space-y-4 text-left">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-primary">Create</p>
                      <p className="mt-1 text-sm text-muted-foreground">Turn an article into a five-panel playable story. Your first story is free; public games are always free to play.</p>
                    </div>
                    <SimpleGameForm
                      onGenerate={(url: string) => {
                        window.location.href = `/generate?${new URLSearchParams({ url }).toString()}`
                      }}
                      isGenerating={false}
                    />

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          const demoUrl = 'https://paragraph.com/@papajams/the-infra-problem-defi-struggled-to-solve'
                          window.location.href = `/generate?${new URLSearchParams({ url: demoUrl }).toString()}`
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                      >
                        Try with a sample article
                      </button>
                      <a
                        href="/generate?mode=wordle"
                        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-500 hover:text-emerald-400 border border-emerald-500/30 rounded-full px-3 py-1.5 transition-colors"
                      >
                        <Puzzle className="w-3.5 h-3.5" />
                        Free Wordle — no wallet
                      </a>
                    </div>
                  </div>
                </ErrorBoundary>
              </motion.div>

              {/* Social proof — just the writer names, no chain/coin mentions */}
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
                    <span
                      key={coin.id}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground border border-border/60 rounded-full px-2.5 py-1"
                    >
                      <span className="font-mono text-blue-600 dark:text-blue-400">{coin.symbol}</span>
                      <span className="hidden sm:inline truncate max-w-[8rem]">{coin.writer}</span>
                    </span>
                  ))}
                  <span className="text-[11px] text-muted-foreground">and more</span>
                </div>
              </motion.div>
            </div>
          </section>

          <DailyChallengeBanner />

          {/* Creator value proposition — insight is a product outcome, not a hidden dashboard feature. */}
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
              <a
                href="/studio"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
              >
                Create for insights <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </section>

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
                  <a href="/games" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    View all
                  </a>
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
          {hasFeatured === false && (
            <section className="py-12 px-4 border-t border-border">
              <div className="max-w-6xl mx-auto">
                <p className="text-sm text-muted-foreground text-center">
                  Featured games will appear here once published.
                </p>
              </div>
            </section>
          )}

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
                  <a href="/games" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    View all
                  </a>
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
          {gameCount !== null && gameCount.totalPlays < 3 && hasMostPlayed === false && (
            <section className="py-12 px-4 border-t border-border">
              <div className="max-w-6xl mx-auto">
                <p className="text-sm text-muted-foreground text-center">
                  Most played games will appear here once the community starts playing.
                </p>
              </div>
            </section>
          )}

          {/* Recent */}
          <section className="py-16 px-4 border-t border-border" aria-labelledby="recent-heading">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 id="recent-heading" className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Recent
                </h2>
                <a href="/games" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  View all
                </a>
              </div>
              <Suspense fallback={<GridSkeleton count={4} columns={3} />}>
                <GameGrid limit={4} requireImage={true} />
              </Suspense>
            </div>
          </section>

          {/* Social proof — writers ticker */}
          <section className="py-12 px-4 border-t border-border text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Featuring writers like</p>
            <WriterTicker />
          </section>

          <HowItWorksSection />
        </main>

        <Footer />

        <OnboardingModal isOpen={showOnboarding} onClose={dismissOnboarding} />
      </div>
    </ThemeWrapper>
  )
}
