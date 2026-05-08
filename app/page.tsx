'use client'

import { Suspense, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameGrid } from '@/domains/games/components/game-grid'
import { SimpleGameForm, type PaymentPath } from '@/domains/games/components/simple-game-form'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'
import { useOnboarding } from '@/hooks/useOnboarding'
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
    description: 'Mint as an NFT with on-chain revenue splits. MEZO holders earn a payment boost.',
    chains: ['Base', 'Story'],
  },
]

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 px-4 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-12 text-center"
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
  const { showOnboarding, dismissOnboarding } = useOnboarding()
  const gameCount = useGameCount()
  const [paymentPath, setPaymentPath] = useState<PaymentPath>('writercoin')

  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header />

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
              Paste an article URL, generate a playable game, and mint it as an NFT.{' '}
              <span className="text-foreground font-medium">
                Pay in a writer coin on Base, or in MUSD on Mezo.
              </span>
              </motion.p>

              {gameCount !== null && gameCount > 0 && (
              <motion.p
                className="text-sm text-muted-foreground mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                {gameCount} {gameCount === 1 ? 'game' : 'games'} generated so far.
              </motion.p>
              )}              {gameCount === null && <div className="mb-6" />}

              <motion.div
                className="max-w-2xl"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.6, ease: 'easeOut' }}
              >
                <ErrorBoundary>
                    <div className="p-6 rounded-2xl bg-card border border-border shadow-xl space-y-4">
                        <PaymentPathChip value={paymentPath} onChange={setPaymentPath} />
                        <SimpleGameForm
                            paymentPath={paymentPath}
                            onGenerate={(url: string) => {
                              const params = new URLSearchParams({ url, pay: paymentPath })
                              window.location.href = `/generate?${params.toString()}`
                            }}
                            isGenerating={false}
                        />
                    </div>
                </ErrorBoundary>
              </motion.div>
            </div>
          </section>

          {/* Featured Works */}
          <section className="py-16 px-4 border-t border-border">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Featured works
                </h2>
                <a href="/games" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  View all →
                </a>
              </div>
              <Suspense fallback={<GridSkeleton count={3} columns={3} />}>
                <GameGrid limit={3} featured={true} />
              </Suspense>
            </div>
          </section>

          {/* Recent */}
          <section className="py-16 px-4 border-t border-border">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
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