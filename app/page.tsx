'use client'

import { Suspense, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameGrid } from '@/domains/games/components/game-grid'
import { GameGeneratorForm } from '@/domains/games/components/game-generator-form'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'
import { useOnboarding } from '@/hooks/useOnboarding'
import { WRITER_COINS } from '@/lib/writerCoins'

const steps = [
  {
    number: '01',
    title: 'Submit an article',
    description: 'Paste a Paragraph article URL from a supported writer.',
  },
  {
    number: '02',
    title: 'Customise & generate',
    description: 'Shape the characters, tone, and narrative. Pay with the writer\u2019s coin to create.',
  },
  {
    number: '03',
    title: 'Play & own',
    description: 'Experience your unique interpretation and mint it as an NFT with on-chain revenue splits.',
  },
]

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 px-4 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-500 mb-12 text-center"
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
              <p className="text-3xl font-light text-gray-300 dark:text-gray-700 mb-4 tabular-nums">{step.number}</p>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{step.description}</p>
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
    const id = setInterval(() => setIndex((i) => (i + 1) % WRITER_COINS.length), 2800)
    return () => clearInterval(id)
  }, [])
  const coin = WRITER_COINS[index]
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <AnimatePresence mode="wait">
        <motion.span
          key={coin.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="inline-flex items-center gap-1.5"
        >
          <a
            href={`/writers/${coin.id}`}
            className="font-semibold text-gray-900 dark:text-white underline underline-offset-4 decoration-gray-300 dark:decoration-gray-600 hover:decoration-gray-600 dark:hover:decoration-gray-300 transition-all"
          >
            {coin.writer}
          </a>
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{coin.symbol}</span>
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export default function HomePage() {
  const { showOnboarding, dismissOnboarding } = useOnboarding()
  const gameCount = useGameCount()

  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="py-14 px-4">
            <div className="max-w-3xl mx-auto">
              <motion.h1
                className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-4 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                Interactive fiction<br />
                <span className="text-gray-500 dark:text-gray-400">from </span><WriterTicker />
              </motion.h1>

              <motion.p
                className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 max-w-xl leading-relaxed"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
              >
                Paste an article URL, generate a playable game, and mint it as an NFT — the writer earns every time someone plays or mints.
              </motion.p>

              {gameCount !== null && gameCount > 0 && (
                <motion.p
                  className="text-sm text-gray-400 dark:text-gray-600 mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  {gameCount} {gameCount === 1 ? 'game' : 'games'} generated so far.
                </motion.p>
              )}
              {gameCount === null && <div className="mb-6" />}

              <motion.div
                className="max-w-2xl"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.6, ease: 'easeOut' }}
              >
                <ErrorBoundary>
                  <GameGeneratorForm />
                </ErrorBoundary>
              </motion.div>
            </div>
          </section>

          {/* Featured Works */}
          <section className="py-16 px-4 border-t border-gray-200 dark:border-gray-800">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-500">
                  Featured works
                </h2>
                <a href="/games" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  View all →
                </a>
              </div>
              <Suspense fallback={<div className="h-64 bg-gray-100 dark:bg-gray-900/50 rounded-lg animate-pulse" />}>
                <GameGrid limit={3} featured={true} />
              </Suspense>
            </div>
          </section>

          {/* Recent */}
          <section className="py-16 px-4 border-t border-gray-200 dark:border-gray-800">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-500">
                  Recent
                </h2>
                <a href="/games" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  View all →
                </a>
              </div>
              <Suspense fallback={<div className="h-64 bg-gray-100 dark:bg-gray-900/50 rounded-lg animate-pulse" />}>
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