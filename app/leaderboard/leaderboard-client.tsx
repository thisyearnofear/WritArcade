'use client'

import { useState } from 'react'
import { GameGrid } from '@/domains/games/components/game-grid'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Trophy, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export function LeaderboardClient() {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalGames, setTotalGames] = useState(0)
  const itemsPerPage = 12

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleStatsLoad = (data: { total: number; count: number }) => {
    setTotalGames(data.total)
  }

  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-1">
          <div className="px-4 py-8 border-b border-border sm:py-10">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Trophy className="h-5 w-5" />
                </div>
                <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground">
                  Leaderboard
                </h1>
              </div>
              <p className="text-muted-foreground max-w-2xl mb-6 ml-[3.25rem]">
                The most played games on WritersArcade, ranked by total play count.
              </p>

              <div className="flex flex-wrap items-center gap-6 ml-[3.25rem]">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Sorted by <span className="text-foreground font-medium">play count</span></span>
                </div>
                <Link
                  href="/games"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Browse all games →
                </Link>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-8">
            <GameGrid
              key={`leaderboard-${currentPage}`}
              limit={itemsPerPage}
              page={currentPage}
              sortBy="playCount"
              onLoad={handleStatsLoad}
              emptyTitle="No games played yet"
              emptyDescription="Be the first — turn an article into a playable game and start the leaderboard."
              emptyActionLabel="Create a game"
            />

            {totalGames > 0 && (
              <div className="mt-8 flex justify-center items-center gap-4 border-t border-border pt-8">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-border text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:border-purple-500 hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-muted-foreground text-sm">
                  Page <span className="text-foreground font-medium">{currentPage}</span>
                  {' '}of{' '}
                  <span className="text-foreground font-medium">{Math.ceil(totalGames / itemsPerPage) || 1}</span>
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalGames / itemsPerPage)}
                  className="p-2 rounded-lg border border-border text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:border-purple-500 hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
