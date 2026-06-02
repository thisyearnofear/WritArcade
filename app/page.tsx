'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { GameGrid } from '@/domains/games/components/game-grid'
import { SimpleGameForm, type PaymentPath } from '@/domains/games/components/simple-game-form'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'
import { ConceptTooltip } from '@/components/ui/concept-tooltip'
import { useOnboarding } from '@/hooks/useOnboarding'
import {
  ExternalLink,
  Puzzle,
  Wand2,
  Gamepad2,
  Coins,
} from 'lucide-react'
import { GridSkeleton } from '@/components/effects'
import { WRITER_COINS } from '@/lib/writerCoins'

/* ─── How It Works ──────────────────────────────────────────────────────── */

const steps = [
  {
    icon: Wand2,
    title: 'Paste an article',
    description: 'Drop in any Paragraph.xyz article URL. AI reads it and generates a unique 5-panel interactive comic.',
  },
  {
    icon: Gamepad2,
    title: 'Play your story',
    description: 'Make choices that shape the narrative. Every playthrough is different.',
  },
  {
    icon: Coins,
    title: 'Own and earn',
    description: (
      <>
        <ConceptTooltip term="Mint" explanation="Create a unique digital collectible on the blockchain that proves you own this game.">
          <span className="underline decoration-dotted underline-offset-2 cursor-help">Mint</span>
        </ConceptTooltip>{' '}
        your game and earn from plays. The original writer automatically receives a share of every transaction.
      </>
    ),
  },
]

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 px-4 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          className="text-sm font-semibold text-foreground mb-12 text-center uppercase tracking-wider"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          How it works
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          {steps.map((step, index) => {
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
          })}
        </div>
      </div>
    </section>
  )
}

/* ─── Hooks ──────────────────────────────────────────────────────────────── */

function useGameCount() {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    fetch('/api/games/stats')
      .then((r) => r.json())
      .then((r) => { if (r.success) setCount(r.data.publicGames) })
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
  const { showOnboarding, dismissOnboarding, startTour } = useOnboarding()
  const gameCount = useGameCount()
  const [paymentPath] = useState<PaymentPath>('musd')
  const [hasFeatured, setHasFeatured] = useState<boolean | null>(null)
  const featuredLoadedRef = useRef(false)

  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header onOpenOnboarding={() => startTour('app-intro')} />

        <main className="flex-1">
          {/* Skip nav target */}
          <div id="main-content" tabIndex={-1} className="sr-only" />

          {/* Hero — single clear CTA above the fold */}
          <section className="py-20 sm:py-28 px-4" aria-labelledby="hero-heading">
            <div className="max-w-2xl mx-auto text-center">
              <motion.h1
                id="hero-heading"
                className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-5 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                Turn articles into
                <br />
                playable games
              </motion.h1>

              <motion.p
                className="text-base sm:text-lg text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.6, ease: 'easeOut' }}
              >
                Paste a{' '}
                <ConceptTooltip
                  term="Paragraph"
                  explanation="A publishing platform for writers and creators. Many crypto and tech writers publish there."
                >
                  <span className="underline decoration-dotted underline-offset-2 cursor-help text-foreground font-medium">Paragraph</span>
                </ConceptTooltip>{' '}
                article URL. AI generates a{' '}
                <span className="text-foreground font-medium">5-panel interactive comic</span>{' '}
                you can play, customise, and collect.
              </motion.p>

              {gameCount !== null && gameCount >= 10 && (
                <motion.p
                  className="text-sm text-muted-foreground mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  Join {gameCount} early creators
                </motion.p>
              )}

              {/* Primary CTA card */}
              <motion.div
                className="max-w-xl mx-auto"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
              >
                <ErrorBoundary>
                  <div className="p-6 rounded-2xl bg-card border border-border shadow-xl space-y-4 text-left">
                    <SimpleGameForm
                      paymentPath={paymentPath}
                      onGenerate={(url: string) => {
                        const params = new URLSearchParams({ url, pay: paymentPath })
                        window.location.href = `/generate?${params.toString()}`
                      }}
                      isGenerating={false}
                    />

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          const demoUrl = 'https://paragraph.com/@papajams/the-infra-problem-defi-struggled-to-solve'
                          const params = new URLSearchParams({ url: demoUrl, pay: paymentPath })
                          window.location.href = `/generate?${params.toString()}`
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                      >
                        Try with a sample article
                      </button>
</div>
                  </div>
                </ErrorBoundary>
              </motion.div>

              {/* Writer-coin hint — shows the 5 launch writers whose articles
                  auto-pay with their token. Tapping a pill deep-links to the
                  writer's page where the reader can see games, copy the
                  contract address, and read on Paragraph. */}
              <motion.div
                className="mt-6 flex flex-col items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.5 }}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Paste from a launch writer to pay with their coin
                </span>
                <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xl">
                  {WRITER_COINS.map((coin) => (
                    <a
                      key={coin.id}
                      href={`/writers/${coin.id}`}
                      className="group inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border/60 hover:border-blue-500/40 rounded-full px-2.5 py-1 transition-colors"
                      title={`${coin.writer} — ${coin.symbol} on Base`}
                    >
                      <span className="font-mono text-blue-600 dark:text-blue-400">{coin.symbol}</span>
                      <span className="hidden sm:inline truncate max-w-[8rem]">{coin.writer}</span>
                    </a>
                  ))}
                  <a
                    href="/writers"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                  >
                    All writers →
                  </a>
                </div>
              </motion.div>

              {/* Trust badges — subtle, below the fold. Now link to /learn/chains
                  so the user gets a real explanation rather than an external site. */}
              <motion.div
                className="flex flex-wrap items-center justify-center gap-3 mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <Link
                  href="/learn/chains"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-full px-3 py-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Story Protocol
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <Link
                  href="/learn/chains"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-full px-3 py-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  Mezo
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <Link
                  href="/learn/chains"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-full px-3 py-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                  Base
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </motion.div>
            </div>
          </section>

          {/* Daily Wordle — free, no wallet */}
          <section className="px-4 py-12 border-t border-border bg-gradient-to-r from-amber-500/5 to-purple-500/5 sm:py-16">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <Puzzle className="w-8 h-8 text-amber-400" aria-hidden="true" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-lg font-bold text-foreground mb-1">Daily Wordle — Free</h2>
                  <p className="text-sm text-muted-foreground max-w-lg">
                    Article-derived word puzzles, free to play. No wallet needed. Guess the word in 6 tries, then share your score.
                  </p>
                </div>
                <a
                  href="/generate?mode=wordle"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-amber-700 sm:w-auto sm:flex-shrink-0"
                >
                  Play Now <ExternalLink className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>

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
                <GameGrid limit={4} />
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
