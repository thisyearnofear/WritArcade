'use client'

import Link from 'next/link'
import { ExternalLink, ArrowLeft } from 'lucide-react'
import { CopyAddressButton } from '@/components/ui/copy-address-button'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { GameGridClient } from './game-grid-client'
import { Suspense } from 'react'

interface WriterPageClientProps {
  coinId: string
  writer: string
  bio: string
  symbol: string
  paragraphUrl: string
  address: string
  total: number
}

export function WriterPageClient({
  coinId,
  writer,
  bio,
  symbol,
  paragraphUrl,
  address,
  total,
}: WriterPageClientProps) {
  const basescanUrl = `https://basescan.org/token/${address}`

  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-1">
          {/* Back */}
          <div className="max-w-6xl mx-auto px-4 pt-8">
            <Link
              href="/games"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              The Arcade
            </Link>
          </div>

          {/* Writer header */}
          <section className="py-12 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 border-b border-gray-200 dark:border-gray-800 pb-10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-500 mb-3">
                    Writer
                  </p>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                    {writer}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 max-w-xl leading-relaxed mb-4">
                    {bio}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={paragraphUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-700 hover:border-gray-500 rounded-md px-3 py-1.5 transition-colors"
                    >
                      Read on Paragraph
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={basescanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors font-mono"
                    >
                      ${symbol}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <CopyAddressButton
                      address={address}
                      labelPrefix={`Copy $${symbol}`}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-8 shrink-0">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{total}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wider mt-0.5">
                      {total === 1 ? 'Game' : 'Games'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Games from this writer */}
          <section className="py-8 px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-500 mb-8">
                Games from {writer}&apos;s articles
              </h2>

              {total === 0 ? (
                <div className="text-center py-20 border border-dashed border-gray-300 dark:border-gray-800 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-500 mb-4">No games yet from this writer.</p>
                  <Link
                    href={`/generate`}
                    className="inline-flex items-center gap-2 text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 border border-gray-300 dark:border-white/10 rounded-md px-4 py-2 transition-colors"
                  >
                    Be the first — generate a game from {writer}&apos;s articles
                  </Link>
                </div>
              ) : (
                <Suspense fallback={
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="aspect-[3/4] bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                    ))}
                  </div>
                }>
                  <GameGridClient writerCoinId={coinId} limit={12} />
                </Suspense>
              )}
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
