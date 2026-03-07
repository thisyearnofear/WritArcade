import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, ArrowLeft } from 'lucide-react'
import { getWriterCoinById, WRITER_COINS } from '@/lib/writerCoins'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

export const revalidate = 300

// Dynamically import GameGrid with SSR disabled to avoid Framer Motion SSR errors
const GameGridClient = dynamic(
  () => import('./game-grid-client').then((mod) => mod.GameGridClient),
  { 
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }
)

interface WriterPageProps {
  params: Promise<{ coinId: string }>
}

export async function generateStaticParams() {
  return WRITER_COINS.map((coin) => ({ coinId: coin.id }))
}

export async function generateMetadata({ params }: WriterPageProps) {
  const { coinId } = await params
  const coin = getWriterCoinById(coinId)
  if (!coin) return { title: 'Writer Not Found' }
  return {
    title: `${coin.writer} — writersarcade`,
    description: coin.bio,
  }
}

export default async function WriterPage({ params }: WriterPageProps) {
  const { coinId } = await params
  const coin = getWriterCoinById(coinId)

  if (!coin) notFound()

  const { total } = await GameDatabaseService.getGames({
    writerCoinId: coinId,
    includePrivate: false,
    limit: 1,
  })

  const basescanUrl = `https://basescan.org/token/${coin.address}`

  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-1">
          {/* Back */}
          <div className="max-w-6xl mx-auto px-4 pt-8">
            <Link
              href="/games"
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              The Arcade
            </Link>
          </div>

          {/* Writer header */}
          <section className="py-12 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 border-b border-gray-800 pb-10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
                    Writer
                  </p>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                    {coin.writer}
                  </h1>
                  <p className="text-gray-400 max-w-xl leading-relaxed mb-4">
                    {coin.bio}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={coin.paragraphUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-md px-3 py-1.5 transition-colors"
                    >
                      Read on Paragraph
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={basescanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors font-mono"
                    >
                      ${coin.symbol}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-8 shrink-0">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white tabular-nums">{total}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">
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
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-8">
                Games from {coin.writer}&apos;s articles
              </h2>

              {total === 0 ? (
                <div className="text-center py-20 border border-dashed border-gray-800 rounded-lg">
                  <p className="text-gray-500 mb-4">No games yet from this writer.</p>
                  <Link
                    href={`/generate`}
                    className="inline-flex items-center gap-2 text-sm text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-md px-4 py-2 transition-colors"
                  >
                    Be the first — generate a game from {coin.writer}&apos;s articles
                  </Link>
                </div>
              ) : (
                <Suspense fallback={
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="aspect-[3/4] bg-gray-800 rounded-lg animate-pulse" />
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
