'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameGrid } from '@/domains/games/components/game-grid'
import { SimpleGameForm, type PaymentPath } from '@/domains/games/components/simple-game-form'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'
import { useOnboarding } from '@/hooks/useOnboarding'
import { ExternalLink, Puzzle } from 'lucide-react'
import { GridSkeleton } from '@/components/effects'
import { WRITER_COINS } from '@/lib/writerCoins'

const steps = [
  {
    number: '01',
    title: 'Submit an article',
    description: 'Paste a Paragraph article URL — any writer for MUSD, supported writers for writer coins.',
    chains: ['Base', 'Mezo'],
  },
  {
    number: '02',
    title: 'Customise & generate',
    description: 'Shape characters, tone, and narrative. Pay in a writer coin or in MUSD.',
    chains: ['Base', 'Mezo'],
  },
  {
    number: '03',
    title: 'Play & own',
    description: 'Mint as an NFT with on-chain revenue splits. MEZO holders get a boosted writer share.',
    chains: ['Base', 'Story'],
  },
]

function PathExplainer({ path }: { path: 'writercoin' | 'musd' }) {
  if (path === 'writercoin') {
    return (
      <p className="text-xs text-muted-foreground leading-relaxed">
        <span className="font-medium text-blue-500">Writer coin · Base</span> — hold a supported writer&apos;s social token on Base to pay. Any Ethereum/Base wallet works.{' '}
        <a href="/writers" className="underline underline-offset-2 hover:text-foreground transition-colors">See supported writers →</a>
      </p>
    )
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground leading-relaxed">
        <span className="font-medium text-amber-500">MUSD · Mezo</span> — pay with{' '}
        <span className="text-amber-400 font-medium">Bitcoin-backed MUSD</span>, the native stablecoin of the Mezo network.
        {' '}Every payment is split on-chain: writers earn revenue, creators get paid, and{' '}
        <span className="text-amber-400 font-medium">MEZO holders unlock boosted creator shares</span>.
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        <span className="text-amber-500">🔗 Bitcoin-powered</span> — Connect via{' '}
        <a href="https://mezo.org" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground transition-colors">Mezo Passport</a>
        {' '}(Xverse, Unisat, OKX). No writer token needed — any Paragraph article works.
      </p>
    </div>
  )
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 px-4 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          className="text-sm font-semibold text-foreground mb-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          How it works
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <p className="text-3xl font-light text-muted-foreground mb-4 tabular-nums">{step.number}</p>
              <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{step.description}</p>
              <div className="flex gap-1.5 flex-wrap">
                {step.chains.map((chain) => (
                  <span
                    key={chain}
                    className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                      chain === 'Mezo'
                        ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                        : chain === 'Story'
                          ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                          : 'border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/5'
                    }`}
                  >
                    {chain}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

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

function PaymentPathChip({ value, onChange }: { value: PaymentPath; onChange: (v: PaymentPath) => void }) {
  const base = 'flex-1 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors'
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border max-w-xl">
      <button
        type="button"
        onClick={() => onChange('writercoin')}
        aria-pressed={value === 'writercoin'}
        className={`${base} ${value === 'writercoin' ? 'bg-blue-600 text-white shadow' : 'text-muted-foreground hover:text-foreground'}`}
      >
        Writer coin · Base
      </button>
      <button
        type="button"
        onClick={() => onChange('musd')}
        aria-pressed={value === 'musd'}
        className={`${base} ${value === 'musd' ? 'bg-amber-600 text-white shadow' : 'text-muted-foreground hover:text-foreground'}`}
      >
        MUSD · Mezo
      </button>
    </div>
  )
}

export default function HomePage() {
  const { showOnboarding, dismissOnboarding, startTour } = useOnboarding()
  const gameCount = useGameCount()
  // Default to MUSD for the Mezo Hackathon submission; users can toggle to writer coins
  const [paymentPath, setPaymentPath] = useState<PaymentPath>('musd')
  const [hasFeatured, setHasFeatured] = useState<boolean | null>(null)
  const featuredLoadedRef = useRef(false)

  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header onOpenOnboarding={() => startTour('app-intro')} />

        <main className="flex-1">
          {/* Hero */}
          <section className="py-14 px-4">
            <div className="max-w-3xl mx-auto">
              <motion.h1
              className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-4 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              >
              Interactive fiction<br />
              <span className="text-muted-foreground">from </span><WriterTicker />
              </motion.h1>

              <motion.p
              className="text-sm sm:text-base text-muted-foreground mb-6 max-w-xl leading-relaxed"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
              >
              Paste any Paragraph article → AI generates a{' '}
              <span className="text-foreground font-medium">5-panel playable comic</span>{' '}
              → mint it as an NFT with on-chain revenue splits for the writer.
              </motion.p>

              {gameCount !== null && gameCount >= 10 && (
              <motion.p
                className="text-sm text-muted-foreground mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                Join {gameCount} early creators.
              </motion.p>
              )}              {(gameCount === null || gameCount < 10) && <div className="mb-6" />}

              <motion.div
                className="max-w-2xl"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.6, ease: 'easeOut' }}
              >
                <ErrorBoundary>
                    <div className="p-6 rounded-2xl bg-card border border-border shadow-xl space-y-4">
                        <PaymentPathChip value={paymentPath} onChange={setPaymentPath} />
                        <PathExplainer path={paymentPath} />
                        <SimpleGameForm
                            paymentPath={paymentPath}
                            onGenerate={(url: string) => {
                              const params = new URLSearchParams({ url, pay: paymentPath })
                              window.location.href = `/generate?${params.toString()}`
                            }}
                            isGenerating={false}
                        />
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const demoUrl = 'https://paragraph.xyz/@fredwilson/making-advisors'
                              const params = new URLSearchParams({ url: demoUrl, pay: paymentPath })
                              window.location.href = `/generate?${params.toString()}`
                            }}
                            className="flex-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                          >
                            Try with a sample article → {paymentPath === 'musd' ? '(MUSD)' : '(Writer Coin)'}
                          </button>
                        </div>
                    </div>
                </ErrorBoundary>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                className="flex flex-wrap items-center gap-3 mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <a
                  href="https://base.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-full px-3 py-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                  Powered by Base
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://storyprotocol.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-full px-3 py-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Story Protocol
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://mezo.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-full px-3 py-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  Mezo
                  <ExternalLink className="w-3 h-3" />
                </a>
              </motion.div>
            </div>
          </section>

          {/* Daily Wordle */}
          <section className="py-16 px-4 border-t border-border bg-gradient-to-r from-amber-500/5 to-purple-500/5">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <Puzzle className="w-8 h-8 text-amber-400" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-lg font-bold text-foreground mb-1">Daily Wordle — Free</h2>
                  <p className="text-sm text-muted-foreground max-w-lg">
                    Article-derived word puzzles, free to play. No wallet needed. Guess the word in 6 tries, then share your score on Farcaster.
                  </p>
                </div>
                <a
                  href="/generate?mode=wordle"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold uppercase tracking-wider transition-colors flex-shrink-0"
                >
                  Play Now <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </section>

          {/* Featured Works — only rendered once we know there are featured games */}
          {hasFeatured !== false && (
          <section className="py-16 px-4 border-t border-border">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-sm font-semibold text-foreground">
                  Featured works
                </h2>
                <a href="/games" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  View all →
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
          <section className="py-16 px-4 border-t border-border">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-sm font-semibold text-foreground">
                  Recent
                </h2>
                <a href="/games" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  View all →
                </a>
              </div>
              <Suspense fallback={<GridSkeleton count={4} columns={3} />}>
                <GameGrid limit={4} />
              </Suspense>
            </div>
          </section>

          <HowItWorksSection />
        </main>

        <Footer />

        <OnboardingModal isOpen={showOnboarding} onClose={dismissOnboarding} />
      </div>
    </ThemeWrapper>
  )
}